/**
 * Check if Gmail OAuth is configured and connected
 */

import * as functions from "firebase-functions";
import {HttpsError} from "firebase-functions/v1/auth";
import {isGmailConnected} from "./oauthService";

export const checkGmailConnectionStatus = functions.https.onCall(
  async (_data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to check Gmail connection"
      );
    }

    try {
      const connected = await isGmailConnected();

      return {
        connected,
        message: connected ?
          "Gmail is connected and ready to sync" :
          "Gmail needs to be connected via OAuth",
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error checking Gmail connection:", error);

      throw new HttpsError(
        "internal",
        `Failed to check Gmail connection: ${errorMessage}`
      );
    }
  }
);
