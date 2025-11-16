/**
 * Exchange OAuth2 Authorization Code for Tokens
 * One-time setup function to save refresh token
 */

import * as functions from "firebase-functions";
import {HttpsError} from "firebase-functions/v1/auth";
import {exchangeCodeForTokens} from "./oauthService";

interface ExchangeCodeRequest {
  code: string;
}

interface ExchangeCodeResponse {
  success: boolean;
  message: string;
}

export const exchangeGmailOAuthCode = functions.https.onCall(
  async (
    data: ExchangeCodeRequest,
    context
  ): Promise<ExchangeCodeResponse> => {
    // Check authentication
    if (!context.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to exchange OAuth code"
      );
    }

    console.log(`OAuth code exchange requested by user: ${context.auth.uid}`);

    if (!data.code) {
      throw new HttpsError(
        "invalid-argument",
        "Authorization code is required"
      );
    }

    try {
      const result = await exchangeCodeForTokens(data.code);

      console.log("✅ OAuth tokens successfully exchanged and stored");

      return {
        success: true,
        message: result.message,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error exchanging OAuth code:", error);

      throw new HttpsError(
        "internal",
        `Failed to exchange OAuth code: ${errorMessage}`
      );
    }
  }
);
