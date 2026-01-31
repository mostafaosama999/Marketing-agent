/**
 * V2 Stage 2: Analyze Content Gaps (Cloud Function)
 *
 * Wraps analyzeContentGaps() as a callable cloud function.
 * Returns: List of content gap opportunities
 */

import * as functions from "firebase-functions";
import OpenAI from "openai";
import {
  analyzeContentGaps,
  ContentGapAnalysisResult,
} from "../analyzeContentGaps";
import { CompanyProfile } from "../analyzeCompanyDifferentiators";
import { logApiCost } from "../../../utils/costTracker";

/**
 * Request for Stage 2
 */
export interface V2Stage2Request {
  companyId: string;
  profile: CompanyProfile;
  blogContentSummary?: string;
}

/**
 * Response from Stage 2
 */
export type V2Stage2Response = ContentGapAnalysisResult;

/**
 * V2 Stage 2 Cloud Function
 *
 * Analyzes content gaps based on company profile.
 * Typical time: 15-20 seconds
 */
export const v2Stage2Cloud = functions
  .runWith({
    timeoutSeconds: 120,
    memory: "512MB",
  })
  .https.onCall(
    async (data: V2Stage2Request, context): Promise<V2Stage2Response> => {
      // Authentication check
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userId = context.auth.uid;

      // Validate input
      if (!data.companyId || !data.profile) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "companyId and profile are required"
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
        console.log(`[V2 Stage 2] Starting for: ${data.profile.companyName}`);

        const result = await analyzeContentGaps(
          openai,
          data.profile,
          data.blogContentSummary
        );

        // Log cost
        await logApiCost(userId, "v2-stage2-content-gaps", result.costInfo, {
          companyName: data.profile.companyName,
          operationDetails: {
            companyId: data.companyId,
            stage: "2-content-gaps",
            gapsFound: result.gaps.length,
          },
        });

        console.log(`[V2 Stage 2] Complete: Found ${result.gaps.length} gaps`);

        return result;
      } catch (error: any) {
        console.error("[V2 Stage 2] Error:", error);

        if (error instanceof functions.https.HttpsError) {
          throw error;
        }

        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to analyze content gaps"
        );
      }
    }
  );
