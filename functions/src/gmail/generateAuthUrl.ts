/**
 * Generate OAuth2 Authorization URL
 * One-time setup function to get the OAuth consent screen URL
 */

import * as functions from "firebase-functions";
import {HttpsError} from "firebase-functions/v1/auth";
import {generateAuthUrl} from "./oauthService";

export const getGmailAuthUrl = functions.https.onCall(
  async (_data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to generate auth URL"
      );
    }

    console.log(`Auth URL requested by user: ${context.auth.uid}`);

    try {
      const authUrl = generateAuthUrl();

      return {
        success: true,
        authUrl,
        message: "Open this URL to authorize Gmail access",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error generating auth URL:", error);

      throw new HttpsError(
        "internal",
        `Failed to generate auth URL: ${errorMessage}`
      );
    }
  }
);
