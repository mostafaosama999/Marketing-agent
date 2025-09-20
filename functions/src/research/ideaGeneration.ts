import * as functions from "firebase-functions";
import {generateIdeasForCompany} from "../utils/ideaGenerationUtils";
import {IdeaGenerationRequest} from "../types";

/**
 * Generate content ideas using OpenAI
 */
export const generateIdeas = functions.https.onCall(async (data, context) => {
  try {
    const requestData: IdeaGenerationRequest = data;

    if (!requestData.companyAnalysis) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Company analysis is required"
      );
    }

    console.log(`Generating ideas for: ${requestData.companyAnalysis.title}`);

    // Generate ideas using OpenAI
    const ideaResponse = await generateIdeasForCompany(requestData);

    return {
      success: true,
      data: ideaResponse,
    };
  } catch (error) {
    console.error("Idea generation error:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
});