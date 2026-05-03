import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import OpenAI from "openai";
import {bdrChannelId, MODELS, openaiApiKey, slackBotToken} from "../config";
import {WebClient} from "@slack/web-api";
import {MENTION_INTENT_PROMPT} from "../prompts/mentionIntentPrompt";
import {handleEnrich} from "../slashCommands/enrich";
import {handleFindCompanies} from "../slashCommands/findCompanies";
import {handleFindLeads} from "../slashCommands/findLeads";
import {buildStatusPayload} from "../slashCommands/status";
import {handleTry} from "../slashCommands/try";
import {runSkill} from "../skillRunner";
import {enqueueWork} from "./workQueueEnqueue";
import {executeMultiStep} from "./multiStepExecutor";
import {postBlocks, postNotice} from "../slack/postDraft";
import {SlashPayload} from "../slack/slashHandler";
import {
  NikolaPendingClarification,
  NikolaRoutingDecision,
  NikolaWork,
  NikolaWorkKind,
} from "../types";

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

const CLARIFICATION_CONFIDENCE_THRESHOLD = 0.7;

/** Human-readable descriptions of each kind, used in the clarification notice. */
const KIND_DESCRIPTION: Record<NikolaWorkKind | "status", string> = {
  "try": "research + draft outreach for a specific prospect",
  "enrich": "Apollo-enrich a specific lead",
  "find-leads": "discover new prospect companies (ICP-fit, like ones we'd sell to)",
  "find-companies": "hunt writing programs (CWPs) and freelance gigs",
  "mention": "freeform mention",
  "status": "show pipeline / cost / paused-state summary card",
  "analytical-query": "answer an analytical question against your CRM data",
  "multi-step": "run a multi-step plan",
  "remember": "save a preference or rule to long-term memory",
};

let _openai: OpenAI | null = null;
function ai(): OpenAI {
  if (!_openai) _openai = new OpenAI({apiKey: openaiApiKey()});
  return _openai;
}

let _slack: WebClient | null = null;
function slack(): WebClient {
  if (!_slack) _slack = new WebClient(slackBotToken());
  return _slack;
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
    // If the executor paused at a multi-step confirmation gate, it set
    // status to "awaiting-confirmation" — DO NOT overwrite. The reaction
    // handler will resume by spawning a child doc.
    const cur = await ref.get();
    const curStatus = (cur.data() as NikolaWork | undefined)?.status;
    if (curStatus !== "awaiting-confirmation") {
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
    case "analytical-query":
      await handleAnalyticalQuery(work.args, threadTs);
      return;
    case "multi-step":
      await executeMultiStep(work);
      return;
    case "remember":
      await handleRemember(work.args, threadTs);
      return;
    case "mention":
      await routeMention(work);
      return;
    default:
      throw new Error(`Unknown work kind: ${(work as NikolaWork).kind}`);
  }
}

/**
 * Mention routing. Pipeline:
 *   1. Strip bot prefix.
 *   2. If the message starts with a literal subcommand (single word that
 *      maps to a known kind), dispatch directly. The bare-word match still
 *      lets `status`, `try`, `enrich`, `find-leads`, `find-companies` work.
 *   3. Otherwise, hand off to the LLM classifier with strict JSON output +
 *      confidence. Low-confidence routes go through a clarification posted
 *      as a numbered notice (1️⃣/2️⃣/❌ reactions).
 *
 * Removed (intentional): the previous two-word "find leads" / "find companies"
 * shortcut. It pre-empted the classifier and caused the Ultralytics misroute
 * (utterances like "find companies similar to <ICP archetype>" got dispatched
 * to the CWP hunter instead of lead-gen). The classifier owns disambiguation
 * now, with adversarial few-shots in the prompt.
 */
async function routeMention(work: NikolaWork): Promise<void> {
  const cleaned = stripBotPrefix(work.args).trim();
  if (!cleaned) {
    await postNotice(helpText(), work.mentionTs);
    return;
  }

  const firstWord = cleaned.split(/\s+/)[0].toLowerCase();
  const restAfterFirst = cleaned.slice(firstWord.length).trim();
  const matched = STRING_MATCH_SUBCOMMANDS[firstWord];

  if (matched === "noop") {
    await postNotice(
      `Use slash command for that: \`/nikola ${firstWord} ${restAfterFirst}\``,
      work.mentionTs
    );
    return;
  }

  if (matched) {
    await writeRoutingDecision({
      userText: cleaned,
      routeMethod: "string-match",
      matchedKind: matched,
      args: restAfterFirst,
      costUsd: 0,
      slackTs: work.mentionTs,
    });
    await runMatchedKind(matched, restAfterFirst, work.mentionTs);
    return;
  }

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
    case "analytical-query":
      await handleAnalyticalQuery(args, threadTs);
      return;
    case "multi-step":
      // Multi-step needs a persistent work doc to track plan + cursor across
      // confirmation pauses. Enqueue a fresh kind="multi-step" doc rather than
      // running inline; the processor will route it to executeMultiStep.
      await enqueueWork({
        kind: "multi-step",
        args,
        source: "mention",
        mentionTs: threadTs,
      });
      return;
    case "remember":
      await handleRemember(args, threadTs);
      return;
    default:
      await postNotice(`Don't know how to handle \`${kind}\` yet.`, threadTs);
  }
}

interface IntentClassifierOutput {
  kind: NikolaWorkKind | "status" | "unknown";
  args: string;
  confidence: number;
  alternativeKind?: NikolaWorkKind | "status" | "unknown";
  alternativeArgs?: string;
  reason?: string;
}

const INTENT_JSON_SCHEMA = {
  name: "nikola_intent",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "kind",
      "args",
      "confidence",
      "alternativeKind",
      "alternativeArgs",
      "reason",
    ],
    properties: {
      kind: {
        type: "string",
        enum: [
          "status",
          "try",
          "enrich",
          "find-leads",
          "find-companies",
          "analytical-query",
          "multi-step",
          "remember",
          "unknown",
        ],
      },
      args: {type: "string"},
      confidence: {type: "number"},
      alternativeKind: {
        type: "string",
        enum: [
          "status",
          "try",
          "enrich",
          "find-leads",
          "find-companies",
          "analytical-query",
          "multi-step",
          "remember",
          "unknown",
        ],
      },
      alternativeArgs: {type: "string"},
      reason: {type: "string"},
    },
  },
} as const;

async function runLlmIntent(text: string, threadTs?: string): Promise<void> {
  let parsed: IntentClassifierOutput | null = null;
  let raw = "";
  let costUsd = 0;
  try {
    const completion = await ai().chat.completions.create({
      model: MODELS.fast,
      messages: [
        {role: "system", content: MENTION_INTENT_PROMPT},
        {role: "user", content: text},
      ],
      // Strict JSON schema — eliminates hallucinated kinds and missing fields.
      response_format: {type: "json_schema", json_schema: INTENT_JSON_SCHEMA},
      max_completion_tokens: 400,
    });
    raw = completion.choices[0].message.content || "{}";
    parsed = JSON.parse(raw) as IntentClassifierOutput;
    // Approximate cost: gpt-4.1-mini priced at ~$0.15/$0.60 per 1M tokens.
    const usage = completion.usage;
    if (usage) {
      costUsd =
        (usage.prompt_tokens * 0.15 + (usage.completion_tokens ?? 0) * 0.6) /
        1_000_000;
    }
  } catch (e) {
    functions.logger.error("Mention intent LLM failed", {error: (e as Error).message});
  }

  if (!parsed) {
    await writeRoutingDecision({
      userText: text,
      routeMethod: "llm",
      matchedKind: "unknown",
      args: "",
      confidence: 0,
      llmRaw: raw,
      costUsd,
      slackTs: threadTs,
    });
    await chatFallback(text, threadTs);
    return;
  }

  // Coerce confidence up-front — defensive against the LLM emitting "0.7"
  // as a string even with strict JSON schema. Number(...) yields NaN on
  // bogus input which compares falsy with `<`, so we fall through to
  // confident-dispatch (worst case: take the top choice instead of asking).
  const confidence = Number(parsed.confidence);

  // Genuine unknown — go straight to chat fallback, but log the decision.
  if (parsed.kind === "unknown") {
    await writeRoutingDecision({
      userText: text,
      routeMethod: "llm",
      matchedKind: "unknown",
      args: parsed.args || "",
      confidence,
      llmRaw: raw,
      costUsd,
      slackTs: threadTs,
    });
    await chatFallback(text, threadTs);
    return;
  }

  // Low confidence + a viable alternative → ask the user.
  if (
    confidence < CLARIFICATION_CONFIDENCE_THRESHOLD &&
    parsed.alternativeKind &&
    parsed.alternativeKind !== "unknown" &&
    parsed.alternativeKind !== parsed.kind
  ) {
    const decisionId = await writeRoutingDecision({
      userText: text,
      routeMethod: "llm",
      matchedKind: "unknown",            // not yet resolved
      args: parsed.args || "",
      confidence,
      llmRaw: raw,
      costUsd,
      slackTs: threadTs,
    });
    await postClarification({
      userText: text,
      candidates: [
        {kind: parsed.kind, args: parsed.args || "", reason: parsed.reason || ""},
        {
          kind: parsed.alternativeKind,
          args: parsed.alternativeArgs || "",
          reason: "alternative interpretation",
        },
      ],
      slackThreadTs: threadTs,
      routingDecisionId: decisionId,
    });
    return;
  }

  // Confident dispatch.
  await writeRoutingDecision({
    userText: text,
    routeMethod: "llm",
    matchedKind: parsed.kind,
    args: parsed.args || "",
    confidence,
    llmRaw: raw,
    costUsd,
    slackTs: threadTs,
  });
  await runMatchedKind(parsed.kind, parsed.args || "", threadTs);
}

const CHAT_SYSTEM_PROMPT = `You are Nikola, a Slack BDR assistant for Mostafa Ibrahim, founder of CodeContent.

About Mostafa: ex-GoCardless engineer (3 years), now runs CodeContent — a developer-first technical content agency. UK-based, remote team. ~$3K MRR scaling to $50K.

About CodeContent: writes high-quality technical tutorials and deep blog posts for B2B SaaS devtools (Series A–C, 20–500 employees). ICP: AI/ML platforms, devops/infra, developer APIs. Differentiator: engineer-writers, not marketers. Avg tutorial $1500–2500, blog post $800–1500.

What you can do (suggest the right one if Mostafa asks):
• \`/nikola status\` — pipeline / cost / paused-state summary card
• \`/nikola try <name | URL | LinkedIn>\` — research + draft outreach for a specific prospect
• \`/nikola find-leads [focus]\` — discover new ICP-fit prospect companies
• \`/nikola find-companies [focus]\` — hunt CWPs + freelance gigs (writing programs, not customers)
• \`/nikola enrich <leadId>\` — Apollo-enrich a lead (paid)
• \`/nikola patch <skill>: <rule>\` — add a permanent rule that future skill runs respect
• \`@nikola <analytical question>\` — answer questions about the pipeline
   (e.g. "how many companies have I outreached in the last 7 days?", "reply rate this month",
   "leads stuck in contacted >7d", "who's my busiest day this week")
• \`@nikola <multi-step request>\` — chain actions
   (e.g. "find AI/CV companies and draft outreach for the top 3" — Nikola plans + runs each step,
   pausing for ✅ before paid steps)
• \`@nikola remember that <fact>\` — save a preference/constraint to long-term memory
• \`@nikola <freeform>\` — chat naturally; I'll figure out what you mean (and ask if I'm not sure)

When the analytical or multi-step paths are the right answer, route the user there explicitly — don't try to answer pipeline questions yourself in chat.

Tone: direct, casual, brief. 1–3 sentences usually. Avoid corporate jargon: never say "leverage", "synergy", "circle back", "I hope this finds you well", "deep dive", "best-in-class".

If you don't know something, say so plainly — don't make stuff up.`;

async function chatFallback(text: string, threadTs?: string): Promise<void> {
  try {
    const completion = await ai().chat.completions.create({
      model: MODELS.fast,
      messages: [
        {role: "system", content: CHAT_SYSTEM_PROMPT},
        {role: "user", content: text},
      ],
      max_completion_tokens: 400,
    });
    const reply = completion.choices[0].message.content?.trim() || "";
    if (reply) {
      await postNotice(reply, threadTs);
    } else {
      await postNotice("hm, not sure how to respond to that. try `/nikola help` for the list of things i can do.", threadTs);
    }
  } catch (e) {
    functions.logger.error("chatFallback LLM failed", {error: (e as Error).message});
    await postNotice(
      `Sorry, can't reply right now. ${helpText()}`,
      threadTs
    );
  }
}

/**
 * Write a single audit row for any routing decision (string-match or LLM).
 * Returns the decision doc id so the caller can back-link from a clarification
 * or a downstream work doc.
 */
async function writeRoutingDecision(input: {
  userText: string;
  routeMethod: NikolaRoutingDecision["routeMethod"];
  matchedKind: NikolaRoutingDecision["matchedKind"];
  args: string;
  confidence?: number;
  llmRaw?: string;
  costUsd: number;
  slackTs?: string;
  workId?: string;
}): Promise<string> {
  const ref = admin.firestore().collection("nikolaRoutingDecisions").doc();
  const doc: NikolaRoutingDecision = {
    id: ref.id,
    userText: input.userText,
    routeMethod: input.routeMethod,
    matchedKind: input.matchedKind,
    args: input.args,
    confidence: input.confidence,
    llmRaw: input.llmRaw,
    costUsd: input.costUsd,
    slackTs: input.slackTs,
    workId: input.workId,
    createdAt: admin.firestore.Timestamp.now(),
  };
  await ref.set(doc);
  return ref.id;
}

/**
 * Post a numbered clarification notice in #bdr (in the mention's thread) and
 * seed 1️⃣/2️⃣/❌ reactions. Persists a NikolaPendingClarification keyed by
 * the notice's message ts so reactionFlow.ts can resolve the pick.
 */
async function postClarification(input: {
  userText: string;
  candidates: Array<{kind: NikolaWorkKind | "status"; args: string; reason: string}>;
  slackThreadTs?: string;
  routingDecisionId: string;
}): Promise<void> {
  const channelId = bdrChannelId();
  const lines = [
    `🤔 *Not sure which one you meant — pick with a reaction.*`,
    `> _\"${input.userText.replace(/"/g, "'")}\"_`,
    "",
    ...input.candidates.map((c, i) => {
      const emoji = i === 0 ? "1️⃣" : "2️⃣";
      const desc = KIND_DESCRIPTION[c.kind] || c.kind;
      const argsHint = c.args ? `  _(args: ${c.args})_` : "";
      return `${emoji} *${c.kind}* — ${desc}${argsHint}`;
    }),
    "",
    "❌ to cancel.",
  ];
  const post = await slack().chat.postMessage({
    channel: channelId,
    text: lines.join("\n"),
    thread_ts: input.slackThreadTs,
  });
  if (!post.ok || !post.ts) {
    functions.logger.error("postClarification failed", {error: post.error});
    // Fall back to a confident dispatch on the top candidate so the user
    // isn't left hanging.
    await runMatchedKind(
      input.candidates[0].kind,
      input.candidates[0].args,
      input.slackThreadTs
    );
    return;
  }

  const noticeTs = post.ts;
  for (const emoji of ["one", "two", "x"]) {
    try {
      await slack().reactions.add({channel: channelId, name: emoji, timestamp: noticeTs});
    } catch (e) {
      // already_reacted on retry — non-fatal
    }
  }

  const ref = admin.firestore().collection("nikolaPendingClarifications").doc();
  const doc: NikolaPendingClarification = {
    id: ref.id,
    userText: input.userText,
    candidates: input.candidates,
    slackMessageTs: noticeTs,
    slackThreadTs: input.slackThreadTs,
    status: "pending",
    routingDecisionId: input.routingDecisionId,
    createdAt: admin.firestore.Timestamp.now(),
  };
  await ref.set(doc);
}

/* --- Stubs for new kinds. Wired up properly in W2 / W3 / W4. --- */

async function handleAnalyticalQuery(args: string, threadTs?: string): Promise<void> {
  if (!args || args.trim().length < 3) {
    await postNotice(
      "What do you want me to look up? Try something like _\"reply rate this month\"_ or _\"leads stuck in contacted >7d\"_.",
      threadTs
    );
    return;
  }
  try {
    const result = await runSkill("analyst", {prospectInput: args});
    const meta = result.metadata as {
      answer?: string;
      keyMetrics?: Array<{name: string; value: string | number; hint?: string | null}>;
      sourcesQueried?: string[] | null;
      confidence?: "high" | "medium" | "low";
      caveats?: string | null;
    };

    const answer = meta.answer || "_(analyst returned no answer)_";
    const lines: string[] = [answer];
    if (meta.keyMetrics && meta.keyMetrics.length > 0) {
      lines.push(
        "",
        "*Key metrics*",
        ...meta.keyMetrics.map(
          (m) => `• *${m.name}:* ${m.value}${m.hint ? ` _(${m.hint})_` : ""}`
        )
      );
    }
    const footer: string[] = [];
    if (meta.sourcesQueried && meta.sourcesQueried.length > 0) {
      footer.push(`_sources: ${meta.sourcesQueried.join(", ")}_`);
    }
    if (meta.confidence) {
      footer.push(`_confidence: ${meta.confidence}_`);
    }
    if (meta.caveats) {
      footer.push(`⚠️ _${meta.caveats}_`);
    }
    if (footer.length > 0) {
      lines.push("", footer.join(" · "));
    }
    lines.push(`_cost: $${result.costUsd.toFixed(4)}_`);
    await postNotice(lines.join("\n"), threadTs);
  } catch (e) {
    functions.logger.error("analytical-query failed", {
      args,
      error: e instanceof Error ? e.message : String(e),
    });
    await postNotice(
      `❌ analytical-query failed: ${e instanceof Error ? e.message : String(e)}`,
      threadTs
    );
  }
}


/**
 * Manual memory-add path — wired in W4 properly with the candidate flow.
 * For now, write the fact directly to nikolaMemory/singleton so the schema
 * exists and Mostafa can seed memory ahead of W4.
 */
async function handleRemember(args: string, threadTs?: string): Promise<void> {
  if (!args || args.trim().length < 3) {
    await postNotice("Tell me what to remember, e.g. `@nikola remember that I prefer Series B AI/CV companies`.", threadTs);
    return;
  }
  const memoryRef = admin.firestore().collection("nikolaMemory").doc("singleton");
  const factId = admin.firestore().collection("_").doc().id;
  await memoryRef.set(
    {
      facts: admin.firestore.FieldValue.arrayUnion({
        id: factId,
        text: args.trim(),
        keywords: args
          .toLowerCase()
          .replace(/[^a-z0-9 ]+/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 3)
          .slice(0, 10),
        addedAt: admin.firestore.Timestamp.now(),
        sourceWorkId: "manual-remember",
        confirmedBy: "mostafa",
        accessCount: 0,
      }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true}
  );
  await postNotice(`💾 Saved: _${args.trim()}_`, threadTs);
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
    "• `@nikola enrich <leadId>`\n" +
    "• `@nikola remember that <fact>`\n" +
    "Or just talk to me — I'll figure out what you mean (and ask if I'm not sure)."
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
