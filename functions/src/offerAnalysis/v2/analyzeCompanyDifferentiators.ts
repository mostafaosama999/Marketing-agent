/**
 * V2 Stage 1: Analyze Company Differentiators
 *
 * Extracts unique differentiators that set this company apart from competitors.
 * Uses Apollo enrichment data and blog analysis to identify what makes them unique.
 *
 * Output: Structured company profile with differentiators, audience, content style
 */

import OpenAI from "openai";
import {
  extractTokenUsage,
  calculateCost,
  CostInfo,
} from "../../utils/costTracker";

/**
 * Input data for differentiator analysis
 */
export interface DifferentiatorAnalysisInput {
  companyName: string;
  website: string;
  // From Apollo enrichment
  apolloData?: {
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
  };
  // From blog analysis
  blogAnalysis?: {
    isTechnical?: boolean;
    hasCodeExamples?: boolean;
    hasDiagrams?: boolean;
    isDeveloperB2BSaas?: boolean;
    monthlyFrequency?: number;
    contentSummary?: string;
    rating?: "low" | "medium" | "high";
  };
  // From existing offer analysis
  companyType?:
    | "Generative AI"
    | "AI tool"
    | "Data science"
    | "Service provider"
    | "Content maker";
}

/**
 * A unique differentiator with evidence
 */
export interface Differentiator {
  claim: string;
  evidence: string;
  uniquenessScore: number; // 0-100, how unique is this?
  category:
    | "market_niche"
    | "technical_approach"
    | "business_model"
    | "customer_segment"
    | "product_feature";
}

/**
 * Target audience profile
 */
export interface TargetAudience {
  primary: string;
  secondary: string;
  sophisticationLevel: "beginner" | "intermediate" | "advanced";
  jobTitles: string[];
  industries: string[];
}

/**
 * Content style preferences
 */
export interface ContentStyle {
  tone: string;
  technicalDepth: "low" | "medium" | "high";
  formatPreferences: string[];
  topicsTheyLike: string[];
  topicsToAvoid: string[];
}

/**
 * Growth signals and company stage
 */
export interface GrowthSignals {
  stage: "early" | "growth" | "mature";
  fundingStage: string | null;
  teamSize: string | null;
  recentChanges: string[];
  likelyPriorities: string[];
}

/**
 * Complete company profile from Stage 1
 */
export interface CompanyProfile {
  companyName: string;
  uniqueDifferentiators: Differentiator[];
  targetAudience: TargetAudience;
  contentStyle: ContentStyle;
  growthSignals: GrowthSignals;
  techStack: string[];
  companyType: string;
  oneLinerDescription: string;
}

/**
 * Response from Stage 1 analysis
 */
export interface DifferentiatorAnalysisResult {
  success: boolean;
  profile: CompanyProfile;
  costInfo: CostInfo;
  analyzedAt: string;
}

/**
 * Build the prompt for differentiator extraction
 */
function buildDifferentiatorPrompt(input: DifferentiatorAnalysisInput): string {
  const {
    companyName,
    website,
    apolloData,
    blogAnalysis,
    companyType,
  } = input;

  const techStack = apolloData?.technologies?.join(", ") || "Unknown";
  const funding = apolloData?.totalFundingFormatted || "Unknown";
  const fundingStage = apolloData?.latestFundingStage || "Unknown";
  const employeeCount = apolloData?.employeeCount || apolloData?.employeeRange || "Unknown";
  const foundedYear = apolloData?.foundedYear || "Unknown";
  const industry = apolloData?.industry || apolloData?.industries?.join(", ") || "Unknown";
  const keywords = apolloData?.keywords?.join(", ") || "None";
  const description = apolloData?.description || "No description available";

  const blogTechnical = blogAnalysis?.isTechnical ? "Yes" : "No";
  const hasCode = blogAnalysis?.hasCodeExamples ? "Yes" : "No";
  const blogRating = blogAnalysis?.rating || "Unknown";
  const postFrequency = blogAnalysis?.monthlyFrequency || "Unknown";
  const contentSummary = blogAnalysis?.contentSummary || "No content analysis available";
  const isDeveloperFocused = blogAnalysis?.isDeveloperB2BSaas ? "Yes" : "No";

  return `You are analyzing ${companyName} to extract what makes them TRULY UNIQUE.

================================================================================
COMPANY DATA
================================================================================

BASIC INFO:
- Name: ${companyName}
- Website: ${website}
- Company Type: ${companyType || "Unknown"}
- Industry: ${industry}
- Description: ${description}

GROWTH & SIZE:
- Employee Count: ${employeeCount}
- Founded: ${foundedYear}
- Total Funding: ${funding}
- Funding Stage: ${fundingStage}

TECHNOLOGY:
- Tech Stack: ${techStack}
- Keywords: ${keywords}

BLOG ANALYSIS:
- Technical Content: ${blogTechnical}
- Has Code Examples: ${hasCode}
- Blog Rating: ${blogRating}
- Posts per Month: ${postFrequency}
- Developer-Focused B2B SaaS: ${isDeveloperFocused}
- Content Summary: ${contentSummary}

================================================================================
YOUR TASK: Extract TRUE Differentiators
================================================================================

Analyze this company and identify what makes them GENUINELY UNIQUE.

REJECT as differentiators:
- Generic traits: "Customer-focused", "Innovative", "Fast-growing", "Best-in-class"
- Industry-standard features that 50%+ of competitors also have
- Basic tech stack components (using React, having an API)
- Vague claims without evidence

ACCEPT as differentiators:
- Specific market niche only they serve (e.g., "Only CRM for veterinary clinics")
- Unique technical approach with evidence (e.g., "Uses graph databases for relationship mapping")
- Business model innovations (e.g., "Open-source core with enterprise add-ons")
- Unusual customer segment (e.g., "Targets solo founders, not enterprises")
- Product features competitors don't have (based on evidence)

For each differentiator, ask:
1. Is this verifiable from the data I have?
2. Would <5% of their competitors say the same thing?
3. Does this create a unique value proposition?

================================================================================
OUTPUT FORMAT (JSON ONLY)
================================================================================

{
  "companyName": "${companyName}",
  "oneLinerDescription": "What they do in one clear sentence (max 15 words)",
  "companyType": "${companyType || "Unknown"}",
  "techStack": ["List", "of", "technologies", "they", "use"],
  "uniqueDifferentiators": [
    {
      "claim": "What makes them unique",
      "evidence": "Specific evidence from the data supporting this claim",
      "uniquenessScore": 85,
      "category": "market_niche | technical_approach | business_model | customer_segment | product_feature"
    }
  ],
  "targetAudience": {
    "primary": "Main audience (e.g., 'Senior DevOps engineers at mid-size SaaS companies')",
    "secondary": "Secondary audience (e.g., 'Platform teams at enterprises')",
    "sophisticationLevel": "beginner | intermediate | advanced",
    "jobTitles": ["Specific job titles they target"],
    "industries": ["Industries their customers are in"]
  },
  "contentStyle": {
    "tone": "How they communicate (e.g., 'Technical but approachable', 'Enterprise-formal')",
    "technicalDepth": "low | medium | high",
    "formatPreferences": ["Tutorials", "Case studies", "Technical deep-dives", "etc."],
    "topicsTheyLike": ["Topics that fit their brand"],
    "topicsToAvoid": ["Topics that don't fit or they already covered heavily"]
  },
  "growthSignals": {
    "stage": "early | growth | mature",
    "fundingStage": "${fundingStage}",
    "teamSize": "${employeeCount}",
    "recentChanges": ["Any signals of recent changes or pivots"],
    "likelyPriorities": ["What they're probably focused on right now"]
  }
}

IMPORTANT:
- Generate 3-5 differentiators, not more
- Each differentiator must have uniquenessScore > 60 to be included
- If you cannot find strong differentiators, say so honestly
- Do NOT make up facts not supported by the provided data

RESPOND WITH ONLY THE JSON OBJECT - no markdown, no code blocks, just valid JSON.`;
}

/**
 * Clean JSON response from OpenAI
 */
function cleanJsonResponse(content: string): string {
  return content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

/**
 * Analyze company to extract differentiators
 */
export async function analyzeCompanyDifferentiators(
  openai: OpenAI,
  input: DifferentiatorAnalysisInput
): Promise<DifferentiatorAnalysisResult> {
  const prompt = buildDifferentiatorPrompt(input);

  console.log(`[V2 Stage 1] Analyzing differentiators for: ${input.companyName}`);

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    response_format: { type: "json_object" },
    temperature: 0.3, // Lower temperature for more consistent analysis
    max_tokens: 2500,
    messages: [
      {
        role: "system",
        content:
          "You are an expert competitive analyst who identifies what makes companies truly unique. You focus on verifiable, specific differentiators and avoid generic marketing speak.",
      },
      { role: "user", content: prompt },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Failed to get response from OpenAI");
  }

  const profile: CompanyProfile = JSON.parse(cleanJsonResponse(content));

  // Calculate cost
  const tokens = extractTokenUsage(completion);
  let costInfo: CostInfo = {
    totalCost: 0,
    inputCost: 0,
    outputCost: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    model: "gpt-4-turbo",
  };

  if (tokens) {
    costInfo = calculateCost(tokens, "gpt-4-turbo");
  }

  console.log(
    `[V2 Stage 1] Complete: Found ${profile.uniqueDifferentiators.length} differentiators`
  );

  return {
    success: true,
    profile,
    costInfo,
    analyzedAt: new Date().toISOString(),
  };
}
