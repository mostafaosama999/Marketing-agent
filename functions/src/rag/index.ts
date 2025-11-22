/**
 * RAG (Retrieval-Augmented Generation) Module
 *
 * Provides semantic search and retrieval capabilities for content sources.
 * Currently supports newsletters, with future support for emails, LinkedIn posts,
 * and competitor posts.
 */

// Qdrant client and utilities
export {
  getQdrantClient,
  ensureCollection,
  COLLECTIONS,
  EMBEDDING_DIMENSION,
  upsertVectors,
  searchVectors,
  deleteVectors,
  getCollectionInfo,
} from './qdrantClient';
export type { NewsletterPayload, SearchResult } from './qdrantClient';

// Embedding utilities
export {
  embedText,
  embedTexts,
  chunkText,
  prepareNewsletterForEmbedding,
  estimateEmbeddingCost,
  embedWithMetadata,
} from './embeddings';
export type { EmbeddingResult } from './embeddings';

// Newsletter indexing
export {
  indexNewsletter,
  indexNewslettersBatch,
  removeNewsletterFromIndex,
  getUnindexedNewsletters,
  getAllNewslettersForUser,
  getIndexingStats,
} from './newsletterIndexer';
export type { IndexingResult } from './newsletterIndexer';

// Newsletter retrieval
export {
  retrieveRelevantNewsletters,
  retrieveForMultipleTopics,
  formatContextForPrompt,
  formatContextWithCitations,
  getTrendingTopicsFromNewsletters,
  retrieveWithRecencyBoost,
} from './newsletterRetrieval';
export type {
  RetrievedNewsletterChunk,
  NewsletterContext,
  RetrievalResult,
} from './newsletterRetrieval';
