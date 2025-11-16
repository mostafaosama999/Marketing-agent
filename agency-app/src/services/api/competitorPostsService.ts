import {
  getFirestore,
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  query,
  orderBy,
  limit,
  where,
  onSnapshot,
  Timestamp,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase/firestore';
import {
  CompetitorPost,
  CompetitorPostsData,
  CompetitorSyncMetadata,
  CompetitorMetrics,
  CompetitorComparison,
} from '../../types/competitor';

const COMPETITOR_POSTS_COLLECTION = 'competitorPosts';
const SYNC_METADATA_COLLECTION = 'competitorSyncMetadata';

/**
 * Extract competitor posts from pasted LinkedIn content using Cloud Function
 * Auto-detects and creates competitor profile from the content
 */
export async function extractCompetitorPosts(
  pastedContent: string,
  userId: string
): Promise<CompetitorPostsData> {
  try {
    const extractFunction = httpsCallable<
      { pastedContent: string; userId: string },
      CompetitorPostsData
    >(functions, 'extractCompetitorPosts');

    const result = await extractFunction({
      pastedContent,
      userId,
    });

    return result.data;
  } catch (error: any) {
    console.error('Error extracting competitor posts:', error);
    throw new Error(error.message || 'Failed to extract competitor posts');
  }
}

/**
 * Get all posts for a specific competitor
 */
export async function getCompetitorPosts(
  userId: string,
  competitorId: string,
  limitCount?: number
): Promise<CompetitorPost[]> {
  try {
    const db = getFirestore();
    const postsRef = collection(
      db,
      COMPETITOR_POSTS_COLLECTION,
      userId,
      'competitors',
      competitorId,
      'posts'
    );

    let q = query(postsRef, orderBy('extractedAt', 'desc'));

    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => doc.data() as CompetitorPost);
  } catch (error) {
    console.error('Error getting competitor posts:', error);
    throw new Error('Failed to get competitor posts');
  }
}

/**
 * Subscribe to competitor posts with real-time updates
 */
export function subscribeToCompetitorPosts(
  userId: string,
  competitorId: string,
  callback: (posts: CompetitorPost[]) => void,
  limitCount?: number
): Unsubscribe {
  try {
    const db = getFirestore();
    const postsRef = collection(
      db,
      COMPETITOR_POSTS_COLLECTION,
      userId,
      'competitors',
      competitorId,
      'posts'
    );

    let q = query(postsRef, orderBy('extractedAt', 'desc'));

    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    return onSnapshot(
      q,
      (querySnapshot) => {
        const posts = querySnapshot.docs.map(doc => doc.data() as CompetitorPost);
        callback(posts);
      },
      (error) => {
        console.error('Error in competitor posts subscription:', error);
        // Don't throw - just log the error and call callback with empty array
        callback([]);
      }
    );
  } catch (error) {
    console.error('Error setting up competitor posts subscription:', error);
    // Return a no-op unsubscribe function instead of throwing
    return () => {};
  }
}

/**
 * Get sync metadata for a competitor
 */
export async function getCompetitorSyncMetadata(
  userId: string,
  competitorId: string
): Promise<CompetitorSyncMetadata | null> {
  try {
    const db = getFirestore();
    const metadataRef = doc(
      db,
      SYNC_METADATA_COLLECTION,
      userId,
      'competitors',
      competitorId
    );

    const metadataSnap = await getDoc(metadataRef);

    if (!metadataSnap.exists()) {
      return null;
    }

    return metadataSnap.data() as CompetitorSyncMetadata;
  } catch (error) {
    console.error('Error getting competitor sync metadata:', error);
    throw new Error('Failed to get competitor sync metadata');
  }
}

/**
 * Subscribe to sync metadata with real-time updates
 */
export function subscribeToSyncMetadata(
  userId: string,
  competitorId: string,
  callback: (metadata: CompetitorSyncMetadata | null) => void
): Unsubscribe {
  try {
    const db = getFirestore();
    const metadataRef = doc(
      db,
      SYNC_METADATA_COLLECTION,
      userId,
      'competitors',
      competitorId
    );

    return onSnapshot(
      metadataRef,
      (docSnap) => {
        if (docSnap.exists()) {
          callback(docSnap.data() as CompetitorSyncMetadata);
        } else {
          callback(null);
        }
      },
      (error) => {
        console.error('Error in sync metadata subscription:', error);
        // Don't throw - just call callback with null
        callback(null);
      }
    );
  } catch (error) {
    console.error('Error setting up sync metadata subscription:', error);
    // Return a no-op unsubscribe function instead of throwing
    return () => {};
  }
}

/**
 * Calculate metrics for a specific competitor
 */
export async function getCompetitorMetrics(
  userId: string,
  competitorId: string,
  competitorName: string
): Promise<CompetitorMetrics> {
  try {
    const posts = await getCompetitorPosts(userId, competitorId);

    if (posts.length === 0) {
      return {
        competitorId,
        competitorName,
        totalPosts: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalImpressions: 0,
        totalEngagement: 0,
        avgEngagementRate: 0,
      };
    }

    const totalLikes = posts.reduce((sum, post) => sum + (post.likes || 0), 0);
    const totalComments = posts.reduce((sum, post) => sum + (post.comments || 0), 0);
    const totalShares = posts.reduce((sum, post) => sum + (post.shares || 0), 0);
    const totalImpressions = posts.reduce((sum, post) => sum + (post.impressions || 0), 0);
    const totalEngagement = totalLikes + totalComments + totalShares;

    // Find top performing post by engagement
    const topPost = posts.reduce((max, post) => {
      const postEngagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
      const maxEngagement = (max.likes || 0) + (max.comments || 0) + (max.shares || 0);
      return postEngagement > maxEngagement ? post : max;
    }, posts[0]);

    // Calculate average engagement rate
    const avgEngagementRate = totalImpressions > 0
      ? (totalEngagement / totalImpressions) * 100
      : 0;

    return {
      competitorId,
      competitorName,
      totalPosts: posts.length,
      totalLikes,
      totalComments,
      totalShares,
      totalImpressions,
      totalEngagement,
      avgEngagementRate,
      topPost,
      lastPosted: posts[0]?.postedDate,
    };
  } catch (error) {
    console.error('Error calculating competitor metrics:', error);
    throw new Error('Failed to calculate competitor metrics');
  }
}

/**
 * Compare multiple competitors
 */
export async function compareCompetitors(
  userId: string,
  competitorIds: Array<{ id: string; name: string }>
): Promise<CompetitorComparison> {
  try {
    const metricsPromises = competitorIds.map(({ id, name }) =>
      getCompetitorMetrics(userId, id, name)
    );

    const competitors = await Promise.all(metricsPromises);

    return {
      competitors,
    };
  } catch (error) {
    console.error('Error comparing competitors:', error);
    throw new Error('Failed to compare competitors');
  }
}

/**
 * Get all posts across all competitors for a user
 */
export async function getAllCompetitorPosts(userId: string): Promise<CompetitorPost[]> {
  try {
    const db = getFirestore();
    // This is a bit complex as we need to query across subcollections
    // We'll need to get all competitor IDs first, then fetch their posts
    const userPostsRef = collection(db, COMPETITOR_POSTS_COLLECTION, userId, 'competitors');
    const competitorsSnap = await getDocs(userPostsRef);

    const allPosts: CompetitorPost[] = [];

    for (const competitorDoc of competitorsSnap.docs) {
      const postsRef = collection(
        db,
        COMPETITOR_POSTS_COLLECTION,
        userId,
        'competitors',
        competitorDoc.id,
        'posts'
      );

      const postsSnap = await getDocs(postsRef);
      const posts = postsSnap.docs.map(doc => doc.data() as CompetitorPost);
      allPosts.push(...posts);
    }

    // Sort by extracted date (most recent first)
    return allPosts.sort((a, b) => {
      const aTime = a.extractedAt instanceof Timestamp ? a.extractedAt.toMillis() : 0;
      const bTime = b.extractedAt instanceof Timestamp ? b.extractedAt.toMillis() : 0;
      return bTime - aTime;
    });
  } catch (error) {
    console.error('Error getting all competitor posts:', error);
    throw new Error('Failed to get all competitor posts');
  }
}

/**
 * Delete all posts for a competitor (when competitor is deleted)
 */
export async function deleteCompetitorPosts(
  userId: string,
  competitorId: string
): Promise<void> {
  try {
    const db = getFirestore();
    const postsRef = collection(
      db,
      COMPETITOR_POSTS_COLLECTION,
      userId,
      'competitors',
      competitorId,
      'posts'
    );

    const postsSnap = await getDocs(postsRef);

    // Delete in batches of 500 (Firestore limit)
    const batch = writeBatch(db);
    let count = 0;

    for (const postDoc of postsSnap.docs) {
      batch.delete(postDoc.ref);
      count++;

      if (count >= 500) {
        await batch.commit();
        count = 0;
      }
    }

    if (count > 0) {
      await batch.commit();
    }

    // Also delete sync metadata
    const metadataRef = doc(
      db,
      SYNC_METADATA_COLLECTION,
      userId,
      'competitors',
      competitorId
    );

    await batch.delete(metadataRef);
    await batch.commit();
  } catch (error) {
    console.error('Error deleting competitor posts:', error);
    throw new Error('Failed to delete competitor posts');
  }
}
