/**
 * V2 Stage 4: Validate Ideas
 *
 * Validates generated ideas against quality criteria:
 * - Personalization score (references company-specific facts)
 * - Uniqueness score (would fail competitor test)
 * - Buzzword density (lower is better)
 * - Audience relevance (matches their style)
 *
 * Rejects generic ideas and can trigger regeneration.
 */

import OpenAI from "openai";
import {
  extractTokenUsage,
  calculateCost,
  CostInfo,
} from "../../utils/costTracker";
import { CompanyProfile } from "./analyzeCompanyDifferentiators";
import { BlogIdeaV2, BUZZWORD_BLACKLIST } from "./promptsV2";

/**
 * Validation scores for a single idea
 */
export interface ValidationScores {
  personalization: number; // 0-100: References company-specific facts
  uniqueness: number; // 0-100: Would fail "competitor test"
  buzzwordDensity: number; // 0-100: Higher is WORSE
  audienceRelevance: number; // 0-100: Matches their content style
  overallScore: number; // Weighted average
}

/**
 * Result of validating a single idea
 */
export interface IdeaValidationResult {
  idea: BlogIdeaV2;
  isValid: boolean;
  scores: ValidationScores;
  rejectionReason?: string;
  improvementSuggestion?: string;
}

/**
 * Result of validating all ideas
 */
export interface ValidationResult {
  validIdeas: IdeaValidationResult[];
  rejectedIdeas: IdeaValidationResult[];
  costInfo: CostInfo;
  validatedAt: string;
}

/**
 * Count buzzwords in text
 */
function countBuzzwords(text: string): number {
  const lowerText = text.toLowerCase();
  return BUZZWORD_BLACKLIST.filter((buzzword) =>
    lowerText.includes(buzzword.toLowerCase())
  ).length;
}

/**
 * Calculate buzzword density score (0-100, higher is worse)
 */
function calculateBuzzwordScore(idea: BlogIdeaV2): number {
  const textToCheck = [
    idea.title,
    idea.whyOnlyTheyCanWriteThis,
    idea.audienceFit,
    idea.angleToAvoidDuplication,
    ...idea.whatReaderLearns,
  ].join(" ");

  const buzzwordCount = countBuzzwords(textToCheck);

  // 0 buzzwords = 0 (best), 5+ buzzwords = 100 (worst)
  return Math.min(buzzwordCount * 20, 100);
}

/**
 * Build the LLM-as-Judge validation prompt
 */
function buildValidationPrompt(
  idea: BlogIdeaV2,
  profile: CompanyProfile
): string {
  const differentiators = profile.uniqueDifferentiators
    .map((d) => `- ${d.claim}`)
    .join("\n");

  return `You are a strict quality evaluator for B2B content ideas.

COMPANY CONTEXT:
- Company: ${profile.companyName}
- What they do: ${profile.oneLinerDescription}
- Their differentiators:
${differentiators}
- Target audience: ${profile.targetAudience.primary}
- Technical depth: ${profile.contentStyle.technicalDepth}

IDEA TO EVALUATE:
Title: ${idea.title}
Why only they can write this: ${idea.whyOnlyTheyCanWriteThis}
Evidence: ${idea.specificEvidence}
Target gap: ${idea.targetGap}
Audience fit: ${idea.audienceFit}

================================================================================
EVALUATION CRITERIA
================================================================================

Rate this idea 0-100 on each dimension:

1. **PERSONALIZATION**: Does it reference specific company facts?
   - 90-100: Mentions specific products, features, or differentiators by name
   - 70-89: References their industry/audience specifically
   - 50-69: Somewhat related to their space
   - 0-49: Generic, could apply to any company

2. **UNIQUENESS (Competitor Test)**: Would this work for their competitor?
   - 90-100: Only ${profile.companyName} could credibly write this
   - 70-89: Maybe 2-3 similar companies could write this
   - 50-69: Many companies in the space could write this
   - 0-49: Any company could write this

3. **AUDIENCE RELEVANCE**: Does it match their audience and style?
   - 90-100: Perfectly matches their technical depth and audience
   - 70-89: Good fit with minor adjustments needed
   - 50-69: Partially matches
   - 0-49: Mismatch in tone, depth, or audience

================================================================================
OUTPUT FORMAT (JSON ONLY)
================================================================================

{
  "personalization": <0-100>,
  "uniqueness": <0-100>,
  "audienceRelevance": <0-100>,
  "verdict": "ACCEPT" | "REJECT",
  "rejectionReason": "If REJECT, explain why in 1 sentence",
  "improvementSuggestion": "If REJECT, suggest how to make it more specific"
}

BE STRICT. Accept threshold is 70+ on ALL dimensions.

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
 * Validate a single idea using LLM-as-Judge
 */
async function validateSingleIdea(
  openai: OpenAI,
  idea: BlogIdeaV2,
  profile: CompanyProfile
): Promise<{
  result: IdeaValidationResult;
  tokens: { inputTokens: number; outputTokens: number } | null;
}> {
  // First, do rule-based buzzword check
  const buzzwordScore = calculateBuzzwordScore(idea);

  // If too many buzzwords, reject without LLM call
  if (buzzwordScore >= 60) {
    return {
      result: {
        idea,
        isValid: false,
        scores: {
          personalization: 0,
          uniqueness: 0,
          buzzwordDensity: buzzwordScore,
          audienceRelevance: 0,
          overallScore: 0,
        },
        rejectionReason: `Contains too many buzzwords (score: ${buzzwordScore}/100)`,
        improvementSuggestion: "Remove generic marketing language and be more specific",
      },
      tokens: null,
    };
  }

  // LLM-as-Judge validation
  const prompt = buildValidationPrompt(idea, profile);

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    response_format: { type: "json_object" },
    temperature: 0.2, // Low temperature for consistent evaluation
    max_tokens: 500,
    messages: [
      {
        role: "system",
        content:
          "You are a strict quality evaluator. You only accept highly personalized content ideas that could not work for competing companies.",
      },
      { role: "user", content: prompt },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Failed to get validation response from OpenAI");
  }

  const evaluation = JSON.parse(cleanJsonResponse(content));
  const tokens = extractTokenUsage(completion);

  // Calculate overall score (weighted average, buzzword penalty)
  const baseScore =
    (evaluation.personalization * 0.35 +
      evaluation.uniqueness * 0.35 +
      evaluation.audienceRelevance * 0.3);

  // Apply buzzword penalty (each 10 points of buzzword score reduces overall by 5)
  const buzzwordPenalty = Math.floor(buzzwordScore / 10) * 5;
  const overallScore = Math.max(0, baseScore - buzzwordPenalty);

  const isValid =
    evaluation.verdict === "ACCEPT" &&
    evaluation.personalization >= 70 &&
    evaluation.uniqueness >= 70 &&
    evaluation.audienceRelevance >= 70 &&
    overallScore >= 70;

  return {
    result: {
      idea,
      isValid,
      scores: {
        personalization: evaluation.personalization,
        uniqueness: evaluation.uniqueness,
        buzzwordDensity: buzzwordScore,
        audienceRelevance: evaluation.audienceRelevance,
        overallScore: Math.round(overallScore),
      },
      rejectionReason: isValid ? undefined : evaluation.rejectionReason,
      improvementSuggestion: isValid ? undefined : evaluation.improvementSuggestion,
    },
    tokens,
  };
}

/**
 * Validate all generated ideas
 */
export async function validateIdeas(
  openai: OpenAI,
  ideas: BlogIdeaV2[],
  profile: CompanyProfile
): Promise<ValidationResult> {
  console.log(`[V2 Stage 4] Validating ${ideas.length} ideas for: ${profile.companyName}`);

  const validIdeas: IdeaValidationResult[] = [];
  const rejectedIdeas: IdeaValidationResult[] = [];
  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  // Validate each idea
  for (const idea of ideas) {
    try {
      const { result, tokens } = await validateSingleIdea(openai, idea, profile);

      if (result.isValid) {
        validIdeas.push(result);
      } else {
        rejectedIdeas.push(result);
      }

      if (tokens) {
        totalInputTokens += tokens.inputTokens;
        totalOutputTokens += tokens.outputTokens;
      }
    } catch (error) {
      console.error(`[V2 Stage 4] Error validating idea: ${idea.title}`, error);
      // On error, reject the idea
      rejectedIdeas.push({
        idea,
        isValid: false,
        scores: {
          personalization: 0,
          uniqueness: 0,
          buzzwordDensity: 0,
          audienceRelevance: 0,
          overallScore: 0,
        },
        rejectionReason: "Validation error occurred",
      });
    }
  }

  // Calculate total cost
  const costInfo = calculateCost(
    {
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      totalTokens: totalInputTokens + totalOutputTokens,
    },
    "gpt-4-turbo"
  );

  console.log(
    `[V2 Stage 4] Complete: ${validIdeas.length} valid, ${rejectedIdeas.length} rejected`
  );

  return {
    validIdeas,
    rejectedIdeas,
    costInfo,
    validatedAt: new Date().toISOString(),
  };
}

/**
 * Quick rule-based validation (no LLM call)
 * Use this for fast filtering before full validation
 */
export function quickValidate(idea: BlogIdeaV2, profile: CompanyProfile): {
  pass: boolean;
  reason?: string;
} {
  // Check buzzword density
  const buzzwordScore = calculateBuzzwordScore(idea);
  if (buzzwordScore >= 60) {
    return { pass: false, reason: "Too many buzzwords" };
  }

  // Check if title mentions the company or its products
  const companyNameLower = profile.companyName.toLowerCase();
  const titleLower = idea.title.toLowerCase();
  const hasCompanyReference =
    titleLower.includes(companyNameLower) ||
    profile.techStack.some((tech) => titleLower.includes(tech.toLowerCase()));

  if (!hasCompanyReference) {
    return { pass: false, reason: "Title doesn't reference company or its tech" };
  }

  // Check probability threshold (if available from verbalized sampling)
  if (idea.probability !== undefined && idea.probability < 0.5) {
    return { pass: false, reason: "Probability too low (model not confident)" };
  }

  return { pass: true };
}
