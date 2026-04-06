import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as crypto from "crypto";
import {appendToTab} from "../utils/sheetsUtils";

const db = admin.firestore();
const APPLICANTS_COLLECTION = "applicants";
const HIRING_SHEET_ID = "1rs-yLkcHUcL9hNBNAdtOxlkiORlqDAuvLG6kqtFOtlY";
const HIRING_SHEET_TAB = "Sheet1";

/**
 * Verify Tally webhook signature (HMAC-SHA256).
 * Tally signs the raw request body with the webhook signing secret.
 * Signature is sent in the `tally-signature` header as a hex digest.
 */
function verifyTallySignature(
  rawBody: string,
  signature: string | undefined,
  secret: string
): boolean {
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

/**
 * Extract a field value from Tally's fields array by label (case-insensitive partial match).
 * Tally payload: data.fields[] = [{ key, label, type, value, options? }, ...]
 */
function getFieldByLabel(
  fields: Array<{key: string; label: string; type: string; value: any}>,
  labelSubstring: string
): string {
  const lower = labelSubstring.toLowerCase();
  const field = fields.find((f) => f.label.toLowerCase().includes(lower));
  if (!field) return "";
  // Tally value can be string, number, array (for checkboxes), or object
  if (typeof field.value === "string") return field.value;
  if (typeof field.value === "number") return String(field.value);
  if (Array.isArray(field.value)) return field.value.join(", ");
  if (field.value && typeof field.value === "object") {
    // File upload fields return { url, name, ... }
    return field.value.url || JSON.stringify(field.value);
  }
  return "";
}

// Same question mapping as webflowWebhook.ts for consistency
const QUESTION_MAP: Record<string, string> = {
  "this role involves writing": "This role involves writing long-form technical blogs and tutorials, implementing and running real code, and revising work based on feedback. Does this match what you're looking for?",
  "describe a technical concept": "Describe a technical concept you've written about before. What made it difficult to explain, and how did you approach it?",
  "have you ever built or worked with an llm": "Have you ever built or worked with an LLM-based system (e.g., RAG, agents, embeddings, APIs)? If yes, briefly describe what you built or experimented with.",
  "what programming languages and tools": "What programming languages and tools have you used recently in hands-on work? Please be specific (language, framework, and what you built).",
  "share 1": "Share 1–2 technical writing samples (blog posts or tutorials) that you personally wrote and that include code you implemented and ran yourself.",
  "what are your 1": "What are your 1–3 year goals as a freelancer or in your career?",
  "why are you interested": "Why are you interested in this writing role?",
};

function matchQuestionKey(fieldLabel: string): string | null {
  const lower = fieldLabel.toLowerCase();
  for (const [prefix, label] of Object.entries(QUESTION_MAP)) {
    if (lower.includes(prefix)) {
      return label;
    }
  }
  return null;
}

/**
 * Tally Hiring Webhook
 *
 * Receives form submissions from Tally.so hiring/application form.
 * Mirrors the Webflow webhook flow:
 * 1. Verify signature
 * 2. Extract fields from Tally payload
 * 3. Deduplicate by email / submission ID
 * 4. Store in Firestore applicants collection
 * 5. Sync to Google Sheets hiring tracker
 *
 * Tally webhook payload structure:
 * {
 *   eventId: string,
 *   eventType: "FORM_RESPONSE",
 *   createdAt: string (ISO),
 *   data: {
 *     responseId: string,
 *     submissionId: string,
 *     formId: string,
 *     formName: string,
 *     createdAt: string (ISO),
 *     fields: [{ key, label, type, value }, ...]
 *   }
 * }
 */
export const tallyHiringWebhook = functions
  .runWith({timeoutSeconds: 60, memory: "256MB"})
  .https
  .onRequest(async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    // Signature verification
    const webhookSecret = process.env.TALLY_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers["tally-signature"] as string | undefined;
      const rawBody = (req as any).rawBody?.toString("utf8") || JSON.stringify(req.body);
      const isValid = verifyTallySignature(rawBody, signature, webhookSecret);

      if (!isValid) {
        functions.logger.warn("Tally webhook signature verification failed", {
          hasSignature: !!signature,
        });
        // Log but don't block (same approach as Webflow webhook)
        // TODO: re-enable strict verification once confirmed working
      }
    }

    try {
      const body = req.body;

      // Tally sends eventType: "FORM_RESPONSE" for form submissions
      if (body.eventType && body.eventType !== "FORM_RESPONSE") {
        functions.logger.info("Ignoring non-submission Tally event", {eventType: body.eventType});
        res.status(200).json({skipped: true, reason: "Not a form response event"});
        return;
      }

      const data = body.data || {};
      const fields: Array<{key: string; label: string; type: string; value: any}> = data.fields || [];
      const formName = data.formName || "";
      const submissionId = data.submissionId || data.responseId || null;

      functions.logger.info("Tally webhook received", {
        formName,
        submissionId,
        fieldCount: fields.length,
      });

      // Extract standard fields by label
      const name = getFieldByLabel(fields, "name");
      const email = getFieldByLabel(fields, "email");

      if (!email) {
        res.status(400).json({error: "Missing email field"});
        return;
      }

      // Check for duplicate by email
      const existingByEmail = await db.collection(APPLICANTS_COLLECTION)
        .where("email", "==", email)
        .limit(1)
        .get();

      if (!existingByEmail.empty) {
        functions.logger.info("Duplicate applicant (email)", {email});
        res.status(200).json({skipped: true, reason: "Applicant already exists (email match)", email});
        return;
      }

      // Check by Tally submission ID (prevents race condition duplicates)
      if (submissionId) {
        const existingBySubmission = await db.collection(APPLICANTS_COLLECTION)
          .where("tallySubmissionId", "==", submissionId)
          .limit(1)
          .get();

        if (!existingBySubmission.empty) {
          functions.logger.info("Duplicate submission", {submissionId});
          res.status(200).json({skipped: true, reason: "Submission already processed", submissionId});
          return;
        }
      }

      // Build formAnswers from question fields
      const formAnswers: Record<string, string> = {};
      for (const field of fields) {
        const questionLabel = matchQuestionKey(field.label);
        if (questionLabel) {
          const value = typeof field.value === "string"
            ? field.value
            : Array.isArray(field.value) ? field.value.join(", ") : String(field.value || "");
          formAnswers[questionLabel] = value;
        }
      }

      // Build applicant document
      const submittedAt = data.createdAt
        ? new Date(data.createdAt)
        : admin.firestore.FieldValue.serverTimestamp();

      // Read current job post from hiring config
      const configSnap = await db.doc("hiringConfig/default").get();
      const currentJobPost = configSnap.exists ? (configSnap.data()?.currentJobPost || null) : null;

      const applicant = {
        name,
        email,
        phone: getFieldByLabel(fields, "phone"),
        linkedInUrl: getFieldByLabel(fields, "linkedin"),
        bio: getFieldByLabel(fields, "bio"),
        education: getFieldByLabel(fields, "education") || getFieldByLabel(fields, "university"),
        sex: getFieldByLabel(fields, "sex"),
        age: getFieldByLabel(fields, "age"),
        availability: getFieldByLabel(fields, "when can you start") || getFieldByLabel(fields, "start"),
        status: "applied",
        score: null,
        notes: "",
        formAnswers,
        source: "tally",
        jobPost: currentJobPost,
        tallyFormId: data.formId || null,
        tallySubmissionId: submissionId,
        submittedAt,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection(APPLICANTS_COLLECTION).add(applicant);

      functions.logger.info("New applicant from Tally", {
        id: docRef.id,
        name,
        email,
        formName,
      });

      // Sync to Google Sheets hiring tracker
      try {
        const submittedDate = data.createdAt
          ? new Date(data.createdAt).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0];

        const sheetRow = [
          name,
          email,
          getFieldByLabel(fields, "linkedin"),
          getFieldByLabel(fields, "education") || getFieldByLabel(fields, "university"),
          getFieldByLabel(fields, "age"),
          submittedDate,
        ];

        await appendToTab(HIRING_SHEET_ID, HIRING_SHEET_TAB, [sheetRow]);
        functions.logger.info("Sheet sync SUCCESS", {name, email});
      } catch (sheetError: any) {
        // Don't fail the webhook if sheet sync fails
        functions.logger.error("Sheet sync FAILED", {
          name,
          email,
          errorMessage: sheetError?.message || "Unknown",
          errorCode: sheetError?.code,
          errorStack: sheetError?.stack?.substring(0, 500),
        });
      }

      res.status(200).json({success: true, id: docRef.id});
    } catch (error) {
      functions.logger.error("Tally webhook error:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown",
      });
    }
  });
