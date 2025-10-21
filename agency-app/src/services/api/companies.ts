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
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { Company, CompanyFormData } from '../../types/crm';

const COMPANIES_COLLECTION = 'companies';
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
  };
}

/**
 * Get or create a company by name
 * Performs case-insensitive lookup
 */
export async function getOrCreateCompany(companyName: string): Promise<Company> {
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

    if (existingCompany) {
      return existingCompany;
    }

    // Company doesn't exist, create it
    const docRef = await addDoc(companiesRef, {
      name: normalizedName,
      customFields: {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: docRef.id,
      name: normalizedName,
      customFields: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  } catch (error) {
    console.error('Error getting or creating company:', error);
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
    const docRef = await addDoc(companiesRef, {
      ...companyData,
      customFields: companyData.customFields || {},
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (error) {
    console.error('Error creating company:', error);
    throw error;
  }
}

/**
 * Update a company
 */
export async function updateCompany(
  companyId: string,
  companyData: Partial<CompanyFormData>
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
  try {
    // Safety check: ensure no leads reference this company
    const leadCount = await countLeadsForCompany(companyId);
    if (leadCount > 0) {
      console.warn(
        `Cannot delete company ${companyId}: ${leadCount} leads still reference it`
      );
      return;
    }

    const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
    await deleteDoc(companyRef);
  } catch (error) {
    console.error('Error deleting company:', error);
    throw error;
  }
}

/**
 * Get companies with lead counts
 */
export async function getCompaniesWithLeadCounts(): Promise<
  Array<Company & { leadCount: number }>
> {
  try {
    const companies = await getCompanies();
    const companiesWithCounts = await Promise.all(
      companies.map(async (company) => {
        const leadCount = await countLeadsForCompany(company.id);
        return { ...company, leadCount };
      })
    );

    return companiesWithCounts;
  } catch (error) {
    console.error('Error fetching companies with lead counts:', error);
    return [];
  }
}
