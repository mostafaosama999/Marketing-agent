# V2 Offer Ideas: External Research and Implementation Blueprint

Status: Research complete  
Date: 2026-02-06  
Scope: How to fix V2 so outputs are both company-relevant and AI-trend-relevant

## Executive summary
Your diagnosis is correct:
- V1 has strong trend usage but weak company fit.
- V2 has stronger company fit but weak trend usage.

The fix is not "replace V2". The fix is a **hybrid architecture**:
1. keep V2 company-context pipeline,
2. harden trend sourcing/matching,
3. enforce trend coverage in generation,
4. rerank with multi-objective scoring (not only uniqueness/personalization),
5. add persistent stage observability for debugging.

## Research tracks ("sub-agents")

### Track A: Workflow architecture patterns
Source: Anthropic engineering guidance and chain workflows.
- Anthropic recommends simple composable patterns first (prompt chaining, routing, parallelization, evaluator-optimizer).
- This directly matches your V2 staged architecture and validates keeping staged design.

References:
- https://www.anthropic.com/engineering/building-effective-agents
- https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/chain-prompts

### Track B: Structured reliability and eval-driven iteration
Source: OpenAI Structured Outputs + Evals, promptfoo, ragas.
- Structured Outputs with strict schemas improves output reliability for stage artifacts.
- Automated evals are required to avoid subjective prompt iteration.
- promptfoo/ragas are practical for regression testing quality across versions.

References:
- https://openai.com/index/introducing-structured-outputs-in-the-api/
- https://cookbook.openai.com/examples/evaluation/use-cases/structured-outputs-evaluation
- https://www.promptfoo.dev/docs/intro/
- https://github.com/promptfoo/promptfoo
- https://github.com/vibrantlabsai/ragas

### Track C: Retrieval and ranking patterns for trend quality
Source: Pinecone/Weaviate/OpenSearch/Elastic/Cohere.
- Two-stage retrieval + reranking is standard practice.
- Hybrid lexical + semantic retrieval plus RRF/rerank improves relevance robustness.
- This maps well to concept matching and idea selection in V2.

References:
- https://www.pinecone.io/learn/series/rag/rerankers/
- https://docs.weaviate.io/weaviate/concepts/search/hybrid-search
- https://docs.cohere.com/docs/rerank-overview
- https://www.elastic.co/guide/en/elasticsearch/reference/current/rrf.html/
- https://docs.opensearch.org/latest/search-plugins/search-relevance/reranking-search-results/

### Track D: Trend discovery and topic control
Source: BERTopic + MCP ecosystem.
- BERTopic supports dynamic topics over time and zero-shot/guided topic injection.
- This is the strongest external inspiration for your exact need: combine known must-have trend topics with discovered new topics.
- MCP standardization is useful for pluggable external trend/tool connectors.

References:
- https://maartengr.github.io/BERTopic/
- https://maartengr.github.io/BERTopic/getting_started/zeroshot/zeroshot.html
- https://maartengr.github.io/BERTopic/getting_started/topicsovertime/topicsovertime.html
- https://maartengr.github.io/BERTopic/getting_started/guided/guided.html
- https://github.com/MaartenGr/BERTopic
- https://modelcontextprotocol.io/specification/2025-06-18/basic
- https://github.com/modelcontextprotocol/modelcontextprotocol

### Track E: Observability and debugging in production
Source: LangSmith/Phoenix/Helicone/OpenInference.
- LLM systems are non-deterministic, so trace-first debugging is required.
- You need stage-level persisted traces visible post-run (your explicit request).

References:
- https://docs.langchain.com/langsmith/observability-quickstart
- https://github.com/langchain-ai/langgraph
- https://github.com/Arize-ai/phoenix
- https://phoenix.arize.com/
- https://github.com/Helicone/helicone
- https://arize-ai.github.io/openinference/

## High-confidence root causes (after research + code review)

1. **Trend signal is optional in V2 path**  
If concept matching returns empty, V2 degrades to company-only content.

2. **Concept matching failure is not loud enough**  
Stage 1.5 can return empty successfully, making debugging hard.

3. **Concept payload degrades before Stage 3 in staged flow**  
Reconstructed concepts lose rich fields (`description`, `whyHot`), reducing prompt quality.

4. **No user-intent injection in V2 generation path**  
`specificRequirements` exists but is not applied in generation prompt.

5. **Validation emphasizes genericity filters over trend usefulness**  
Can over-prune trend-forward ideas that need small refinement.

6. **Post-run stage visibility is insufficient**  
You cannot inspect exactly what each stage produced after completion.

## What other teams do (inspiration)

### 1) Two-stage ranking (retrieve then rerank)
- Broad candidate set first, accurate reranker second.
- Adaptation for your case:
  - Stage 1.5 should not be hard threshold only.
  - Return ranked concept candidates with scores/reasons.
  - Select top concepts by weighted objective, not binary inclusion only.

### 2) Hybrid retrieval/fusion
- Merge lexical and semantic signals (BM25 + vector, RRF/min-max).
- Adaptation for your case:
  - Combine curated trend backbone with dynamic extracted trends.
  - Fuse by recency, adoption signal, company fit, and actionability.

### 3) Evaluator-optimizer loops
- Generator + evaluator in loop with clear criteria.
- Adaptation for your case:
  - Keep Stage 4, but include trend-coverage criterion.
  - Use revise step for near-miss ideas instead of hard reject.

### 4) Eval suites in CI
- promptfoo/ragas style test suites reduce regressions.
- Adaptation for your case:
  - Build a fixed eval set from companies where you already know good/bad ideas.
  - Track trend-coverage pass rate and pitchability score.

### 5) Trace-first production ops
- Persist execution traces and intermediate artifacts.
- Adaptation for your case:
  - Keep full Stage 1-4 outputs in Firestore debug object.
  - Add post-run debug tab/modal.

## Recommended architecture change: V2.1 "Trend-Relevance Fusion"

### Core rule
Every final idea must satisfy both:
- `company_relevance >= threshold`
- `trend_freshness >= threshold`

### Proposed Stage 0 redesign (concept sourcing)
Current: only dynamic extraction from HN/arXiv/RSS.  
Proposed:
1. Curated trend backbone (manually maintained hot concepts/models list).
2. Dynamic extracted concepts from current sources.
3. Fusion and dedupe.
4. Assign metadata:
- `source_type` (curated/dynamic)
- `freshness_score`
- `evidence_count`
- `confidence_score`

Inspiration: BERTopic guided + zero-shot + dynamic approaches.

### Stage 1.5 redesign (concept-company matching)
Current: strict threshold, often empty.
Proposed:
1. Return top-N ranked concepts always, with rejection tags.
2. Keep strict "qualified" set, but also "near-miss" set for fallback.
3. Add coverage policy:
- if qualified < minimum, inject curated concepts with explicit caveat.

### Stage 3 redesign (generation constraints)
Current: company-specific generation, optional trend section.
Proposed constraints:
1. Minimum 3/5 ideas must be "product + current AI trend" tutorials.
2. Remaining ideas can be pure gap/differentiator.
3. Add `specificRequirements` to prompt.
4. Require evidence field for trend freshness per idea.

### Stage 4 redesign (validation and reranking)
Current: heavy pass/fail with strict 70+ thresholds.
Proposed:
1. Add new score dimensions:
- `trendFreshness`
- `trendProductIntegrationQuality`
- `developerActionability`
2. Multi-objective rerank instead of only hard filtering.
3. Add revise pass for near-threshold ideas.
4. Persist accepted and rejected with detailed reasons.

## Concrete repo implementation map

### Backend: concept quality and fusion
1. `functions/src/services/aiConcepts/types.ts`
- Add fields: `sourceType`, `freshnessScore`, `evidenceCount`, `confidenceScore`.

2. `functions/src/services/aiConcepts/extractConcepts.ts`
- Attach source evidence and confidence.
- Add optional merge with curated concept list.

3. `functions/src/services/aiConcepts/conceptCache.ts`
- Cache both curated+dynamic merged set and metadata.

### Backend: matching and generation
4. `functions/src/offerAnalysis/v2/stages/stageMatchConcepts.ts`
- Return ranked candidates and rejection reasons, not only fit>=70 survivors.
- Add fallback logic policy output.

5. `functions/src/offerAnalysis/v2/promptsV2.ts`
- Add explicit trend quota instructions.
- Add `specificRequirements` input parameter.
- Require trend freshness evidence field in output schema.

6. `functions/src/offerAnalysis/v2/generateIdeasV2.ts`
- Pass `specificRequirements` through.
- Enforce minimum trend-covered idea count before finalization.

7. `functions/src/offerAnalysis/v2/stages/stage3GenerateIdeas.ts`
- Stop dropping concept richness fields.
- Preserve `description`, `whyHot`, and source metadata.

8. `functions/src/offerAnalysis/v2/stages/stage4ValidateIdeas.ts`
- Add trend-focused metrics and revise loop.
- Store reject taxonomy for analytics.

### Frontend: persistent debug visibility
9. `agency-app/src/components/features/companies/OfferIdeasSection.tsx`
- Persist stage artifacts under `offerAnalysis.v2.debug`.
- Add debug tab/modal trigger.

10. `agency-app/src/components/features/companies/V2StageProgressDisplay.tsx`
- Add post-run inspection mode.
- Show concept candidates, selected concepts, rejected reasons, raw vs validated ideas.

## Similar repos/tools to borrow from
These are not identical products, but provide transferable patterns:

1. `langchain-ai/langgraph`  
Pattern: stateful graph orchestration + persistence + human-in-the-loop.

2. `promptfoo/promptfoo`  
Pattern: test-driven prompt/eval workflows, CI regression checks.

3. `vibrantlabsai/ragas`  
Pattern: objective metrics + synthetic test generation + feedback loops.

4. `MaartenGr/BERTopic`  
Pattern: guided/zero-shot/dynamic topic controls for trend extraction.

5. `Arize-ai/phoenix` and `Helicone/helicone`  
Pattern: production observability for multi-step LLM pipelines.

6. `Accenture/mcp-bench`  
Pattern: multi-faceted benchmark design for tool-heavy, multi-step LLM tasks.

## Suggested success metrics for rollout
1. Trend coverage rate: % ideas containing high-confidence current AI concepts.
2. Product integration quality: LLM-graded + manual acceptance.
3. Pitchability: user-selected ideas per run.
4. Debug completeness: % runs with full stage traces available.
5. Regression score: promptfoo suite pass rate across benchmark companies.

## Recommended rollout sequence
1. Ship observability/debug first (fastest leverage).
2. Add concept payload fixes + `specificRequirements` wiring.
3. Add hybrid trend sourcing and fallback policy.
4. Rework validation into multi-objective rerank + revision loop.
5. Add eval harness and gate deployments on regression metrics.

## Important caution from research
If you consider Google Trends-based pipelines, note the most common community wrapper (`pytrends`) is archived and has endpoint fragility reports. Prefer more stable sources/APIs and avoid single-source dependence.

References:
- https://github.com/GeneralMills/pytrends
- https://github.com/GeneralMills/pytrends/issues/638
