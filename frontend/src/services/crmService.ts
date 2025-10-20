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
import { db } from '../app/config/firebase';
import { Lead, LeadFormData } from '../app/types/crm';
import { getOrCreateCompany, deleteCompany } from './companiesService';

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
 * Automatically creates company if it doesn't exist
 */
export async function createLead(leadData: LeadFormData): Promise<string> {
  try {
    // Get or create the company
    const company = await getOrCreateCompany(leadData.company);

    const leadsRef = collection(db, LEADS_COLLECTION);
    const docRef = await addDoc(leadsRef, {
      ...leadData,
      companyId: company.id, // Store company reference
      companyName: company.name, // Denormalized for performance
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
 * Count leads for a company
 */
async function countLeadsForCompany(companyId: string): Promise<number> {
  try {
    const leadsRef = collection(db, LEADS_COLLECTION);
    const q = query(leadsRef, where('companyId', '==', companyId));
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error counting leads for company:', error);
    return 0;
  }
}

/**
 * Delete a lead
 * Automatically deletes the company if this is the last lead for that company
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

    // If lead had a company, check if we should delete the company too
    if (companyId) {
      const remainingLeads = await countLeadsForCompany(companyId);

      if (remainingLeads === 0) {
        // This was the last lead for this company, delete the company
        await deleteCompany(companyId);
        console.log('Company auto-deleted (no remaining leads):', companyId);
      }
    }
  } catch (error) {
    console.error('Error deleting lead:', error);
    throw error;
  }
}
