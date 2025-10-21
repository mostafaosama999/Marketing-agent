// src/services/api/leadSubcollections.ts
// Service for managing lead subcollections (timeline, state history)

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import {
  LeadTimeline,
  LeadStatusChange,
  LeadStatus,
} from '../../types/lead';

const LEADS_COLLECTION = 'leads';
const TIMELINE_SUBCOLLECTION = 'timeline';

/**
 * Calculate days between two dates
 */
function calculateDaysBetween(start: Date, end: Date): number {
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Lead Timeline Service
 * Manages state history tracking and status change logging
 */
export const leadTimelineService = {
  /**
   * Initialize timeline subcollection when a lead is created
   */
  async initializeTimeline(
    leadId: string,
    initialStatus: LeadStatus,
    userId: string
  ): Promise<void> {
    try {
      const timelineRef = doc(
        db,
        LEADS_COLLECTION,
        leadId,
        TIMELINE_SUBCOLLECTION,
        leadId
      );

      const now = new Date().toISOString();

      const initialTimeline: Omit<LeadTimeline, 'id' | 'createdAt' | 'updatedAt'> = {
        leadId,
        stateHistory: {
          [initialStatus]: now,
        },
        stateDurations: {
          [initialStatus]: 0,
        },
        statusChanges: [
          {
            id: `${leadId}_${Date.now()}`,
            fromStatus: null, // null indicates lead creation
            toStatus: initialStatus,
            changedBy: userId,
            changedAt: now,
            automaticChange: false,
          },
        ],
      };

      await setDoc(timelineRef, {
        ...initialTimeline,
        id: leadId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error initializing lead timeline:', error);
      throw error;
    }
  },

  /**
   * Update lead status and calculate state durations
   * Tracks cumulative time spent in each state (supports re-entering states)
   */
  async updateLeadStatus(
    leadId: string,
    fromStatus: LeadStatus,
    toStatus: LeadStatus,
    userId: string,
    notes?: string
  ): Promise<void> {
    try {
      const timelineRef = doc(
        db,
        LEADS_COLLECTION,
        leadId,
        TIMELINE_SUBCOLLECTION,
        leadId
      );

      // Get current timeline
      const timelineDoc = await getDoc(timelineRef);
      if (!timelineDoc.exists()) {
        console.error('Timeline not found for lead:', leadId);
        return;
      }

      const timeline = timelineDoc.data() as LeadTimeline;
      const now = new Date().toISOString();
      const nowDate = new Date();

      // Calculate time spent in previous state
      const previousStateEntry = timeline.stateHistory[fromStatus];
      let daysInPreviousState = 0;

      if (previousStateEntry) {
        const entryDate = new Date(previousStateEntry);
        daysInPreviousState = calculateDaysBetween(entryDate, nowDate);
      }

      // Update cumulative duration for previous state
      const updatedDurations = { ...timeline.stateDurations };
      const existingDuration = updatedDurations[fromStatus] || 0;
      updatedDurations[fromStatus] = existingDuration + daysInPreviousState;

      // Update state history with new status entry
      const updatedStateHistory = { ...timeline.stateHistory };
      updatedStateHistory[toStatus] = now;

      // Create status change record
      const statusChange: LeadStatusChange = {
        id: `${leadId}_${Date.now()}`,
        fromStatus,
        toStatus,
        changedBy: userId,
        changedAt: now,
        ...(notes && { notes }),
        automaticChange: false,
      };

      // Update timeline document
      await updateDoc(timelineRef, {
        stateHistory: updatedStateHistory,
        stateDurations: updatedDurations,
        statusChanges: [...timeline.statusChanges, statusChange],
        updatedAt: serverTimestamp(),
      });

      // Also update the main lead document with flattened state history
      const leadRef = doc(db, LEADS_COLLECTION, leadId);
      await updateDoc(leadRef, {
        stateHistory: updatedStateHistory,
        stateDurations: updatedDurations,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating lead status in timeline:', error);
      throw error;
    }
  },

  /**
   * Get timeline for a lead
   */
  async getTimeline(leadId: string): Promise<LeadTimeline | null> {
    try {
      const timelineRef = doc(
        db,
        LEADS_COLLECTION,
        leadId,
        TIMELINE_SUBCOLLECTION,
        leadId
      );

      const timelineDoc = await getDoc(timelineRef);
      if (!timelineDoc.exists()) {
        return null;
      }

      const data = timelineDoc.data();
      return {
        id: timelineDoc.id,
        leadId: data.leadId,
        stateHistory: data.stateHistory,
        stateDurations: data.stateDurations,
        statusChanges: data.statusChanges || [],
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    } catch (error) {
      console.error('Error getting lead timeline:', error);
      return null;
    }
  },

  /**
   * Get status changes (activity log) for a lead
   */
  async getStatusChanges(leadId: string): Promise<LeadStatusChange[]> {
    try {
      const timeline = await this.getTimeline(leadId);
      if (!timeline) {
        return [];
      }

      // Sort by date (most recent first)
      return timeline.statusChanges.sort((a, b) => {
        return new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime();
      });
    } catch (error) {
      console.error('Error getting status changes:', error);
      return [];
    }
  },
};
