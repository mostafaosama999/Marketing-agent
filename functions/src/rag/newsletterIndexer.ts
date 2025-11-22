/**
 * Newsletter Indexer
 *
 * Indexes newsletter emails into Qdrant for semantic retrieval.
 * Chunks emails, generates embeddings, and upserts to vector database.
 */

import * as admin from 'firebase-admin';
import { v4 as uuidv4 } from 'uuid';
import {
  COLLECTIONS,
  ensureCollection,
  upsertVectors,
  deleteVectors,
  NewsletterPayload,
} from './qdrantClient';
import {
  chunkText,
  embedTexts,
  prepareNewsletterForEmbedding,
  estimateEmbeddingCost,
} from './embeddings';

const db = admin.firestore();

/**
 * Newsletter document structure from Firestore
 */
interface NewsletterDoc {
  id: string;
  subject: string;
  from: string;
  body: string;
  date: admin.firestore.Timestamp | Date | string;
  userId?: string;
  indexed?: boolean;
  indexedAt?: admin.firestore.Timestamp;
}

/**
 * Indexing result
 */
export interface IndexingResult {
  emailId: string;
  chunksCreated: number;
  estimatedCost: number;
  success: boolean;
  error?: string;
}

/**
 * Index a single newsletter email
 */
export async function indexNewsletter(
  newsletter: NewsletterDoc,
  userId: string
): Promise<IndexingResult> {
  try {
    // Ensure collection exists
    await ensureCollection(COLLECTIONS.NEWSLETTERS);

    // Prepare content for embedding
    const fullContent = prepareNewsletterForEmbedding(
      newsletter.subject,
      newsletter.body,
      newsletter.from
    );

    // Chunk the content
    const chunks = chunkText(fullContent);

    if (chunks.length === 0) {
      return {
        emailId: newsletter.id,
        chunksCreated: 0,
        estimatedCost: 0,
        success: true,
      };
    }

    // Generate embeddings for all chunks
    const embeddings = await embedTexts(chunks);
    const estimatedCost = estimateEmbeddingCost(chunks);

    // Parse date
    const dateStr = parseDate(newsletter.date);

    // Prepare points for Qdrant
    const points = chunks.map((chunk, index) => ({
      id: uuidv4(),
      vector: embeddings[index],
      payload: {
        emailId: newsletter.id,
        chunkIndex: index,
        text: chunk,
        subject: newsletter.subject,
        from: newsletter.from,
        date: dateStr,
        userId,
        sourceType: 'newsletter' as const,
      } satisfies NewsletterPayload,
    }));

    // Upsert to Qdrant
    await upsertVectors(COLLECTIONS.NEWSLETTERS, points);

    // Mark as indexed in Firestore
    await db.collection('newsletters').doc(newsletter.id).update({
      indexed: true,
      indexedAt: admin.firestore.FieldValue.serverTimestamp(),
      chunkCount: chunks.length,
    });

    // Store chunk references in Firestore for tracking
    const batch = db.batch();
    for (const point of points) {
      const chunkRef = db
        .collection('newsletterEmbeddings')
        .doc(point.id as string);
      batch.set(chunkRef, {
        emailId: newsletter.id,
        qdrantId: point.id,
        chunkIndex: point.payload.chunkIndex,
        userId,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();

    return {
      emailId: newsletter.id,
      chunksCreated: chunks.length,
      estimatedCost,
      success: true,
    };
  } catch (error) {
    console.error(`Error indexing newsletter ${newsletter.id}:`, error);
    return {
      emailId: newsletter.id,
      chunksCreated: 0,
      estimatedCost: 0,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Index multiple newsletters in batch
 */
export async function indexNewslettersBatch(
  newsletters: NewsletterDoc[],
  userId: string
): Promise<{
  results: IndexingResult[];
  totalChunks: number;
  totalCost: number;
  successCount: number;
  failureCount: number;
}> {
  const results: IndexingResult[] = [];
  let totalChunks = 0;
  let totalCost = 0;
  let successCount = 0;
  let failureCount = 0;

  // Process in smaller batches to avoid timeout
  const batchSize = 10;

  for (let i = 0; i < newsletters.length; i += batchSize) {
    const batch = newsletters.slice(i, i + batchSize);

    const batchResults = await Promise.all(
      batch.map(newsletter => indexNewsletter(newsletter, userId))
    );

    for (const result of batchResults) {
      results.push(result);
      totalChunks += result.chunksCreated;
      totalCost += result.estimatedCost;
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
      }
    }
  }

  return {
    results,
    totalChunks,
    totalCost,
    successCount,
    failureCount,
  };
}

/**
 * Remove newsletter from index (for re-indexing or deletion)
 */
export async function removeNewsletterFromIndex(emailId: string): Promise<void> {
  try {
    // Delete from Qdrant
    await deleteVectors(COLLECTIONS.NEWSLETTERS, {
      must: [{ key: 'emailId', match: { value: emailId } }],
    });

    // Delete tracking documents from Firestore
    const embeddingsSnapshot = await db
      .collection('newsletterEmbeddings')
      .where('emailId', '==', emailId)
      .get();

    const batch = db.batch();
    for (const doc of embeddingsSnapshot.docs) {
      batch.delete(doc.ref);
    }
    await batch.commit();

    // Update newsletter document
    await db.collection('newsletters').doc(emailId).update({
      indexed: false,
      indexedAt: admin.firestore.FieldValue.delete(),
      chunkCount: admin.firestore.FieldValue.delete(),
    });
  } catch (error) {
    console.error(`Error removing newsletter ${emailId} from index:`, error);
    throw error;
  }
}

/**
 * Get unindexed newsletters for a user
 */
export async function getUnindexedNewsletters(
  userId: string,
  limit: number = 100
): Promise<NewsletterDoc[]> {
  const snapshot = await db
    .collection('newsletters')
    .where('userId', '==', userId)
    .where('indexed', '!=', true)
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as NewsletterDoc[];
}

/**
 * Get all newsletters for a user (for initial indexing)
 */
export async function getAllNewslettersForUser(
  userId: string
): Promise<NewsletterDoc[]> {
  const snapshot = await db
    .collection('newsletters')
    .where('userId', '==', userId)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as NewsletterDoc[];
}

/**
 * Get indexing stats for a user
 */
export async function getIndexingStats(userId: string): Promise<{
  totalNewsletters: number;
  indexedNewsletters: number;
  totalChunks: number;
}> {
  const newslettersSnapshot = await db
    .collection('newsletters')
    .where('userId', '==', userId)
    .get();

  const embeddingsSnapshot = await db
    .collection('newsletterEmbeddings')
    .where('userId', '==', userId)
    .get();

  const totalNewsletters = newslettersSnapshot.size;
  const indexedNewsletters = newslettersSnapshot.docs.filter(
    doc => doc.data().indexed === true
  ).length;
  const totalChunks = embeddingsSnapshot.size;

  return {
    totalNewsletters,
    indexedNewsletters,
    totalChunks,
  };
}

/**
 * Parse various date formats to ISO string
 */
function parseDate(
  date: admin.firestore.Timestamp | Date | string | undefined
): string {
  if (!date) return new Date().toISOString();

  if (date instanceof admin.firestore.Timestamp) {
    return date.toDate().toISOString();
  }

  if (date instanceof Date) {
    return date.toISOString();
  }

  // Try parsing string
  const parsed = new Date(date);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return new Date().toISOString();
}
