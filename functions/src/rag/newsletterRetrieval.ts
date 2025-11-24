/**
 * Newsletter Retrieval Service
 *
 * Semantic search over indexed newsletters using Qdrant.
 * Returns relevant newsletter chunks for post generation context.
 */

import {
  COLLECTIONS,
  searchVectors,
  NewsletterPayload,
} from './qdrantClient';
import { embedText } from './embeddings';

/**
 * Retrieved newsletter context with source information
 */
export interface RetrievedNewsletterChunk {
  text: string;
  subject: string;
  from: string;
  date: string;
  relevanceScore: number;
  emailId: string;
}

/**
 * Grouped context by source email
 */
export interface NewsletterContext {
  emailId: string;
  subject: string;
  from: string;
  date: string;
  chunks: Array<{
    text: string;
    relevanceScore: number;
  }>;
  avgRelevanceScore: number;
}

/**
 * Retrieval result with formatted context
 */
export interface RetrievalResult {
  chunks: RetrievedNewsletterChunk[];
  groupedBySource: NewsletterContext[];
  totalChunks: number;
  query: string;
}

/**
 * Search for relevant newsletter content
 *
 * @param query - The search query (e.g., post idea topic)
 * @param userId - Filter to user's newsletters
 * @param limit - Maximum number of chunks to return
 * @param minScore - Minimum relevance score (0-1)
 */
export async function retrieveRelevantNewsletters(
  query: string,
  userId?: string,
  limit: number = 10,
  minScore: number = 0.3
): Promise<RetrievalResult> {
  // Generate query embedding
  const queryEmbedding = await embedText(query);

  // Build filter
  const filter = userId
    ? { must: [{ key: 'userId', match: { value: userId } }] }
    : undefined;

  // Search Qdrant
  const results = await searchVectors<NewsletterPayload>(
    COLLECTIONS.NEWSLETTERS,
    queryEmbedding,
    limit * 2, // Fetch more to filter by score
    filter
  );

  // Filter by minimum score
  const filteredResults = results.filter(r => r.score >= minScore);

  // Map to chunks (format from field as string)
  const chunks: RetrievedNewsletterChunk[] = filteredResults
    .slice(0, limit)
    .map(r => ({
      text: r.payload.text,
      subject: r.payload.subject,
      from: typeof r.payload.from === 'string'
        ? r.payload.from
        : `${r.payload.from.name} <${r.payload.from.email}>`,
      date: r.payload.date,
      relevanceScore: r.score,
      emailId: r.payload.emailId,
    }));

  // Group by source email
  const groupedBySource = groupChunksBySource(chunks);

  return {
    chunks,
    groupedBySource,
    totalChunks: chunks.length,
    query,
  };
}

/**
 * Search for multiple topics and merge results
 * Useful when generating ideas from multiple angles
 */
export async function retrieveForMultipleTopics(
  queries: string[],
  userId?: string,
  chunksPerQuery: number = 5
): Promise<RetrievalResult> {
  const allChunks: RetrievedNewsletterChunk[] = [];
  const seenEmailIds = new Set<string>();

  for (const query of queries) {
    const result = await retrieveRelevantNewsletters(
      query,
      userId,
      chunksPerQuery
    );

    // Add unique chunks (avoid duplicates from same email)
    for (const chunk of result.chunks) {
      const key = `${chunk.emailId}-${chunk.text.substring(0, 50)}`;
      if (!seenEmailIds.has(key)) {
        seenEmailIds.add(key);
        allChunks.push(chunk);
      }
    }
  }

  // Sort by relevance score
  allChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);

  return {
    chunks: allChunks,
    groupedBySource: groupChunksBySource(allChunks),
    totalChunks: allChunks.length,
    query: queries.join(' | '),
  };
}

/**
 * Format retrieved context for LLM prompt
 */
export function formatContextForPrompt(
  result: RetrievalResult,
  maxChunks: number = 5
): string {
  const topChunks = result.chunks.slice(0, maxChunks);

  if (topChunks.length === 0) {
    return 'No relevant newsletter content found.';
  }

  const formatted = topChunks.map((chunk, index) => {
    const date = new Date(chunk.date).toLocaleDateString();
    return `[Source ${index + 1}] From: ${chunk.from} | Subject: "${chunk.subject}" | Date: ${date}
Relevance: ${(chunk.relevanceScore * 100).toFixed(0)}%

${chunk.text}`;
  });

  return formatted.join('\n\n---\n\n');
}

/**
 * Format as citation-ready context
 * Returns structured data that can be cited in posts
 */
export function formatContextWithCitations(
  result: RetrievalResult,
  maxSources: number = 3
): Array<{
  sourceId: string;
  citation: string;
  content: string;
  relevance: number;
}> {
  const topSources = result.groupedBySource.slice(0, maxSources);

  return topSources.map((source, index) => ({
    sourceId: `S${index + 1}`,
    citation: `${source.from.split('<')[0].trim()} - "${source.subject}"`,
    content: source.chunks.map(c => c.text).join('\n\n'),
    relevance: source.avgRelevanceScore,
  }));
}

/**
 * Get trending topics from recent newsletters
 * Searches for general AI/tech topics and returns most relevant
 */
export async function getTrendingTopicsFromNewsletters(
  userId?: string,
  topicQueries: string[] = [
    'AI breakthroughs and announcements',
    'new AI models and capabilities',
    'AI in business and enterprise',
    'AI tools and productivity',
    'AI ethics and regulation',
  ]
): Promise<{
  topics: Array<{
    topic: string;
    sources: NewsletterContext[];
    strength: number;
  }>;
  rawChunks: RetrievedNewsletterChunk[];
}> {
  const topicResults: Array<{
    topic: string;
    sources: NewsletterContext[];
    strength: number;
  }> = [];

  const allChunks: RetrievedNewsletterChunk[] = [];

  for (const topic of topicQueries) {
    const result = await retrieveRelevantNewsletters(topic, userId, 3, 0.4);

    if (result.chunks.length > 0) {
      const avgScore =
        result.chunks.reduce((sum, c) => sum + c.relevanceScore, 0) /
        result.chunks.length;

      topicResults.push({
        topic,
        sources: result.groupedBySource,
        strength: avgScore,
      });

      allChunks.push(...result.chunks);
    }
  }

  // Sort by strength
  topicResults.sort((a, b) => b.strength - a.strength);

  return {
    topics: topicResults,
    rawChunks: allChunks,
  };
}

/**
 * Group chunks by their source email
 */
function groupChunksBySource(
  chunks: RetrievedNewsletterChunk[]
): NewsletterContext[] {
  const groups = new Map<string, NewsletterContext>();

  for (const chunk of chunks) {
    const existing = groups.get(chunk.emailId);

    if (existing) {
      existing.chunks.push({
        text: chunk.text,
        relevanceScore: chunk.relevanceScore,
      });
      // Recalculate average
      existing.avgRelevanceScore =
        existing.chunks.reduce((sum, c) => sum + c.relevanceScore, 0) /
        existing.chunks.length;
    } else {
      groups.set(chunk.emailId, {
        emailId: chunk.emailId,
        subject: chunk.subject,
        from: chunk.from,
        date: chunk.date,
        chunks: [
          {
            text: chunk.text,
            relevanceScore: chunk.relevanceScore,
          },
        ],
        avgRelevanceScore: chunk.relevanceScore,
      });
    }
  }

  // Sort by average relevance score
  return Array.from(groups.values()).sort(
    (a, b) => b.avgRelevanceScore - a.avgRelevanceScore
  );
}

/**
 * Hybrid search: combine semantic search with recency boost
 */
export async function retrieveWithRecencyBoost(
  query: string,
  userId?: string,
  limit: number = 10,
  recencyDays: number = 7,
  recencyBoostFactor: number = 0.1
): Promise<RetrievalResult> {
  const result = await retrieveRelevantNewsletters(query, userId, limit * 2);

  const now = new Date();
  const cutoffDate = new Date(now.getTime() - recencyDays * 24 * 60 * 60 * 1000);

  // Apply recency boost
  const boostedChunks = result.chunks.map(chunk => {
    const chunkDate = new Date(chunk.date);
    const isRecent = chunkDate >= cutoffDate;

    return {
      ...chunk,
      relevanceScore: isRecent
        ? Math.min(1, chunk.relevanceScore + recencyBoostFactor)
        : chunk.relevanceScore,
    };
  });

  // Re-sort by boosted score
  boostedChunks.sort((a, b) => b.relevanceScore - a.relevanceScore);

  const topChunks = boostedChunks.slice(0, limit);

  return {
    chunks: topChunks,
    groupedBySource: groupChunksBySource(topChunks),
    totalChunks: topChunks.length,
    query,
  };
}
