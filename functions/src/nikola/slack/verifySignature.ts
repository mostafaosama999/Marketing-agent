import * as crypto from "crypto";
import {slackSigningSecret} from "../config";

/**
 * Verify Slack request signatures per https://api.slack.com/authentication/verifying-requests-from-slack
 *
 * MUST use crypto.timingSafeEqual to avoid timing attacks (per spec, never string compare).
 *
 * Slack sends:
 *   x-slack-request-timestamp: 1531420618
 *   x-slack-signature: v0=a2114d57b48e...
 *
 * The signed payload is `v0:<timestamp>:<raw body>`, HMAC-SHA256 with the signing secret.
 */
export interface SlackSignatureInput {
  rawBody: string | Buffer;
  timestamp: string | undefined;
  signature: string | undefined;
}

export function verifySlackSignature(input: SlackSignatureInput): boolean {
  if (!input.timestamp || !input.signature) return false;

  // Reject requests older than 5 minutes (replay protection)
  const ts = parseInt(input.timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > 60 * 5) return false;

  const secret = slackSigningSecret();
  const body = typeof input.rawBody === "string" ? input.rawBody : input.rawBody.toString("utf8");
  const baseString = `v0:${input.timestamp}:${body}`;
  const computed = "v0=" + crypto.createHmac("sha256", secret).update(baseString).digest("hex");

  const computedBuf = Buffer.from(computed, "utf8");
  const providedBuf = Buffer.from(input.signature, "utf8");
  if (computedBuf.length !== providedBuf.length) return false;
  try {
    return crypto.timingSafeEqual(computedBuf, providedBuf);
  } catch {
    return false;
  }
}
