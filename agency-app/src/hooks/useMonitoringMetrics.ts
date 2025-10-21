// Monitoring-specific React hooks
// Optimized hooks for Ticket Performance Analytics dashboard

import { useState, useEffect } from 'react';
import {
  MonitoringTask,
  TaskMetrics,
  WriterMetrics,
  getCachedMonitoringData,
  calculateTaskMetrics,
  getWriterMetrics,
  getStuckTasks
} from '../services/api/monitoringQueries';

// Hook for ticket metrics (main dashboard metrics)
export const useTaskMetrics = (durationDays: number) => {
  const [taskMetrics, setTaskMetrics] = useState<TaskMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTaskMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        const { createdTasks, completedTasks, stuckTasks } = await getCachedMonitoringData(durationDays);
        const metrics = calculateTaskMetrics(createdTasks, completedTasks, stuckTasks);

        setTaskMetrics(metrics);
      } catch (err) {
        console.error('Error fetching task metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch task metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchTaskMetrics();
  }, [durationDays]);

  return { taskMetrics, loading, error };
};

// Hook for writer performance metrics
export const useWriterMetrics = (durationDays: number) => {
  const [writerMetrics, setWriterMetrics] = useState<WriterMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWriterMetrics = async () => {
      try {
        setLoading(true);
        setError(null);

        const metrics = await getWriterMetrics(durationDays);
        setWriterMetrics(metrics);
      } catch (err) {
        console.error('Error fetching writer metrics:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch writer metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchWriterMetrics();
  }, [durationDays]);

  return { writerMetrics, loading, error };
};

// Hook for stuck tasks only
export const useStuckTasks = () => {
  const [stuckTasks, setStuckTasks] = useState<MonitoringTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStuckTasks = async () => {
      try {
        setLoading(true);
        setError(null);

        const tasks = await getStuckTasks();
        setStuckTasks(tasks);
      } catch (err) {
        console.error('Error fetching stuck tasks:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch stuck tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchStuckTasks();
  }, []);

  return { stuckTasks, loading, error };
};

// Combined hook for all monitoring data (most efficient for full dashboard)
export const useMonitoringDashboard = (durationDays: number) => {
  const [taskMetrics, setTaskMetrics] = useState<TaskMetrics | null>(null);
  const [writerMetrics, setWriterMetrics] = useState<WriterMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel
        const [
          { createdTasks, completedTasks, stuckTasks },
          writerMetricsData
        ] = await Promise.all([
          getCachedMonitoringData(durationDays),
          getWriterMetrics(durationDays)
        ]);

        // Calculate task metrics
        const taskMetricsData = calculateTaskMetrics(createdTasks, completedTasks, stuckTasks);

        setTaskMetrics(taskMetricsData);
        setWriterMetrics(writerMetricsData);
      } catch (err) {
        console.error('Error fetching monitoring dashboard data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [durationDays]);

  return {
    taskMetrics,
    writerMetrics,
    loading,
    error
  };
};

// Hook for refreshing monitoring data (useful for manual refresh)
export const useMonitoringRefresh = () => {
  const [refreshing, setRefreshing] = useState(false);

  const refreshData = async () => {
    setRefreshing(true);
    try {
      // Clear cache to force fresh data
      const { clearMonitoringCache } = await import('../services/api/monitoringQueries');
      clearMonitoringCache();

      // Small delay to show refresh state
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Error refreshing monitoring data:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return { refreshData, refreshing };
};

// Hook for real-time monitoring (auto-refresh every 5 minutes)
export const useRealTimeMonitoring = (durationDays: number, enabled: boolean = false) => {
  const [taskMetrics, setTaskMetrics] = useState<TaskMetrics | null>(null);
  const [writerMetrics, setWriterMetrics] = useState<WriterMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [
          { createdTasks, completedTasks, stuckTasks },
          writerMetricsData
        ] = await Promise.all([
          getCachedMonitoringData(durationDays),
          getWriterMetrics(durationDays)
        ]);

        const taskMetricsData = calculateTaskMetrics(createdTasks, completedTasks, stuckTasks);

        setTaskMetrics(taskMetricsData);
        setWriterMetrics(writerMetricsData);
        setLastUpdated(new Date());
      } catch (err) {
        console.error('Error fetching real-time monitoring data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data');
      } finally {
        setLoading(false);
      }
    };

    // Initial fetch
    fetchData();

    // Set up interval for auto-refresh (5 minutes)
    const interval = setInterval(fetchData, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [durationDays, enabled]);

  return {
    taskMetrics,
    writerMetrics,
    loading,
    error,
    lastUpdated
  };
};