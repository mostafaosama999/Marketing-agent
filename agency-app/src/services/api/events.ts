// src/services/api/events.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { Event, EventFormData } from '../../types/event';

const EVENTS_COLLECTION = 'events';

function convertToEvent(id: string, data: any): Event {
  return {
    id,
    name: data.name || '',
    website: data.website || null,
    description: data.description || '',
    startDate: data.startDate || '',
    endDate: data.endDate || '',
    startDateTimestamp: data.startDateTimestamp || Timestamp.now(),
    endDateTimestamp: data.endDateTimestamp || Timestamp.now(),
    eventType: data.eventType || 'conference',
    tags: data.tags || [],
    location: data.location || { venue: null, city: '', country: 'GB' },
    pricing: data.pricing || { ticketPrice: null, currency: 'GBP', ticketStatus: 'unknown' },
    estimatedAttendance: data.estimatedAttendance ?? null,
    eventScore: data.eventScore ?? 0,
    scoringBreakdown: data.scoringBreakdown || {
      attendeeComposition: 0,
      decisionMakerAccess: 0,
      formatNetworking: 0,
      strategicBonus: 0,
    },
    status: data.status || 'discovered',
    discoveredAt: data.discoveredAt || new Date().toISOString(),
    discoveredBy: data.discoveredBy || 'manual',
    sourceReport: data.sourceReport || null,
    icpSummary: data.icpSummary || { totalIcpCompanies: 0, totalDecisionMakers: 0, topCompanies: [] },
    notes: data.notes || '',
    recommendedActions: data.recommendedActions || [],
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

export function subscribeToEvents(callback: (events: Event[]) => void): () => void {
  const q = query(
    collection(db, EVENTS_COLLECTION),
    orderBy('startDate', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map((doc) => convertToEvent(doc.id, doc.data()));
    callback(events);
  }, (err) => {
    console.error('Error subscribing to events:', err);
  });
}

export async function getEvent(eventId: string): Promise<Event | null> {
  const docRef = doc(db, EVENTS_COLLECTION, eventId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return convertToEvent(docSnap.id, docSnap.data());
}

export async function createEvent(data: Partial<EventFormData>): Promise<string> {
  const now = new Date().toISOString();
  const startTimestamp = data.startDate
    ? Timestamp.fromDate(new Date(data.startDate))
    : Timestamp.now();
  const endTimestamp = data.endDate
    ? Timestamp.fromDate(new Date(data.endDate))
    : startTimestamp;

  const docRef = await addDoc(collection(db, EVENTS_COLLECTION), {
    name: data.name || '',
    website: data.website || null,
    description: data.description || '',
    startDate: data.startDate || '',
    endDate: data.endDate || data.startDate || '',
    startDateTimestamp: startTimestamp,
    endDateTimestamp: endTimestamp,
    eventType: data.eventType || 'conference',
    tags: data.tags || [],
    location: data.location || { venue: null, city: '', country: 'GB' },
    pricing: data.pricing || { ticketPrice: null, currency: 'GBP', ticketStatus: 'unknown' },
    estimatedAttendance: data.estimatedAttendance ?? null,
    eventScore: data.eventScore ?? 0,
    scoringBreakdown: data.scoringBreakdown || {
      attendeeComposition: 0,
      decisionMakerAccess: 0,
      formatNetworking: 0,
      strategicBonus: 0,
    },
    status: data.status || 'discovered',
    discoveredAt: data.discoveredAt || now,
    discoveredBy: data.discoveredBy || 'manual',
    sourceReport: data.sourceReport || null,
    icpSummary: data.icpSummary || { totalIcpCompanies: 0, totalDecisionMakers: 0, topCompanies: [] },
    notes: data.notes || '',
    recommendedActions: data.recommendedActions || [],
    createdAt: now,
    updatedAt: now,
  });

  return docRef.id;
}

export async function updateEvent(eventId: string, updates: Partial<Event>): Promise<void> {
  const docRef = doc(db, EVENTS_COLLECTION, eventId);

  const cleanUpdates: any = { ...updates, updatedAt: new Date().toISOString() };

  // Update timestamps if dates changed
  if (updates.startDate) {
    cleanUpdates.startDateTimestamp = Timestamp.fromDate(new Date(updates.startDate));
  }
  if (updates.endDate) {
    cleanUpdates.endDateTimestamp = Timestamp.fromDate(new Date(updates.endDate));
  }

  // Remove id from updates
  delete cleanUpdates.id;

  await updateDoc(docRef, cleanUpdates);
}

export async function deleteEvent(eventId: string): Promise<void> {
  await deleteDoc(doc(db, EVENTS_COLLECTION, eventId));
}

export const eventsService = {
  subscribeToEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
};
