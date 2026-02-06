# Offer / Blog Idea Generation System

Comprehensive documentation for the triple-pipeline (V1/V2/V3) blog idea generation system.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Stage 0: Company Analysis (Shared)](#stage-0-company-analysis-shared)
4. [V1 Pipeline (Template-Based)](#v1-pipeline-template-based)
5. [V2 Pipeline (4-Stage Personalized)](#v2-pipeline-4-stage-personalized)
6. [V3 Pipeline (Trend-Relevance Fusion)](#v3-pipeline-trend-relevance-fusion)
7. [AI Concepts System](#ai-concepts-system)
8. [Frontend Orchestration](#frontend-orchestration)
9. [UI Components](#ui-components)
10. [Bulk Operations](#bulk-operations)
11. [Slack Notifications](#slack-notifications)
12. [Choosing Ideas](#choosing-ideas)
13. [Cost Tracking](#cost-tracking)
14. [Firestore Schema](#firestore-schema)
15. [Key Files Reference](#key-files-reference)

---

## Overview

The system generates blog/content ideas for companies using three independent pipelines:

| Version | Approach | Stages | Typical Cost | Duration |
|---------|----------|--------|--------------|----------|
| **V1** | Template-based prompts | 1 (single LLM call) | ~$0.03-0.06 | 15-30s |
| **V2** | 4-stage personalized + AI concepts | 5 (0, 1, 1.5, 2, 3, 4) | ~$0.10-0.20 | 60-120s |
| **V3** | Trend-relevance fusion scoring | 5 (0, 1, 1.5, 2, 3, 4) | ~$0.12-0.25 | 60-150s |

All three run **in parallel** and save results **independently** to Firestore. Each version has its own tab in the UI.

### Key Principles
- **Independence**: Each version runs, saves, and displays independently. Failure in one doesn't affect others.
- **Incremental persistence**: Each version saves to Firestore as soon as it completes. Page refresh restores all completed results.
- **V1 is frozen**: The V1 backend file must not be modified. New versions get their own directory.

---

## Architecture

### Single-Company Flow

```
User clicks "Start Analysis"
        |
        v
  Stage 0: analyzeCompanyWebsite()  [shared]
        |
        +---> saves offerAnalysis.companyAnalysis to Firestore
        |
        +--- V1: generateOfferIdeas()        ---> saves offerAnalysis.ideas
        |
        +--- V2: 4-stage pipeline            ---> saves offerAnalysis.v2
        |     (Stage 1 -> 1.5+2 -> 3 -> 4)
        |
        +--- V3: generateOfferIdeasV3()      ---> saves offerAnalysis.v3
        |
        v  (Promise.allSettled)
  Slack notification sent with all counts
```

### Bulk Flow

```
BulkOfferAnalysisDialog / CompaniesPage inline handler
  |
  for each company (sequential):
    Stage 0: analyzeCompanyWebsite()
    V1 + V2 + V3 in parallel (Promise.allSettled)
    Each saves to Firestore independently
```

---

## Stage 0: Company Analysis (Shared)

**Cloud Function**: `analyzeCompanyWebsiteCloud`
**File**: `functions/src/offerAnalysis/analyzeCompanyWebsite.ts`
**Frontend wrapper**: `cloudFunctions.ts` -> `analyzeCompanyWebsite()`

Categorizes company as one of: `Generative AI | AI tool | Data science | Service provider | Content maker`

**Output** (`CompanyAnalysis`):
```typescript
{
  companyName: string;
  companyType: string;
  companySummary: string;
  canTrainLLMs: boolean;
  reliesOnAI: boolean;
  businessModel: 'B2B' | 'B2C' | 'Both';
  country: string;
  linkedinUrl: string | null;
  blogUrl: string | null;
}
```

**Firestore path**: `entities/{id}/offerAnalysis.companyAnalysis`
**Model**: gpt-4-turbo
**Cost**: ~$0.02-0.04

---

## V1 Pipeline (Template-Based)

**Cloud Function**: `generateOfferIdeasCloud`
**File**: `functions/src/offerAnalysis/generateOfferIdeas.ts` **(FROZEN - do not modify)**
**Timeout**: 300s, Memory: 512MB

### Process
1. Takes `companyAnalysis` from Stage 0
2. Selects prompt template based on `companyType`:
   - `Generative AI` -> `getGenAIIdeasPrompt()`
   - Others -> `getNonGenAIIdeasPrompt()`
3. Single GPT-4-turbo call with JSON mode
4. Returns ~5 template-driven ideas

### Data Structure (`BlogIdea`)
```typescript
{
  title: string;
  whyItFits: string;
  whatReaderLearns: string[];
  keyStackTools: string[];
  angleToAvoidDuplication: string;
  platform?: string;
  specificUse?: string;
  companyTool?: string;
}
```

**Firestore save**: `offerAnalysis.ideas`, `offerAnalysis.promptUsed`, `offerAnalysis.costInfo.stage2CostV1`

---

## V2 Pipeline (4-Stage Personalized)

**Cloud Function (monolithic)**: `generateOfferIdeasV2Cloud`
**File**: `functions/src/offerAnalysis/v2/generateIdeasV2.ts`
**Staged functions**: `functions/src/offerAnalysis/v2/stages/`
**Timeout**: 540s, Memory: 1GB

The frontend uses **staged cloud functions** for progressive UI display (showing each stage's results as they complete).

### Stage 1: Analyze Differentiators

**Function**: `v2Stage1Cloud` / `analyzeCompanyDifferentiators()`
**File**: `functions/src/offerAnalysis/v2/analyzeCompanyDifferentiators.ts`

Extracts company-specific differentiators using Apollo data, blog analysis, and company type.

**Output** (`CompanyProfile`):
```typescript
{
  companyName: string;
  oneLinerDescription: string;
  techStack: string[];
  uniqueDifferentiators: Array<{
    claim: string;
    evidence: string;
    category: 'market_niche' | 'technical_approach' | 'business_model' | 'customer_segment' | 'product_feature';
    uniquenessScore: number;  // 60-100
  }>;
  targetAudience: {
    primary: string;
    sophisticationLevel: 'beginner' | 'intermediate' | 'advanced';
    jobTitles: string[];
  };
  contentStyle: {
    technicalDepth: 'low' | 'medium' | 'high';
    topicsTheyLike: string[];
    topicsToAvoid: string[];
  };
}
```

**Model**: gpt-4-turbo, temperature 0.3

### Stage 1.5: Match AI Concepts to Company

**Function**: `v2Stage1_5Cloud` / `matchConceptsToCompany()`
**File**: `functions/src/offerAnalysis/v2/stages/stage1_5ConceptMatching.ts`

Takes 10-15 cached AI concepts (see [AI Concepts System](#ai-concepts-system)) and evaluates fit for this specific company.

- Scores each concept 0-100 on relevance, product integration, audience interest
- **Threshold**: fitScore >= 50 (lowered from 70 to fix sparse matching)
- Returns matched concepts sorted by fit score

**3-Tier Injection Strategy** (used in Stage 3):
1. **Tier 1**: Matched concepts -> personalized tutorials
2. **Tier 2**: No matches but raw concepts available -> "find creative connections"
3. **Tier 3**: Both failed -> generate without concepts

### Stage 2: Content Gap Analysis

**Function**: `v2Stage2Cloud` / `analyzeContentGaps()`
**File**: `functions/src/offerAnalysis/v2/analyzeContentGaps.ts`

Identifies content gaps based on company profile and existing blog themes.

**Output** (`ContentGap[]`):
```typescript
{
  topic: string;
  gapType: 'tech_stack' | 'audience' | 'differentiation' | 'funnel' | 'trending';
  whyItMatters: string;
  suggestedAngle: string;
  priorityScore: number;  // 0-100
}
```

Note: Stages 1.5 and 2 run **in parallel** (Promise.all).

### Stage 3: Generate Ideas

**Function**: `v2Stage3Cloud` / `generateIdeasFromContext()`
**File**: `functions/src/offerAnalysis/v2/promptsV2.ts`

Generates 5 ideas from company profile + content gaps + matched AI concepts.

**Output** (`BlogIdeaV2`):
```typescript
{
  title: string;
  whyOnlyTheyCanWriteThis: string;
  specificEvidence: string;
  targetGap: string;
  audienceFit: string;
  whatReaderLearns: string[];
  keyStackTools: string[];
  angleToAvoidDuplication: string;
  differentiatorUsed: string;
  contentGapFilled: string;
  probability: number;  // 0.0-1.0 (verbalized sampling)
  aiConcept?: string;
  isConceptTutorial?: boolean;
  conceptFitScore?: number;
}
```

### Stage 4: Validate Ideas (LLM-as-Judge)

**Function**: `v2Stage4Cloud` / `validateIdeas()`
**File**: `functions/src/offerAnalysis/v2/validateIdeas.ts`

**Rule-based pre-filter**: Rejects ideas with buzzword density >= 60/100.

**LLM validation scoring**:
- Personalization (30%): References company-specific facts
- Uniqueness (25%): Would fail "competitor test"
- Audience Relevance (20%): Matches their style
- Timeliness (25%): References current AI/tech trends
- Buzzword penalty applied

**Acceptance**: Weighted overall score >= 70

**Model**: gpt-4-turbo, temperature 0.2

---

## V3 Pipeline (Trend-Relevance Fusion)

**Cloud Function**: `generateOfferIdeasV3Cloud`
**File**: `functions/src/offerAnalysis/v3/generateIdeasV3.ts`
**Timeout**: 540s, Memory: 1GB

### Key Differences from V2

1. **Hybrid Concept Pool**: 8 hardcoded curated concepts + dynamic concepts from HN/arXiv/RSS. Deduped, sorted by blended score (freshness 55% + confidence 45%), top 16 selected.

2. **Stricter Concept Matching**: fitScore threshold >= 70 (vs 50 in V2). Fallback injection if < 3 matches.

3. **Multi-Objective Validation**:
   - companyRelevance (30%)
   - trendFreshness (25%)
   - productTrendIntegration (20%)
   - audienceRelevance (15%)
   - developerActionability (10%)

4. **Extra idea fields**: `trendEvidence`, `productTrendIntegration`, `trendFreshnessScore`, `sourceConceptType`

5. **Debug traces**: Full stage-by-stage debug object saved to Firestore, viewable via "V3 Debug" button.

### BlogIdeaV3 (extends BlogIdeaV2)
```typescript
{
  ...BlogIdeaV2,
  trendEvidence: string;
  productTrendIntegration: string;
  trendFreshnessScore: number;  // 0-100
  sourceConceptType: 'curated' | 'dynamic';
}
```

---

## AI Concepts System

**Service**: `functions/src/services/aiConcepts/`
**Cloud Functions**: `refreshAIConceptsCloud`, `getAIConceptsStatusCloud`
**File**: `functions/src/offerAnalysis/v2/aiConceptsFunctions.ts`

### Sources
- **HackerNews**: Top stories API
- **arXiv**: AI papers API
- **The Rundown AI**: RSS feed
- **Import AI**: RSS feed

### Caching Strategy (Never-Expire)
1. Check Firestore cache (`aiConceptCache/latest`)
2. Fresh (< 24h) -> return cached ($0)
3. Stale/missing -> try fresh fetch
4. Fresh fetch succeeds -> update cache, return fresh
5. Fresh fetch fails -> **return stale cache (any age)** with warning
6. Only fail if literally no cache exists

**Key rule**: Stale concepts > no concepts. Cache never fully expires.

### Concept Structure (`AIConcept`)
```typescript
{
  name: string;
  description: string;
  whyHot: string;
  useCases: string[];
  keywords: string[];
  category: 'paradigm' | 'technique' | 'protocol' | 'architecture' | 'tool';
  hypeLevel: 'emerging' | 'peak' | 'maturing' | 'declining';
}
```

### Cache Document (`aiConceptCache/latest`)
```typescript
{
  concepts: AIConcept[];
  extractedAt: Date;
  expiresAt: Date;
  rawSignalCount: number;
  sources: string[];
}
```

### LLM Extraction
- Uses **gpt-4o-mini** to extract 10-15 trending concepts from ~50 raw signals
- Cost: ~$0.01-0.02 per extraction (usually $0 from cache)
- Focus: 80% Agentic AI + 20% other AI trends

---

## Frontend Orchestration

**File**: `agency-app/src/components/features/companies/OfferIdeasSection.tsx`

### State Management

```typescript
type OverallState = 'empty' | 'analyzing' | 'running' | 'complete';
type VersionStatus = 'idle' | 'generating' | 'complete' | 'error';

// Each version tracked independently
const [v1Status, setV1Status] = useState<VersionStatus>('idle');
const [v2Status, setV2Status] = useState<VersionStatus>('idle');
const [v3Status, setV3Status] = useState<VersionStatus>('idle');
```

### Independent Pipeline Execution

```typescript
const [v1Settled, v2Settled, v3Settled] = await Promise.allSettled([
  runV1Pipeline(...),
  runV2Pipeline(...),
  runV3Pipeline(...),
]);
```

Each pipeline function:
- Sets its own `vXStatus` to `'generating'`
- Runs its cloud function(s)
- Updates `analysisResult` state (local mirror)
- Saves to Firestore immediately
- Sets status to `'complete'` or `'error'`
- Returns `{ count, cost }` for the Slack notification

### V2 Progressive Display

For V2, the frontend calls staged cloud functions individually:
```
v2Stage1Differentiators() -> v2Stage1_5ConceptMatching() + v2Stage2ContentGaps() [parallel]
    -> v2Stage3GenerateIdeas() -> v2Stage4ValidateIdeas()
```

Each stage updates `v2StageResults` state, which drives `V2StageProgressDisplay`.

### Incremental Firestore Saves

Each version saves via dot-notation updates (non-destructive):
```typescript
// V1:
await updateDoc(companyRef, { 'offerAnalysis.ideas': ..., 'offerAnalysis.costInfo.stage2CostV1': ... });

// V2:
await updateDoc(companyRef, { 'offerAnalysis.v2': v2Data, 'offerAnalysis.costInfo.stage2CostV2': ... });

// V3:
await updateDoc(companyRef, { 'offerAnalysis.v3': v3Data, 'offerAnalysis.costInfo.stage2CostV3': ... });
```

### State Restoration from Firestore

`onSnapshot` listener restores per-version status on page load:
```typescript
if (!isRunningRef.current && offerAnalysis) {
  if (offerAnalysis.ideas?.length > 0) setV1Status('complete');
  if (offerAnalysis.v2?.ideas?.length > 0) setV2Status('complete');
  if (offerAnalysis.v3?.ideas?.length > 0) setV3Status('complete');
}
```

The `isRunningRef` prevents onSnapshot from overwriting in-progress local state.

---

## UI Components

### BlogIdeasDisplayTriple

**File**: `agency-app/src/components/features/companies/BlogIdeasDisplay.tsx`

Three tabs (V1 / V2 / V3), each with independent status:
- **idle**: "Not started"
- **generating**: Spinner. For V2, shows `V2StageProgressDisplay` inline.
- **complete**: Idea cards with Choose/Unchoose buttons
- **error**: Error message

**Tab order**: V1 (leftmost) -> V2 -> V3
**Default tab**: V1
**Auto-switch**: Switches to first completed tab (V1 > V2 > V3 priority). Disabled once user manually switches.

**Cost display**:
- Total cost shown above tabs
- Per-version cost shown at bottom-right of each tab

### V2StageProgressDisplay

**File**: `agency-app/src/components/features/companies/V2StageProgressDisplay.tsx`

Shows real-time progress through V2 stages with expandable details for each completed stage.

### V2IdeaCard

Renders a single V2 idea with validation scores, AI concept badge, and Choose button.

---

## Bulk Operations

### BulkOfferAnalysisDialog

**File**: `agency-app/src/components/features/companies/BulkOfferAnalysisDialog.tsx`

- Processes companies **sequentially** (one at a time)
- For each: Stage 0, then V1+V2+V3 in parallel
- Progress table with real-time status per company
- V1 must succeed for "success"; V2/V3 can fail silently
- Total cost shown at bottom
- V3 debug button per company
- Cancel button for graceful stop

### CompaniesPage Inline Handler

**File**: `agency-app/src/pages/companies/CompaniesPage.tsx` -> `handleBulkGenerateOffers()`

Same V1+V2+V3 parallel pattern but without the dialog UI. Used for quick bulk operations from the table toolbar.

---

## Slack Notifications

**Cloud Function**: `sendOfferSlackNotificationCloud`
**File**: `functions/src/notifications/sendOfferSlackNotification.ts`
**Frontend wrapper**: `cloudFunctions.ts` -> `sendOfferSlackNotification()`

**Trigger**: Called from frontend ONLY after ALL three pipelines complete (after `Promise.allSettled`).

**Message format**:
```
New offers generated for *{companyName}*
- V1: {count} ideas
- V2: {count} ideas
- V3: {count} ideas
Total cost: ${totalCost}
CEO approval required.
```

**Error handling**: Non-blocking. If Slack fails, a warning is logged but the operation succeeds.

---

## Choosing Ideas

### Flow
1. User clicks "Choose This" on any idea card (V1, V2, or V3)
2. Handler: `handleChooseIdea(ideaTitle, sourceVersion)`
3. Firestore update:
   ```typescript
   'customFields.chosen_idea': ideaTitle,
   'customFields.chosen_idea_version': 'v1' | 'v2' | 'v3',
   pendingOfferApproval: false,
   ```
4. UI highlights chosen card with green border + CHOSEN badge

### Clear Choice
- Clears both fields, resets `pendingOfferApproval: true` (if ideas exist)

### Downstream Usage
- `chosen_idea` and `chosen_idea_version` are stored as custom fields on the company entity
- Used by CEO approval workflow and task assignment

---

## Cost Tracking

### Per-Version Costs

| Component | Model | Typical Cost |
|-----------|-------|-------------|
| Stage 0 (shared) | gpt-4-turbo | $0.02-0.04 |
| V1 | gpt-4-turbo | $0.03-0.06 |
| V2 Stage 1 | gpt-4-turbo | $0.02-0.04 |
| V2 Stage 1.5 | gpt-4-turbo | $0.01-0.03 |
| V2 Stage 2 | gpt-4-turbo | $0.02-0.04 |
| V2 Stage 3 | gpt-4-turbo | $0.03-0.06 |
| V2 Stage 4 | gpt-4-turbo | $0.005-0.01 |
| V3 (all stages) | gpt-4-turbo + gpt-4o-mini | $0.12-0.25 |
| AI Concepts extraction | gpt-4o-mini | $0.01-0.02 (usually $0 cached) |

### Total Cost Calculation
```
totalCost = stage1Cost + stage2CostV1 + v2.costInfo.totalCost + v3.costInfo.totalCost
```

### Display
- **Above tabs**: Total generation cost
- **Per tab**: Individual version cost at bottom-right

---

## Firestore Schema

### Primary Document: `entities/{companyId}`

```
offerAnalysis:
  companyAnalysis:          # Stage 0 output (shared)
    companyName, companyType, companySummary, ...

  ideas: BlogIdea[]         # V1 results
  promptUsed: 'genai' | 'non-genai'

  v2:                       # V2 results
    ideas: BlogIdeaV2[]
    validationResults: IdeaValidationResult[]
    companyProfile: CompanyProfile
    contentGaps: ContentGap[]
    matchedConcepts: MatchedConceptSimple[]
    costInfo: { stage1Cost, stage1_5Cost, stage2Cost, stage3Cost, stage4Cost, totalCost }

  v3:                       # V3 results
    ideas: BlogIdeaV3[]
    validationResults: V3IdeaValidationResult[]
    matchedConcepts, trendConceptsUsed, debug
    costInfo: { stage0Cost, stage1Cost, ..., totalCost }
    generatedAt, regenerationAttempts, rejectedCount

  costInfo:                 # Aggregated costs
    stage1Cost              # Stage 0 (shared)
    stage2CostV1            # V1 pipeline
    stage2CostV2            # V2 pipeline
    stage2CostV3            # V3 pipeline
    totalCost

  dualVersionGeneration: boolean    # V1+V2 both ran
  tripleVersionGeneration: boolean  # V3 also ran
  analyzedAt: Date

customFields:
  chosen_idea: string | null
  chosen_idea_version: 'v1' | 'v2' | 'v3' | null

pendingOfferApproval: boolean
pendingOfferApprovalAt: Date
```

### AI Concept Cache: `aiConceptCache/latest`
```
concepts: AIConcept[]
extractedAt: Date
expiresAt: Date
rawSignalCount: number
sources: string[]
```

---

## Key Files Reference

### Backend (Cloud Functions)

| File | Purpose |
|------|---------|
| `functions/src/offerAnalysis/analyzeCompanyWebsite.ts` | Stage 0: Company classification |
| `functions/src/offerAnalysis/generateOfferIdeas.ts` | V1: Template-based ideas **(FROZEN)** |
| `functions/src/offerAnalysis/v2/generateIdeasV2.ts` | V2: Monolithic orchestrator |
| `functions/src/offerAnalysis/v2/analyzeCompanyDifferentiators.ts` | V2 Stage 1 |
| `functions/src/offerAnalysis/v2/analyzeContentGaps.ts` | V2 Stage 2 |
| `functions/src/offerAnalysis/v2/promptsV2.ts` | V2 Stage 3 + buzzword blacklist |
| `functions/src/offerAnalysis/v2/validateIdeas.ts` | V2 Stage 4 |
| `functions/src/offerAnalysis/v2/stages/` | Individual stage cloud functions |
| `functions/src/offerAnalysis/v2/aiConceptsFunctions.ts` | AI concepts refresh/status |
| `functions/src/offerAnalysis/v3/generateIdeasV3.ts` | V3: Trend-fusion pipeline |
| `functions/src/services/aiConcepts/` | AI concept fetching, caching, extraction |
| `functions/src/notifications/sendOfferSlackNotification.ts` | Slack notification |
| `functions/src/index.ts` | All cloud function exports |

### Frontend

| File | Purpose |
|------|---------|
| `agency-app/src/components/features/companies/OfferIdeasSection.tsx` | Main orchestrator |
| `agency-app/src/components/features/companies/BlogIdeasDisplay.tsx` | Triple-tab display + idea cards |
| `agency-app/src/components/features/companies/V2StageProgressDisplay.tsx` | V2 progressive stage UI |
| `agency-app/src/components/features/companies/BulkOfferAnalysisDialog.tsx` | Bulk generation dialog |
| `agency-app/src/components/features/companies/CompanyAnalysisResults.tsx` | Stage 0 results display |
| `agency-app/src/pages/companies/CompaniesPage.tsx` | Inline bulk handler |
| `agency-app/src/services/firebase/cloudFunctions.ts` | Frontend wrappers for all cloud functions |

### Types

| File | Purpose |
|------|---------|
| `agency-app/src/types/crm.ts` | Company type with `offerAnalysis` schema |
| `agency-app/src/services/firebase/cloudFunctions.ts` | `BlogIdeaV2`, `BlogIdeaV3`, `IdeaValidationResult`, `CompanyProfileV2`, etc. |
| `agency-app/src/components/features/companies/BlogIdeasDisplay.tsx` | `VersionStatus`, `V2StageResultsForDisplay`, `BlogIdeasDisplayTripleProps` |
