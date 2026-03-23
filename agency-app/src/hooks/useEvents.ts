// src/hooks/useEvents.ts
import { useState, useEffect, useCallback } from 'react';
import { Event, EventCategory, EventFormData } from '../types/event';
import { eventsService } from '../services/api/events';

interface UseEventsReturn {
  events: Event[];
  loading: boolean;
  error: string | null;
  addEvent: (data: Partial<EventFormData>) => Promise<string | null>;
  updateEvent: (eventId: string, updates: Partial<Event>) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
}

export const useEvents = (category?: EventCategory): UseEventsReturn => {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = category
      ? eventsService.subscribeToEventsByCategory(category, (eventsData) => {
          setEvents(eventsData);
          setLoading(false);
        })
      : eventsService.subscribeToEvents((eventsData) => {
          setEvents(eventsData);
          setLoading(false);
        });

    return () => unsubscribe();
  }, [category]);

  const addEvent = useCallback(async (data: Partial<EventFormData>): Promise<string | null> => {
    try {
      setError(null);
      const id = await eventsService.createEvent(data);
      return id;
    } catch (err) {
      console.error('Error adding event:', err);
      setError(err instanceof Error ? err.message : 'Failed to add event');
      return null;
    }
  }, []);

  const updateEvent = useCallback(async (eventId: string, updates: Partial<Event>): Promise<void> => {
    try {
      setError(null);
      await eventsService.updateEvent(eventId, updates);
    } catch (err) {
      console.error('Error updating event:', err);
      setError(err instanceof Error ? err.message : 'Failed to update event');
    }
  }, []);

  const deleteEvent = useCallback(async (eventId: string): Promise<void> => {
    try {
      setError(null);
      await eventsService.deleteEvent(eventId);
    } catch (err) {
      console.error('Error deleting event:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete event');
    }
  }, []);

  return { events, loading, error, addEvent, updateEvent, deleteEvent };
};
