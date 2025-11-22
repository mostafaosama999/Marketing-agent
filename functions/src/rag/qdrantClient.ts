/**
 * Qdrant Vector Database Client
 *
 * Manages connection to Qdrant Cloud for semantic search across content sources.
 * Uses OpenAI text-embedding-3-small (1536 dimensions) for embeddings.
 */

import { QdrantClient } from '@qdrant/js-client-rest';

// Collection names for different content sources
export const COLLECTIONS = {
  NEWSLETTERS: 'newsletters',
  EMAILS: 'emails',           // Future: voice/tone modeling
  LINKEDIN_POSTS: 'linkedin_posts',  // Future: performance patterns
  COMPETITOR_POSTS: 'competitor_posts', // Future: competitive analysis
} as const;

// OpenAI text-embedding-3-small produces 1536-dimensional vectors
export const EMBEDDING_DIMENSION = 1536;

// Singleton client instance
let qdrantClient: QdrantClient | null = null;

/**
 * Get or create Qdrant client instance
 * Uses environment variables for configuration
 */
export function getQdrantClient(): QdrantClient {
  if (!qdrantClient) {
    const url = process.env.QDRANT_URL;
    const apiKey = process.env.QDRANT_API_KEY;

    if (!url) {
      throw new Error('QDRANT_URL environment variable is required');
    }

    qdrantClient = new QdrantClient({
      url,
      apiKey, // Optional for local development
    });
  }

  return qdrantClient;
}

/**
 * Initialize a collection if it doesn't exist
 */
export async function ensureCollection(collectionName: string): Promise<void> {
  const client = getQdrantClient();

  try {
    // Check if collection exists
    const collections = await client.getCollections();
    const exists = collections.collections.some(c => c.name === collectionName);

    if (!exists) {
      await client.createCollection(collectionName, {
        vectors: {
          size: EMBEDDING_DIMENSION,
          distance: 'Cosine',
        },
        // Optimized for small-medium datasets
        optimizers_config: {
          default_segment_number: 2,
        },
        // Enable payload indexing for filtering
        on_disk_payload: true,
      });

      // Create payload indexes for common filters
      await client.createPayloadIndex(collectionName, {
        field_name: 'userId',
        field_schema: 'keyword',
      });

      await client.createPayloadIndex(collectionName, {
        field_name: 'sourceType',
        field_schema: 'keyword',
      });

      await client.createPayloadIndex(collectionName, {
        field_name: 'date',
        field_schema: 'datetime',
      });

      console.log(`Created collection: ${collectionName}`);
    }
  } catch (error) {
    console.error(`Error ensuring collection ${collectionName}:`, error);
    throw error;
  }
}

/**
 * Payload structure for newsletter chunks
 */
export interface NewsletterPayload {
  emailId: string;
  chunkIndex: number;
  text: string;
  subject: string;
  from: string;
  date: string;
  userId: string;
  sourceType: 'newsletter';
}

/**
 * Search result with score
 */
export interface SearchResult<T> {
  id: string | number;
  score: number;
  payload: T;
}

/**
 * Upsert vectors to a collection
 */
export async function upsertVectors(
  collectionName: string,
  points: Array<{
    id: string | number;
    vector: number[];
    payload: Record<string, unknown>;
  }>
): Promise<void> {
  const client = getQdrantClient();

  await client.upsert(collectionName, {
    wait: true,
    points,
  });
}

/**
 * Search for similar vectors
 */
export async function searchVectors<T>(
  collectionName: string,
  queryVector: number[],
  limit: number = 5,
  filter?: {
    must?: Array<{ key: string; match: { value: string } }>;
  }
): Promise<SearchResult<T>[]> {
  const client = getQdrantClient();

  const results = await client.search(collectionName, {
    vector: queryVector,
    limit,
    with_payload: true,
    filter: filter ? {
      must: filter.must?.map(f => ({
        key: f.key,
        match: { value: f.match.value },
      })),
    } : undefined,
  });

  return results.map(r => ({
    id: r.id,
    score: r.score,
    payload: r.payload as T,
  }));
}

/**
 * Delete vectors by filter
 */
export async function deleteVectors(
  collectionName: string,
  filter: {
    must: Array<{ key: string; match: { value: string } }>;
  }
): Promise<void> {
  const client = getQdrantClient();

  await client.delete(collectionName, {
    wait: true,
    filter: {
      must: filter.must.map(f => ({
        key: f.key,
        match: { value: f.match.value },
      })),
    },
  });
}

/**
 * Get collection info (for debugging/monitoring)
 */
export async function getCollectionInfo(collectionName: string) {
  const client = getQdrantClient();
  return client.getCollection(collectionName);
}
