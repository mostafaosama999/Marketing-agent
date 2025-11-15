// Google Analytics types for GA4 Data API integration

// Traffic source type - now supports any source name (domains, referrals, etc.)
export type TrafficSourceType = string;

// Daily metrics snapshot
export interface GAMetrics {
  id: string; // Document ID (date in YYYY-MM-DD format)
  date: string; // YYYY-MM-DD
  sessions: number;
  users: number;
  newUsers: number;
  pageviews: number;
  avgSessionDuration: number; // in seconds
  bounceRate: number; // 0-100
  syncedAt: Date;
}

// Traffic source breakdown
export interface GATrafficSource {
  id: string; // Composite: date_source (e.g., "2025-11-15_organic")
  date: string; // YYYY-MM-DD
  source: TrafficSourceType;
  sessions: number;
  users: number;
  newUsers: number;
  percentage: number; // Percentage of total sessions
  syncedAt: Date;
}

// Top pages data
export interface GATopPage {
  id: string; // Composite: date_pagePathHash
  date: string; // YYYY-MM-DD
  pagePath: string;
  pageTitle: string;
  pageviews: number;
  uniquePageviews: number;
  avgTimeOnPage: number; // in seconds
  bounceRate: number; // 0-100
  syncedAt: Date;
}

// Google Analytics configuration (stored per user or globally)
export interface GAConfig {
  id: string; // userId or 'global'
  propertyId: string; // GA4 Property ID (e.g., "123456789")
  websiteUrl: string;
  enabled: boolean;
  lastSyncAt?: Date;
  lastSyncStatus?: 'success' | 'error';
  lastSyncError?: string;
  syncInterval: 'daily' | 'hourly'; // Sync frequency
  createdAt: Date;
  updatedAt: Date;
  createdBy: string; // User ID who configured
}

// Sync result (returned from Cloud Function)
export interface GASyncResult {
  success: boolean;
  metricsCount: number;
  trafficSourcesCount: number;
  dateRange: {
    startDate: string;
    endDate: string;
  };
  syncedAt: Date;
  error?: string;
}

// Date range for queries
export interface GADateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
}

// Aggregated metrics for display
export interface GAMetricsSummary {
  totalSessions: number;
  totalUsers: number;
  totalPageviews: number;
  avgSessionDuration: number;
  avgBounceRate: number;
  periodDays: number;
  trend: {
    sessions: number; // % change from previous period
    users: number;
    pageviews: number;
  };
}

// Traffic source summary for charts
export interface GATrafficSourceSummary {
  source: TrafficSourceType;
  totalSessions: number;
  totalUsers: number;
  percentage: number;
  trend: number; // % change from previous period
  [key: string]: string | number; // Index signature for MUI Charts
}

// Chart data point for time series
export interface GAChartDataPoint {
  date: string;
  sessions: number;
  users: number;
  pageviews: number;
  [key: string]: string | number; // Index signature for MUI Charts
}
