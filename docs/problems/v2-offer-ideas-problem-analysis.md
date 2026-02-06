# V2 Offer Idea Generation: Problem Analysis

**Last updated:** 2026-02-06
**Status:** Documented — problems identified, no solutions proposed yet

---

## 1. Problem Statement

V2 was built to replace V1's one-size-fits-all blog idea generation with a personalized multi-stage pipeline. **It succeeded at personalization but lost the trending AI angle entirely.**

The result: V2 ideas feel like they could have been written 10 years ago. There is no mention of Agentic AI, Model Context Protocol, GPT-5, or any 2025 AI development — the exact things that make blog ideas timely and compelling.

### Real Example: Airbyte (Data Science company)

**What V2 actually produced:**

1. "Harnessing Airbyte for Real-Time Financial Data Integration: A Workflow Case Study" (90%)
2. "Optimizing Healthcare Data Management with Airbyte: Compliance and Performance" (90%)
3. "Airbyte vs Competitors: An In-depth Comparison of Data Integration Tools in Retail" (90%)
4. "The Road Ahead for Data Integration: How Airbyte Shapes the Future with Open Source" (90%)
5. "Building a Custom E-commerce Data Connector with Airbyte CDK" (80%)

These ideas are company-relevant (they all mention Airbyte) but **none reference any 2025 AI trend**. No Agentic AI, no MCP, no GPT-5, no agents, nothing. These could have been pitched in 2015.

**What a good idea looks like:**

> "Building an Agentic Data Pipeline with Airbyte + MCP: Auto-Discovering and Syncing New Data Sources"

This combines the company's product (Airbyte) with a trending AI concept (MCP / Agentic AI) in a practical tutorial angle. This is what V2 should produce but doesn't.

### The V1/V2 Tradeoff

| | V1 | V2 |
|---|---|---|
| **Trending AI concepts** | Always present (GPT-5, MCP, Agentic AI, etc.) | Missing or absent |
| **Company personalization** | Weak — same concepts applied identically to every company | Strong — analyzes differentiators, audience, content gaps |
| **Net result** | Ideas feel trendy but generic | Ideas feel relevant but dated |

Neither version achieves the actual goal: **ideas that combine the company's specific product with trending 2025 AI concepts in a practical tutorial angle.**

---

## 2. Why V2 Was Started

V1 has a fundamental problem: it applies the **exact same 5 trending concepts to every company**. Whether it's a data integration platform, a code assistant, or a CMS, V1 pulls from the same fixed table of models (GPT-5, Claude 4.1) and concepts (Agentic AI, MCP, etc.) without considering whether those concepts actually fit the company.

The concepts are used "in a dumb way" — they appear in every company's ideas regardless of relevance. This makes pitches feel templated and not thoughtful about the company's actual product.

V2 was designed to fix this by:
- Analyzing each company's unique differentiators first
- Dynamically matching AI concepts that genuinely fit the company
- Generating ideas that emerge from company context rather than a fixed template
- Validating ideas to reject anything too generic

**Source:** Code comments in `functions/src/offerAnalysis/v2/generateIdeasV2.ts:1-18` and `functions/src/offerAnalysis/v2/stages/stageMatchConcepts.ts:1-8`

---

## 3. V1 vs V2: Architecture Comparison

### V1 Architecture (2-stage, template-based)

```
User clicks "Start Analysis"
    │
    ├── Stage 1: Website Analysis (classify company type)
    │   └── GPT-4-turbo → CompanyAnalysis { companyType, summary, etc. }
    │
    └── Stage 2: Idea Generation (one-shot, from fixed template)
        ├── If GenAI company → getGenAIIdeasPrompt() with Models + Concepts tables
        └── If other company → getNonGenAIIdeasPrompt() with Models + Concepts tables
            └── GPT-4-turbo → 5 BlogIdea objects
```

**Key files:**
- `functions/src/offerAnalysis/analyzeCompanyWebsite.ts` — Stage 1
- `functions/src/offerAnalysis/generateOfferIdeas.ts` — Stage 2
- `functions/src/offerAnalysis/prompts.ts` — Prompt templates (FROZEN, do not modify)

**V1 output fields:** title, whyItFits, whatReaderLearns[], keyStackTools[], angleToAvoidDuplication, platform, specificUse, companyTool

### V2 Architecture (5-stage, personalized pipeline)

```
User clicks "Start Analysis"
    │
    ├── Stage 0: Fetch AI Concepts (from Hacker News, arXiv, RSS — cached 24h)
    │
    ├── Stage 1: Analyze Company Differentiators
    │   └── GPT-4-turbo → CompanyProfile { differentiators, audience, contentStyle, techStack }
    │
    ├── Stage 1.5: Match AI Concepts to Company (STRICT — fitScore >= 70)
    │   └── GPT-4-turbo → MatchedConcept[] (often 0 matches)
    │
    ├── Stage 2: Analyze Content Gaps
    │   └── GPT-4-turbo → ContentGap[] (5-8 gaps, filtered to priorityScore >= 60)
    │
    ├── Stage 3: Generate Ideas (from context + matched concepts IF any)
    │   └── GPT-4-turbo → BlogIdeaV2[] (filtered to probability >= 0.5)
    │
    └── Stage 4: Validate Ideas (LLM-as-Judge)
        └── GPT-4-turbo → IdeaValidationResult[] (must score 70+ on ALL dimensions)
        └── Regeneration loop: up to 3 attempts if < 3 valid ideas
```

**Key files:**
- `functions/src/offerAnalysis/v2/generateIdeasV2.ts` — Main orchestrator
- `functions/src/offerAnalysis/v2/analyzeCompanyDifferentiators.ts` — Stage 1
- `functions/src/offerAnalysis/v2/stages/stageMatchConcepts.ts` — Stage 1.5
- `functions/src/offerAnalysis/v2/analyzeContentGaps.ts` — Stage 2
- `functions/src/offerAnalysis/v2/promptsV2.ts` — Prompts + BlogIdeaV2 type
- `functions/src/offerAnalysis/v2/validateIdeas.ts` — Stage 4
- `functions/src/services/aiConcepts/` — AI concept fetching & caching

**V2 output fields:** title, whyOnlyTheyCanWriteThis, specificEvidence, targetGap, audienceFit, whatReaderLearns[], keyStackTools[], angleToAvoidDuplication, differentiatorUsed, contentGapFilled, probability, aiConcept, isConceptTutorial, conceptFitScore

**Frontend orchestration:** `agency-app/src/components/features/companies/OfferIdeasSection.tsx`
- V1 and V2 run in parallel
- Results shown in tabs: "V2 (Personalized)" (default) and "V1 (Template)"
- Choosing from either version saves to the same fields: `customFields.chosen_idea` + `customFields.chosen_idea_version`

---

## 4. What V1 Gets Right

V1 has a **curated, fixed table of trending AI models and concepts** hardcoded directly into the prompt. This table is always injected — it cannot fail, cannot return empty, and always produces ideas that reference 2025 AI trends.

### The GenAI prompt's Models table (`prompts.ts:148-151`):
| Model | Why It's Hot |
|-------|-------------|
| GPT-5 | Released Aug 2025; combines reasoning and non-reasoning capabilities |
| Claude 4.1 / Sonnet | Anthropic's updates gaining traction in safety & reasoning benchmarks |

### The GenAI prompt's Concepts table (`prompts.ts:156-165`):
| Concept | Why It's Hot |
|---------|-------------|
| Agentic AI / Autonomous Agents | Next frontier to break through "GenAI productivity plateau" |
| Model Context Protocol (MCP) | Standard "USB for AI" for agents/tools |
| Agent Communication Protocols (ACP, A2A, ANP) | Multi-agent coordination |
| Agentic Context Engineering (ACE) | +10.6% agent benchmark lift |
| Green AI / Energy-Aware Inference | Efficiency-optimized models |
| Inference-Time Computation / Dynamic Routing | Sparse layers, conditional compute |
| Memory / Long Context Optimization | Managing hundreds of thousands of tokens |
| On-Device & TinyLLM | Quantized LLMs for edge |
| Safe & Personalized Alignment | Dynamic alignment rules per user |
| Agent IAM / Zero-Trust Identity | Decentralized identity for agents |

The non-GenAI prompt has a smaller but similar table (`prompts.ts:248-255`).

**The key insight**: Because these are hardcoded in the prompt, they are **always available** to the LLM during generation. Every V1 idea will reference at least one of these. The rule "Each idea must have: Platform + Company Tool + Ultra-Specific Use Case" (`prompts.ts:170`) enforces this.

---

## 5. What V1 Gets Wrong

V1 applies these same concepts **identically to every company**. The trending concepts table is the same regardless of whether the company is:
- A data integration platform (Airbyte)
- A code assistant (Cursor)
- A CMS (Contentful)
- A monitoring tool (Datadog)

This means:
- Every company gets ideas about MCP, Agentic AI, GPT-5 etc. even when some concepts don't fit
- The "Ultra-Specific Use Case" part of the idea is supposed to make it company-relevant, but the concept selection itself is not personalized
- Two different companies in the same space might get nearly identical idea structures with just the product name swapped

The application of concepts feels "dumb" — they are used without considering whether the concept genuinely relates to what the company does.

---

## 6. What V2 Gets Right

V2's multi-stage pipeline produces ideas that are genuinely relevant to the company:
- **Differentiator analysis** (Stage 1) correctly identifies what makes a company unique
- **Content gap analysis** (Stage 2) finds topics the company hasn't covered but should
- **Competitor test** in the prompt rejects ideas that any company could write
- **Audience matching** ensures ideas fit the company's actual reader base

The Airbyte example shows this: all 5 V2 ideas are about data integration, connectors, and data management — topics that genuinely fit Airbyte's domain. They reference Airbyte-specific features like the CDK.

The personalization layer works. The trending AI integration does not.

---

## 7. What V2 Gets Wrong: Root Cause Analysis

### Problem 1: Dynamic AI concept fetching is unreliable

V2 replaced V1's hardcoded concept table with a dynamic fetching system that pulls from external sources.

**How it works:**
- Stage 0 calls `getAIConcepts()` which fetches signals from 4 sources:
  - Hacker News (Algolia API, 50+ point threshold)
  - arXiv (cs.AI, cs.CL, cs.LG papers)
  - The Rundown AI (RSS feed)
  - Import.AI (Substack RSS feed)
- GPT-4o-mini extracts the top 10 concepts from these signals
- Results cached for 24 hours in Firestore (`aiConceptCache/latest`)

**The problems:**
- **No hardcoded fallback**: If all sources are down, or the LLM extracts poorly, or the cache is stale, there are 0 concepts. There is no curated fallback list like V1 has.
- **Source quality varies**: Hacker News filters on 50+ points, but RSS feeds are unfiltered. The extracted concepts may not be the same quality as V1's curated list.
- **Extraction prompt forbids product launches**: The extraction prompt explicitly rejects "OpenAI releases GPT-5" type signals, which means the very models V1 includes (GPT-5, Claude 4.1) might get filtered out.

**Files:** `functions/src/services/aiConcepts/conceptCache.ts`, `functions/src/services/aiConcepts/extractConcepts.ts`

### Problem 2: Stage 1.5 concept matching is too strict

Even when concepts are successfully fetched, the matching stage rejects most of them.

**The matching prompt says** (`stageMatchConcepts.ts:27-95`):
> "Your job is to be STRICT. Most concepts will NOT fit most companies."
> "ONLY return concepts with fitScore >= 70."
> "It is VALID to return an empty array if no concepts match well."

**The consequence:**
- For most companies, Stage 1.5 returns 0 matched concepts
- When `matchedConcepts.length === 0`, the function `buildAIConceptSection()` returns an **empty string** (`promptsV2.ts:78-79`)
- This means the Stage 3 generation prompt has **zero mention of any AI concept** — it's as if trending AI doesn't exist
- The `prefilterConcepts()` function (`stageMatchConcepts.ts:250-276`) uses keyword overlap as a pre-filter, which may eliminate valid concepts before the LLM even evaluates them

**File:** `functions/src/offerAnalysis/v2/stages/stageMatchConcepts.ts:76`, `functions/src/offerAnalysis/v2/promptsV2.ts:78`

### Problem 3: V2 prompt explicitly bans technologies not in the detected tech stack

V2's generation prompt contains this rule (`promptsV2.ts:201-203`):

> "**TECHNOLOGY CONSTRAINTS**: Only mention technologies from their tech stack: ${techStack}"
> "EXCEPTION: If AI CONCEPT OPPORTUNITIES are listed below, you MAY use those concepts"

**The consequence:**
- If Stage 1.5 returns 0 concepts (which is common, per Problem 2), the exception clause doesn't apply
- The LLM is explicitly told to ONLY mention technologies from the company's detected tech stack
- If Apollo doesn't list "MCP", "Agentic AI", or "GPT-5" as part of the company's tech stack (and it almost never would — these are AI trends, not stack components), V2 will not mention them
- V1 has **no such restriction** — it freely injects any model or concept from its curated table

**File:** `functions/src/offerAnalysis/v2/promptsV2.ts:201-203`

### Problem 4: Staged frontend drops concept data between stages

When V2 runs through the staged cloud functions (individual calls per stage from the frontend), concept data gets degraded.

**The issue:**
- Stage 1.5 returns `MatchedConcept[]` with full concept objects including `whyHot`, `description`, `useCases`, `keywords`
- When the frontend passes this data to Stage 3 via a separate cloud function call, the concept objects are reconstructed but lose fields like `whyHot` and `description`
- Stage 3's prompt builder (`buildAIConceptSection` in `promptsV2.ts:74-112`) uses `mc.concept.whyHot` and `mc.fitReason`, so missing data means the prompt gives the LLM less context about why each concept matters

**Files:** `agency-app/src/components/features/companies/OfferIdeasSection.tsx`, `functions/src/offerAnalysis/v2/stages/stage3GenerateIdeas.ts:108-109`

### Problem 5: Stage 1.5 failure is completely silent

Stage 1.5 (AI concept matching) is treated as optional. If it fails for any reason, the error is caught and swallowed.

**In the main orchestrator** (`generateIdeasV2.ts:341-343`):
```
// If concept extraction/matching fails, fall back to regular V2 pipeline
console.warn("[V2] AI concept stages failed, falling back to regular pipeline:", error);
```

**In the frontend** (`OfferIdeasSection.tsx`):
```
v2Stage1_5ConceptMatching(companyId, v2Profile).catch(err => {
  console.warn('Stage 1.5 failed (AI concepts optional):', err);
  return { matchedConcepts: [], conceptsEvaluated: 0, ... };
})
```

**The consequence:**
- If concept fetching fails, concept matching fails, or any error occurs in Stage 0 or 1.5, V2 silently proceeds without any AI concepts
- The user sees 5 ideas with no indication that the concept pipeline failed
- There is no UI indicator showing "0 concepts matched" or "concept stage failed"
- The user has no way to know whether the lack of trending concepts is by design or due to a failure

### Problem 6: Validation may reject trend-aware ideas

Even if a good trend-aware idea were generated, Stage 4 validation might reject it.

**Validation criteria** (`validateIdeas.ts:232-237`):
```typescript
const isValid =
  evaluation.verdict === "ACCEPT" &&
  evaluation.personalization >= 70 &&
  evaluation.uniqueness >= 70 &&
  evaluation.audienceRelevance >= 70 &&
  overallScore >= 70;
```

**The issue:**
- An idea like "Building an MCP Server with Airbyte for Agentic Data Pipelines" is a great pitch
- But the validation prompt scores **personalization** based on "Does it reference specific company facts?" (`validateIdeas.ts:117-121`)
- MCP is not a company fact — it's an industry trend. The idea might score well on uniqueness but poorly on personalization (because "MCP" isn't Airbyte-specific)
- Similarly, the **uniqueness** criteria asks "Would this work for their competitor?" — an MCP tutorial could theoretically work for other data tools too, scoring lower
- With ALL three dimensions requiring 70+, a single low score kills the idea
- The regeneration loop (up to 3 attempts) then generates more ideas, but under the same constraints that suppress trends, so the replacement ideas are equally trend-free

**File:** `functions/src/offerAnalysis/v2/validateIdeas.ts:117-121`, `validateIdeas.ts:232-237`

### Problem 7: No debug visibility after generation completes

The user cannot inspect what happened at each stage after the pipeline finishes.

**Current behavior:**
- During generation, `V2StageProgressDisplay` shows progress through each stage
- After generation completes, the UI switches to showing only the final ideas in tabs
- The stage-by-stage details (differentiators found, concepts matched or not, content gaps, rejected ideas with reasons) disappear
- The user sees 5 generic-feeling ideas but has no way to diagnose why they are generic

**What the user needs:**
- Persistent access to stage results after generation (in a separate tab or modal)
- Visibility into: how many concepts were matched (or if Stage 1.5 failed), which ideas were rejected and why, what validation scores each idea received
- This would make the difference between "V2 ideas are bad" and "V2 ideas are bad because Stage 1.5 returned 0 concepts because the Hacker News API was down"

**File:** `agency-app/src/components/features/companies/V2StageProgressDisplay.tsx`, `agency-app/src/components/features/companies/OfferIdeasSection.tsx`

---

## 8. The Fundamental Problem

V1 and V2 each solve half the problem:

```
V1: Trending AI concepts ✅  +  Company personalization ❌  =  Trendy but generic
V2: Trending AI concepts ❌  +  Company personalization ✅  =  Relevant but dated
```

**What is actually needed:**
```
V3: Trending AI concepts ✅  +  Company personalization ✅  =  Relevant AND trendy
```

The root cause chain is:
1. V2 dynamically fetches AI concepts instead of using V1's curated list → concepts may be absent
2. V2 strictly matches concepts to companies → most get rejected (fitScore < 70)
3. When no concepts match, V2's prompt bans technologies outside the detected tech stack → AI trends are explicitly excluded
4. Even if a trend-aware idea slips through, validation may reject it for being "not personalized enough"

The result is a systematic pipeline that is structurally designed to suppress trending AI concepts from the output.

---

## 9. What a Good Idea Looks Like

Based on stakeholder input, a good blog idea has ALL of these properties:

1. **Uses the company's product + a trending AI topic**: e.g., "Building an Agentic Data Pipeline with Airbyte + MCP" — not just "Airbyte for Healthcare Data"
2. **Fills a content gap on their blog**: Something they haven't written about but should, given their audience
3. **Shows deep company knowledge**: References specific product features, differentiators, or their audience's pain points
4. **Practical & actionable for developers**: Hands-on tutorials and how-tos, not thought leadership or opinion pieces
5. **References recent AI developments**: Mentions 2025 models (GPT-5, Claude 4.1), protocols (MCP), paradigms (Agentic AI), or techniques — not timeless/generic topics

Properties 1 and 5 are what V2 consistently fails at. Properties 2, 3, and 4 are what V2 does well.
