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
    customFields: data.customFields || {},
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    totalApiCosts: data.totalApiCosts,
    lastApiCostUpdate: data.lastApiCostUpdate?.toDate(),
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
 * Get all companies
 */
export async function getCompanies(): Promise<Company[]> {
  try {
    const companiesRef = collection(db, COMPANIES_COLLECTION);
    const q = query(companiesRef, orderBy('name', 'asc'));
    const snapshot = await getDocs(q);

    const companies: Company[] = [];
    snapshot.forEach((doc) => {
      companies.push(convertToCompany(doc.id, doc.data()));
    });

    return companies;
  } catch (error) {
    console.error('Error fetching companies:', error);
    return [];
  }
}

/**
 * Subscribe to companies with real-time updates
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
        companies.push(convertToCompany(doc.id, doc.data()));
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
