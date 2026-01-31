/**
 * V2 Stage 3: Generate Ideas (Cloud Function)
 *
 * Wraps generateIdeasFromContext() as a callable cloud function.
 * Returns: Raw blog ideas before validation
 */

import * as functions from "firebase-functions";
import OpenAI from "openai";
import { generateIdeasFromContext } from "../generateIdeasV2";
import { CompanyProfile } from "../analyzeCompanyDifferentiators";
import { ContentGap } from "../analyzeContentGaps";
import { BlogIdeaV2 } from "../promptsV2";
import { logApiCost, CostInfo } from "../../../utils/costTracker";

/**
 * Request for Stage 3
 */
export interface V2Stage3Request {
  companyId: string;
  profile: CompanyProfile;
  gaps: ContentGap[];
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

        const result = await generateIdeasFromContext(
          openai,
          data.profile,
          data.gaps
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
