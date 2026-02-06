/**
 * V3 Offer Idea Generation - Trend-Relevance Fusion Pipeline
 *
 * V3 is independent from V1 and V2. It combines:
 * 1) Company relevance (differentiators + gaps)
 * 2) Trend relevance (curated + dynamic concept pool)
 * 3) Multi-objective validation (company fit + trend freshness + developer actionability)
 * 4) Persistent stage debug traces for post-run inspection
 */

import * as functions from "firebase-functions";
import OpenAI from "openai";
import {
  calculateCost,
  CostInfo,
  extractTokenUsage,
  logApiCost,
} from "../../utils/costTracker";
import {AIConcept, getAIConcepts} from "../../services/aiConcepts";

type CompanyType =
  | "Generative AI"
  | "AI tool"
  | "Data science"
  | "Service provider"
  | "Content maker";

interface ApolloDataInput {
  industry?: string | null;
  industries?: string[];
  employeeCount?: number | null;
  employeeRange?: string | null;
  foundedYear?: number | null;
  totalFunding?: number | null;
  totalFundingFormatted?: string | null;
  latestFundingStage?: string | null;
  technologies?: string[];
  keywords?: string[];
  description?: string | null;
}

interface BlogAnalysisInput {
  isTechnical?: boolean;
  hasCodeExamples?: boolean;
  hasDiagrams?: boolean;
  isDeveloperB2BSaas?: boolean;
  monthlyFrequency?: number;
  contentSummary?: string;
  rating?: "low" | "medium" | "high";
}

export interface GenerateIdeasV3Request {
  companyId: string;
  companyName: string;
  website: string;
  apolloData?: ApolloDataInput;
  blogAnalysis?: BlogAnalysisInput;
  companyType?: CompanyType;
  specificRequirements?: string;
}

export interface V3Differentiator {
  claim: string;
  evidence: string;
  category:
    | "market_niche"
    | "technical_approach"
    | "business_model"
    | "customer_segment"
    | "product_feature";
  uniquenessScore: number;
}

export interface V3CompanyProfile {
  companyName: string;
  oneLinerDescription: string;
  companyType: string;
  techStack: string[];
  uniqueDifferentiators: V3Differentiator[];
  targetAudience: {
    primary: string;
    secondary: string;
    sophisticationLevel: "beginner" | "intermediate" | "advanced";
    jobTitles: string[];
    industries: string[];
  };
  contentStyle: {
    tone: string;
    technicalDepth: "low" | "medium" | "high";
    formatPreferences: string[];
    topicsTheyLike: string[];
    topicsToAvoid: string[];
  };
}

export interface V3ContentGap {
  topic: string;
  gapType: "tech_stack" | "audience" | "differentiation" | "funnel" | "trending";
  whyItMatters: string;
  suggestedAngle: string;
  priorityScore: number;
}

export interface V3TrendConcept extends AIConcept {
  sourceType: "curated" | "dynamic";
  freshnessScore: number;
  evidenceCount: number;
  confidenceScore: number;
}

export interface V3MatchedConcept {
  concept: V3TrendConcept;
  fitScore: number;
  fitReason: string;
  productIntegration: string;
  tutorialAngle: string;
  fromFallback: boolean;
}

export interface BlogIdeaV3 {
  title: string;
  whyOnlyTheyCanWriteThis: string;
  specificEvidence: string;
  targetGap: string;
  audienceFit: string;
  whatReaderLearns: string[];
  keyStackTools: string[];
  angleToAvoidDuplication: string;
  differentiatorUsed?: string;
  contentGapFilled?: string;
  probability?: number;
  aiConcept?: string;
  isConceptTutorial?: boolean;
  conceptFitScore?: number;
  trendEvidence: string;
  productTrendIntegration: string;
  trendFreshnessScore: number;
  sourceConceptType?: "curated" | "dynamic";
}

export interface V3ValidationScores {
  companyRelevance: number;
  trendFreshness: number;
  productTrendIntegration: number;
  audienceRelevance: number;
  developerActionability: number;
  overallScore: number;
}

export interface V3IdeaValidationResult {
  idea: BlogIdeaV3;
  isValid: boolean;
  scores: V3ValidationScores;
  rejectionReason?: string;
  improvementSuggestion?: string;
}

interface V3Stage3AttemptDebug {
  attempt: number;
  generatedCount: number;
  conceptTutorialCount: number;
  cost: number;
  rejectionSummaryUsed?: string;
}

interface V3Stage4AttemptDebug {
  attempt: number;
  validCount: number;
  rejectedCount: number;
  cost: number;
  topRejectionReasons: string[];
}

export interface GenerateIdeasV3Response {
  success: boolean;
  version: "v3";
  ideas: BlogIdeaV3[];
  validationResults: V3IdeaValidationResult[];
  companyProfile: V3CompanyProfile;
  contentGaps: V3ContentGap[];
  matchedConcepts: V3MatchedConcept[];
  trendConceptsUsed: V3TrendConcept[];
  debug: {
    stage0: {
      cached: boolean;
      dynamicExtractionFailed: boolean;
      curatedCount: number;
      dynamicCount: number;
      mergedCount: number;
      selectedForMatching: number;
    };
    stage1: {
      differentiatorsFound: number;
      techStackCount: number;
    };
    stage1_5: {
      rankedCandidates: number;
      matchedCount: number;
      fallbackUsed: boolean;
      fallbackInjectedCount: number;
      rejectedSample: string[];
    };
    stage2: {
      gapsFound: number;
      topGapTopics: string[];
    };
    stage3Attempts: V3Stage3AttemptDebug[];
    stage4Attempts: V3Stage4AttemptDebug[];
    degradedMode: boolean;
  };
  costInfo: {
    stage0Cost: number;
    stage1Cost: number;
    stage1_5Cost: number;
    stage2Cost: number;
    stage3Cost: number;
    stage4Cost: number;
    totalCost: number;
  };
  generatedAt: string;
  regenerationAttempts: number;
  rejectedCount: number;
}

const MODEL_STAGE_MAIN = "gpt-4-turbo";
const MODEL_STAGE_VALIDATE = "gpt-4o-mini";
const CONCEPT_MATCH_MIN = 3;
const TREND_IDEA_MIN = 3;

const CURATED_TREND_CONCEPTS: Array<Omit<AIConcept, "id" | "lastUpdated">> = [
  {
    name: "Agentic AI",
    description: "Autonomous or semi-autonomous agents that plan and execute multi-step work.",
    whyHot: "Teams are moving from single prompts to multi-step AI workflows with tool execution.",
    useCases: [
      "Autonomous ops workflows",
      "Lead qualification assistants",
      "Data pipeline orchestration",
    ],
    keywords: ["agentic", "agents", "workflow", "orchestration", "tools"],
    category: "paradigm",
    hypeLevel: "peak",
  },
  {
    name: "Model Context Protocol (MCP)",
    description: "A standardized protocol for exposing tools and context to AI systems.",
    whyHot: "MCP is becoming the practical interoperability layer for tool-enabled AI apps.",
    useCases: [
      "Tool access for agents",
      "Enterprise data context access",
      "Multi-tool orchestration",
    ],
    keywords: ["mcp", "protocol", "tools", "context", "interoperability"],
    category: "protocol",
    hypeLevel: "peak",
  },
  {
    name: "A2A Agent Interoperability",
    description: "Patterns and protocols for communication between specialized AI agents.",
    whyHot: "Production systems increasingly require teams of agents with clear handoffs.",
    useCases: [
      "Agent handoffs",
      "Task specialization networks",
      "Multi-agent enterprise flows",
    ],
    keywords: ["a2a", "agents", "interoperability", "coordination"],
    category: "protocol",
    hypeLevel: "emerging",
  },
  {
    name: "Long Context Optimization",
    description: "Techniques for using very large context windows efficiently and reliably.",
    whyHot: "New models support larger windows, but teams need practical memory strategies.",
    useCases: [
      "Knowledge-heavy copilots",
      "Large document QA",
      "Persistent workspace memory",
    ],
    keywords: ["long context", "memory", "chunking", "retrieval"],
    category: "technique",
    hypeLevel: "peak",
  },
  {
    name: "Inference-Time Compute",
    description: "Dynamic compute allocation at inference to improve quality and cost efficiency.",
    whyHot: "Teams are balancing latency, cost, and reasoning depth in production AI.",
    useCases: [
      "Dynamic routing",
      "Cost-aware generation",
      "Latency optimization",
    ],
    keywords: ["inference", "routing", "latency", "optimization"],
    category: "technique",
    hypeLevel: "maturing",
  },
  {
    name: "Edge and On-Device LLMs",
    description: "Running LLM-powered workloads on client devices for speed and privacy.",
    whyHot: "Enterprises increasingly need lower latency and tighter privacy boundaries.",
    useCases: [
      "Mobile AI assistants",
      "Privacy-sensitive AI",
      "Offline model inference",
    ],
    keywords: ["edge", "on-device", "tinyllm", "privacy", "latency"],
    category: "architecture",
    hypeLevel: "emerging",
  },
  {
    name: "GPT-5 Transition Patterns",
    description: "Migration and architecture decisions when moving from older GPT stacks to GPT-5 workflows.",
    whyHot: "Teams need practical migration playbooks, evals, and reliability guardrails.",
    useCases: [
      "Model migration",
      "Evaluation pipelines",
      "Reliability rollouts",
    ],
    keywords: ["gpt-5", "migration", "evals", "reliability"],
    category: "tool",
    hypeLevel: "peak",
  },
  {
    name: "Claude 4.1 Production Guardrails",
    description: "Operational design patterns for safer, more controllable assistant behavior in production.",
    whyHot: "Quality teams need tighter control and observability for enterprise usage.",
    useCases: [
      "Safety guardrails",
      "Prompt policy enforcement",
      "Enterprise assistant governance",
    ],
    keywords: ["claude", "guardrails", "safety", "governance"],
    category: "tool",
    hypeLevel: "peak",
  },
];

function emptyCost(model: string): CostInfo {
  return {
    totalCost: 0,
    inputCost: 0,
    outputCost: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    model,
  };
}

function cleanJsonResponse(content: string): string {
  return content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

function normalizeConceptName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function hypeToFreshness(hype: AIConcept["hypeLevel"]): number {
  switch (hype) {
  case "peak":
    return 90;
  case "emerging":
    return 85;
  case "maturing":
    return 70;
  case "declining":
    return 45;
  default:
    return 60;
  }
}

function makeCuratedConcepts(): V3TrendConcept[] {
  const now = Date.now();
  return CURATED_TREND_CONCEPTS.map((c, idx) => ({
    ...c,
    id: `v3_curated_${idx}_${now}`,
    lastUpdated: new Date(now),
    sourceType: "curated",
    freshnessScore: hypeToFreshness(c.hypeLevel),
    confidenceScore: 88,
    evidenceCount: 3,
  }));
}

function toV3DynamicConcepts(concepts: AIConcept[]): V3TrendConcept[] {
  return concepts.map((c) => ({
    ...c,
    sourceType: "dynamic",
    freshnessScore: hypeToFreshness(c.hypeLevel),
    confidenceScore: 72,
    evidenceCount: 1,
  }));
}

function dedupeConcepts(concepts: V3TrendConcept[]): V3TrendConcept[] {
  const map = new Map<string, V3TrendConcept>();
  for (const concept of concepts) {
    const key = normalizeConceptName(concept.name);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, concept);
      continue;
    }

    // Prefer dynamic concept if present; otherwise keep higher freshness/confidence.
    if (existing.sourceType === "curated" && concept.sourceType === "dynamic") {
      map.set(key, concept);
      continue;
    }
    if (concept.freshnessScore + concept.confidenceScore > existing.freshnessScore + existing.confidenceScore) {
      map.set(key, concept);
    }
  }
  return Array.from(map.values());
}

async function buildTrendConceptPool(openai: OpenAI): Promise<{
  concepts: V3TrendConcept[];
  selectedForMatching: V3TrendConcept[];
  stage0Cost: number;
  cached: boolean;
  dynamicExtractionFailed: boolean;
  curatedCount: number;
  dynamicCount: number;
}> {
  const curated = makeCuratedConcepts();

  let dynamic: V3TrendConcept[] = [];
  let stage0Cost = 0;
  let cached = false;
  let dynamicExtractionFailed = false;

  try {
    const dynamicResult = await getAIConcepts(openai, 24);
    dynamic = toV3DynamicConcepts(dynamicResult.concepts);
    stage0Cost = dynamicResult.extractionCost;
    cached = dynamicResult.cached;
  } catch (error) {
    console.warn("[V3 Stage 0] Dynamic trend extraction failed. Falling back to curated only.", error);
    dynamicExtractionFailed = true;
  }

  const merged = dedupeConcepts([...curated, ...dynamic]).sort((a, b) => {
    const aScore = a.freshnessScore * 0.55 + a.confidenceScore * 0.45;
    const bScore = b.freshnessScore * 0.55 + b.confidenceScore * 0.45;
    return bScore - aScore;
  });

  return {
    concepts: merged,
    selectedForMatching: merged.slice(0, 16),
    stage0Cost,
    cached,
    dynamicExtractionFailed,
    curatedCount: curated.length,
    dynamicCount: dynamic.length,
  };
}

function buildProfilePrompt(
  request: GenerateIdeasV3Request
): string {
  const apollo = request.apolloData;
  const blog = request.blogAnalysis;

  const industry = apollo?.industry || apollo?.industries?.join(", ") || "Unknown";
  const techStack = apollo?.technologies?.join(", ") || "Unknown";
  const keywords = apollo?.keywords?.join(", ") || "Unknown";
  const companyDescription = apollo?.description || "No enriched description";
  const funding = apollo?.totalFundingFormatted || "Unknown";
  const fundingStage = apollo?.latestFundingStage || "Unknown";
  const teamSize = apollo?.employeeCount || apollo?.employeeRange || "Unknown";

  return `You are building a precise company profile for high-quality B2B content strategy.

COMPANY
- Name: ${request.companyName}
- Website: ${request.website}
- Type hint: ${request.companyType || "Unknown"}
- Industry: ${industry}
- Description: ${companyDescription}
- Funding: ${funding}
- Funding Stage: ${fundingStage}
- Team Size: ${teamSize}
- Tech Stack: ${techStack}
- Keywords: ${keywords}

BLOG SIGNALS
- Technical content: ${blog?.isTechnical ? "yes" : "no"}
- Code examples: ${blog?.hasCodeExamples ? "yes" : "no"}
- Diagrams: ${blog?.hasDiagrams ? "yes" : "no"}
- Developer-focused: ${blog?.isDeveloperB2BSaas ? "yes" : "no"}
- Monthly frequency: ${blog?.monthlyFrequency ?? "unknown"}
- Content summary: ${blog?.contentSummary || "none"}
- Blog rating: ${blog?.rating || "unknown"}

Rules:
1) Return 3-5 differentiators with evidence, uniquenessScore >= 60.
2) Avoid generic claims.
3) Keep audience and content style grounded in provided data.

Return JSON:
{
  "companyName": "${request.companyName}",
  "oneLinerDescription": "max 15 words",
  "companyType": "string",
  "techStack": ["..."],
  "uniqueDifferentiators": [
    {
      "claim": "string",
      "evidence": "string",
      "category": "market_niche | technical_approach | business_model | customer_segment | product_feature",
      "uniquenessScore": 75
    }
  ],
  "targetAudience": {
    "primary": "string",
    "secondary": "string",
    "sophisticationLevel": "beginner | intermediate | advanced",
    "jobTitles": ["..."],
    "industries": ["..."]
  },
  "contentStyle": {
    "tone": "string",
    "technicalDepth": "low | medium | high",
    "formatPreferences": ["..."],
    "topicsTheyLike": ["..."],
    "topicsToAvoid": ["..."]
  }
}`;
}

function sanitizeProfile(
  raw: any,
  request: GenerateIdeasV3Request
): V3CompanyProfile {
  return {
    companyName: raw?.companyName || request.companyName,
    oneLinerDescription: raw?.oneLinerDescription || `${request.companyName} provides B2B solutions.`,
    companyType: raw?.companyType || request.companyType || "Unknown",
    techStack: Array.isArray(raw?.techStack) && raw.techStack.length > 0 ?
      raw.techStack : (request.apolloData?.technologies || []),
    uniqueDifferentiators: Array.isArray(raw?.uniqueDifferentiators) ?
      raw.uniqueDifferentiators.slice(0, 5).map((d: any) => ({
        claim: d?.claim || "Company-specific capability",
        evidence: d?.evidence || "Derived from available company context",
        category: d?.category || "product_feature",
        uniquenessScore: typeof d?.uniquenessScore === "number" ? d.uniquenessScore : 65,
      })) :
      [],
    targetAudience: {
      primary: raw?.targetAudience?.primary || "Technical decision makers",
      secondary: raw?.targetAudience?.secondary || "Engineering managers",
      sophisticationLevel: raw?.targetAudience?.sophisticationLevel || "intermediate",
      jobTitles: Array.isArray(raw?.targetAudience?.jobTitles) ? raw.targetAudience.jobTitles : [],
      industries: Array.isArray(raw?.targetAudience?.industries) ? raw.targetAudience.industries : [],
    },
    contentStyle: {
      tone: raw?.contentStyle?.tone || "Technical and practical",
      technicalDepth: raw?.contentStyle?.technicalDepth || "medium",
      formatPreferences: Array.isArray(raw?.contentStyle?.formatPreferences) ?
        raw.contentStyle.formatPreferences : ["Tutorials", "Implementation guides"],
      topicsTheyLike: Array.isArray(raw?.contentStyle?.topicsTheyLike) ?
        raw.contentStyle.topicsTheyLike : [],
      topicsToAvoid: Array.isArray(raw?.contentStyle?.topicsToAvoid) ?
        raw.contentStyle.topicsToAvoid : [],
    },
  };
}

async function analyzeCompanyProfileV3(
  openai: OpenAI,
  request: GenerateIdeasV3Request
): Promise<{ profile: V3CompanyProfile; costInfo: CostInfo }> {
  const prompt = buildProfilePrompt(request);
  const completion = await openai.chat.completions.create({
    model: MODEL_STAGE_MAIN,
    response_format: {type: "json_object"},
    temperature: 0.3,
    max_tokens: 2500,
    messages: [
      {
        role: "system",
        content:
          "You are a strict B2B company analyst focused on specific differentiators and audience fit.",
      },
      {role: "user", content: prompt},
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("V3 stage 1 returned empty content");
  }

  const parsed = JSON.parse(cleanJsonResponse(content));
  const profile = sanitizeProfile(parsed, request);
  const tokens = extractTokenUsage(completion);
  const costInfo = tokens ? calculateCost(tokens, MODEL_STAGE_MAIN) : emptyCost(MODEL_STAGE_MAIN);

  return {profile, costInfo};
}

function buildConceptMatchPrompt(
  profile: V3CompanyProfile,
  concepts: V3TrendConcept[]
): string {
  const conceptsText = concepts
    .map((c, i) => `${i + 1}. ${c.name} [${c.sourceType}, freshness=${c.freshnessScore}]
Description: ${c.description}
Why hot: ${c.whyHot}
Keywords: ${c.keywords.join(", ")}`)
    .join("\n\n");

  const differentiators = profile.uniqueDifferentiators
    .map((d) => `- ${d.claim} (evidence: ${d.evidence})`)
    .join("\n");

  return `You are matching current AI trend concepts to a specific company.

COMPANY
- Name: ${profile.companyName}
- What they do: ${profile.oneLinerDescription}
- Company type: ${profile.companyType}
- Tech stack: ${profile.techStack.join(", ") || "Unknown"}
- Audience: ${profile.targetAudience.primary}
- Technical depth: ${profile.contentStyle.technicalDepth}

DIFFERENTIATORS
${differentiators || "- none provided"}

CONCEPTS
${conceptsText}

Output JSON:
{
  "matches": [
    {
      "conceptName": "string",
      "fitScore": 0-100,
      "fitReason": "1-2 sentences",
      "productIntegration": "How their product integrates",
      "tutorialAngle": "How to ... with [company] using [concept]",
      "include": true | false,
      "rejectionReason": "string or null"
    }
  ]
}

Rules:
1) Keep strict scoring.
2) Usually include 2-5 concepts.
3) Only include if the concept can produce practical dev-focused tutorials.`;
}

function conceptKeywordOverlap(concept: V3TrendConcept, profile: V3CompanyProfile): number {
  const profileTerms = new Set([
    profile.companyType.toLowerCase(),
    profile.oneLinerDescription.toLowerCase(),
    ...profile.techStack.map((t) => t.toLowerCase()),
    ...profile.uniqueDifferentiators.flatMap((d) => d.claim.toLowerCase().split(/\s+/)),
  ]);

  let overlap = 0;
  for (const keyword of concept.keywords) {
    const normalized = keyword.toLowerCase();
    for (const term of profileTerms) {
      if (term.includes(normalized) || normalized.includes(term)) {
        overlap++;
        break;
      }
    }
  }
  return overlap;
}

async function matchTrendConceptsV3(
  openai: OpenAI,
  profile: V3CompanyProfile,
  concepts: V3TrendConcept[]
): Promise<{
  matchedConcepts: V3MatchedConcept[];
  rankedCandidates: V3MatchedConcept[];
  fallbackUsed: boolean;
  fallbackInjectedCount: number;
  rejectedSample: string[];
  costInfo: CostInfo;
}> {
  const prompt = buildConceptMatchPrompt(profile, concepts);
  const completion = await openai.chat.completions.create({
    model: MODEL_STAGE_MAIN,
    response_format: {type: "json_object"},
    temperature: 0.3,
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content:
          "You are a strict trend-company matcher. Prioritize practical, product-integrated relevance.",
      },
      {role: "user", content: prompt},
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("V3 stage 1.5 returned empty content");
  }

  const raw = JSON.parse(cleanJsonResponse(content));
  const rawMatches = Array.isArray(raw?.matches) ? raw.matches : [];
  const byName = new Map<string, V3TrendConcept>();
  for (const concept of concepts) {
    byName.set(normalizeConceptName(concept.name), concept);
  }

  const rankedCandidates: V3MatchedConcept[] = rawMatches
    .map((m: any) => {
      const concept = byName.get(normalizeConceptName(m?.conceptName || ""));
      if (!concept) return null;
      return {
        concept,
        fitScore: typeof m?.fitScore === "number" ? m.fitScore : 0,
        fitReason: m?.fitReason || "Matched by trend-company relevance analysis",
        productIntegration: m?.productIntegration || `Integrate ${concept.name} with ${profile.companyName} workflows`,
        tutorialAngle: m?.tutorialAngle || `How to use ${profile.companyName} with ${concept.name}`,
        fromFallback: false,
      };
    })
    .filter((m: V3MatchedConcept | null): m is V3MatchedConcept => m !== null)
    .sort((a: V3MatchedConcept, b: V3MatchedConcept) => b.fitScore - a.fitScore);

  const selected = rankedCandidates.filter((c) => c.fitScore >= 70).slice(0, 5);
  let fallbackUsed = false;
  let fallbackInjectedCount = 0;

  if (selected.length < CONCEPT_MATCH_MIN) {
    fallbackUsed = true;
    const existing = new Set(selected.map((c) => normalizeConceptName(c.concept.name)));
    const fallbackCandidates = concepts
      .filter((c) => !existing.has(normalizeConceptName(c.name)))
      .map((c) => ({
        concept: c,
        overlap: conceptKeywordOverlap(c, profile),
        blended: conceptKeywordOverlap(c, profile) * 12 + c.freshnessScore * 0.5 + c.confidenceScore * 0.2,
      }))
      .sort((a, b) => b.blended - a.blended);

    const needed = CONCEPT_MATCH_MIN - selected.length;
    const injected = fallbackCandidates.slice(0, needed).map((entry) => ({
      concept: entry.concept,
      fitScore: Math.min(79, 62 + entry.overlap * 6),
      fitReason: "Fallback concept injected to preserve trend coverage when strict matching is sparse.",
      productIntegration: `Show a practical ${entry.concept.name} implementation using ${profile.companyName} capabilities`,
      tutorialAngle: `How to implement ${entry.concept.name} with ${profile.companyName}`,
      fromFallback: true,
    }));

    selected.push(...injected);
    fallbackInjectedCount = injected.length;
  }

  selected.sort((a, b) => b.fitScore - a.fitScore);

  const tokens = extractTokenUsage(completion);
  const costInfo = tokens ? calculateCost(tokens, MODEL_STAGE_MAIN) : emptyCost(MODEL_STAGE_MAIN);

  return {
    matchedConcepts: selected.slice(0, 6),
    rankedCandidates: rankedCandidates.slice(0, 10),
    fallbackUsed,
    fallbackInjectedCount,
    rejectedSample: rawMatches
      .filter((m: any) => typeof m?.rejectionReason === "string" && m.rejectionReason.length > 0)
      .slice(0, 4)
      .map((m: any) => `${m?.conceptName}: ${m?.rejectionReason}`),
    costInfo,
  };
}

function buildGapPrompt(
  profile: V3CompanyProfile,
  blogContentSummary: string | undefined,
  matchedConcepts: V3MatchedConcept[]
): string {
  const differentiators = profile.uniqueDifferentiators
    .map((d, idx) => `${idx + 1}. ${d.claim} (evidence: ${d.evidence})`)
    .join("\n");

  const conceptNames = matchedConcepts.map((m) => m.concept.name).join(", ");

  return `Identify high-value blog content gaps for ${profile.companyName}.

COMPANY
- What they do: ${profile.oneLinerDescription}
- Type: ${profile.companyType}
- Audience: ${profile.targetAudience.primary}
- Tech stack: ${profile.techStack.join(", ") || "Unknown"}
- Style depth: ${profile.contentStyle.technicalDepth}

DIFFERENTIATORS
${differentiators || "- none provided"}

MATCHED TREND CONCEPTS
${conceptNames || "none"}

CURRENT BLOG THEMES
${blogContentSummary || "No blog content summary provided"}

Return JSON:
{
  "gaps": [
    {
      "topic": "string",
      "gapType": "tech_stack | audience | differentiation | funnel | trending",
      "whyItMatters": "string",
      "suggestedAngle": "string",
      "priorityScore": 0-100
    }
  ]
}

Rules:
1) Return 5-8 gaps.
2) Include at least 2 gaps that naturally combine company product + matched trends.
3) Keep topics specific and developer-actionable.`;
}

async function analyzeContentGapsV3(
  openai: OpenAI,
  profile: V3CompanyProfile,
  blogContentSummary: string | undefined,
  matchedConcepts: V3MatchedConcept[]
): Promise<{ gaps: V3ContentGap[]; costInfo: CostInfo }> {
  const prompt = buildGapPrompt(profile, blogContentSummary, matchedConcepts);
  const completion = await openai.chat.completions.create({
    model: MODEL_STAGE_MAIN,
    response_format: {type: "json_object"},
    temperature: 0.45,
    max_tokens: 2200,
    messages: [
      {
        role: "system",
        content:
          "You are a B2B content strategist that finds specific content gaps with business impact.",
      },
      {role: "user", content: prompt},
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("V3 stage 2 returned empty content");
  }

  const parsed = JSON.parse(cleanJsonResponse(content));
  const rawGaps = Array.isArray(parsed?.gaps) ? parsed.gaps : [];
  const gaps: V3ContentGap[] = rawGaps
    .map((g: any) => ({
      topic: g?.topic || "Product-integrated AI tutorial topic",
      gapType: g?.gapType || "differentiation",
      whyItMatters: g?.whyItMatters || "This topic aligns with audience needs and market trends.",
      suggestedAngle: g?.suggestedAngle || "Practical implementation using the company product.",
      priorityScore: typeof g?.priorityScore === "number" ? g.priorityScore : 65,
    }))
    .filter((g: V3ContentGap) => g.priorityScore >= 55)
    .slice(0, 8);

  const tokens = extractTokenUsage(completion);
  const costInfo = tokens ? calculateCost(tokens, MODEL_STAGE_MAIN) : emptyCost(MODEL_STAGE_MAIN);

  return {gaps, costInfo};
}

function buildIdeaGenerationPrompt(
  profile: V3CompanyProfile,
  gaps: V3ContentGap[],
  matchedConcepts: V3MatchedConcept[],
  specificRequirements?: string,
  attempt: number = 1,
  rejectionSummary?: string
): string {
  const differentiators = profile.uniqueDifferentiators
    .map((d, i) => `${i + 1}. ${d.claim} (evidence: ${d.evidence})`)
    .join("\n");

  const gapText = gaps
    .slice(0, 6)
    .map((g, i) => `${i + 1}. ${g.topic} [${g.gapType}] - ${g.suggestedAngle}`)
    .join("\n");

  const conceptText = matchedConcepts
    .map(
      (m, i) =>
        `${i + 1}. ${m.concept.name} [${m.concept.sourceType}] (fit: ${m.fitScore}, freshness: ${m.concept.freshnessScore})
Why hot: ${m.concept.whyHot}
Product integration: ${m.productIntegration}
Tutorial angle: ${m.tutorialAngle}`
    )
    .join("\n\n");

  return `Generate 5 HIGH-QUALITY blog ideas for ${profile.companyName}.

COMPANY CONTEXT
- What they do: ${profile.oneLinerDescription}
- Audience: ${profile.targetAudience.primary}
- Technical depth: ${profile.contentStyle.technicalDepth}
- Tech stack: ${profile.techStack.join(", ") || "Unknown"}

DIFFERENTIATORS
${differentiators || "- none provided"}

CONTENT GAPS
${gapText || "- none provided"}

MATCHED TREND CONCEPTS (use these)
${conceptText || "- none provided"}

REQUIREMENTS
- EXACTLY 5 ideas.
- At least ${TREND_IDEA_MIN} ideas MUST be concept tutorials combining company product + one matched trend concept.
- Every idea must be practical for developers and executable by a single writer.
- Avoid generic marketing fluff and vague "AI is changing everything" style titles.
- Use specific product workflows and implementation outcomes.
${specificRequirements ? `- Specific requirements from user: ${specificRequirements}` : ""}
${rejectionSummary ? `- Fix these issues from previous attempt: ${rejectionSummary}` : ""}
${attempt > 1 ? "- This is a regeneration attempt. Increase specificity and practical depth." : ""}

OUTPUT JSON:
{
  "ideas": [
    {
      "title": "string",
      "whyOnlyTheyCanWriteThis": "string",
      "specificEvidence": "string",
      "targetGap": "string",
      "audienceFit": "string",
      "whatReaderLearns": ["string", "string", "string", "string"],
      "keyStackTools": ["string", "string"],
      "angleToAvoidDuplication": "string",
      "differentiatorUsed": "string",
      "contentGapFilled": "string",
      "probability": 0.0-1.0,
      "aiConcept": "string",
      "isConceptTutorial": true | false,
      "conceptFitScore": 0-100,
      "trendEvidence": "why this trend is current now",
      "productTrendIntegration": "specific implementation linkage",
      "trendFreshnessScore": 0-100,
      "sourceConceptType": "curated | dynamic"
    }
  ]
}`;
}

function sanitizeIdea(idea: any): BlogIdeaV3 {
  const learns = Array.isArray(idea?.whatReaderLearns) ? idea.whatReaderLearns.slice(0, 4) : [];
  const tools = Array.isArray(idea?.keyStackTools) ? idea.keyStackTools.slice(0, 6) : [];
  return {
    title: idea?.title || "Practical company-specific AI implementation guide",
    whyOnlyTheyCanWriteThis: idea?.whyOnlyTheyCanWriteThis || "This idea uses unique company capabilities.",
    specificEvidence: idea?.specificEvidence || "Derived from company differentiators and audience profile.",
    targetGap: idea?.targetGap || "differentiator showcase",
    audienceFit: idea?.audienceFit || "Matches technical audience needs.",
    whatReaderLearns: learns.length > 0 ? learns : ["Implementation steps", "Architecture decisions", "Operational guardrails", "Measurable outcomes"],
    keyStackTools: tools.length > 0 ? tools : ["Company product", "LLMs"],
    angleToAvoidDuplication: idea?.angleToAvoidDuplication || "Focus on concrete implementation details and measurable outcomes.",
    differentiatorUsed: idea?.differentiatorUsed,
    contentGapFilled: idea?.contentGapFilled,
    probability: typeof idea?.probability === "number" ? idea.probability : 0.7,
    aiConcept: idea?.aiConcept || undefined,
    isConceptTutorial: Boolean(idea?.isConceptTutorial),
    conceptFitScore: typeof idea?.conceptFitScore === "number" ? idea.conceptFitScore : undefined,
    trendEvidence: idea?.trendEvidence || "Current production adoption and tooling ecosystem momentum.",
    productTrendIntegration: idea?.productTrendIntegration || "Use company product directly in trend implementation.",
    trendFreshnessScore: typeof idea?.trendFreshnessScore === "number" ? idea.trendFreshnessScore : 70,
    sourceConceptType: idea?.sourceConceptType === "dynamic" ? "dynamic" : "curated",
  };
}

async function generateIdeasAttemptV3(
  openai: OpenAI,
  profile: V3CompanyProfile,
  gaps: V3ContentGap[],
  matchedConcepts: V3MatchedConcept[],
  specificRequirements: string | undefined,
  attempt: number,
  rejectionSummary?: string
): Promise<{ ideas: BlogIdeaV3[]; costInfo: CostInfo }> {
  const prompt = buildIdeaGenerationPrompt(
    profile,
    gaps,
    matchedConcepts,
    specificRequirements,
    attempt,
    rejectionSummary
  );

  const completion = await openai.chat.completions.create({
    model: MODEL_STAGE_MAIN,
    response_format: {type: "json_object"},
    temperature: 0.65,
    max_tokens: 3200,
    messages: [
      {
        role: "system",
        content:
          "You are an expert technical content strategist. Produce specific, current, implementation-focused ideas.",
      },
      {role: "user", content: prompt},
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("V3 stage 3 returned empty content");
  }

  const parsed = JSON.parse(cleanJsonResponse(content));
  const rawIdeas = Array.isArray(parsed?.ideas) ? parsed.ideas : [];
  const ideas = rawIdeas
    .map((idea: any) => sanitizeIdea(idea))
    .filter((idea: BlogIdeaV3) => !idea.probability || idea.probability >= 0.4)
    .slice(0, 5);

  const tokens = extractTokenUsage(completion);
  const costInfo = tokens ? calculateCost(tokens, MODEL_STAGE_MAIN) : emptyCost(MODEL_STAGE_MAIN);

  return {ideas, costInfo};
}

function buildValidationPrompt(
  profile: V3CompanyProfile,
  ideas: BlogIdeaV3[]
): string {
  const differentiators = profile.uniqueDifferentiators.map((d) => `- ${d.claim}`).join("\n");
  const list = ideas
    .map(
      (idea, index) => `
IDEA ${index + 1}
- Title: ${idea.title}
- Why unique: ${idea.whyOnlyTheyCanWriteThis}
- Target gap: ${idea.targetGap}
- AI concept: ${idea.aiConcept || "none"}
- Trend evidence: ${idea.trendEvidence}
- Product integration: ${idea.productTrendIntegration}
- Audience fit: ${idea.audienceFit}`
    )
    .join("\n");

  return `Evaluate each idea for both company relevance and trend relevance.

COMPANY
- Name: ${profile.companyName}
- What they do: ${profile.oneLinerDescription}
- Audience: ${profile.targetAudience.primary}
- Tech depth: ${profile.contentStyle.technicalDepth}

DIFFERENTIATORS
${differentiators || "- none provided"}

IDEAS
${list}

Output JSON:
{
  "evaluations": [
    {
      "ideaIndex": 1,
      "companyRelevance": 0-100,
      "trendFreshness": 0-100,
      "productTrendIntegration": 0-100,
      "audienceRelevance": 0-100,
      "developerActionability": 0-100,
      "verdict": "ACCEPT" | "REJECT",
      "rejectionReason": "string or null",
      "improvementSuggestion": "string or null"
    }
  ]
}

Scoring guidance:
- companyRelevance: specific to this company, not generic.
- trendFreshness: clearly tied to current AI shifts.
- productTrendIntegration: trend meaningfully uses company product.
- developerActionability: implementable steps for technical readers.
- audienceRelevance: depth and tone fit.

Be strict and practical.`;
}

async function validateIdeasV3(
  openai: OpenAI,
  profile: V3CompanyProfile,
  ideas: BlogIdeaV3[]
): Promise<{
  results: V3IdeaValidationResult[];
  validCount: number;
  rejectedCount: number;
  topRejectionReasons: string[];
  costInfo: CostInfo;
}> {
  if (ideas.length === 0) {
    return {
      results: [],
      validCount: 0,
      rejectedCount: 0,
      topRejectionReasons: [],
      costInfo: emptyCost(MODEL_STAGE_VALIDATE),
    };
  }

  const prompt = buildValidationPrompt(profile, ideas);
  const completion = await openai.chat.completions.create({
    model: MODEL_STAGE_VALIDATE,
    response_format: {type: "json_object"},
    temperature: 0.2,
    max_tokens: 2200,
    messages: [
      {
        role: "system",
        content:
          "You are a strict evaluator for technical B2B content quality and trend relevance. Return JSON only.",
      },
      {role: "user", content: prompt},
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("V3 stage 4 returned empty content");
  }

  const parsed = JSON.parse(cleanJsonResponse(content));
  const evaluations = Array.isArray(parsed?.evaluations) ? parsed.evaluations : [];

  const results: V3IdeaValidationResult[] = ideas.map((idea, index) => {
    const ev = evaluations.find((e: any) => Number(e?.ideaIndex) === index + 1) || {};
    const companyRelevance = typeof ev?.companyRelevance === "number" ? ev.companyRelevance : 45;
    const trendFreshness = typeof ev?.trendFreshness === "number" ? ev.trendFreshness : 45;
    const productTrendIntegration = typeof ev?.productTrendIntegration === "number" ? ev.productTrendIntegration : 45;
    const audienceRelevance = typeof ev?.audienceRelevance === "number" ? ev.audienceRelevance : 50;
    const developerActionability = typeof ev?.developerActionability === "number" ? ev.developerActionability : 50;

    const overallScore = Math.round(
      companyRelevance * 0.30 +
      trendFreshness * 0.25 +
      productTrendIntegration * 0.20 +
      audienceRelevance * 0.15 +
      developerActionability * 0.10
    );

    const isValid =
      ev?.verdict === "ACCEPT" &&
      overallScore >= 70 &&
      companyRelevance >= 70 &&
      trendFreshness >= 65 &&
      productTrendIntegration >= 65 &&
      developerActionability >= 60;

    return {
      idea,
      isValid,
      scores: {
        companyRelevance,
        trendFreshness,
        productTrendIntegration,
        audienceRelevance,
        developerActionability,
        overallScore,
      },
      rejectionReason: isValid ? undefined : ev?.rejectionReason || "Does not meet V3 quality thresholds",
      improvementSuggestion: isValid ? undefined : ev?.improvementSuggestion || "Increase trend specificity and product integration detail",
    };
  }).sort((a, b) => b.scores.overallScore - a.scores.overallScore);

  const validCount = results.filter((r) => r.isValid).length;
  const rejected = results.filter((r) => !r.isValid);
  const topRejectionReasons = rejected
    .map((r) => r.rejectionReason || "Rejected by validator")
    .slice(0, 3);

  const tokens = extractTokenUsage(completion);
  const costInfo = tokens ? calculateCost(tokens, MODEL_STAGE_VALIDATE) : emptyCost(MODEL_STAGE_VALIDATE);

  return {
    results,
    validCount,
    rejectedCount: rejected.length,
    topRejectionReasons,
    costInfo,
  };
}

function avgScore(results: V3IdeaValidationResult[]): number {
  if (results.length === 0) return 0;
  return results.reduce((sum, r) => sum + r.scores.overallScore, 0) / results.length;
}

export async function generateIdeasV3(
  openai: OpenAI,
  request: GenerateIdeasV3Request,
  _userId: string
): Promise<GenerateIdeasV3Response> {
  let stage0Cost = 0;
  let stage1Cost = 0;
  let stage1_5Cost = 0;
  let stage2Cost = 0;
  let stage3Cost = 0;
  let stage4Cost = 0;
  let regenerationAttempts = 0;

  // Stage 0: Trend concepts (hybrid: curated + dynamic)
  const trendPool = await buildTrendConceptPool(openai);
  stage0Cost += trendPool.stage0Cost;

  // Stage 1: Company profile
  const stage1 = await analyzeCompanyProfileV3(openai, request);
  const profile = stage1.profile;
  stage1Cost += stage1.costInfo.totalCost;

  // Stage 1.5: Match concepts
  const stage1_5 = await matchTrendConceptsV3(openai, profile, trendPool.selectedForMatching);
  const matchedConcepts = stage1_5.matchedConcepts;
  stage1_5Cost += stage1_5.costInfo.totalCost;

  // Stage 2: Content gaps
  const stage2 = await analyzeContentGapsV3(
    openai,
    profile,
    request.blogAnalysis?.contentSummary,
    matchedConcepts
  );
  const gaps = stage2.gaps;
  stage2Cost += stage2.costInfo.totalCost;

  // Stage 3 + 4: Generate and validate with one regeneration attempt if needed
  const stage3Attempts: V3Stage3AttemptDebug[] = [];
  const stage4Attempts: V3Stage4AttemptDebug[] = [];

  let rejectionSummary: string | undefined;
  const MAX_ATTEMPTS = 2;
  let bestResults: V3IdeaValidationResult[] = [];
  let bestIdeas: BlogIdeaV3[] = [];
  let bestValidCount = -1;
  let bestTrendTutorialCount = -1;
  let bestScore = -1;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    regenerationAttempts = attempt;
    const stage3 = await generateIdeasAttemptV3(
      openai,
      profile,
      gaps,
      matchedConcepts,
      request.specificRequirements,
      attempt,
      rejectionSummary
    );
    stage3Cost += stage3.costInfo.totalCost;

    const conceptTutorialCount = stage3.ideas.filter((i) => i.isConceptTutorial || i.aiConcept).length;
    stage3Attempts.push({
      attempt,
      generatedCount: stage3.ideas.length,
      conceptTutorialCount,
      cost: stage3.costInfo.totalCost,
      rejectionSummaryUsed: rejectionSummary,
    });

    const stage4 = await validateIdeasV3(openai, profile, stage3.ideas);
    stage4Cost += stage4.costInfo.totalCost;
    stage4Attempts.push({
      attempt,
      validCount: stage4.validCount,
      rejectedCount: stage4.rejectedCount,
      cost: stage4.costInfo.totalCost,
      topRejectionReasons: stage4.topRejectionReasons,
    });

    const runAvg = avgScore(stage4.results);
    const runComposite = stage4.validCount * 100 + conceptTutorialCount * 10 + runAvg;
    if (
      stage4.validCount > bestValidCount ||
      (stage4.validCount === bestValidCount && conceptTutorialCount > bestTrendTutorialCount) ||
      (stage4.validCount === bestValidCount && conceptTutorialCount === bestTrendTutorialCount && runComposite > bestScore)
    ) {
      bestValidCount = stage4.validCount;
      bestTrendTutorialCount = conceptTutorialCount;
      bestScore = runComposite;
      bestResults = stage4.results;
      bestIdeas = stage3.ideas;
    }

    const enoughValid = stage4.validCount >= 3;
    const enoughTrendCoverage = conceptTutorialCount >= TREND_IDEA_MIN;
    if (enoughValid && enoughTrendCoverage) {
      break;
    }

    rejectionSummary = stage4.topRejectionReasons.join(" | ");
  }

  const validSorted = bestResults.filter((r) => r.isValid);
  const rejectedCount = bestResults.filter((r) => !r.isValid).length;
  const degradedMode = validSorted.length < 3 || bestTrendTutorialCount < TREND_IDEA_MIN;

  let finalIdeas: BlogIdeaV3[];
  if (validSorted.length >= 3) {
    finalIdeas = validSorted.slice(0, 5).map((r) => r.idea);
  } else {
    finalIdeas = bestResults.slice(0, 5).map((r) => r.idea);
  }

  if (finalIdeas.length === 0) {
    finalIdeas = bestIdeas.slice(0, 5);
  }

  const totalCost = stage0Cost + stage1Cost + stage1_5Cost + stage2Cost + stage3Cost + stage4Cost;

  return {
    success: true,
    version: "v3",
    ideas: finalIdeas,
    validationResults: bestResults,
    companyProfile: profile,
    contentGaps: gaps,
    matchedConcepts,
    trendConceptsUsed: trendPool.selectedForMatching,
    debug: {
      stage0: {
        cached: trendPool.cached,
        dynamicExtractionFailed: trendPool.dynamicExtractionFailed,
        curatedCount: trendPool.curatedCount,
        dynamicCount: trendPool.dynamicCount,
        mergedCount: trendPool.concepts.length,
        selectedForMatching: trendPool.selectedForMatching.length,
      },
      stage1: {
        differentiatorsFound: profile.uniqueDifferentiators.length,
        techStackCount: profile.techStack.length,
      },
      stage1_5: {
        rankedCandidates: stage1_5.rankedCandidates.length,
        matchedCount: matchedConcepts.length,
        fallbackUsed: stage1_5.fallbackUsed,
        fallbackInjectedCount: stage1_5.fallbackInjectedCount,
        rejectedSample: stage1_5.rejectedSample,
      },
      stage2: {
        gapsFound: gaps.length,
        topGapTopics: gaps.slice(0, 4).map((g) => g.topic),
      },
      stage3Attempts,
      stage4Attempts,
      degradedMode,
    },
    costInfo: {
      stage0Cost,
      stage1Cost,
      stage1_5Cost,
      stage2Cost,
      stage3Cost,
      stage4Cost,
      totalCost,
    },
    generatedAt: new Date().toISOString(),
    regenerationAttempts,
    rejectedCount,
  };
}

export const generateOfferIdeasV3Cloud = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "1GB",
  })
  .https.onCall(
    async (
      data: GenerateIdeasV3Request,
      context
    ): Promise<GenerateIdeasV3Response> => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userId = context.auth.uid;
      if (!data.companyId || !data.companyName || !data.website) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "companyId, companyName, and website are required"
        );
      }

      const openaiApiKey =
        functions.config().openai?.key || process.env.OPENAI_API_KEY || "";

      if (!openaiApiKey) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "OpenAI API key not configured"
        );
      }

      const openai = new OpenAI({apiKey: openaiApiKey});

      try {
        const result = await generateIdeasV3(openai, data, userId);

        await logApiCost(userId, "v3-blog-ideas", {
          totalCost: result.costInfo.totalCost,
          inputCost: 0,
          outputCost: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          model: MODEL_STAGE_MAIN,
        }, {
          companyName: data.companyName,
          website: data.website,
          operationDetails: {
            companyId: data.companyId,
            version: "v3",
            ideasGenerated: result.ideas.length,
            ideasRejected: result.rejectedCount,
            regenerationAttempts: result.regenerationAttempts,
            degradedMode: result.debug.degradedMode,
          },
        });

        return result;
      } catch (error: any) {
        console.error("[V3] Error:", error);
        if (error instanceof functions.https.HttpsError) {
          throw error;
        }
        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to generate V3 ideas"
        );
      }
    }
  );
