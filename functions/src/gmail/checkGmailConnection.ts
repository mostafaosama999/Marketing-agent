/**
 * Check if Gmail OAuth is configured and connected with proper scopes
 */

import * as functions from "firebase-functions";
import {HttpsError} from "firebase-functions/v1/auth";
import {getAuthenticatedOAuth2Client} from "./oauthService";
import {google} from "googleapis";

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
      // Try to get authenticated client and verify it works
      const oauth2Client = await getAuthenticatedOAuth2Client();
      const gmail = google.gmail({version: "v1", auth: oauth2Client});

      // Test the connection by getting user profile
      // This will fail if token is invalid or scopes are insufficient
      await gmail.users.getProfile({userId: "me"});

      // Verify token has required scopes
      const tokenInfo = await oauth2Client.getTokenInfo(
        oauth2Client.credentials.access_token || ""
      );

      const hasReadScope = tokenInfo.scopes?.includes(
        "https://www.googleapis.com/auth/gmail.readonly"
      );
      const hasComposeScope = tokenInfo.scopes?.includes(
        "https://www.googleapis.com/auth/gmail.compose"
      );

      if (!hasReadScope || !hasComposeScope) {
        return {
          connected: false,
          hasComposePermission: false,
          message: "Gmail is connected but missing required permissions. Please reconnect to grant 'Manage drafts and send emails' permission.",
        };
      }

      return {
        connected: true,
        hasComposePermission: true,
        message: "Gmail is connected with all required permissions",
      };
    } catch (error: any) {
      console.error("Error checking Gmail connection:", error);

      // Parse specific error types
      if (error.code === 401 || error.message?.includes("invalid_grant")) {
        return {
          connected: false,
          hasComposePermission: false,
          message: "Gmail authentication expired. Please reconnect Gmail in Settings.",
        };
      }

      if (error.message?.includes("refresh token")) {
        return {
          connected: false,
          hasComposePermission: false,
          message: "Gmail needs to be connected via OAuth",
        };
      }

      // For other errors, still return disconnected
      return {
        connected: false,
        hasComposePermission: false,
        message: `Gmail connection error: ${error.message || "Unknown error"}`,
      };
    }
  }
);
