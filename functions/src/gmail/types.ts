/**
 * TypeScript interfaces for Gmail integration
 */

export interface EmailSender {
  email: string;
  name: string;
}

export interface EmailData {
  id: string; // Gmail message ID
  subject: string;
  body: string; // Cleaned text content
  bodyHtml?: string; // Original HTML
  from: EmailSender;
  receivedAt: Date;
  fetchedAt: Date;
  processed: boolean;
  linkedInSuggestions: string[];
  gmailThreadId: string;
}

export interface SyncResult {
  success: boolean;
  emailsFetched: number;
  emailsStored: number;
  errors: string[];
  lastSyncTime: Date;
}

export interface ManualSyncRequest {
  emailCount?: number; // Number of emails to fetch (default: 50)
  daysBack?: number; // Days to look back (default: 3)
}

export interface ManualSyncResponse {
  success: boolean;
  result: SyncResult;
  message: string;
}
