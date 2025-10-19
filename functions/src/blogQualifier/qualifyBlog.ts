import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {qualifyCompany} from "../utils/blogQualifierService";
import {CompanyInput, BlogQualificationResult} from "../types";
import {logApiCost} from "../utils/costTracker";

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

    if (!leadId || typeof leadId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Lead ID is required and must be a string"
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

      // Save qualification result to the lead in Firestore
      const db = admin.firestore();
      const leadRef = db.collection("leads").doc(leadId);

      await leadRef.update({
        blogQualified: result.qualified,
        blogQualificationData: result,
        blogQualifiedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Saved qualification result to lead ${leadId}`);

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
