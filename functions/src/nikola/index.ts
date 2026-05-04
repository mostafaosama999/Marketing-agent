/**
 * Nikola Cloud Function exports — registered from src/index.ts.
 *
 * Deployed functions:
 *   - nikolaSlackEvents          HTTPS     Slack Events API webhook
 *   - nikolaSlashCommand         HTTPS     /nikola slash dispatcher
 *   - nikolaMorningBatch         pubsub    DISABLED 2026-05-04 (see below)
 *   - nikolaContextSync          pubsub    Daily 03:00 UTC Notion + reports sync
 *   - nikolaGmailWebhook         HTTPS     Pub/Sub push handler for Gmail replies
 *   - setupNikolaGmailWatchHttp  HTTPS     One-time / weekly watch renewal
 *   - nikolaWorkQueueProcessor   firestore onCreate work-queue processor
 *   - nikolaCompanyIndustrySync  firestore onUpdate trigger on entities (W2)
 *   - nikolaMemoryExtractor      firestore onUpdate trigger on workQueue (W4)
 */
import * as functions from "firebase-functions";
// Imports for the morning batch were removed 2026-05-04 with the cron disable.
// To re-enable, restore both:
//   import {defineSecret} from "firebase-functions/params";
//   import {runMorningBatch} from "./jobs/morningBatch";
//   const apifyTokenSecret = defineSecret("APIFY_TOKEN");
import {runContextSync} from "./jobs/contextSync";
import {processGmailPushNotification} from "./gmail/notificationHandler";
import {setupNikolaGmailWatch} from "./gmail/watchManager";

export {nikolaWorkQueueProcessor} from "./jobs/workQueueProcessor";
export {nikolaCompanyIndustrySync} from "./jobs/companyIndustrySync";
export {nikolaMemoryExtractor} from "./jobs/memoryExtractor";

export {
  nikolaSlackEventsHandler as nikolaSlackEvents,
  nikolaSlashCommandHandler as nikolaSlashCommand,
} from "./webhooks/slackEventsEntry";

/**
 * Daily morning batch — DISABLED 2026-05-04 by Mostafa.
 * The 07:00 UTC weekday cron was firing batched outreach drafts that didn't
 * fit his current workflow. To re-enable: uncomment the block below and run
 * `firebase deploy --only functions:nikolaMorningBatch --project marketing-app-cc237`.
 */
// export const nikolaMorningBatch = functions
//   .runWith({
//     timeoutSeconds: 540,
//     memory: "1GB",
//     secrets: [apifyTokenSecret],
//   })
//   .pubsub.schedule("0 7 * * 1-5")
//   .timeZone("UTC")
//   .onRun(async () => {
//     await runMorningBatch();
//     return null;
//   });

/** Daily Notion + bundled reports → nikolaContext sync. 03:00 UTC. */
export const nikolaContextSync = functions
  .runWith({timeoutSeconds: 300, memory: "512MB"})
  .pubsub.schedule("0 3 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    await runContextSync();
    return null;
  });

/** Gmail Pub/Sub push handler — POSTed by Pub/Sub subscription. */
export const nikolaGmailWebhook = functions
  .runWith({timeoutSeconds: 540, memory: "1GB"})
  .https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }
    const message = (req.body as {message?: {data?: string}})?.message;
    if (!message?.data) {
      res.status(400).send("Missing message.data");
      return;
    }
    try {
      await processGmailPushNotification(message.data);
      res.status(200).send("ok");
    } catch (e) {
      functions.logger.error("nikolaGmailWebhook failed", {
        error: e instanceof Error ? e.message : String(e),
      });
      res.status(200).send("ok"); // ack to Pub/Sub even on internal error
    }
  });

/** Manual + weekly watch renewal endpoint. Hit with GET or POST. */
export const setupNikolaGmailWatchHttp = functions
  .runWith({timeoutSeconds: 60})
  .https.onRequest(async (_req, res) => {
    const result = await setupNikolaGmailWatch();
    res.status(result.ok ? 200 : 500).json(result);
  });
