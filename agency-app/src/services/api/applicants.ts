// src/services/api/applicants.ts
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { Applicant, ApplicantFormData, ApplicantStatus } from '../../types/applicant';

const APPLICANTS_COLLECTION = 'applicants';

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
    linkedInUrl: data.linkedInUrl || '',
    bio: data.bio || '',
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
