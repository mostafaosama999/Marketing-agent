// Ticket Subcollection Services
// Services for managing TicketContent, TicketFinancials, and TicketTimeline subcollections

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  writeBatch,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import {
  TicketContent,
  TicketFinancials,
  TicketTimeline,
  TicketStatusChange,
  TicketStatus,
  TicketWithSubcollections,
  Ticket
} from '../../types/ticket';

// =====================================
// TICKET CONTENT SERVICE
// =====================================
export const ticketContentService = {
  // Get content for a specific ticket
  getContent: async (ticketId: string): Promise<TicketContent | null> => {
    try {
      const contentDoc = await getDoc(doc(db, 'tickets', ticketId, 'content', ticketId));
      if (contentDoc.exists()) {
        return { id: contentDoc.id, ...contentDoc.data() } as TicketContent;
      }
      return null;
    } catch (error) {
      console.error('Error fetching ticket content:', error);
      throw error;
    }
  },

  // Subscribe to content changes for a specific ticket
  subscribeToContent: (ticketId: string, callback: (content: TicketContent | null) => void) => {
    return onSnapshot(doc(db, 'tickets', ticketId, 'content', ticketId), (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as TicketContent);
      } else {
        callback(null);
      }
    });
  },

  // Create or update content for a ticket
  setContent: async (ticketId: string, content: Omit<TicketContent, 'id'>): Promise<void> => {
    try {
      await setDoc(doc(db, 'tickets', ticketId, 'content', ticketId), content);
    } catch (error) {
      console.error('Error setting ticket content:', error);
      throw error;
    }
  },

  // Update specific content fields
  updateContent: async (ticketId: string, updates: Partial<TicketContent>): Promise<void> => {
    try {
      // Use setDoc with merge to create document if it doesn't exist
      await setDoc(doc(db, 'tickets', ticketId, 'content', ticketId), {
        id: ticketId,
        createdAt: Timestamp.now(),
        ...updates,
        updatedAt: Timestamp.now()
      }, { merge: true });
    } catch (error) {
      console.error('Error updating ticket content:', error);
      throw error;
    }
  },

  // Submit content with word count calculation
  submitContent: async (ticketId: string, htmlContent: string): Promise<void> => {
    try {
      // Calculate word count from HTML content
      const textContent = htmlContent.replace(/<[^>]*>/g, '').trim();
      const wordCount = textContent.split(/\s+/).filter(word => word.length > 0).length;
      await ticketContentService.updateContent(ticketId, {
        content: htmlContent,
        wordCount: wordCount,
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error submitting content:', error);
      throw error;
    }
  },

  // Delete content for a ticket
  deleteContent: async (ticketId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'tickets', ticketId, 'content', ticketId));
    } catch (error) {
      console.error('Error deleting ticket content:', error);
      throw error;
    }
  }
};

// =====================================
// TICKET FINANCIALS SERVICE
// =====================================
export const ticketFinancialsService = {
  // Get financials for a specific ticket
  getFinancials: async (ticketId: string): Promise<TicketFinancials | null> => {
    try {
      const financialsDoc = await getDoc(doc(db, 'tickets', ticketId, 'financials', ticketId));
      if (financialsDoc.exists()) {
        return { id: financialsDoc.id, ...financialsDoc.data() } as TicketFinancials;
      }
      return null;
    } catch (error) {
      console.error('Error fetching ticket financials:', error);
      throw error;
    }
  },

  // Subscribe to financials changes for a specific ticket
  subscribeToFinancials: (ticketId: string, callback: (financials: TicketFinancials | null) => void) => {
    return onSnapshot(doc(db, 'tickets', ticketId, 'financials', ticketId), (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as TicketFinancials);
      } else {
        callback(null);
      }
    });
  },

  // Create or update financials for a ticket
  setFinancials: async (ticketId: string, financials: Omit<TicketFinancials, 'id'>): Promise<void> => {
    try {
      await setDoc(doc(db, 'tickets', ticketId, 'financials', ticketId), financials);
    } catch (error) {
      console.error('Error setting ticket financials:', error);
      throw error;
    }
  },

  // Update specific financial fields
  updateFinancials: async (ticketId: string, updates: Partial<TicketFinancials>): Promise<void> => {
    try {
      await updateDoc(doc(db, 'tickets', ticketId, 'financials', ticketId), {
        ...updates,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating ticket financials:', error);
      throw error;
    }
  },

  // Set cost breakdown with calculated totals
  setCostBreakdown: async (
    ticketId: string,
    costData: {
      assigneeHours?: number;
      reviewerHours?: number;
      totalCost: number;
      costBreakdown: {
        assigneeCost: number;
        reviewerCost: number;
        assigneeRate: number | string;
        reviewerRate: number | string;
      };
    }
  ): Promise<void> => {
    try {
      const financialData: Partial<TicketFinancials> = {
        totalCost: costData.totalCost,
        costBreakdown: costData.costBreakdown,
        updatedAt: Timestamp.now()
      };

      if (costData.assigneeHours !== undefined) {
        financialData.assigneeHours = costData.assigneeHours;
      }

      if (costData.reviewerHours !== undefined) {
        financialData.reviewerHours = costData.reviewerHours;
      }

      // Use setDoc to create the document if it doesn't exist, or update if it does
      await setDoc(doc(db, 'tickets', ticketId, 'financials', ticketId), {
        id: ticketId,
        createdAt: Timestamp.now(),
        ...financialData
      }, { merge: true });
    } catch (error) {
      console.error('Error setting cost breakdown:', error);
      throw error;
    }
  },

  // Delete financials for a ticket
  deleteFinancials: async (ticketId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'tickets', ticketId, 'financials', ticketId));
    } catch (error) {
      console.error('Error deleting ticket financials:', error);
      throw error;
    }
  }
};

// =====================================
// TICKET TIMELINE SERVICE
// =====================================
export const ticketTimelineService = {
  // Get timeline for a specific ticket
  getTimeline: async (ticketId: string): Promise<TicketTimeline | null> => {
    try {
      const timelineDoc = await getDoc(doc(db, 'tickets', ticketId, 'timeline', ticketId));
      if (timelineDoc.exists()) {
        return { id: timelineDoc.id, ...timelineDoc.data() } as TicketTimeline;
      }
      return null;
    } catch (error) {
      console.error('Error fetching ticket timeline:', error);
      throw error;
    }
  },

  // Subscribe to timeline changes for a specific ticket
  subscribeToTimeline: (ticketId: string, callback: (timeline: TicketTimeline | null) => void) => {
    return onSnapshot(doc(db, 'tickets', ticketId, 'timeline', ticketId), (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as TicketTimeline);
      } else {
        callback(null);
      }
    });
  },

  // Initialize timeline when ticket is created
  initializeTimeline: async (ticketId: string, initialStatus: TicketStatus, createdBy?: string): Promise<void> => {
    try {
      const now = new Date().toISOString();

      const initialTimeline: Omit<TicketTimeline, 'id'> = {
        ticketId,
        stateHistory: {
          [initialStatus]: now
        },
        stateDurations: {
          [initialStatus]: 0 // Start with 0 cumulative time
        },
        statusChanges: [{
          id: `${ticketId}-${Date.now()}`,
          fromStatus: null,
          toStatus: initialStatus,
          changedBy: createdBy || 'system',
          changedAt: now,
          notes: 'Ticket created',
          automaticChange: !createdBy
        }],
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      };

      await setDoc(doc(db, 'tickets', ticketId, 'timeline', ticketId), initialTimeline);
    } catch (error) {
      console.error('Error initializing timeline:', error);
      throw error;
    }
  },

  // Update ticket status with full timeline tracking
  updateTicketStatus: async (
    ticketId: string,
    newStatus: TicketStatus,
    changedBy: string,
    notes?: string
  ): Promise<void> => {
    try {
      const now = new Date().toISOString();
      const timeline = await ticketTimelineService.getTimeline(ticketId);

      if (!timeline) {
        // Initialize timeline if it doesn't exist
        await ticketTimelineService.initializeTimeline(ticketId, newStatus);
        return;
      }

      // Determine the current status from state history
      const currentStatus = Object.keys(timeline.stateHistory)
        .filter(status => timeline.stateHistory[status as TicketStatus])
        .sort((a, b) => {
          const timeA = new Date(timeline.stateHistory[a as TicketStatus]!).getTime();
          const timeB = new Date(timeline.stateHistory[b as TicketStatus]!).getTime();
          return timeB - timeA; // Most recent first
        })[0] as TicketStatus;

      // Calculate time spent in current status (if changing from a different status)
      let updatedStateDurations = { ...timeline.stateDurations };
      if (currentStatus && currentStatus !== newStatus) {
        const currentStateStartTime = new Date(timeline.stateHistory[currentStatus]!);
        const timeSpentInCurrentState = Math.ceil((new Date().getTime() - currentStateStartTime.getTime()) / (1000 * 60 * 60 * 24));


        // Add time spent to cumulative duration for the current status
        updatedStateDurations[currentStatus] = (updatedStateDurations[currentStatus] || 0) + timeSpentInCurrentState;

      }

      // Initialize duration for new status if it doesn't exist
      if (!updatedStateDurations[newStatus]) {
        updatedStateDurations[newStatus] = 0;
      }

      // Create new status change record
      const statusChange: TicketStatusChange = {
        id: `${ticketId}-${Date.now()}`,
        fromStatus: currentStatus || null,
        toStatus: newStatus,
        changedBy,
        changedAt: now,
        notes,
        automaticChange: false
      };

      // Update state history and add status change
      const updatedStateHistory = {
        ...timeline.stateHistory,
        [newStatus]: now
      };


      const updatedStatusChanges = [...(timeline.statusChanges || []), statusChange];

      await updateDoc(doc(db, 'tickets', ticketId, 'timeline', ticketId), {
        stateHistory: updatedStateHistory,
        stateDurations: updatedStateDurations,
        statusChanges: updatedStatusChanges,
        updatedAt: Timestamp.now()
      });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  },

  // Delete timeline for a ticket
  deleteTimeline: async (ticketId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, 'tickets', ticketId, 'timeline', ticketId));
    } catch (error) {
      console.error('Error deleting ticket timeline:', error);
      throw error;
    }
  }
};

// =====================================
// COMPLETE TICKET WITH SUBCOLLECTIONS SERVICE
// =====================================
export const ticketWithSubcollectionsService = {
  // Get ticket with all subcollection data
  getTicketWithSubcollections: async (
    ticketId: string,
    options: {
      content?: boolean;
      financials?: boolean;
      timeline?: boolean;
    } = { content: true, financials: true, timeline: true }
  ): Promise<TicketWithSubcollections | null> => {
    try {
      // Get main ticket document
      const ticketDoc = await getDoc(doc(db, 'tickets', ticketId));
      if (!ticketDoc.exists()) return null;

      const ticket = { id: ticketDoc.id, ...ticketDoc.data() } as Ticket;
      const result: TicketWithSubcollections = { ...ticket, content: undefined };

      // Get subcollections based on options
      if (options.content) {
        result.content = await ticketContentService.getContent(ticketId) || undefined;
      }
      if (options.financials) {
        result.financials = await ticketFinancialsService.getFinancials(ticketId) || undefined;
      }
      if (options.timeline) {
        result.timeline = await ticketTimelineService.getTimeline(ticketId) || undefined;
      }

      return result;
    } catch (error) {
      console.error('Error fetching ticket with subcollections:', error);
      throw error;
    }
  },

  // Subscribe to ticket with all subcollections
  subscribeToTicketWithSubcollections: (
    ticketId: string,
    callback: (ticket: TicketWithSubcollections | null) => void,
    options: {
      content?: boolean;
      financials?: boolean;
      timeline?: boolean;
    } = { content: true, financials: true, timeline: true }
  ) => {
    const ticket: Partial<TicketWithSubcollections> = {};
    let initialized = false;

    const checkAndCallback = () => {
      if (initialized && ticket.id) {
        callback(ticket as TicketWithSubcollections);
      }
    };

    // Subscribe to main ticket
    const unsubscribeTicket = onSnapshot(doc(db, 'tickets', ticketId), (doc) => {
      if (doc.exists()) {
        Object.assign(ticket, { id: doc.id, ...doc.data() });
        if (!initialized) initialized = true;
        checkAndCallback();
      } else {
        callback(null);
      }
    });

    const unsubscribers = [unsubscribeTicket];

    // Subscribe to subcollections based on options
    if (options.content) {
      const unsubContent = ticketContentService.subscribeToContent(ticketId, (content) => {
        ticket.content = content || undefined;
        checkAndCallback();
      });
      unsubscribers.push(unsubContent);
    }

    if (options.financials) {
      const unsubFinancials = ticketFinancialsService.subscribeToFinancials(ticketId, (financials) => {
        ticket.financials = financials || undefined;
        checkAndCallback();
      });
      unsubscribers.push(unsubFinancials);
    }

    if (options.timeline) {
      const unsubTimeline = ticketTimelineService.subscribeToTimeline(ticketId, (timeline) => {
        ticket.timeline = timeline || undefined;
        checkAndCallback();
      });
      unsubscribers.push(unsubTimeline);
    }

    // Return cleanup function
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  },

  // Delete complete ticket with all subcollections
  deleteCompleteTicket: async (ticketId: string): Promise<void> => {
    try {
      const batch = writeBatch(db);

      // Delete main ticket document
      batch.delete(doc(db, 'tickets', ticketId));

      // Delete all subcollections
      batch.delete(doc(db, 'tickets', ticketId, 'content', ticketId));
      batch.delete(doc(db, 'tickets', ticketId, 'financials', ticketId));
      batch.delete(doc(db, 'tickets', ticketId, 'timeline', ticketId));

      await batch.commit();
    } catch (error) {
      console.error('Error deleting complete ticket:', error);
      throw error;
    }
  },

  // Get multiple tickets with subcollections (optimized with batch operations)
  getTicketsWithSubcollections: async (
    ticketIds: string[],
    options: {
      content?: boolean;
      financials?: boolean;
      timeline?: boolean;
    } = { content: true, financials: true, timeline: true }
  ): Promise<TicketWithSubcollections[]> => {
    try {
      if (ticketIds.length === 0) return [];

      const results: TicketWithSubcollections[] = [];

      // Batch size for Firestore operations (max 10 for `in` queries, but we'll use smaller batches for reliability)
      const batchSize = 10;
      const batches = [];

      for (let i = 0; i < ticketIds.length; i += batchSize) {
        batches.push(ticketIds.slice(i, i + batchSize));
      }

      // Process each batch
      for (const batchIds of batches) {
        // Get main tickets in parallel
        const ticketPromises = batchIds.map(ticketId => getDoc(doc(db, 'tickets', ticketId)));
        const ticketDocs = await Promise.all(ticketPromises);

        // Create base ticket objects
        const batchTickets: TicketWithSubcollections[] = [];
        ticketDocs.forEach((ticketDoc) => {
          if (ticketDoc.exists()) {
            batchTickets.push({ id: ticketDoc.id, ...ticketDoc.data() } as TicketWithSubcollections);
          }
        });

        // Get subcollections in parallel for this batch
        const subcollectionPromises: Promise<any>[] = [];

        if (options.content) {
          subcollectionPromises.push(
            Promise.all(batchIds.map(id => ticketContentService.getContent(id)))
              .then(contentData => ({ type: 'content', data: contentData }))
          );
        }

        if (options.financials) {
          subcollectionPromises.push(
            Promise.all(batchIds.map(id => ticketFinancialsService.getFinancials(id)))
              .then(financialData => ({ type: 'financials', data: financialData }))
          );
        }

        if (options.timeline) {
          subcollectionPromises.push(
            Promise.all(batchIds.map(id => ticketTimelineService.getTimeline(id)))
              .then(timelineData => ({ type: 'timeline', data: timelineData }))
          );
        }

        // Wait for all subcollection data
        const subcollectionResults = await Promise.all(subcollectionPromises);

        // Map subcollection data back to tickets
        subcollectionResults.forEach(result => {
          result.data.forEach((data: any, index: number) => {
            const ticketIndex = batchTickets.findIndex(t => t.id === batchIds[index]);
            if (ticketIndex !== -1 && data) {
              if (result.type === 'content') {
                batchTickets[ticketIndex].content = data;
              } else if (result.type === 'financials') {
                batchTickets[ticketIndex].financials = data;
              } else if (result.type === 'timeline') {
                batchTickets[ticketIndex].timeline = data;
              }
            }
          });
        });

        results.push(...batchTickets);
      }

      return results;
    } catch (error) {
      console.error('Error fetching tickets with subcollections:', error);
      throw error;
    }
  },

  // New optimized method for revenue-specific queries
  getTicketsWithRevenue: async (
    filters: {
      statuses?: string[];
      clientNames?: string[];
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<TicketWithSubcollections[]> => {
    try {
      // Build query constraints
      const constraints = [];

      // Add status filter if provided
      if (filters.statuses && filters.statuses.length > 0) {
        constraints.push(where('status', 'in', filters.statuses));
      }

      // Add date range filter if provided
      if (filters.startDate) {
        constraints.push(where('updatedAt', '>=', Timestamp.fromDate(filters.startDate)));
      }
      if (filters.endDate) {
        constraints.push(where('updatedAt', '<=', Timestamp.fromDate(filters.endDate)));
      }

      // Build final query
      const ticketsQuery = constraints.length > 0
        ? query(collection(db, 'tickets'), ...constraints)
        : collection(db, 'tickets');

      // Get tickets that match filters
      const snapshot = await getDocs(ticketsQuery);
      const ticketIds = snapshot.docs.map(doc => doc.id);

      if (ticketIds.length === 0) return [];

      // Filter by client names if provided (done client-side since we can't have multiple array-contains)
      let filteredTicketIds = ticketIds;
      if (filters.clientNames && filters.clientNames.length > 0) {
        const ticketsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Ticket));
        filteredTicketIds = ticketsData
          .filter(ticket => filters.clientNames!.includes(ticket.clientName))
          .map(ticket => ticket.id);
      }

      // Get tickets with only financials and timeline (skip content for performance)
      return await ticketWithSubcollectionsService.getTicketsWithSubcollections(
        filteredTicketIds,
        { content: false, financials: true, timeline: true }
      );
    } catch (error) {
      console.error('Error fetching tickets with revenue:', error);
      throw error;
    }
  }
};