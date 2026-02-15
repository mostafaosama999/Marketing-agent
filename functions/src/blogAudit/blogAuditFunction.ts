/**
 * Blog Audit Cloud Function
 *
 * Entry point for the Blog Audit agentic pipeline.
 * Handles authentication, validation, and error handling.
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import OpenAI from "openai";
import {BlogAuditRequest, BlogAuditResponse, CompanyContext} from "./types";
import {runBlogAuditAgent} from "./blogAuditAgent";
import {logApiCost} from "../utils/costTracker";

/**
 * Build CompanyContext from request data
 */
function buildCompanyContext(data: BlogAuditRequest): CompanyContext {
  return {
    companyId: data.companyId,
    companyName: data.companyName,
    website: data.website,
    industry: data.apolloData?.industry,
    industries: data.apolloData?.industries,
    technologies: data.apolloData?.technologies,
    description: data.apolloData?.description,
    keywords: data.apolloData?.keywords,
    employeeRange: data.apolloData?.employeeRange,
    existingBlogUrl: data.blogAnalysis?.blogUrl || undefined,
    existingBlogFrequency: data.blogAnalysis?.monthlyFrequency,
    existingBlogSummary: data.blogAnalysis?.contentSummary,
  };
}

/**
 * Cloud Function: Generate Blog Audit
 *
 * Callable function that runs the agentic blog audit pipeline.
 * Analyzes a company's blog vs competitors and produces a
 * persuasive offer paragraph with internal justification.
 */
export const generateBlogAuditCloud = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes (agent loop with web scraping)
    memory: "1GB",
  })
  .https.onCall(
    async (
      data: BlogAuditRequest,
      context
    ): Promise<BlogAuditResponse> => {
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

      const openai = new OpenAI({apiKey: openaiApiKey});

      try {
        console.log(`[BlogAudit] Starting for company: ${data.companyName} (${data.companyId})`);

        // Build context from request
        const companyContext = buildCompanyContext(data);

        // Run agent
        const result = await runBlogAuditAgent(openai, companyContext);

        // Save result to Firestore (dot-notation = non-destructive)
        const db = admin.firestore();
        const updateData: Record<string, any> = {
          "offerAnalysis.blogAudit": {
            offerParagraph: result.offerParagraph,
            internalJustification: result.internalJustification,
            companyBlogSnapshot: result.companyBlogSnapshot,
            competitorSnapshots: result.competitorSnapshots,
            competitorsAnalyzed: result.competitorsAnalyzed,
            agentIterations: result.agentIterations,
            toolCallsCount: result.toolCallsCount,
            costInfo: result.costInfo,
            generatedAt: result.generatedAt,
            model: result.model,
          },
        };

        // Clear any previous error
        updateData["offerAnalysis.blogAuditError"] = admin.firestore.FieldValue.delete();

        await db.collection("entities").doc(data.companyId).update(updateData);

        // Log cost
        await logApiCost(userId, "blog-audit", {
          totalCost: result.costInfo.totalCost,
          inputCost: 0,
          outputCost: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: result.costInfo.totalTokens,
          model: result.model,
        }, {
          companyName: data.companyName,
          website: data.website,
          operationDetails: {
            companyId: data.companyId,
            agentIterations: result.agentIterations,
            toolCallsCount: result.toolCallsCount,
            competitorsAnalyzed: result.competitorsAnalyzed,
            success: result.success,
          },
        });

        console.log(
          `[BlogAudit] Complete for ${data.companyName}: ` +
          `${result.competitorsAnalyzed} competitors, ` +
          `${result.agentIterations} iterations, ` +
          `$${result.costInfo.totalCost.toFixed(4)}`
        );

        return result;
      } catch (error: any) {
        console.error("[BlogAudit] Error:", error);

        // Save error to Firestore
        try {
          const db = admin.firestore();
          await db.collection("entities").doc(data.companyId).update({
            "offerAnalysis.blogAuditError": error.message || "Blog audit failed",
          });
        } catch (saveError) {
          console.error("[BlogAudit] Failed to save error to Firestore:", saveError);
        }

        if (error instanceof functions.https.HttpsError) {
          throw error;
        }

        throw new functions.https.HttpsError(
          "internal",
          error.message || "Failed to generate blog audit"
        );
      }
    }
  );
