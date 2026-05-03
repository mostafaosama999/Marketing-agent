import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {google} from "googleapis";
import {getAuthenticatedOAuth2Client} from "../../gmail/oauthService";
import {humanizeVariants} from "../humanizeWrap";
import {runSkill} from "../skillRunner";
import {postDraft, postNotice} from "../slack/postDraft";
import {LeadDoc, NikolaThread, SkillResult} from "../types";
import {normaliseVariants} from "../variantParser";
import {getLastHistoryId, setLastHistoryId} from "./watchManager";
import {matchReplyToLead} from "./replyMatcher";

/**
 * Pub/Sub push handler for Gmail notifications on the admin account
 * (`mostafa.moqbel.ibrahim@gmail.com`).
 *
 * Filters strictly: only processes messages where From matches a Nikola-tracked
 * lead (`lead.email` or `lead.outreach.email.recipientEmail`) OR the subject
 * matches a previous Nikola draft. Personal inbox traffic is silently dropped.
 */

interface GmailPubSubData {
  emailAddress: string;
  historyId: string;
}

interface GmailMessageHeaderEntry {
  name?: string;
  value?: string;
}

export async function processGmailPushNotification(pubsubBase64Data: string): Promise<void> {
  const decoded = Buffer.from(pubsubBase64Data, "base64").toString("utf-8");
  let payload: GmailPubSubData;
  try {
    payload = JSON.parse(decoded);
  } catch (e) {
    functions.logger.error("Invalid Pub/Sub payload", {error: (e as Error).message});
    return;
  }
  if (payload.emailAddress.toLowerCase() !== "mostafa.moqbel.ibrahim@gmail.com") {
    functions.logger.debug("Ignoring notification for unrelated mailbox", {
      mailbox: payload.emailAddress,
    });
    return;
  }

  const auth = await getAuthenticatedOAuth2Client("admin");
  const gmail = google.gmail({version: "v1", auth});
  const startHistoryId = (await getLastHistoryId()) || payload.historyId;

  // Fetch the history delta
  let history;
  try {
    history = await gmail.users.history.list({
      userId: "me",
      startHistoryId,
      historyTypes: ["messageAdded"],
      maxResults: 100,
    });
  } catch (e) {
    functions.logger.error("Gmail history.list failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    return;
  }

  const histories = history.data.history || [];
  if (histories.length === 0) {
    await setLastHistoryId(payload.historyId);
    return;
  }

  const messageIds = new Set<string>();
  for (const h of histories) {
    for (const m of h.messagesAdded || []) {
      if (m.message?.id) messageIds.add(m.message.id);
    }
  }

  for (const msgId of messageIds) {
    try {
      const msgRes = await gmail.users.messages.get({userId: "me", id: msgId, format: "full"});
      const msg = msgRes.data;
      const headers = (msg.payload?.headers || []) as GmailMessageHeaderEntry[];
      const fromHeader = headers.find((h) => h.name?.toLowerCase() === "from")?.value || "";
      const subjectHeader = headers.find((h) => h.name?.toLowerCase() === "subject")?.value || "";
      const fromEmail = parseFromAddress(fromHeader);

      const lead = await matchReplyToLead({fromEmail, subject: subjectHeader});
      if (!lead) continue;

      const body = extractPlainText(msg.payload || {}) || msg.snippet || "";
      if (!body || body.trim().length < 10) continue;

      await processReplyForLead({lead, body, gmailMsgId: msgId});
    } catch (e) {
      functions.logger.error("Failed processing Gmail message", {
        msgId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  await setLastHistoryId(payload.historyId);
}

async function processReplyForLead(input: {
  lead: LeadDoc;
  body: string;
  gmailMsgId: string;
}): Promise<void> {
  // Mark lead as replied
  await admin.firestore().collection("leads").doc(input.lead.id).set(
    {
      outreach: {email: {status: "replied", lastReplyGmailMsgId: input.gmailMsgId}},
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true}
  );

  // Find existing thread for this lead, if any
  const threadSnap = await admin
    .firestore()
    .collection("nikolaThreads")
    .where("leadId", "==", input.lead.id)
    .limit(1)
    .get();
  const existingThreadTs = threadSnap.empty
    ? undefined
    : (threadSnap.docs[0].data() as NikolaThread).slackThreadTs;

  // Run sales skill on the reply
  let result: SkillResult;
  try {
    result = await runSkill("sales", {
      lead: input.lead,
      reply: input.body,
      mode: "reply",
    });
  } catch (e) {
    await postNotice(
      `📨 Email reply from ${input.lead.company || input.lead.name} — sales skill failed: ${e instanceof Error ? e.message : String(e)}`,
      existingThreadTs
    );
    return;
  }

  const variants = normaliseVariants(result.variants);
  const reason = (result.metadata?.reason as string) || "";
  if (variants.length === 0) {
    await postNotice(
      `📨 Email reply from ${input.lead.company || input.lead.name}.\nClassification: ${
        (result.metadata?.classification as string) || "unknown"
      }. ${reason}`,
      existingThreadTs
    );
    return;
  }

  const humanized = await humanizeVariants(variants, "email");
  await postDraft({
    lead: input.lead,
    variants: humanized,
    skillUsed: "sales",
    skillResult: result,
    channel: "email",
    index: 1,
    total: 1,
    threadTs: existingThreadTs,
  });
}

function parseFromAddress(fromHeader: string): string | undefined {
  // "John Doe <john@example.com>" → john@example.com
  const m = fromHeader.match(/<([^>]+)>/);
  if (m) return m[1].toLowerCase().trim();
  if (fromHeader.includes("@")) return fromHeader.toLowerCase().trim();
  return undefined;
}

interface GmailPart {
  mimeType?: string | null;
  body?: {data?: string | null};
  parts?: GmailPart[];
}

function extractPlainText(payload: GmailPart): string | undefined {
  if (payload.mimeType === "text/plain" && payload.body?.data) {
    return Buffer.from(payload.body.data, "base64").toString("utf-8");
  }
  for (const p of payload.parts || []) {
    const t = extractPlainText(p);
    if (t) return t;
  }
  return undefined;
}
