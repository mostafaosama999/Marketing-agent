/**
 * Cloud Function: Create Hiring Gmail Draft
 * Creates a Gmail draft in the hiring email account for applicant communication
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {createGmailDraft} from "./draftService";

export interface CreateHiringDraftRequest {
  applicantId: string;
  to: string;
  subject: string;
  bodyHtml: string;
}

export interface CreateHiringDraftResponse {
  success: boolean;
  draftId?: string;
  draftUrl?: string;
  message: string;
  error?: string;
}

export const createHiringDraftCloud = functions.https.onCall(
  async (
    data: CreateHiringDraftRequest,
    context
  ): Promise<CreateHiringDraftResponse> => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in to create hiring email drafts"
      );
    }

    console.log("📧 [HiringDraft] Request from user:", context.auth.uid);
    console.log("📧 [HiringDraft] Applicant ID:", data.applicantId);
    console.log("📧 [HiringDraft] To:", data.to);

    // Validate required fields
    if (!data.applicantId || !data.to || !data.subject || !data.bodyHtml) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: applicantId, to, subject, bodyHtml"
      );
    }

    // Basic email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.to)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        `Invalid email address: ${data.to}`
      );
    }

    try {
      // Create Gmail draft using the hiring account
      const result = await createGmailDraft(
        {
          to: data.to,
          subject: data.subject,
          bodyHtml: data.bodyHtml,
        },
        "hiring"
      );

      if (!result.success) {
        console.error("❌ [HiringDraft] Draft creation failed:", result.error);
        return {
          success: false,
          message: result.message || "Failed to create draft",
          error: result.error,
        };
      }

      console.log("✅ [HiringDraft] Draft created:", result.draftId);

      // Update applicant's outreach status in Firestore
      const db = admin.firestore();
      const applicantRef = db.collection("applicants").doc(data.applicantId);

      await applicantRef.update({
        "outreach.email.status": "draft_created",
        "outreach.email.draftCreatedAt":
          admin.firestore.FieldValue.serverTimestamp(),
        "outreach.email.draftId": result.draftId,
        "outreach.email.draftUrl": result.draftUrl,
        "outreach.email.subject": data.subject,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("✅ [HiringDraft] Applicant outreach status updated");

      return {
        success: true,
        draftId: result.draftId,
        draftUrl: result.draftUrl,
        message: "Hiring draft created successfully",
      };
    } catch (error: any) {
      console.error("❌ [HiringDraft] Error:", error);

      if (error.code === "NOT_FOUND" || error.code === 5) {
        throw new functions.https.HttpsError(
          "not-found",
          `Applicant not found: ${data.applicantId}`
        );
      }

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Failed to create hiring draft: ${error.message || "Unknown error"}`
      );
    }
  }
);
