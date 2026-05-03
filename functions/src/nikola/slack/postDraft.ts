import * as admin from "firebase-admin";
import {WebClient} from "@slack/web-api";
import {bdrChannelId, slackBotToken, NIKOLA_BOT_NAME, NIKOLA_BOT_EMOJI} from "../config";
import {DraftStatus, HumanizedVariant, LeadDoc, NikolaDraft, SkillName, SkillResult} from "../types";
import {renderDraftMessage} from "./messageBlocks";

let _slack: WebClient | null = null;
function slack(): WebClient {
  if (!_slack) _slack = new WebClient(slackBotToken());
  return _slack;
}

/**
 * Posts a NikolaDraft to #bdr (or wherever the channel id resolves), seeds
 * pick-reactions if there are >1 variants, persists nikolaDrafts +
 * nikolaThreads docs.
 */
export async function postDraft(input: {
  lead: LeadDoc;
  variants: HumanizedVariant[];
  skillUsed: SkillName;
  skillResult: SkillResult;
  channel: "linkedin" | "email";
  index: number;
  total: number;
  threadTs?: string; // optional — if posted into an existing thread
}): Promise<{draftId: string; messageTs: string}> {
  const channelId = bdrChannelId();
  const profileUrl =
    input.lead.outreach?.linkedIn?.profileUrl ||
    (input.skillResult.rightContact?.linkedinUrl as string | undefined);
  const emailAddress =
    input.lead.outreach?.email?.recipientEmail ||
    (input.skillResult.rightContact?.email as string | undefined) ||
    input.lead.email;

  const {text, blocks} = renderDraftMessage({
    index: input.index,
    total: input.total,
    companyName: input.lead.company,
    leadName: input.lead.name,
    leadStatus: input.lead.status,
    icpScore: input.skillResult.icpScore,
    rightContact: input.skillResult.rightContact,
    profileUrl,
    emailAddress: input.channel === "email" ? emailAddress : undefined,
    variants: input.variants,
    cwpFlag: input.skillResult.cwpFlag,
    contentIdea: input.skillResult.contentIdea,
    channel: input.channel,
  });

  const post = await slack().chat.postMessage({
    channel: channelId,
    text,
    blocks: blocks as never,
    username: NIKOLA_BOT_NAME,
    icon_emoji: NIKOLA_BOT_EMOJI,
    thread_ts: input.threadTs,
  });
  if (!post.ok || !post.ts) {
    throw new Error(`Slack chat.postMessage failed: ${post.error}`);
  }
  const messageTs = post.ts;

  // Seed pick reactions when there are multiple variants
  if (input.variants.length > 1) {
    const emojis = ["one", "two", "three"];
    for (let i = 0; i < input.variants.length; i++) {
      try {
        await slack().reactions.add({
          channel: channelId,
          name: emojis[i],
          timestamp: messageTs,
        });
      } catch (e) {
        // Reaction add can fail with "already_reacted" on retry — non-fatal
      }
    }
  }

  // Persist nikolaDrafts
  const draftRef = admin.firestore().collection("nikolaDrafts").doc();
  const now = admin.firestore.Timestamp.now();
  const draftDoc: NikolaDraft = {
    id: draftRef.id,
    leadId: input.lead.id,
    companyId: input.lead.companyId,
    skillUsed: input.skillUsed,
    channel: input.channel,
    variants: input.variants,
    metadata: {
      profileUrl,
      emailAddress,
      icpScore: input.skillResult.icpScore,
      rightContact: input.skillResult.rightContact,
      cwpFlag: input.skillResult.cwpFlag,
      contentIdea: input.skillResult.contentIdea,
    },
    slackMessageTs: messageTs,
    slackChannelId: channelId,
    status: "pending" as DraftStatus,
    statusHistory: [{status: "pending" as DraftStatus, at: now, by: "nikola"}],
    costUsd: input.skillResult.costUsd,
    toolCallsUsed: input.skillResult.toolCallsUsed,
    createdAt: now,
    updatedAt: now,
  };
  await draftRef.set(draftDoc);

  // Persist (or update) nikolaThreads — keyed by root message ts
  const threadKey = input.threadTs || messageTs;
  const threadRef = admin.firestore().collection("nikolaThreads").doc(threadKey);
  await admin.firestore().runTransaction(async (tx) => {
    const existing = await tx.get(threadRef);
    if (existing.exists) {
      const data = existing.data() as {draftIds?: string[]};
      tx.set(
        threadRef,
        {
          draftIds: [...(data.draftIds || []), draftRef.id],
          channelId,
          leadId: input.lead.id,
        },
        {merge: true}
      );
    } else {
      tx.set(threadRef, {
        slackThreadTs: threadKey,
        leadId: input.lead.id,
        channelId,
        draftIds: [draftRef.id],
        createdAt: now,
      });
    }
  });

  return {draftId: draftRef.id, messageTs};
}

/** Convenience: post a plain notice (warnings, paused, no leads, etc). */
export async function postNotice(text: string, threadTs?: string): Promise<void> {
  await slack().chat.postMessage({
    channel: bdrChannelId(),
    text,
    username: NIKOLA_BOT_NAME,
    icon_emoji: NIKOLA_BOT_EMOJI,
    thread_ts: threadTs,
  });
}

/** Convenience: post blocks. Used for /nikola status. */
export async function postBlocks(text: string, blocks: unknown[], threadTs?: string): Promise<void> {
  await slack().chat.postMessage({
    channel: bdrChannelId(),
    text,
    blocks: blocks as never,
    username: NIKOLA_BOT_NAME,
    icon_emoji: NIKOLA_BOT_EMOJI,
    thread_ts: threadTs,
  });
}

/** Edit an existing message — used for the "Selected: Variant N" footer. */
export async function updateMessage(
  channel: string,
  ts: string,
  text: string,
  blocks?: unknown[]
): Promise<void> {
  await slack().chat.update({
    channel,
    ts,
    text,
    blocks: blocks as never,
  });
}
