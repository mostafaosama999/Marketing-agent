import * as functions from "firebase-functions";
import {findWritingProgram as findProgram} from "../utils/writingProgramFinderUtils";
import {WritingProgramFinderResult} from "../types";
import {logApiCost} from "../utils/costTracker";

/**
 * Cloud function to find writing programs for a website
 */
export const findWritingProgramCloud = functions.https.onCall(
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
        concurrent: concurrent || 5,
        timeout: timeout || 5000,
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
      throw new functions.https.HttpsError(
        "internal",
        `Failed to find writing program: ${error.message}`
      );
    }
  }
);
