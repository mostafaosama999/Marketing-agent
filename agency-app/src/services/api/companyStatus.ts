// Company Status Calculation and Management Service
// Handles automatic status calculation based on lead statuses

import { db } from '../firebase/firestore';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { LeadStatus } from '../../types/lead';
import { Company } from '../../types/crm';

/**
 * Calculate the majority status for a company based on its leads
 * Logic: Count leads per status, return the most common status
 * Tie-breaker: If multiple statuses have same count, use most advanced status
 *
 * Status advancement order: new_lead < qualified < contacted < follow_up < nurture < won/lost
 */
export async function calculateCompanyStatus(companyId: string): Promise<LeadStatus> {
  try {
    // Query all leads for this company (filter archived manually to avoid Firestore query issue)
    const leadsRef = collection(db, 'leads');
    const q = query(
      leadsRef,
      where('companyId', '==', companyId)
    );

    const snapshot = await getDocs(q);

    // Filter out archived leads manually (archived field might be undefined on many leads)
    const activeLeads = snapshot.docs.filter(doc => doc.data().archived !== true);

    // If no active leads, default to 'new_lead'
    if (activeLeads.length === 0) {
      return 'new_lead';
    }

    // Count leads per status
    const statusCounts: Record<LeadStatus, number> = {
      new_lead: 0,
      qualified: 0,
      contacted: 0,
      follow_up: 0,
      nurture: 0,
      won: 0,
      lost: 0,
      previous_client: 0,
      existing_client: 0,
    };

    activeLeads.forEach((doc) => {
      const lead = doc.data();
      const status = lead.status as LeadStatus;
      if (status && status in statusCounts) {
        statusCounts[status]++;
      }
    });

    // Find the status(es) with the highest count
    let maxCount = 0;
    let majorityStatuses: LeadStatus[] = [];

    Object.entries(statusCounts).forEach(([status, count]) => {
      if (count > maxCount) {
        maxCount = count;
        majorityStatuses = [status as LeadStatus];
      } else if (count === maxCount && count > 0) {
        majorityStatuses.push(status as LeadStatus);
      }
    });

    // If only one majority status, return it
    if (majorityStatuses.length === 1) {
      return majorityStatuses[0];
    }

    // Tie-breaker: Return most advanced status
    return getMostAdvancedStatus(majorityStatuses);
  } catch (error) {
    console.error('Error calculating company status:', error);
    throw error;
  }
}

/**
 * Status advancement order for tie-breaking
 * Higher value = more advanced
 */
const STATUS_ADVANCEMENT_ORDER: Record<LeadStatus, number> = {
  new_lead: 0,
  qualified: 1,
  contacted: 2,
  follow_up: 3,
  nurture: 4,
  won: 5,
  lost: 5, // Won and Lost are considered equally advanced (terminal states)
  previous_client: 6, // Client statuses are most advanced (post-conversion)
  existing_client: 6,
};

/**
 * Get the most advanced status from a list of statuses
 */
function getMostAdvancedStatus(statuses: LeadStatus[]): LeadStatus {
  return statuses.reduce((mostAdvanced, current) => {
    return STATUS_ADVANCEMENT_ORDER[current] > STATUS_ADVANCEMENT_ORDER[mostAdvanced]
      ? current
      : mostAdvanced;
  });
}

/**
 * Update company status based on its leads
 * Respects manual lock - only updates if statusLockedManually is false
 *
 * @param companyId - ID of the company to update
 * @param forceUpdate - If true, updates even if manually locked (used for unlock operation)
 * @returns The new status, or null if update was skipped due to lock
 */
export async function updateCompanyStatusFromLeads(
  companyId: string,
  forceUpdate: boolean = false
): Promise<LeadStatus | null> {
  try {
    // First, get the company to check if it's locked
    const companyRef = doc(db, 'entities', companyId);
    const companyDoc = await getDocs(query(collection(db, 'entities'), where('__name__', '==', companyId)));

    if (companyDoc.empty) {
      console.warn(`Company ${companyId} not found`);
      return null;
    }

    const companyData = companyDoc.docs[0].data() as Company;

    // Skip update if manually locked (unless force update)
    if (!forceUpdate && companyData.statusLockedManually === true) {
      console.log(`Company ${companyId} status is manually locked, skipping auto-update`);
      return null;
    }

    // Calculate new status
    const newStatus = await calculateCompanyStatus(companyId);

    // Only update if status actually changed (avoid unnecessary writes)
    if (companyData.status === newStatus) {
      return newStatus;
    }

    // Update company status
    await updateDoc(companyRef, {
      status: newStatus,
      statusLastUpdatedAt: Timestamp.now(),
      statusLastUpdatedBy: 'system', // System-triggered update
      updatedAt: Timestamp.now(),
    });

    console.log(`Updated company ${companyId} status from ${companyData.status} to ${newStatus}`);
    return newStatus;
  } catch (error) {
    console.error('Error updating company status from leads:', error);
    throw error;
  }
}

/**
 * Manually set company status (with lock)
 * This locks the status so it won't auto-update from leads
 *
 * @param companyId - ID of the company
 * @param status - New status to set
 * @param userId - ID of the user making the change
 */
export async function setCompanyStatusManually(
  companyId: string,
  status: LeadStatus,
  userId: string
): Promise<void> {
  try {
    const companyRef = doc(db, 'entities', companyId);

    await updateDoc(companyRef, {
      status,
      statusLockedManually: true,
      statusLastUpdatedAt: Timestamp.now(),
      statusLastUpdatedBy: userId,
      updatedAt: Timestamp.now(),
    });

    console.log(`Manually set company ${companyId} status to ${status} by user ${userId}`);
  } catch (error) {
    console.error('Error setting company status manually:', error);
    throw error;
  }
}

/**
 * Unlock company status and immediately recalculate from leads
 * This re-enables auto-sync with lead statuses
 *
 * @param companyId - ID of the company
 * @param userId - ID of the user unlocking
 */
export async function unlockCompanyStatus(
  companyId: string,
  userId: string
): Promise<LeadStatus> {
  try {
    const companyRef = doc(db, 'entities', companyId);

    // First unlock
    await updateDoc(companyRef, {
      statusLockedManually: false,
      statusLastUpdatedBy: userId,
      updatedAt: Timestamp.now(),
    });

    // Then force recalculate (even though it's now unlocked, we use forceUpdate to ensure it runs)
    const newStatus = await updateCompanyStatusFromLeads(companyId, true);

    console.log(`Unlocked company ${companyId} status, recalculated to ${newStatus}`);
    return newStatus || 'new_lead';
  } catch (error) {
    console.error('Error unlocking company status:', error);
    throw error;
  }
}

/**
 * Batch update company statuses for multiple companies
 * Useful after bulk lead operations
 *
 * @param companyIds - Array of company IDs to update
 */
export async function batchUpdateCompanyStatuses(companyIds: string[]): Promise<void> {
  try {
    // Process in chunks to avoid overwhelming Firestore
    const CHUNK_SIZE = 10;

    for (let i = 0; i < companyIds.length; i += CHUNK_SIZE) {
      const chunk = companyIds.slice(i, i + CHUNK_SIZE);

      // Update all companies in this chunk in parallel
      await Promise.all(
        chunk.map(companyId => updateCompanyStatusFromLeads(companyId))
      );
    }

    console.log(`Batch updated ${companyIds.length} company statuses`);
  } catch (error) {
    console.error('Error batch updating company statuses:', error);
    throw error;
  }
}

/**
 * Get suggested status for a company (what it would be if auto-synced)
 * Useful for showing users what the status would be if unlocked
 *
 * @param companyId - ID of the company
 */
export async function getSuggestedCompanyStatus(companyId: string): Promise<LeadStatus> {
  return calculateCompanyStatus(companyId);
}
