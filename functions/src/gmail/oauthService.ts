/**
 * OAuth2 Service for Gmail API
 * Manages OAuth tokens and authentication
 * Supports multiple accounts via accountType ("admin" for leads, "hiring" for hiring)
 */

import {google} from "googleapis";
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";

export type GmailAccountType = "admin" | "hiring";

const ACCOUNT_EMAILS: Record<GmailAccountType, string> = {
  admin: "mostafa.moqbel.ibrahim@gmail.com",
  hiring: "mostafa@codecontent.net",
};

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
 * @param accountType Which Gmail account to authenticate ("admin" for leads, "hiring" for hiring)
 */
export async function getAuthenticatedOAuth2Client(
  accountType: GmailAccountType = "admin"
) {
  const oauth2Client = getOAuth2Client(undefined);

  // Try to get refresh token from Firebase config first (only for admin account)
  let refreshToken: string | undefined;
  if (accountType === "admin") {
    refreshToken = functions.config().gmail?.refresh_token;
  }

  // If not in config, try Firestore
  if (!refreshToken) {
    const db = admin.firestore();
    const tokenDoc = await db.collection("gmailTokens").doc(accountType).get();

    if (tokenDoc.exists) {
      refreshToken = tokenDoc.data()?.refreshToken;
    }
  }

  if (!refreshToken) {
    const email = ACCOUNT_EMAILS[accountType];
    throw new Error(
      `Gmail refresh token not found for ${email}. Please complete OAuth setup in Settings → Integrations.`
    );
  }

  oauth2Client.setCredentials({
    refresh_token: refreshToken,
  });

  return oauth2Client;
}

/**
 * Generate OAuth authorization URL
 * @param origin The origin URL for redirect
 * @param accountType Which account is being connected
 */
export function generateAuthUrl(
  origin?: string,
  accountType: GmailAccountType = "admin"
): string {
  const oauth2Client = getOAuth2Client(origin);

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent", // Force consent screen to get refresh token
    state: JSON.stringify({accountType}),
  });

  return authUrl;
}

/**
 * Exchange authorization code for tokens
 * @param code The authorization code from Google
 * @param origin The origin URL
 * @param accountType Which account is being connected
 */
export async function exchangeCodeForTokens(
  code: string,
  origin?: string,
  accountType: GmailAccountType = "admin"
) {
  console.log(`🔍 [OAuth] Starting token exchange for account: ${accountType}`);
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

  const tokenData = {
    refreshToken: tokens.refresh_token,
    accessToken: tokens.access_token,
    expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    email: ACCOUNT_EMAILS[accountType],
    accountType,
    createdAt: FieldValue.serverTimestamp(),
  };

  console.log("🔍 [OAuth] Token data prepared:", Object.keys(tokenData));

  await db.collection("gmailTokens").doc(accountType).set(tokenData);

  console.log(`✅ [OAuth] Tokens stored for ${accountType} account`);

  return {
    refreshToken: tokens.refresh_token,
    message: `OAuth tokens successfully saved. ${ACCOUNT_EMAILS[accountType]} is now connected!`,
  };
}

/**
 * Check if Gmail is connected (has refresh token)
 * @param accountType Which Gmail account to check
 */
export async function isGmailConnected(
  accountType: GmailAccountType = "admin"
): Promise<boolean> {
  try {
    // Check Firebase config (only for admin account)
    if (accountType === "admin" && functions.config().gmail?.refresh_token) {
      return true;
    }

    // Check Firestore
    const db = admin.firestore();
    const tokenDoc = await db.collection("gmailTokens").doc(accountType).get();

    return tokenDoc.exists && !!tokenDoc.data()?.refreshToken;
  } catch (error) {
    console.error(`Error checking Gmail connection for ${accountType}:`, error);
    return false;
  }
}
