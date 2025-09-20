import * as functions from "firebase-functions";
import {analyzeBlogFromCompany} from "../utils/blogDiscoveryUtils";

/**
 * Discover and analyze company blog
 */
export const discoverBlog = functions.https.onCall(async (data, context) => {
  try {
    const {companyUrl, blogUrl} = data;

    if (!companyUrl) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Company URL is required"
      );
    }

    const blogAnalysis = await analyzeBlogFromCompany(companyUrl, blogUrl);

    return {
      success: true,
      data: blogAnalysis,
    };
  } catch (error) {
    console.error("Blog discovery error:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
});