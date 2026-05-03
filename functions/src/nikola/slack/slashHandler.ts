import {bdrChannelId, mostafaSlackUserId} from "../config";
import {enqueueWork} from "../jobs/workQueueEnqueue";
import {handlePatch} from "../slashCommands/patch";
import {handlePatchesList} from "../slashCommands/patchesList";
import {handlePatchesRemove} from "../slashCommands/patchesRemove";
import {buildStatusPayload} from "../slashCommands/status";
import {handleResume} from "../slashCommands/resume";
import {NikolaWorkKind} from "../types";

/**
 * Slash payload (urlencoded):
 *   token, team_id, team_domain, channel_id, channel_name, user_id, user_name,
 *   command (e.g. "/nikola"), text (everything after the command), response_url, trigger_id
 *
 * Slack 3s timeout — we always answer within milliseconds.
 *   • Synchronous cases: status, resume, patch, patches list/remove, help.
 *     These are single Firestore reads/writes, fit in <1s after warm.
 *   • Long-running cases (try / enrich / find-leads / find-companies):
 *     Enqueue a Firestore work doc, return ack. nikolaWorkQueueProcessor
 *     (Firestore onCreate trigger) does the actual work in its own context
 *     where async work survives.
 */

export interface SlashPayload {
  user_id: string;
  user_name?: string;
  channel_id: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id?: string;
}

export interface SlashResponse {
  response_type?: "ephemeral" | "in_channel";
  text: string;
  blocks?: unknown[];
}

const QUEUEABLE: Record<string, NikolaWorkKind> = {
  "try": "try",
  "enrich": "enrich",
  "find-leads": "find-leads",
  "find-companies": "find-companies",
};

export async function dispatchSlash(payload: SlashPayload): Promise<SlashResponse> {
  // Single-user gate
  if (payload.user_id !== mostafaSlackUserId()) {
    return {response_type: "ephemeral", text: "Nikola is single-user. Not authorized."};
  }
  // Channel gate
  if (payload.channel_id !== bdrChannelId()) {
    return {
      response_type: "ephemeral",
      text: "Nikola only operates in #bdr. Run this from there.",
    };
  }

  const text = (payload.text || "").trim();
  const [subcommand, ...rest] = text.split(/\s+/);
  const args = rest.join(" ");

  switch (subcommand) {
    case "":
    case "help":
      return helpResponse();

    // Synchronous cases — single Firestore op, fit in 3s
    case "resume":
      return await handleResume();
    case "patch":
      return await handlePatch(args);
    case "patches":
      return await handlePatchesSubcommand(args);
    case "status": {
      try {
        const r = await buildStatusPayload();
        return {response_type: "ephemeral", text: r.text, blocks: r.blocks};
      } catch (e) {
        return {
          response_type: "ephemeral",
          text: `❌ status failed: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
    }

    // Queueable long-running cases — enqueue + ack
    default: {
      const kind = QUEUEABLE[subcommand];
      if (!kind) {
        return {
          response_type: "ephemeral",
          text: `Unknown subcommand: \`${subcommand}\`. Try \`/nikola help\`.`,
        };
      }
      try {
        await enqueueWork({kind, args, source: "slash", payload});
      } catch (e) {
        return {
          response_type: "ephemeral",
          text: `❌ Couldn't enqueue \`${subcommand}\`: ${e instanceof Error ? e.message : String(e)}`,
        };
      }
      return {response_type: "ephemeral", text: ackTextFor(subcommand)};
    }
  }
}

async function handlePatchesSubcommand(args: string): Promise<SlashResponse> {
  const [sub, ...rest] = args.trim().split(/\s+/);
  const restArg = rest.join(" ");
  if (sub === "list") return handlePatchesList();
  if (sub === "remove") return handlePatchesRemove(restArg);
  return {
    response_type: "ephemeral",
    text: "Usage: `/nikola patches list` or `/nikola patches remove <id>`",
  };
}

function ackTextFor(subcommand: string): string {
  switch (subcommand) {
    case "try":
      return "🤖 Drafting now — I'll post in #bdr when ready.";
    case "enrich":
      return "🔍 Enriching lead via Apollo…";
    case "find-leads":
      return "🌱 Discovering new leads — I'll post a summary shortly.";
    case "find-companies":
      return "🌱 Hunting CWPs + gigs in parallel — back in a minute.";
    default:
      return `Queued \`${subcommand}\`…`;
  }
}

function helpResponse(): SlashResponse {
  return {
    response_type: "ephemeral",
    text:
      "*Nikola commands*\n" +
      "`/nikola try <leadId | name | URL | LinkedIn | freeform>` — draft on demand\n" +
      "`/nikola enrich <leadId>` — Apollo enrich a lead (paid)\n" +
      "`/nikola find-leads [focus]` — discover new prospects\n" +
      "`/nikola find-companies [focus]` — hunt CWPs + gigs\n" +
      "`/nikola patch <skill>: <rule>` — add a hot rule\n" +
      "`/nikola patches list` — show active patches\n" +
      "`/nikola patches remove <id>` — soft-delete a patch\n" +
      "`/nikola status` — pipeline + cost + paused state\n" +
      "`/nikola resume` — clear paused state\n\n" +
      "Or `@nikola <freeform>` for natural-language requests in #bdr.",
  };
}
