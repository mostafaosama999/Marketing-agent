/**
 * AI Concept Cache Service
 *
 * Caches extracted AI concepts in Firestore with 24-hour TTL.
 * Prevents redundant API calls and LLM extraction costs.
 */

import * as admin from "firebase-admin";
import OpenAI from "openai";
import { AIConcept, CachedConcepts, ConceptExtractionResult } from "./types";
import { fetchAndExtractConcepts } from "./extractConcepts";

// Constants
const COLLECTION_NAME = "aiConceptCache";
const CACHE_DOC_ID = "latest";
const DEFAULT_TTL_HOURS = 24;

/**
 * Get cached concepts if available and not expired
 */
export async function getCachedConcepts(
  maxAgeHours: number = DEFAULT_TTL_HOURS
): Promise<AIConcept[] | null> {
  try {
    const db = admin.firestore();
    const doc = await db.collection(COLLECTION_NAME).doc(CACHE_DOC_ID).get();

    if (!doc.exists) {
      console.log("[conceptCache] No cached concepts found");
      return null;
    }

    const data = doc.data() as CachedConcepts;

    // Check if expired
    const now = new Date();
    const expiresAt = data.expiresAt instanceof admin.firestore.Timestamp
      ? data.expiresAt.toDate()
      : new Date(data.expiresAt);

    if (expiresAt < now) {
      console.log("[conceptCache] Cache expired");
      return null;
    }

    // Calculate age
    const extractedAt = data.extractedAt instanceof admin.firestore.Timestamp
      ? data.extractedAt.toDate()
      : new Date(data.extractedAt);
    const ageHours = (now.getTime() - extractedAt.getTime()) / (1000 * 60 * 60);

    if (ageHours > maxAgeHours) {
      console.log(`[conceptCache] Cache too old (${ageHours.toFixed(1)}h > ${maxAgeHours}h)`);
      return null;
    }

    console.log(
      `[conceptCache] Cache hit: ${data.concepts.length} concepts, age: ${ageHours.toFixed(1)}h`
    );

    // Convert Firestore timestamps back to Date objects
    const concepts = data.concepts.map((c) => ({
      ...c,
      lastUpdated: c.lastUpdated instanceof admin.firestore.Timestamp
        ? c.lastUpdated.toDate()
        : new Date(c.lastUpdated),
    }));

    return concepts;
  } catch (error) {
    console.error("[conceptCache] Error getting cached concepts:", error);
    return null;
  }
}

/**
 * Save concepts to cache
 */
export async function saveCachedConcepts(
  concepts: AIConcept[],
  rawSignalCount: number,
  sources: string[],
  ttlHours: number = DEFAULT_TTL_HOURS
): Promise<void> {
  try {
    const db = admin.firestore();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlHours * 60 * 60 * 1000);

    const cacheData: CachedConcepts = {
      concepts,
      extractedAt: now,
      expiresAt,
      rawSignalCount,
      sources,
    };

    await db.collection(COLLECTION_NAME).doc(CACHE_DOC_ID).set(cacheData);

    console.log(
      `[conceptCache] Cached ${concepts.length} concepts, expires in ${ttlHours}h`
    );
  } catch (error) {
    console.error("[conceptCache] Error saving cached concepts:", error);
    throw error;
  }
}

/**
 * Invalidate the cache (force refresh on next call)
 */
export async function invalidateCache(): Promise<void> {
  try {
    const db = admin.firestore();
    await db.collection(COLLECTION_NAME).doc(CACHE_DOC_ID).delete();
    console.log("[conceptCache] Cache invalidated");
  } catch (error) {
    console.error("[conceptCache] Error invalidating cache:", error);
  }
}

/**
 * Get concepts with automatic caching
 *
 * This is the main entry point - it handles:
 * 1. Checking cache
 * 2. Fetching and extracting if cache miss
 * 3. Saving to cache
 */
export async function getAIConcepts(
  openai: OpenAI,
  maxAgeHours: number = DEFAULT_TTL_HOURS
): Promise<ConceptExtractionResult> {
  // Try cache first
  const cached = await getCachedConcepts(maxAgeHours);

  if (cached) {
    return {
      concepts: cached,
      rawSignalCount: 0, // Unknown for cached
      extractionCost: 0,
      cached: true,
    };
  }

  // Cache miss - fetch and extract
  console.log("[conceptCache] Cache miss, fetching fresh concepts...");

  const result = await fetchAndExtractConcepts(openai);

  // Save to cache
  await saveCachedConcepts(
    result.concepts,
    result.rawSignalCount,
    ["hackernews", "arxiv", "rundown", "importai"],
    maxAgeHours
  );

  return result;
}

/**
 * Force refresh concepts (bypass cache)
 */
export async function refreshConcepts(
  openai: OpenAI,
  ttlHours: number = DEFAULT_TTL_HOURS
): Promise<ConceptExtractionResult> {
  console.log("[conceptCache] Force refreshing concepts...");

  const result = await fetchAndExtractConcepts(openai);

  // Save to cache
  await saveCachedConcepts(
    result.concepts,
    result.rawSignalCount,
    ["hackernews", "arxiv", "rundown", "importai"],
    ttlHours
  );

  return { ...result, cached: false };
}

/**
 * Get cache status (for debugging/monitoring)
 */
export async function getCacheStatus(): Promise<{
  exists: boolean;
  conceptCount: number;
  ageHours: number;
  expiresInHours: number;
  sources: string[];
} | null> {
  try {
    const db = admin.firestore();
    const doc = await db.collection(COLLECTION_NAME).doc(CACHE_DOC_ID).get();

    if (!doc.exists) {
      return null;
    }

    const data = doc.data() as CachedConcepts;
    const now = new Date();

    const extractedAt = data.extractedAt instanceof admin.firestore.Timestamp
      ? data.extractedAt.toDate()
      : new Date(data.extractedAt);

    const expiresAt = data.expiresAt instanceof admin.firestore.Timestamp
      ? data.expiresAt.toDate()
      : new Date(data.expiresAt);

    return {
      exists: true,
      conceptCount: data.concepts.length,
      ageHours: (now.getTime() - extractedAt.getTime()) / (1000 * 60 * 60),
      expiresInHours: (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60),
      sources: data.sources,
    };
  } catch (error) {
    console.error("[conceptCache] Error getting cache status:", error);
    return null;
  }
}
