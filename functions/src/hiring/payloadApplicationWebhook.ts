import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {appendToTab} from "../utils/sheetsUtils";

const db = admin.firestore();
const APPLICANTS_COLLECTION = "applicants";
const HIRING_SHEET_ID = "1rs-yLkcHUcL9hNBNAdtOxlkiORlqDAuvLG6kqtFOtlY";
const HIRING_SHEET_TAB = "Sheet1";

const QUESTION_MAP: Record<string, string> = {
  "interest": "Why are you interested in this writing role?",
  "roleMatch": "This role involves writing long-form technical blogs and tutorials, implementing and running real code, and revising work based on feedback. Does this match what you're looking for?",
  "technicalWriting": "Describe a technical concept you've written about before. What made it difficult to explain, and how did you approach it?",
  "llmExperience": "Have you ever built or worked with an LLM-based system (e.g., RAG, agents, embeddings, APIs)? If yes, briefly describe what you built or experimented with.",
  "techStack": "What programming languages and tools have you used recently in hands-on work? Please be specific (language, framework, and what you built).",
  "writingSamples": "Share 1–2 technical writing samples (blog posts or tutorials) that you personally wrote and that include code you implemented and ran yourself.",
  "careerGoals": "What are your 1–3 year goals as a freelancer or in your career?",
};

/**
 * Payload CMS Application Webhook
 *
 * Called by the CodeContent website's Payload afterChange hook
 * when a new application is submitted via the native form.
 * Mirrors the Webflow webhook flow:
 * 1. Deduplicate by email
 * 2. Store in Firestore applicants collection
 * 3. Sync to Google Sheets hiring tracker
 */
export const payloadApplicationWebhook = functions
  .runWith({timeoutSeconds: 60, memory: "256MB"})
  .https
  .onRequest(async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    // Verify shared secret
    const secret = process.env.PAYLOAD_WEBHOOK_SECRET;
    if (secret) {
      const provided = req.headers["x-webhook-secret"] as string | undefined;
      if (provided !== secret) {
        functions.logger.warn("Payload webhook secret mismatch");
        res.status(401).json({error: "Unauthorized"});
        return;
      }
    }

    try {
      const data = req.body;

      const name = data.name || "";
      const email = data.email || "";

      if (!email) {
        res.status(400).json({error: "Missing email field"});
        return;
      }

      functions.logger.info("Payload application webhook received", {name, email});

      // Check for duplicate by email
      const existingByEmail = await db.collection(APPLICANTS_COLLECTION)
        .where("email", "==", email)
        .limit(1)
        .get();

      if (!existingByEmail.empty) {
        functions.logger.info("Duplicate applicant (email)", {email});
        res.status(200).json({skipped: true, reason: "Applicant already exists", email});
        return;
      }

      // Build formAnswers
      const formAnswers: Record<string, string> = {};
      for (const [key, label] of Object.entries(QUESTION_MAP)) {
        if (data[key]) {
          formAnswers[label] = data[key];
        }
      }

      // Read current job post from hiring config
      const configSnap = await db.doc("hiringConfig/default").get();
      const currentJobPost = configSnap.exists ? (configSnap.data()?.currentJobPost || null) : null;

      const applicant = {
        name,
        email,
        phone: data.phone || "",
        linkedInUrl: data.linkedIn || "",
        bio: "",
        education: data.education || "",
        sex: data.sex || "",
        age: data.age ? String(data.age) : "",
        availability: data.startDate || "",
        status: "applied",
        score: null,
        notes: "",
        formAnswers,
        source: "website",
        jobPost: currentJobPost,
        payloadId: data.id ? String(data.id) : null,
        submittedAt: data.createdAt ? new Date(data.createdAt) : admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const docRef = await db.collection(APPLICANTS_COLLECTION).add(applicant);

      functions.logger.info("New applicant from website", {
        id: docRef.id,
        name,
        email,
      });

      // Sync to Google Sheets
      try {
        const submittedDate = new Date().toISOString().split("T")[0];
        const sheetRow = [
          name,
          email,
          data.linkedIn || "",
          data.education || "",
          data.age ? String(data.age) : "",
          submittedDate,
        ];

        await appendToTab(HIRING_SHEET_ID, HIRING_SHEET_TAB, [sheetRow]);
        functions.logger.info("Sheet sync SUCCESS", {name, email});
      } catch (sheetError: any) {
        functions.logger.error("Sheet sync FAILED", {
          name,
          email,
          errorMessage: sheetError?.message || "Unknown",
        });
      }

      res.status(200).json({success: true, id: docRef.id});
    } catch (error) {
      functions.logger.error("Payload application webhook error:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown",
      });
    }
  });
