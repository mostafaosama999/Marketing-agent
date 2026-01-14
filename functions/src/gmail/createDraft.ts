/**
 * Cloud Function: Create Gmail Draft
 * Callable function that creates a Gmail draft and updates lead outreach status
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {createGmailDraft} from "./draftService";

export interface CreateDraftRequest {
  leadId: string;
  to: string;
  subject: string;
  bodyHtml: string;
  cc?: string;
  bcc?: string;
}

export interface CreateDraftResponse {
  success: boolean;
  draftId?: string;
  draftUrl?: string;
  message: string;
  error?: string;
}

/**
 * Create Gmail Draft Cloud Function
 * Requires authentication
 */
export const createGmailDraftCloud = functions.https.onCall(
  async (data: CreateDraftRequest, context): Promise<CreateDraftResponse> => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in to create Gmail drafts"
      );
    }

    console.log("📧 [CreateDraftCloud] Request received from user:", context.auth.uid);
    console.log("📧 [CreateDraftCloud] Lead ID:", data.leadId);
    console.log("📧 [CreateDraftCloud] To:", data.to);

    // Validate required fields
    if (!data.leadId || !data.to || !data.subject || !data.bodyHtml) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required fields: leadId, to, subject, bodyHtml"
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
      // Create Gmail draft
      const result = await createGmailDraft({
        to: data.to,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        cc: data.cc,
        bcc: data.bcc,
      });

      if (!result.success) {
        console.error("❌ [CreateDraftCloud] Draft creation failed:", result.error);
        return {
          success: false,
          message: result.message || "Failed to create draft",
          error: result.error,
        };
      }

      console.log("✅ [CreateDraftCloud] Draft created:", result.draftId);

      // Update lead's outreach status in Firestore
      const db = admin.firestore();
      const leadRef = db.collection("leads").doc(data.leadId);

      await leadRef.update({
        "outreach.email.status": "sent",
        "outreach.email.sentAt": admin.firestore.FieldValue.serverTimestamp(),
        "outreach.email.draftCreatedAt": admin.firestore.FieldValue.serverTimestamp(),
        "outreach.email.draftId": result.draftId,
        "outreach.email.draftUrl": result.draftUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("✅ [CreateDraftCloud] Lead outreach status updated");

      return {
        success: true,
        draftId: result.draftId,
        draftUrl: result.draftUrl,
        message: "Draft created successfully",
      };
    } catch (error: any) {
      console.error("❌ [CreateDraftCloud] Error:", error);

      // Check if it's a Firestore error
      if (error.code === "NOT_FOUND" || error.code === 5) {
        throw new functions.https.HttpsError(
          "not-found",
          `Lead not found: ${data.leadId}`
        );
      }

      // Re-throw HttpsError
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Generic error
      throw new functions.https.HttpsError(
        "internal",
        `Failed to create Gmail draft: ${error.message || "Unknown error"}`
      );
    }
  }
);
