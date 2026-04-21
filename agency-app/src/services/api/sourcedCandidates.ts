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
import {
  SourcedCandidate,
  SourcedCandidateFormData,
  OutboundStatus,
  ArchiveReason,
} from '../../types/sourcedCandidate';
import { normalizeLinkedInUrl } from '../../utils/normalizeLinkedInUrl';

const COLLECTION = 'sourcedCandidates';

function safeToDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function convertToCandidate(id: string, data: any): SourcedCandidate {
  return {
    id,
    name: data.name || '',
    linkedInUrl: data.linkedInUrl || '',
    linkedInUrlNormalized: data.linkedInUrlNormalized || '',
    university: data.university ?? null,
    universityTier: data.universityTier ?? null,
    currentRole: data.currentRole ?? null,
    currentCompany: data.currentCompany ?? null,
    location: data.location ?? null,
    estimatedAge: data.estimatedAge ?? null,
    yearsOfExperience: data.yearsOfExperience ?? null,
    techStack: Array.isArray(data.techStack) ? data.techStack : [],
    englishLevel: data.englishLevel ?? null,
    writingSignals: data.writingSignals ?? null,
    score: typeof data.score === 'number' ? data.score : 0,
    tier: data.tier ?? null,
    estimatedCurrentSalaryEgp: data.estimatedCurrentSalaryEgp ?? null,
    recommendedOfferEgp: data.recommendedOfferEgp ?? null,
    whyThisPerson: data.whyThisPerson || '',
    risks: data.risks ?? null,
    draftOutreach: data.draftOutreach || '',
    sentAt: safeToDate(data.sentAt),
    repliedAt: safeToDate(data.repliedAt),
    messageSent: data.messageSent ?? null,
    cwpAlumni: data.cwpAlumni === true,
    apifyEnrichment: data.apifyEnrichment ?? null,
    sourcedAt: safeToDate(data.sourcedAt) || new Date(),
    sourcedBy: data.sourcedBy === 'claude_skill' ? 'claude_skill' : 'manual',
    sourceReport: data.sourceReport ?? null,
    focusArea: data.focusArea ?? null,
    status: (data.status as OutboundStatus) || 'sourced',
    archived: data.archived === true,
    archiveReason: data.archiveReason ?? null,
    archivedAt: safeToDate(data.archivedAt),
    notes: data.notes || '',
    createdAt: safeToDate(data.createdAt) || new Date(),
    updatedAt: safeToDate(data.updatedAt) || new Date(),
  };
}

export function subscribeToSourcedCandidates(
  callback: (candidates: SourcedCandidate[]) => void,
  options: { includeArchived?: boolean } = {}
): Unsubscribe {
  const ref = collection(db, COLLECTION);
  const q = query(ref, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const list: SourcedCandidate[] = [];
      snapshot.forEach((d) => {
        const candidate = convertToCandidate(d.id, d.data());
        if (options.includeArchived || !candidate.archived) {
          list.push(candidate);
        }
      });
      callback(list);
    },
    (error) => {
      console.error('Error listening to sourcedCandidates:', error);
      callback([]);
    }
  );
}

export async function addSourcedCandidate(data: SourcedCandidateFormData): Promise<string> {
  const linkedInUrlNormalized = normalizeLinkedInUrl(data.linkedInUrl);
  const ref = collection(db, COLLECTION);
  const docRef = await addDoc(ref, {
    ...data,
    linkedInUrlNormalized,
    sentAt: null,
    repliedAt: null,
    messageSent: null,
    archived: false,
    archiveReason: null,
    archivedAt: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateSourcedCandidate(
  id: string,
  updates: Partial<SourcedCandidate>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  const payload: Record<string, any> = { ...updates, updatedAt: serverTimestamp() };
  if (updates.linkedInUrl !== undefined) {
    payload.linkedInUrlNormalized = normalizeLinkedInUrl(updates.linkedInUrl);
  }
  await updateDoc(ref, payload);
}

export async function updateSourcedCandidateStatus(
  id: string,
  newStatus: OutboundStatus,
  existing: Pick<SourcedCandidate, 'sentAt' | 'repliedAt'>
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  const payload: Record<string, any> = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };
  if (newStatus === 'contacted' && !existing.sentAt) {
    payload.sentAt = serverTimestamp();
  }
  if (newStatus === 'replied' && !existing.repliedAt) {
    payload.repliedAt = serverTimestamp();
  }
  await updateDoc(ref, payload);
}

export async function markSourcedCandidateSent(
  id: string,
  messageSent: string
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    status: 'contacted',
    sentAt: serverTimestamp(),
    messageSent,
    updatedAt: serverTimestamp(),
  });
}

export async function archiveSourcedCandidate(
  id: string,
  archiveReason: ArchiveReason
): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    archived: true,
    archiveReason,
    archivedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function unarchiveSourcedCandidate(id: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await updateDoc(ref, {
    archived: false,
    archiveReason: null,
    archivedAt: null,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSourcedCandidate(id: string): Promise<void> {
  const ref = doc(db, COLLECTION, id);
  await deleteDoc(ref);
}
