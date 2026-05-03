/**
 * Memory extraction (post-session). Triggered when a `nikolaWorkQueue` doc
 * transitions to `completed`. Runs a small gpt-4.1-mini call asking what's
 * worth remembering, posts a "Remember these?" message in #bdr with the
 * candidate facts, and persists each as a `nikolaMemoryCandidates` doc with
 * `status: "pending"`. Mostafa reacts (✅ remember, ❌ skip) on individual
 * candidate messages — the reaction handler flips status and appends
 * confirmed facts to `nikolaMemory/singleton`.
 *
 * Skip signals (don't extract):
 *   - work.kind === "remember"  (manual addition; already handled inline)
 *   - work.kind === "status"    (no signal)
 *   - work.kind === "mention"   (the mention itself was routed elsewhere; the
 *                                 underlying child work doc is what gets
 *                                 extracted)
 *   - work.error                (failed runs aren't worth remembering)
 *   - args length < 5           (too short to have useful content)
 */
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import OpenAI from "openai";
import {bdrChannelId, MODELS, NIKOLA_BOT_EMOJI, NIKOLA_BOT_NAME, openaiApiKey, slackBotToken} from "../config";
import {WebClient} from "@slack/web-api";
import {renderMemoryCandidate} from "../slack/messageBlocks";
import {NikolaMemoryCandidate, NikolaWork} from "../types";

const SKIP_KINDS = new Set(["remember", "status", "mention"]);
const CANDIDATE_TTL_DAYS = 7;
const MAX_CANDIDATES_PER_RUN = 3;

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

const EXTRACT_PROMPT = `You read the args of a just-completed Nikola action and extract the few preferences, constraints, or facts about Mostafa's GTM/sales workflow that are worth remembering for future sessions.

Be conservative: extract a fact only if it would non-obviously inform Nikola's future behavior. Skip generic information already obvious from Mostafa's role (founder of CodeContent, sells technical content to devtools).

Output JSON: { "facts": ["fact 1", "fact 2", ...] }
- Each fact is one short declarative sentence in the third person ("Mostafa prefers Series B AI/CV companies").
- 0-3 facts per call. If nothing's worth remembering, output { "facts": [] }.
- Do NOT extract: greetings, single names of companies, generic queries.

Examples:

Input: "find AI/CV companies similar to Ultralytics"
Output: { "facts": ["Mostafa is currently focused on AI/computer-vision companies in the Ultralytics archetype."] }

Input: "Vercel"
Output: { "facts": [] }   // single named target, nothing distinctive

Input: "find me Series B devtools companies hiring developer advocates"
Output: { "facts": ["Mostafa prioritizes Series B devtools companies hiring developer advocates as an outreach signal."] }

Input: "reply rate this month"
Output: { "facts": [] }   // analytical query, no preference signal
`;

export async function maybeExtractMemoryCandidates(work: NikolaWork): Promise<void> {
  if (SKIP_KINDS.has(work.kind)) return;
  if (work.error) return;
  if (!work.args || work.args.trim().length < 5) return;

  let facts: string[] = [];
  try {
    const completion = await ai().chat.completions.create({
      model: MODELS.fast,
      messages: [
        {role: "system", content: EXTRACT_PROMPT},
        {role: "user", content: work.args},
      ],
      response_format: {type: "json_object"},
      max_completion_tokens: 200,
    });
    const raw = completion.choices[0].message.content || "{}";
    const parsed = JSON.parse(raw) as {facts?: unknown};
    if (Array.isArray(parsed.facts)) {
      facts = parsed.facts.filter((f): f is string => typeof f === "string" && f.length > 5);
    }
  } catch (e) {
    functions.logger.warn("memory extract LLM failed", {error: (e as Error).message});
    return;
  }

  if (facts.length === 0) return;
  facts = facts.slice(0, MAX_CANDIDATES_PER_RUN);

  for (const text of facts) {
    await postCandidate(text, work);
  }
}

async function postCandidate(text: string, work: NikolaWork): Promise<void> {
  const {text: fallbackText, blocks} = renderMemoryCandidate(text);
  let post;
  try {
    post = await slack().chat.postMessage({
      channel: bdrChannelId(),
      text: fallbackText,
      blocks: blocks as never,
      username: NIKOLA_BOT_NAME,
      icon_emoji: NIKOLA_BOT_EMOJI,
      thread_ts: work.mentionTs,
    });
  } catch (e) {
    functions.logger.warn("postCandidate failed", {error: (e as Error).message});
    return;
  }
  if (!post.ok || !post.ts) return;
  const slackMessageTs = post.ts;
  for (const emoji of ["white_check_mark", "x"]) {
    try {
      await slack().reactions.add({
        channel: bdrChannelId(),
        name: emoji,
        timestamp: slackMessageTs,
      });
    } catch {
      // already_reacted on retry — non-fatal
    }
  }
  const ref = admin.firestore().collection("nikolaMemoryCandidates").doc();
  const doc: NikolaMemoryCandidate = {
    id: ref.id,
    text,
    sourceWorkId: work.id,
    slackMessageTs,
    status: "pending",
    createdAt: admin.firestore.Timestamp.now(),
    expiresAt: admin.firestore.Timestamp.fromMillis(
      Date.now() + CANDIDATE_TTL_DAYS * 24 * 60 * 60 * 1000
    ),
  };
  await ref.set(doc);
}

/**
 * Confirm a candidate (called from reactionFlow on ✅): copy its text into
 * nikolaMemory/singleton.facts[] and mark the candidate `confirmed`.
 */
export async function confirmCandidate(candidateId: string): Promise<void> {
  const ref = admin.firestore().collection("nikolaMemoryCandidates").doc(candidateId);
  const snap = await ref.get();
  if (!snap.exists) return;
  const cand = snap.data() as NikolaMemoryCandidate;
  if (cand.status !== "pending") return;

  const memRef = admin.firestore().doc("nikolaMemory/singleton");
  const factId = admin.firestore().collection("_").doc().id;
  await memRef.set(
    {
      facts: admin.firestore.FieldValue.arrayUnion({
        id: factId,
        text: cand.text,
        keywords: cand.text
          .toLowerCase()
          .replace(/[^a-z0-9 ]+/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 3)
          .slice(0, 12),
        addedAt: admin.firestore.Timestamp.now(),
        sourceWorkId: cand.sourceWorkId,
        confirmedBy: "mostafa",
        accessCount: 0,
      }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true}
  );
  await ref.set(
    {status: "confirmed", resolvedAt: admin.firestore.Timestamp.now()},
    {merge: true}
  );
}

export async function rejectCandidate(candidateId: string): Promise<void> {
  const ref = admin.firestore().collection("nikolaMemoryCandidates").doc(candidateId);
  const snap = await ref.get();
  if (!snap.exists) return;
  await ref.set(
    {status: "rejected", resolvedAt: admin.firestore.Timestamp.now()},
    {merge: true}
  );
}
