/**
 * OpenAI Embeddings Service
 *
 * Handles text embedding generation using OpenAI's text-embedding-3-small model.
 * Optimized for cost and speed while maintaining good semantic quality.
 */

import OpenAI from 'openai';
import { EMBEDDING_DIMENSION } from './qdrantClient';

// Model configuration
const EMBEDDING_MODEL = 'text-embedding-3-small';
const MAX_TOKENS_PER_CHUNK = 8000; // text-embedding-3-small supports 8191 tokens
const CHARS_PER_TOKEN_ESTIMATE = 4; // Rough estimate for chunking

// Cost tracking (per 1M tokens)
const COST_PER_MILLION_TOKENS = 0.02; // $0.02 per 1M tokens for text-embedding-3-small

let openaiClient: OpenAI | null = null;

/**
 * Get or create OpenAI client instance
 */
function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Generate embedding for a single text
 */
export async function embedText(text: string): Promise<number[]> {
  const client = getOpenAIClient();

  const response = await client.embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMENSION,
  });

  return response.data[0].embedding;
}

/**
 * Generate embeddings for multiple texts (batched for efficiency)
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = getOpenAIClient();

  // OpenAI supports batching up to 2048 inputs
  const batchSize = 100;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSION,
    });

    // Sort by index to maintain order
    const sortedData = response.data.sort((a, b) => a.index - b.index);
    allEmbeddings.push(...sortedData.map(d => d.embedding));
  }

  return allEmbeddings;
}

/**
 * Chunk text into smaller pieces for embedding
 * Uses semantic boundaries (paragraphs, sentences) when possible
 */
export function chunkText(
  text: string,
  maxChunkSize: number = MAX_TOKENS_PER_CHUNK * CHARS_PER_TOKEN_ESTIMATE
): string[] {
  if (!text || text.trim().length === 0) return [];

  const chunks: string[] = [];
  const paragraphs = text.split(/\n\n+/);

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();
    if (!trimmedParagraph) continue;

    // If adding this paragraph exceeds limit, save current chunk and start new one
    if (currentChunk.length + trimmedParagraph.length + 2 > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }

      // If paragraph itself is too long, split by sentences
      if (trimmedParagraph.length > maxChunkSize) {
        const sentenceChunks = chunkBySentences(trimmedParagraph, maxChunkSize);
        chunks.push(...sentenceChunks.slice(0, -1));
        currentChunk = sentenceChunks[sentenceChunks.length - 1] || '';
      } else {
        currentChunk = trimmedParagraph;
      }
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + trimmedParagraph;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Split text by sentences when paragraphs are too long
 */
function chunkBySentences(text: string, maxChunkSize: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();

    if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize) {
      if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = trimmedSentence;
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Prepare newsletter email for embedding
 * Combines subject and body into a structured format
 */
export function prepareNewsletterForEmbedding(
  subject: string,
  body: string,
  from: string
): string {
  // Clean and structure the content
  const cleanBody = body
    .replace(/\s+/g, ' ')
    .replace(/\[.*?\]/g, '') // Remove markdown links
    .replace(/https?:\/\/\S+/g, '') // Remove URLs
    .trim();

  return `Subject: ${subject}\nFrom: ${from}\n\n${cleanBody}`;
}

/**
 * Estimate embedding cost for a batch of texts
 */
export function estimateEmbeddingCost(texts: string[]): number {
  const totalChars = texts.reduce((sum, t) => sum + t.length, 0);
  const estimatedTokens = totalChars / CHARS_PER_TOKEN_ESTIMATE;
  return (estimatedTokens / 1_000_000) * COST_PER_MILLION_TOKENS;
}

/**
 * Embedding result with metadata
 */
export interface EmbeddingResult {
  text: string;
  embedding: number[];
  tokenCount: number;
}

/**
 * Generate embeddings with token count tracking
 */
export async function embedWithMetadata(texts: string[]): Promise<EmbeddingResult[]> {
  if (texts.length === 0) return [];

  const client = getOpenAIClient();
  const results: EmbeddingResult[] = [];

  const batchSize = 100;

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);

    const response = await client.embeddings.create({
      model: EMBEDDING_MODEL,
      input: batch,
      dimensions: EMBEDDING_DIMENSION,
    });

    const sortedData = response.data.sort((a, b) => a.index - b.index);

    for (let j = 0; j < sortedData.length; j++) {
      results.push({
        text: batch[j],
        embedding: sortedData[j].embedding,
        // Estimate token count from usage
        tokenCount: Math.ceil(response.usage.total_tokens / batch.length),
      });
    }
  }

  return results;
}
