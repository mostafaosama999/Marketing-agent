// src/services/api/eventSubcollections.ts
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { EventCompany, EventCompanyFormData, EventLead, EventLeadFormData } from '../../types/event';

const EVENTS_COLLECTION = 'events';

// ── EventCompany helpers ──

function convertToEventCompany(id: string, data: any): EventCompany {
  return {
    id,
    companyName: data.companyName || '',
    companyWebsite: data.companyWebsite || null,
    entityId: data.entityId || null,
    role: data.role || 'attendee',
    sponsorshipTier: data.sponsorshipTier || null,
    employeeCount: data.employeeCount ?? null,
    funding: data.funding || null,
    description: data.description || null,
    icpMatch: data.icpMatch || 'no',
    icpReason: data.icpReason || '',
    hasCwp: data.hasCwp || false,
    cwpNotes: data.cwpNotes || null,
    priority: data.priority || undefined,
    notes: data.notes || '',
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

export function subscribeToEventCompanies(
  eventId: string,
  callback: (companies: EventCompany[]) => void
): () => void {
  const q = query(
    collection(db, EVENTS_COLLECTION, eventId, 'companies'),
    orderBy('companyName', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const companies = snapshot.docs.map((d) => convertToEventCompany(d.id, d.data()));
    callback(companies);
  }, (err) => {
    console.error('Error subscribing to event companies:', err);
  });
}

export async function addEventCompany(eventId: string, data: EventCompanyFormData): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(
    collection(db, EVENTS_COLLECTION, eventId, 'companies'),
    { ...data, createdAt: now, updatedAt: now }
  );
  return docRef.id;
}

export async function updateEventCompany(
  eventId: string,
  companyId: string,
  updates: Partial<EventCompany>
): Promise<void> {
  const docRef = doc(db, EVENTS_COLLECTION, eventId, 'companies', companyId);
  const cleanUpdates: any = { ...updates, updatedAt: new Date().toISOString() };
  delete cleanUpdates.id;
  await updateDoc(docRef, cleanUpdates);
}

export async function deleteEventCompany(eventId: string, companyId: string): Promise<void> {
  await deleteDoc(doc(db, EVENTS_COLLECTION, eventId, 'companies', companyId));
}

// ── EventLead helpers ──

function convertToEventLead(id: string, data: any): EventLead {
  return {
    id,
    name: data.name || '',
    title: data.title || null,
    company: data.company || '',
    companyId: data.companyId || null,
    leadId: data.leadId || null,
    linkedinUrl: data.linkedinUrl || null,
    email: data.email || null,
    role: data.role || 'attendee',
    sessionTitle: data.sessionTitle || null,
    persona: data.persona || 'skip',
    whyRelevant: data.whyRelevant || '',
    preEventOutreach: data.preEventOutreach || undefined,
    postEventOutreach: data.postEventOutreach || undefined,
    notes: data.notes || '',
    metInPerson: data.metInPerson || false,
    createdAt: data.createdAt || new Date().toISOString(),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
}

export function subscribeToEventLeads(
  eventId: string,
  callback: (leads: EventLead[]) => void
): () => void {
  const q = query(
    collection(db, EVENTS_COLLECTION, eventId, 'leads'),
    orderBy('name', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const leads = snapshot.docs.map((d) => convertToEventLead(d.id, d.data()));
    callback(leads);
  }, (err) => {
    console.error('Error subscribing to event leads:', err);
  });
}

export async function addEventLead(eventId: string, data: EventLeadFormData): Promise<string> {
  const now = new Date().toISOString();
  const docRef = await addDoc(
    collection(db, EVENTS_COLLECTION, eventId, 'leads'),
    { ...data, createdAt: now, updatedAt: now }
  );
  return docRef.id;
}

export async function updateEventLead(
  eventId: string,
  leadId: string,
  updates: Partial<EventLead>
): Promise<void> {
  const docRef = doc(db, EVENTS_COLLECTION, eventId, 'leads', leadId);
  const cleanUpdates: any = { ...updates, updatedAt: new Date().toISOString() };
  delete cleanUpdates.id;
  await updateDoc(docRef, cleanUpdates);
}

export async function deleteEventLead(eventId: string, leadId: string): Promise<void> {
  await deleteDoc(doc(db, EVENTS_COLLECTION, eventId, 'leads', leadId));
}

export const eventSubcollectionsService = {
  subscribeToEventCompanies,
  addEventCompany,
  updateEventCompany,
  deleteEventCompany,
  subscribeToEventLeads,
  addEventLead,
  updateEventLead,
  deleteEventLead,
};
