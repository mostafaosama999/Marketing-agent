# V2 Offer Idea Generation: Problem, V1 vs V2, and Fix Vision

Status: Consolidated from investigation + stakeholder answers  
Last updated: 2026-02-06  
Owner: Marketing Agent team

## Goal
Capture why V2 was started, how it differs from V1, why it still fails for your use case, and what a fixed V2/V3 should do.

## Why V2 was started
V1 was trend-aware but not company-specific. V2 was built to fix that by using a staged pipeline:
1. company differentiators
2. AI concept matching
3. content gaps
4. idea generation
5. validation

Code refs:
- `functions/src/offerAnalysis/v2/generateIdeasV2.ts`
- `functions/src/offerAnalysis/v2/promptsV2.ts`
- `functions/src/offerAnalysis/v2/stages/stageMatchConcepts.ts`

## Confirmed stakeholder feedback

### Main failure mode
- Not a crash/timeout issue.
- Output quality issue: ideas feel generic in time relevance.
- Many ideas are not tied to recent AI changes (Agentic AI, MCP, new model-era patterns).

### V1 vs V2 (from your perspective)
- V1:
  - better at using hot AI trends/models
  - weak company relevance (same trend patterns repeated across companies)
- V2:
  - better company relevance
  - weak trend integration (often not hot/current enough)

### What a good idea must include
- company product + trending AI concept
- clear content gap fill
- deep company understanding
- practical, actionable developer value

Example direction you confirmed as ideal:
- "Building an Agentic Data Pipeline with Airbyte + MCP: Auto-Discovering and Syncing New Data Sources"

### Debug UX requirement
- Keep stage-by-stage outputs inspectable after generation.
- Show this in a separate tab/modal.

## V1 vs V2 implementation differences

### V1
- One-shot generation after company classification.
- Uses fixed trend tables in prompt (hot models/concepts).
- Includes `specificRequirements` in prompt when provided.

Code refs:
- `functions/src/offerAnalysis/generateOfferIdeas.ts`
- `functions/src/offerAnalysis/prompts.ts`
- `functions/src/offerAnalysis/prompts.ts:141`
- `functions/src/offerAnalysis/prompts.ts:220`

### V2
- Multi-stage pipeline with strict constraints and filtering.
- Trend usage depends on dynamic concept matching success.
- `specificRequirements` exists in request type but is not wired into Stage 3 prompt generation.

Code refs:
- `functions/src/offerAnalysis/v2/generateIdeasV2.ts`
- `functions/src/offerAnalysis/v2/promptsV2.ts`
- `functions/src/offerAnalysis/v2/generateIdeasV2.ts:60`

## Why V2 still underperforms (prioritized hypotheses)

### 1) Trend integration is conditional and can drop to zero
If Stage 1.5 returns no matched concepts, V2 can generate company-specific ideas with little or no modern AI trend layer.

Refs:
- `functions/src/offerAnalysis/v2/generateIdeasV2.ts`
- `functions/src/offerAnalysis/v2/promptsV2.ts`
- `functions/src/offerAnalysis/v2/stages/stageMatchConcepts.ts`

### 2) Stage 1.5 can fail silently
Concept matching can return empty while still reporting success, which hides root causes.

Refs:
- `functions/src/offerAnalysis/v2/stages/stage1_5ConceptMatching.ts:181`
- `functions/src/offerAnalysis/v2/stages/stage1_5ConceptMatching.ts:185`

### 3) Concept context is partially degraded in staged UI flow
When concepts are reconstructed for Stage 3, fields like `description` and `whyHot` are blanked, reducing prompt quality.

Refs:
- `functions/src/offerAnalysis/v2/stages/stage3GenerateIdeas.ts:108`
- `functions/src/offerAnalysis/v2/stages/stage3GenerateIdeas.ts:109`
- `functions/src/offerAnalysis/v2/promptsV2.ts:74`

### 4) V2 ignores explicit user intent channel
V1 uses prompt-level user constraints (`specificRequirements`); V2 currently does not.

Refs:
- `functions/src/offerAnalysis/generateOfferIdeas.ts`
- `functions/src/offerAnalysis/prompts.ts`
- `functions/src/offerAnalysis/v2/generateIdeasV2.ts:60`

### 5) Strict validation may over-prune trend-forward ideas
70+ thresholds across multiple dimensions can bias toward safe outputs.

Refs:
- `functions/src/offerAnalysis/v2/stages/stage4ValidateIdeas.ts`
- `functions/src/offerAnalysis/v2/analyzeContentGaps.ts:200`

### 6) Post-run stage observability is insufficient
Lack of persistent stage traces makes it hard to diagnose whether the issue is concept fetch, matching, prompting, or validation.

Refs:
- `agency-app/src/components/features/companies/OfferIdeasSection.tsx`
- `agency-app/src/components/features/companies/V2StageProgressDisplay.tsx`

## Vision for fixed V2/V3

### Core principle
Hybridize: keep V2 relevance engine, add V1-grade trend strength.

### Required behavior
1. Every run must include both company relevance and current AI trend relevance.
2. Enforce trend coverage with explicit minimums.
3. Use hybrid trend source:
- curated baseline trend set (stable quality)
- dynamic fetched trends (freshness)
- fallback path so runs never end with "zero-trend" ideas
4. Treat `specificRequirements` as first-class input in V2.
5. Provide full stage debug visibility in UI (tab/modal).

## Proposed implementation plan

### Phase 1: Observability
1. Add a persistent debug tab/modal.
2. Save stage artifacts in `offerAnalysis.v2.debug`.
3. Show:
- Stage 1 differentiators
- Stage 1.5 fetched/matched concepts + failures
- Stage 2 content gaps
- Stage 3 raw ideas
- Stage 4 accepted/rejected + reasons

### Phase 2: Trend quality
1. Add curated trend baseline merged with dynamic concepts.
2. Add fallback injection when matched concepts are below threshold.
3. Preserve full concept metadata into Stage 3 prompt.

### Phase 3: Prompt + scoring alignment
1. Pass `specificRequirements` into V2 prompt builder.
2. Require minimum count of "company product + hot concept" ideas.
3. Relax validation to avoid suppressing strong trend-forward ideas.

## Acceptance criteria
1. In >=80% of runs, at least 3/5 ideas include:
- company product integration
- clearly current AI concept/model
2. In >=80% of runs, user marks >=3/5 ideas as pitchable.
3. Debug modal/tab always shows complete stage traces.
4. Stage 1.5 failure is visible as degraded mode, not silent success.

## Open product decisions
1. Who owns curated trend list updates and cadence.
2. Minimum concept-tutorial count per run.
3. Final validation strictness policy.
4. Ship as V2.1 patch or V3 branch.
