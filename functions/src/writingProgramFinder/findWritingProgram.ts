import * as functions from "firebase-functions";
import {findWritingProgram as findProgram} from "../utils/writingProgramFinderUtils";
import {WritingProgramFinderResult} from "../types";
import {logApiCost} from "../utils/costTracker";

/**
 * Cloud function to find writing programs for a website
 * Timeout: 300 seconds (5 minutes) - searching and AI analysis can take time
 */
export const findWritingProgramCloud = functions
  .runWith({
    timeoutSeconds: 300, // 5 minutes
    memory: "512MB",
  })
  .https.onCall(
    async (data, context): Promise<WritingProgramFinderResult> => {
    // Verify authentication (optional - remove if you want to test without auth)
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to find writing programs"
      );
    }

    // Validate input
    const {website, useAiFallback, concurrent, timeout, leadId} = data;

    if (!website || typeof website !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Website URL is required and must be a string"
      );
    }

    try {
      console.log(`Finding writing program for: ${website}`);

      const result = await findProgram(website, {
        useAiFallback: useAiFallback !== undefined ? useAiFallback : true,
        concurrent: concurrent || 30,
        timeout: timeout || 3000,
      });

      console.log(`Found ${result.validUrls.length} URLs for ${website}`);

      // Log API cost if available
      if (result.costInfo && context.auth) {
        await logApiCost(
          context.auth.uid,
          "writing-program-finder",
          result.costInfo,
          {
            leadId,
            website,
            operationDetails: {
              validUrlsFound: result.validUrls.length,
              usedAiFallback: result.usedAiFallback,
            },
          }
        );
      }

      return result;
    } catch (error: any) {
      console.error("Error finding writing program:", error);

      // Check if it's a timeout error
      if (error.code === "ETIMEDOUT" || error.code === "ESOCKETTIMEDOUT" ||
          error.message?.includes("timeout") || error.message?.includes("timed out")) {
        throw new functions.https.HttpsError(
          "deadline-exceeded",
          "Writing program search took too long to complete. The website may be slow or have many pages. Please try again."
        );
      }

      // Check if it's a network error
      if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED" ||
          error.message?.includes("socket hang up") || error.message?.includes("network")) {
        throw new functions.https.HttpsError(
          "unavailable",
          "Unable to reach the website. The site may be down or blocking our requests. Please verify the website URL and try again."
        );
      }

      // Generic error with helpful message
      throw new functions.https.HttpsError(
        "unknown",
        error.message || "Failed to find writing program. Please check the website URL and try again."
      );
    }
  }
);
