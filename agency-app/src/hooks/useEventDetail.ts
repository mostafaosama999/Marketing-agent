// src/hooks/useEventDetail.ts
import { useState, useEffect, useCallback } from 'react';
import {
  Event,
  EventCompany,
  EventCompanyFormData,
  EventLead,
  EventLeadFormData,
} from '../types/event';
import { eventsService } from '../services/api/events';
import { eventSubcollectionsService } from '../services/api/eventSubcollections';

interface UseEventDetailReturn {
  event: Event | null;
  companies: EventCompany[];
  leads: EventLead[];
  loading: boolean;
  companiesLoading: boolean;
  leadsLoading: boolean;
  error: string | null;

  updateEvent: (updates: Partial<Event>) => Promise<void>;

  addCompany: (data: EventCompanyFormData) => Promise<string | null>;
  updateCompany: (companyId: string, updates: Partial<EventCompany>) => Promise<void>;
  deleteCompany: (companyId: string) => Promise<void>;

  addLead: (data: EventLeadFormData) => Promise<string | null>;
  updateLead: (leadId: string, updates: Partial<EventLead>) => Promise<void>;
  deleteLead: (leadId: string) => Promise<void>;
}

export const useEventDetail = (eventId: string | undefined): UseEventDetailReturn => {
  const [event, setEvent] = useState<Event | null>(null);
  const [companies, setCompanies] = useState<EventCompany[]>([]);
  const [leads, setLeads] = useState<EventLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load event
  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const fetchEvent = async () => {
      try {
        setLoading(true);
        const eventData = await eventsService.getEvent(eventId);
        setEvent(eventData);
      } catch (err) {
        console.error('Error fetching event:', err);
        setError('Failed to load event');
      } finally {
        setLoading(false);
      }
    };

    fetchEvent();
  }, [eventId]);

  // Subscribe to companies
  useEffect(() => {
    if (!eventId) {
      setCompaniesLoading(false);
      return;
    }

    const unsubscribe = eventSubcollectionsService.subscribeToEventCompanies(
      eventId,
      (companiesData) => {
        setCompanies(companiesData);
        setCompaniesLoading(false);
      }
    );

    return () => unsubscribe();
  }, [eventId]);

  // Subscribe to leads
  useEffect(() => {
    if (!eventId) {
      setLeadsLoading(false);
      return;
    }

    const unsubscribe = eventSubcollectionsService.subscribeToEventLeads(
      eventId,
      (leadsData) => {
        setLeads(leadsData);
        setLeadsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [eventId]);

  const withErrorHandling = useCallback(async <T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T | null> => {
    try {
      setError(null);
      return await operation();
    } catch (err) {
      console.error(errorMessage, err);
      setError(err instanceof Error ? err.message : errorMessage);
      return null;
    }
  }, []);

  const updateEvent = useCallback(async (updates: Partial<Event>): Promise<void> => {
    if (!eventId) return;
    await withErrorHandling(
      async () => {
        await eventsService.updateEvent(eventId, updates);
        // Re-fetch to update local state
        const updated = await eventsService.getEvent(eventId);
        if (updated) setEvent(updated);
      },
      'Failed to update event'
    );
  }, [eventId, withErrorHandling]);

  const addCompany = useCallback(async (data: EventCompanyFormData): Promise<string | null> => {
    if (!eventId) return null;
    return await withErrorHandling(
      () => eventSubcollectionsService.addEventCompany(eventId, data),
      'Failed to add company'
    );
  }, [eventId, withErrorHandling]);

  const updateCompany = useCallback(async (companyId: string, updates: Partial<EventCompany>): Promise<void> => {
    if (!eventId) return;
    await withErrorHandling(
      () => eventSubcollectionsService.updateEventCompany(eventId, companyId, updates),
      'Failed to update company'
    );
  }, [eventId, withErrorHandling]);

  const deleteCompany = useCallback(async (companyId: string): Promise<void> => {
    if (!eventId) return;
    await withErrorHandling(
      () => eventSubcollectionsService.deleteEventCompany(eventId, companyId),
      'Failed to delete company'
    );
  }, [eventId, withErrorHandling]);

  const addLead = useCallback(async (data: EventLeadFormData): Promise<string | null> => {
    if (!eventId) return null;
    return await withErrorHandling(
      () => eventSubcollectionsService.addEventLead(eventId, data),
      'Failed to add lead'
    );
  }, [eventId, withErrorHandling]);

  const updateLead = useCallback(async (leadId: string, updates: Partial<EventLead>): Promise<void> => {
    if (!eventId) return;
    await withErrorHandling(
      () => eventSubcollectionsService.updateEventLead(eventId, leadId, updates),
      'Failed to update lead'
    );
  }, [eventId, withErrorHandling]);

  const deleteLead = useCallback(async (leadId: string): Promise<void> => {
    if (!eventId) return;
    await withErrorHandling(
      () => eventSubcollectionsService.deleteEventLead(eventId, leadId),
      'Failed to delete lead'
    );
  }, [eventId, withErrorHandling]);

  return {
    event,
    companies,
    leads,
    loading,
    companiesLoading,
    leadsLoading,
    error,
    updateEvent,
    addCompany,
    updateCompany,
    deleteCompany,
    addLead,
    updateLead,
    deleteLead,
  };
};
