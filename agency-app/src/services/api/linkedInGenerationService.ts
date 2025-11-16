// src/services/api/linkedInGenerationService.ts

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
  LinkedInGenerationJob,
  GenerateLinkedInPostRequest,
  GenerateLinkedInPostResponse,
  GetJobRequest,
  GetJobResponse,
} from '../../types/linkedInGeneration';

const functions = getFunctions();
const db = getFirestore();

/**
 * Trigger LinkedIn post generation
 */
export async function generateLinkedInPost(
  aiTrendId: string
): Promise<GenerateLinkedInPostResponse> {
  try {
    const generateFunction = httpsCallable<
      GenerateLinkedInPostRequest,
      GenerateLinkedInPostResponse
    >(functions, 'generateLinkedInPostAsync');

    const result = await generateFunction({aiTrendId});
    return result.data;
  } catch (error) {
    console.error('Error generating LinkedIn post:', error);
    throw new Error(
      `Failed to start LinkedIn post generation: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Get job status (one-time fetch)
 */
export async function getGenerationJob(jobId: string): Promise<GetJobResponse> {
  try {
    const getJobFunction = httpsCallable<GetJobRequest, GetJobResponse>(
      functions,
      'getLinkedInGenerationJob'
    );

    const result = await getJobFunction({jobId});
    return result.data;
  } catch (error) {
    console.error('Error fetching job:', error);
    throw new Error(
      `Failed to fetch generation job: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Subscribe to job status updates (real-time)
 */
export function subscribeToGenerationJob(
  userId: string,
  jobId: string,
  callback: (job: LinkedInGenerationJob | null) => void
): () => void {
  const jobRef = doc(db, 'linkedInGenerationJobs', userId, 'jobs', jobId);

  const unsubscribe = onSnapshot(
    jobRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const job: LinkedInGenerationJob = {
          id: snapshot.id,
          userId: data.userId,
          status: data.status,
          createdAt: data.createdAt as Timestamp,
          updatedAt: data.updatedAt as Timestamp,
          aiTrendId: data.aiTrendId,
          aiTrendTitle: data.aiTrendTitle || '',
          selectedCompetitorIds: data.selectedCompetitorIds,
          progress: data.progress,
          result: data.result,
          error: data.error,
          totalCost: data.totalCost || 0,
          costs: data.costs || {postGeneration: 0, imageGeneration: 0},
        };
        callback(job);
      } else {
        callback(null);
      }
    },
    (error) => {
      console.error('Error subscribing to job:', error);
      callback(null);
    }
  );

  return unsubscribe;
}

/**
 * Get generation history (completed jobs)
 */
export function subscribeToGenerationHistory(
  userId: string,
  callback: (jobs: LinkedInGenerationJob[]) => void,
  maxJobs: number = 20
): () => void {
  const jobsRef = collection(db, 'linkedInGenerationJobs', userId, 'jobs');
  const q = query(jobsRef, orderBy('createdAt', 'desc'), limit(maxJobs));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const jobs: LinkedInGenerationJob[] = snapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          status: data.status,
          createdAt: data.createdAt as Timestamp,
          updatedAt: data.updatedAt as Timestamp,
          aiTrendId: data.aiTrendId,
          aiTrendTitle: data.aiTrendTitle || '',
          selectedCompetitorIds: data.selectedCompetitorIds,
          progress: data.progress,
          result: data.result,
          error: data.error,
          totalCost: data.totalCost || 0,
          costs: data.costs || {postGeneration: 0, imageGeneration: 0},
        };
      });
      callback(jobs);
    },
    (error) => {
      console.error('Error subscribing to generation history:', error);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Delete a generation job
 */
export async function deleteGenerationJob(
  userId: string,
  jobId: string
): Promise<void> {
  try {
    const jobRef = doc(db, 'linkedInGenerationJobs', userId, 'jobs', jobId);
    await deleteDoc(jobRef);
  } catch (error) {
    console.error('Error deleting job:', error);
    throw new Error(
      `Failed to delete generation job: ${error instanceof Error ? error.message : 'Unknown error'}`
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
 * Format relative time (e.g., "2 minutes ago")
 */
export function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}
