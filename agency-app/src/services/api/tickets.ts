// src/services/api/tickets.ts
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  getDoc,
  getDocs,
  query,
  where,
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db } from '../../services/firebase/firestore';
import { Ticket, TicketStatus } from '../../types';
import {
  ticketTimelineService,
  ticketContentService,
  ticketFinancialsService,
  ticketWithSubcollectionsService
} from './ticketSubcollections';

export const ticketsService = {
  // Subscribe to all tickets (core fields only)
  subscribeToTickets: (callback: (tickets: Ticket[]) => void) => {
    return onSnapshot(collection(db, 'tickets'), (snapshot) => {
      const tickets: Ticket[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Ticket));
      callback(tickets);
    });
  },

  // Get single ticket (core fields only)
  getTicket: async (ticketId: string): Promise<Ticket | null> => {
    try {
      const ticketDoc = await getDoc(doc(db, 'tickets', ticketId));
      if (ticketDoc.exists()) {
        return { id: ticketDoc.id, ...ticketDoc.data() } as Ticket;
      }
      return null;
    } catch (error) {
      console.error('Error fetching ticket:', error);
      throw error;
    }
  },

  // Subscribe to tickets by user
  subscribeToUserTickets: (userId: string, callback: (tickets: Ticket[]) => void) => {
    const q = query(
      collection(db, 'tickets'),
      where('assignedTo', '==', userId)
    );

    return onSnapshot(q, (snapshot) => {
      const tickets: Ticket[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Ticket));
      callback(tickets);
    });
  },

  // Create new ticket with subcollections
  createTicket: async (ticketData: Omit<Ticket, 'id'>, createdBy?: string): Promise<string> => {
    try {
      const now = Timestamp.now();

      // Create main ticket document (core fields only, excluding undefined values)
      const coreTicketData: any = {
        title: ticketData.title,
        description: ticketData.description,
        clientName: ticketData.clientName,
        writerName: ticketData.writerName,
        status: ticketData.status || 'todo',
        priority: ticketData.priority,
        type: ticketData.type,
        dueDate: ticketData.dueDate,
        aiReviewCompleted: ticketData.aiReviewCompleted || false,
        createdAt: now,
        updatedAt: now
      };

      // Only add optional fields if they have values (not undefined)
      if (ticketData.assignedTo !== undefined && ticketData.assignedTo !== null) {
        coreTicketData.assignedTo = ticketData.assignedTo;
      }
      if (ticketData.reviewedBy !== undefined && ticketData.reviewedBy !== null) {
        coreTicketData.reviewedBy = ticketData.reviewedBy;
      }
      if (ticketData.articleIdeaId !== undefined && ticketData.articleIdeaId !== null) {
        coreTicketData.articleIdeaId = ticketData.articleIdeaId;
      }

      const docRef = await addDoc(collection(db, 'tickets'), coreTicketData);
      const ticketId = docRef.id;

      // Initialize timeline subcollection with creator info
      await ticketTimelineService.initializeTimeline(ticketId, ticketData.status || 'todo', createdBy);

      return ticketId;
    } catch (error) {
      console.error('Error adding ticket:', error);
      throw error;
    }
  },

  // Update ticket (core fields only)
  updateTicket: async (ticketId: string, updateData: Partial<Ticket>): Promise<void> => {
    try {
      // Only update core ticket fields
      const coreFields = {
        title: updateData.title,
        description: updateData.description,
        clientName: updateData.clientName,
        writerName: updateData.writerName,
        status: updateData.status,
        priority: updateData.priority,
        type: updateData.type,
        dueDate: updateData.dueDate,
        assignedTo: updateData.assignedTo,
        reviewedBy: updateData.reviewedBy,
        articleIdeaId: updateData.articleIdeaId,
        aiReviewCompleted: updateData.aiReviewCompleted,
        updatedAt: Timestamp.now()
      };

      // Remove undefined fields
      const cleanedFields = Object.fromEntries(
        Object.entries(coreFields).filter(([_, value]) => value !== undefined)
      );

      await updateDoc(doc(db, 'tickets', ticketId), cleanedFields);
    } catch (error) {
      console.error('Error updating ticket:', error);
      throw error;
    }
  },

  // Update ticket status with timeline tracking
  updateTicketStatus: async (ticketId: string, status: TicketStatus, changedBy: string, notes?: string): Promise<void> => {
    try {
      // Update main ticket status
      await updateDoc(doc(db, 'tickets', ticketId), {
        status,
        updatedAt: Timestamp.now()
      });

      // Update timeline subcollection
      await ticketTimelineService.updateTicketStatus(ticketId, status, changedBy, notes);
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  },

  // Complete ticket with cost calculation
  completeTicketWithCosts: async (
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
    },
    changedBy: string
  ): Promise<void> => {
    try {
      // Update main ticket status
      await updateDoc(doc(db, 'tickets', ticketId), {
        status: 'done',
        updatedAt: Timestamp.now()
      });

      // Update timeline
      await ticketTimelineService.updateTicketStatus(ticketId, 'done', changedBy, 'Ticket completed with cost calculation');

      // Update financials
      await ticketFinancialsService.setCostBreakdown(ticketId, costData);

      // Update content completion date
      await ticketContentService.updateContent(ticketId, {
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error completing ticket with costs:', error);
      throw error;
    }
  },

  // Submit content for ticket
  submitContent: async (ticketId: string, htmlContent: string, changedBy: string): Promise<void> => {
    try {
      // Update main ticket status
      await updateDoc(doc(db, 'tickets', ticketId), {
        status: 'internal_review',
        updatedAt: Timestamp.now()
      });

      // Update timeline
      await ticketTimelineService.updateTicketStatus(ticketId, 'internal_review', changedBy, 'Content submitted for review');

      // Submit content to content subcollection
      await ticketContentService.submitContent(ticketId, htmlContent);
    } catch (error) {
      console.error('Error submitting content:', error);
      throw error;
    }
  },

  // Delete ticket with all subcollections
  deleteTicket: async (ticketId: string): Promise<void> => {
    try {
      await ticketWithSubcollectionsService.deleteCompleteTicket(ticketId);
    } catch (error) {
      console.error('Error deleting ticket:', error);
      throw error;
    }
  },

  // Get tickets by status for reporting
  getTicketsByStatus: async (status: Ticket['status']): Promise<Ticket[]> => {
    try {
      const q = query(collection(db, 'tickets'), where('status', '==', status));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Ticket));
    } catch (error) {
      console.error('Error fetching tickets by status:', error);
      throw error;
    }
  },

  // Get cost statistics for completed tickets (now uses financials subcollection)
  getCostStatistics: async (startDate?: string, endDate?: string): Promise<{
    totalCost: number;
    ticketCount: number;
    averageCost: number;
    costByType: { [key: string]: number };
  }> => {
    try {
      // Get completed tickets
      let q = query(collection(db, 'tickets'), where('status', 'in', ['done', 'invoiced', 'paid']));
      const snapshot = await getDocs(q);
      const ticketIds = snapshot.docs.map(doc => doc.id);

      // Get tickets with financials data
      const ticketsWithFinancials = await ticketWithSubcollectionsService.getTicketsWithSubcollections(
        ticketIds,
        { financials: true, content: true }
      );

      // Filter by date if provided
      let filteredTickets = ticketsWithFinancials;
      if (startDate || endDate) {
        filteredTickets = ticketsWithFinancials.filter(ticket => {
          const completedAt = ticket.content?.completedAt;
          if (!completedAt) return false;

          const ticketDate = new Date(completedAt);
          if (startDate && ticketDate < new Date(startDate)) return false;
          if (endDate && ticketDate > new Date(endDate)) return false;
          return true;
        });
      }

      const totalCost = filteredTickets.reduce((sum, ticket) => sum + (ticket.financials?.totalCost || 0), 0);
      const ticketCount = filteredTickets.length;
      const averageCost = ticketCount > 0 ? totalCost / ticketCount : 0;

      // Calculate cost by type
      const costByType: { [key: string]: number } = {};
      filteredTickets.forEach(ticket => {
        if (ticket.type && ticket.financials?.totalCost) {
          costByType[ticket.type] = (costByType[ticket.type] || 0) + ticket.financials.totalCost;
        }
      });

      return {
        totalCost,
        ticketCount,
        averageCost,
        costByType
      };
    } catch (error) {
      console.error('Error fetching cost statistics:', error);
      throw error;
    }
  },

  // Get revenue statistics (new method using financials subcollection)
  getRevenueStatistics: async (startDate?: string, endDate?: string): Promise<{
    totalRevenue: number;
    ticketCount: number;
    averageRevenue: number;
    revenueByType: { [key: string]: number };
    revenueByClient: { [key: string]: number };
  }> => {
    try {
      // Get invoiced/paid tickets
      let q = query(collection(db, 'tickets'), where('status', 'in', ['invoiced', 'paid']));
      const snapshot = await getDocs(q);
      const ticketIds = snapshot.docs.map(doc => doc.id);

      // Get tickets with financials and timeline data
      const ticketsWithData = await ticketWithSubcollectionsService.getTicketsWithSubcollections(
        ticketIds,
        { financials: true, timeline: true }
      );

      // Filter by date if provided (using state history)
      let filteredTickets = ticketsWithData;
      if (startDate || endDate) {
        filteredTickets = ticketsWithData.filter(ticket => {
          const timeline = ticket.timeline?.stateHistory;
          if (!timeline) return false;

          const relevantDate = timeline.paid || timeline.invoiced;
          if (!relevantDate) return false;

          const ticketDate = new Date(relevantDate);
          if (startDate && ticketDate < new Date(startDate)) return false;
          if (endDate && ticketDate > new Date(endDate)) return false;
          return true;
        });
      }

      const totalRevenue = filteredTickets.reduce((sum, ticket) => sum + (ticket.financials?.actualRevenue || 0), 0);
      const ticketCount = filteredTickets.filter(ticket => ticket.financials?.actualRevenue).length;
      const averageRevenue = ticketCount > 0 ? totalRevenue / ticketCount : 0;

      // Calculate revenue by type
      const revenueByType: { [key: string]: number } = {};
      filteredTickets.forEach(ticket => {
        if (ticket.type && ticket.financials?.actualRevenue) {
          revenueByType[ticket.type] = (revenueByType[ticket.type] || 0) + ticket.financials.actualRevenue;
        }
      });

      // Calculate revenue by client
      const revenueByClient: { [key: string]: number } = {};
      filteredTickets.forEach(ticket => {
        if (ticket.clientName && ticket.financials?.actualRevenue) {
          revenueByClient[ticket.clientName] = (revenueByClient[ticket.clientName] || 0) + ticket.financials.actualRevenue;
        }
      });

      return {
        totalRevenue,
        ticketCount,
        averageRevenue,
        revenueByType,
        revenueByClient
      };
    } catch (error) {
      console.error('Error fetching revenue statistics:', error);
      throw error;
    }
  }
};