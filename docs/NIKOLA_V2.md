# Nikola V2 architecture

Last updated: 2026-05-03

Nikola is a Slack-native BDR/SDR assistant for Mostafa Ibrahim. **Sole user
(Mostafa), sole channel (#bdr)** — both gates are enforced in
`functions/src/nikola/slack/eventsHandler.ts:35-43`. Every design choice in
V2 assumes that and stays inside it; no per-user partitioning, no
multi-channel routing, no role checks.

V2 ships in five workstreams over a single PR. The motivating bug was a
misroute: *"can u find companies similar to ultralytics?"* dispatched to
`/nikola find-companies` (which means CWP+gig hunt, not prospect discovery)
because a string-match shortcut pre-empted the LLM classifier and the
classifier prompt didn't disambiguate the surface phrase collision.

---

## Category

Nikola sits in the **GTM Copilot / Conversational CRM** space — *not* AI
SDR. AI-SDR products (11x.ai, Artisan, Regie.ai, Nooks) are autonomous
outbound agents that fire emails on a schedule. Nikola is the inverse:
human-in-the-loop, every send requires a Slack reaction, the agent's job is
to make the human faster and more analytical, not replace the decision.

The closest architectural analogues are Glean Assistant (Slack-native,
RAG-over-data + actions) and HubSpot Breeze Copilot (Copilot + specialist
sub-agents on top of CRM data). Nikola intentionally diverges on (a) CWP
discovery + application, (b) blog-fit / content-gap analysis, (c)
founder-voice mimicry for a content agency selling content, (d)
single-tenant + $15/mo budget.

---

## Three-path routing

```
@mention or slash → Cheap classifier (gpt-4.1-mini, ~$0.0001)
                    Output: { kind, args, confidence, alternativeKind }
                              │
        ┌─────────────────────┼─────────────────────┐
        ▼                     ▼                     ▼
   "dispatch"            "analytical"          "multi-step"
   (single skill,        (read-only ReAct      (planner →
   deterministic)        over Firestore)       serial executor
        │                     │                  with confirmation
        ▼                     ▼                  gates)
   Existing             "analyst" skill       "planner" skill
   routeAndRun          (read-only tool       emits steps[],
   (no change)          subset)               executor runs them
```

When confidence < 0.7 and there's a viable alternative, the dispatcher
posts a numbered clarification notice in #bdr (1️⃣/2️⃣/❌ reactions) and
parks a `nikolaPendingClarifications/{id}` doc until Mostafa reacts. The
reaction handler resolves to the picked kind and enqueues fresh work.

Files:
- `functions/src/nikola/jobs/workQueueProcessor.ts` — the dispatcher
- `functions/src/nikola/prompts/mentionIntentPrompt.ts` — the classifier
- `functions/src/nikola/jobs/multiStepExecutor.ts` — multi-step orchestrator
- `functions/src/nikola/skillLoader.ts` — inline analyst + planner skills

---

## What V2 added

### Workstream 1 — misroute fix + routing observability

- Deleted the `find` two-word string-match shortcut (workQueueProcessor.ts).
- Rewrote `MENTION_INTENT_PROMPT` with contrastive descriptions, adversarial
  few-shots covering the `find companies similar to <ICP archetype>` class,
  a `confidence` field, and an `alternativeKind` for low-confidence cases.
- Upgraded the classifier `response_format` to strict `json_schema`.
- Added a confidence gate at 0.7 → posts a numbered clarification notice
  with 1️⃣/2️⃣/❌ reactions instead of dispatching blind.
- Wrote `nikolaRoutingDecisions/{id}` on every classifier call as an audit
  trail. The collection is also queryable through the analyst skill so
  Mostafa can ask `@nikola show me my last 20 routing decisions`.

### Workstream 2 — analytical-query path + data layer

- Added work kind `"analytical-query"` and an inline `analyst` skill with a
  read-only tool subset (`firestore_query`, `read_lead`, `read_company`).
- Extended `firestoreQueryTool.ts` with range filters (`whereRange`),
  `countOnly: true` aggregation, and an expanded allowlist
  (`nikolaWorkQueue`, `nikolaDrafts`, `nikolaSkillRuns`,
  `nikolaRoutingDecisions`, `nikolaPendingClarifications`, `nikolaMemory`,
  `nikolaMemoryCandidates`, `nikolaState`, `nikolaPatches`,
  `nikolaThreads`).
- Added outreach transition timestamps (`repliedAt`, `openedAt`,
  `refusedAt`, `noResponseAt`) on top of the existing `sentAt`. Stamped via
  a status→field map in `leadOpsTool.ts:updateLeadOutreach`.
- Denormalized `lead.companyIndustry` from `companies/{id}.industry` —
  copied at lead creation in `findLeads.ts` + `try.ts`, kept in sync via
  the new `nikolaCompanyIndustrySync` Firestore onUpdate trigger.
- Added 7 missing composite indexes to `firestore.indexes.json` (most
  notably `leads: status + updatedAt` and the outreach status × timestamp
  pairs that `dueLeadsQuery.ts` had been running without an index).
- Two one-shot backfill scripts: `scripts/backfillRepliedAt.ts` (proxy
  `repliedAt = updatedAt` for pre-rollout replied leads) and
  `scripts/backfillCompanyIndustry.ts` (copy industry onto existing leads).

### Workstream 3 — multi-step planner + executor

- Added work kind `"multi-step"` and an inline `planner` skill that emits
  `{steps: MultiStepPlanStep[], estimatedCostUsd, estimatedDurationSec,
  rationale, requiresSplit}`.
- New `multiStepExecutor.ts` runs steps serially, persists per-step results
  to the parent work doc, updates an in-place Slack progress message via
  `chat.update`.
- Confirmation gate: any step with `requiresConfirmation: true` (paid APIs,
  >$0.05 estimates) pauses the executor — posts ✅/❌/💬 reactions on a
  confirmation block, sets `confirmationContext` on the parent doc, exits.
- Resume-via-reaction: the reaction handler spawns a *child* work doc with
  `parentWorkId` set; the executor's `resolveRunState` loads the parent's
  plan + cursor + skippedSteps and continues. ✅ approves, ❌ skips this
  step, 💬 cancels the rest of the plan.

### Workstream 4 — hybrid memory + UX polish

- New collection `nikolaMemory/singleton` with `facts: NikolaMemoryFact[]`
  capped at 50 (LRU eviction by `accessCount × recency`).
- Hybrid extract+confirm:
  1. **Auto-extract**: `nikolaMemoryExtractor` Firestore onUpdate trigger
     fires when a `nikolaWorkQueue` doc transitions to `completed`. Runs a
     small gpt-4.1-mini call ("what's worth remembering from this?"),
     posts up to 3 candidates to #bdr as "💭 Want me to remember this?"
     blocks with ✅/❌ reactions.
  2. **Explicit confirm**: ✅ → `confirmCandidate` copies the fact into
     `nikolaMemory/singleton`. ❌ → `rejectCandidate` marks rejected.
  3. **Manual addition**: `@nikola remember that <fact>` → classifier
     intent `remember` writes directly without going through the candidate
     stage.
- `nikolaMemoryCandidates/{id}` holds pending candidates for 7 days then
  auto-expires.
- `skillLoader.buildSystemPrompt` now retrieves the top-5 most-relevant
  confirmed facts (keyword-overlap scoring; no vector store at N≤50) and
  injects them as an `## Active memory` section alongside existing patches.

### Workstream 5 — observability + replay (no automated tests)

- The `nikolaRoutingDecisions` audit log is the single source of truth for
  routing observability. Every classifier call writes a row.
- `wasCorrect` capture happens via:
  - Clarification reactions (✅ → true, ❌ → false). Already done in W1.
  - Manual flagging via the postmortem template
    (`docs/NIKOLA_MISROUTE_POSTMORTEM.md`) for misroutes Mostafa notices.
- Replay CLI: `scripts/replayRouting.ts <decisionId>` re-runs a stored
  `userText` through the *current* `MENTION_INTENT_PROMPT` and prints a
  before/after diff. Useful after editing the prompt.
- No external observability vendor (Langfuse / LangSmith / Braintrust) —
  DIY Firestore log fits the $15/mo budget. Revisit when usage justifies.

---

## Files (V2 touchpoints)

```
functions/src/nikola/
├── prompts/mentionIntentPrompt.ts            (W1 — rewritten)
├── jobs/
│   ├── workQueueProcessor.ts                 (W1 — dispatcher rewritten)
│   ├── workQueueEnqueue.ts                   (W3 — added parentWorkId)
│   ├── multiStepExecutor.ts                  (W3 — new)
│   ├── memoryExtractor.ts                    (W4 — new)
│   └── companyIndustrySync.ts                (W2 — new)
├── memory/
│   ├── extract.ts                            (W4 — new)
│   └── retrieve.ts                           (W4 — new)
├── tools/
│   ├── firestoreQueryTool.ts                 (W2 — range + count)
│   ├── leadOpsTool.ts                        (W2 — status→ts map)
│   └── index.ts                              (W2 — analyst tool subset, schema)
├── slack/reactionFlow.ts                     (W1/W3/W4 — clarification, multi-step, memory candidate)
├── skillLoader.ts                            (W2/W4 — inline skills + memory injection)
├── skillSchemas.ts                           (W2/W3 — analyst + planner schemas)
├── config.ts                                 (W2/W3 — model routing for analyst/planner)
├── types.ts                                  (W1-W4 — new kinds, plan/result types, memory types)
└── index.ts                                  (W2/W4 — new function exports)

functions/scripts/
├── backfillRepliedAt.ts                      (W2 — one-shot)
├── backfillCompanyIndustry.ts                (W2 — one-shot)
└── replayRouting.ts                          (W5 — debug CLI)

firestore.indexes.json                        (W2 — 7 new composite indexes)

docs/
├── NIKOLA_V2.md                              (this file)
└── NIKOLA_MISROUTE_POSTMORTEM.md             (W5 — template)
```

## New collections

| Collection | Purpose |
|---|---|
| `nikolaRoutingDecisions/{id}` | Audit log of every classifier call. |
| `nikolaPendingClarifications/{id}` | Holding doc for low-confidence dispatches awaiting 1️⃣/2️⃣/❌ reaction. |
| `nikolaMemory/singleton` | Confirmed memory facts, capped at 50. |
| `nikolaMemoryCandidates/{id}` | Auto-extracted facts awaiting Remember/Skip confirmation. 7-day TTL. |

## New work kinds

`analytical-query`, `multi-step`, `remember` — added to `NikolaWorkKind` in
`types.ts`. Each has a corresponding handler in `workQueueProcessor.ts`'s
`routeAndRun` switch.

## New skills

| Skill | Model | Tools | Where defined |
|---|---|---|---|
| `analyst` | gpt-4.1-mini | `firestore_query`, `read_lead`, `read_company` (read-only) | `skillLoader.ts` `ANALYST_SKILL_BODY` |
| `planner` | gpt-4.1-mini | none | `skillLoader.ts` `PLANNER_SKILL_BODY` |

## Cost & latency model

| Path | Per call cost | p95 latency |
|---|---|---|
| Single-skill dispatch (string-match) | classifier $0 + skill cost | matches existing skill |
| Single-skill dispatch (LLM) | classifier ~$0.0001 + skill cost | classifier 300ms + skill |
| Analytical query | ~$0.005-0.015 (analyst ReAct, 2-4 tool calls) | 8-15s |
| Multi-step plan (3 steps, no paid steps) | classifier $0.0001 + planner $0.006 + step costs | 60-150s |
| Multi-step plan (with paid step) | as above + interactive pause for ✅ reaction | indefinite (waits on user) |

Monthly burn at current usage (~50 actions/day): well under the $15/mo cap.
The cost gate's $12 warn threshold remains the early-warning system.

## Verification checklist (post-deploy)

1. `firebase deploy --only firestore:indexes --project marketing-app-cc237` —
   confirm all 7 new indexes show **READY** in the Firebase console.
2. Run backfills:
   ```
   cd functions
   npx tsx scripts/backfillRepliedAt.ts
   npx tsx scripts/backfillCompanyIndustry.ts
   ```
3. In #bdr, exercise the misroute set:
   - `@nikola find companies similar to ultralytics` → routes to `find-leads`
     or posts a clarification block.
   - `@nikola any new writing programs?` → routes to `find-companies`.
4. Issue analytical queries:
   - `@nikola how many companies have I outreached to in the last 7 days?`
   - `@nikola reply rate this month`
5. Issue a multi-step request:
   - `@nikola find 5 AI/CV companies and draft outreach for the top 3`
   - Confirm: planner emits steps; progress message updates in-place;
     confirmation block appears before paid steps.
6. Save a memory fact:
   - `@nikola remember that I prefer Series B AI/CV companies`
   - Issue any subsequent skill call; verify the fact appears in the system
     prompt (check `nikolaSkillRuns` for the run, the system prompt is in
     the runner-side log).
7. Browse `nikolaRoutingDecisions` after a day of normal use to confirm
   rows are populated.

## Deferred from V2 (will revisit)

The following W4 polish items were named in the plan but not shipped in
this PR. Each requires Slack workspace-side configuration that lives outside
the codebase, so deferral is the safer choice over half-shipping:

- **Slack streaming for analyst responses** (`chat.startStream` /
  `chat.appendStream` / `chat.stopStream`). Requires the Nikola Slack app
  to be configured as an *agent* surface in the manifest. Today analyst
  responses are posted as one final `chat.postMessage`; multi-step progress
  uses `chat.update` in-place which is a good substitute for the chain
  itself but not for the streaming token-by-token feel.
- **`assistant.threads.setStatus()`** — visible "Querying Firestore…" / 
  "Drafting…" mid-call status without spamming the channel. Same agent-surface
  prerequisite.
- **3 suggested prompts on the agent surface.** The agreed list:
  1. "Pipeline status"
  2. "Reply rate this month"
  3. "Find companies similar to <name>"
  Apply by editing the Slack app manifest in the Slack admin console.
  Manifest snippet:
  ```yaml
  features:
    assistant_view:
      assistant_description: "Mostafa's BDR copilot — answers analytical questions about the pipeline, dispatches lead-gen / outreach drafts, runs multi-step plans."
      suggested_prompts:
        - title: "Pipeline status"
          message: "show me my pipeline state and key metrics"
        - title: "Reply rate this month"
          message: "what's my reply rate this month?"
        - title: "Find companies similar to <name>"
          message: "find companies similar to "
  ```

## Out of scope (deliberate)

- Renaming `find-companies` / `find-leads`. The router is now smart enough
  to disambiguate; renaming would break Mostafa's muscle memory.
- Switching from OpenAI to Anthropic. Re-tuning cost dwarfs benefit.
- Multi-tenant / multi-user / multi-channel support. Single-user
  assumption is load-bearing.
- True HTTP streaming. Firebase 1st-gen kills async post-response. The
  `chat.update`-driven progress loop is the correct substitute.
- AI-SDR-style autonomy (auto-send without Mostafa's reaction).
- Vector store / embeddings for memory. Keyword overlap beats Mem0 latency
  at N≤50 facts.
- External observability vendor (Langfuse / LangSmith / Braintrust).
- Automated test/eval harness. The replay CLI is the manual debug
  substitute for ad-hoc verification.
