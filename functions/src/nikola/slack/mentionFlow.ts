import * as functions from "firebase-functions";
import {enqueueWork} from "../jobs/workQueueEnqueue";

interface AppMentionEvent {
  type: "app_mention";
  user: string;
  text: string;
  channel: string;
  ts: string;
  thread_ts?: string;
}

/**
 * Handler for app_mention events. The single-user + channel gates already
 * fired in eventsHandler before we get here. This just enqueues to the work
 * queue so the processor can take it from there in its own context.
 */
export async function handleAppMention(event: AppMentionEvent): Promise<void> {
  if (!event.text || event.text.trim().length === 0) return;
  // Use the mention's ts as thread_ts so the processor's results post in-thread.
  // If the mention itself was inside a thread, prefer the thread_ts so reply lands there.
  const replyTs = event.thread_ts || event.ts;
  try {
    await enqueueWork({
      kind: "mention",
      args: event.text,
      source: "mention",
      mentionTs: replyTs,
    });
  } catch (e) {
    functions.logger.error("Failed to enqueue mention work", {
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
