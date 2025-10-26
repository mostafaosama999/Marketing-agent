// src/services/api/userCostTracking.ts
// Service for tracking API usage costs (AI and Apollo) at the user level

import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firestore';

const USERS_COLLECTION = 'users';

export interface AICostUpdate {
  cost: number;
  tokens: number;
  category: 'blogAnalysis' | 'writingProgram' | 'other';
}

export interface ApolloCostUpdate {
  credits: number;
  category: 'emailEnrichment' | 'organizationEnrichment' | 'peopleSearch';
}

/**
 * Increment AI usage costs for a user
 * Uses Firestore increment operations for atomic updates
 *
 * @param userId - User UID
 * @param update - Cost update details (cost, tokens, category)
 */
export async function incrementAICost(
  userId: string,
  update: AICostUpdate
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);

    await updateDoc(userRef, {
      'apiUsage.ai.totalCost': increment(update.cost),
      'apiUsage.ai.totalTokens': increment(update.tokens),
      'apiUsage.ai.totalCalls': increment(1),
      'apiUsage.ai.lastUpdated': new Date(),
      [`apiUsage.ai.breakdown.${update.category}.cost`]: increment(update.cost),
      [`apiUsage.ai.breakdown.${update.category}.tokens`]: increment(update.tokens),
      [`apiUsage.ai.breakdown.${update.category}.calls`]: increment(1),
    });

    console.log(`AI cost tracked for user ${userId}: $${update.cost.toFixed(4)} (${update.tokens} tokens, ${update.category})`);
  } catch (error) {
    console.error('Error tracking AI cost:', error);
    // Don't throw - we don't want to break the user experience if cost tracking fails
  }
}

/**
 * Increment Apollo usage credits for a user
 * Tracks Apollo API credits used (no dollar conversion - we track credits directly)
 * Uses Firestore increment operations for atomic updates
 *
 * @param userId - User UID
 * @param update - Credit update details (credits, category)
 */
export async function incrementApolloCost(
  userId: string,
  update: ApolloCostUpdate
): Promise<void> {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);

    await updateDoc(userRef, {
      'apiUsage.apollo.totalCredits': increment(update.credits),
      'apiUsage.apollo.totalCalls': increment(1),
      'apiUsage.apollo.lastUpdated': new Date(),
      [`apiUsage.apollo.breakdown.${update.category}.credits`]: increment(update.credits),
      [`apiUsage.apollo.breakdown.${update.category}.calls`]: increment(1),
    });

    console.log(`Apollo credits tracked for user ${userId}: ${update.credits} credit${update.credits !== 1 ? 's' : ''} (${update.category})`);
  } catch (error) {
    console.error('Error tracking Apollo credits:', error);
    // Don't throw - we don't want to break the user experience if cost tracking fails
  }
}

/**
 * Get user's API usage stats
 *
 * @param userId - User UID
 * @returns API usage data or null if not found
 */
export async function getUserApiUsage(userId: string) {
  try {
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    return userDoc.data().apiUsage || null;
  } catch (error) {
    console.error('Error getting user API usage:', error);
    return null;
  }
}
