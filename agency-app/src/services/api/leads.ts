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
  writeBatch,
  deleteField,
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
    archived: data.archived || false,
    archivedAt: data.archivedAt?.toDate(),
    archivedBy: data.archivedBy,
    outreach: data.outreach
      ? {
          linkedIn: data.outreach.linkedIn
            ? {
                status: data.outreach.linkedIn.status,
                sentAt: data.outreach.linkedIn.sentAt?.toDate(),
                profileUrl: data.outreach.linkedIn.profileUrl,
              }
            : undefined,
          email: data.outreach.email
            ? {
                status: data.outreach.email.status,
                sentAt: data.outreach.email.sentAt?.toDate(),
              }
            : undefined,
        }
      : undefined,
  };
}

/**
 * Subscribe to all active (non-archived) leads with real-time updates
 */
export function subscribeToLeads(
  callback: (leads: Lead[]) => void
): Unsubscribe {
  const leadsRef = collection(db, LEADS_COLLECTION);
  // Query all leads, filter archived in JavaScript to handle leads without archived field
  const q = query(
    leadsRef,
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const leads: Lead[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Filter out archived leads (handles both undefined and false)
        if (data.archived !== true) {
          leads.push(convertToLead(doc.id, data));
        }
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
 * Subscribe to archived leads with real-time updates
 */
export function subscribeToArchivedLeads(
  callback: (leads: Lead[]) => void
): Unsubscribe {
  const leadsRef = collection(db, LEADS_COLLECTION);
  const q = query(
    leadsRef,
    where('archived', '==', true),
    orderBy('archivedAt', 'desc')
  );

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
      console.error('Error listening to archived leads:', error);
      callback([]);
    }
  );
}

/**
 * Subscribe to leads for a specific company with real-time updates (by company ID)
 */
export function subscribeToCompanyLeads(
  companyId: string,
  callback: (leads: Lead[]) => void
): Unsubscribe {
  const leadsRef = collection(db, LEADS_COLLECTION);
  const q = query(
    leadsRef,
    where('companyId', '==', companyId),
    orderBy('createdAt', 'desc')
  );

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
      console.error('Error listening to company leads:', error);
      callback([]);
    }
  );
}

/**
 * Subscribe to leads for a specific company by name (fallback for legacy leads)
 * Used when leads don't have companyId field
 */
export function subscribeToCompanyLeadsByName(
  companyName: string,
  callback: (leads: Lead[]) => void
): Unsubscribe {
  const leadsRef = collection(db, LEADS_COLLECTION);
  const q = query(
    leadsRef,
    where('company', '==', companyName),
    orderBy('createdAt', 'desc')
  );

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
      console.error('Error listening to company leads by name:', error);
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
 * Get leads for a specific company (one-time fetch)
 */
export async function getLeadsByCompanyId(companyId: string): Promise<Lead[]> {
  try {
    const leadsRef = collection(db, LEADS_COLLECTION);
    const q = query(
      leadsRef,
      where('companyId', '==', companyId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);

    const leads: Lead[] = [];
    snapshot.forEach((doc) => {
      leads.push(convertToLead(doc.id, doc.data()));
    });

    return leads;
  } catch (error) {
    console.error('Error fetching company leads:', error);
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

    // Build lead document data (only include fields with values)
    const leadDocData: any = {
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
    };

    // Only add outreach if it exists (Firestore doesn't allow undefined)
    if ((leadData as any).outreach) {
      leadDocData.outreach = (leadData as any).outreach;
    }

    const docRef = await addDoc(leadsRef, leadDocData);

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
 * Create multiple leads in batch (optimized for bulk import)
 * Uses Firestore batch writes for maximum performance
 * @param leadsData Array of lead data to create
 * @param userId User ID performing the import
 * @param companyIdMap Map of company names to company IDs (pre-fetched)
 * @returns Array of created lead IDs
 */
export async function createLeadsBatch(
  leadsData: LeadFormData[],
  userId: string,
  companyIdMap: Map<string, string>
): Promise<string[]> {
  try {
    const leadsRef = collection(db, LEADS_COLLECTION);
    const leadIds: string[]= [];

    // Firestore batch limit is 500 operations
    const BATCH_SIZE = 500;

    for (let i = 0; i < leadsData.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunkLeadsData = leadsData.slice(i, Math.min(i + BATCH_SIZE, leadsData.length));

      for (const leadData of chunkLeadsData) {
        const companyId = companyIdMap.get(leadData.company);
        if (!companyId) {
          console.error(`Company ID not found for: ${leadData.company}`);
          continue;
        }

        const leadDocRef = doc(leadsRef);
        leadIds.push(leadDocRef.id);

        // Build lead document data
        const leadDocData: any = {
          name: leadData.name,
          email: leadData.email,
          phone: leadData.phone,
          company: leadData.company,
          companyId: companyId,
          companyName: leadData.company,
          status: leadData.status || 'new_lead',
          customFields: leadData.customFields || {},
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        // Only add outreach if it exists
        if ((leadData as any).outreach) {
          leadDocData.outreach = (leadData as any).outreach;
        }

        batch.set(leadDocRef, leadDocData);

        // Initialize timeline in the same batch
        const timelineRef = doc(db, `${LEADS_COLLECTION}/${leadDocRef.id}/timeline/${leadDocRef.id}`);
        const status = leadData.status || 'new_lead';
        const now = new Date().toISOString();

        batch.set(timelineRef, {
          stateHistory: { [status]: now },
          stateDurations: { [status]: 0 },
          statusChanges: [{
            fromStatus: null,
            toStatus: status,
            changedBy: userId,
            changedAt: now,
            automaticChange: false,
          }],
        });
      }

      // Commit this batch
      await batch.commit();
    }

    return leadIds;
  } catch (error) {
    console.error('Error creating leads batch:', error);
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
 * Helper function to delete all documents in a lead's timeline subcollection
 * @param leadId - The ID of the lead whose timeline should be deleted
 */
async function deleteLeadTimeline(leadId: string): Promise<void> {
  try {
    const timelineRef = collection(db, LEADS_COLLECTION, leadId, 'timeline');
    const timelineSnapshot = await getDocs(timelineRef);

    if (timelineSnapshot.empty) {
      return; // No timeline documents to delete
    }

    // Delete all timeline documents using batch
    const batch = writeBatch(db);
    timelineSnapshot.docs.forEach((timelineDoc) => {
      batch.delete(timelineDoc.ref);
    });

    await batch.commit();
    console.log(`Deleted ${timelineSnapshot.size} timeline documents for lead ${leadId}`);
  } catch (error) {
    console.error(`Error deleting timeline for lead ${leadId}:`, error);
    // Don't throw - we still want to delete the parent document even if timeline deletion fails
  }
}

/**
 * Archive a lead
 * Sets archived flag to true and records who archived it and when
 */
export async function archiveLead(leadId: string, userId: string): Promise<void> {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(leadRef, {
      archived: true,
      archivedAt: serverTimestamp(),
      archivedBy: userId,
      updatedAt: serverTimestamp(),
    });
    console.log('✅ Lead archived successfully:', leadId);
  } catch (error) {
    console.error('Error archiving lead:', error);
    throw new Error('Failed to archive lead');
  }
}

/**
 * Unarchive a lead
 * Sets archived flag to false and clears archive metadata
 */
export async function unarchiveLead(leadId: string): Promise<void> {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(leadRef, {
      archived: false,
      archivedAt: null,
      archivedBy: null,
      updatedAt: serverTimestamp(),
    });
    console.log('✅ Lead unarchived successfully:', leadId);
  } catch (error) {
    console.error('Error unarchiving lead:', error);
    throw new Error('Failed to unarchive lead');
  }
}

/**
 * Delete a lead
 * Automatically deletes the company if this is the last lead for that company
 * Also deletes all subcollections (timeline)
 */
export async function deleteLead(leadId: string): Promise<void> {
  console.log('🗑️ [LEAD DELETE] Starting lead deletion:', {
    leadId,
    timestamp: new Date().toISOString(),
  });

  try {
    // Get the lead first to find its companyId
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    const leadDoc = await getDoc(leadRef);

    if (!leadDoc.exists()) {
      console.warn('⚠️ [LEAD DELETE] Lead not found:', leadId);
      return;
    }

    const leadData = leadDoc.data();
    const companyId = leadData.companyId;
    const leadName = leadData.name;

    console.log('🔍 [LEAD DELETE] Lead info:', {
      leadId,
      leadName,
      companyId,
      hasCompany: !!companyId,
    });

    // Delete timeline subcollection first
    await deleteLeadTimeline(leadId);

    // Delete the lead document
    await deleteDoc(leadRef);

    console.log('✅ [LEAD DELETE] Lead deleted:', { leadId, leadName });

    // If lead had a company, check if we should delete the company too
    if (companyId) {
      const remainingLeads = await countLeadsForCompany(companyId);

      console.log('🔍 [LEAD DELETE] Company cleanup check:', {
        leadId,
        companyId,
        remainingLeads,
        willDeleteCompany: remainingLeads === 0,
      });

      if (remainingLeads === 0) {
        console.log('⚠️ [LEAD DELETE] Triggering company auto-delete:', {
          companyId,
          reason: 'Last lead deleted',
          deletedLeadId: leadId,
        });
        // This was the last lead for this company, delete the company
        await deleteCompany(companyId);
      }
    }
  } catch (error) {
    console.error('❌ [LEAD DELETE] Error deleting lead:', error);
    throw error;
  }
}

/**
 * Bulk update lead status (uses batch writes for efficiency)
 * Max 500 leads per batch (Firestore limit)
 */
export async function bulkUpdateLeadStatus(
  leadIds: string[],
  newStatus: LeadStatus,
  userId: string
): Promise<void> {
  try {
    const BATCH_SIZE = 500;

    // Process in batches of 500 (Firestore limit)
    for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
      const batchLeadIds = leadIds.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      // Get current status for each lead for timeline updates
      const leadDocs = await Promise.all(
        batchLeadIds.map(id => getDoc(doc(db, LEADS_COLLECTION, id)))
      );

      batchLeadIds.forEach((leadId, index) => {
        const leadRef = doc(db, LEADS_COLLECTION, leadId);
        batch.update(leadRef, {
          status: newStatus,
          updatedAt: serverTimestamp(),
        });
      });

      await batch.commit();

      // Update timelines (can't batch subcollections easily, so do separately)
      await Promise.all(
        batchLeadIds.map(async (leadId, index) => {
          const leadDoc = leadDocs[index];
          if (leadDoc.exists()) {
            const oldStatus = leadDoc.data().status;
            await leadTimelineService.updateLeadStatus(
              leadId,
              oldStatus,
              newStatus,
              userId
            );
          }
        })
      );
    }
  } catch (error) {
    console.error('Error bulk updating lead status:', error);
    throw error;
  }
}

/**
 * Bulk update lead fields (uses batch writes)
 * Updates customFields for multiple leads
 */
export async function bulkUpdateLeadFields(
  leadIds: string[],
  updates: Record<string, any>
): Promise<void> {
  try {
    const BATCH_SIZE = 500;

    for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
      const batchLeadIds = leadIds.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      batchLeadIds.forEach((leadId) => {
        const leadRef = doc(db, LEADS_COLLECTION, leadId);
        const updateData: any = {};

        // Update direct fields
        Object.keys(updates).forEach(key => {
          if (['name', 'email', 'phone', 'company'].includes(key)) {
            updateData[key] = updates[key];
          } else {
            // Update as custom field
            updateData[`customFields.${key}`] = updates[key];
          }
        });

        updateData.updatedAt = serverTimestamp();
        batch.update(leadRef, updateData);
      });

      await batch.commit();
    }
  } catch (error) {
    console.error('Error bulk updating lead fields:', error);
    throw error;
  }
}

/**
 * Bulk delete leads (uses batch writes where possible)
 * Also handles company cleanup
 */
export async function bulkDeleteLeads(leadIds: string[]): Promise<void> {
  console.log('🗑️ [BULK DELETE] Starting bulk lead deletion:', {
    count: leadIds.length,
    leadIds,
    timestamp: new Date().toISOString(),
  });

  try {
    // Get all lead documents first to find their companies
    const leadDocs = await Promise.all(
      leadIds.map(id => getDoc(doc(db, LEADS_COLLECTION, id)))
    );

    const companyIds = new Set<string>();
    leadDocs.forEach(leadDoc => {
      if (leadDoc.exists()) {
        const companyId = leadDoc.data().companyId;
        if (companyId) {
          companyIds.add(companyId);
        }
      }
    });

    console.log('🔍 [BULK DELETE] Found affected companies:', {
      companyCount: companyIds.size,
      companyIds: Array.from(companyIds),
    });

    // Delete timeline subcollections first (in parallel for better performance)
    await Promise.all(leadIds.map(leadId => deleteLeadTimeline(leadId)));

    // Delete leads in batches
    const BATCH_SIZE = 500;
    for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
      const batchLeadIds = leadIds.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      batchLeadIds.forEach((leadId) => {
        const leadRef = doc(db, LEADS_COLLECTION, leadId);
        batch.delete(leadRef);
      });

      await batch.commit();
    }

    console.log('✅ [BULK DELETE] Leads deleted, checking company cleanup');

    // Check and clean up companies that no longer have leads
    const companyCleanupPromises = Array.from(companyIds).map(async (companyId) => {
      const remainingLeads = await countLeadsForCompany(companyId);

      console.log('🔍 [BULK DELETE] Company check:', {
        companyId,
        remainingLeads,
        willDelete: remainingLeads === 0,
      });

      if (remainingLeads === 0) {
        console.log('⚠️ [BULK DELETE] Triggering company auto-delete:', {
          companyId,
          reason: 'All leads deleted in bulk operation',
          deletedLeadCount: leadIds.length,
        });
        await deleteCompany(companyId);
      }
    });

    await Promise.all(companyCleanupPromises);

    console.log('✅ [BULK DELETE] Bulk deletion complete');
  } catch (error) {
    console.error('❌ [BULK DELETE] Error bulk deleting leads:', error);
    throw error;
  }
}

/**
 * Deletes a custom field from ALL leads in the system
 * Used when user wants to permanently remove a custom column
 * @param fieldName The custom field name to delete (e.g., "linkedin_job", "priority")
 * @returns Object with number of leads affected
 */
export async function deleteCustomFieldFromAllLeads(
  fieldName: string
): Promise<{ deleted: number }> {
  console.log(`🗑️ [DELETE FIELD] Starting deletion of custom field: ${fieldName}`);

  try {
    const leadsRef = collection(db, LEADS_COLLECTION);

    // Query for all leads that have this custom field
    const q = query(
      leadsRef,
      where(`customFields.${fieldName}`, '!=', null)
    );

    const snapshot = await getDocs(q);
    const affectedCount = snapshot.docs.length;

    console.log(`📊 [DELETE FIELD] Found ${affectedCount} leads with field "${fieldName}"`);

    if (affectedCount === 0) {
      console.log(`ℹ️ [DELETE FIELD] No leads found with field "${fieldName}"`);
      return { deleted: 0 };
    }

    // Firebase batch has a limit of 500 operations
    const batchSize = 500;
    const batches: any[] = [];

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = snapshot.docs.slice(i, i + batchSize);

      batchDocs.forEach((docSnapshot) => {
        batch.update(docSnapshot.ref, {
          [`customFields.${fieldName}`]: deleteField()
        });
      });

      batches.push(batch);
    }

    // Execute all batches
    await Promise.all(batches.map(batch => batch.commit()));

    console.log(`✅ [DELETE FIELD] Successfully deleted field "${fieldName}" from ${affectedCount} leads`);
    return { deleted: affectedCount };
  } catch (error) {
    console.error(`❌ [DELETE FIELD] Error deleting custom field "${fieldName}":`, error);
    throw error;
  }
}
