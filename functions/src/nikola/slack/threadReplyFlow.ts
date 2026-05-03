import * as admin from "firebase-admin";
import {bdrChannelId} from "../config";
import {humanizeVariants} from "../humanizeWrap";
import {runSkill} from "../skillRunner";
import {LeadDoc, NikolaDraft, NikolaThread, SkillContext} from "../types";
import {normaliseVariants} from "../variantParser";
import {postDraft, postNotice} from "./postDraft";

interface MessageEvent {
  user: string;
  channel: string;
  text: string;
  ts: string;
  thread_ts?: string;
  bot_id?: string;
  subtype?: string;
}

/**
 * Handler for message.channels events in #bdr — only fires for messages
 * inside a Nikola thread.
 *
 * Two modes:
 *   1. Draft is in 'revising' state → treat reply as revision direction → re-run skill
 *   2. Draft is in 'sent' or 'pending' → treat reply as a pasted prospect reply → run sales
 */
export async function handleThreadMessage(event: MessageEvent): Promise<void> {
  if (event.channel !== bdrChannelId()) return;
  if (!event.thread_ts) return;
  if (event.bot_id) return;          // ignore bot messages
  if (event.subtype === "bot_message") return;
  if (!event.text || event.text.trim().length === 0) return;

  // Look up thread → find latest open draft on this lead
  const threadDoc = await admin
    .firestore()
    .collection("nikolaThreads")
    .doc(event.thread_ts)
    .get();
  if (!threadDoc.exists) return;
  const thread = threadDoc.data() as NikolaThread;

  // Find the latest draft (so revision/reply applies to most recent)
  const latestSnap = await admin
    .firestore()
    .collection("nikolaDrafts")
    .where("leadId", "==", thread.leadId)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();
  if (latestSnap.empty) return;
  const latest = latestSnap.docs[0];
  const draft = latest.data() as NikolaDraft;

  // Load lead
  const leadSnap = await admin.firestore().collection("leads").doc(thread.leadId).get();
  if (!leadSnap.exists) return;
  const lead: LeadDoc = {id: leadSnap.id, ...(leadSnap.data() as Omit<LeadDoc, "id">)};

  // Mode 1 — revision flow
  if (draft.status === "revising") {
    await handleRevision({
      lead,
      thread,
      draft,
      revision: event.text,
    });
    return;
  }

  // Mode 2 — pasted prospect reply → sales
  if (event.text.trim().length < 20) return; // too short to be a meaningful reply
  await handlePastedReply({lead, thread, replyText: event.text});
}

async function handleRevision(input: {
  lead: LeadDoc;
  thread: NikolaThread;
  draft: NikolaDraft;
  revision: string;
}): Promise<void> {
  const ctx: SkillContext = {
    lead: input.lead,
    prospectInput: `REVISION REQUESTED — Mostafa wants you to redraft the previous outreach with this direction:\n\n${input.revision}\n\nPrevious variants:\n${input.draft.variants.map((v, i) => `Variant ${String.fromCharCode(65 + i)} (${v.name}):\n${v.bodyHumanized}`).join("\n\n")}`,
  };
  const result = await runSkill(input.draft.skillUsed, ctx);
  const variants = normaliseVariants(result.variants);
  if (variants.length === 0) {
    await postNotice("Couldn't generate revised variants. Try again or ❌ to skip.", input.thread.slackThreadTs);
    return;
  }
  const humanized = await humanizeVariants(variants, input.draft.channel === "email" ? "email" : "linkedin");

  await postDraft({
    lead: input.lead,
    variants: humanized,
    skillUsed: input.draft.skillUsed,
    skillResult: result,
    channel: input.draft.channel,
    index: 1,
    total: 1,
    threadTs: input.thread.slackThreadTs,
  });
}

async function handlePastedReply(input: {
  lead: LeadDoc;
  thread: NikolaThread;
  replyText: string;
}): Promise<void> {
  // Mark lead as replied (so dueLeadsQuery picks it up correctly going forward)
  await admin.firestore().collection("leads").doc(input.lead.id).set(
    {
      outreach: {linkedIn: {status: "replied"}},
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true}
  );

  const result = await runSkill("sales", {
    lead: input.lead,
    reply: input.replyText,
    mode: "reply",
    callerSlackTs: input.thread.slackThreadTs,
  });
  const variants = normaliseVariants(result.variants);
  if (variants.length === 0) {
    const meta = (result.metadata?.reason as string) || "No suggested action";
    await postNotice(`Sales analysis: ${meta}`, input.thread.slackThreadTs);
    return;
  }
  const humanized = await humanizeVariants(variants, "linkedin");

  await postDraft({
    lead: input.lead,
    variants: humanized,
    skillUsed: "sales",
    skillResult: result,
    channel: "linkedin",
    index: 1,
    total: 1,
    threadTs: input.thread.slackThreadTs,
  });
}
