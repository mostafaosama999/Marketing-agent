/**
 * AI Concepts Cloud Functions
 *
 * Management functions for the AI concepts system:
 * - refreshAIConceptsCloud: Force refresh concepts cache
 * - getAIConceptsStatusCloud: Get cache status and current concepts
 */

import * as functions from "firebase-functions";
import OpenAI from "openai";
import {
  refreshConcepts,
  getCacheStatus,
  getCachedConcepts,
} from "../../services/aiConcepts";

/**
 * Force refresh AI concepts cache
 *
 * Bypasses the 24h cache and fetches fresh concepts from:
 * - Hacker News
 * - arXiv
 * - RSS feeds (The Rundown AI, Import AI)
 *
 * Use sparingly - costs ~$0.01 per call for LLM extraction
 */
export const refreshAIConceptsCloud = functions
  .runWith({
    timeoutSeconds: 120,
    memory: "512MB",
  })
  .https.onCall(async (_data, context) => {
    // Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
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
      console.log("[AI Concepts] Force refreshing concepts...");

      const result = await refreshConcepts(openai, 24);

      console.log(
        `[AI Concepts] Refreshed: ${result.concepts.length} concepts, ` +
          `cost: $${result.extractionCost.toFixed(4)}`
      );

      return {
        success: true,
        conceptCount: result.concepts.length,
        extractionCost: result.extractionCost,
        rawSignalCount: result.rawSignalCount,
        concepts: result.concepts.map((c) => ({
          name: c.name,
          category: c.category,
          hypeLevel: c.hypeLevel,
          description: c.description,
          whyHot: c.whyHot,
        })),
        refreshedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("[AI Concepts] Error refreshing:", error);

      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to refresh AI concepts"
      );
    }
  });

/**
 * Get AI concepts cache status and current concepts
 *
 * Returns:
 * - Cache status (exists, age, expiration)
 * - Current cached concepts (if any)
 *
 * Free to call - no API costs
 */
export const getAIConceptsStatusCloud = functions
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
  })
  .https.onCall(async (_data, context) => {
    // Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    try {
      // Get cache status
      const status = await getCacheStatus();

      if (!status) {
        return {
          cacheExists: false,
          concepts: [],
          message: "No cached concepts. They will be fetched on next V2 generation.",
        };
      }

      // Get cached concepts
      const concepts = await getCachedConcepts(24);

      return {
        cacheExists: true,
        conceptCount: status.conceptCount,
        ageHours: Math.round(status.ageHours * 10) / 10,
        expiresInHours: Math.round(status.expiresInHours * 10) / 10,
        sources: status.sources,
        concepts: concepts?.map((c) => ({
          name: c.name,
          category: c.category,
          hypeLevel: c.hypeLevel,
          description: c.description,
          whyHot: c.whyHot,
          keywords: c.keywords,
        })) || [],
      };
    } catch (error: any) {
      console.error("[AI Concepts] Error getting status:", error);

      throw new functions.https.HttpsError(
        "internal",
        error.message || "Failed to get AI concepts status"
      );
    }
  });
