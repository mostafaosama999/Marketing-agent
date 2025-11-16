import {google} from "googleapis";
import * as functions from "firebase-functions";

// Helper function to safely get config (compatible with both v1 and v2)
function getConfig(key: string): string | undefined {
  // First try environment variables (v2)
  const envValue = process.env[key.toUpperCase().replace(/\./g, '_')];
  if (envValue) {
    return envValue;
  }

  // Fallback to functions.config() for v1 functions
  try {
    const parts = key.split('.');
    let config: any = functions.config();
    for (const part of parts) {
      config = config?.[part];
      if (config === undefined) break;
    }
    return config;
  } catch {
    return undefined;
  }
}

// Google Service Account configuration for Docs API
const GOOGLE_CREDENTIALS = {
  type: "service_account",
  project_id: getConfig("google.project_id") || "marketing-app-cc237",
  private_key_id: getConfig("google.private_key_id"),
  private_key: getConfig("google.private_key")?.replace(/\\n/g, "\n"),
  client_email: getConfig("google.client_email"),
  client_id: getConfig("google.client_id"),
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: getConfig("google.client_x509_cert_url"),
  universe_domain: "googleapis.com",
};

/**
 * Get authenticated Google Docs API client
 */
export async function getGoogleDocsAuth() {
  try {
    // Check if all required Google credentials are available
    if (!GOOGLE_CREDENTIALS.private_key || !GOOGLE_CREDENTIALS.client_email) {
      console.warn("Google service account credentials not fully configured");
      throw new functions.https.HttpsError(
        "failed-precondition",
        "Google service account not configured. Please set up Google credentials."
      );
    }

    const auth = new google.auth.GoogleAuth({
      credentials: GOOGLE_CREDENTIALS,
      scopes: [
        "https://www.googleapis.com/auth/documents",
        "https://www.googleapis.com/auth/drive",
        "https://www.googleapis.com/auth/spreadsheets", // Changed from readonly to read/write
      ],
    });

    return await auth.getClient();
  } catch (error) {
    console.error("Error authenticating with Google:", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to authenticate with Google APIs. Please check service account configuration."
    );
  }
}

/**
 * Get Google Docs API instance
 */
export async function getGoogleDocsAPI() {
  const auth = await getGoogleDocsAuth();
  return google.docs({version: "v1", auth: auth as any});
}

/**
 * Get Google Drive API instance
 */
export async function getGoogleDriveAPI() {
  const auth = await getGoogleDocsAuth();
  return google.drive({version: "v3", auth: auth as any});
}

/**
 * Get Google Sheets API instance
 */
export async function getGoogleSheetsAuth() {
  return await getGoogleDocsAuth();
}