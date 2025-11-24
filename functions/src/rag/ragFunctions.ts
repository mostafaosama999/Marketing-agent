/**
 * RAG Cloud Functions
 *
 * Provides endpoints for managing the RAG system:
 * - Indexing newsletters
 * - Checking RAG status
 * - Bulk indexing operations
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import {
  indexNewsletter,
  indexNewslettersBatch,
  getAllNewslettersForUser,
  getIndexingStats,
} from './newsletterIndexer';
import { ensureCollection, COLLECTIONS } from './qdrantClient';

/**
 * Index all unindexed newsletters for a user
 * Triggered manually when user wants to enable RAG
 */
export const indexNewsletters = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '1GB',
  })
  .https.onCall(async (data, context) => {
    // Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const userId = context.auth.uid;

    try {
      console.log(`📚 [RAG] Starting newsletter indexing for user: ${userId}`);

      // Ensure Qdrant collection exists
      await ensureCollection(COLLECTIONS.NEWSLETTERS);

      // Get all newsletters for user
      const newsletters = await getAllNewslettersForUser(userId);

      if (newsletters.length === 0) {
        return {
          success: true,
          message: 'No newsletters to index',
          stats: {
            totalNewsletters: 0,
            indexedNewsletters: 0,
            totalChunks: 0,
          },
        };
      }

      console.log(`📚 [RAG] Found ${newsletters.length} newsletters to process`);

      // Index in batches
      const result = await indexNewslettersBatch(newsletters, userId);

      console.log(
        `✅ [RAG] Indexing complete: ${result.successCount}/${newsletters.length} newsletters indexed, ${result.totalChunks} chunks created`
      );

      // Get final stats
      const stats = await getIndexingStats(userId);

      return {
        success: true,
        message: `Indexed ${result.successCount} newsletters`,
        stats,
        details: {
          successCount: result.successCount,
          failureCount: result.failureCount,
          totalChunks: result.totalChunks,
          estimatedCost: result.totalCost.toFixed(4),
        },
      };
    } catch (error) {
      console.error('❌ [RAG] Indexing error:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to index newsletters: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

/**
 * Index a single newsletter (triggered on new newsletter)
 * Can be called manually or set up as a Firestore trigger
 */
export const indexSingleNewsletter = functions
  .runWith({
    timeoutSeconds: 120,
    memory: '512MB',
  })
  .https.onCall(async (data: { newsletterId: string }, context) => {
    // Authentication check
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const userId = context.auth.uid;
    const { newsletterId } = data;

    if (!newsletterId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'newsletterId is required'
      );
    }

    try {
      console.log(`📄 [RAG] Indexing newsletter: ${newsletterId}`);

      // Ensure collection exists
      await ensureCollection(COLLECTIONS.NEWSLETTERS);

      // Get the newsletter (newsletters are at newsletters/emails/items)
      const db = admin.firestore();
      const newsletterDoc = await db
        .collection('newsletters')
        .doc('emails')
        .collection('items')
        .doc(newsletterId)
        .get();

      if (!newsletterDoc.exists) {
        throw new functions.https.HttpsError(
          'not-found',
          'Newsletter not found'
        );
      }

      const newsletter = {
        id: newsletterDoc.id,
        ...newsletterDoc.data(),
      };

      // Index the newsletter
      const result = await indexNewsletter(newsletter as any, userId);

      if (!result.success) {
        throw new functions.https.HttpsError('internal', result.error || 'Indexing failed');
      }

      console.log(
        `✅ [RAG] Newsletter indexed: ${result.chunksCreated} chunks created`
      );

      return {
        success: true,
        message: `Newsletter indexed successfully`,
        chunksCreated: result.chunksCreated,
        estimatedCost: result.estimatedCost.toFixed(4),
      };
    } catch (error) {
      console.error('❌ [RAG] Single newsletter indexing error:', error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        'internal',
        `Failed to index newsletter: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  });

/**
 * Get RAG system status for a user
 */
export const getRAGStatus = functions.https.onCall(async (_data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'User must be authenticated'
    );
  }

  const userId = context.auth.uid;

  try {
    const stats = await getIndexingStats(userId);

    const isReady = stats.indexedNewsletters > 0;
    const percentIndexed = stats.totalNewsletters > 0
      ? Math.round((stats.indexedNewsletters / stats.totalNewsletters) * 100)
      : 0;

    return {
      success: true,
      isReady,
      stats: {
        ...stats,
        percentIndexed,
      },
      message: isReady
        ? `RAG is ready with ${stats.indexedNewsletters} newsletters and ${stats.totalChunks} chunks`
        : 'RAG not ready. Please run indexNewsletters first.',
    };
  } catch (error) {
    console.error('❌ [RAG] Status check error:', error);

    // Return a graceful response even on error
    return {
      success: false,
      isReady: false,
      stats: {
        totalNewsletters: 0,
        indexedNewsletters: 0,
        totalChunks: 0,
        percentIndexed: 0,
      },
      message: 'Could not check RAG status. Qdrant may not be configured.',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
});
