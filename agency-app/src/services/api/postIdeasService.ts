// src/services/api/postIdeasService.ts

import {getFunctions, httpsCallable} from 'firebase/functions';
import {
  getFirestore,
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  Timestamp,
  deleteDoc,
} from 'firebase/firestore';
import {
  PostIdeasSession,
  GeneratePostIdeasResponse,
  GeneratePostFromIdeaRequest,
  GeneratePostFromIdeaResponse,
} from '../../types/postIdeas';

const functions = getFunctions();
const db = getFirestore();

/**
 * Generate 5 LinkedIn Post Ideas
 */
export async function generatePostIdeas(): Promise<GeneratePostIdeasResponse> {
  try {
    const generateFunction = httpsCallable<{}, GeneratePostIdeasResponse>(
      functions,
      'generatePostIdeas'
    );

    const result = await generateFunction({});
    return result.data;
  } catch (error) {
    console.error('Error generating post ideas:', error);
    throw new Error(
      `Failed to generate post ideas: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate full post from selected idea
 */
export async function generatePostFromIdea(
  sessionId: string,
  ideaId: string
): Promise<GeneratePostFromIdeaResponse> {
  try {
    const generateFunction = httpsCallable<
      GeneratePostFromIdeaRequest,
      GeneratePostFromIdeaResponse
    >(functions, 'generatePostFromIdea');

    const result = await generateFunction({sessionId, ideaId});
    return result.data;
  } catch (error) {
    console.error('Error generating post from idea:', error);
    throw new Error(
      `Failed to generate post: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Subscribe to most recent post ideas session
 */
export function subscribeToLatestSession(
  userId: string,
  callback: (session: PostIdeasSession | null) => void
): () => void {
  const sessionsRef = collection(
    db,
    'linkedInPostIdeas',
    userId,
    'sessions'
  );
  const q = query(sessionsRef, orderBy('createdAt', 'desc'), limit(1));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      if (snapshot.empty) {
        callback(null);
        return;
      }

      const doc = snapshot.docs[0];
      const data = doc.data();
      const session: PostIdeasSession = {
        id: doc.id,
        userId: data.userId,
        createdAt: data.createdAt as Timestamp,
        ideas: data.ideas,
        analyticsInsights: data.analyticsInsights,
        aiTrends: data.aiTrends,
        competitorInsights: data.competitorInsights,
        dataSourceCounts: data.dataSourceCounts,
        totalCost: data.totalCost || 0,
        costs: data.costs || {
          analyticsAnalysis: 0,
          newsletterAnalysis: 0,
          competitorAnalysis: 0,
          ideaGeneration: 0,
        },
      };
      callback(session);
    },
    (error) => {
      console.error('Error subscribing to session:', error);
      callback(null);
    }
  );

  return unsubscribe;
}

/**
 * Subscribe to all post ideas sessions (history)
 */
export function subscribeToAllSessions(
  userId: string,
  callback: (sessions: PostIdeasSession[]) => void,
  maxSessions: number = 10
): () => void {
  const sessionsRef = collection(
    db,
    'linkedInPostIdeas',
    userId,
    'sessions'
  );
  const q = query(sessionsRef, orderBy('createdAt', 'desc'), limit(maxSessions));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const sessions: PostIdeasSession[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          createdAt: data.createdAt as Timestamp,
          ideas: data.ideas,
          analyticsInsights: data.analyticsInsights,
          aiTrends: data.aiTrends,
          competitorInsights: data.competitorInsights,
          dataSourceCounts: data.dataSourceCounts,
          totalCost: data.totalCost || 0,
          costs: data.costs || {
            analyticsAnalysis: 0,
            newsletterAnalysis: 0,
            competitorAnalysis: 0,
            ideaGeneration: 0,
          },
        };
      });
      callback(sessions);
    },
    (error) => {
      console.error('Error subscribing to sessions:', error);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Delete a post ideas session
 */
export async function deleteSession(
  userId: string,
  sessionId: string
): Promise<void> {
  try {
    const sessionRef = doc(
      db,
      'linkedInPostIdeas',
      userId,
      'sessions',
      sessionId
    );
    await deleteDoc(sessionRef);
  } catch (error) {
    console.error('Error deleting session:', error);
    throw new Error(
      `Failed to delete session: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Convert Firestore Timestamp to JS Date
 */
export function convertTimestampToDate(timestamp: Timestamp): Date {
  return timestamp.toDate();
}

/**
 * Format relative time
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60)
    return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24)
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

// ============================================
// RAG-Enhanced Functions
// ============================================

/**
 * RAG Status Response
 */
export interface RAGStatusResponse {
  success: boolean;
  isReady: boolean;
  stats: {
    totalNewsletters: number;
    indexedNewsletters: number;
    totalChunks: number;
    percentIndexed: number;
  };
  message: string;
  error?: string;
}

/**
 * RAG Indexing Response
 */
export interface RAGIndexingResponse {
  success: boolean;
  message: string;
  stats: {
    totalNewsletters: number;
    indexedNewsletters: number;
    totalChunks: number;
  };
  details?: {
    successCount: number;
    failureCount: number;
    totalChunks: number;
    estimatedCost: string;
  };
}

/**
 * Get RAG system status
 */
export async function getRAGStatus(): Promise<RAGStatusResponse> {
  try {
    const statusFunction = httpsCallable<{}, RAGStatusResponse>(
      functions,
      'getRAGStatus'
    );
    const result = await statusFunction({});
    return result.data;
  } catch (error) {
    console.error('Error getting RAG status:', error);
    return {
      success: false,
      isReady: false,
      stats: {
        totalNewsletters: 0,
        indexedNewsletters: 0,
        totalChunks: 0,
        percentIndexed: 0,
      },
      message: 'Failed to get RAG status',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Index all newsletters for RAG
 */
export async function indexNewslettersForRAG(): Promise<RAGIndexingResponse> {
  try {
    const indexFunction = httpsCallable<{}, RAGIndexingResponse>(
      functions,
      'indexNewsletters'
    );
    const result = await indexFunction({});
    return result.data;
  } catch (error) {
    console.error('Error indexing newsletters:', error);
    throw new Error(
      `Failed to index newsletters: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate 5 LinkedIn Post Ideas using RAG
 */
export async function generatePostIdeasRAG(): Promise<GeneratePostIdeasResponse> {
  try {
    const generateFunction = httpsCallable<{}, GeneratePostIdeasResponse>(
      functions,
      'generatePostIdeasRAG'
    );
    const result = await generateFunction({});
    return result.data;
  } catch (error) {
    console.error('Error generating post ideas (RAG):', error);
    throw new Error(
      `Failed to generate post ideas: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate full post from selected idea using RAG
 */
export async function generatePostFromIdeaRAG(
  sessionId: string,
  ideaId: string
): Promise<GeneratePostFromIdeaResponse> {
  try {
    const generateFunction = httpsCallable<
      GeneratePostFromIdeaRequest,
      GeneratePostFromIdeaResponse
    >(functions, 'generatePostFromIdeaRAG');
    const result = await generateFunction({sessionId, ideaId});
    return result.data;
  } catch (error) {
    console.error('Error generating post from idea (RAG):', error);
    throw new Error(
      `Failed to generate post: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
