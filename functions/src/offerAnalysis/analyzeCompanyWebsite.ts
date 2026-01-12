/**
 * Company Website Analysis Cloud Function (Stage 1)
 *
 * Categorizes company type: GenAI, AI tool, Data science, Service provider, Content maker
 * Results saved to: entities/{companyId}/offerAnalysis
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";
import OpenAI from "openai";
import {getWebsiteAnalysisPrompt} from "./prompts";
import {
  extractTokenUsage,
  calculateCost,
  logApiCost,
} from "../utils/costTracker";

/**
 * Company Analysis Response
 */
export interface CompanyAnalysis {
  companyName: string;
  companyType: "Generative AI" | "AI tool" | "Data science" | "Service provider" | "Content maker";
  companySummary: string;
  canTrainLLMs: boolean;
  reliesOnAI: boolean;
  businessModel: "B2B" | "B2C" | "Both";
  country: string;
  linkedinUrl: string | null;
  blogUrl: string | null;
}

/**
 * Request Interface
 */
interface AnalyzeCompanyWebsiteRequest {
  companyId: string;
  companyName: string;
  website: string;
  blogContent?: string;
}

/**
 * Response Interface
 */
interface AnalyzeCompanyWebsiteResponse {
  success: boolean;
  companyAnalysis: CompanyAnalysis;
  costInfo: {
    totalCost: number;
    inputTokens: number;
    outputTokens: number;
  };
  analyzedAt: string;
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
 * Analyze Company Website - Stage 1
 *
 * Runtime: 300 seconds (5 minutes)
 * Memory: 512MB
 */
export const analyzeCompanyWebsiteCloud = functions
  .runWith({
    timeoutSeconds: 300,
    memory: "512MB",
  })
  .https.onCall(
    async (
      data: AnalyzeCompanyWebsiteRequest,
      context
    ): Promise<AnalyzeCompanyWebsiteResponse> => {
      // 1. Authentication check
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userId = context.auth.uid;

      // 2. Validate input
      const {companyId, companyName, website, blogContent} = data;

      if (!companyId || typeof companyId !== "string") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Company ID is required and must be a string"
        );
      }

      if (!companyName || typeof companyName !== "string") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Company name is required and must be a string"
        );
      }

      if (!website || typeof website !== "string") {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Website URL is required and must be a string"
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
        console.log(`[Stage 1] Analyzing company: ${companyName} (${website})`);

        const prompt = getWebsiteAnalysisPrompt(companyName, website, blogContent);

        const completion = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          response_format: {type: "json_object"},
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content: "You are an expert B2B company analyst specializing in categorizing companies for outreach purposes.",
            },
            {role: "user", content: prompt},
          ],
        });

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new functions.https.HttpsError(
            "internal",
            "Failed to analyze company website"
          );
        }

        const companyAnalysis: CompanyAnalysis = JSON.parse(
          cleanJsonResponse(content)
        );

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
              stage: "website_analysis",
              companyType: companyAnalysis.companyType,
            },
          });
        }

        const analyzedAt = new Date().toISOString();

        // Save partial result to Firestore
        await db.collection("entities").doc(companyId).set({
          offerAnalysis: {
            companyAnalysis,
            stage: "website_analysis_complete",
            costInfo: {stage1Cost: totalCost, totalCost},
            analyzedAt,
            analyzedBy: userId,
          },
          updatedAt: FieldValue.serverTimestamp(),
        }, {merge: true});

        console.log(`[Stage 1] Complete: ${companyAnalysis.companyType}`);

        return {
          success: true,
          companyAnalysis,
          costInfo: {totalCost, inputTokens, outputTokens},
          analyzedAt,
        };
      } catch (error: any) {
        console.error("[Stage 1] Error:", error);

        if (error instanceof functions.https.HttpsError) {
          throw error;
        }

        if (error.message?.includes("timeout") || error.code === "ETIMEDOUT") {
          throw new functions.https.HttpsError(
            "deadline-exceeded",
            "Website analysis took too long. Please try again."
          );
        }

        throw new functions.https.HttpsError(
          "unknown",
          error.message || "Failed to analyze website"
        );
      }
    }
  );
