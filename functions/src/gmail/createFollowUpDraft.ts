/**
 * Cloud Function: Create Follow-Up Gmail Draft
 * Searches for the original sent email thread and creates a reply draft
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {searchSentEmail, createFollowUpDraft} from "./followUpDraftService";

export interface CreateFollowUpDraftRequest {
  leadId: string;
  to: string;
  subject: string;
  bodyHtml: string;
  originalSubject: string;
}

export interface CreateFollowUpDraftResponse {
  success: boolean;
  draftId?: string;
  draftUrl?: string;
  threadFound?: boolean;
  message: string;
  error?: string;
}

/**
 * Create Follow-Up Gmail Draft Cloud Function
 * Requires authentication
 */
export const createFollowUpDraftCloud = functions.https.onCall(
  async (data: CreateFollowUpDraftRequest, context): Promise<CreateFollowUpDraftResponse> => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in to create follow-up drafts"
      );
    }

    console.log("📧 [FollowUpDraftCloud] Request received from user:", context.auth.uid);
    console.log("📧 [FollowUpDraftCloud] Lead ID:", data.leadId);
    console.log("📧 [FollowUpDraftCloud] To:", data.to);

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
      // Step 1: Search for the original sent email thread
      let threadInfo = null;
      if (data.originalSubject) {
        threadInfo = await searchSentEmail(data.to, data.originalSubject);
      }

      // Step 2: Create follow-up draft (threaded if possible)
      const result = await createFollowUpDraft({
        to: data.to,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        threadId: threadInfo?.threadId,
        messageId: threadInfo?.messageId,
      });

      if (!result.success) {
        console.error("❌ [FollowUpDraftCloud] Draft creation failed:", result.error);
        return {
          success: false,
          message: result.message || "Failed to create follow-up draft",
          error: result.error,
        };
      }

      console.log("✅ [FollowUpDraftCloud] Follow-up draft created:", result.draftId);

      // Step 3: Update lead's follow-up status in Firestore
      const db = admin.firestore();
      const leadRef = db.collection("leads").doc(data.leadId);

      await leadRef.update({
        "outreach.email.followUpStatus": "sent",
        "outreach.email.followUpDraftCreatedAt": admin.firestore.FieldValue.serverTimestamp(),
        "outreach.email.followUpDraftId": result.draftId,
        "outreach.email.followUpDraftUrl": result.draftUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log("✅ [FollowUpDraftCloud] Lead follow-up status updated");

      return {
        success: true,
        draftId: result.draftId,
        draftUrl: result.draftUrl,
        threadFound: result.threadFound,
        message: result.message || "Follow-up draft created successfully",
      };
    } catch (error: any) {
      console.error("❌ [FollowUpDraftCloud] Error:", error);

      if (error.code === "NOT_FOUND" || error.code === 5) {
        throw new functions.https.HttpsError(
          "not-found",
          `Lead not found: ${data.leadId}`
        );
      }

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        `Failed to create follow-up draft: ${error.message || "Unknown error"}`
      );
    }
  }
);
