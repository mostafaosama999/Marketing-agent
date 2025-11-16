/**
 * Manual Email Sync Cloud Function
 * Allows users to trigger email sync on-demand from the UI
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v1/auth";
import {fetchEmails, storeEmails} from "./gmailService";
import {ManualSyncRequest, ManualSyncResponse, SyncResult} from "./types";

/**
 * HTTPS Callable function for manual email sync
 * Can be triggered by users from the UI
 */
export const manualEmailSync = functions.https.onCall(
  async (
    data: ManualSyncRequest,
    context
  ): Promise<ManualSyncResponse> => {
    // Authentication check
    if (!context.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to sync emails"
      );
    }

    console.log(`Manual email sync triggered by user: ${context.auth.uid}`);

    const syncResult: SyncResult = {
      success: false,
      emailsFetched: 0,
      emailsStored: 0,
      errors: [],
      lastSyncTime: new Date(),
    };

    try {
      // Get parameters with defaults
      const emailCount = data.emailCount || 50;
      const daysBack = data.daysBack || 3;

      console.log(`Manual sync requested: ${emailCount} emails from last ${daysBack} days`);

      // Fetch emails from Gmail API OAuth2
      const emails = await fetchEmails(daysBack, emailCount);
      syncResult.emailsFetched = emails.length;

      // Store emails in Firestore
      const storedCount = await storeEmails(emails);
      syncResult.emailsStored = storedCount;

      syncResult.success = true;

      // Update metadata
      await updateSyncMetadata(syncResult, context.auth.uid);

      console.log(`Manual sync completed: ${storedCount}/${emails.length} new emails stored`);

      return {
        success: true,
        result: syncResult,
        message: `Successfully synced ${storedCount} new emails (${emails.length} total fetched)`,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      syncResult.errors.push(errorMessage);
      console.error("Manual sync failed:", error);

      // Update metadata with error
      await updateSyncMetadata(syncResult, context.auth.uid);

      throw new HttpsError(
        "internal",
        `Email sync failed: ${errorMessage}`
      );
    }
  }
);

/**
 * Update sync metadata in Firestore
 */
async function updateSyncMetadata(result: SyncResult, userId: string): Promise<void> {
  try {
    const db = admin.firestore();
    await db.collection("newsletters").doc("metadata").set({
      lastSync: admin.firestore.Timestamp.fromDate(result.lastSyncTime),
      lastSyncSuccess: result.success,
      lastSyncEmailsFetched: result.emailsFetched,
      lastSyncEmailsStored: result.emailsStored,
      lastSyncErrors: result.errors,
      lastSyncBy: userId,
      lastSyncType: "manual",
    }, {merge: true});
  } catch (error) {
    console.error("Error updating sync metadata:", error);
  }
}
