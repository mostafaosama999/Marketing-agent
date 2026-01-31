/**
 * V2 Stage 1: Analyze Company Differentiators (Cloud Function)
 *
 * Wraps analyzeCompanyDifferentiators() as a callable cloud function.
 * Returns: CompanyProfile with unique differentiators
 */

import * as functions from "firebase-functions";
import OpenAI from "openai";
import {
  analyzeCompanyDifferentiators,
  DifferentiatorAnalysisInput,
  DifferentiatorAnalysisResult,
} from "../analyzeCompanyDifferentiators";
import { logApiCost } from "../../../utils/costTracker";

/**
 * Request for Stage 1
 */
export interface V2Stage1Request {
  companyId: string;
  companyName: string;
  website: string;
  apolloData?: DifferentiatorAnalysisInput["apolloData"];
  blogAnalysis?: DifferentiatorAnalysisInput["blogAnalysis"];
  companyType?: DifferentiatorAnalysisInput["companyType"];
}

/**
 * Response from Stage 1
 */
export type V2Stage1Response = DifferentiatorAnalysisResult;

/**
 * V2 Stage 1 Cloud Function
 *
 * Analyzes company to extract unique differentiators.
 * Typical time: 15-20 seconds
 */
export const v2Stage1Cloud = functions
  .runWith({
    timeoutSeconds: 120,
    memory: "512MB",
  })
  .https.onCall(
    async (data: V2Stage1Request, context): Promise<V2Stage1Response> => {
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
        console.log(`[V2 Stage 1] Starting for: ${data.companyName}`);

        const result = await analyzeCompanyDifferentiators(openai, {
          companyName: data.companyName,
          website: data.website,
          apolloData: data.apolloData,
          blogAnalysis: data.blogAnalysis,
          companyType: data.companyType,
        });

        // Log cost
        await logApiCost(
          userId,
          "v2-stage1-differentiators",
          result.costInfo,
          {
            companyName: data.companyName,
            website: data.website,
            operationDetails: {
              companyId: data.companyId,
              stage: "1-differentiators",
              differentiatorCount: result.profile.uniqueDifferentiators.length,
            },
          }
        );

        console.log(
          `[V2 Stage 1] Complete: Found ${result.profile.uniqueDifferentiators.length} differentiators`
        );

        return result;
      } catch (error: any) {
        console.error("[V2 Stage 1] Error:", error);

        if (error instanceof functions.https.HttpsError) {
          throw error;
        }

        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to analyze differentiators"
        );
      }
    }
  );
