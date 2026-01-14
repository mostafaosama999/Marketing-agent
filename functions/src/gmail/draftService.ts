/**
 * Gmail Draft Service
 * Handles creation of Gmail drafts via Gmail API
 */

import {google} from "googleapis";
import {getAuthenticatedOAuth2Client} from "./oauthService";

export interface CreateDraftParams {
  to: string;
  subject: string;
  bodyHtml: string;
  cc?: string;
  bcc?: string;
}

export interface CreateDraftResult {
  success: boolean;
  draftId?: string;
  draftUrl?: string;
  message?: string;
  error?: string;
}

/**
 * Create a Gmail draft using the Gmail API
 * @param params Draft creation parameters
 * @returns Draft creation result with draft ID and URL
 */
export async function createGmailDraft(
  params: CreateDraftParams
): Promise<CreateDraftResult> {
  try {
    console.log("📧 [DraftService] Creating Gmail draft for:", params.to);

    // Get authenticated OAuth2 client
    const oauth2Client = await getAuthenticatedOAuth2Client();
    const gmail = google.gmail({version: "v1", auth: oauth2Client});

    // Construct email message in RFC 2822 format
    const emailLines = [
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
      "",
      params.bodyHtml,
    ];

    if (params.cc) {
      emailLines.splice(1, 0, `Cc: ${params.cc}`);
    }

    if (params.bcc) {
      emailLines.splice(params.cc ? 2 : 1, 0, `Bcc: ${params.bcc}`);
    }

    const email = emailLines.join("\r\n");

    // Encode message in base64url format (required by Gmail API)
    const encodedMessage = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    console.log("📧 [DraftService] Message encoded, calling Gmail API...");

    // Create draft via Gmail API
    const response = await gmail.users.drafts.create({
      userId: "me",
      requestBody: {
        message: {
          raw: encodedMessage,
        },
      },
    });

    const draftId = response.data.id;

    if (!draftId) {
      return {
        success: false,
        error: "Gmail API returned no draft ID",
        message: "Failed to create draft - no draft ID returned",
      };
    }

    const draftUrl = `https://mail.google.com/mail/u/0/#drafts?compose=${draftId}`;

    console.log("✅ [DraftService] Draft created successfully:", draftId);

    return {
      success: true,
      draftId,
      draftUrl,
      message: "Draft created successfully",
    };
  } catch (error: any) {
    console.error("❌ [DraftService] Error creating draft:", error);

    // Parse specific error types
    let errorMessage = "Failed to create Gmail draft";

    if (error.code === 401 || error.message?.includes("invalid_grant")) {
      errorMessage = "Gmail authentication expired. Please reconnect Gmail in Settings.";
    } else if (error.code === 403) {
      errorMessage = "Insufficient permissions. Please reconnect Gmail to grant draft creation permission.";
    } else if (error.code === 400) {
      errorMessage = "Invalid email format or content. Please check the recipient email address.";
    } else if (error.message) {
      errorMessage = `Gmail API error: ${error.message}`;
    }

    return {
      success: false,
      error: errorMessage,
      message: errorMessage,
    };
  }
}
