/**
 * Scheduled Cloud Function - Syncs Gmail emails every 3 days
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {fetchEmails, storeEmails} from "./gmailService";
import {SyncResult} from "./types";

/**
 * Scheduled function that runs every 3 days (72 hours)
 * Fetches emails from the last 3 days and stores them in Firestore
 */
export const scheduledEmailSync = functions.pubsub
  .schedule("every 72 hours")
  .timeZone("UTC")
  .onRun(async (context) => {
    console.log("Starting scheduled email sync...");

    const syncResult: SyncResult = {
      success: false,
      emailsFetched: 0,
      emailsStored: 0,
      errors: [],
      lastSyncTime: new Date(),
    };

    try {
      // Fetch emails from last 3 days via Gmail API OAuth2
      const emails = await fetchEmails(3);
      syncResult.emailsFetched = emails.length;

      // Store emails in Firestore
      const storedCount = await storeEmails(emails);
      syncResult.emailsStored = storedCount;

      syncResult.success = true;
      console.log(`Scheduled sync completed: ${storedCount}/${emails.length} new emails stored`);

      // Log sync metadata to Firestore
      await logSyncMetadata(syncResult);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      syncResult.errors.push(errorMessage);
      console.error("Scheduled sync failed:", error);

      // Log failed sync
      await logSyncMetadata(syncResult);
    }

    return syncResult;
  });

/**
 * Log sync metadata to Firestore for tracking
 */
async function logSyncMetadata(result: SyncResult): Promise<void> {
  try {
    const db = admin.firestore();
    await db.collection("newsletters").doc("metadata").set({
      lastSync: admin.firestore.Timestamp.fromDate(result.lastSyncTime),
      lastSyncSuccess: result.success,
      lastSyncEmailsFetched: result.emailsFetched,
      lastSyncEmailsStored: result.emailsStored,
      lastSyncErrors: result.errors,
    }, {merge: true});
  } catch (error) {
    console.error("Error logging sync metadata:", error);
  }
}
