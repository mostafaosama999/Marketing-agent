// src/services/api/deduplicationService.ts
// Service for detecting duplicate leads during import

import { collection, getDocs, query } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { Lead } from '../../types/lead';

const LEADS_COLLECTION = 'leads';

/**
 * Generate a unique key for a lead based on name and company
 * Used for duplicate detection
 */
export function generateLeadKey(name: string, company: string): string {
  const normalizedName = name.trim().toLowerCase();
  const normalizedCompany = company.trim().toLowerCase();
  return `${normalizedName}|${normalizedCompany}`;
}

/**
 * Check if a lead is a duplicate based on name and company
 * @param name Lead name
 * @param company Company name
 * @param existingLeads Optional array of existing leads to check against (for batch processing)
 * @returns Object with isDuplicate flag and matching lead if found
 */
export async function checkDuplicate(
  name: string,
  company: string,
  existingLeads?: Lead[]
): Promise<{ isDuplicate: boolean; matchingLead?: Lead }> {
  try {
    const searchKey = generateLeadKey(name, company);

    // If existing leads array provided, check against it first (batch import optimization)
    if (existingLeads) {
      const match = existingLeads.find(
        (lead) => generateLeadKey(lead.name, lead.company) === searchKey
      );
      if (match) {
        return { isDuplicate: true, matchingLead: match };
      }
    }

    // Check against database
    const leadsRef = collection(db, LEADS_COLLECTION);
    const snapshot = await getDocs(query(leadsRef));

    let matchingLead: Lead | undefined;
    snapshot.forEach((doc) => {
      const data = doc.data();
      const leadKey = generateLeadKey(data.name, data.company);
      if (leadKey === searchKey) {
        matchingLead = {
          id: doc.id,
          name: data.name,
          email: data.email,
          phone: data.phone,
          company: data.company,
          companyId: data.companyId,
          companyName: data.companyName,
          status: data.status,
          customFields: data.customFields || {},
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          stateHistory: data.stateHistory,
          stateDurations: data.stateDurations,
        };
      }
    });

    return {
      isDuplicate: !!matchingLead,
      matchingLead,
    };
  } catch (error) {
    console.error('Error checking for duplicate:', error);
    // On error, default to not duplicate to avoid blocking imports
    return { isDuplicate: false };
  }
}

/**
 * Fetch all existing leads from database once for fast duplicate checking
 * Returns a Map for O(1) lookup performance
 */
export async function getAllLeadsMap(): Promise<Map<string, Lead>> {
  try {
    const leadsRef = collection(db, LEADS_COLLECTION);
    const snapshot = await getDocs(query(leadsRef));

    const leadsMap = new Map<string, Lead>();
    snapshot.forEach((doc) => {
      const data = doc.data();
      const leadKey = generateLeadKey(data.name, data.company);
      const lead: Lead = {
        id: doc.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        company: data.company,
        companyId: data.companyId,
        companyName: data.companyName,
        status: data.status,
        customFields: data.customFields || {},
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        stateHistory: data.stateHistory,
        stateDurations: data.stateDurations,
        apolloEnriched: data.apolloEnriched,
        lastEnrichedAt: data.lastEnrichedAt?.toDate(),
        totalApiCosts: data.totalApiCosts,
        lastApiCostUpdate: data.lastApiCostUpdate?.toDate(),
        outreach: data.outreach,
      };
      leadsMap.set(leadKey, lead);
    });

    return leadsMap;
  } catch (error) {
    console.error('Error fetching all leads:', error);
    return new Map();
  }
}

/**
 * Fast duplicate check using pre-fetched leads map
 */
export function checkDuplicateFromMap(
  name: string,
  company: string,
  leadsMap: Map<string, Lead>,
  batchLeads?: Array<{ name: string; company: string }>
): { isDuplicate: boolean; matchingLead?: Lead } {
  const searchKey = generateLeadKey(name, company);

  // Check batch leads first
  if (batchLeads) {
    const match = batchLeads.find(
      (lead) => generateLeadKey(lead.name, lead.company) === searchKey
    );
    if (match) {
      return { isDuplicate: true };
    }
  }

  // Check against pre-fetched map
  const matchingLead = leadsMap.get(searchKey);
  return {
    isDuplicate: !!matchingLead,
    matchingLead,
  };
}

/**
 * Deduplicate an array of lead data
 * Returns array with duplicates filtered out
 */
export function deduplicateBatch(
  leadDataArray: Array<{ name: string; company: string; [key: string]: any }>
): Array<{ name: string; company: string; [key: string]: any }> {
  const seen = new Set<string>();
  const deduplicated: Array<{ name: string; company: string; [key: string]: any }> = [];

  for (const leadData of leadDataArray) {
    const key = generateLeadKey(leadData.name, leadData.company);
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(leadData);
    }
  }

  return deduplicated;
}
