// src/services/api/notifications.ts
// Service for CEO notification system - pending offer approvals

import {
  collection,
  query,
  where,
  onSnapshot,
  Unsubscribe,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { Company } from '../../types/crm';

const COMPANIES_COLLECTION = 'entities';

/**
 * Notification item for pending offer approval
 */
export interface PendingOfferNotification {
  id: string;
  companyId: string;
  companyName: string;
  pendingSince: Date;
  isChosen: boolean; // true if idea was recently chosen (for strikethrough)
}

/**
 * Convert Firestore company data to notification item
 */
function convertToNotification(id: string, data: any): PendingOfferNotification {
  return {
    id,
    companyId: id,
    companyName: data.name || 'Unknown Company',
    pendingSince: data.pendingOfferApprovalAt?.toDate
      ? data.pendingOfferApprovalAt.toDate()
      : data.pendingOfferApprovalAt
      ? new Date(data.pendingOfferApprovalAt)
      : new Date(),
    isChosen: data.pendingOfferApproval === false,
  };
}

/**
 * Subscribe to companies with pending offer approvals (real-time)
 * Returns companies where pendingOfferApproval === true
 * @param callback Function to receive notifications array
 * @returns Unsubscribe function
 */
export function subscribeToPendingOfferApprovals(
  callback: (notifications: PendingOfferNotification[]) => void
): Unsubscribe {
  const companiesRef = collection(db, COMPANIES_COLLECTION);
  // Only filter by pendingOfferApproval, filter archived client-side
  // This avoids Firestore index issues with != queries
  const q = query(
    companiesRef,
    where('pendingOfferApproval', '==', true)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications: PendingOfferNotification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Filter out archived companies client-side
        if (data.archived !== true) {
          notifications.push(convertToNotification(doc.id, data));
        }
      });
      // Sort by most recent first
      notifications.sort((a, b) => b.pendingSince.getTime() - a.pendingSince.getTime());
      callback(notifications);
    },
    (error) => {
      console.error('Error listening to pending offer approvals:', error);
      callback([]);
    }
  );
}

/**
 * Subscribe to recently chosen offers (for strikethrough display)
 * Returns companies where:
 * - pendingOfferApproval === false
 * - pendingOfferApprovalAt is within last 24 hours
 * - has offerAnalysis (ideas were generated)
 * @param callback Function to receive notifications array
 * @returns Unsubscribe function
 */
export function subscribeToRecentlyChosenOffers(
  callback: (notifications: PendingOfferNotification[]) => void
): Unsubscribe {
  const companiesRef = collection(db, COMPANIES_COLLECTION);

  // Calculate 24 hours ago
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const q = query(
    companiesRef,
    where('pendingOfferApproval', '==', false),
    where('pendingOfferApprovalAt', '>=', Timestamp.fromDate(twentyFourHoursAgo)),
    orderBy('pendingOfferApprovalAt', 'desc')
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications: PendingOfferNotification[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Only include if there's offer analysis (ideas were generated at some point)
        if (data.offerAnalysis && data.offerAnalysis.ideas?.length > 0) {
          notifications.push(convertToNotification(doc.id, data));
        }
      });
      callback(notifications);
    },
    (error) => {
      console.error('Error listening to recently chosen offers:', error);
      callback([]);
    }
  );
}

/**
 * Get relative time string for display
 * @param date Date to convert
 * @returns Human-readable relative time string
 */
export function getRelativeTimeString(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString();
}
