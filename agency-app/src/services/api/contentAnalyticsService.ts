// src/services/api/contentAnalyticsService.ts
import {
  Timestamp,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  query,
  orderBy,
  writeBatch,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import type {
  ContentAnalyticsSummary,
  LinkedInDiscovery,
  LinkedInDailyEngagement,
  LinkedInTopPost,
  LinkedInFollowers,
  LinkedInDemographics,
  TDSSummary,
  TDSArticle,
  MediumSummary,
  MediumStory,
  CrossPlatformMetrics,
  TopPerformingContent,
  PlatformPerformance,
  ParsedLinkedInData,
  ParsedTDSData,
  ParsedMediumData,
} from '../../types/contentAnalytics';

// ===== CONSTANTS =====

const ANALYTICS_USER_ID = 'mostafa';
const ANALYTICS_COLLECTION = 'contentAnalytics';

// Helper to get the parent doc ref
function parentDocRef() {
  return doc(db, ANALYTICS_COLLECTION, ANALYTICS_USER_ID);
}

// Helper to get a subcollection ref
function subCollectionRef(subcollection: string) {
  return collection(db, ANALYTICS_COLLECTION, ANALYTICS_USER_ID, subcollection);
}

// Helper to get a specific doc in a subcollection
function subDocRef(subcollection: string, docId: string) {
  return doc(db, ANALYTICS_COLLECTION, ANALYTICS_USER_ID, subcollection, docId);
}

// ===== READ FUNCTIONS =====

/**
 * Get the top-level content analytics summary document
 */
export async function getContentAnalyticsSummary(): Promise<ContentAnalyticsSummary | null> {
  try {
    const snapshot = await getDoc(parentDocRef());
    if (!snapshot.exists()) {
      return null;
    }
    return snapshot.data() as ContentAnalyticsSummary;
  } catch (error) {
    console.error('Failed to get content analytics summary:', error);
    throw error;
  }
}

/**
 * Get LinkedIn discovery metrics
 */
export async function getLinkedInDiscovery(): Promise<LinkedInDiscovery | null> {
  try {
    const snapshot = await getDoc(subDocRef('linkedin_discovery', 'summary'));
    if (!snapshot.exists()) {
      return null;
    }
    return snapshot.data() as LinkedInDiscovery;
  } catch (error) {
    console.error('Failed to get LinkedIn discovery:', error);
    throw error;
  }
}

/**
 * Get LinkedIn daily engagement data, sorted by date ascending
 */
export async function getLinkedInEngagement(): Promise<LinkedInDailyEngagement[]> {
  try {
    const q = query(
      subCollectionRef('linkedin_engagement'),
      orderBy('date', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as LinkedInDailyEngagement);
  } catch (error) {
    console.error('Failed to get LinkedIn engagement:', error);
    throw error;
  }
}

/**
 * Get LinkedIn top posts, sorted by impressions descending
 */
export async function getLinkedInPosts(): Promise<LinkedInTopPost[]> {
  try {
    const q = query(
      subCollectionRef('linkedin_posts'),
      orderBy('impressions', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as LinkedInTopPost);
  } catch (error) {
    console.error('Failed to get LinkedIn posts:', error);
    throw error;
  }
}

/**
 * Get LinkedIn followers summary
 */
export async function getLinkedInFollowers(): Promise<LinkedInFollowers | null> {
  try {
    const snapshot = await getDoc(subDocRef('linkedin_followers', 'summary'));
    if (!snapshot.exists()) {
      return null;
    }
    return snapshot.data() as LinkedInFollowers;
  } catch (error) {
    console.error('Failed to get LinkedIn followers:', error);
    throw error;
  }
}

/**
 * Get LinkedIn demographics summary
 */
export async function getLinkedInDemographics(): Promise<LinkedInDemographics | null> {
  try {
    const snapshot = await getDoc(subDocRef('linkedin_demographics', 'summary'));
    if (!snapshot.exists()) {
      return null;
    }
    return snapshot.data() as LinkedInDemographics;
  } catch (error) {
    console.error('Failed to get LinkedIn demographics:', error);
    throw error;
  }
}

/**
 * Get TDS summary
 */
export async function getTDSSummary(): Promise<TDSSummary | null> {
  try {
    const snapshot = await getDoc(subDocRef('tds_summary', 'latest'));
    if (!snapshot.exists()) {
      return null;
    }
    return snapshot.data() as TDSSummary;
  } catch (error) {
    console.error('Failed to get TDS summary:', error);
    throw error;
  }
}

/**
 * Get TDS articles, sorted by pageviewsLifetime descending
 */
export async function getTDSArticles(): Promise<TDSArticle[]> {
  try {
    const q = query(
      subCollectionRef('tds_articles'),
      orderBy('pageviewsLifetime', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as TDSArticle);
  } catch (error) {
    console.error('Failed to get TDS articles:', error);
    throw error;
  }
}

/**
 * Get Medium summary
 */
export async function getMediumSummary(): Promise<MediumSummary | null> {
  try {
    const snapshot = await getDoc(subDocRef('medium_summary', 'latest'));
    if (!snapshot.exists()) {
      return null;
    }
    return snapshot.data() as MediumSummary;
  } catch (error) {
    console.error('Failed to get Medium summary:', error);
    throw error;
  }
}

/**
 * Get Medium stories, sorted by views descending
 */
export async function getMediumStories(): Promise<MediumStory[]> {
  try {
    const q = query(
      subCollectionRef('medium_stories'),
      orderBy('views', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as MediumStory);
  } catch (error) {
    console.error('Failed to get Medium stories:', error);
    throw error;
  }
}

// ===== WRITE FUNCTIONS =====

/**
 * Helper to delete all docs in a subcollection
 */
async function deleteSubcollection(subcollectionName: string): Promise<void> {
  const snapshot = await getDocs(subCollectionRef(subcollectionName));
  if (snapshot.empty) return;

  // Firestore batches support max 500 ops, split if needed
  const docs = snapshot.docs;
  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + 500);
    chunk.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }
}

/**
 * Helper to batch write docs to a subcollection, respecting 500 op limit
 */
async function batchWriteDocs(
  subcollectionName: string,
  docs: Array<{ id: string; data: Record<string, any> }>
): Promise<void> {
  for (let i = 0; i < docs.length; i += 500) {
    const batch = writeBatch(db);
    const chunk = docs.slice(i, i + 500);
    chunk.forEach(({ id, data }) => {
      batch.set(subDocRef(subcollectionName, id), data);
    });
    await batch.commit();
  }
}

/**
 * Sync LinkedIn data from parsed CSV/export data
 * Deletes existing data and writes fresh data using batches
 */
export async function syncLinkedInData(data: ParsedLinkedInData): Promise<void> {
  try {
    // Delete existing subcollection docs
    await Promise.all([
      deleteSubcollection('linkedin_engagement'),
      deleteSubcollection('linkedin_posts'),
    ]);

    const now = Timestamp.now();

    // Write discovery summary
    await setDoc(subDocRef('linkedin_discovery', 'summary'), {
      ...data.discovery,
      syncedAt: now,
    });

    // Write engagement docs
    await batchWriteDocs(
      'linkedin_engagement',
      data.engagement.map(entry => ({
        id: entry.date,
        data: entry,
      }))
    );

    // Write top posts
    await batchWriteDocs(
      'linkedin_posts',
      data.topPosts.map(post => ({
        id: post.id,
        data: post,
      }))
    );

    // Write followers summary
    await setDoc(subDocRef('linkedin_followers', 'summary'), {
      ...data.followers,
      syncedAt: now,
    });

    // Write demographics summary
    await setDoc(subDocRef('linkedin_demographics', 'summary'), {
      ...data.demographics,
      syncedAt: now,
    });

    // Update parent doc with LinkedIn platform summary
    const parentSnapshot = await getDoc(parentDocRef());
    const parentData = parentSnapshot.exists() ? parentSnapshot.data() : {};

    const linkedInSummary = {
      lastSyncAt: now,
      totalImpressions: data.discovery.overallImpressions,
      totalEngagement: data.topPosts.reduce((sum, p) => sum + p.engagements, 0),
      totalFollowers: data.followers.totalFollowers,
      postCount: data.topPosts.length,
    };

    await setDoc(parentDocRef(), {
      ...parentData,
      lastSyncAt: now,
      platforms: {
        ...(parentData?.platforms || {}),
        linkedin: linkedInSummary,
      },
    }, { merge: true });
  } catch (error) {
    console.error('Failed to sync LinkedIn data:', error);
    throw error;
  }
}

/**
 * Sync TDS data from parsed export data
 * Deletes existing articles and writes fresh data
 */
export async function syncTDSData(data: ParsedTDSData): Promise<void> {
  try {
    // Delete existing articles
    await deleteSubcollection('tds_articles');

    const now = Timestamp.now();

    // Write summary
    await setDoc(subDocRef('tds_summary', 'latest'), {
      ...data.summary,
      syncedAt: now,
    });

    // Write articles
    await batchWriteDocs(
      'tds_articles',
      data.articles.map(article => ({
        id: article.id,
        data: article,
      }))
    );

    // Update parent doc with TDS platform summary
    const parentSnapshot = await getDoc(parentDocRef());
    const parentData = parentSnapshot.exists() ? parentSnapshot.data() : {};

    const tdsSummary = {
      lastSyncAt: now,
      totalPageviews: data.summary.totalPageviews,
      totalEngagedViews: data.summary.totalEngagedViews,
      totalEarnings: data.summary.totalEarnings,
      articleCount: data.summary.totalArticles,
    };

    await setDoc(parentDocRef(), {
      ...parentData,
      lastSyncAt: now,
      platforms: {
        ...(parentData?.platforms || {}),
        tds: tdsSummary,
      },
    }, { merge: true });
  } catch (error) {
    console.error('Failed to sync TDS data:', error);
    throw error;
  }
}

/**
 * Sync Medium data from parsed export data
 * Deletes existing stories and writes fresh data
 */
export async function syncMediumData(data: ParsedMediumData): Promise<void> {
  try {
    // Delete existing stories
    await deleteSubcollection('medium_stories');

    const now = Timestamp.now();

    // Write summary
    await setDoc(subDocRef('medium_summary', 'latest'), {
      ...data.summary,
      syncedAt: now,
    });

    // Write stories
    await batchWriteDocs(
      'medium_stories',
      data.stories.map(story => ({
        id: story.id,
        data: story,
      }))
    );

    // Update parent doc with Medium platform summary
    const parentSnapshot = await getDoc(parentDocRef());
    const parentData = parentSnapshot.exists() ? parentSnapshot.data() : {};

    const mediumSummary = {
      lastSyncAt: now,
      totalViews: data.summary.totalViews,
      totalReads: data.summary.totalReads,
      totalEarnings: data.summary.totalEarnings,
      storyCount: data.summary.totalStories,
    };

    await setDoc(parentDocRef(), {
      ...parentData,
      lastSyncAt: now,
      platforms: {
        ...(parentData?.platforms || {}),
        medium: mediumSummary,
      },
    }, { merge: true });
  } catch (error) {
    console.error('Failed to sync Medium data:', error);
    throw error;
  }
}

/**
 * Update cross-platform aggregate metrics
 * Reads all platform summaries and computes combined metrics
 */
export async function updateCrossPlatformAggregates(): Promise<void> {
  try {
    const parentSnapshot = await getDoc(parentDocRef());
    if (!parentSnapshot.exists()) {
      console.warn('No content analytics parent doc found');
      return;
    }

    const parentData = parentSnapshot.data() as ContentAnalyticsSummary;
    const { platforms } = parentData;

    // Compute totals from platform summaries
    let totalReach = 0;
    let totalEngagement = 0;
    let totalContentPieces = 0;
    let totalEarnings = 0;
    const platformPerformance: PlatformPerformance[] = [];

    if (platforms?.linkedin) {
      const li = platforms.linkedin;
      totalReach += li.totalImpressions;
      totalEngagement += li.totalEngagement;
      totalContentPieces += li.postCount;
      platformPerformance.push({
        platform: 'linkedin',
        totalPieces: li.postCount,
        avgReachPerPiece: li.postCount > 0 ? li.totalImpressions / li.postCount : 0,
        avgEngagementRate: li.totalImpressions > 0
          ? (li.totalEngagement / li.totalImpressions) * 100
          : 0,
      });
    }

    if (platforms?.tds) {
      const tds = platforms.tds;
      totalReach += tds.totalPageviews;
      totalEngagement += tds.totalEngagedViews;
      totalContentPieces += tds.articleCount;
      totalEarnings += tds.totalEarnings;
      platformPerformance.push({
        platform: 'tds',
        totalPieces: tds.articleCount,
        avgReachPerPiece: tds.articleCount > 0 ? tds.totalPageviews / tds.articleCount : 0,
        avgEngagementRate: tds.totalPageviews > 0
          ? (tds.totalEngagedViews / tds.totalPageviews) * 100
          : 0,
      });
    }

    if (platforms?.medium) {
      const med = platforms.medium;
      totalReach += med.totalViews;
      totalEngagement += med.totalReads;
      totalContentPieces += med.storyCount;
      totalEarnings += med.totalEarnings;
      platformPerformance.push({
        platform: 'medium',
        totalPieces: med.storyCount,
        avgReachPerPiece: med.storyCount > 0 ? med.totalViews / med.storyCount : 0,
        avgEngagementRate: med.totalViews > 0
          ? (med.totalReads / med.totalViews) * 100
          : 0,
      });
    }

    // Get top performing content from each platform subcollection
    const topContent: TopPerformingContent[] = [];

    // LinkedIn top posts
    const linkedInPostsQuery = query(
      subCollectionRef('linkedin_posts'),
      orderBy('impressions', 'desc'),
      limit(5)
    );
    const linkedInPostsSnapshot = await getDocs(linkedInPostsQuery);
    linkedInPostsSnapshot.docs.forEach(doc => {
      const post = doc.data() as LinkedInTopPost;
      topContent.push({
        title: post.url,
        platform: 'linkedin',
        reach: post.impressions,
        engagement: post.engagements,
      });
    });

    // TDS top articles
    const tdsArticlesQuery = query(
      subCollectionRef('tds_articles'),
      orderBy('pageviewsLifetime', 'desc'),
      limit(5)
    );
    const tdsArticlesSnapshot = await getDocs(tdsArticlesQuery);
    tdsArticlesSnapshot.docs.forEach(doc => {
      const article = doc.data() as TDSArticle;
      topContent.push({
        title: article.title,
        platform: 'tds',
        reach: article.pageviewsLifetime,
        engagement: article.engagedViewsLifetime,
      });
    });

    // Medium top stories
    const mediumStoriesQuery = query(
      subCollectionRef('medium_stories'),
      orderBy('views', 'desc'),
      limit(5)
    );
    const mediumStoriesSnapshot = await getDocs(mediumStoriesQuery);
    mediumStoriesSnapshot.docs.forEach(doc => {
      const story = doc.data() as MediumStory;
      topContent.push({
        title: story.title,
        platform: 'medium',
        reach: story.views,
        engagement: story.reads,
      });
    });

    // Sort all top content by reach descending
    topContent.sort((a, b) => b.reach - a.reach);

    const crossPlatform: CrossPlatformMetrics = {
      totalReach,
      totalEngagement,
      totalContentPieces,
      totalEarnings,
      topPerformingContent: topContent,
      platformPerformance,
    };

    // Write back to parent doc
    await setDoc(parentDocRef(), {
      crossPlatform,
      lastSyncAt: Timestamp.now(),
    }, { merge: true });
  } catch (error) {
    console.error('Failed to update cross-platform aggregates:', error);
    throw error;
  }
}

// ===== SUBSCRIBE FUNCTION =====

/**
 * Subscribe to real-time updates on the content analytics parent document
 */
export function subscribeToContentAnalytics(
  callback: (data: ContentAnalyticsSummary | null) => void
): () => void {
  return onSnapshot(parentDocRef(), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback(snapshot.data() as ContentAnalyticsSummary);
  });
}
