/**
 * Generate Offer Ideas Cloud Function (Stage 2)
 *
 * Based on company type from Stage 1:
 * - If "Generative AI" → run GenAI-specific prompt
 * - Otherwise → run non-GenAI prompt
 *
 * Results saved to: entities/{companyId}/offerAnalysis
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";
import OpenAI from "openai";
import {getGenAIIdeasPrompt, getNonGenAIIdeasPrompt} from "./prompts";
import {
  extractTokenUsage,
  calculateCost,
  logApiCost,
} from "../utils/costTracker";
import {CompanyAnalysis} from "./analyzeCompanyWebsite";

/**
 * Blog Idea
 */
export interface BlogIdea {
  title: string;
  whyItFits: string;
  whatReaderLearns: string[];
  keyStackTools: string[];
  angleToAvoidDuplication: string;
  platform?: string;
  specificUse?: string;
  companyTool?: string;
}

/**
 * Request Interface
 */
interface GenerateOfferIdeasRequest {
  companyId: string;
  companyName: string;
  website: string;
  companyAnalysis: CompanyAnalysis;
  blogContent?: string;
  specificRequirements?: string;
}

/**
 * Response Interface
 */
interface GenerateOfferIdeasResponse {
  success: boolean;
  ideas: BlogIdea[];
  promptUsed: "genai" | "non-genai";
  costInfo: {
    totalCost: number;
    inputTokens: number;
    outputTokens: number;
  };
  generatedAt: string;
}

/**
 * Clean JSON response from OpenAI (remove markdown code blocks)
 */
function cleanJsonResponse(content: string): string {
  return content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

/**
 * Generate Offer Ideas - Stage 2
 *
 * Runtime: 300 seconds (5 minutes)
 * Memory: 512MB
 */
export const generateOfferIdeasCloud = functions
  .runWith({
    timeoutSeconds: 300,
    memory: "512MB",
  })
  .https.onCall(
    async (
      data: GenerateOfferIdeasRequest,
      context
    ): Promise<GenerateOfferIdeasResponse> => {
      // 1. Authentication check
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userId = context.auth.uid;

      // 2. Validate input
      const {companyId, companyName, website, companyAnalysis, blogContent, specificRequirements} = data;

      if (!companyId || typeof companyId !== "string") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Company ID is required"
        );
      }

      if (!companyAnalysis || !companyAnalysis.companyType) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Company analysis with companyType is required"
        );
      }

      // 3. Initialize OpenAI
      const openaiApiKey =
        functions.config().openai?.key || process.env.OPENAI_API_KEY || "";

      if (!openaiApiKey) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "OpenAI API key not configured"
        );
      }

      const openai = new OpenAI({apiKey: openaiApiKey});
      const db = admin.firestore();

      try {
        console.log(`[Stage 2] Generating ideas for: ${companyName} (${companyAnalysis.companyType})`);

        // Determine which prompt to use
        const isGenAI = companyAnalysis.companyType === "Generative AI";
        const promptUsed = isGenAI ? "genai" : "non-genai";

        const prompt = isGenAI
          ? getGenAIIdeasPrompt(companyName, website, blogContent, specificRequirements)
          : getNonGenAIIdeasPrompt(companyName, website, blogContent, specificRequirements);

        console.log(`[Stage 2] Using ${promptUsed.toUpperCase()} prompt`);

        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          response_format: {type: "json_object"},
          temperature: 0.7,
          max_tokens: 3000,
          messages: [
            {
              role: "system",
              content: isGenAI
                ? "You are an expert technical content strategist specializing in Generative AI, LLMs, and MLOps. You create highly specific, technical article ideas for GenAI companies."
                : "You are an expert technical content strategist specializing in B2B SaaS, developer tools, and data platforms. You create highly specific, technical article ideas that showcase tools and real-world use cases.",
            },
            {role: "user", content: prompt},
          ],
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new functions.https.HttpsError(
            "internal",
            "Failed to generate blog ideas"
          );
        }

        const ideasResponse: {ideas: BlogIdea[]} = JSON.parse(
          cleanJsonResponse(content)
        );

        if (!ideasResponse.ideas || ideasResponse.ideas.length === 0) {
          throw new functions.https.HttpsError(
            "internal",
            "No blog ideas were generated"
          );
        }

        const ideas = ideasResponse.ideas;

        // Calculate cost
        const tokens = extractTokenUsage(completion);
        let totalCost = 0;
        let inputTokens = 0;
        let outputTokens = 0;

        if (tokens) {
          const costInfo = calculateCost(tokens, "gpt-4-turbo");
          totalCost = costInfo.totalCost;
          inputTokens = tokens.inputTokens;
          outputTokens = tokens.outputTokens;

          // Log cost
          await logApiCost(userId, "genai-blog-idea", costInfo, {
            companyName,
            website,
            operationDetails: {
              companyId,
              stage: "idea_generation",
              promptUsed,
              ideasCount: ideas.length,
            },
          });
        }

        const generatedAt = new Date().toISOString();

        // Get existing stage 1 cost from the company doc
        const companyDoc = await db.collection("entities").doc(companyId).get();
        const existingAnalysis = companyDoc.data()?.offerAnalysis;
        const stage1Cost = existingAnalysis?.costInfo?.stage1Cost || 0;

        // Save complete result to Firestore
        const offerAnalysisData = {
          companyAnalysis,
          ideas,
          promptUsed,
          stage: "complete",
          costInfo: {
            stage1Cost,
            stage2Cost: totalCost,
            totalCost: stage1Cost + totalCost,
          },
          analyzedAt: existingAnalysis?.analyzedAt || generatedAt,
          ideasGeneratedAt: generatedAt,
          analyzedBy: userId,
        };

        await db.collection("entities").doc(companyId).set({
          offerAnalysis: offerAnalysisData,
          latestOfferAnalysis: {
            companyType: companyAnalysis.companyType,
            ideasCount: ideas.length,
            analyzedAt: offerAnalysisData.analyzedAt,
            totalCost: offerAnalysisData.costInfo.totalCost,
          },
          // NOTE: pendingOfferApproval is now set by the frontend after ALL V1/V2/V3 pipelines complete
          updatedAt: FieldValue.serverTimestamp(),
        }, {merge: true});

        // Also save to subcollection for history
        await db
          .collection("entities")
          .doc(companyId)
          .collection("offerAnalysis")
          .add({
            ...offerAnalysisData,
            createdAt: FieldValue.serverTimestamp(),
          });

        console.log(`[Stage 2] Complete: ${ideas.length} ideas generated`);

        // NOTE: Slack notification moved to frontend (sent after ALL V1/V2/V3 complete)
        // See sendOfferSlackNotificationCloud

        return {
          success: true,
          ideas,
          promptUsed,
          costInfo: {totalCost, inputTokens, outputTokens},
          generatedAt,
        };
      } catch (error: any) {
        console.error("[Stage 2] Error:", error);

        if (error instanceof functions.https.HttpsError) {
          throw error;
        }

        if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
          throw new functions.https.HttpsError(
            "deadline-exceeded",
            "Idea generation took too long. Please try again."
          );
        }

        throw new functions.https.HttpsError(
          "unknown",
          error.message || "Failed to generate ideas"
        );
      }
    }
  );
