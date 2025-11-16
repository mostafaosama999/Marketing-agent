import {
  getFirestore,
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { Competitor } from '../../types/competitor';

const COMPETITORS_COLLECTION = 'competitors';

/**
 * Add a new competitor
 */
export async function addCompetitor(
  competitorData: Omit<Competitor, 'id' | 'addedAt' | 'active'>,
  userId: string
): Promise<string> {
  try {
    const db = getFirestore();
    const newCompetitor: Omit<Competitor, 'id'> = {
      ...competitorData,
      addedAt: Timestamp.now(),
      addedBy: userId,
      active: true,
    };

    const docRef = await addDoc(collection(db, COMPETITORS_COLLECTION), newCompetitor);

    // Update the document with its own ID
    await updateDoc(docRef, { id: docRef.id });

    return docRef.id;
  } catch (error) {
    console.error('Error adding competitor:', error);
    throw new Error('Failed to add competitor');
  }
}

/**
 * Update an existing competitor
 */
export async function updateCompetitor(
  competitorId: string,
  updates: Partial<Omit<Competitor, 'id' | 'addedAt' | 'addedBy'>>
): Promise<void> {
  try {
    const db = getFirestore();
    const competitorRef = doc(db, COMPETITORS_COLLECTION, competitorId);
    await updateDoc(competitorRef, updates);
  } catch (error) {
    console.error('Error updating competitor:', error);
    throw new Error('Failed to update competitor');
  }
}

/**
 * Soft-delete a competitor (set active to false)
 */
export async function deleteCompetitor(competitorId: string): Promise<void> {
  try {
    const db = getFirestore();
    const competitorRef = doc(db, COMPETITORS_COLLECTION, competitorId);
    await updateDoc(competitorRef, { active: false });
  } catch (error) {
    console.error('Error deleting competitor:', error);
    throw new Error('Failed to delete competitor');
  }
}

/**
 * Hard-delete a competitor (permanently remove)
 */
export async function permanentlyDeleteCompetitor(competitorId: string): Promise<void> {
  try {
    const db = getFirestore();
    const competitorRef = doc(db, COMPETITORS_COLLECTION, competitorId);
    await deleteDoc(competitorRef);
  } catch (error) {
    console.error('Error permanently deleting competitor:', error);
    throw new Error('Failed to permanently delete competitor');
  }
}

/**
 * Get a single competitor by ID
 */
export async function getCompetitor(competitorId: string): Promise<Competitor | null> {
  try {
    const db = getFirestore();
    const competitorRef = doc(db, COMPETITORS_COLLECTION, competitorId);
    const competitorSnap = await getDoc(competitorRef);

    if (!competitorSnap.exists()) {
      return null;
    }

    return competitorSnap.data() as Competitor;
  } catch (error) {
    console.error('Error getting competitor:', error);
    throw new Error('Failed to get competitor');
  }
}

/**
 * Get all active competitors
 */
export async function getCompetitors(includeInactive = false): Promise<Competitor[]> {
  try {
    const db = getFirestore();
    const competitorsRef = collection(db, COMPETITORS_COLLECTION);

    let q = query(competitorsRef, orderBy('addedAt', 'desc'));

    if (!includeInactive) {
      q = query(competitorsRef, where('active', '==', true), orderBy('addedAt', 'desc'));
    }

    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(doc => doc.data() as Competitor);
  } catch (error) {
    console.error('Error getting competitors:', error);
    throw new Error('Failed to get competitors');
  }
}

/**
 * Subscribe to active competitors with real-time updates
 */
export function subscribeToCompetitors(
  callback: (competitors: Competitor[]) => void,
  includeInactive = false
): Unsubscribe {
  try {
    const db = getFirestore();
    const competitorsRef = collection(db, COMPETITORS_COLLECTION);

    let q = query(competitorsRef, orderBy('addedAt', 'desc'));

    if (!includeInactive) {
      q = query(competitorsRef, where('active', '==', true), orderBy('addedAt', 'desc'));
    }

    return onSnapshot(
      q,
      (querySnapshot) => {
        const competitors = querySnapshot.docs.map(doc => doc.data() as Competitor);
        callback(competitors);
      },
      (error) => {
        console.error('Error in competitors subscription:', error);
        throw new Error('Failed to subscribe to competitors');
      }
    );
  } catch (error) {
    console.error('Error setting up competitors subscription:', error);
    throw new Error('Failed to set up competitors subscription');
  }
}

/**
 * Check if a competitor with the same name or LinkedIn URL already exists
 */
export async function checkDuplicateCompetitor(
  name: string,
  linkedInUrl?: string
): Promise<{ exists: boolean; existingCompetitor?: Competitor }> {
  try {
    const db = getFirestore();
    const competitorsRef = collection(db, COMPETITORS_COLLECTION);

    // Check by name (case-insensitive)
    const nameQuery = query(
      competitorsRef,
      where('active', '==', true)
    );

    const querySnapshot = await getDocs(nameQuery);

    for (const doc of querySnapshot.docs) {
      const competitor = doc.data() as Competitor;

      // Check name match (case-insensitive)
      if (competitor.name.toLowerCase() === name.toLowerCase()) {
        return { exists: true, existingCompetitor: competitor };
      }

      // Check LinkedIn URL match
      if (linkedInUrl && competitor.linkedInUrl === linkedInUrl) {
        return { exists: true, existingCompetitor: competitor };
      }
    }

    return { exists: false };
  } catch (error) {
    console.error('Error checking duplicate competitor:', error);
    throw new Error('Failed to check duplicate competitor');
  }
}
