/**
 * OAuth2 Service for Gmail API
 * Manages OAuth tokens and authentication
 */

import {google} from "googleapis";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.compose", // Allow draft creation
];

const OAUTH_CALLBACK_PATH = "/auth/gmail/callback";

// Allowed origins for OAuth redirect
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "https://marketing-app-2v32k.ondigitalocean.app",
];

/**
 * Get the redirect URI for a given origin, with allowlist validation
 */
export function getRedirectUri(origin?: string): string {
  if (origin) {
    // Strip trailing slash
    const normalizedOrigin = origin.replace(/\/$/, "");
    if (ALLOWED_ORIGINS.includes(normalizedOrigin)) {
      return normalizedOrigin + OAUTH_CALLBACK_PATH;
    }
    console.warn(`Origin "${origin}" not in allowlist, falling back to default`);
  }

  // Fallback: check Firebase config, then default to localhost
  const configUri = process.env.GMAIL_REDIRECT_URI ||
    functions.config().gmail?.redirect_uri;
  if (configUri) return configUri;

  return "http://localhost:3000" + OAUTH_CALLBACK_PATH;
}

/**
 * Get OAuth2 client with credentials from Firebase config
 */
export function getOAuth2Client(origin?: string) {
  const clientId = functions.config().gmail?.client_id;
  const clientSecret = functions.config().gmail?.client_secret;

  if (!clientId || !clientSecret) {
    throw new Error(
      "Gmail OAuth credentials not configured. " +
      "Run: firebase functions:config:set gmail.client_id='...' gmail.client_secret='...'"
    );
  }

  const redirectUri = getRedirectUri(origin);
  console.log(`OAuth2 redirect URI: ${redirectUri}`);

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  return oauth2Client;
}

/**
 * Get OAuth2 client with refresh token set
 */
export async function getAuthenticatedOAuth2Client() {
  const oauth2Client = getOAuth2Client(undefined);

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
export function generateAuthUrl(origin?: string): string {
  const oauth2Client = getOAuth2Client(origin);

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
export async function exchangeCodeForTokens(code: string, origin?: string) {
  console.log("🔍 [OAuth] Starting token exchange...");
  console.log("🔍 [OAuth] Code received:", code?.substring(0, 20) + "...");

  const oauth2Client = getOAuth2Client(origin);
  console.log("🔍 [OAuth] OAuth2 client created");

  const {tokens} = await oauth2Client.getToken(code);
  console.log("🔍 [OAuth] Tokens received from Google");

  if (!tokens.refresh_token) {
    console.error("❌ [OAuth] No refresh token in response");
    throw new Error(
      "No refresh token received. Make sure to revoke previous access and try again."
    );
  }

  console.log("🔍 [OAuth] Refresh token present, storing in Firestore...");

  // Store tokens in Firestore
  const db = admin.firestore();
  console.log("🔍 [OAuth] Firestore instance:", !!db);
  console.log("🔍 [OAuth] FieldValue:", !!FieldValue);
  console.log("🔍 [OAuth] serverTimestamp:", !!FieldValue.serverTimestamp);

  const tokenData = {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    email: functions.config().gmail?.inbox_email || "mostafaainews@gmail.com",
    createdAt: FieldValue.serverTimestamp(),
  };

  console.log("🔍 [OAuth] Token data prepared:", Object.keys(tokenData));

  await db.collection("gmailTokens").doc("admin").set(tokenData);

  console.log("✅ [OAuth] Tokens stored in Firestore successfully");

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
