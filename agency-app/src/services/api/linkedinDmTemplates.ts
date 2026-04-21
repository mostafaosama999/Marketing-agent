import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { LinkedInDmTemplate, LinkedInDmTemplateFormData } from '../../types/linkedinDmTemplate';
import { getUserPreferences, updateUserPreferences } from './userPreferences';

const COLLECTION = 'linkedinDmTemplates';

function safeToDate(value: any): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  return new Date(value);
}

function convert(id: string, data: any): LinkedInDmTemplate {
  return {
    id,
    name: data.name || '',
    body: data.body || '',
    createdAt: safeToDate(data.createdAt),
    createdBy: data.createdBy || '',
    updatedAt: safeToDate(data.updatedAt),
    updatedBy: data.updatedBy || '',
  };
}

export function subscribeToLinkedInDmTemplates(
  callback: (templates: LinkedInDmTemplate[]) => void
): Unsubscribe {
  const ref = collection(db, COLLECTION);
  const q = query(ref, orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: LinkedInDmTemplate[] = [];
      snapshot.forEach((d) => list.push(convert(d.id, d.data())));
      callback(list);
    },
    (error) => {
      console.error('Error listening to linkedinDmTemplates:', error);
      callback([]);
    }
  );
}

export async function addLinkedInDmTemplate(
  data: LinkedInDmTemplateFormData,
  userId: string
): Promise<string> {
  const ref = collection(db, COLLECTION);
  const docRef = await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    createdBy: userId,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
  return docRef.id;
}

export async function updateLinkedInDmTemplate(
  id: string,
  updates: Partial<LinkedInDmTemplateFormData>,
  userId: string
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });
}

export async function deleteLinkedInDmTemplate(id: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}

export async function setDefaultLinkedInDmTemplate(
  userId: string,
  templateId: string | null
): Promise<void> {
  await updateUserPreferences(userId, { defaultLinkedinDmTemplateId: templateId });
}

export async function getDefaultLinkedInDmTemplateId(userId: string): Promise<string | null> {
  const prefs = await getUserPreferences(userId);
  return prefs?.defaultLinkedinDmTemplateId ?? null;
}

/**
 * Pick the effective default template for the given user: explicit pointer if set
 * and still exists, otherwise the most-recently-updated template in the list.
 */
export function resolveDefaultTemplate(
  templates: LinkedInDmTemplate[],
  defaultId: string | null
): LinkedInDmTemplate | null {
  if (templates.length === 0) return null;
  if (defaultId) {
    const found = templates.find((t) => t.id === defaultId);
    if (found) return found;
  }
  return templates[0]; // already ordered by updatedAt desc
}
