// src/services/api/googleAnalyticsService.ts
import {
  Timestamp,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  onSnapshot,
  Query,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { httpsCallable, getFunctions } from 'firebase/functions';
import app from '../firebase/firestore';
import type {
  GAMetrics,
  GATrafficSource,
  GAConfig,
  GASyncResult,
  GADateRange,
  GAMetricsSummary,
  GATrafficSourceSummary,
  GAChartDataPoint,
  TrafficSourceType,
} from '../../types/googleAnalytics';

// Initialize Functions
const functions = getFunctions(app);

/**
 * Call Cloud Function to manually sync Google Analytics data
 * @param daysToSync Number of days to sync (default: 30)
 * @param configId The config ID to sync ('global' for personal, 'company' for company analytics)
 */
export async function syncGoogleAnalytics(
  daysToSync: number = 30,
  configId: string = 'global'
): Promise<GASyncResult> {
  try {
    const syncFunction = httpsCallable<
      { daysToSync: number; configId: string },
      GASyncResult
    >(functions, 'syncGoogleAnalytics');

    const result = await syncFunction({ daysToSync, configId });
    return result.data;
  } catch (error: any) {
    console.error('Failed to sync Google Analytics:', error);
    throw new Error(error.message || 'Failed to sync Google Analytics');
  }
}

/**
 * Get Google Analytics configuration for a user
 */
export async function getGAConfig(userId: string): Promise<GAConfig | null> {
  try {
    const configDoc = await getDoc(doc(db, 'googleAnalytics', userId));

    if (!configDoc.exists()) {
      return null;
    }

    const data = configDoc.data();
    return {
      id: configDoc.id,
      propertyId: data.propertyId,
      websiteUrl: data.websiteUrl,
      enabled: data.enabled ?? true,
      lastSyncAt: data.lastSyncAt?.toDate(),
      lastSyncStatus: data.lastSyncStatus,
      lastSyncError: data.lastSyncError,
      syncInterval: data.syncInterval || 'daily',
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      createdBy: data.createdBy,
    } as GAConfig;
  } catch (error) {
    console.error('Failed to get GA config:', error);
    throw error;
  }
}

/**
 * Save Google Analytics configuration
 */
export async function saveGAConfig(
  userId: string,
  config: {
    propertyId: string;
    websiteUrl: string;
    enabled?: boolean;
    syncInterval?: 'daily' | 'hourly';
  }
): Promise<void> {
  try {
    const configRef = doc(db, 'googleAnalytics', userId);
    const existingDoc = await getDoc(configRef);

    if (existingDoc.exists()) {
      // Update existing config
      await setDoc(configRef, {
        ...config,
        updatedAt: Timestamp.now(),
      }, { merge: true });
    } else {
      // Create new config
      await setDoc(configRef, {
        ...config,
        enabled: config.enabled ?? true,
        syncInterval: config.syncInterval || 'daily',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        createdBy: userId,
      });
    }
  } catch (error) {
    console.error('Failed to save GA config:', error);
    throw error;
  }
}

/**
 * Get GA4 metrics for a date range
 */
export async function getGAMetrics(
  userId: string,
  dateRange: GADateRange
): Promise<GAMetrics[]> {
  try {
    const metricsRef = collection(db, 'googleAnalytics', userId, 'metrics');
    const q = query(
      metricsRef,
      where('date', '>=', dateRange.startDate),
      where('date', '<=', dateRange.endDate),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.date,
        sessions: data.sessions || 0,
        users: data.users || 0,
        newUsers: data.newUsers || 0,
        pageviews: data.pageviews || 0,
        avgSessionDuration: data.avgSessionDuration || 0,
        bounceRate: data.bounceRate || 0,
        syncedAt: data.syncedAt?.toDate() || new Date(),
      } as GAMetrics;
    });
  } catch (error) {
    console.error('Failed to get GA metrics:', error);
    throw error;
  }
}

/**
 * Get GA4 traffic sources for a date range
 */
export async function getGATrafficSources(
  userId: string,
  dateRange: GADateRange
): Promise<GATrafficSource[]> {
  try {
    const sourcesRef = collection(db, 'googleAnalytics', userId, 'trafficSources');
    const q = query(
      sourcesRef,
      where('date', '>=', dateRange.startDate),
      where('date', '<=', dateRange.endDate),
      orderBy('date', 'asc')
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.date,
        source: data.source as TrafficSourceType,
        sessions: data.sessions || 0,
        users: data.users || 0,
        newUsers: data.newUsers || 0,
        percentage: data.percentage || 0,
        syncedAt: data.syncedAt?.toDate() || new Date(),
      } as GATrafficSource;
    });
  } catch (error) {
    console.error('Failed to get GA traffic sources:', error);
    throw error;
  }
}

/**
 * Subscribe to GA metrics updates in real-time
 */
export function subscribeToGAMetrics(
  userId: string,
  dateRange: GADateRange,
  callback: (metrics: GAMetrics[]) => void
): () => void {
  const metricsRef = collection(db, 'googleAnalytics', userId, 'metrics');
  const q = query(
    metricsRef,
    where('date', '>=', dateRange.startDate),
    where('date', '<=', dateRange.endDate),
    orderBy('date', 'asc')
  );

  return onSnapshot(q, (snapshot) => {
    const metrics = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        date: data.date,
        sessions: data.sessions || 0,
        users: data.users || 0,
        newUsers: data.newUsers || 0,
        pageviews: data.pageviews || 0,
        avgSessionDuration: data.avgSessionDuration || 0,
        bounceRate: data.bounceRate || 0,
        syncedAt: data.syncedAt?.toDate() || new Date(),
      } as GAMetrics;
    });

    callback(metrics);
  });
}

/**
 * Calculate metrics summary with trend analysis
 */
export function calculateMetricsSummary(
  currentMetrics: GAMetrics[],
  previousMetrics: GAMetrics[]
): GAMetricsSummary {
  const current = {
    totalSessions: currentMetrics.reduce((sum, m) => sum + m.sessions, 0),
    totalUsers: currentMetrics.reduce((sum, m) => sum + m.users, 0),
    totalPageviews: currentMetrics.reduce((sum, m) => sum + m.pageviews, 0),
    avgSessionDuration: currentMetrics.length > 0
      ? currentMetrics.reduce((sum, m) => sum + m.avgSessionDuration, 0) / currentMetrics.length
      : 0,
    avgBounceRate: currentMetrics.length > 0
      ? currentMetrics.reduce((sum, m) => sum + m.bounceRate, 0) / currentMetrics.length
      : 0,
  };

  const previous = {
    totalSessions: previousMetrics.reduce((sum, m) => sum + m.sessions, 0),
    totalUsers: previousMetrics.reduce((sum, m) => sum + m.users, 0),
    totalPageviews: previousMetrics.reduce((sum, m) => sum + m.pageviews, 0),
  };

  const calculateTrend = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    totalSessions: current.totalSessions,
    totalUsers: current.totalUsers,
    totalPageviews: current.totalPageviews,
    avgSessionDuration: current.avgSessionDuration,
    avgBounceRate: current.avgBounceRate,
    periodDays: currentMetrics.length,
    trend: {
      sessions: calculateTrend(current.totalSessions, previous.totalSessions),
      users: calculateTrend(current.totalUsers, previous.totalUsers),
      pageviews: calculateTrend(current.totalPageviews, previous.totalPageviews),
    },
  };
}

/**
 * Aggregate traffic sources by domain/source
 * Returns top sources sorted by sessions
 */
export function aggregateTrafficSources(
  trafficSources: GATrafficSource[],
  limit: number = 10
): GATrafficSourceSummary[] {
  const aggregated: { [key: string]: GATrafficSourceSummary } = {};

  for (const source of trafficSources) {
    if (!aggregated[source.source]) {
      aggregated[source.source] = {
        source: source.source,
        totalSessions: 0,
        totalUsers: 0,
        percentage: 0,
        trend: 0,
      };
    }

    aggregated[source.source].totalSessions += source.sessions;
    aggregated[source.source].totalUsers += source.users;
  }

  // Calculate overall percentages
  const totalSessions = Object.values(aggregated).reduce(
    (sum, s) => sum + s.totalSessions,
    0
  );

  for (const source of Object.values(aggregated)) {
    source.percentage = totalSessions > 0
      ? (source.totalSessions / totalSessions) * 100
      : 0;
  }

  // Sort by sessions descending and limit to top sources
  return Object.values(aggregated)
    .sort((a, b) => b.totalSessions - a.totalSessions)
    .slice(0, limit);
}

/**
 * Format source names for display
 * Converts GA4 source values to human-readable names
 */
export function formatSourceName(source: string): string {
  // Handle special cases
  if (source === '(direct)') return 'Direct';
  if (source === '(not set)') return 'Not Set';
  if (source === '(none)') return 'None';

  // Remove common prefixes
  let formatted = source.replace(/^(www\.|m\.|l\.)/, '');

  // Capitalize first letter
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/**
 * Format metrics data for chart display
 */
export function formatMetricsForChart(metrics: GAMetrics[]): GAChartDataPoint[] {
  return metrics.map(m => ({
    date: m.date,
    sessions: m.sessions,
    users: m.users,
    pageviews: m.pageviews,
  }));
}

/**
 * Get date range for last N days
 */
export function getDateRange(days: number): GADateRange {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - days);

  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  };
}

/**
 * Format duration in seconds to human-readable format
 */
export function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.round(seconds % 60);

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}h ${remainingMinutes}m`;
}

/**
 * Format number with commas (e.g., 1234 -> 1,234)
 */
export function formatNumber(num: number): string {
  return num.toLocaleString();
}

/**
 * Format percentage with 1 decimal place
 */
export function formatPercentage(num: number): string {
  return `${num.toFixed(1)}%`;
}
