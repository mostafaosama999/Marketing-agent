/**
 * V2 Stage 3: Generate Ideas (Cloud Function)
 *
 * Wraps generateIdeasFromContext() as a callable cloud function.
 * Returns: Raw blog ideas before validation
 *
 * ENHANCED: Now accepts optional matchedConcepts for AI concept tutorials
 */

import * as functions from "firebase-functions";
import OpenAI from "openai";
import { generateIdeasFromContext } from "../generateIdeasV2";
import { CompanyProfile } from "../analyzeCompanyDifferentiators";
import { ContentGap } from "../analyzeContentGaps";
import { BlogIdeaV2 } from "../promptsV2";
import { logApiCost, CostInfo } from "../../../utils/costTracker";
import { MatchedConcept, AIConcept } from "../../../services/aiConcepts";

/**
 * Simplified matched concept from Stage 1.5
 */
interface MatchedConceptSimple {
  name: string;
  fitScore: number;
  fitReason: string;
  productIntegration: string;
  tutorialAngle: string;
}

/**
 * Simplified raw concept from Stage 0 (for fallback injection)
 */
interface RawConceptSimple {
  name: string;
  description: string;
  whyHot: string;
  useCases: string[];
  category: string;
  hypeLevel: string;
}

/**
 * Request for Stage 3
 */
export interface V2Stage3Request {
  companyId: string;
  profile: CompanyProfile;
  gaps: ContentGap[];
  // Optional matched concepts from Stage 1.5
  matchedConcepts?: MatchedConceptSimple[];
  // Optional raw concepts from Stage 0 (fallback when no matches)
  allConcepts?: RawConceptSimple[];
}

/**
 * Response from Stage 3
 */
export interface V2Stage3Response {
  success: boolean;
  ideas: BlogIdeaV2[];
  costInfo: CostInfo;
  generatedAt: string;
}

/**
 * V2 Stage 3 Cloud Function
 *
 * Generates blog ideas based on profile and content gaps.
 * Typical time: 20-30 seconds
 */
export const v2Stage3Cloud = functions
  .runWith({
    timeoutSeconds: 180,
    memory: "512MB",
  })
  .https.onCall(
    async (data: V2Stage3Request, context): Promise<V2Stage3Response> => {
      // Authentication check
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userId = context.auth.uid;

      // Validate input
      if (!data.companyId || !data.profile || !data.gaps) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "companyId, profile, and gaps are required"
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
        console.log(`[V2 Stage 3] Starting for: ${data.profile.companyName}`);

        // Convert simplified concepts back to full MatchedConcept format if provided
        let matchedConcepts: MatchedConcept[] | undefined;
        if (data.matchedConcepts && data.matchedConcepts.length > 0) {
          console.log(
            `[V2 Stage 3] Using ${data.matchedConcepts.length} matched AI concepts`
          );
          matchedConcepts = data.matchedConcepts.map((mc) => ({
            concept: {
              id: `concept_${mc.name.toLowerCase().replace(/\s+/g, "_")}`,
              name: mc.name,
              description: "",
              whyHot: "",
              useCases: [],
              keywords: [],
              category: "technique" as const,
              hypeLevel: "peak" as const,
              lastUpdated: new Date(),
            } as AIConcept,
            fitScore: mc.fitScore,
            fitReason: mc.fitReason,
            productIntegration: mc.productIntegration,
            tutorialAngle: mc.tutorialAngle,
          }));
        }

        // Convert simplified raw concepts to AIConcept format for fallback
        let allConcepts: AIConcept[] | undefined;
        if (data.allConcepts && data.allConcepts.length > 0) {
          console.log(
            `[V2 Stage 3] ${data.allConcepts.length} raw concepts available as fallback`
          );
          allConcepts = data.allConcepts.map((c) => ({
            id: `concept_${c.name.toLowerCase().replace(/\s+/g, "_")}`,
            name: c.name,
            description: c.description,
            whyHot: c.whyHot,
            useCases: c.useCases,
            keywords: [],
            category: c.category as AIConcept["category"],
            hypeLevel: c.hypeLevel as AIConcept["hypeLevel"],
            lastUpdated: new Date(),
          }));
        }

        const result = await generateIdeasFromContext(
          openai,
          data.profile,
          data.gaps,
          matchedConcepts,
          allConcepts
        );

        // Log cost
        await logApiCost(userId, "v2-stage3-generate-ideas", result.costInfo, {
          companyName: data.profile.companyName,
          operationDetails: {
            companyId: data.companyId,
            stage: "3-generate-ideas",
            ideasGenerated: result.ideas.length,
          },
        });

        console.log(
          `[V2 Stage 3] Complete: Generated ${result.ideas.length} ideas`
        );

        return {
          success: true,
          ideas: result.ideas,
          costInfo: result.costInfo,
          generatedAt: new Date().toISOString(),
        };
      } catch (error: any) {
        console.error("[V2 Stage 3] Error:", error);

        if (error instanceof functions.https.HttpsError) {
          throw error;
        }

        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to generate ideas"
        );
      }
    }
  );
