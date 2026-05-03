import * as functions from "firebase-functions";
import {bdrChannelId, mostafaSlackUserId} from "../config";
import {handleReaction} from "./reactionFlow";
import {handleThreadMessage} from "./threadReplyFlow";

/**
 * Routes Slack Events API payloads. Performs gates:
 *   - Channel must be #bdr
 *   - User must be Mostafa (single-user model)
 * On failed gate, returns silently with 200 OK.
 */
export async function dispatchSlackEvent(payload: {
  type: string;
  challenge?: string;
  event?: Record<string, unknown>;
}): Promise<{challenge?: string; ok: true}> {
  // URL verification handshake (Slack one-time during app setup)
  if (payload.type === "url_verification" && payload.challenge) {
    return {challenge: payload.challenge, ok: true};
  }

  if (payload.type !== "event_callback" || !payload.event) {
    return {ok: true};
  }

  const event = payload.event as Record<string, unknown>;
  const eventType = String(event.type || "");
  const userId = (event.user as string) || (event.message as {user?: string} | undefined)?.user;
  const channelId =
    (event.channel as string) ||
    (event.item as {channel?: string} | undefined)?.channel;

  // Single-user gate
  if (userId && userId !== mostafaSlackUserId()) {
    functions.logger.debug("Dropping event from non-Mostafa user", {userId, eventType});
    return {ok: true};
  }
  // Channel gate
  if (channelId && channelId !== bdrChannelId()) {
    functions.logger.debug("Dropping event from non-bdr channel", {channelId, eventType});
    return {ok: true};
  }

  try {
    switch (eventType) {
      case "reaction_added":
        await handleReaction(event as never);
        break;
      case "message":
        // Ignore bot replies + system events
        if (event.bot_id) return {ok: true};
        if (event.subtype && event.subtype !== "thread_broadcast") return {ok: true};
        await handleThreadMessage(event as never);
        break;
      default:
        functions.logger.debug("Unhandled event type", {eventType});
    }
  } catch (e) {
    functions.logger.error("Slack event handler failed", {
      eventType,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  return {ok: true};
}
