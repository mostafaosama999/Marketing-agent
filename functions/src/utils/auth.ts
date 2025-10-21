import {google} from "googleapis";
import * as functions from "firebase-functions";

// Google Service Account configuration for Docs API
const GOOGLE_CREDENTIALS = {
  type: "service_account",
  project_id: functions.config().google?.project_id || "marketing-app-cc237",
  private_key_id: functions.config().google?.private_key_id,
  private_key: functions.config().google?.private_key?.replace(/\\n/g, "\n"),
  client_email: functions.config().google?.client_email,
  client_id: functions.config().google?.client_id,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: functions.config().google?.client_x509_cert_url,
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
        "https://www.googleapis.com/auth/spreadsheets.readonly",
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