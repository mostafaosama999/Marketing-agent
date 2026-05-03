import {google} from "googleapis";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {getAuthenticatedOAuth2Client} from "../../gmail/oauthService";

/**
 * Set up Gmail push notifications on Mostafa's personal inbox
 * (`mostafa.moqbel.ibrahim@gmail.com`, accountType: "admin").
 *
 * Gmail watches expire every 7 days — call setupNikolaGmailWatch on a
 * weekly schedule (or when receiving the first 401 from a stale watch).
 *
 * Pub/Sub topic must already exist on `marketing-app-cc237`:
 *   gcloud pubsub topics create nikola-gmail-replies --project marketing-app-cc237
 *   gcloud pubsub topics add-iam-policy-binding nikola-gmail-replies \
 *     --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
 *     --role=roles/pubsub.publisher --project marketing-app-cc237
 *
 * The Pub/Sub subscription should push to the nikolaGmailWebhook HTTPS Function.
 */

const PUBSUB_TOPIC = "projects/marketing-app-cc237/topics/nikola-gmail-replies";

export interface WatchResult {
  ok: boolean;
  historyId?: string;
  expiration?: string;
  error?: string;
}

export async function setupNikolaGmailWatch(): Promise<WatchResult> {
  try {
    const auth = await getAuthenticatedOAuth2Client("admin");
    const gmail = google.gmail({version: "v1", auth});
    const res = await gmail.users.watch({
      userId: "me",
      requestBody: {
        topicName: PUBSUB_TOPIC,
        labelIds: ["INBOX"],
        labelFilterAction: "include",
      },
    });
    const historyId = res.data.historyId || undefined;
    const expiration = res.data.expiration || undefined;
    // Persist current historyId so notificationHandler knows the baseline
    await admin.firestore().doc("nikolaGmailWatch/state").set(
      {
        accountType: "admin",
        historyId,
        expiration,
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
    functions.logger.info("Nikola Gmail watch set up", {historyId, expiration});
    return {ok: true, historyId, expiration};
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    functions.logger.error("Failed to set up Gmail watch", {error: msg});
    return {ok: false, error: msg};
  }
}

/** Read the last-seen historyId so notificationHandler can fetch the delta. */
export async function getLastHistoryId(): Promise<string | undefined> {
  const snap = await admin.firestore().doc("nikolaGmailWatch/state").get();
  if (!snap.exists) return undefined;
  return (snap.data() as {historyId?: string}).historyId;
}

/** Update the last-seen historyId after successful processing. */
export async function setLastHistoryId(historyId: string): Promise<void> {
  await admin.firestore().doc("nikolaGmailWatch/state").set(
    {historyId, lastProcessedAt: admin.firestore.FieldValue.serverTimestamp()},
    {merge: true}
  );
}
