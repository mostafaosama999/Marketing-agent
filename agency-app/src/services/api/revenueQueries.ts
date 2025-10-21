// Specialized revenue and performance query functions
// Optimized for Client Management dashboard performance

import {
  collection,
  query,
  where,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { ticketWithSubcollectionsService } from './ticketSubcollections';
import { TicketWithSubcollections } from '../../types/ticket';
import { Client, ClientCompensation } from '../../types/client';

// Helper function to get start and end of current month
export const getCurrentMonthRange = () => {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { startDate, endDate };
};

// Helper function to check if a date is within range
export const isDateInRange = (dateValue: any, startDate: Date, endDate: Date): boolean => {
  if (!dateValue) return false;

  let date: Date;
  if (dateValue.toDate && typeof dateValue.toDate === 'function') {
    date = dateValue.toDate();
  } else if (dateValue instanceof Date) {
    date = dateValue;
  } else if (typeof dateValue === 'string') {
    date = new Date(dateValue);
  } else {
    return false;
  }

  return date >= startDate && date <= endDate;
};

// Get tickets with revenue for current month (optimized query)
export const getCurrentMonthRevenueTickets = async (): Promise<TicketWithSubcollections[]> => {
  try {
    const { startDate, endDate } = getCurrentMonthRange();

    // Query tickets with revenue-relevant statuses
    const ticketsQuery = query(
      collection(db, 'tickets'),
      where('status', 'in', ['paid', 'invoiced', 'done'])
    );

    const snapshot = await getDocs(ticketsQuery);
    const ticketIds = snapshot.docs.map(doc => doc.id);

    if (ticketIds.length === 0) return [];

    // Get tickets with financials and timeline data
    const ticketsWithData = await ticketWithSubcollectionsService.getTicketsWithSubcollections(
      ticketIds,
      { content: false, financials: true, timeline: true }
    );

    // Filter by date range using timeline or fallback to updatedAt
    return ticketsWithData.filter(ticket => {
      // Check if ticket has revenue data
      if (!ticket.financials?.actualRevenue) return false;

      // Check if ticket is in revenue status
      if (!['paid', 'invoiced'].includes(ticket.status)) return false;

      // Check date using timeline data or fallback to updatedAt
      const timeline = ticket.timeline?.stateHistory;
      let relevantDate: string | null = null;

      if (timeline) {
        relevantDate = timeline.paid || timeline.invoiced || null;
      }

      if (!relevantDate && ticket.updatedAt) {
        if (ticket.updatedAt.toDate && typeof ticket.updatedAt.toDate === 'function') {
          relevantDate = ticket.updatedAt.toDate().toISOString();
        } else if (ticket.updatedAt instanceof Date) {
          relevantDate = ticket.updatedAt.toISOString();
        } else if (typeof ticket.updatedAt === 'string') {
          relevantDate = ticket.updatedAt;
        }
      }

      if (!relevantDate) return false;

      return isDateInRange(relevantDate, startDate, endDate);
    });
  } catch (error) {
    console.error('Error fetching current month revenue tickets:', error);
    throw error;
  }
};

// Get completed tickets for current month (optimized query)
export const getCurrentMonthCompletedTickets = async (): Promise<TicketWithSubcollections[]> => {
  try {
    const { startDate, endDate } = getCurrentMonthRange();

    // Query tickets with completed statuses
    const ticketsQuery = query(
      collection(db, 'tickets'),
      where('status', 'in', ['done', 'invoiced', 'paid'])
    );

    const snapshot = await getDocs(ticketsQuery);
    const ticketIds = snapshot.docs.map(doc => doc.id);

    if (ticketIds.length === 0) return [];

    // Get tickets with content and timeline data (skip financials for performance)
    const ticketsWithData = await ticketWithSubcollectionsService.getTicketsWithSubcollections(
      ticketIds,
      { content: true, financials: false, timeline: true }
    );

    // Filter by completion date using timeline, content completion, or updatedAt
    return ticketsWithData.filter(ticket => {
      const timeline = ticket.timeline?.stateHistory;
      const contentCompletion = ticket.content?.completedAt;
      let relevantDate: string | null = null;

      // First try timeline data
      if (timeline) {
        relevantDate = timeline.paid || timeline.invoiced || timeline.done || null;
      }

      // Then try content completion
      if (!relevantDate && contentCompletion) {
        relevantDate = contentCompletion;
      }

      // Fallback to updatedAt
      if (!relevantDate && ticket.updatedAt) {
        if (ticket.updatedAt.toDate && typeof ticket.updatedAt.toDate === 'function') {
          relevantDate = ticket.updatedAt.toDate().toISOString();
        } else if (ticket.updatedAt instanceof Date) {
          relevantDate = ticket.updatedAt.toISOString();
        } else if (typeof ticket.updatedAt === 'string') {
          relevantDate = ticket.updatedAt;
        }
      }

      if (!relevantDate) return false;

      return isDateInRange(relevantDate, startDate, endDate);
    });
  } catch (error) {
    console.error('Error fetching current month completed tickets:', error);
    throw error;
  }
};

// Get revenue for a specific client in current month
export const getClientMonthlyRevenue = async (clientName: string): Promise<number> => {
  try {
    const { startDate, endDate } = getCurrentMonthRange();

    // Query tickets for specific client with revenue statuses
    const ticketsQuery = query(
      collection(db, 'tickets'),
      where('clientName', '==', clientName),
      where('status', 'in', ['paid', 'invoiced'])
    );

    const snapshot = await getDocs(ticketsQuery);
    const ticketIds = snapshot.docs.map(doc => doc.id);

    if (ticketIds.length === 0) return 0;

    // Get tickets with financials and timeline data
    const ticketsWithData = await ticketWithSubcollectionsService.getTicketsWithSubcollections(
      ticketIds,
      { content: false, financials: true, timeline: true }
    );

    // Calculate revenue for current month
    return ticketsWithData
      .filter(ticket => {
        // Check if ticket has revenue data
        if (!ticket.financials?.actualRevenue) return false;

        // Check date using timeline data or fallback
        const timeline = ticket.timeline?.stateHistory;
        let relevantDate: string | null = null;

        if (timeline) {
          relevantDate = timeline.paid || timeline.invoiced || null;
        }

        if (!relevantDate && ticket.updatedAt) {
          if (ticket.updatedAt.toDate && typeof ticket.updatedAt.toDate === 'function') {
            relevantDate = ticket.updatedAt.toDate().toISOString();
          } else if (ticket.updatedAt instanceof Date) {
            relevantDate = ticket.updatedAt.toISOString();
          } else if (typeof ticket.updatedAt === 'string') {
            relevantDate = ticket.updatedAt;
          }
        }

        if (!relevantDate) return false;

        return isDateInRange(relevantDate, startDate, endDate);
      })
      .reduce((sum, ticket) => sum + (ticket.financials?.actualRevenue || 0), 0);
  } catch (error) {
    console.error(`Error fetching revenue for client ${clientName}:`, error);
    throw error;
  }
};

// Bulk get revenue for multiple clients (optimized)
// Follows revenue hierarchy from FINANCIAL_DATA_MODEL.md:
// 1. Primary: actualRevenue from financials subcollection
// 2. Fallback: client.compensation.{type}Rate
export const getBulkClientRevenue = async (clientNames: string[]): Promise<Record<string, number>> => {
  try {
    if (clientNames.length === 0) return {};

    const { startDate, endDate } = getCurrentMonthRange();
    const result: Record<string, number> = {};

    // Initialize all clients with 0 revenue
    clientNames.forEach(name => {
      result[name] = 0;
    });

    // Fetch client data for compensation rates
    const clientsSnapshot = await getDocs(collection(db, 'clients'));
    const clientsMap = new Map<string, Client>();
    clientsSnapshot.docs.forEach(doc => {
      const clientData = { id: doc.id, ...doc.data() } as Client;
      clientsMap.set(clientData.name, clientData);
    });

    // Query tickets for all clients with revenue statuses
    const ticketsQuery = query(
      collection(db, 'tickets'),
      where('status', 'in', ['paid', 'invoiced'])
    );

    const snapshot = await getDocs(ticketsQuery);
    const ticketIds = snapshot.docs.map(doc => doc.id);

    if (ticketIds.length === 0) return result;

    // Get tickets with financials and timeline data
    const ticketsWithData = await ticketWithSubcollectionsService.getTicketsWithSubcollections(
      ticketIds,
      { content: false, financials: true, timeline: true }
    );

    // Filter and calculate revenue by client
    ticketsWithData.forEach(ticket => {
      // Check if ticket belongs to one of our clients
      if (!clientNames.includes(ticket.clientName)) return;

      // Check date using timeline data or fallback
      const timeline = ticket.timeline?.stateHistory;
      let relevantDate: string | null = null;

      if (timeline) {
        relevantDate = timeline.paid || timeline.invoiced || null;
      }

      if (!relevantDate && ticket.updatedAt) {
        if (ticket.updatedAt.toDate && typeof ticket.updatedAt.toDate === 'function') {
          relevantDate = ticket.updatedAt.toDate().toISOString();
        } else if (ticket.updatedAt instanceof Date) {
          relevantDate = ticket.updatedAt.toISOString();
        } else if (typeof ticket.updatedAt === 'string') {
          relevantDate = ticket.updatedAt;
        }
      }

      if (!relevantDate) return;

      if (isDateInRange(relevantDate, startDate, endDate)) {
        // Calculate revenue following the hierarchy
        let ticketRevenue = 0;

        // Priority 1: Check financials subcollection for actualRevenue
        if (ticket.financials?.actualRevenue && ticket.financials.actualRevenue > 0) {
          ticketRevenue = ticket.financials.actualRevenue;
        } else {
          // Priority 2: Fall back to client compensation rates
          const client = clientsMap.get(ticket.clientName);
          if (client?.compensation && ticket.type) {
            const typeRateMap: { [key: string]: keyof ClientCompensation } = {
              'blog': 'blogRate',
              'tutorial': 'tutorialRate',
              'case-study': 'caseStudyRate',
              'whitepaper': 'whitepaperRate',
              'social-media': 'socialMediaRate',
              'email': 'emailRate',
              'landing-page': 'landingPageRate',
              'other': 'otherRate'
            };

            const rateField = typeRateMap[ticket.type];
            if (rateField && client.compensation[rateField]) {
              ticketRevenue = Number(client.compensation[rateField]);
            }
          }
        }

        result[ticket.clientName] += ticketRevenue;
      }
    });

    return result;
  } catch (error) {
    console.error('Error fetching bulk client revenue:', error);
    throw error;
  }
};

// Get cached revenue data with simple in-memory cache
let revenueCache: {
  data: TicketWithSubcollections[] | null;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
} = {
  data: null,
  timestamp: 0,
  ttl: 2 * 60 * 1000 // 2 minutes
};

export const getCachedRevenueTickets = async (): Promise<TicketWithSubcollections[]> => {
  const now = Date.now();

  // Check if cache is valid
  if (revenueCache.data && (now - revenueCache.timestamp) < revenueCache.ttl) {
    return revenueCache.data;
  }

  // Fetch fresh data
  const data = await getCurrentMonthRevenueTickets();
  revenueCache = {
    data,
    timestamp: now,
    ttl: revenueCache.ttl
  };

  return data;
};

// Clear cache (useful for testing or when data is updated)
export const clearRevenueCache = () => {
  revenueCache.data = null;
  revenueCache.timestamp = 0;
};