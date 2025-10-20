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
  where,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../app/config/firebase';
import { Company, CompanyFormData } from '../app/types/crm';

const COMPANIES_COLLECTION = 'companies';

/**
 * Convert Firestore document to Company object
 */
function convertToCompany(id: string, data: any): Company {
  return {
    id,
    name: data.name || '',
    website: data.website || '',
    industry: data.industry || '',
    description: data.description || '',
    customFields: data.customFields || {},
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
    blogQualified: data.blogQualified,
    blogQualificationData: data.blogQualificationData,
    blogQualifiedAt: data.blogQualifiedAt?.toDate(),
    totalApiCosts: data.totalApiCosts,
    lastApiCostUpdate: data.lastApiCostUpdate?.toDate(),
    hasGeneratedIdeas: data.hasGeneratedIdeas,
    lastIdeaGeneratedAt: data.lastIdeaGeneratedAt?.toDate(),
  };
}

/**
 * Subscribe to all companies with real-time updates
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
 * Get all companies (one-time fetch)
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
 * Get a single company by ID
 */
export async function getCompanyById(companyId: string): Promise<Company | null> {
  try {
    const companiesRef = collection(db, COMPANIES_COLLECTION);
    const q = query(companiesRef, where('__name__', '==', companyId));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return convertToCompany(doc.id, doc.data());
  } catch (error) {
    console.error('Error fetching company by ID:', error);
    return null;
  }
}

/**
 * Find company by name (case-insensitive)
 */
export async function findCompanyByName(name: string): Promise<Company | null> {
  try {
    const companiesRef = collection(db, COMPANIES_COLLECTION);
    const snapshot = await getDocs(companiesRef);

    const normalizedName = name.trim().toLowerCase();

    for (const docSnapshot of snapshot.docs) {
      const data = docSnapshot.data();
      if (data.name && data.name.toLowerCase() === normalizedName) {
        return convertToCompany(docSnapshot.id, data);
      }
    }

    return null;
  } catch (error) {
    console.error('Error finding company by name:', error);
    return null;
  }
}

/**
 * Create a new company
 */
export async function createCompany(companyData: CompanyFormData): Promise<string> {
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
 * Update an existing company
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
 * Delete a company and all its associated leads (cascade delete)
 */
export async function deleteCompany(companyId: string): Promise<void> {
  try {
    // First, find all leads associated with this company
    const leadsRef = collection(db, 'leads');
    const leadsQuery = query(leadsRef, where('companyId', '==', companyId));
    const leadsSnapshot = await getDocs(leadsQuery);

    // Delete all associated leads
    const deletePromises = leadsSnapshot.docs.map((leadDoc) =>
      deleteDoc(doc(db, 'leads', leadDoc.id))
    );
    await Promise.all(deletePromises);

    console.log(`Deleted ${leadsSnapshot.size} leads associated with company ${companyId}`);

    // Then delete the company
    const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
    await deleteDoc(companyRef);
  } catch (error) {
    console.error('Error deleting company:', error);
    throw error;
  }
}

/**
 * Get or create company by name
 * Returns existing company if found (case-insensitive), otherwise creates new one
 */
export async function getOrCreateCompany(companyName: string): Promise<Company> {
  // Try to find existing company
  const existing = await findCompanyByName(companyName);

  if (existing) {
    return existing;
  }

  // Create new company
  const companyId = await createCompany({
    name: companyName.trim(),
  });

  // Fetch the newly created company
  const newCompany = await getCompanyById(companyId);

  if (!newCompany) {
    throw new Error('Failed to create company');
  }

  return newCompany;
}
