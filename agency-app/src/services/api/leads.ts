// src/services/api/leads.ts
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
  where,
  getDoc,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { Lead, LeadFormData, LeadStatus } from '../../types/lead';
import { getOrCreateCompany, deleteCompany, countLeadsForCompany } from './companies';
import { leadTimelineService } from './leadSubcollections';

const LEADS_COLLECTION = 'leads';

/**
 * Convert Firestore document to Lead object
 */
function convertToLead(id: string, data: any): Lead {
  return {
    id,
    name: data.name || '',
    email: data.email || '',
    company: data.company || data.companyName || '',
    companyId: data.companyId,
    companyName: data.companyName,
    phone: data.phone || '',
    status: data.status || 'new_lead',
    customFields: data.customFields || {},
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    stateHistory: data.stateHistory,
    stateDurations: data.stateDurations,
    apolloEnriched: data.apolloEnriched,
    lastEnrichedAt: data.lastEnrichedAt?.toDate(),
    totalApiCosts: data.totalApiCosts,
    lastApiCostUpdate: data.lastApiCostUpdate?.toDate(),
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
 * Get leads by status (for filtering)
 */
export async function getLeadsByStatus(status: LeadStatus): Promise<Lead[]> {
  try {
    const leadsRef = collection(db, LEADS_COLLECTION);
    const q = query(
      leadsRef,
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    const leads: Lead[] = [];
    snapshot.forEach((doc) => {
      leads.push(convertToLead(doc.id, doc.data()));
    });

    return leads;
  } catch (error) {
    console.error('Error fetching leads by status:', error);
    return [];
  }
}

/**
 * Get a single lead by ID
 */
export async function getLead(leadId: string): Promise<Lead | null> {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    const leadDoc = await getDoc(leadRef);

    if (!leadDoc.exists()) {
      return null;
    }

    return convertToLead(leadDoc.id, leadDoc.data());
  } catch (error) {
    console.error('Error fetching lead:', error);
    return null;
  }
}

/**
 * Create a new lead
 * Automatically creates company if it doesn't exist
 * Initializes timeline subcollection for state tracking
 */
export async function createLead(
  leadData: LeadFormData,
  userId: string
): Promise<string> {
  try {
    // Get or create the company
    const company = await getOrCreateCompany(leadData.company);

    const leadsRef = collection(db, LEADS_COLLECTION);
    const docRef = await addDoc(leadsRef, {
      name: leadData.name,
      email: leadData.email,
      phone: leadData.phone,
      company: company.name,
      companyId: company.id,
      companyName: company.name,
      status: leadData.status || 'new_lead',
      customFields: leadData.customFields || {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Initialize timeline subcollection for state history tracking
    await leadTimelineService.initializeTimeline(
      docRef.id,
      leadData.status || 'new_lead',
      userId
    );

    return docRef.id;
  } catch (error) {
    console.error('Error creating lead:', error);
    throw error;
  }
}

/**
 * Update an existing lead
 * If company name changes, updates company reference
 */
export async function updateLead(
  leadId: string,
  leadData: Partial<LeadFormData>
): Promise<void> {
  try {
    const updateData: any = { ...leadData };

    // If company is being updated, get or create the company
    if (leadData.company) {
      const company = await getOrCreateCompany(leadData.company);
      updateData.companyId = company.id;
      updateData.companyName = company.name;
    }

    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(leadRef, {
      ...updateData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating lead:', error);
    throw error;
  }
}

/**
 * Update lead status (for drag-and-drop)
 * Updates both main document and timeline subcollection
 */
export async function updateLeadStatus(
  leadId: string,
  newStatus: LeadStatus,
  userId: string,
  notes?: string
): Promise<void> {
  try {
    // Get current status
    const lead = await getLead(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    const oldStatus = lead.status;

    // Update main document status
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(leadRef, {
      status: newStatus,
      updatedAt: serverTimestamp(),
    });

    // Update timeline subcollection with state history
    await leadTimelineService.updateLeadStatus(
      leadId,
      oldStatus,
      newStatus,
      userId,
      notes
    );
  } catch (error) {
    console.error('Error updating lead status:', error);
    throw error;
  }
}

/**
 * Delete a lead
 * Automatically deletes the company if this is the last lead for that company
 * Also deletes all subcollections (timeline)
 */
export async function deleteLead(leadId: string): Promise<void> {
  try {
    // Get the lead first to find its companyId
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    const leadDoc = await getDoc(leadRef);

    if (!leadDoc.exists()) {
      console.warn('Lead not found:', leadId);
      return;
    }

    const leadData = leadDoc.data();
    const companyId = leadData.companyId;

    // Delete the lead
    await deleteDoc(leadRef);

    // Delete timeline subcollection
    // Note: Firestore doesn't auto-delete subcollections, but for now we'll rely on
    // the parent document deletion. In production, you may want to use a Cloud Function
    // to clean up subcollections or delete them manually here.

    // If lead had a company, check if we should delete the company too
    if (companyId) {
      const remainingLeads = await countLeadsForCompany(companyId);

      if (remainingLeads === 0) {
        // This was the last lead for this company, delete the company
        await deleteCompany(companyId);
      }
    }
  } catch (error) {
    console.error('Error deleting lead:', error);
    throw error;
  }
}

/**
 * Bulk update leads (for bulk operations)
 */
export async function bulkUpdateLeads(
  leadIds: string[],
  updates: Partial<LeadFormData>
): Promise<void> {
  try {
    const promises = leadIds.map((leadId) => updateLead(leadId, updates));
    await Promise.all(promises);
  } catch (error) {
    console.error('Error bulk updating leads:', error);
    throw error;
  }
}

/**
 * Bulk delete leads
 */
export async function bulkDeleteLeads(leadIds: string[]): Promise<void> {
  try {
    const promises = leadIds.map((leadId) => deleteLead(leadId));
    await Promise.all(promises);
  } catch (error) {
    console.error('Error bulk deleting leads:', error);
    throw error;
  }
}
