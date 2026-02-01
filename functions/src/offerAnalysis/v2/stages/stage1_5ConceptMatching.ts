/**
 * V2 Stage 1.5: AI Concept Matching (Cloud Function)
 *
 * NEW: Fetches AI concepts and matches them to the company profile.
 * This enables bottom-of-funnel tutorials combining AI trends with company products.
 *
 * Returns: Matched AI concepts for use in Stage 3
 */

import * as functions from "firebase-functions";
import OpenAI from "openai";
import { CompanyProfile } from "../analyzeCompanyDifferentiators";
import { getAIConcepts } from "../../../services/aiConcepts";
import { matchConceptsToCompany } from "./stageMatchConcepts";
import { logApiCost } from "../../../utils/costTracker";

/**
 * Request for Stage 1.5
 */
export interface V2Stage1_5Request {
  companyId: string;
  profile: CompanyProfile;
}

/**
 * Simplified matched concept for frontend display
 */
export interface MatchedConceptSimple {
  name: string;
  fitScore: number;
  fitReason: string;
  productIntegration: string;
  tutorialAngle: string;
}

/**
 * Response from Stage 1.5
 */
export interface V2Stage1_5Response {
  success: boolean;
  matchedConcepts: MatchedConceptSimple[];
  conceptsEvaluated: number;
  stage0Cost: number;
  stage1_5Cost: number;
  cached: boolean;
  generatedAt: string;
}

/**
 * V2 Stage 1.5 Cloud Function
 *
 * Fetches AI concepts (cached 24h) and matches them to company.
 * Typical time: 5-15 seconds (most of it is matching, concepts are usually cached)
 */
export const v2Stage1_5Cloud = functions
  .runWith({
    timeoutSeconds: 120,
    memory: "512MB",
  })
  .https.onCall(
    async (data: V2Stage1_5Request, context): Promise<V2Stage1_5Response> => {
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
        console.log(`[V2 Stage 1.5] Starting for: ${data.profile.companyName}`);

        // Stage 0: Get AI concepts (cached 24h)
        console.log("[V2 Stage 1.5] Fetching AI concepts...");
        const conceptsResult = await getAIConcepts(openai, 24);
        const stage0Cost = conceptsResult.extractionCost;

        console.log(
          `[V2 Stage 1.5] Got ${conceptsResult.concepts.length} concepts ` +
            `(cached: ${conceptsResult.cached}, cost: $${stage0Cost.toFixed(4)})`
        );

        // If no concepts, return empty
        if (conceptsResult.concepts.length === 0) {
          return {
            success: true,
            matchedConcepts: [],
            conceptsEvaluated: 0,
            stage0Cost,
            stage1_5Cost: 0,
            cached: conceptsResult.cached,
            generatedAt: new Date().toISOString(),
          };
        }

        // Stage 1.5: Match concepts to company
        console.log("[V2 Stage 1.5] Matching concepts to company...");
        const matchingResult = await matchConceptsToCompany(
          openai,
          conceptsResult.concepts,
          data.profile
        );

        const stage1_5Cost = matchingResult.matchingCost;

        console.log(
          `[V2 Stage 1.5] Matched ${matchingResult.matchedConcepts.length}/${conceptsResult.concepts.length} concepts ` +
            `(cost: $${stage1_5Cost.toFixed(4)})`
        );

        // Simplify for frontend
        const simplifiedConcepts: MatchedConceptSimple[] =
          matchingResult.matchedConcepts.map((mc) => ({
            name: mc.concept.name,
            fitScore: mc.fitScore,
            fitReason: mc.fitReason,
            productIntegration: mc.productIntegration,
            tutorialAngle: mc.tutorialAngle,
          }));

        // Log cost
        await logApiCost(
          userId,
          "v2-stage1.5-concept-matching",
          {
            totalCost: stage0Cost + stage1_5Cost,
            inputCost: 0,
            outputCost: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            model: "gpt-4-turbo",
          },
          {
            companyName: data.profile.companyName,
            operationDetails: {
              companyId: data.companyId,
              stage: "1.5-concept-matching",
              conceptsEvaluated: conceptsResult.concepts.length,
              conceptsMatched: matchingResult.matchedConcepts.length,
              cached: conceptsResult.cached,
            },
          }
        );

        return {
          success: true,
          matchedConcepts: simplifiedConcepts,
          conceptsEvaluated: conceptsResult.concepts.length,
          stage0Cost,
          stage1_5Cost,
          cached: conceptsResult.cached,
          generatedAt: new Date().toISOString(),
        };
      } catch (error: any) {
        console.error("[V2 Stage 1.5] Error:", error);

        // Return empty on error rather than failing (concepts are optional)
        console.warn("[V2 Stage 1.5] Returning empty due to error");
        return {
          success: true,
          matchedConcepts: [],
          conceptsEvaluated: 0,
          stage0Cost: 0,
          stage1_5Cost: 0,
          cached: false,
          generatedAt: new Date().toISOString(),
        };
      }
    }
  );
