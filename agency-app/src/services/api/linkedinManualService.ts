// src/services/api/linkedinManualService.ts
import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  Timestamp,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app from '../firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';

// Initialize Functions
const functions = getFunctions(app);

/**
 * LinkedIn Post extracted from manual sync
 */
export interface LinkedInPost {
  id?: string;
  content: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  postedDate: string;
  extractedAt: Timestamp;
  period: string;
}

/**
 * LinkedIn Daily Aggregate
 */
export interface LinkedInAggregate {
  id?: string;
  totalImpressions: number;
  totalEngagement: number;
  postCount: number;
  topPost: {
    content: string;
    impressions: number;
  } | null;
  period: string;
  updatedAt: Timestamp;
  extractedAt: Timestamp;
}

/**
 * User metadata for LinkedIn sync
 */
export interface LinkedInSyncMetadata {
  lastSyncAt: Timestamp | null;
  lastSyncPostCount: number;
  lastSyncImpressions: number;
}

/**
 * Result from extraction Cloud Function
 */
export interface ExtractionResult {
  success: boolean;
  data: {
    postsExtracted: number;
    totalImpressions: number;
    totalEngagement: number;
    period: string;
    topPost: string;
  };
  cost: number;
}

/**
 * Call Cloud Function to extract LinkedIn analytics from pasted content
 */
export async function extractLinkedInAnalytics(
  pastedContent: string
): Promise<ExtractionResult> {
  try {
    const extractFunction = httpsCallable<
      { pastedContent: string },
      ExtractionResult
    >(functions, 'extractLinkedInAnalytics');

    const result = await extractFunction({ pastedContent });
    return result.data;
  } catch (error: any) {
    throw new Error(error.message || 'Failed to extract LinkedIn analytics');
  }
}

/**
 * Get user's sync metadata (last sync time, etc.)
 */
export async function getLinkedInSyncMetadata(
  userId: string
): Promise<LinkedInSyncMetadata | null> {
  try {
    const metaDoc = await getDoc(doc(db, 'linkedinAnalytics', userId));

    if (!metaDoc.exists()) {
      return null;
    }

    return metaDoc.data() as LinkedInSyncMetadata;
  } catch (error) {
    throw error;
  }
}

/**
 * Get all extracted posts for a user
 */
export async function getLinkedInPosts(
  userId: string,
  limitCount: number = 20
): Promise<LinkedInPost[]> {
  try {
    const postsQuery = query(
      collection(db, 'linkedinAnalytics', userId, 'posts'),
      orderBy('impressions', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(postsQuery);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as LinkedInPost[];
  } catch (error) {
    throw error;
  }
}

/**
 * Get aggregates for trend visualization
 */
export async function getLinkedInAggregates(
  userId: string,
  limitCount: number = 30
): Promise<LinkedInAggregate[]> {
  try {
    const aggregatesQuery = query(
      collection(db, 'linkedinAnalytics', userId, 'aggregates'),
      orderBy('extractedAt', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(aggregatesQuery);
    return snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .reverse() as LinkedInAggregate[]; // Oldest to newest for charts
  } catch (error) {
    throw error;
  }
}

/**
 * Calculate total impressions across all syncs
 */
export async function getTotalImpressions(userId: string): Promise<number> {
  try {
    const aggregates = await getLinkedInAggregates(userId, 100);
    if (aggregates.length === 0) return 0;

    // Get the most recent aggregate
    return aggregates[aggregates.length - 1]?.totalImpressions || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Calculate total engagement across all syncs
 */
export async function getTotalEngagement(userId: string): Promise<number> {
  try {
    const aggregates = await getLinkedInAggregates(userId, 100);
    if (aggregates.length === 0) return 0;

    // Get the most recent aggregate
    return aggregates[aggregates.length - 1]?.totalEngagement || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Get trend data for charts (last N syncs)
 */
export async function getLinkedInTrendData(
  userId: string,
  days: number = 30
): Promise<{ date: string; impressions: number; engagement: number }[]> {
  try {
    const aggregates = await getLinkedInAggregates(userId, days);

    return aggregates.map((agg) => ({
      date: agg.id || new Date(agg.extractedAt.toDate()).toLocaleDateString(),
      impressions: agg.totalImpressions,
      engagement: agg.totalEngagement,
    }));
  } catch (error) {
    return [];
  }
}
