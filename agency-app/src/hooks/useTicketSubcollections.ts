// src/hooks/useTicketSubcollections.ts
import { useState, useEffect } from 'react';
import { ticketsService } from '../services/api/tickets';
import {
  ticketWithSubcollectionsService,
  ticketContentService,
  ticketFinancialsService,
  ticketTimelineService
} from '../services/api/ticketSubcollections';
import {
  Ticket,
  TicketWithSubcollections,
  TicketContent,
  TicketFinancials,
  TicketTimeline
} from '../types';

// =====================================
// MAIN TICKET HOOKS
// =====================================

// Hook for basic ticket data (core fields only)
export const useTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = ticketsService.subscribeToTickets((ticketsData) => {
      setTickets(ticketsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { tickets, loading, error };
};

// Hook for user-specific tickets
export const useUserTickets = (userId: string | null) => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setTickets([]);
      setLoading(false);
      return;
    }

    const unsubscribe = ticketsService.subscribeToUserTickets(userId, (ticketsData) => {
      setTickets(ticketsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  return { tickets, loading, error };
};

// =====================================
// INDIVIDUAL TICKET HOOKS
// =====================================

interface UseTicketOptions {
  includeContent?: boolean;
  includeFinancials?: boolean;
  includeTimeline?: boolean;
}

// Hook for a single ticket with subcollections
export const useTicket = (ticketId: string | null, options: UseTicketOptions = {}) => {
  const [ticket, setTicket] = useState<TicketWithSubcollections | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    includeContent = true,
    includeFinancials = true,
    includeTimeline = true
  } = options;

  useEffect(() => {
    if (!ticketId) {
      setTicket(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = ticketWithSubcollectionsService.subscribeToTicketWithSubcollections(
      ticketId,
      (ticketData) => {
        setTicket(ticketData);
        setLoading(false);
      },
      {
        content: includeContent,
        financials: includeFinancials,
        timeline: includeTimeline
      }
    );

    return () => unsubscribe();
  }, [ticketId, includeContent, includeFinancials, includeTimeline]);

  return { ticket, loading, error };
};

// Hook for ticket content only
export const useTicketContent = (ticketId: string | null) => {
  const [content, setContent] = useState<TicketContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticketId) {
      setContent(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = ticketContentService.subscribeToContent(ticketId, (contentData) => {
      setContent(contentData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [ticketId]);

  return { content, loading, error };
};

// Hook for ticket financials only
export const useTicketFinancials = (ticketId: string | null) => {
  const [financials, setFinancials] = useState<TicketFinancials | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticketId) {
      setFinancials(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = ticketFinancialsService.subscribeToFinancials(ticketId, (financialsData) => {
      setFinancials(financialsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [ticketId]);

  return { financials, loading, error };
};

// Hook for ticket timeline only
export const useTicketTimeline = (ticketId: string | null) => {
  const [timeline, setTimeline] = useState<TicketTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ticketId) {
      setTimeline(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = ticketTimelineService.subscribeToTimeline(ticketId, (timelineData) => {
      setTimeline(timelineData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [ticketId]);

  return { timeline, loading, error };
};

// =====================================
// BULK TICKET HOOKS WITH SUBCOLLECTIONS
// =====================================

// Hook for multiple tickets with revenue data (optimized for performance)
export const useTicketsWithRevenue = (
  ticketIds: string[] = [],
  options: UseTicketOptions = {}
) => {
  const [tickets, setTickets] = useState<TicketWithSubcollections[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    includeContent = false,
    includeFinancials = true,
    includeTimeline = true
  } = options;

  useEffect(() => {
    const fetchTicketsWithRevenue = async () => {
      try {
        setLoading(true);
        setError(null);

        if (ticketIds.length === 0) {
          // Use optimized revenue query for current month data
          const { getCurrentMonthRevenueTickets, getCurrentMonthCompletedTickets } = await import('../services/api/revenueQueries');

          // Fetch both revenue and completed tickets for dashboard
          const [revenueTickets, completedTickets] = await Promise.all([
            getCurrentMonthRevenueTickets(),
            getCurrentMonthCompletedTickets()
          ]);

          // Merge and deduplicate tickets
          const ticketMap = new Map<string, TicketWithSubcollections>();

          revenueTickets.forEach(ticket => {
            ticketMap.set(ticket.id, ticket);
          });

          completedTickets.forEach(ticket => {
            if (!ticketMap.has(ticket.id)) {
              ticketMap.set(ticket.id, ticket);
            } else {
              // Merge data if ticket exists in both arrays
              const existing = ticketMap.get(ticket.id)!;
              ticketMap.set(ticket.id, {
                ...existing,
                content: ticket.content || existing.content,
                financials: existing.financials || ticket.financials,
                timeline: existing.timeline || ticket.timeline
              });
            }
          });

          setTickets(Array.from(ticketMap.values()));
        } else {
          // Fetch specific tickets by IDs using optimized batch loading
          const ticketsWithSubcollections = await ticketWithSubcollectionsService.getTicketsWithSubcollections(ticketIds, {
            content: includeContent,
            financials: includeFinancials,
            timeline: includeTimeline
          });

          setTickets(ticketsWithSubcollections);
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching tickets with revenue:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
        setLoading(false);
      }
    };

    fetchTicketsWithRevenue();
  }, [ticketIds, includeContent, includeFinancials, includeTimeline]);

  return { tickets, loading, error };
};

// New hook specifically for current month revenue data (with caching)
export const useCurrentMonthRevenue = () => {
  const [tickets, setTickets] = useState<TicketWithSubcollections[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { getCachedRevenueTickets } = await import('../services/api/revenueQueries');
        const revenueTickets = await getCachedRevenueTickets();

        setTickets(revenueTickets);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching revenue data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch revenue data');
        setLoading(false);
      }
    };

    fetchRevenueData();
  }, []);

  return { tickets, loading, error };
};

// Hook for bulk client revenue calculation
export const useBulkClientRevenue = (clientNames: string[]) => {
  const [revenues, setRevenues] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBulkRevenue = async () => {
      try {
        setLoading(true);
        setError(null);

        if (clientNames.length === 0) {
          setRevenues({});
          setLoading(false);
          return;
        }

        const { getBulkClientRevenue } = await import('../services/api/revenueQueries');
        const revenueData = await getBulkClientRevenue(clientNames);

        setRevenues(revenueData);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching bulk client revenue:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch client revenue');
        setLoading(false);
      }
    };

    fetchBulkRevenue();
  }, [clientNames]);

  return { revenues, loading, error };
};

// =====================================
// TICKET MANAGEMENT HOOKS
// =====================================

// Hook with utility functions for ticket management
export const useTicketActions = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createTicket = async (ticketData: Omit<Ticket, 'id'>): Promise<string | null> => {
    try {
      setLoading(true);
      setError(null);
      const ticketId = await ticketsService.createTicket(ticketData);
      setLoading(false);
      return ticketId;
    } catch (err) {
      console.error('Error creating ticket:', err);
      setError(err instanceof Error ? err.message : 'Failed to create ticket');
      setLoading(false);
      return null;
    }
  };

  const updateTicket = async (ticketId: string, updateData: Partial<Ticket>): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await ticketsService.updateTicket(ticketId, updateData);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error updating ticket:', err);
      setError(err instanceof Error ? err.message : 'Failed to update ticket');
      setLoading(false);
      return false;
    }
  };

  const updateTicketStatus = async (
    ticketId: string,
    status: Ticket['status'],
    changedBy: string,
    notes?: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await ticketsService.updateTicketStatus(ticketId, status, changedBy, notes);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error updating ticket status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update ticket status');
      setLoading(false);
      return false;
    }
  };

  const deleteTicket = async (ticketId: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await ticketsService.deleteTicket(ticketId);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error deleting ticket:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete ticket');
      setLoading(false);
      return false;
    }
  };

  const submitContent = async (ticketId: string, htmlContent: string, changedBy: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await ticketsService.submitContent(ticketId, htmlContent, changedBy);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error submitting content:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit content');
      setLoading(false);
      return false;
    }
  };

  const completeTicketWithCosts = async (
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
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await ticketsService.completeTicketWithCosts(ticketId, costData, changedBy);
      setLoading(false);
      return true;
    } catch (err) {
      console.error('Error completing ticket with costs:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete ticket');
      setLoading(false);
      return false;
    }
  };

  return {
    loading,
    error,
    createTicket,
    updateTicket,
    updateTicketStatus,
    deleteTicket,
    submitContent,
    completeTicketWithCosts
  };
};