// src/services/api/applicants.ts
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  getDoc,
  serverTimestamp,
  arrayUnion,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { Applicant, ApplicantFormData, ApplicantStatus } from '../../types/applicant';

const APPLICANTS_COLLECTION = 'applicants';

function normalizeUrl(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (trimmed && !trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
    return 'https://' + trimmed;
  }
  return trimmed;
}

function safeToDate(value: any): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }
  return undefined;
}

function convertToApplicant(id: string, data: any): Applicant {
  return {
    id,
    name: data.name || '',
    email: data.email || '',
    phone: data.phone || '',
    linkedInUrl: normalizeUrl(data.linkedInUrl || ''),
    bio: data.bio || '',
    education: data.education || '',
    sex: data.sex || '',
    age: data.age || '',
    status: data.status || 'applied',
    score: data.score !== undefined ? data.score : null,
    notes: data.notes || '',
    formAnswers: data.formAnswers || {},
    source: data.source || 'manual',
    submittedAt: safeToDate(data.submittedAt) || safeToDate(data.createdAt) || new Date(),
    createdAt: safeToDate(data.createdAt) || new Date(),
    updatedAt: safeToDate(data.updatedAt) || new Date(),
  };
}

export function subscribeToApplicants(
  callback: (applicants: Applicant[]) => void
): Unsubscribe {
  const ref = collection(db, APPLICANTS_COLLECTION);
  const q = query(ref, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const applicants: Applicant[] = [];
      snapshot.forEach((doc) => {
        applicants.push(convertToApplicant(doc.id, doc.data()));
      });
      callback(applicants);
    },
    (error) => {
      console.error('Error listening to applicants:', error);
      callback([]);
    }
  );
}

export async function updateApplicantStatus(
  id: string,
  newStatus: ApplicantStatus
): Promise<void> {
  const ref = doc(db, APPLICANTS_COLLECTION, id);
  await updateDoc(ref, {
    status: newStatus,
    updatedAt: serverTimestamp(),
  });
}

export async function updateApplicant(
  id: string,
  updates: Partial<Pick<Applicant, 'score' | 'notes' | 'status'>>
): Promise<void> {
  const ref = doc(db, APPLICANTS_COLLECTION, id);
  await updateDoc(ref, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteApplicant(id: string): Promise<void> {
  const ref = doc(db, APPLICANTS_COLLECTION, id);
  await deleteDoc(ref);
}

// --- Unseen applicants tracking (per-applicant) ---

export function subscribeToViewedApplicantIds(
  userId: string,
  callback: (viewedIds: Set<string>) => void
): Unsubscribe {
  const ref = doc(db, 'userPreferences', userId);
  return onSnapshot(ref, (snap) => {
    if (!snap.exists()) {
      callback(new Set());
      return;
    }
    const ids: string[] = snap.data()?.viewedApplicantIds || [];
    callback(new Set(ids));
  });
}

export async function markApplicantViewed(userId: string, applicantId: string): Promise<void> {
  const ref = doc(db, 'userPreferences', userId);
  await setDoc(ref, { viewedApplicantIds: arrayUnion(applicantId) }, { merge: true });
}

export async function createApplicant(
  data: ApplicantFormData
): Promise<string> {
  const ref = collection(db, APPLICANTS_COLLECTION);
  const docRef = await addDoc(ref, {
    ...data,
    score: null,
    notes: '',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}
