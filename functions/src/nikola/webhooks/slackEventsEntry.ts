import * as functions from "firebase-functions";
import {dispatchSlackEvent} from "../slack/eventsHandler";
import {dispatchSlash, SlashPayload} from "../slack/slashHandler";
import {verifySlackSignature} from "../slack/verifySignature";

/**
 * HTTPS Function entry — handles BOTH Slack Events API webhooks (JSON body)
 * and Slack slash commands (urlencoded body) on a single endpoint pair.
 *
 * Two separate Cloud Functions are exported (so Slack app config can point
 * each at its own URL):
 *   - nikolaSlackEvents (Events API, JSON)
 *   - nikolaSlashCommand (Slash, x-www-form-urlencoded)
 *
 * Both share signature verification.
 */

export const nikolaSlackEventsHandler = functions
  .runWith({timeoutSeconds: 60, memory: "512MB"})
  .https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }
    const rawBody = (req as unknown as {rawBody?: Buffer | string}).rawBody;
    if (!rawBody) {
      res.status(400).send("Missing body");
      return;
    }
    if (
      !verifySlackSignature({
        rawBody,
        timestamp: req.header("x-slack-request-timestamp"),
        signature: req.header("x-slack-signature"),
      })
    ) {
      functions.logger.warn("Slack signature verification failed (events)");
      res.status(401).send("Unauthorized");
      return;
    }

    // Slack retries the same event when it doesn't get a 200 within ~3s.
    // On Cloud Functions cold start the full round-trip (verify + dispatch
    // + Firestore enqueue) can blow past that, so the retry creates a
    // duplicate work doc and the user sees two replies. Acknowledge retries
    // immediately without re-processing — the original delivery either
    // succeeded (in which case we'd be doubling) or failed (in which case
    // we'd want a real fix, not a retry from the same prompt).
    //
    // Slack docs: https://api.slack.com/apis/connections/events-api#retries
    const retryNum = req.header("x-slack-retry-num");
    if (retryNum) {
      functions.logger.info("Slack retry received — acking without re-processing", {
        retryNum,
        retryReason: req.header("x-slack-retry-reason"),
      });
      // Telling Slack to stop retrying this specific event.
      res.set("X-Slack-No-Retry", "1");
      res.status(200).json({ok: true});
      return;
    }

    const body = req.body;

    // Always 200 within 3s; do real work in dispatchSlackEvent which is fast.
    try {
      const result = await dispatchSlackEvent(body);
      if (result.challenge) {
        res.status(200).json({challenge: result.challenge});
        return;
      }
      res.status(200).json({ok: true});
    } catch (e) {
      functions.logger.error("nikolaSlackEvents handler error", {
        error: e instanceof Error ? e.message : String(e),
      });
      res.status(200).json({ok: true}); // never retry-loop Slack
    }
  });

export const nikolaSlashCommandHandler = functions
  .runWith({timeoutSeconds: 60, memory: "512MB"})
  .https.onRequest(async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }
    const rawBody = (req as unknown as {rawBody?: Buffer | string}).rawBody;
    if (!rawBody) {
      res.status(400).send("Missing body");
      return;
    }
    if (
      !verifySlackSignature({
        rawBody,
        timestamp: req.header("x-slack-request-timestamp"),
        signature: req.header("x-slack-signature"),
      })
    ) {
      functions.logger.warn("Slack signature verification failed (slash)");
      res.status(401).send("Unauthorized");
      return;
    }

    const payload = req.body as SlashPayload;
    try {
      const response = await dispatchSlash(payload);
      res.status(200).json(response);
    } catch (e) {
      functions.logger.error("nikolaSlashCommand handler error", {
        error: e instanceof Error ? e.message : String(e),
      });
      res.status(200).json({
        response_type: "ephemeral",
        text: `❌ Internal error: ${e instanceof Error ? e.message : String(e)}`,
      });
    }
  });
