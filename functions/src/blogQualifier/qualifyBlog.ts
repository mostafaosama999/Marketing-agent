import * as functions from "firebase-functions";
import {qualifyCompany} from "../utils/blogQualifierService";
import {CompanyInput, BlogQualificationResult} from "../types";

/**
 * Cloud function to qualify a company's blog
 */
export const qualifyCompanyBlog = functions.https.onCall(
  async (data, context): Promise<BlogQualificationResult> => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to qualify blogs"
      );
    }

    // Validate input
    const {companyName, website} = data;

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

      return result;
    } catch (error: any) {
      console.error("Error qualifying company blog:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to qualify company blog: ${error.message || "Unknown error"}`
      );
    }
  }
);
