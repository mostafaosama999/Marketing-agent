// Specialized monitoring query functions
// Optimized for Task Performance Analytics dashboard

import {
  collection,
  query,
  where,
  getDocs,
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { ticketWithSubcollectionsService } from './ticketSubcollections';
import { TicketWithSubcollections } from '../../types/ticket';

export interface MonitoringTask extends TicketWithSubcollections {
  // Legacy compatibility fields
  stateHistory?: {
    todo?: string;
    in_progress?: string;
    internal_review?: string;
    client_review?: string;
    done?: string;
    invoiced?: string;
    paid?: string;
  };
}

export interface TaskMetrics {
  totalTasksCreated: number;
  totalTasksCompleted: number;
  averageTimeToComplete: number;
  stuckTasks: MonitoringTask[];
}

export interface WriterMetrics {
  writerName: string;
  assignedTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  internalReviewTasks: number;
  clientReviewTasks: number;
  status: 'active' | 'inactive' | 'overloaded' | 'available';
}

// Helper function to safely parse dates
const safeParseDate = (dateValue: any): Date | null => {
  if (!dateValue) return null;

  if (dateValue instanceof Date) return dateValue;

  if (typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
    return dateValue.toDate();
  }

  if (typeof dateValue === 'object' && dateValue.seconds) {
    return new Date(dateValue.seconds * 1000);
  }

  if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    const date = new Date(dateValue);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
};

// Get tickets created in time window
export const getMonitoringTickets = async (durationDays: number): Promise<MonitoringTask[]> => {
  try {
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - durationDays);

    // Query tickets created within the specified duration
    const ticketsQuery = query(
      collection(db, 'tickets'),
      where('createdAt', '>=', Timestamp.fromDate(cutoffDate)),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(ticketsQuery);
    const ticketIds = snapshot.docs.map(doc => doc.id);

    if (ticketIds.length === 0) {
      return [];
    }

    // Get tickets with timeline data for stuck task detection
    const ticketsWithData = await ticketWithSubcollectionsService.getTicketsWithSubcollections(
      ticketIds,
      { content: false, financials: false, timeline: true }
    );

    // Map to MonitoringTask with legacy compatibility
    return ticketsWithData.map(ticket => {
      // Map timeline stateHistory to legacy format for compatibility
      const stateHistory = ticket.timeline?.stateHistory ? {
        todo: ticket.timeline.stateHistory.todo,
        in_progress: ticket.timeline.stateHistory.in_progress,
        internal_review: ticket.timeline.stateHistory.internal_review,
        client_review: ticket.timeline.stateHistory.client_review,
        done: ticket.timeline.stateHistory.done,
        invoiced: ticket.timeline.stateHistory.invoiced,
        paid: ticket.timeline.stateHistory.paid
      } : undefined;

      return {
        ...ticket,
        stateHistory
      } as MonitoringTask;
    });
  } catch (error) {
    console.error('Error fetching monitoring tickets:', error);
    throw error;
  }
};

// Get tickets completed in time window (regardless of creation date)
export const getCompletedTickets = async (durationDays: number): Promise<MonitoringTask[]> => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - durationDays);

    // Get all tickets with completion statuses
    const completedQuery = query(
      collection(db, 'tickets'),
      where('status', 'in', ['done', 'invoiced', 'paid'])
    );

    const snapshot = await getDocs(completedQuery);

    if (snapshot.size === 0) return [];

    const ticketIds = snapshot.docs.map(doc => doc.id);

    // Get tickets with timeline data to check completion dates
    const ticketsWithData = await ticketWithSubcollectionsService.getTicketsWithSubcollections(
      ticketIds,
      { content: false, financials: false, timeline: true }
    );

    // Filter tickets completed within the time window
    const completedInWindow = ticketsWithData.filter(ticket => {
      if (!ticket.timeline?.stateHistory) return false;

      const stateHistory = ticket.timeline.stateHistory;
      // Check completion date (use the most recent completion status)
      const completionTime = stateHistory.paid || stateHistory.invoiced || stateHistory.done;

      if (!completionTime) return false;

      const completionDate = safeParseDate(completionTime);
      if (!completionDate) return false;

      return completionDate >= cutoffDate;
    });

    // Map to MonitoringTask with legacy compatibility
    return completedInWindow.map(ticket => {
      const stateHistory = ticket.timeline?.stateHistory ? {
        todo: ticket.timeline.stateHistory.todo,
        in_progress: ticket.timeline.stateHistory.in_progress,
        internal_review: ticket.timeline.stateHistory.internal_review,
        client_review: ticket.timeline.stateHistory.client_review,
        done: ticket.timeline.stateHistory.done,
        invoiced: ticket.timeline.stateHistory.invoiced,
        paid: ticket.timeline.stateHistory.paid
      } : undefined;

      return {
        ...ticket,
        stateHistory
      } as MonitoringTask;
    });
  } catch (error) {
    console.error('Error fetching completed tickets:', error);
    throw error;
  }
};

// Get stuck tasks (optimized query)
export const getStuckTasks = async (): Promise<MonitoringTask[]> => {
  try {
    // Query tickets that are not completed
    const activeTicketsQuery = query(
      collection(db, 'tickets'),
      where('status', 'in', ['todo', 'in_progress', 'internal_review', 'client_review'])
    );

    const snapshot = await getDocs(activeTicketsQuery);
    const ticketIds = snapshot.docs.map(doc => doc.id);

    if (ticketIds.length === 0) return [];

    // Get tickets with timeline data
    const ticketsWithData = await ticketWithSubcollectionsService.getTicketsWithSubcollections(
      ticketIds,
      { content: false, financials: false, timeline: true }
    );

    // Filter for stuck tasks (7+ days cumulative in current state)
    const stuckTasks = ticketsWithData.filter(ticket => {
      if (!ticket.timeline?.stateHistory) return false;

      const currentStatus = ticket.status;
      const now = new Date();
      let cumulativeDays = 0;
      let currentSessionDays = 0;

      // Get cumulative time from stateDurations if available
      if (ticket.timeline.stateDurations && typeof ticket.timeline.stateDurations[currentStatus] === 'number') {
        cumulativeDays = ticket.timeline.stateDurations[currentStatus] || 0;
      }

      // Calculate current session time
      const stateStartTime = ticket.timeline.stateHistory[currentStatus as keyof typeof ticket.timeline.stateHistory];
      if (stateStartTime) {
        const stateStartDate = safeParseDate(stateStartTime);
        if (stateStartDate) {
          const diffTime = now.getTime() - stateStartDate.getTime();
          currentSessionDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        }
      }

      // Return total: cumulative + current session, ensuring no NaN values
      const totalDays = (cumulativeDays || 0) + (currentSessionDays || 0);
      return totalDays >= 7;
    });

    // Map to MonitoringTask with legacy compatibility
    return stuckTasks.map(ticket => {
      const stateHistory = ticket.timeline?.stateHistory ? {
        todo: ticket.timeline.stateHistory.todo,
        in_progress: ticket.timeline.stateHistory.in_progress,
        internal_review: ticket.timeline.stateHistory.internal_review,
        client_review: ticket.timeline.stateHistory.client_review,
        done: ticket.timeline.stateHistory.done,
        invoiced: ticket.timeline.stateHistory.invoiced,
        paid: ticket.timeline.stateHistory.paid
      } : undefined;

      return {
        ...ticket,
        stateHistory
      } as MonitoringTask;
    });
  } catch (error) {
    console.error('Error fetching stuck tasks:', error);
    throw error;
  }
};

// Calculate task metrics from monitoring data
export const calculateTaskMetrics = (
  createdTasks: MonitoringTask[],
  completedTasks: MonitoringTask[],
  stuckTasks: MonitoringTask[]
): TaskMetrics => {
  // Calculate average completion time
  let totalCompletionTime = 0;
  let tasksWithCompletionTime = 0;

  completedTasks.forEach(task => {
    const createdAt = safeParseDate(task.createdAt);
    if (!createdAt) return;

    // Try to get completion date from timeline
    let completionDate: Date | null = null;
    if (task.timeline?.stateHistory) {
      const stateHistory = task.timeline.stateHistory;
      const completionTime = stateHistory.paid || stateHistory.invoiced || stateHistory.done;
      if (completionTime) {
        completionDate = safeParseDate(completionTime);
      }
    }

    // Fallback to current date if no completion date found
    if (!completionDate) {
      completionDate = new Date();
    }

    const diffTime = completionDate.getTime() - createdAt.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
      totalCompletionTime += diffDays;
      tasksWithCompletionTime++;
    }
  });

  return {
    totalTasksCreated: createdTasks.length,
    totalTasksCompleted: completedTasks.length,
    averageTimeToComplete: tasksWithCompletionTime > 0
      ? totalCompletionTime / tasksWithCompletionTime
      : 0,
    stuckTasks: stuckTasks.slice(0, 10) // Limit to 10 for UI
  };
};

// Get writer metrics for monitoring dashboard
export const getWriterMetrics = async (durationDays: number): Promise<WriterMetrics[]> => {
  try {
    // Get monitoring tasks for the specified duration
    const monitoringTasks = await getMonitoringTickets(durationDays);

    // Get list of writers/managers from users collection
    const usersQuery = query(
      collection(db, 'users'),
      where('role', 'in', ['Writer', 'Manager'])
    );

    const usersSnapshot = await getDocs(usersQuery);
    const writers = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      displayName: doc.data().displayName,
      role: doc.data().role
    }));

    // Calculate metrics for each writer
    const metrics: WriterMetrics[] = writers.map(writer => {
      const writerTasks = monitoringTasks.filter(task => task.assignedTo === writer.displayName);

      const completedTasks = writerTasks.filter(task =>
        task.status === 'done' || task.status === 'paid' || task.status === 'invoiced'
      );

      const inProgressTasks = writerTasks.filter(task => task.status === 'in_progress');
      const internalReviewTasks = writerTasks.filter(task => task.status === 'internal_review');
      const clientReviewTasks = writerTasks.filter(task => task.status === 'client_review');

      const activeTasks = inProgressTasks.length + internalReviewTasks.length + clientReviewTasks.length;

      // Determine writer status
      let status: 'active' | 'inactive' | 'overloaded' | 'available' = 'available';
      if (writerTasks.length === 0) {
        status = 'available';
      } else if (activeTasks > 5) {
        status = 'overloaded';
      } else if (activeTasks > 0) {
        status = 'active';
      } else {
        status = 'inactive';
      }

      return {
        writerName: writer.displayName,
        assignedTasks: writerTasks.length,
        completedTasks: completedTasks.length,
        inProgressTasks: inProgressTasks.length,
        internalReviewTasks: internalReviewTasks.length,
        clientReviewTasks: clientReviewTasks.length,
        status
      };
    });

    return metrics;
  } catch (error) {
    console.error('Error fetching writer metrics:', error);
    throw error;
  }
};

// Cached monitoring data
let monitoringCache: {
  createdTasks: MonitoringTask[] | null;
  completedTasks: MonitoringTask[] | null;
  stuckTasks: MonitoringTask[] | null;
  timestamp: number;
  duration: number;
  ttl: number;
} = {
  createdTasks: null,
  completedTasks: null,
  stuckTasks: null,
  timestamp: 0,
  duration: 0,
  ttl: 5 * 60 * 1000 // 5 minutes
};

// Get cached monitoring data
export const getCachedMonitoringData = async (durationDays: number) => {
  const now = Date.now();

  // Check if cache is valid for this duration
  if (
    monitoringCache.createdTasks &&
    monitoringCache.completedTasks &&
    monitoringCache.stuckTasks &&
    monitoringCache.duration === durationDays &&
    (now - monitoringCache.timestamp) < monitoringCache.ttl
  ) {
    return {
      createdTasks: monitoringCache.createdTasks,
      completedTasks: monitoringCache.completedTasks,
      stuckTasks: monitoringCache.stuckTasks
    };
  }

  // Fetch fresh data in parallel
  const [createdTasks, completedTasks, stuckTasks] = await Promise.all([
    getMonitoringTickets(durationDays),
    getCompletedTickets(durationDays),
    getStuckTasks()
  ]);

  // Update cache
  monitoringCache = {
    createdTasks,
    completedTasks,
    stuckTasks,
    timestamp: now,
    duration: durationDays,
    ttl: monitoringCache.ttl
  };

  return { createdTasks, completedTasks, stuckTasks };
};

// Clear monitoring cache
export const clearMonitoringCache = () => {
  monitoringCache.createdTasks = null;
  monitoringCache.completedTasks = null;
  monitoringCache.stuckTasks = null;
  monitoringCache.timestamp = 0;
  monitoringCache.duration = 0;
};

// Force refresh monitoring data by clearing cache
export const refreshMonitoringData = async (durationDays: number) => {
  clearMonitoringCache();
  return await getCachedMonitoringData(durationDays);
};