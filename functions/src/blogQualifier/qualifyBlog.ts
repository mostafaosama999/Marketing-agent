import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";
import {qualifyCompany} from "../utils/blogQualifierService";
import {CompanyInput, BlogQualificationResult} from "../types";
import {logApiCost} from "../utils/costTracker";

/**
 * Cloud function to qualify a company's blog
 * Timeout: 300 seconds (5 minutes) - blog analysis can take time
 */
export const qualifyCompanyBlog = functions
  .runWith({
    timeoutSeconds: 300, // 5 minutes
    memory: "512MB", // Increased memory for large blog processing
  })
  .https.onCall(
    async (data, context): Promise<BlogQualificationResult> => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to qualify blogs"
      );
    }

    // Validate input
    const {companyName, website, leadId} = data;

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

    // leadId is optional - only required when updating a lead
    if (leadId && typeof leadId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Lead ID must be a string if provided"
      );
    }

    // Get OpenAI API key from environment config
    const openaiApiKey = functions.config().openai?.key || process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "OpenAI API key not configured. Run: firebase functions:config:set openai.key=YOUR_KEY"
      );
    }

    try {
      const company: CompanyInput = {
        name: companyName,
        website,
      };

      console.log(`Qualifying blog for: ${companyName} (${website})`);

      const result = await qualifyCompany(company, openaiApiKey);

      console.log(`Qualification complete for ${companyName}: ${result.qualified ? "QUALIFIED" : "NOT QUALIFIED"}`);

      // Log API cost if available
      if (result.costInfo && context.auth) {
        await logApiCost(
          context.auth.uid,
          "blog-qualification",
          result.costInfo,
          {
            leadId,
            companyName,
            website,
          }
        );
      }

      // Save qualification result to the lead in Firestore (only if leadId provided)
      if (leadId) {
        const db = admin.firestore();
        const leadRef = db.collection("leads").doc(leadId);

        await leadRef.update({
          blogQualified: result.qualified,
          blogQualificationData: result,
          blogQualifiedAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });

        console.log(`Saved qualification result to lead ${leadId}`);
      }

      return result;
    } catch (error: any) {
      console.error("Error qualifying company blog:", error);

      // Check if it's a timeout error
      if (error.code === "ETIMEDOUT" || error.code === "ESOCKETTIMEDOUT" ||
          error.message?.includes("timeout") || error.message?.includes("timed out")) {
        throw new functions.https.HttpsError(
          "deadline-exceeded",
          "Blog analysis took too long to complete. The blog may have too many posts or slow RSS feed. Please try again or contact support if the issue persists."
        );
      }

      // Check if it's a network error
      if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED" ||
          error.message?.includes("socket hang up") || error.message?.includes("network")) {
        throw new functions.https.HttpsError(
          "unavailable",
          "Unable to reach the blog website. The site may be down or blocking our requests. Please verify the blog URL is accessible and try again."
        );
      }

      // Generic error with helpful message
      throw new functions.https.HttpsError(
        "unknown",
        error.message || "Failed to analyze blog. Please check the blog URL and try again."
      );
    }
  }
);
