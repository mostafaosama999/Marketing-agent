// src/services/api/linkedinManualService.ts
import {
  Timestamp,
  doc,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app from '../firebase/firestore';

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
}

/**
 * LinkedIn Analytics Data (from parent document)
 */
export interface LinkedInAnalyticsData {
  period: string;
  posts: LinkedInPost[];
  totalImpressions: number;
  totalEngagement: number;
  postCount: number;
  extractedAt: Timestamp;
  extractedBy: string;
}

/**
 * Result from extraction Cloud Function
 */
export interface ExtractionResult {
  success: boolean;
  data: {
    postCount: number;
    totalImpressions: number;
    totalEngagement: number;
    period: string;
    topPost?: string;
  };
  cost?: number;
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
 * Get user's LinkedIn analytics data (posts, impressions, engagement)
 */
export async function getLinkedInAnalyticsData(
  userId: string
): Promise<LinkedInAnalyticsData | null> {
  try {
    const analyticsDoc = await getDoc(doc(db, 'linkedinAnalytics', userId));

    if (!analyticsDoc.exists()) {
      return null;
    }

    return analyticsDoc.data() as LinkedInAnalyticsData;
  } catch (error) {
    throw error;
  }
}

/**
 * Get all extracted posts for a user (from parent document)
 */
export async function getLinkedInPosts(
  userId: string
): Promise<LinkedInPost[]> {
  try {
    const data = await getLinkedInAnalyticsData(userId);
    if (!data) return [];

    // Sort posts by impressions (highest first)
    return (data.posts || []).sort((a, b) => b.impressions - a.impressions);
  } catch (error) {
    throw error;
  }
}

/**
 * Calculate total impressions
 */
export async function getTotalImpressions(userId: string): Promise<number> {
  try {
    const data = await getLinkedInAnalyticsData(userId);
    return data?.totalImpressions || 0;
  } catch (error) {
    return 0;
  }
}

/**
 * Calculate total engagement
 */
export async function getTotalEngagement(userId: string): Promise<number> {
  try {
    const data = await getLinkedInAnalyticsData(userId);
    return data?.totalEngagement || 0;
  } catch (error) {
    return 0;
  }
}
