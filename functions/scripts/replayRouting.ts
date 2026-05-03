// Replay a single stored routing decision through the *current*
// MENTION_INTENT_PROMPT and print a diff. Use after editing the prompt to
// confirm a known-bad utterance now routes correctly — no nikola work is
// dispatched, no Slack messages are posted, no Firestore writes are made.
//
// Run:
//   cd functions
//   npx tsx scripts/replayRouting.ts <decisionId>
//
// Find decisionIds in the Firestore console under nikolaRoutingDecisions/
// (or via the analyst path: `@nikola show me my last 10 routing decisions`).

import * as admin from "firebase-admin";
import OpenAI from "openai";

admin.initializeApp({projectId: "marketing-app-cc237"});

import {MODELS, openaiApiKey} from "../src/nikola/config";
import {MENTION_INTENT_PROMPT} from "../src/nikola/prompts/mentionIntentPrompt";

async function main() {
  const decisionId = process.argv[2];
  if (!decisionId) {
    console.error("Usage: npx tsx scripts/replayRouting.ts <decisionId>");
    process.exit(1);
  }

  const ref = admin.firestore().collection("nikolaRoutingDecisions").doc(decisionId);
  const snap = await ref.get();
  if (!snap.exists) {
    console.error(`No nikolaRoutingDecisions/${decisionId}`);
    process.exit(2);
  }
  const original = snap.data() as {
    userText: string;
    matchedKind: string;
    args: string;
    confidence?: number;
    routeMethod: string;
    llmRaw?: string;
  };

  console.log("--- ORIGINAL ---");
  console.log(`userText:      ${original.userText}`);
  console.log(`routeMethod:   ${original.routeMethod}`);
  console.log(`matchedKind:   ${original.matchedKind}`);
  console.log(`args:          ${original.args}`);
  if (original.confidence !== undefined) {
    console.log(`confidence:    ${original.confidence}`);
  }
  if (original.llmRaw) {
    console.log(`llmRaw:        ${original.llmRaw}`);
  }
  console.log();

  const ai = new OpenAI({apiKey: openaiApiKey()});
  const completion = await ai.chat.completions.create({
    model: MODELS.fast,
    messages: [
      {role: "system", content: MENTION_INTENT_PROMPT},
      {role: "user", content: original.userText},
    ],
    response_format: {type: "json_object"},
    max_completion_tokens: 400,
  });
  const raw = completion.choices[0].message.content || "{}";

  console.log("--- REPLAY (with current prompt) ---");
  console.log(raw);
  console.log();

  try {
    const parsed = JSON.parse(raw) as {
      kind?: string;
      args?: string;
      confidence?: number;
      alternativeKind?: string;
      reason?: string;
    };
    const same =
      parsed.kind === original.matchedKind &&
      (parsed.args || "") === (original.args || "");
    console.log(same ? "✓ SAME route" : "✗ DIFFERENT route");
    if (!same) {
      console.log(
        `  was: ${original.matchedKind} (${original.args})\n` +
          `  now: ${parsed.kind} (${parsed.args})\n` +
          `  reason: ${parsed.reason || "(none)"}\n` +
          `  confidence: ${parsed.confidence ?? "?"}`
      );
    }
  } catch (e) {
    console.error("Failed to parse replay output:", e);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
