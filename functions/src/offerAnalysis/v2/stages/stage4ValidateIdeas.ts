/**
 * V2 Stage 4: Validate Ideas (Cloud Function)
 *
 * Uses GPT-4o-mini for faster validation (~10x faster than GPT-4).
 * Validates ideas against quality criteria and returns scores.
 */

import * as functions from "firebase-functions";
import OpenAI from "openai";
import { CompanyProfile } from "../analyzeCompanyDifferentiators";
import { BlogIdeaV2, BUZZWORD_BLACKLIST } from "../promptsV2";
import {
  extractTokenUsage,
  calculateCost,
  logApiCost,
  CostInfo,
} from "../../../utils/costTracker";

/**
 * Validation scores for a single idea
 */
export interface ValidationScores {
  personalization: number;
  uniqueness: number;
  buzzwordDensity: number;
  audienceRelevance: number;
  overallScore: number;
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
 * Request for Stage 4
 */
export interface V2Stage4Request {
  companyId: string;
  ideas: BlogIdeaV2[];
  profile: CompanyProfile;
}

/**
 * Response from Stage 4
 */
export interface V2Stage4Response {
  success: boolean;
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
  return Math.min(buzzwordCount * 20, 100);
}

/**
 * Build batch validation prompt for all ideas at once
 * This is more efficient than validating one at a time
 */
function buildBatchValidationPrompt(
  ideas: BlogIdeaV2[],
  profile: CompanyProfile
): string {
  const differentiators = profile.uniqueDifferentiators
    .map((d) => `- ${d.claim}`)
    .join("\n");

  const ideasList = ideas
    .map(
      (idea, index) => `
IDEA ${index + 1}:
- Title: ${idea.title}
- Why only they can write this: ${idea.whyOnlyTheyCanWriteThis}
- Evidence: ${idea.specificEvidence}
- Target gap: ${idea.targetGap}
- Audience fit: ${idea.audienceFit}`
    )
    .join("\n");

  return `You are a strict quality evaluator for B2B content ideas.

COMPANY CONTEXT:
- Company: ${profile.companyName}
- What they do: ${profile.oneLinerDescription}
- Their differentiators:
${differentiators}
- Target audience: ${profile.targetAudience.primary}
- Technical depth: ${profile.contentStyle.technicalDepth}

IDEAS TO EVALUATE:
${ideasList}

================================================================================
EVALUATION CRITERIA
================================================================================

Rate EACH idea 0-100 on these dimensions:

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
  "evaluations": [
    {
      "ideaIndex": 1,
      "personalization": <0-100>,
      "uniqueness": <0-100>,
      "audienceRelevance": <0-100>,
      "verdict": "ACCEPT" | "REJECT",
      "rejectionReason": "If REJECT, explain why in 1 sentence (or null if ACCEPT)",
      "improvementSuggestion": "If REJECT, suggest how to make it more specific (or null if ACCEPT)"
    }
  ]
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
 * V2 Stage 4 Cloud Function
 *
 * Validates ideas using GPT-4o-mini (batch validation for speed).
 * Typical time: 10-15 seconds (vs 60s+ with GPT-4 sequential)
 */
export const v2Stage4Cloud = functions
  .runWith({
    timeoutSeconds: 120,
    memory: "512MB",
  })
  .https.onCall(
    async (data: V2Stage4Request, context): Promise<V2Stage4Response> => {
      // Authentication check
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userId = context.auth.uid;

      // Validate input
      if (!data.companyId || !data.ideas || !data.profile) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "companyId, ideas, and profile are required"
        );
      }

      if (data.ideas.length === 0) {
        return {
          success: true,
          validIdeas: [],
          rejectedIdeas: [],
          costInfo: {
            totalCost: 0,
            inputCost: 0,
            outputCost: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            model: "gpt-4o-mini",
          },
          validatedAt: new Date().toISOString(),
        };
      }

      // Initialize OpenAI
      const openaiApiKey =
        functions.config().openai?.key || process.env.OPENAI_API_KEY || "";

      if (!openaiApiKey) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "OpenAI API key not configured"
        );
      }

      const openai = new OpenAI({ apiKey: openaiApiKey });

      try {
        console.log(
          `[V2 Stage 4] Validating ${data.ideas.length} ideas for: ${data.profile.companyName}`
        );

        // Pre-filter ideas with too many buzzwords
        const buzzwordResults: IdeaValidationResult[] = [];
        const ideasToValidate: BlogIdeaV2[] = [];

        for (const idea of data.ideas) {
          const buzzwordScore = calculateBuzzwordScore(idea);
          if (buzzwordScore >= 60) {
            buzzwordResults.push({
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
              improvementSuggestion:
                "Remove generic marketing language and be more specific",
            });
          } else {
            ideasToValidate.push(idea);
          }
        }

        // Batch validate remaining ideas with GPT-4o-mini
        let validIdeas: IdeaValidationResult[] = [];
        let rejectedIdeas: IdeaValidationResult[] = [...buzzwordResults];
        let costInfo: CostInfo = {
          totalCost: 0,
          inputCost: 0,
          outputCost: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          model: "gpt-4o-mini",
        };

        if (ideasToValidate.length > 0) {
          const prompt = buildBatchValidationPrompt(
            ideasToValidate,
            data.profile
          );

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Using faster model
            response_format: { type: "json_object" },
            temperature: 0.2, // Low temperature for consistent evaluation
            max_tokens: 2000,
            messages: [
              {
                role: "system",
                content:
                  "You are a strict quality evaluator. You only accept highly personalized content ideas that could not work for competing companies. Respond with valid JSON only.",
              },
              { role: "user", content: prompt },
            ],
          });

          const content = completion.choices[0]?.message?.content;
          if (!content) {
            throw new Error("Failed to get validation response from OpenAI");
          }

          const result = JSON.parse(cleanJsonResponse(content));
          const tokens = extractTokenUsage(completion);

          if (tokens) {
            costInfo = calculateCost(tokens, "gpt-4o-mini");
          }

          // Process evaluations
          for (const evaluation of result.evaluations) {
            const ideaIndex = evaluation.ideaIndex - 1;
            const idea = ideasToValidate[ideaIndex];

            if (!idea) continue;

            const buzzwordScore = calculateBuzzwordScore(idea);

            // Calculate overall score
            const baseScore =
              evaluation.personalization * 0.35 +
              evaluation.uniqueness * 0.35 +
              evaluation.audienceRelevance * 0.3;

            const buzzwordPenalty = Math.floor(buzzwordScore / 10) * 5;
            const overallScore = Math.max(0, baseScore - buzzwordPenalty);

            const isValid =
              evaluation.verdict === "ACCEPT" &&
              evaluation.personalization >= 70 &&
              evaluation.uniqueness >= 70 &&
              evaluation.audienceRelevance >= 70 &&
              overallScore >= 70;

            const validationResult: IdeaValidationResult = {
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
              improvementSuggestion: isValid
                ? undefined
                : evaluation.improvementSuggestion,
            };

            if (isValid) {
              validIdeas.push(validationResult);
            } else {
              rejectedIdeas.push(validationResult);
            }
          }
        }

        // Sort valid ideas by overall score
        validIdeas.sort((a, b) => b.scores.overallScore - a.scores.overallScore);

        // Log cost
        await logApiCost(userId, "v2-stage4-validate-ideas", costInfo, {
          companyName: data.profile.companyName,
          operationDetails: {
            companyId: data.companyId,
            stage: "4-validate-ideas",
            totalIdeas: data.ideas.length,
            validIdeas: validIdeas.length,
            rejectedIdeas: rejectedIdeas.length,
          },
        });

        console.log(
          `[V2 Stage 4] Complete: ${validIdeas.length} valid, ${rejectedIdeas.length} rejected`
        );

        return {
          success: true,
          validIdeas,
          rejectedIdeas,
          costInfo,
          validatedAt: new Date().toISOString(),
        };
      } catch (error: any) {
        console.error("[V2 Stage 4] Error:", error);

        if (error instanceof functions.https.HttpsError) {
          throw error;
        }

        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to validate ideas"
        );
      }
    }
  );
