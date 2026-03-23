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
  where,
  getDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { Event, EventCategory, EventFormData } from '../../types/event';

const EVENTS_COLLECTION = 'events';

function convertToEvent(id: string, data: any): Event {
  return {
    id,
    name: data.name || '',
    website: data.website || null,
    description: data.description || '',
    category: data.category || 'client',
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
    icpSummary: data.icpSummary || undefined,
    notes: data.notes || '',
    recommendedActions: data.recommendedActions || [],
    // Organiser (both categories) + research
    organiser: data.organiser || undefined,
    organizerResearch: data.organizerResearch || undefined,
    // Educational fields
    audienceDescription: data.audienceDescription || undefined,
    gating: data.gating || undefined,
    keyTopics: data.keyTopics || undefined,
    questionsToAsk: data.questionsToAsk || undefined,
    collaborationPotential: data.collaborationPotential || undefined,
    tier: data.tier || undefined,
    educationalScoringBreakdown: data.educationalScoringBreakdown || undefined,
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

export function subscribeToEventsByCategory(
  category: EventCategory,
  callback: (events: Event[]) => void
): () => void {
  // For 'educational', use Firestore where clause (all educational events will have the field)
  // For 'client', subscribe to all and filter out educational (handles legacy docs without category)
  if (category === 'educational') {
    const q = query(
      collection(db, EVENTS_COLLECTION),
      where('category', '==', 'educational'),
      orderBy('startDate', 'desc')
    );
    return onSnapshot(q, (snapshot) => {
      const events = snapshot.docs.map((doc) => convertToEvent(doc.id, doc.data()));
      callback(events);
    }, (err) => {
      console.error('Error subscribing to educational events:', err);
      // On error (e.g. index still building), show empty list instead of stale data
      callback([]);
    });
  }

  // For 'client': subscribe to all events and filter out educational ones client-side
  // This handles legacy documents that don't have a category field
  const q = query(
    collection(db, EVENTS_COLLECTION),
    orderBy('startDate', 'desc')
  );
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs
      .map((doc) => convertToEvent(doc.id, doc.data()))
      .filter((event) => event.category !== 'educational');
    callback(events);
  }, (err) => {
    console.error('Error subscribing to client events:', err);
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

  const docData: Record<string, any> = {
    name: data.name || '',
    website: data.website || null,
    description: data.description || '',
    category: data.category || 'client',
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
    notes: data.notes || '',
    recommendedActions: data.recommendedActions || [],
    createdAt: now,
    updatedAt: now,
  };

  // Add category-specific fields
  if (data.category === 'educational') {
    if (data.organiser) docData.organiser = data.organiser;
    if (data.audienceDescription) docData.audienceDescription = data.audienceDescription;
    if (data.gating) docData.gating = data.gating;
    if (data.keyTopics) docData.keyTopics = data.keyTopics;
    if (data.questionsToAsk) docData.questionsToAsk = data.questionsToAsk;
    if (data.collaborationPotential) docData.collaborationPotential = data.collaborationPotential;
    if (data.tier) docData.tier = data.tier;
    if (data.educationalScoringBreakdown) docData.educationalScoringBreakdown = data.educationalScoringBreakdown;
  } else {
    docData.icpSummary = data.icpSummary || { totalIcpCompanies: 0, totalDecisionMakers: 0, topCompanies: [] };
  }

  const docRef = await addDoc(collection(db, EVENTS_COLLECTION), docData);

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
  subscribeToEventsByCategory,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
};
