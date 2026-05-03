# Nikola misroute postmortem template

Use this template every time a Nikola routing decision goes wrong (the wrong
skill ran, or the LLM classifier dispatched a confident answer that turned
out to be off). Postmortems are the input that drives prompt improvements;
without them, the same misroute will recur.

Save filled postmortems at `docs/nikola-misroutes/YYYY-MM-DD-short-description.md`.

---

## Title (one line)

What was the user asking for, and what went wrong? E.g. *"`find companies similar to Ultralytics` dispatched to CWP-hunt instead of lead-gen."*

## Date

YYYY-MM-DD when the misroute was observed.

## What happened

Paste the user's raw utterance, the Nikola response, and the intended outcome.

```
User:      can u find companies similar to ultralytics?
Nikola:    🌱 find-companies (similar to ultralytics) [CWP-hunt + gig-hunt — 0 found]
Expected:  /nikola find-leads — discover ICP-fit AI/CV companies
```

## Route path

Pull from `nikolaRoutingDecisions` (find by `slackTs` or `userText`).

- Decision id: `<from Firestore>`
- routeMethod: `string-match` | `llm` | `clarification`
- matchedKind: `<what was dispatched>`
- args: `<extracted args>`
- confidence: `<llm score, if applicable>`
- llmRaw: `<raw classifier JSON, if applicable>`

## Root cause

Pick one (or several) and explain:

- [ ] **Surface phrase collision** — the utterance literally contains a skill name (`find companies`) but means something else.
- [ ] **Missing intent in classifier prompt** — the kind that should have matched isn't covered or has weak description.
- [ ] **Adversarial example missing** — the prompt's few-shots don't disambiguate this surface form.
- [ ] **String-match shortcut pre-empted the LLM** — the path never reached the classifier.
- [ ] **Confidence threshold too aggressive** — high confidence on the wrong answer with no clarification.
- [ ] **Data-layer mismatch** — the user wanted analytics but the query couldn't be answered (missing field/index).
- [ ] **Other** — describe.

## Cost of the wrong dispatch

- Wasted spend: $X.XX
- Wasted user time: ~Y minutes (read incorrect output, retried)
- Side effects on downstream state (drafts/leads/etc.): describe or "none"

## Fix applied

Files + lines changed. E.g.:

- `functions/src/nikola/prompts/mentionIntentPrompt.ts` — added adversarial example for `"find companies similar to <ICP archetype>"` → `find-leads`.
- `functions/src/nikola/jobs/workQueueProcessor.ts:142-151` — deleted the `find` two-word string-match shortcut.

## Replay verification

Run the replay CLI to confirm the same utterance now routes correctly under
the updated prompt:

```
cd functions
npx tsx scripts/replayRouting.ts <decisionId>
```

Paste the diff:

```
--- ORIGINAL ---
matchedKind: find-companies
args: similar to ultralytics

--- REPLAY ---
✓ SAME route          (or)        ✗ DIFFERENT route
  was: find-companies
  now: find-leads
  confidence: 0.91
```

## Follow-ups

Anything that should be tracked separately — schema additions, prompt
refinements you didn't ship in this fix, classifier-confidence tuning, etc.
