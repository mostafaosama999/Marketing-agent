import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import OpenAI from "openai";
import {MODELS, openaiApiKey} from "../config";
import {MENTION_INTENT_PROMPT} from "../prompts/mentionIntentPrompt";
import {handleEnrich} from "../slashCommands/enrich";
import {handleFindCompanies} from "../slashCommands/findCompanies";
import {handleFindLeads} from "../slashCommands/findLeads";
import {buildStatusPayload} from "../slashCommands/status";
import {handleTry} from "../slashCommands/try";
import {postBlocks, postNotice} from "../slack/postDraft";
import {SlashPayload} from "../slack/slashHandler";
import {NikolaWork, NikolaWorkKind} from "../types";

/**
 * Firestore-onCreate processor. Runs the work that the slash/mention HTTP
 * entries enqueued. Lives in its own execution context so async work is
 * actually allowed to complete (Firebase 1st-gen HTTP kills async after
 * response).
 *
 * Idempotency: opens with a transaction that flips status pending → processing.
 * If the trigger fires twice, the second run sees non-pending status and bails.
 */

const STRING_MATCH_SUBCOMMANDS: Record<string, NikolaWorkKind | "status" | "noop"> = {
  "status": "status",
  "try": "try",
  "enrich": "enrich",
  "find-leads": "find-leads",
  "find-companies": "find-companies",
  "help": "noop",
  "patches": "noop",   // patches list/remove are slash-only (need ephemeral response)
  "patch": "noop",     // ditto
  "resume": "noop",    // ditto
};

let _openai: OpenAI | null = null;
function ai(): OpenAI {
  if (!_openai) _openai = new OpenAI({apiKey: openaiApiKey()});
  return _openai;
}

export async function processWorkDoc(workId: string): Promise<void> {
  const ref = admin.firestore().collection("nikolaWorkQueue").doc(workId);

  // Idempotency: claim the doc
  const claimed = await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return null;
    const data = snap.data() as NikolaWork;
    if (data.status !== "pending") return null;
    tx.set(
      ref,
      {
        status: "processing",
        startedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
    return data;
  });
  if (!claimed) return;

  let error: string | undefined;
  try {
    await routeAndRun(claimed);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    functions.logger.error("workQueueProcessor failed", {workId, kind: claimed.kind, error});
    // Surface failure to the user
    try {
      await postNotice(
        `❌ \`${claimed.kind}\` failed: ${error}`,
        claimed.mentionTs
      );
    } catch (postErr) {
      functions.logger.error("Failed to post failure notice", {workId, postErr});
    }
  } finally {
    await ref.set(
      {
        status: error ? "failed" : "completed",
        ...(error ? {error} : {}),
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
  }
}

async function routeAndRun(work: NikolaWork): Promise<void> {
  const threadTs = work.mentionTs;

  switch (work.kind) {
    case "try":
      await handleTry(work.args, work.payload as SlashPayload, threadTs);
      return;
    case "enrich":
      await handleEnrich(work.args, threadTs);
      return;
    case "find-leads":
      await handleFindLeads(work.args, threadTs);
      return;
    case "find-companies":
      await handleFindCompanies(work.args, threadTs);
      return;
    case "status": {
      const r = await buildStatusPayload();
      await postBlocks(r.text, r.blocks, threadTs);
      return;
    }
    case "mention":
      await routeMention(work);
      return;
    default:
      throw new Error(`Unknown work kind: ${(work as NikolaWork).kind}`);
  }
}

/**
 * Mention routing — strip the bot prefix, then either:
 *   1. String-match against known subcommands (zero LLM cost)
 *   2. Fall back to LLM intent classifier (~$0.00005)
 */
async function routeMention(work: NikolaWork): Promise<void> {
  const cleaned = stripBotPrefix(work.args).trim();
  if (!cleaned) {
    await postNotice(helpText(), work.mentionTs);
    return;
  }

  // String-match shortcut
  const firstWord = cleaned.split(/\s+/)[0].toLowerCase();
  const restAfterFirst = cleaned.slice(firstWord.length).trim();

  // Handle "find leads" / "find companies" two-word commands first
  let matched: NikolaWorkKind | "status" | "noop" | undefined =
    STRING_MATCH_SUBCOMMANDS[firstWord];
  let matchedArgs = restAfterFirst;

  // Special case: "find leads X" / "find companies X" with space
  if (firstWord === "find") {
    const second = restAfterFirst.split(/\s+/)[0]?.toLowerCase();
    if (second === "leads") {
      matched = "find-leads";
      matchedArgs = restAfterFirst.slice("leads".length).trim();
    } else if (second === "companies") {
      matched = "find-companies";
      matchedArgs = restAfterFirst.slice("companies".length).trim();
    }
  }

  if (matched === "noop") {
    await postNotice(
      `Use slash command for that: \`/nikola ${firstWord} ${matchedArgs}\``,
      work.mentionTs
    );
    return;
  }

  if (matched && matched !== "noop") {
    await runMatchedKind(matched, matchedArgs, work.mentionTs);
    return;
  }

  // LLM fallback for freeform text
  await runLlmIntent(cleaned, work.mentionTs);
}

async function runMatchedKind(
  kind: NikolaWorkKind | "status",
  args: string,
  threadTs?: string
): Promise<void> {
  switch (kind) {
    case "status": {
      const r = await buildStatusPayload();
      await postBlocks(r.text, r.blocks, threadTs);
      return;
    }
    case "try":
      await handleTry(args, undefined, threadTs);
      return;
    case "enrich":
      await handleEnrich(args, threadTs);
      return;
    case "find-leads":
      await handleFindLeads(args, threadTs);
      return;
    case "find-companies":
      await handleFindCompanies(args, threadTs);
      return;
    default:
      await postNotice(`Don't know how to handle \`${kind}\` yet.`, threadTs);
  }
}

async function runLlmIntent(text: string, threadTs?: string): Promise<void> {
  let parsed: {kind: NikolaWorkKind | "status" | "unknown"; args: string} | null = null;
  try {
    const completion = await ai().chat.completions.create({
      model: MODELS.fast,
      messages: [
        {role: "system", content: MENTION_INTENT_PROMPT},
        {role: "user", content: text},
      ],
      response_format: {type: "json_object"},
      max_completion_tokens: 200,
    });
    const raw = completion.choices[0].message.content || "{}";
    parsed = JSON.parse(raw);
  } catch (e) {
    functions.logger.error("Mention intent LLM failed", {error: (e as Error).message});
  }

  if (!parsed || parsed.kind === "unknown") {
    await postNotice(
      `Couldn't classify your message into an action. Try \`@nikola status\`, \`@nikola try <name>\`, or \`@nikola find-leads\`. ${helpText()}`,
      threadTs
    );
    return;
  }

  await runMatchedKind(parsed.kind, parsed.args || "", threadTs);
}

function stripBotPrefix(text: string): string {
  return text.replace(/^<@[A-Z0-9]+>\s*/, "");
}

function helpText(): string {
  return (
    "Commands you can run via @mention:\n" +
    "• `@nikola status`\n" +
    "• `@nikola try <leadId | name | URL | LinkedIn | freeform>`\n" +
    "• `@nikola find-leads [focus]`\n" +
    "• `@nikola find-companies [focus]`\n" +
    "• `@nikola enrich <leadId>`"
  );
}

/** Cloud Function entry — wired in `nikola/index.ts`. */
export const nikolaWorkQueueProcessor = functions
  .runWith({timeoutSeconds: 540, memory: "1GB"})
  .firestore.document("nikolaWorkQueue/{workId}")
  .onCreate(async (_snap, context) => {
    await processWorkDoc(context.params.workId);
    return null;
  });
