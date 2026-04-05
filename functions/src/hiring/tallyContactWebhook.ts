import * as functions from "firebase-functions";
import * as crypto from "crypto";
import {sendSlackMessageToChannel} from "../utils/slackUtils";

const SLACK_CHANNEL = functions.config().slack?.channel || "project-reports";

/**
 * Verify Tally webhook signature (HMAC-SHA256).
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
 */
function getFieldByLabel(
  fields: Array<{key: string; label: string; type: string; value: any}>,
  labelSubstring: string
): string {
  const lower = labelSubstring.toLowerCase();
  const field = fields.find((f) => f.label.toLowerCase().includes(lower));
  if (!field) return "";
  if (typeof field.value === "string") return field.value;
  if (typeof field.value === "number") return String(field.value);
  if (Array.isArray(field.value)) return field.value.join(", ");
  return "";
}

/**
 * Tally Contact Form Webhook
 *
 * Receives contact form submissions from Tally and sends a Slack notification.
 */
export const tallyContactWebhook = functions
  .runWith({timeoutSeconds: 30, memory: "256MB"})
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
        functions.logger.warn("Tally contact webhook signature verification failed");
      }
    }

    try {
      const body = req.body;

      if (body.eventType && body.eventType !== "FORM_RESPONSE") {
        res.status(200).json({skipped: true, reason: "Not a form response event"});
        return;
      }

      const data = body.data || {};
      const fields = data.fields || [];

      const name = getFieldByLabel(fields, "name");
      const email = getFieldByLabel(fields, "email");
      const company = getFieldByLabel(fields, "company");
      const docsUrl = getFieldByLabel(fields, "product docs") || getFieldByLabel(fields, "url");
      const message = getFieldByLabel(fields, "content needs") || getFieldByLabel(fields, "message");

      functions.logger.info("Contact form submission", {name, email, company});

      // Send Slack notification
      const slackMessage =
        `📩 *New Contact Form Submission*\n\n` +
        `*Name:* ${name || "—"}\n` +
        `*Email:* ${email || "—"}\n` +
        `*Company:* ${company || "—"}\n` +
        `*Docs URL:* ${docsUrl || "—"}\n` +
        `*Message:* ${message || "—"}`;

      try {
        await sendSlackMessageToChannel(
          SLACK_CHANNEL,
          slackMessage,
          "CodeContent Website",
          ":incoming_envelope:"
        );
        functions.logger.info("Slack notification sent for contact form", {email});
      } catch (slackError: any) {
        functions.logger.error("Slack notification failed", {
          errorMessage: slackError?.message || "Unknown",
        });
      }

      res.status(200).json({success: true});
    } catch (error) {
      functions.logger.error("Contact webhook error:", error);
      res.status(500).json({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown",
      });
    }
  });
