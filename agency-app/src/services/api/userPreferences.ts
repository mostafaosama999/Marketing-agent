// src/services/api/userPreferences.ts
// Service for managing user preferences in Firestore

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { UserPreferences } from '../../types/userPreferences';

const USERS_COLLECTION = 'users';

/**
 * Get user preferences from Firestore
 * Returns null if preferences don't exist yet
 */
export async function getUserPreferences(userId: string): Promise<UserPreferences | null> {
  try {
    const preferencesRef = doc(db, USERS_COLLECTION, userId, 'preferences', 'settings');
    const preferencesDoc = await getDoc(preferencesRef);

    if (!preferencesDoc.exists()) {
      return null;
    }

    return preferencesDoc.data() as UserPreferences;
  } catch (error) {
    console.error('Error fetching user preferences:', error);
    return null;
  }
}

/**
 * Update user preferences in Firestore
 * Creates the document if it doesn't exist
 */
export async function updateUserPreferences(
  userId: string,
  preferences: Partial<UserPreferences>
): Promise<void> {
  try {
    const preferencesRef = doc(db, USERS_COLLECTION, userId, 'preferences', 'settings');
    const preferencesDoc = await getDoc(preferencesRef);

    if (preferencesDoc.exists()) {
      // Update existing preferences
      await updateDoc(preferencesRef, {
        ...preferences,
        updatedAt: serverTimestamp(),
      });
    } else {
      // Create new preferences document
      await setDoc(preferencesRef, {
        ...preferences,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error('Error updating user preferences:', error);
    throw error;
  }
}

/**
 * Update Apollo job titles specifically
 * Helper function for convenience
 */
export async function updateApolloJobTitles(
  userId: string,
  jobTitles: string[]
): Promise<void> {
  return updateUserPreferences(userId, { apolloJobTitles: jobTitles });
}
