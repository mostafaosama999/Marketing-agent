// src/services/api/releaseNotesService.ts
// Service for managing release notes in Firestore

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  setDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { ReleaseNote, UserReleaseNoteState, ReleaseNoteFormData } from '../../types/releaseNotes';

const RELEASE_NOTES_COLLECTION = 'releaseNotes';
const USER_RELEASE_STATES_COLLECTION = 'userReleaseStates';

/**
 * Convert Firestore document to ReleaseNote object
 */
function convertToReleaseNote(id: string, data: any): ReleaseNote {
  return {
    id,
    version: data.version || '',
    title: data.title || '',
    description: data.description || '',
    highlights: data.highlights || [],
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(data.createdAt),
    createdBy: data.createdBy || '',
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt),
    updatedBy: data.updatedBy || '',
    published: data.published || false,
  };
}

/**
 * Convert Firestore document to UserReleaseNoteState object
 */
function convertToUserReleaseState(userId: string, data: any): UserReleaseNoteState {
  return {
    userId,
    lastSeenReleaseId: data.lastSeenReleaseId || null,
    dismissedReleaseIds: data.dismissedReleaseIds || [],
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : new Date(),
  };
}

/**
 * Get all release notes (optionally filter by published status)
 */
export async function getReleaseNotes(publishedOnly: boolean = false): Promise<ReleaseNote[]> {
  try {
    const releaseNotesRef = collection(db, RELEASE_NOTES_COLLECTION);
    let q = query(releaseNotesRef, orderBy('createdAt', 'desc'));

    if (publishedOnly) {
      q = query(releaseNotesRef, where('published', '==', true), orderBy('createdAt', 'desc'));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => convertToReleaseNote(doc.id, doc.data()));
  } catch (error) {
    console.error('Error fetching release notes:', error);
    return [];
  }
}

/**
 * Get the latest published release note
 */
export async function getLatestReleaseNote(): Promise<ReleaseNote | null> {
  try {
    const releaseNotesRef = collection(db, RELEASE_NOTES_COLLECTION);
    const q = query(
      releaseNotesRef,
      where('published', '==', true),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return convertToReleaseNote(doc.id, doc.data());
  } catch (error) {
    console.error('Error fetching latest release note:', error);
    return null;
  }
}

/**
 * Get a single release note by ID
 */
export async function getReleaseNoteById(id: string): Promise<ReleaseNote | null> {
  try {
    const docRef = doc(db, RELEASE_NOTES_COLLECTION, id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return null;
    }

    return convertToReleaseNote(docSnap.id, docSnap.data());
  } catch (error) {
    console.error('Error fetching release note:', error);
    return null;
  }
}

/**
 * Create a new release note
 */
export async function createReleaseNote(
  data: ReleaseNoteFormData,
  userId: string
): Promise<string> {
  try {
    const releaseNotesRef = collection(db, RELEASE_NOTES_COLLECTION);
    const docRef = await addDoc(releaseNotesRef, {
      version: data.version,
      title: data.title,
      description: data.description,
      highlights: data.highlights,
      published: data.published,
      createdAt: serverTimestamp(),
      createdBy: userId,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });

    console.log('✅ Release note created:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('❌ Error creating release note:', error);
    throw new Error('Failed to create release note');
  }
}

/**
 * Update an existing release note
 */
export async function updateReleaseNote(
  id: string,
  data: ReleaseNoteFormData,
  userId: string
): Promise<void> {
  try {
    const docRef = doc(db, RELEASE_NOTES_COLLECTION, id);
    await updateDoc(docRef, {
      version: data.version,
      title: data.title,
      description: data.description,
      highlights: data.highlights,
      published: data.published,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    });

    console.log('✅ Release note updated:', id);
  } catch (error) {
    console.error('❌ Error updating release note:', error);
    throw new Error('Failed to update release note');
  }
}

/**
 * Delete a release note
 */
export async function deleteReleaseNote(id: string): Promise<void> {
  try {
    const docRef = doc(db, RELEASE_NOTES_COLLECTION, id);
    await deleteDoc(docRef);

    console.log('✅ Release note deleted:', id);
  } catch (error) {
    console.error('❌ Error deleting release note:', error);
    throw new Error('Failed to delete release note');
  }
}

/**
 * Get user's release note state (what they've seen/dismissed)
 */
export async function getUserReleaseState(userId: string): Promise<UserReleaseNoteState> {
  try {
    const docRef = doc(db, USER_RELEASE_STATES_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      // Return default state if doesn't exist
      return {
        userId,
        lastSeenReleaseId: null,
        dismissedReleaseIds: [],
        updatedAt: new Date(),
      };
    }

    return convertToUserReleaseState(userId, docSnap.data());
  } catch (error) {
    console.error('Error fetching user release state:', error);
    return {
      userId,
      lastSeenReleaseId: null,
      dismissedReleaseIds: [],
      updatedAt: new Date(),
    };
  }
}

/**
 * Mark a release note as seen by the user
 */
export async function markReleaseAsSeen(userId: string, releaseId: string): Promise<void> {
  try {
    const docRef = doc(db, USER_RELEASE_STATES_COLLECTION, userId);

    // Use setDoc with merge to create or update the document
    await setDoc(docRef, {
      lastSeenReleaseId: releaseId,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    console.log('✅ Release marked as seen:', releaseId);
  } catch (error) {
    console.error('❌ Error marking release as seen:', error);
  }
}

/**
 * Dismiss a release note permanently for this user
 */
export async function dismissRelease(userId: string, releaseId: string): Promise<void> {
  try {
    const docRef = doc(db, USER_RELEASE_STATES_COLLECTION, userId);
    const docSnap = await getDoc(docRef);

    let dismissedIds: string[] = [];
    if (docSnap.exists()) {
      dismissedIds = docSnap.data().dismissedReleaseIds || [];
    }

    // Add to dismissed list if not already there
    if (!dismissedIds.includes(releaseId)) {
      dismissedIds.push(releaseId);
    }

    // Use setDoc with merge to create or update the document
    await setDoc(docRef, {
      dismissedReleaseIds: dismissedIds,
      lastSeenReleaseId: releaseId,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    console.log('✅ Release dismissed:', releaseId);
  } catch (error) {
    console.error('❌ Error dismissing release:', error);
  }
}

/**
 * Check if user should see a release note (hasn't dismissed it)
 */
export function shouldShowRelease(
  release: ReleaseNote,
  userState: UserReleaseNoteState
): boolean {
  // Don't show if user has dismissed this release
  if (userState.dismissedReleaseIds.includes(release.id)) {
    return false;
  }

  return true;
}

/**
 * Check if release should auto-expand (user hasn't seen it yet)
 */
export function shouldAutoExpand(
  release: ReleaseNote,
  userState: UserReleaseNoteState
): boolean {
  // Auto-expand if user hasn't seen this specific release
  return userState.lastSeenReleaseId !== release.id;
}
