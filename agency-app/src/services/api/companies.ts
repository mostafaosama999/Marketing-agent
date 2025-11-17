// src/services/api/companies.ts
// Service for managing companies in CRM

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Unsubscribe,
  onSnapshot,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { Company, CompanyFormData } from '../../types/crm';
import { LeadStatus } from '../../types/lead';
import {
  setCompanyStatusManually as setStatusManually,
  unlockCompanyStatus as unlockStatus,
  batchUpdateCompanyStatuses,
} from './companyStatus';

const COMPANIES_COLLECTION = 'entities';  // Renamed from 'companies' to bypass auto-deletion issue
const LEADS_COLLECTION = 'leads';

/**
 * Convert Firestore document to Company object
 */
function convertToCompany(id: string, data: any): Company {
  return {
    id,
    name: data.name || '',
    website: data.website,
    industry: data.industry,
    description: data.description,
    ratingV2: data.ratingV2 !== undefined ? data.ratingV2 : null,
    ratingV2UpdatedBy: data.ratingV2UpdatedBy,
    ratingV2UpdatedAt: data.ratingV2UpdatedAt?.toDate ? data.ratingV2UpdatedAt.toDate() : (data.ratingV2UpdatedAt ? new Date(data.ratingV2UpdatedAt) : undefined),
    customFields: data.customFields || {},
    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt || new Date()),
    updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt || new Date()),
    totalApiCosts: data.totalApiCosts,
    lastApiCostUpdate: data.lastApiCostUpdate?.toDate ? data.lastApiCostUpdate.toDate() : (data.lastApiCostUpdate ? new Date(data.lastApiCostUpdate) : undefined),
    archived: data.archived || false,
    archivedAt: data.archivedAt?.toDate ? data.archivedAt.toDate() : (data.archivedAt ? new Date(data.archivedAt) : undefined),
    archivedBy: data.archivedBy,
    archiveReason: data.archiveReason,
    status: data.status,
    statusLockedManually: data.statusLockedManually || false,
    statusLastUpdatedAt: data.statusLastUpdatedAt?.toDate ? data.statusLastUpdatedAt.toDate() : (data.statusLastUpdatedAt ? new Date(data.statusLastUpdatedAt) : undefined),
    statusLastUpdatedBy: data.statusLastUpdatedBy,
    writingProgramAnalysis: data.writingProgramAnalysis ? {
      ...data.writingProgramAnalysis,
      lastAnalyzedAt: data.writingProgramAnalysis.lastAnalyzedAt?.toDate
        ? data.writingProgramAnalysis.lastAnalyzedAt.toDate()
        : new Date(data.writingProgramAnalysis.lastAnalyzedAt),
    } : undefined,
    blogAnalysis: data.blogAnalysis ? {
      ...data.blogAnalysis,
      lastAnalyzedAt: data.blogAnalysis.lastAnalyzedAt?.toDate
        ? data.blogAnalysis.lastAnalyzedAt.toDate()
        : new Date(data.blogAnalysis.lastAnalyzedAt),
    } : undefined,
    apolloEnrichment: data.apolloEnrichment ? {
      ...data.apolloEnrichment,
      lastEnrichedAt: data.apolloEnrichment.lastEnrichedAt?.toDate
        ? data.apolloEnrichment.lastEnrichedAt.toDate()
        : data.apolloEnrichment.lastEnrichedAt
        ? new Date(data.apolloEnrichment.lastEnrichedAt)
        : undefined,
      costInfo: data.apolloEnrichment.costInfo ? {
        ...data.apolloEnrichment.costInfo,
        timestamp: data.apolloEnrichment.costInfo.timestamp?.toDate
          ? data.apolloEnrichment.costInfo.timestamp.toDate()
          : data.apolloEnrichment.costInfo.timestamp
          ? new Date(data.apolloEnrichment.costInfo.timestamp)
          : undefined,
      } : undefined,
    } : undefined,
    offer: data.offer ? {
      blogIdea: data.offer.blogIdea,
      createdAt: data.offer.createdAt?.toDate
        ? data.offer.createdAt.toDate()
        : data.offer.createdAt
        ? new Date(data.offer.createdAt)
        : new Date(),
      updatedAt: data.offer.updatedAt?.toDate
        ? data.offer.updatedAt.toDate()
        : data.offer.updatedAt
        ? new Date(data.offer.updatedAt)
        : new Date(),
    } : undefined,
  };
}

/**
 * Get or create a company by name
 * Performs case-insensitive lookup
 */
export async function getOrCreateCompany(companyName: string): Promise<Company> {
  console.log('🔍 [COMPANY GET/CREATE] Looking up company:', {
    name: companyName,
    normalized: companyName.trim(),
    timestamp: new Date().toISOString(),
  });

  try {
    // Normalize company name (trim and lowercase for comparison)
    const normalizedName = companyName.trim();
    const lowerName = normalizedName.toLowerCase();

    // Check if company exists (case-insensitive)
    const companiesRef = collection(db, COMPANIES_COLLECTION);
    const snapshot = await getDocs(companiesRef);

    // Find existing company (case-insensitive match)
    let existingCompany: Company | null = null;
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.name.toLowerCase() === lowerName) {
        existingCompany = convertToCompany(doc.id, data);
      }
    });

    if (existingCompany !== null) {
      console.log('✅ [COMPANY GET/CREATE] Found existing company');
      return existingCompany;
    }

    // Company doesn't exist, create it
    console.log('➕ [COMPANY GET/CREATE] Creating new company:', {
      name: normalizedName,
    });

    const docRef = await addDoc(companiesRef, {
      name: normalizedName,
      customFields: {},
      status: 'new_lead', // Default status for new companies
      statusLockedManually: false,
      statusLastUpdatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    console.log('✅ [COMPANY GET/CREATE] New company created:', {
      id: docRef.id,
      name: normalizedName,
      timestamp: new Date().toISOString(),
    });

    return {
      id: docRef.id,
      name: normalizedName,
      customFields: {},
      status: 'new_lead',
      statusLockedManually: false,
      statusLastUpdatedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('❌ [COMPANY GET/CREATE] Error:', error);
    throw error;
  }
}

/**
 * Batch create/get multiple companies (optimized for bulk import)
 * Returns a Map of company names to company IDs
 * @param companyNames Array of unique company names
 * @returns Map of company name (lowercase) to company ID
 */
export async function getOrCreateCompaniesBatch(
  companyNames: string[]
): Promise<Map<string, string>> {
  try {
    const companyIdMap = new Map<string, string>();

    // Fetch all existing companies once
    const companiesRef = collection(db, COMPANIES_COLLECTION);
    const snapshot = await getDocs(companiesRef);

    const existingCompanies = new Map<string, { id: string; name: string }>();
    snapshot.forEach((doc) => {
      const data = doc.data();
      existingCompanies.set(data.name.toLowerCase(), { id: doc.id, name: data.name });
    });

    // Identify companies that need to be created
    const companiesToCreate: string[] = [];
    const normalizedNames = new Map<string, string>(); // lowercase -> original case

    for (const companyName of companyNames) {
      const normalizedName = companyName.trim();
      const lowerName = normalizedName.toLowerCase();
      normalizedNames.set(lowerName, normalizedName);

      const existing = existingCompanies.get(lowerName);
      if (existing) {
        // Company exists, use original name from database
        companyIdMap.set(normalizedName, existing.id);
        companyIdMap.set(lowerName, existing.id); // Also add lowercase key for lookups
      } else {
        // Company doesn't exist, need to create
        companiesToCreate.push(normalizedName);
      }
    }

    // Create new companies in batches
    if (companiesToCreate.length > 0) {
      const BATCH_SIZE = 500;
      const batch = writeBatch(db);
      let batchCount = 0;

      for (const companyName of companiesToCreate) {
        const companyDocRef = doc(companiesRef);
        batch.set(companyDocRef, {
          name: companyName,
          customFields: {},
          status: 'new_lead', // Default status for new companies
          statusLockedManually: false,
          statusLastUpdatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        companyIdMap.set(companyName, companyDocRef.id);
        companyIdMap.set(companyName.toLowerCase(), companyDocRef.id); // Also add lowercase key for lookups

        batchCount++;
        if (batchCount >= BATCH_SIZE) {
          await batch.commit();
          batchCount = 0;
        }
      }

      // Commit any remaining operations
      if (batchCount > 0) {
        await batch.commit();
      }
    }

    return companyIdMap;
  } catch (error) {
    console.error('Error batch creating companies:', error);
    throw error;
  }
}

/**
 * Get all companies (excludes archived)
 */
export async function getCompanies(): Promise<Company[]> {
  try {
    const companiesRef = collection(db, COMPANIES_COLLECTION);
    const q = query(companiesRef, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);

    const companies: Company[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      // Filter out archived companies
      if (data.archived !== true) {
        companies.push(convertToCompany(doc.id, data));
      }
    });

    return companies;
  } catch (error) {
    console.error('Error fetching companies:', error);
    return [];
  }
}

/**
 * Subscribe to companies with real-time updates (excludes archived)
 */
export function subscribeToCompanies(
  callback: (companies: Company[]) => void
): Unsubscribe {
  const companiesRef = collection(db, COMPANIES_COLLECTION);
  const q = query(companiesRef, orderBy('name', 'asc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const companies: Company[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Filter out archived companies
        if (data.archived !== true) {
          companies.push(convertToCompany(doc.id, data));
        }
      });
      callback(companies);
    },
    (error) => {
      console.error('Error listening to companies:', error);
      callback([]);
    }
  );
}

/**
 * Get a single company by ID
 */
export async function getCompany(companyId: string): Promise<Company | null> {
  try {
    const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
    const companyDoc = await getDoc(companyRef);

    if (!companyDoc.exists()) {
      return null;
    }

    return convertToCompany(companyDoc.id, companyDoc.data());
  } catch (error) {
    console.error('Error fetching company:', error);
    return null;
  }
}

/**
 * Create a new company manually
 */
export async function createCompany(
  companyData: CompanyFormData
): Promise<string> {
  try {
    const companiesRef = collection(db, COMPANIES_COLLECTION);

    // Build document data without undefined fields (Firestore doesn't allow undefined)
    const now = new Date();
    const docData: any = {
      name: companyData.name,
      customFields: companyData.customFields || {},
      createdAt: now,
      updatedAt: now,
      status: companyData.status || 'new_lead', // Default status
      statusLockedManually: companyData.statusLockedManually || false,
      statusLastUpdatedAt: now,
    };

    // Only add optional fields if they have values
    if (companyData.website !== undefined && companyData.website !== null && companyData.website !== '') {
      docData.website = companyData.website;
    }
    if (companyData.industry !== undefined && companyData.industry !== null && companyData.industry !== '') {
      docData.industry = companyData.industry;
    }
    if (companyData.description !== undefined && companyData.description !== null && companyData.description !== '') {
      docData.description = companyData.description;
    }

    const docRef = await addDoc(companiesRef, docData);
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating company:', error);
    throw error;
  }
}

/**
 * Update a company
 */
export async function updateCompany(
  companyId: string,
  companyData: Partial<CompanyFormData> | Record<string, any>
): Promise<void> {
  try {
    const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
    await updateDoc(companyRef, {
      ...companyData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating company:', error);
    throw error;
  }
}

/**
 * Update a single custom field for a company
 * Used for inline editing of custom fields in table view
 * @param companyId - The ID of the company to update
 * @param fieldName - The name of the custom field to update
 * @param value - The new value for the custom field
 */
export async function updateCompanyCustomField(
  companyId: string,
  fieldName: string,
  value: any
): Promise<void> {
  try {
    const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
    await updateDoc(companyRef, {
      [`customFields.${fieldName}`]: value,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating company custom field:', error);
    throw error;
  }
}

/**
 * Update a built-in field on a company (e.g., createdAt, name, website)
 * @param companyId - The ID of the company to update
 * @param fieldName - The name of the built-in field to update
 * @param value - The new value for the field
 * @param userId - Optional user ID to track who made the update (used for ratingV2)
 */
export async function updateCompanyField(
  companyId: string,
  fieldName: string,
  value: any,
  userId?: string
): Promise<void> {
  try {
    const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
    const updateData: any = {
      [fieldName]: value,
      updatedAt: serverTimestamp(),
    };

    // Track user who updated ratingV2
    if (fieldName === 'ratingV2' && userId) {
      updateData.ratingV2UpdatedBy = userId;
      updateData.ratingV2UpdatedAt = serverTimestamp();
    }

    await updateDoc(companyRef, updateData);
  } catch (error) {
    console.error('Error updating company field:', error);
    throw error;
  }
}

/**
 * Count leads for a company (to determine if company can be deleted)
 */
export async function countLeadsForCompany(companyId: string): Promise<number> {
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
 * Delete a company
 * Should only be called when no leads reference this company
 */
export async function deleteCompany(companyId: string): Promise<void> {
  const stack = new Error().stack?.split('\n').slice(1, 5).join('\n');

  console.log('🗑️ [COMPANY DELETE] Delete requested:', {
    companyId,
    timestamp: new Date().toISOString(),
    calledFrom: stack,
  });

  try {
    // Safety check: ensure no leads reference this company
    const leadCount = await countLeadsForCompany(companyId);

    console.log('🔍 [COMPANY DELETE] Lead count check:', {
      companyId,
      leadCount,
      willDelete: leadCount === 0,
      timestamp: new Date().toISOString(),
    });

    if (leadCount > 0) {
      console.warn('⚠️ [COMPANY DELETE] Cannot delete company - has leads:', {
        companyId,
        leadCount,
      });
      return;
    }

    const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
    await deleteDoc(companyRef);

    console.log('✅ [COMPANY DELETE] Company deleted successfully:', {
      companyId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ [COMPANY DELETE] Error deleting company:', error);
    throw error;
  }
}

/**
 * Get lead counts for all companies in a single optimized query
 * @returns Map of companyId to lead count
 */
export async function getLeadCountsForAllCompanies(): Promise<Map<string, number>> {
  try {
    const leadCounts = new Map<string, number>();

    // Fetch all leads in one query
    const leadsRef = collection(db, LEADS_COLLECTION);
    const snapshot = await getDocs(leadsRef);

    // Count leads per company
    snapshot.forEach((doc) => {
      const data = doc.data();
      const companyId = data.companyId;
      if (companyId) {
        leadCounts.set(companyId, (leadCounts.get(companyId) || 0) + 1);
      }
    });

    return leadCounts;
  } catch (error) {
    console.error('Error fetching lead counts:', error);
    return new Map();
  }
}

/**
 * Bulk delete multiple companies
 * @param companyIds Array of company IDs to delete
 */
export async function bulkDeleteCompanies(companyIds: string[]): Promise<void> {
  try {
    if (companyIds.length === 0) return;

    const BATCH_SIZE = 500; // Firestore batch write limit

    for (let i = 0; i < companyIds.length; i += BATCH_SIZE) {
      const batchIds = companyIds.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      batchIds.forEach((companyId) => {
        const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
        batch.delete(companyRef);
      });

      await batch.commit();
    }
  } catch (error) {
    console.error('Error bulk deleting companies:', error);
    throw error;
  }
}

/**
 * Get companies with lead counts (optimized version)
 */
export async function getCompaniesWithLeadCounts(): Promise<
  Array<Company & { leadCount: number }>
> {
  try {
    const companies = await getCompanies();

    // Get all lead counts in one query
    const leadCounts = await getLeadCountsForAllCompanies();

    // Map counts to companies
    const companiesWithCounts = companies.map((company) => ({
      ...company,
      leadCount: leadCounts.get(company.id) || 0,
    }));

    return companiesWithCounts;
  } catch (error) {
    console.error('Error fetching companies with lead counts:', error);
    return [];
  }
}

/**
 * Archive a company
 * Sets archived flag and metadata
 * Optionally cascades to archive all associated leads
 */
export async function archiveCompany(
  companyId: string,
  userId: string,
  reason?: string,
  cascadeToLeads: boolean = false
): Promise<{ companyArchived: boolean; leadsArchived: number }> {
  try {
    // Archive the company
    const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
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

    await updateDoc(companyRef, updateData);
    console.log('✅ Company archived successfully:', companyId);

    let leadsArchived = 0;

    // Cascade to leads if requested
    if (cascadeToLeads) {
      const { getLeadsByCompanyId, bulkArchiveLeads } = await import('./leads');
      const leads = await getLeadsByCompanyId(companyId);

      // Filter only non-archived leads
      const activeLeads = leads.filter(lead => !lead.archived);

      if (activeLeads.length > 0) {
        const leadIds = activeLeads.map(lead => lead.id);
        await bulkArchiveLeads(leadIds, userId, reason, companyId);
        leadsArchived = leadIds.length;
        console.log(`✅ Cascaded archive to ${leadsArchived} leads`);
      }
    }

    return { companyArchived: true, leadsArchived };
  } catch (error) {
    console.error('Error archiving company:', error);
    throw new Error('Failed to archive company');
  }
}

/**
 * Get archived leads that were cascaded from a specific company
 */
export async function getArchivedLeadsCascadedFromCompany(companyId: string): Promise<any[]> {
  try {
    const { getDocs, query, where, collection } = await import('firebase/firestore');
    const leadsRef = collection(db, 'leads');
    const q = query(
      leadsRef,
      where('archived', '==', true),
      where('cascadedFrom', '==', companyId)
    );

    const snapshot = await getDocs(q);
    const leads: any[] = [];
    snapshot.forEach(doc => {
      leads.push({ id: doc.id, ...doc.data() });
    });

    return leads;
  } catch (error) {
    console.error('Error fetching cascaded leads:', error);
    return [];
  }
}

/**
 * Unarchive a company
 * Removes archived flag and metadata
 */
export async function unarchiveCompany(companyId: string): Promise<void> {
  try {
    const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
    await updateDoc(companyRef, {
      archived: false,
      archivedAt: null,
      archivedBy: null,
      archiveReason: null,
      updatedAt: serverTimestamp(),
    });
    console.log('✅ Company unarchived successfully:', companyId);
  } catch (error) {
    console.error('Error unarchiving company:', error);
    throw new Error('Failed to unarchive company');
  }
}

/**
 * Subscribe to archived companies with real-time updates
 */
export function subscribeToArchivedCompanies(
  callback: (companies: Company[]) => void
): Unsubscribe {
  const companiesRef = collection(db, COMPANIES_COLLECTION);
  const q = query(
    companiesRef,
    where('archived', '==', true),
    orderBy('archivedAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const companies: Company[] = [];
      snapshot.forEach((doc) => {
        companies.push(convertToCompany(doc.id, doc.data()));
      });
      callback(companies);
    },
    (error) => {
      console.error('Error listening to archived companies:', error);
      callback([]);
    }
  );
}

/**
 * Bulk archive companies
 * @param companyIds Array of company IDs to archive
 * @param userId User ID performing the archive
 * @param reason Optional reason for archiving
 * @param cascadeToLeads Whether to also archive all associated leads
 */
export async function bulkArchiveCompanies(
  companyIds: string[],
  userId: string,
  reason?: string,
  cascadeToLeads: boolean = false
): Promise<{ companiesArchived: number; leadsArchived: number }> {
  try {
    const BATCH_SIZE = 500;

    // Archive companies in batches
    for (let i = 0; i < companyIds.length; i += BATCH_SIZE) {
      const batchCompanyIds = companyIds.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      batchCompanyIds.forEach((companyId) => {
        const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
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

        batch.update(companyRef, updateData);
      });

      await batch.commit();
    }

    console.log('✅ Companies archived successfully:', companyIds.length);

    let totalLeadsArchived = 0;

    // Cascade to leads if requested
    if (cascadeToLeads) {
      const { getLeadsByCompanyId, bulkArchiveLeads } = await import('./leads');

      // Get all leads for all companies
      const allLeads = await Promise.all(
        companyIds.map(companyId => getLeadsByCompanyId(companyId))
      );

      // Flatten and filter only active leads
      const leadsToArchive = allLeads.flat().filter(lead => !lead.archived);

      if (leadsToArchive.length > 0) {
        // Group leads by company for cascade tracking
        const leadIdsByCompany = new Map<string, string[]>();
        leadsToArchive.forEach(lead => {
          const companyId = lead.companyId || '';
          if (!leadIdsByCompany.has(companyId)) {
            leadIdsByCompany.set(companyId, []);
          }
          leadIdsByCompany.get(companyId)!.push(lead.id);
        });

        // Archive leads for each company with cascade metadata
        const companyLeadEntries = Array.from(leadIdsByCompany.entries());
        for (const [companyId, leadIds] of companyLeadEntries) {
          await bulkArchiveLeads(leadIds, userId, reason, companyId);
          totalLeadsArchived += leadIds.length;
        }

        console.log(`✅ Cascaded archive to ${totalLeadsArchived} leads`);
      }
    }

    return { companiesArchived: companyIds.length, leadsArchived: totalLeadsArchived };
  } catch (error) {
    console.error('Error bulk archiving companies:', error);
    throw new Error('Failed to archive companies');
  }
}

/**
 * Bulk update company fields
 * @param companyIds Array of company IDs to update
 * @param updates Object containing fields to update
 */
export async function bulkUpdateCompanyFields(
  companyIds: string[],
  updates: Partial<Company>
): Promise<void> {
  try {
    const BATCH_SIZE = 500;

    // Process in batches of 500 (Firestore limit)
    for (let i = 0; i < companyIds.length; i += BATCH_SIZE) {
      const batchCompanyIds = companyIds.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      batchCompanyIds.forEach((companyId) => {
        const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
        const updateData: any = { ...updates };

        // Add updatedAt timestamp
        updateData.updatedAt = serverTimestamp();

        batch.update(companyRef, updateData);
      });

      await batch.commit();
    }

    console.log('✅ Companies updated successfully:', companyIds.length);
  } catch (error) {
    console.error('Error bulk updating companies:', error);
    throw new Error('Failed to update companies');
  }
}

/**
 * Bulk delete companies
 * @param companyIds Array of company IDs to delete
 */
export async function deleteCompanies(companyIds: string[]): Promise<void> {
  try {
    const BATCH_SIZE = 500;

    // Process in batches of 500 (Firestore limit)
    for (let i = 0; i < companyIds.length; i += BATCH_SIZE) {
      const batchCompanyIds = companyIds.slice(i, i + BATCH_SIZE);
      const batch = writeBatch(db);

      batchCompanyIds.forEach((companyId) => {
        const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
        batch.delete(companyRef);
      });

      await batch.commit();
    }

    console.log('✅ Companies deleted successfully:', companyIds.length);
  } catch (error) {
    console.error('Error bulk deleting companies:', error);
    throw new Error('Failed to delete companies');
  }
}

// ============================================================================
// Company Status Management Functions
// ============================================================================

/**
 * Manually set company status and lock it from auto-updates
 * @param companyId - ID of the company
 * @param status - New status to set
 * @param userId - ID of the user making the change
 */
export async function setCompanyStatusManually(
  companyId: string,
  status: LeadStatus,
  userId: string
): Promise<void> {
  return setStatusManually(companyId, status, userId);
}

/**
 * Unlock company status and recalculate from leads
 * @param companyId - ID of the company
 * @param userId - ID of the user unlocking
 */
export async function unlockCompanyStatus(
  companyId: string,
  userId: string
): Promise<LeadStatus> {
  return unlockStatus(companyId, userId);
}

/**
 * Batch update company statuses for multiple companies
 * Useful after bulk lead operations
 * @param companyIds - Array of company IDs to update
 */
export async function bulkUpdateCompanyStatuses(companyIds: string[]): Promise<void> {
  return batchUpdateCompanyStatuses(companyIds);
}
