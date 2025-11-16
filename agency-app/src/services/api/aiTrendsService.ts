/**
 * AI Trends Service - Client-side wrapper for AI Trends Cloud Functions
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
  deleteDoc,
  doc,
} from "firebase/firestore";
import {
  AITrendsRequest,
  AITrendsResponse,
  AITrendsSession,
} from "../../types/aiTrends";

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
 * Generate AI trends analysis from newsletter emails
 */
export async function generateAITrends(
  emailCount?: number,
  customPrompt?: string
): Promise<AITrendsResponse> {
  const functions = getFunctions();
  const generateFunction = httpsCallable<AITrendsRequest, AITrendsResponse>(
    functions,
    "generateAITrends"
  );

  try {
    // Build request object - only include fields that are defined
    const request: AITrendsRequest = {};
    if (emailCount !== undefined) {
      request.emailCount = emailCount;
    }
    if (customPrompt !== undefined) {
      request.customPrompt = customPrompt;
    }

    const result = await generateFunction(request);
    return result.data;
  } catch (error) {
    console.error("Error calling generateAITrends:", error);
    throw new Error(`Failed to generate AI trends: ${error}`);
  }
}

/**
 * Subscribe to AI trends sessions in real-time
 * @param userId - User ID to fetch sessions for
 * @param callback - Function called with updated sessions array
 * @param maxSessions - Maximum number of sessions to fetch (default: 10)
 */
export function subscribeToAITrendsSessions(
  userId: string,
  callback: (sessions: AITrendsSession[]) => void,
  maxSessions = 10
): () => void {
  const db = getFirestore();
  const sessionsRef = collection(db, "aiTrends", userId, "sessions");
  const q = query(
    sessionsRef,
    orderBy("generatedAt", "desc"),
    limit(maxSessions)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot: QuerySnapshot<DocumentData>) => {
      const sessions: AITrendsSession[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId || userId,
          trends: data.trends || [],
          generatedAt: convertTimestampToDate(data.generatedAt),
          emailCount: data.emailCount || 0,
          customPrompt: data.customPrompt,
          totalCost: data.totalCost || 0,
          model: data.model || "gpt-4-turbo-preview",
        };
      });

      callback(sessions);
    },
    (error) => {
      console.error("Error subscribing to AI trends sessions:", error);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Delete an AI trends session
 */
export async function deleteAITrendsSession(
  userId: string,
  sessionId: string
): Promise<void> {
  const db = getFirestore();
  const sessionRef = doc(db, "aiTrends", userId, "sessions", sessionId);

  try {
    await deleteDoc(sessionRef);
  } catch (error) {
    console.error("Error deleting AI trends session:", error);
    throw new Error(`Failed to delete session: ${error}`);
  }
}
