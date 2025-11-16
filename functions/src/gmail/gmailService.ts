/**
 * Gmail Service - Handles Gmail API authentication and email fetching
 */

import {google} from "googleapis";
import * as admin from "firebase-admin";
import {EmailData, EmailSender} from "./types";
import {getAuthenticatedOAuth2Client} from "./oauthService";

const gmail = google.gmail("v1");

/**
 * Get authenticated Gmail client using OAuth2
 */
async function getGmailClient() {
  try {
    const auth = await getAuthenticatedOAuth2Client();
    return {auth};
  } catch (error) {
    console.error("Error creating Gmail client:", error);
    throw new Error(`Failed to initialize Gmail client: ${error}`);
  }
}

/**
 * Parse email headers to extract subject, from, date
 */
function parseEmailHeaders(headers: any[]): {
  subject: string;
  from: EmailSender;
  date: Date;
} {
  let subject = "(No Subject)";
  let fromEmail = "unknown@unknown.com";
  let fromName = "Unknown";
  let date = new Date();

  headers.forEach((header: any) => {
    const name = header.name.toLowerCase();
    const value = header.value;

    if (name === "subject") {
      subject = value;
    } else if (name === "from") {
      // Parse "Name <email@domain.com>" format
      const match = value.match(/^(.+?)\s*<(.+?)>$/);
      if (match) {
        fromName = match[1].trim();
        fromEmail = match[2].trim();
      } else {
        fromEmail = value.trim();
        fromName = value.trim();
      }
    } else if (name === "date") {
      date = new Date(value);
    }
  });

  return {
    subject,
    from: {email: fromEmail, name: fromName},
    date,
  };
}

/**
 * Decode base64url encoded email body
 */
function decodeBase64Url(data: string): string {
  try {
    const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch (error) {
    console.error("Error decoding base64:", error);
    return "";
  }
}

/**
 * Extract text content from email parts
 */
function extractEmailBody(payload: any): {text: string; html: string} {
  let text = "";
  let html = "";

  // Check if body has direct data
  if (payload.body?.data) {
    const decoded = decodeBase64Url(payload.body.data);
    if (payload.mimeType === "text/plain") {
      text = decoded;
    } else if (payload.mimeType === "text/html") {
      html = decoded;
    }
  }

  // Check parts for multipart emails
  if (payload.parts && Array.isArray(payload.parts)) {
    payload.parts.forEach((part: any) => {
      if (part.mimeType === "text/plain" && part.body?.data) {
        text = decodeBase64Url(part.body.data);
      } else if (part.mimeType === "text/html" && part.body?.data) {
        html = decodeBase64Url(part.body.data);
      } else if (part.parts) {
        // Recursively check nested parts
        const nested = extractEmailBody(part);
        if (nested.text) text = nested.text;
        if (nested.html) html = nested.html;
      }
    });
  }

  return {text, html};
}

/**
 * Simple HTML to text conversion (strip tags)
 */
function htmlToText(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, "")
    .replace(/<script[^>]*>.*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Fetch emails from Gmail inbox for the last N days
 */
export async function fetchEmails(daysBack = 3, maxEmails = 100): Promise<EmailData[]> {
  const {auth} = await getGmailClient();
  const emails: EmailData[] = [];

  try {
    // Calculate date range
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - daysBack);
    const afterDate = dateThreshold.toISOString().split("T")[0].replace(/-/g, "/");

    // Search query: emails after date in all mail (including inbox, sent, archived)
    const query = `in:anywhere after:${afterDate}`;

    console.log(`Fetching emails with query: ${query}, maxResults: ${maxEmails}`);

    // List messages
    const listResponse = await gmail.users.messages.list({
      auth,
      userId: "me",
      q: query,
      maxResults: maxEmails, // Use provided max
    });

    const messages = listResponse.data.messages || [];
    console.log(`Found ${messages.length} messages`);

    // Fetch full message details for each
    for (const message of messages) {
      if (!message.id) continue;

      try {
        const msgResponse = await gmail.users.messages.get({
          auth,
          userId: "me",
          id: message.id,
          format: "full",
        });

        const msg = msgResponse.data;
        const headers = msg.payload?.headers || [];
        const {subject, from, date} = parseEmailHeaders(headers);
        const {text, html} = extractEmailBody(msg.payload || {});

        // Use text if available, otherwise convert HTML to text
        const bodyText = text || (html ? htmlToText(html) : "(No content)");

        const emailData: EmailData = {
          id: msg.id || "",
          subject,
          body: bodyText,
          bodyHtml: html || undefined,
          from,
          receivedAt: date,
          fetchedAt: new Date(),
          processed: false,
          linkedInSuggestions: [],
          gmailThreadId: msg.threadId || "",
        };

        emails.push(emailData);
      } catch (error) {
        console.error(`Error fetching message ${message.id}:`, error);
      }
    }

    console.log(`Successfully fetched ${emails.length} emails`);
    return emails;
  } catch (error) {
    console.error("Error fetching emails from Gmail:", error);
    throw new Error(`Failed to fetch emails: ${error}`);
  }
}

/**
 * Store emails in Firestore (deduplicate by ID)
 */
export async function storeEmails(emails: EmailData[]): Promise<number> {
  const db = admin.firestore();
  const emailsRef = db.collection("newsletters").doc("emails").collection("items");

  let storedCount = 0;

  try {
    // Use batch writes for efficiency
    const batch = db.batch();
    const batchSize = 500; // Firestore batch limit

    for (let i = 0; i < emails.length; i++) {
      const email = emails[i];

      // Check if email already exists
      const existingDoc = await emailsRef.doc(email.id).get();
      if (existingDoc.exists) {
        console.log(`Email ${email.id} already exists, skipping`);
        continue;
      }

      // Convert Date objects to Firestore Timestamps
      const emailDoc = {
        ...email,
        receivedAt: admin.firestore.Timestamp.fromDate(email.receivedAt),
        fetchedAt: admin.firestore.Timestamp.fromDate(email.fetchedAt),
      };

      batch.set(emailsRef.doc(email.id), emailDoc);
      storedCount++;

      // Commit batch if we hit the limit
      if ((i + 1) % batchSize === 0) {
        await batch.commit();
      }
    }

    // Commit remaining items
    if (storedCount % batchSize !== 0) {
      await batch.commit();
    }

    console.log(`Stored ${storedCount} new emails in Firestore`);
    return storedCount;
  } catch (error) {
    console.error("Error storing emails in Firestore:", error);
    throw new Error(`Failed to store emails: ${error}`);
  }
}
