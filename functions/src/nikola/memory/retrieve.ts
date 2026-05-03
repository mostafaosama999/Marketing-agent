/**
 * Memory retrieval — pulls the top-N most-relevant confirmed facts for the
 * current request and updates each fact's `accessCount` / `lastAccessedAt`.
 *
 * Single-user, ≤50 facts cap. Simple keyword overlap scoring beats Mem0's
 * vector store on latency at this scale (no embedding round-trip per call).
 */
import * as admin from "firebase-admin";
import {NikolaMemoryFact} from "../types";

export const MEMORY_DOC_PATH = "nikolaMemory/singleton";

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

interface ScoredFact {
  fact: NikolaMemoryFact;
  score: number;
}

/**
 * Retrieve up to `limit` confirmed memory facts most relevant to `queryText`.
 * Touches `accessCount` + `lastAccessedAt` on returned facts (best-effort,
 * non-blocking-style — done in a single batch update).
 */
export async function retrieveRelevantFacts(
  queryText: string,
  limit = 5
): Promise<NikolaMemoryFact[]> {
  const ref = admin.firestore().doc(MEMORY_DOC_PATH);
  const snap = await ref.get();
  if (!snap.exists) return [];
  const data = snap.data() as {facts?: NikolaMemoryFact[]} | undefined;
  const facts = data?.facts || [];
  if (facts.length === 0) return [];

  const queryTokens = new Set(tokenize(queryText));
  if (queryTokens.size === 0) {
    // No useful tokens — return the most recently added facts.
    return facts
      .slice()
      .sort((a, b) => b.addedAt.toMillis() - a.addedAt.toMillis())
      .slice(0, limit);
  }

  const scored: ScoredFact[] = facts.map((fact) => {
    const overlap = (fact.keywords || []).filter((k) => queryTokens.has(k.toLowerCase())).length;
    return {fact, score: overlap};
  });
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Tie-break on most-recently-added; stable.
    return b.fact.addedAt.toMillis() - a.fact.addedAt.toMillis();
  });

  // Always return at least the top fact even if score is 0; cap at limit.
  const top = scored.slice(0, limit).map((s) => s.fact);

  // Best-effort access bookkeeping — fire and forget.
  void touchAccess(top.map((f) => f.id));

  return top;
}

async function touchAccess(factIds: string[]): Promise<void> {
  if (factIds.length === 0) return;
  try {
    const ref = admin.firestore().doc(MEMORY_DOC_PATH);
    const snap = await ref.get();
    if (!snap.exists) return;
    const data = snap.data() as {facts?: NikolaMemoryFact[]} | undefined;
    const facts = (data?.facts || []).slice();
    let mutated = false;
    const now = admin.firestore.Timestamp.now();
    for (let i = 0; i < facts.length; i++) {
      if (factIds.includes(facts[i].id)) {
        facts[i] = {
          ...facts[i],
          accessCount: (facts[i].accessCount || 0) + 1,
          lastAccessedAt: now,
        };
        mutated = true;
      }
    }
    if (mutated) {
      await ref.set({facts, updatedAt: now}, {merge: true});
    }
  } catch {
    // Non-fatal — silent
  }
}

/** Render a list of facts as a `## Active rules` section for the system prompt. */
export function renderFactsBlock(facts: NikolaMemoryFact[]): string {
  if (facts.length === 0) return "";
  return (
    "## Active memory (Mostafa's confirmed preferences)\n\n" +
    facts.map((f) => `- ${f.text}`).join("\n")
  );
}

/**
 * LRU-style eviction when the singleton exceeds the soft cap. Keeps
 * `keepCount` highest-scoring facts where score = accessCount × recency.
 */
export async function evictIfOverCap(keepCount = 50): Promise<number> {
  const ref = admin.firestore().doc(MEMORY_DOC_PATH);
  const snap = await ref.get();
  if (!snap.exists) return 0;
  const data = snap.data() as {facts?: NikolaMemoryFact[]} | undefined;
  const facts = data?.facts || [];
  if (facts.length <= keepCount) return 0;

  const now = Date.now();
  const ranked = facts
    .map((f) => {
      const ageDays = (now - f.addedAt.toMillis()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 30 - ageDays);
      return {fact: f, score: (f.accessCount || 0) * 5 + recencyScore};
    })
    .sort((a, b) => b.score - a.score);

  const kept = ranked.slice(0, keepCount).map((r) => r.fact);
  const evicted = facts.length - kept.length;
  await ref.set({facts: kept, updatedAt: admin.firestore.Timestamp.now()}, {merge: true});
  return evicted;
}
