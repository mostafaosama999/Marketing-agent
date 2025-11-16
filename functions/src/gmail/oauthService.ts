/**
 * OAuth2 Service for Gmail API
 * Manages OAuth tokens and authentication
 */

import {google} from "googleapis";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const REDIRECT_URI = "http://localhost:3000/auth/gmail/callback";

/**
 * Get OAuth2 client with credentials from Firebase config
 */
export function getOAuth2Client() {
  const clientId = functions.config().gmail?.client_id;
  const clientSecret = functions.config().gmail?.client_secret;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Gmail OAuth credentials not configured. " +
      "Run: firebase functions:config:set gmail.client_id='...' gmail.client_secret='...'"
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    REDIRECT_URI
  );

  return oauth2Client;
}

/**
 * Get OAuth2 client with refresh token set
 */
export async function getAuthenticatedOAuth2Client() {
  const oauth2Client = getOAuth2Client();

  // Try to get refresh token from Firebase config first
  let refreshToken = functions.config().gmail?.refresh_token;

  // If not in config, try Firestore
  if (!refreshToken) {
    const db = admin.firestore();
    const tokenDoc = await db.collection("gmailTokens").doc("admin").get();

    if (tokenDoc.exists) {
      refreshToken = tokenDoc.data()?.refreshToken;
    }
  }

  if (!refreshToken) {
    throw new Error(
      "Gmail refresh token not found. Please complete OAuth setup first."
    );
  }

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

/**
 * Generate OAuth authorization URL
 */
export function generateAuthUrl(): string {
  const oauth2Client = getOAuth2Client();

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Force consent screen to get refresh token
  });

  return authUrl;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client();

  const {tokens} = await oauth2Client.getToken(code);

  if (!tokens.refresh_token) {
    throw new Error(
      "No refresh token received. Make sure to revoke previous access and try again."
    );
  }

  // Store tokens in Firestore
  const db = admin.firestore();
  await db.collection("gmailTokens").doc("admin").set({
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    email: functions.config().gmail?.inbox_email || "mostafaainews@gmail.com",
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log("✅ Tokens stored in Firestore");

  return {
    refreshToken: tokens.refresh_token,
    message: "OAuth tokens successfully saved. Gmail is now connected!",
  };
}

/**
 * Check if Gmail is connected (has refresh token)
 */
export async function isGmailConnected(): Promise<boolean> {
  try {
    // Check Firebase config
    if (functions.config().gmail?.refresh_token) {
      return true;
    }

    // Check Firestore
    const db = admin.firestore();
    const tokenDoc = await db.collection("gmailTokens").doc("admin").get();

    return tokenDoc.exists && !!tokenDoc.data()?.refreshToken;
  } catch (error) {
    console.error("Error checking Gmail connection:", error);
    return false;
  }
}
