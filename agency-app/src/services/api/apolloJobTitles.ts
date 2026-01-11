// src/services/api/apolloJobTitles.ts

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';

const COLLECTION = 'settings';
const DOC_ID = 'apolloJobTitles';

export interface ApolloJobTitlesConfig {
  titles: string[];
  updatedAt: Date;
  updatedBy?: string;
}

/**
 * Get all shared Apollo job titles
 */
export async function getApolloJobTitles(): Promise<string[]> {
  try {
    const docRef = doc(db, COLLECTION, DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as ApolloJobTitlesConfig;
      return data.titles || [];
    }

    return [];
  } catch (error) {
    console.error('Error fetching Apollo job titles:', error);
    return [];
  }
}

/**
 * Set all Apollo job titles (replaces existing)
 */
export async function setApolloJobTitles(
  titles: string[],
  userId?: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, DOC_ID);
    await setDoc(docRef, {
      titles,
      updatedAt: new Date(),
      updatedBy: userId || null,
    });
  } catch (error) {
    console.error('Error setting Apollo job titles:', error);
    throw error;
  }
}

/**
 * Add a new job title to the list
 */
export async function addApolloJobTitle(
  title: string,
  userId?: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, DOC_ID);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      await updateDoc(docRef, {
        titles: arrayUnion(title),
        updatedAt: new Date(),
        updatedBy: userId || null,
      });
    } else {
      await setDoc(docRef, {
        titles: [title],
        updatedAt: new Date(),
        updatedBy: userId || null,
      });
    }
  } catch (error) {
    console.error('Error adding Apollo job title:', error);
    throw error;
  }
}

/**
 * Remove a job title from the list
 */
export async function removeApolloJobTitle(
  title: string,
  userId?: string
): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION, DOC_ID);
    await updateDoc(docRef, {
      titles: arrayRemove(title),
      updatedAt: new Date(),
      updatedBy: userId || null,
    });
  } catch (error) {
    console.error('Error removing Apollo job title:', error);
    throw error;
  }
}

const DEFAULT_TITLES = [
  'CMO',
  'Chief Marketing Officer',
  'VP Marketing',
  'Director of Marketing',
  'Marketing Manager',
  'Content Manager',
  'Content Marketing Manager',
  'Editor',
  'Content editor',
  'Technical content',
  'Product manager',
  'Technical product manager',
  'SEO manager',
  'product marketing ai',
  'devrel',
  'PMM',
];

/**
 * Initialize with default job titles if none exist
 */
export async function initializeDefaultJobTitles(userId?: string): Promise<void> {
  try {
    const existing = await getApolloJobTitles();
    if (existing.length === 0) {
      await setApolloJobTitles(DEFAULT_TITLES, userId);
      console.log('Initialized default Apollo job titles');
    }
  } catch (error) {
    console.error('Error initializing default job titles:', error);
    throw error;
  }
}

/**
 * Force reset to default job titles (overwrites existing)
 */
export async function resetToDefaultJobTitles(userId?: string): Promise<void> {
  try {
    await setApolloJobTitles(DEFAULT_TITLES, userId);
    console.log('Reset Apollo job titles to defaults');
  } catch (error) {
    console.error('Error resetting job titles:', error);
    throw error;
  }
}
