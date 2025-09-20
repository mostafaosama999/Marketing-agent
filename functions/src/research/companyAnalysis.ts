import * as functions from "firebase-functions";
import {analyzeCompany} from "../utils/companyAnalysisUtils";

/**
 * Analyze company homepage and extract key information
 */
export const researchCompany = functions.https.onCall(async (data, context) => {
  try {
    const {url} = data;

    if (!url) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "URL is required"
      );
    }

    const companyAnalysis = await analyzeCompany(url);

    return {
      success: true,
      data: companyAnalysis,
    };
  } catch (error) {
    console.error("Company analysis error:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
});