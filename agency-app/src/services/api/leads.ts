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
import { updateCompanyStatusFromLeads } from './companyStatus';

const LEADS_COLLECTION = 'leads';

/**
 * Safely convert a Firestore Timestamp to Date
 * Handles various data types that might be stored in the database
 */
function safeToDate(value: any): Date | undefined {
  if (!value) return undefined;

  // If it's already a Date object, return it
  if (value instanceof Date) return value;

  // If it has a toDate method (Firestore Timestamp), call it
  if (typeof value.toDate === 'function') {
    return value.toDate();
  }

  // If it's a string or number, try to parse it as a date
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? undefined : date;
  }

  // Otherwise, return undefined
  return undefined;
}

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
    createdAt: safeToDate(data.createdAt) || new Date(),
    updatedAt: safeToDate(data.updatedAt) || new Date(),
    stateHistory: data.stateHistory,
    stateDurations: data.stateDurations,
    apolloEnriched: data.apolloEnriched,
    lastEnrichedAt: safeToDate(data.lastEnrichedAt),
    totalApiCosts: data.totalApiCosts,
    lastApiCostUpdate: safeToDate(data.lastApiCostUpdate),
    rating: data.rating !== undefined ? data.rating : null,
    ratingUpdatedBy: data.ratingUpdatedBy,
    ratingUpdatedAt: safeToDate(data.ratingUpdatedAt),
    customFieldsUpdatedBy: data.customFieldsUpdatedBy,
    archived: data.archived || false,
    archivedAt: safeToDate(data.archivedAt),
    archivedBy: data.archivedBy,
    archiveReason: data.archiveReason,
    cascadedFrom: data.cascadedFrom,
    lastContactedDate: safeToDate(data.lastContactedDate),
    outreach: data.outreach
      ? {
          linkedIn: data.outreach.linkedIn
            ? {
                status: data.outreach.linkedIn.status,
                sentAt: safeToDate(data.outreach.linkedIn.sentAt),
                profileUrl: data.outreach.linkedIn.profileUrl,
                connectionRequest: data.outreach.linkedIn.connectionRequest
                  ? {
                      status: data.outreach.linkedIn.connectionRequest.status,
                      sentAt: safeToDate(data.outreach.linkedIn.connectionRequest.sentAt),
                    }
                  : undefined,
              }
            : undefined,
          email: data.outreach.email
            ? {
                status: data.outreach.email.status,
                sentAt: safeToDate(data.outreach.email.sentAt),
                draftCreatedAt: safeToDate(data.outreach.email.draftCreatedAt),
                draftId: data.outreach.email.draftId,
                draftUrl: data.outreach.email.draftUrl,
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

    // Update company status (first lead for new company)
    if (company.id) {
      try {
        await updateCompanyStatusFromLeads(company.id);
      } catch (companyError) {
        // Log error but don't fail the lead creation
        console.error('Error updating company status after lead creation:', companyError);
      }
    }

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

    // After all batches, update company statuses for all affected companies
    const uniqueCompanyIds = new Set(companyIdMap.values());
    if (uniqueCompanyIds.size > 0) {
      try {
        await Promise.all(
          Array.from(uniqueCompanyIds).map(companyId =>
            updateCompanyStatusFromLeads(companyId)
          )
        );
      } catch (companyError) {
        // Log error but don't fail the batch creation
        console.error('Error updating company statuses after batch lead creation:', companyError);
      }
    }

    return leadIds;
  } catch (error) {
    console.error('Error creating leads batch:', error);
    throw error;
  }
}

/**
 * Create multiple leads for a single company (optimized for bulk grid input)
 * Handles company creation/lookup and batch lead creation
 * @param leadsData Array of lead data to create
 * @param userId User ID performing the creation
 * @param companyName Company name for all leads
 * @returns Result object with successful count, failed count, and lead IDs
 */
export async function createLeadsForCompany(
  leadsData: LeadFormData[],
  userId: string,
  companyName: string
): Promise<{
  successful: number;
  failed: number;
  leadIds: string[];
  errors: string[];
}> {
  const errors: string[] = [];

  try {
    // Get or create the company first
    const company = await getOrCreateCompany(companyName);

    // Create company ID map with single entry
    const companyIdMap = new Map<string, string>();
    companyIdMap.set(companyName, company.id);

    // Update all lead data to use this company name
    const leadsWithCompany = leadsData.map(lead => ({
      ...lead,
      company: companyName,
    }));

    // Use existing batch creation
    const leadIds = await createLeadsBatch(leadsWithCompany, userId, companyIdMap);

    return {
      successful: leadIds.length,
      failed: leadsData.length - leadIds.length,
      leadIds,
      errors,
    };
  } catch (error) {
    console.error('Error creating leads for company:', error);
    errors.push(error instanceof Error ? error.message : 'Unknown error occurred');
    return {
      successful: 0,
      failed: leadsData.length,
      leadIds: [],
      errors,
    };
  }
}

/**
 * Update an existing lead
 * If company name changes, updates company reference
 * Auto-updates lead status to "Contacted" if outreach fields are modified
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

    // Check if outreach fields were updated
    const hasOutreachUpdate = (leadData as any).outreach !== undefined;
    if (hasOutreachUpdate) {
      // Auto-update lead status to "Contacted" if applicable
      await autoUpdateLeadStatusFromOutreach(leadId);
    }
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

    // Trigger company status recalculation if lead has a company
    if (lead.companyId) {
      try {
        await updateCompanyStatusFromLeads(lead.companyId);
      } catch (companyError) {
        // Log error but don't fail the lead status update
        console.error('Error updating company status after lead status change:', companyError);
      }
    }
  } catch (error) {
    console.error('Error updating lead status:', error);
    throw error;
  }
}

/**
 * Update a single custom field for a lead
 * Used for inline editing of custom fields in table view
 * @param leadId - The ID of the lead to update
 * @param fieldName - The name of the custom field to update
 * @param value - The new value for the custom field
 * @param userId - Optional user ID to track who made the update (for rating fields)
 */
export async function updateLeadCustomField(
  leadId: string,
  fieldName: string,
  value: any,
  userId?: string
): Promise<void> {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    const updateData: Record<string, any> = {
      [`customFields.${fieldName}`]: value,
      updatedAt: serverTimestamp(),
    };

    // Track who updated rating fields
    if (userId && fieldName.toLowerCase().includes('rating')) {
      updateData[`customFieldsUpdatedBy.${fieldName}`] = userId;
    }

    await updateDoc(leadRef, updateData);
  } catch (error) {
    console.error('Error updating lead custom field:', error);
    throw error;
  }
}

/**
 * Update lead rating with user tracking
 * @param leadId - The ID of the lead to update
 * @param rating - The new rating value (1-10 or null to clear)
 * @param userId - The user ID who is setting the rating
 */
export async function updateLeadRating(
  leadId: string,
  rating: number | null,
  userId?: string
): Promise<void> {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    const updateData: Record<string, any> = {
      rating: rating,
      updatedAt: serverTimestamp(),
    };

    if (userId) {
      updateData.ratingUpdatedBy = userId;
      updateData.ratingUpdatedAt = serverTimestamp();
    }

    await updateDoc(leadRef, updateData);
  } catch (error) {
    console.error('Error updating lead rating:', error);
    throw error;
  }
}

/**
 * Update a built-in field on a lead (e.g., createdAt, name, email)
 * @param leadId - The ID of the lead to update
 * @param fieldName - The name of the built-in field to update
 * @param value - The new value for the field
 */
export async function updateLeadField(
  leadId: string,
  fieldName: string,
  value: any
): Promise<void> {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(leadRef, {
      [fieldName]: value,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating lead field:', error);
    throw error;
  }
}

/**
 * Update LinkedIn outreach status for a lead
 * Auto-updates lead status to "Contacted" if conditions are met
 * @param leadId - The ID of the lead to update
 * @param status - The new LinkedIn outreach status
 */
export async function updateLeadLinkedInStatus(
  leadId: string,
  status: string
): Promise<void> {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(leadRef, {
      'outreach.linkedIn.status': status,
      updatedAt: serverTimestamp(),
    });

    // Auto-update lead status to "Contacted" if applicable
    await autoUpdateLeadStatusFromOutreach(leadId);
  } catch (error) {
    console.error('Error updating lead LinkedIn status:', error);
    throw error;
  }
}

/**
 * Update email outreach status for a lead
 * Auto-updates lead status to "Contacted" if conditions are met
 * @param leadId - The ID of the lead to update
 * @param status - The new email outreach status
 */
export async function updateLeadEmailStatus(
  leadId: string,
  status: string
): Promise<void> {
  console.log('🟢 [updateLeadEmailStatus] Called with:', { leadId, status });
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    console.log('🟢 [updateLeadEmailStatus] Updating outreach.email.status...');
    await updateDoc(leadRef, {
      'outreach.email.status': status,
      updatedAt: serverTimestamp(),
    });
    console.log('🟢 [updateLeadEmailStatus] Updated successfully, now calling autoUpdateLeadStatusFromOutreach...');

    // Auto-update lead status to "Contacted" if applicable
    await autoUpdateLeadStatusFromOutreach(leadId);
    console.log('🟢 [updateLeadEmailStatus] autoUpdateLeadStatusFromOutreach completed');
  } catch (error) {
    console.error('🔴 [updateLeadEmailStatus] Error updating lead email status:', error);
    throw error;
  }
}

/**
 * Check if a lead's outreach status or date should trigger auto-update to "Contacted"
 * @param outreach - The outreach data from the lead
 * @returns true if conditions are met for auto-update
 */
function shouldAutoUpdateToContacted(outreach: any): boolean {
  if (!outreach) return false;

  const triggerStatuses = ['sent', 'opened', 'replied'];

  // Check LinkedIn status
  const linkedInStatus = outreach.linkedIn?.status;
  const linkedInDate = outreach.linkedIn?.sentAt;
  const linkedInTrigger =
    (linkedInStatus && triggerStatuses.includes(linkedInStatus)) ||
    linkedInDate;

  // Check email status
  const emailStatus = outreach.email?.status;
  const emailDate = outreach.email?.sentAt;
  const emailTrigger =
    (emailStatus && triggerStatuses.includes(emailStatus)) ||
    emailDate;

  return linkedInTrigger || emailTrigger;
}

/**
 * Automatically update lead status to "Contacted" based on outreach activities
 * Only updates if current status is "New Lead" or "Qualified"
 * @param leadId - The ID of the lead to update
 * @param userId - The user ID to record in timeline (use 'system' for automatic updates)
 */
export async function autoUpdateLeadStatusFromOutreach(
  leadId: string,
  userId: string = 'system'
): Promise<void> {
  try {
    // Get current lead data
    const lead = await getLead(leadId);
    if (!lead) {
      return;
    }

    // Only auto-update from "new_lead" or "qualified" status
    const allowedStatuses: LeadStatus[] = ['new_lead', 'qualified'];
    if (!allowedStatuses.includes(lead.status)) {
      return;
    }

    // Check if outreach conditions are met
    const shouldUpdate = shouldAutoUpdateToContacted(lead.outreach);
    if (!shouldUpdate) {
      return;
    }

    // Determine reason for timeline
    const reasons: string[] = [];
    if (lead.outreach?.linkedIn?.status && ['sent', 'opened', 'replied'].includes(lead.outreach.linkedIn.status)) {
      reasons.push(`LinkedIn ${lead.outreach.linkedIn.status}`);
    }
    if (lead.outreach?.email?.status && ['sent', 'opened', 'replied'].includes(lead.outreach.email.status)) {
      reasons.push(`Email ${lead.outreach.email.status}`);
    }
    if (lead.outreach?.linkedIn?.sentAt && !reasons.some(r => r.startsWith('LinkedIn'))) {
      reasons.push('LinkedIn date set');
    }
    if (lead.outreach?.email?.sentAt && !reasons.some(r => r.startsWith('Email'))) {
      reasons.push('Email date set');
    }

    const reasonText = `Auto-updated to Contacted due to outreach: ${reasons.join(', ')}`;

    // Update main document status
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    await updateDoc(leadRef, {
      status: 'contacted',
      updatedAt: serverTimestamp(),
    });

    // Update timeline with automatic change flag
    await leadTimelineService.updateLeadStatus(
      leadId,
      lead.status,
      'contacted',
      userId,
      reasonText,
      true // automaticChange flag
    );

    // Trigger company status recalculation if lead has a company
    if (lead.companyId) {
      try {
        await updateCompanyStatusFromLeads(lead.companyId);
      } catch (companyError) {
        // Log error but don't fail the lead status update
        console.error('Error updating company status after auto lead status change:', companyError);
      }
    }
  } catch (error) {
    console.error(`Error auto-updating lead ${leadId} status:`, error);
    // Don't throw - we don't want to block the main outreach update if auto-status fails
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
  } catch (error) {
    console.error(`Error deleting timeline for lead ${leadId}:`, error);
    // Don't throw - we still want to delete the parent document even if timeline deletion fails
  }
}

/**
 * Archive a lead
 * Sets archived flag to true and records who archived it and when
 */
export async function archiveLead(
  leadId: string,
  userId: string,
  reason?: string,
  cascadedFromCompanyId?: string
): Promise<void> {
  try {
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    const updateData: any = {
      archived: true,
      archivedAt: serverTimestamp(),
      archivedBy: userId,
      updatedAt: serverTimestamp(),
    };

    // Add reason if provided
    if (reason && reason.trim()) {
      updateData.archiveReason = reason.trim();
    }

    // Add cascade metadata if archived with company
    if (cascadedFromCompanyId) {
      updateData.cascadedFrom = cascadedFromCompanyId;
    }

    await updateDoc(leadRef, updateData);
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
      archiveReason: null,
      cascadedFrom: null,
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
      } else {
        // Update company status based on remaining leads
        try {
          await updateCompanyStatusFromLeads(companyId);
        } catch (companyError) {
          // Log error but don't fail the lead deletion
          console.error('Error updating company status after lead deletion:', companyError);
        }
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

    // After all batches, update company statuses for affected companies
    // Get unique company IDs from all updated leads
    const companyIds = new Set<string>();
    for (const leadId of leadIds) {
      const lead = await getLead(leadId);
      if (lead?.companyId) {
        companyIds.add(lead.companyId);
      }
    }

    // Update company statuses in parallel
    if (companyIds.size > 0) {
      try {
        await Promise.all(
          Array.from(companyIds).map(companyId =>
            updateCompanyStatusFromLeads(companyId)
          )
        );
      } catch (companyError) {
        // Log error but don't fail the bulk update
        console.error('Error updating company statuses after bulk lead update:', companyError);
      }
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
/**
 * Bulk archive leads
 * @param leadIds Array of lead IDs to archive
 * @param userId User ID performing the archive
 * @param reason Optional reason for archiving
 * @param cascadedFromCompanyId Optional company ID if archived as part of company cascade
 */
export async function bulkArchiveLeads(
  leadIds: string[],
  userId: string,
  reason?: string,
  cascadedFromCompanyId?: string
): Promise<void> {
  try {
    const BATCH_SIZE = 500;

    // Process in batches of 500 (Firestore limit)
    for (let i = 0; i < leadIds.length; i += BATCH_SIZE) {
      const batchLeadIds = leadIds.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      batchLeadIds.forEach((leadId) => {
        const leadRef = doc(db, LEADS_COLLECTION, leadId);
        const updateData: any = {
          archived: true,
          archivedAt: serverTimestamp(),
          archivedBy: userId,
          updatedAt: serverTimestamp(),
        };

        // Add reason if provided
        if (reason && reason.trim()) {
          updateData.archiveReason = reason.trim();
        }

        // Add cascade metadata if archived with company
        if (cascadedFromCompanyId) {
          updateData.cascadedFrom = cascadedFromCompanyId;
        }

        batch.update(leadRef, updateData);
      });

      await batch.commit();
    }

    console.log('✅ Leads archived successfully:', leadIds.length);
  } catch (error) {
    console.error('Error bulk archiving leads:', error);
    throw new Error('Failed to archive leads');
  }
}

export async function bulkDeleteLeads(leadIds: string[]): Promise<void> {
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

    // Check and clean up companies that no longer have leads
    const companyCleanupPromises = Array.from(companyIds).map(async (companyId) => {
      const remainingLeads = await countLeadsForCompany(companyId);

      if (remainingLeads === 0) {
        await deleteCompany(companyId);
      }
    });

    await Promise.all(companyCleanupPromises);
  } catch (error) {
    console.error('Error bulk deleting leads:', error);
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
