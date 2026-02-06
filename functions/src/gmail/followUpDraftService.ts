/**
 * Follow-Up Draft Service
 * Handles searching for original sent emails and creating threaded reply drafts
 */

import {google} from "googleapis";
import {getAuthenticatedOAuth2Client} from "./oauthService";

export interface SearchSentEmailResult {
  threadId: string;
  messageId: string;
}

export interface CreateFollowUpDraftParams {
  to: string;
  subject: string;
  bodyHtml: string;
  threadId?: string;
  messageId?: string; // For In-Reply-To and References headers
}

export interface CreateFollowUpDraftResult {
  success: boolean;
  draftId?: string;
  draftUrl?: string;
  threadFound: boolean;
  message?: string;
  error?: string;
}

/**
 * Search Gmail for a sent email to a specific recipient with a matching subject
 * Returns the threadId and messageId if found, null otherwise
 */
export async function searchSentEmail(
  to: string,
  originalSubject: string
): Promise<SearchSentEmailResult | null> {
  try {
    console.log(`🔍 [FollowUpService] Searching sent emails to: ${to}, subject: "${originalSubject}"`);

    const oauth2Client = await getAuthenticatedOAuth2Client();
    const gmail = google.gmail({version: "v1", auth: oauth2Client});

    // Search for sent emails to this recipient with matching subject
    const searchQuery = `to:${to} subject:"${originalSubject}" in:sent`;

    const response = await gmail.users.messages.list({
      userId: "me",
      q: searchQuery,
      maxResults: 1,
    });

    const messages = response.data.messages;
    if (!messages || messages.length === 0) {
      console.log("🔍 [FollowUpService] No sent emails found matching criteria");
      return null;
    }

    // Get the full message to extract threadId and Message-ID header
    const messageId = messages[0].id!;
    const messageDetail = await gmail.users.messages.get({
      userId: "me",
      id: messageId,
      format: "metadata",
      metadataHeaders: ["Message-ID"],
    });

    const threadId = messageDetail.data.threadId!;
    const headers = messageDetail.data.payload?.headers || [];
    const messageIdHeader = headers.find((h) => h.name === "Message-ID")?.value || "";

    console.log(`✅ [FollowUpService] Found thread: ${threadId}, messageId: ${messageIdHeader}`);

    return {
      threadId,
      messageId: messageIdHeader,
    };
  } catch (error: any) {
    console.error("❌ [FollowUpService] Error searching sent emails:", error);
    return null;
  }
}

/**
 * Create a follow-up Gmail draft, optionally threaded as a reply
 */
export async function createFollowUpDraft(
  params: CreateFollowUpDraftParams
): Promise<CreateFollowUpDraftResult> {
  try {
    console.log(`📧 [FollowUpService] Creating follow-up draft for: ${params.to}`);

    const oauth2Client = await getAuthenticatedOAuth2Client();
    const gmail = google.gmail({version: "v1", auth: oauth2Client});

    const threadFound = !!(params.threadId && params.messageId);

    // Build email headers
    const emailLines: string[] = [
      `To: ${params.to}`,
      `Subject: ${params.subject}`,
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
    ];

    // Add threading headers if we found the original thread
    if (params.messageId) {
      emailLines.push(`In-Reply-To: ${params.messageId}`);
      emailLines.push(`References: ${params.messageId}`);
    }

    emailLines.push("", params.bodyHtml);

    const email = emailLines.join("\r\n");

    // Encode message in base64url format
    const encodedMessage = Buffer.from(email)
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    console.log("📧 [FollowUpService] Message encoded, calling Gmail API...");

    // Create draft with optional threadId for threading
    const requestBody: any = {
      message: {
        raw: encodedMessage,
      },
    };

    if (params.threadId) {
      requestBody.message.threadId = params.threadId;
    }

    const response = await gmail.users.drafts.create({
      userId: "me",
      requestBody,
    });

    const draftId = response.data.id;

    if (!draftId) {
      return {
        success: false,
        threadFound,
        error: "Gmail API returned no draft ID",
        message: "Failed to create follow-up draft - no draft ID returned",
      };
    }

    const draftUrl = `https://mail.google.com/mail/u/0/#drafts?compose=${draftId}`;

    console.log(`✅ [FollowUpService] Follow-up draft created: ${draftId}, threaded: ${threadFound}`);

    return {
      success: true,
      draftId,
      draftUrl,
      threadFound,
      message: threadFound
        ? "Follow-up draft created as reply in original thread"
        : "Follow-up draft created as new email (original thread not found)",
    };
  } catch (error: any) {
    console.error("❌ [FollowUpService] Error creating follow-up draft:", error);

    let errorMessage = "Failed to create follow-up draft";

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
      threadFound: false,
      error: errorMessage,
      message: errorMessage,
    };
  }
}
