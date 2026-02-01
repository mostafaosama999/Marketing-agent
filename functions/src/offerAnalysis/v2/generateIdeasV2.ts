/**
 * V2 Blog Idea Generation - Main Orchestrator
 *
 * 5-Stage Pipeline (Enhanced):
 * 0. Extract AI concepts (cached 24h)
 * 1. Analyze company differentiators
 * 1.5. Match AI concepts to company
 * 2. Identify content gaps
 * 3. Generate ideas (with matched AI concepts when available)
 * 4. Validate and filter ideas
 *
 * Key differences from V1:
 * - Ideas emerge from company context, not buzzword templates
 * - Multi-stage pipeline for deeper personalization
 * - Validation layer rejects generic ideas
 *
 * ENHANCEMENT: Dynamic AI concept matching for bottom-of-funnel tutorials
 */

import * as functions from "firebase-functions";
import OpenAI from "openai";
import {
  analyzeCompanyDifferentiators,
  DifferentiatorAnalysisInput,
  CompanyProfile,
} from "./analyzeCompanyDifferentiators";
import { analyzeContentGaps, ContentGap } from "./analyzeContentGaps";
import {
  buildIdeaGenerationPromptV2,
  IDEA_GENERATION_SYSTEM_PROMPT_V2,
  BlogIdeaV2,
} from "./promptsV2";
import { validateIdeas, IdeaValidationResult } from "./validateIdeas";
import {
  extractTokenUsage,
  calculateCost,
  logApiCost,
  CostInfo,
} from "../../utils/costTracker";
import {
  getAIConcepts,
  MatchedConcept,
} from "../../services/aiConcepts";
import { matchConceptsToCompany } from "./stages/stageMatchConcepts";

/**
 * Request for V2 idea generation
 */
export interface GenerateIdeasV2Request {
  companyId: string;
  companyName: string;
  website: string;
  // Optional: pre-existing data
  apolloData?: DifferentiatorAnalysisInput["apolloData"];
  blogAnalysis?: DifferentiatorAnalysisInput["blogAnalysis"];
  companyType?: DifferentiatorAnalysisInput["companyType"];
  // Optional: skip stages if profile already exists
  existingProfile?: CompanyProfile;
  // Optional: custom requirements
  specificRequirements?: string;
}

/**
 * Response from V2 idea generation
 */
export interface GenerateIdeasV2Response {
  success: boolean;
  version: "v2";
  // Core results
  ideas: BlogIdeaV2[];
  validationResults: IdeaValidationResult[];
  // Intermediate results (for debugging/display)
  companyProfile: CompanyProfile;
  contentGaps: ContentGap[];
  // AI concept matching results (NEW)
  matchedConcepts?: MatchedConcept[];
  conceptsEvaluated?: number;
  // Cost tracking
  costInfo: {
    stage0Cost: number; // AI concept extraction (usually 0 if cached)
    stage1Cost: number;
    stage1_5Cost: number; // Concept matching
    stage2Cost: number;
    stage3Cost: number;
    stage4Cost: number;
    totalCost: number;
  };
  // Metadata
  generatedAt: string;
  rejectedCount: number;
  regenerationAttempts: number;
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
 * Stage 3: Generate ideas based on profile and gaps
 * Exported for use by staged cloud functions
 *
 * ENHANCED: Now accepts optional matchedConcepts for AI concept tutorials
 */
export async function generateIdeasFromContext(
  openai: OpenAI,
  profile: CompanyProfile,
  gaps: ContentGap[],
  matchedConcepts?: MatchedConcept[]
): Promise<{ ideas: BlogIdeaV2[]; costInfo: CostInfo }> {
  const prompt = buildIdeaGenerationPromptV2(profile, gaps, matchedConcepts);

  console.log(`[V2 Stage 3] Generating ideas for: ${profile.companyName}`);

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    response_format: { type: "json_object" },
    temperature: 0.7, // Moderate creativity
    max_tokens: 3000,
    messages: [
      { role: "system", content: IDEA_GENERATION_SYSTEM_PROMPT_V2 },
      { role: "user", content: prompt },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Failed to generate ideas");
  }

  const result: { ideas: BlogIdeaV2[] } = JSON.parse(cleanJsonResponse(content));

  // Filter by probability threshold
  const filteredIdeas = result.ideas.filter(
    (idea) => !idea.probability || idea.probability >= 0.5
  );

  // Calculate cost
  const tokens = extractTokenUsage(completion);
  const costInfo: CostInfo = tokens
    ? calculateCost(tokens, "gpt-4-turbo")
    : {
        totalCost: 0,
        inputCost: 0,
        outputCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        model: "gpt-4-turbo",
      };

  console.log(
    `[V2 Stage 3] Generated ${filteredIdeas.length} ideas (filtered from ${result.ideas.length})`
  );

  return { ideas: filteredIdeas, costInfo };
}

/**
 * Main V2 generation function
 *
 * Runs all stages (0, 1, 1.5, 2, 3, 4) and returns validated ideas
 *
 * ENHANCED: Now includes AI concept extraction (Stage 0) and matching (Stage 1.5)
 */
export async function generateIdeasV2(
  openai: OpenAI,
  request: GenerateIdeasV2Request,
  userId: string
): Promise<GenerateIdeasV2Response> {
  const startTime = Date.now();
  let stage0Cost = 0;
  let stage1Cost = 0;
  let stage1_5Cost = 0;
  let stage2Cost = 0;
  let stage3Cost = 0;
  let stage4Cost = 0;
  let regenerationAttempts = 0;

  // Track matched concepts for response
  let matchedConcepts: MatchedConcept[] = [];
  let conceptsEvaluated = 0;

  console.log(`[V2] Starting enhanced pipeline for: ${request.companyName}`);

  // Stage 0: Get current AI concepts (cached 24h)
  // This is cheap/free if cached, ~$0.01 if extraction needed
  try {
    console.log("[V2 Stage 0] Fetching AI concepts (cached 24h)...");
    const conceptsResult = await getAIConcepts(openai, 24);
    stage0Cost = conceptsResult.extractionCost;
    conceptsEvaluated = conceptsResult.concepts.length;

    console.log(
      `[V2 Stage 0] Got ${conceptsResult.concepts.length} concepts ` +
        `(cached: ${conceptsResult.cached}, cost: $${stage0Cost.toFixed(4)})`
    );

    // Stage 1: Analyze differentiators (or use existing profile)
    let profile: CompanyProfile;

    if (request.existingProfile) {
      console.log("[V2 Stage 1] Using existing company profile");
      profile = request.existingProfile;
    } else {
      const stage1Result = await analyzeCompanyDifferentiators(openai, {
        companyName: request.companyName,
        website: request.website,
        apolloData: request.apolloData,
        blogAnalysis: request.blogAnalysis,
        companyType: request.companyType,
      });
      profile = stage1Result.profile;
      stage1Cost = stage1Result.costInfo.totalCost;
    }

    // Stage 1.5: Match AI concepts to this company
    // This is the KEY innovation - strict matching prevents V1's "same for everyone" problem
    if (conceptsResult.concepts.length > 0) {
      console.log("[V2 Stage 1.5] Matching AI concepts to company...");
      const matchingResult = await matchConceptsToCompany(
        openai,
        conceptsResult.concepts,
        profile
      );
      matchedConcepts = matchingResult.matchedConcepts;
      stage1_5Cost = matchingResult.matchingCost;

      console.log(
        `[V2 Stage 1.5] Matched ${matchedConcepts.length}/${conceptsResult.concepts.length} concepts ` +
          `(cost: $${stage1_5Cost.toFixed(4)})`
      );

      if (matchedConcepts.length > 0) {
        console.log(
          `[V2 Stage 1.5] Top matches: ${matchedConcepts
            .slice(0, 3)
            .map((m) => `${m.concept.name} (${m.fitScore}%)`)
            .join(", ")}`
        );
      }
    }

    // Stage 2: Analyze content gaps
    const stage2Result = await analyzeContentGaps(
      openai,
      profile,
      request.blogAnalysis?.contentSummary
    );
    const gaps = stage2Result.gaps;
    stage2Cost = stage2Result.costInfo.totalCost;

    // Stage 3 & 4: Generate and validate (with regeneration loop)
    // ENHANCED: Pass matched concepts to Stage 3 for AI concept tutorials
    const MAX_ATTEMPTS = 3;
    const MIN_VALID_IDEAS = 3;

    let allValidIdeas: IdeaValidationResult[] = [];
    let allRejectedIdeas: IdeaValidationResult[] = [];
    let finalIdeas: BlogIdeaV2[] = [];

    while (regenerationAttempts < MAX_ATTEMPTS && allValidIdeas.length < MIN_VALID_IDEAS) {
      regenerationAttempts++;
      console.log(`[V2] Attempt ${regenerationAttempts}/${MAX_ATTEMPTS}`);

      // Stage 3: Generate ideas WITH matched concepts (if any)
      const stage3Result = await generateIdeasFromContext(
        openai,
        profile,
        gaps,
        matchedConcepts.length > 0 ? matchedConcepts : undefined
      );
      stage3Cost += stage3Result.costInfo.totalCost;

      // Stage 4: Validate ideas
      const stage4Result = await validateIdeas(openai, stage3Result.ideas, profile);
      stage4Cost += stage4Result.costInfo.totalCost;

      // Accumulate results
      allValidIdeas.push(...stage4Result.validIdeas);
      allRejectedIdeas.push(...stage4Result.rejectedIdeas);

      if (allValidIdeas.length >= MIN_VALID_IDEAS) {
        console.log(`[V2] Got ${allValidIdeas.length} valid ideas, stopping regeneration`);
        break;
      }

      if (regenerationAttempts < MAX_ATTEMPTS) {
        console.log(
          `[V2] Only ${allValidIdeas.length} valid ideas, regenerating...`
        );
      }
    }

    // Take top 5 valid ideas by overall score
    const sortedValidIdeas = allValidIdeas
      .sort((a, b) => b.scores.overallScore - a.scores.overallScore)
      .slice(0, 5);

    finalIdeas = sortedValidIdeas.map((v) => v.idea);

    // Calculate total cost (now includes stages 0 and 1.5)
    const totalCost = stage0Cost + stage1Cost + stage1_5Cost + stage2Cost + stage3Cost + stage4Cost;

    const duration = Date.now() - startTime;
    const conceptTutorialCount = finalIdeas.filter((i) => i.isConceptTutorial).length;

    console.log(
      `[V2] Complete: ${finalIdeas.length} ideas (${conceptTutorialCount} AI concept tutorials) ` +
        `in ${duration}ms, $${totalCost.toFixed(4)}`
    );

    return {
      success: true,
      version: "v2",
      ideas: finalIdeas,
      validationResults: sortedValidIdeas,
      companyProfile: profile,
      contentGaps: gaps,
      // NEW: AI concept matching results
      matchedConcepts: matchedConcepts.length > 0 ? matchedConcepts : undefined,
      conceptsEvaluated,
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
      rejectedCount: allRejectedIdeas.length,
      regenerationAttempts,
    };
  } catch (error) {
    // If concept extraction/matching fails, fall back to regular V2 pipeline
    console.warn("[V2] AI concept stages failed, falling back to regular pipeline:", error);

    // Stage 1: Analyze differentiators
    let profile: CompanyProfile;

    if (request.existingProfile) {
      profile = request.existingProfile;
    } else {
      const stage1Result = await analyzeCompanyDifferentiators(openai, {
        companyName: request.companyName,
        website: request.website,
        apolloData: request.apolloData,
        blogAnalysis: request.blogAnalysis,
        companyType: request.companyType,
      });
      profile = stage1Result.profile;
      stage1Cost = stage1Result.costInfo.totalCost;
    }

    // Stage 2: Analyze content gaps
    const stage2Result = await analyzeContentGaps(
      openai,
      profile,
      request.blogAnalysis?.contentSummary
    );
    const gaps = stage2Result.gaps;
    stage2Cost = stage2Result.costInfo.totalCost;

    // Stage 3 & 4: Generate and validate (without concepts)
    const MAX_ATTEMPTS = 3;
    const MIN_VALID_IDEAS = 3;

    let allValidIdeas: IdeaValidationResult[] = [];
    let allRejectedIdeas: IdeaValidationResult[] = [];

    while (regenerationAttempts < MAX_ATTEMPTS && allValidIdeas.length < MIN_VALID_IDEAS) {
      regenerationAttempts++;

      const stage3Result = await generateIdeasFromContext(openai, profile, gaps);
      stage3Cost += stage3Result.costInfo.totalCost;

      const stage4Result = await validateIdeas(openai, stage3Result.ideas, profile);
      stage4Cost += stage4Result.costInfo.totalCost;

      allValidIdeas.push(...stage4Result.validIdeas);
      allRejectedIdeas.push(...stage4Result.rejectedIdeas);

      if (allValidIdeas.length >= MIN_VALID_IDEAS) break;
    }

    const sortedValidIdeas = allValidIdeas
      .sort((a, b) => b.scores.overallScore - a.scores.overallScore)
      .slice(0, 5);

    const totalCost = stage0Cost + stage1Cost + stage1_5Cost + stage2Cost + stage3Cost + stage4Cost;

    return {
      success: true,
      version: "v2",
      ideas: sortedValidIdeas.map((v) => v.idea),
      validationResults: sortedValidIdeas,
      companyProfile: profile,
      contentGaps: gaps,
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
      rejectedCount: allRejectedIdeas.length,
      regenerationAttempts,
    };
  }
}

/**
 * Cloud Function: Generate Ideas V2
 *
 * Callable function that runs the V2 pipeline
 */
export const generateOfferIdeasV2Cloud = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes (4 stages can take time)
    memory: "1GB",
  })
  .https.onCall(
    async (
      data: GenerateIdeasV2Request,
      context
    ): Promise<GenerateIdeasV2Response> => {
      // Authentication check
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userId = context.auth.uid;

      // Validate input
      if (!data.companyId || !data.companyName || !data.website) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "companyId, companyName, and website are required"
        );
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
        // Run V2 pipeline
        const result = await generateIdeasV2(openai, data, userId);

        // Log total cost
        await logApiCost(userId, "v2-blog-ideas", {
          totalCost: result.costInfo.totalCost,
          inputCost: 0, // Individual stage costs tracked above
          outputCost: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          model: "gpt-4-turbo",
        }, {
          companyName: data.companyName,
          website: data.website,
          operationDetails: {
            companyId: data.companyId,
            version: "v2",
            ideasGenerated: result.ideas.length,
            ideasRejected: result.rejectedCount,
            regenerationAttempts: result.regenerationAttempts,
          },
        });

        return result;
      } catch (error: any) {
        console.error("[V2] Error:", error);

        if (error instanceof functions.https.HttpsError) {
          throw error;
        }

        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to generate V2 ideas"
        );
      }
    }
  );
