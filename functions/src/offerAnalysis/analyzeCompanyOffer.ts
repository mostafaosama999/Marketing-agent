/**
 * Company Offer Analysis Cloud Function
 *
 * Two-stage AI pipeline:
 * 1. Website Analysis - Categorize company type (GenAI, AI tool, Data science, Service provider, Content maker)
 * 2. Blog Idea Generation - Based on company type:
 *    - If "Generative AI" → run GenAI-specific prompt
 *    - Otherwise → run non-GenAI prompt
 *
 * Results saved to: entities/{companyId}/offerAnalysis
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";
import OpenAI from "openai";
import {
  getWebsiteAnalysisPrompt,
  getGenAIIdeasPrompt,
  getNonGenAIIdeasPrompt,
} from "./prompts";
import {
  extractTokenUsage,
  calculateCost,
  logApiCost,
  CostInfo,
} from "../utils/costTracker";

/**
 * Company Analysis Response (Stage 1)
 */
interface CompanyAnalysis {
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
 * Blog Idea (Stage 2)
 */
interface BlogIdea {
  title: string;
  whyItFits: string;
  whatReaderLearns: string[];
  keyStackTools: string[];
  angleToAvoidDuplication: string;
  platform?: string; // Only for GenAI ideas
  specificUse?: string; // Only for GenAI ideas
  companyTool?: string; // Only for GenAI ideas
}

/**
 * Request Interface
 */
interface AnalyzeCompanyOfferRequest {
  companyId: string;
  companyName: string;
  website: string;
  blogContent?: string;
  specificRequirements?: string;
}

/**
 * Response Interface
 */
interface AnalyzeCompanyOfferResponse {
  success: boolean;
  companyAnalysis: CompanyAnalysis;
  ideas: BlogIdea[];
  promptUsed: "genai" | "non-genai";
  costInfo: {
    stage1Cost: number;
    stage2Cost: number;
    totalCost: number;
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
 * Analyze Company Offer - Two-Stage Pipeline
 *
 * Runtime: 540 seconds (9 minutes) - two AI calls can take time
 * Memory: 1GB - processing large website/blog content
 */
export const analyzeCompanyOffer = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: "1GB",
  })
  .https.onCall(
    async (
      data: AnalyzeCompanyOfferRequest,
      context
    ): Promise<AnalyzeCompanyOfferResponse> => {
      // 1. Authentication check
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userId = context.auth.uid;

      // 2. Validate input
      const {companyId, companyName, website, blogContent, specificRequirements} = data;

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
          "OpenAI API key not configured. Run: firebase functions:config:set openai.key=YOUR_KEY"
        );
      }

      const openai = new OpenAI({apiKey: openaiApiKey});
      const db = admin.firestore();

      try {
        console.log(`🚀 Starting offer analysis for: ${companyName} (${website})`);

        // ==========================================
        // STAGE 1: Website/Company Analysis
        // ==========================================

        console.log("📊 Stage 1: Analyzing company website...");

        const stage1Prompt = getWebsiteAnalysisPrompt(
          companyName,
          website,
          blogContent
        );

        const stage1Completion = await openai.chat.completions.create({
          model: "gpt-4-turbo",
          response_format: {type: "json_object"},
          temperature: 0.3,
          messages: [
            {
              role: "system",
              content: "You are an expert B2B company analyst specializing in categorizing companies for outreach purposes.",
            },
            {role: "user", content: stage1Prompt},
          ],
        });

        const stage1Content = stage1Completion.choices[0]?.message?.content;
        if (!stage1Content) {
          throw new functions.https.HttpsError(
            "internal",
            "Failed to analyze company website"
          );
        }

        const companyAnalysis: CompanyAnalysis = JSON.parse(
          cleanJsonResponse(stage1Content)
        );

        // Calculate Stage 1 cost
        const stage1Tokens = extractTokenUsage(stage1Completion);
        let stage1Cost = 0;
        let stage1CostInfo: CostInfo | null = null;

        if (stage1Tokens) {
          stage1CostInfo = calculateCost(stage1Tokens, "gpt-4-turbo");
          stage1Cost = stage1CostInfo.totalCost;
          console.log(`💰 Stage 1 cost: $${stage1Cost.toFixed(4)}`);
        }

        console.log(`✓ Company categorized as: ${companyAnalysis.companyType}`);

        // ==========================================
        // STAGE 2: Generate Blog Ideas
        // ==========================================

        console.log("💡 Stage 2: Generating blog ideas...");

        // Determine which prompt to use based on company type
        const isGenAI = companyAnalysis.companyType === "Generative AI";
        const promptUsed = isGenAI ? "genai" : "non-genai";

        const stage2Prompt = isGenAI
          ? getGenAIIdeasPrompt(companyName, website, blogContent, specificRequirements)
          : getNonGenAIIdeasPrompt(companyName, website, blogContent, specificRequirements);

        console.log(`Using ${promptUsed.toUpperCase()} prompt for idea generation`);

        const stage2Completion = await openai.chat.completions.create({
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
            {role: "user", content: stage2Prompt},
          ],
        });

        const stage2Content = stage2Completion.choices[0]?.message?.content;
        if (!stage2Content) {
          throw new functions.https.HttpsError(
            "internal",
            "Failed to generate blog ideas"
          );
        }

        const ideasResponse: {ideas: BlogIdea[]} = JSON.parse(
          cleanJsonResponse(stage2Content)
        );

        if (!ideasResponse.ideas || ideasResponse.ideas.length === 0) {
          throw new functions.https.HttpsError(
            "internal",
            "No blog ideas were generated"
          );
        }

        const ideas = ideasResponse.ideas;

        // Calculate Stage 2 cost
        const stage2Tokens = extractTokenUsage(stage2Completion);
        let stage2Cost = 0;
        let stage2CostInfo: CostInfo | null = null;

        if (stage2Tokens) {
          stage2CostInfo = calculateCost(stage2Tokens, "gpt-4-turbo");
          stage2Cost = stage2CostInfo.totalCost;
          console.log(`💰 Stage 2 cost: $${stage2Cost.toFixed(4)}`);
        }

        console.log(`✓ Generated ${ideas.length} blog ideas`);

        // ==========================================
        // STAGE 3: Save Results to Firestore
        // ==========================================

        console.log("💾 Stage 3: Saving to Firestore...");

        const totalCost = stage1Cost + stage2Cost;
        const analyzedAt = new Date().toISOString();

        const offerAnalysisData = {
          companyAnalysis,
          ideas,
          promptUsed,
          costInfo: {
            stage1Cost,
            stage2Cost,
            totalCost,
          },
          analyzedAt,
          analyzedBy: userId,
          updatedAt: FieldValue.serverTimestamp(),
        };

        // Save to entities/{companyId}/offerAnalysis subcollection
        const offerAnalysisRef = db
          .collection("entities")
          .doc(companyId)
          .collection("offerAnalysis")
          .doc();

        await offerAnalysisRef.set(offerAnalysisData);

        console.log(`✓ Saved offer analysis to: companies/${companyId}/offerAnalysis/${offerAnalysisRef.id}`);

        // Update company document with latest analysis reference
        await db.collection("entities").doc(companyId).update({
          "latestOfferAnalysis": {
            id: offerAnalysisRef.id,
            companyType: companyAnalysis.companyType,
            ideasCount: ideas.length,
            analyzedAt,
            totalCost,
          },
          updatedAt: FieldValue.serverTimestamp(),
        });

        console.log(`✓ Updated company ${companyId} with latest analysis reference`);

        // ==========================================
        // STAGE 4: Log API Costs
        // ==========================================

        // Log Stage 1 cost
        if (stage1CostInfo) {
          await logApiCost(
            userId,
            "genai-blog-idea", // Using existing service type
            stage1CostInfo,
            {
              companyName,
              website,
              operationDetails: {
                companyId,
                stage: "website_analysis",
                companyType: companyAnalysis.companyType,
              },
            }
          );
        }

        // Log Stage 2 cost
        if (stage2CostInfo) {
          await logApiCost(
            userId,
            "genai-blog-idea", // Using existing service type
            stage2CostInfo,
            {
              companyName,
              website,
              operationDetails: {
                companyId,
                stage: "idea_generation",
                promptUsed,
                ideasCount: ideas.length,
              },
            }
          );
        }

        console.log(`✅ Offer analysis complete (Total cost: $${totalCost.toFixed(4)})`);

        return {
          success: true,
          companyAnalysis,
          ideas,
          promptUsed,
          costInfo: {
            stage1Cost,
            stage2Cost,
            totalCost,
          },
          analyzedAt,
        };
      } catch (error: any) {
        console.error("❌ Error analyzing company offer:", error);

        if (error instanceof functions.https.HttpsError) {
          throw error;
        }

        // Check for timeout errors
        if (
          error.code === "ETIMEDOUT" ||
          error.code === "ESOCKETTIMEDOUT" ||
          error.message?.includes("timeout") ||
          error.message?.includes("timed out")
        ) {
          throw new functions.https.HttpsError(
            "deadline-exceeded",
            "Analysis took too long to complete. Please try again or contact support if the issue persists."
          );
        }

        // Check for network errors
        if (
          error.code === "ENOTFOUND" ||
          error.code === "ECONNREFUSED" ||
          error.message?.includes("socket hang up") ||
          error.message?.includes("network")
        ) {
          throw new functions.https.HttpsError(
            "unavailable",
            "Unable to reach the website or OpenAI API. Please verify the website URL and try again."
          );
        }

        // Generic error
        throw new functions.https.HttpsError(
          "unknown",
          error.message || "Failed to analyze company offer. Please try again."
        );
      }
    }
  );
