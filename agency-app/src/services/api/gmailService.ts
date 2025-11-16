/**
 * Gmail Service - Client-side wrapper for Gmail Cloud Functions
 */

import {getFunctions, httpsCallable} from "firebase/functions";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  Timestamp,
  limit,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";

/**
 * Email data structure (matches backend)
 */
export interface EmailSender {
  email: string;
  name: string;
}

export interface EmailData {
  id: string;
  subject: string;
  body: string;
  bodyHtml?: string;
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

export interface ManualSyncResponse {
  success: boolean;
  result: SyncResult;
  message: string;
}

export interface SyncMetadata {
  lastSync: Date | null;
  lastSyncSuccess: boolean;
  lastSyncEmailsFetched: number;
  lastSyncEmailsStored: number;
  lastSyncErrors: string[];
  lastSyncBy?: string;
  lastSyncType?: "manual" | "scheduled";
}

/**
 * Check if Gmail is connected (has OAuth token)
 */
export async function checkGmailConnection(): Promise<{connected: boolean; message: string}> {
  const functions = getFunctions();
  const checkStatus = httpsCallable<{}, {connected: boolean; message: string}>(
    functions,
    "checkGmailConnectionStatus"
  );

  try {
    const result = await checkStatus({});
    return result.data;
  } catch (error) {
    console.error("Error checking Gmail connection:", error);
    return {connected: false, message: "Failed to check connection status"};
  }
}

/**
 * Get Gmail OAuth authorization URL
 */
export async function getGmailAuthUrl(): Promise<string> {
  const functions = getFunctions();
  const getAuthUrl = httpsCallable<{}, {success: boolean; authUrl: string; message: string}>(
    functions,
    "getGmailAuthUrl"
  );

  try {
    const result = await getAuthUrl({});
    return result.data.authUrl;
  } catch (error) {
    console.error("Error getting Gmail auth URL:", error);
    throw new Error(`Failed to get auth URL: ${error}`);
  }
}

/**
 * Exchange OAuth authorization code for tokens
 */
export async function exchangeGmailOAuthCode(code: string): Promise<{success: boolean; message: string}> {
  const functions = getFunctions();
  const exchangeCode = httpsCallable<{code: string}, {success: boolean; message: string}>(
    functions,
    "exchangeGmailOAuthCode"
  );

  try {
    const result = await exchangeCode({code});
    return result.data;
  } catch (error) {
    console.error("Error exchanging OAuth code:", error);
    throw new Error(`Failed to exchange OAuth code: ${error}`);
  }
}

/**
 * Trigger manual email sync
 */
export async function manualSyncEmails(emailCount?: number, daysBack?: number): Promise<ManualSyncResponse> {
  const functions = getFunctions();
  const syncFunction = httpsCallable<{emailCount?: number; daysBack?: number}, ManualSyncResponse>(
    functions,
    "manualEmailSync"
  );

  try {
    const result = await syncFunction({emailCount, daysBack});
    return result.data;
  } catch (error) {
    console.error("Error calling manualEmailSync:", error);
    throw new Error(`Failed to sync emails: ${error}`);
  }
}

/**
 * Convert Firestore timestamp to Date
 */
function convertTimestampToDate(timestamp: any): Date {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return new Date(timestamp);
}

/**
 * Subscribe to emails in real-time
 * @param callback Function called with updated emails array
 * @param maxEmails Maximum number of emails to fetch (default: 100)
 */
export function subscribeToEmails(
  callback: (emails: EmailData[]) => void,
  maxEmails = 100
): () => void {
  const db = getFirestore();
  const emailsRef = collection(db, "newsletters", "emails", "items");
  const q = query(
    emailsRef,
    orderBy("receivedAt", "desc"),
    limit(maxEmails)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const emails: EmailData[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          subject: data.subject || "(No Subject)",
          body: data.body || "",
          bodyHtml: data.bodyHtml,
          from: data.from || {email: "unknown", name: "Unknown"},
          receivedAt: convertTimestampToDate(data.receivedAt),
          fetchedAt: convertTimestampToDate(data.fetchedAt),
          processed: data.processed || false,
          linkedInSuggestions: data.linkedInSuggestions || [],
          gmailThreadId: data.gmailThreadId || "",
        };
      });

      callback(emails);
    },
    (error) => {
      console.error("Error subscribing to emails:", error);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Subscribe to sync metadata (last sync info)
 */
export function subscribeToSyncMetadata(
  callback: (metadata: SyncMetadata | null) => void
): () => void {
  const db = getFirestore();
  const metadataRef = collection(db, "newsletters");

  const unsubscribe = onSnapshot(
    metadataRef,
    (snapshot) => {
      const metadataDoc = snapshot.docs.find((doc) => doc.id === "metadata");

      if (!metadataDoc || !metadataDoc.exists()) {
        callback(null);
        return;
      }

      const data = metadataDoc.data();
      const metadata: SyncMetadata = {
        lastSync: data.lastSync ? convertTimestampToDate(data.lastSync) : null,
        lastSyncSuccess: data.lastSyncSuccess || false,
        lastSyncEmailsFetched: data.lastSyncEmailsFetched || 0,
        lastSyncEmailsStored: data.lastSyncEmailsStored || 0,
        lastSyncErrors: data.lastSyncErrors || [],
        lastSyncBy: data.lastSyncBy,
        lastSyncType: data.lastSyncType,
      };

      callback(metadata);
    },
    (error) => {
      console.error("Error subscribing to sync metadata:", error);
      callback(null);
    }
  );

  return unsubscribe;
}
