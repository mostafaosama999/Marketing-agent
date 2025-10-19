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
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../app/config/firebase';
import { Lead, LeadFormData } from '../app/types/crm';

const LEADS_COLLECTION = 'leads';

/**
 * Convert Firestore document to Lead object
 */
function convertToLead(id: string, data: any): Lead {
  return {
    id,
    name: data.name || '',
    email: data.email || '',
    company: data.company || '',
    phone: data.phone || '',
    status: data.status || 'new_lead',
    customFields: data.customFields || {},
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Subscribe to all leads with real-time updates
 */
export function subscribeToLeads(
  callback: (leads: Lead[]) => void
): Unsubscribe {
  const leadsRef = collection(db, LEADS_COLLECTION);
  const q = query(leadsRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const leads: Lead[] = [];
      snapshot.forEach((doc) => {
        leads.push(convertToLead(doc.id, doc.data()));
      });
      callback(leads);
    },
    (error) => {
      console.error('Error listening to leads:', error);
      callback([]);
    }
  );
}

/**
 * Get all leads (one-time fetch)
 */
export async function getLeads(): Promise<Lead[]> {
  try {
    const leadsRef = collection(db, LEADS_COLLECTION);
    const q = query(leadsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const leads: Lead[] = [];
    snapshot.forEach((doc) => {
      leads.push(convertToLead(doc.id, doc.data()));
    });

    return leads;
  } catch (error) {
    console.error('Error fetching leads:', error);
    return [];
  }
}

/**
 * Create a new lead
 */
export async function createLead(leadData: LeadFormData): Promise<string> {
  try {
    const leadsRef = collection(db, LEADS_COLLECTION);
    const docRef = await addDoc(leadsRef, {
      ...leadData,
      customFields: leadData.customFields || {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating lead:', error);
    throw error;
  }
}

/**
 * Update an existing lead
 */
export async function updateLead(
  leadId: string,
  leadData: Partial<LeadFormData>
): Promise<void> {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(leadRef, {
      ...leadData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    throw error;
  }
}

/**
 * Update lead status (for drag-and-drop)
 */
export async function updateLeadStatus(
  leadId: string,
  status: string
): Promise<void> {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(leadRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating lead status:', error);
    throw error;
  }
}

/**
 * Delete a lead
 */
export async function deleteLead(leadId: string): Promise<void> {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await deleteDoc(leadRef);
  } catch (error) {
    console.error('Error deleting lead:', error);
    throw error;
  }
}
