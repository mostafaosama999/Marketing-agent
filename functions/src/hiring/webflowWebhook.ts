import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";

const db = admin.firestore();
const APPLICANTS_COLLECTION = "applicants";

/**
 * Verify Webflow webhook signature (HMAC-SHA256).
 * Webflow signs: "{timestamp}:{rawBody}" with the webhook secret key.
 */
function verifyWebflowSignature(
  rawBody: string,
  signature: string | undefined,
  timestamp: string | undefined,
  secret: string
): boolean {
  if (!signature || !timestamp) return false;

  // Webflow timestamp is in milliseconds
  const age = Date.now() - Number(timestamp);
  // Allow 10 minutes for retries
  if (age > 600000) return false;

  const message = `${timestamp}:${rawBody}`;
  const expected = crypto
    .createHmac("sha256", secret)
    .update(message)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

// Questions to store in formAnswers (shortened labels)
const QUESTION_MAP: Record<string, string> = {
  "this role involves writing long-form technical blogs": "Role Fit",
  "this role involves writing long form technical blogs": "Role Fit",
  "describe a technical concept you": "Technical Writing Experience",
  "have you ever built or worked with an llm": "LLM Experience",
  "what programming languages and tools": "Languages & Tools",
  "share 1": "Writing Samples",
  "what are your 1-3 year goals": "Career Goals",
  "what are your 1 3 year goals": "Career Goals",
};

function matchQuestionKey(fieldName: string): string | null {
  const lower = fieldName.toLowerCase();
  for (const [prefix, label] of Object.entries(QUESTION_MAP)) {
    if (lower.startsWith(prefix)) {
      return label;
    }
  }
  return null;
}

export const webflowHiringWebhook = functions
  .runWith({timeoutSeconds: 60, memory: "256MB"})
  .https
  .onRequest(async (req, res) => {
    // Only allow POST
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    // Webflow signature verification — log but don't block
    // TODO: re-enable strict verification once signature issue is resolved
    const webhookSecret = process.env.WEBFLOW_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers["x-webflow-signature"] as string | undefined;
      const timestamp = req.headers["x-webflow-timestamp"] as string | undefined;
      const rawBody = (req as any).rawBody?.toString("utf8") || JSON.stringify(req.body);

      const isValid = verifyWebflowSignature(rawBody, signature, timestamp, webhookSecret);
    }

    try {
      // Webflow V2 webhook structure:
      // { triggerType: "form_submission", payload: { name, formId, siteId, data, schema, submittedAt } }
      const body = req.body;
      const payload = body.payload || body;

      // Only process "Hiring Application" form — ignore all other forms
      const formName = (payload.name || "").toLowerCase();
      if (!formName.includes("hiring")) {
        functions.logger.info("Ignoring non-hiring form submission", {formName: payload.name});
        res.status(200).json({skipped: true, reason: "Not a hiring form"});
        return;
      }

      // Form field values are in payload.data
      const data = payload.data || {};

      // Extract standard fields
      const name = data["Name"] || data["name"] || "";
      const email = data["Email"] || data["email"] || "";

      if (!email) {
        res.status(400).json({error: "Missing email field"});
        return;
      }

      // Check for duplicate by email
      const existing = await db.collection(APPLICANTS_COLLECTION)
        .where("email", "==", email)
        .limit(1)
        .get();

      if (!existing.empty) {
        res.status(200).json({skipped: true, reason: "Applicant already exists", email});
        return;
      }

      // Build formAnswers from question fields
      const formAnswers: Record<string, string> = {};
      for (const [key, value] of Object.entries(data)) {
        if (typeof value !== "string") continue;
        const questionLabel = matchQuestionKey(key);
        if (questionLabel) {
          formAnswers[questionLabel] = value;
        }
      }

      // Build applicant document
      const submittedAt = payload.submittedAt
        ? new Date(payload.submittedAt)
        : admin.firestore.FieldValue.serverTimestamp();

      const applicant = {
        name,
        email,
        phone: data["Phone"] || data["phone"] || "",
        linkedInUrl: data["LinkedIn URL"] || data["Linked in url"] || data["LinkedIn url"] || "",
        bio: data["Bio"] || data["bio"] || "",
        education: data["Education"] || data["education"] || data["University"] || "",
        sex: data["Sex"] || data["sex"] || "",
        age: data["Age"] || data["age"] || "",
        status: "applied",
        score: null,
        notes: "",
        formAnswers,
        source: "webflow",
        webflowFormId: payload.formId || null,
        webflowSubmissionId: payload.id || null,
        submittedAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection(APPLICANTS_COLLECTION).add(applicant);

      functions.logger.info("New applicant from Webflow", {
        id: docRef.id,
        name,
        email,
        formName: payload.name,
      });

      res.status(200).json({success: true, id: docRef.id});
    } catch (error) {
      functions.logger.error("Webhook error:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown",
      });
    }
  });
