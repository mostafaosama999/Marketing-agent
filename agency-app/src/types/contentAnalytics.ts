import { Timestamp } from 'firebase/firestore';

// ===== LINKEDIN DATA MODEL =====

export interface LinkedInDiscovery {
  overallImpressions: number;
  membersReached: number;
  periodStart: string;
  periodEnd: string;
  syncedAt: Timestamp;
}

export interface LinkedInDailyEngagement {
  date: string;
  impressions: number;
  engagements: number;
  engagementRate: number;
}

export interface LinkedInTopPost {
  id: string;
  url: string;
  publishDate: string;
  engagements: number;
  impressions: number;
  engagementRate: number;
  contentType?: string;
}

export interface LinkedInFollowers {
  totalFollowers: number;
  asOfDate: string;
  dailyNewFollowers: Array<{
    date: string;
    newFollowers: number;
  }>;
  syncedAt: Timestamp;
}

export interface LinkedInDemographicEntry {
  name: string;
  percentage: string;
}

export interface LinkedInDemographics {
  company: LinkedInDemographicEntry[];
  location: LinkedInDemographicEntry[];
  companySize: LinkedInDemographicEntry[];
  seniority: LinkedInDemographicEntry[];
  jobTitle: LinkedInDemographicEntry[];
  syncedAt: Timestamp;
}

// ===== TDS DATA MODEL =====

export interface TDSArticle {
  id: string;
  title: string;
  pageviewsLifetime: number;
  engagedViewsLifetime: number;
  pageviews30d: number | null;
  engagedViews30d: number | null;
  estimatedPayout: number;
  paid: boolean;
  publishedDate: string;
}

export interface TDSSummary {
  totalArticles: number;
  totalPageviews: number;
  totalEngagedViews: number;
  totalPageviews30d: number;
  totalEngagedViews30d: number;
  totalEarnings: number;
  avgEngagementRate: number;
  syncedAt: Timestamp;
}

// ===== MEDIUM DATA MODEL =====

export interface MediumStory {
  id: string;
  title: string;
  readTime: string;
  publishDate: string;
  presentations: number | null;
  views: number;
  reads: number;
  earnings: number;
  readRate: number;
}

export interface MediumMonthlySummary {
  month: string;
  presentations: number;
  views: number;
  reads: number;
  followersGained: number;
  subscribersGained: number;
}

export interface MediumSummary {
  currentMonth: MediumMonthlySummary;
  totalStories: number;
  totalViews: number;
  totalReads: number;
  totalEarnings: number;
  avgReadRate: number;
  syncedAt: Timestamp;
}

// ===== CROSS-PLATFORM =====

export interface TopPerformingContent {
  title: string;
  platform: 'linkedin' | 'tds' | 'medium';
  reach: number;
  engagement: number;
}

export interface PlatformPerformance {
  platform: 'linkedin' | 'tds' | 'medium';
  totalPieces: number;
  avgReachPerPiece: number;
  avgEngagementRate: number;
}

export interface CrossPlatformMetrics {
  totalReach: number;
  totalEngagement: number;
  totalContentPieces: number;
  totalEarnings: number;
  topPerformingContent: TopPerformingContent[];
  platformPerformance: PlatformPerformance[];
}

export interface PlatformSyncInfo {
  lastSyncAt: Timestamp;
}

export interface LinkedInPlatformSummary extends PlatformSyncInfo {
  totalImpressions: number;
  totalEngagement: number;
  totalFollowers: number;
  postCount: number;
}

export interface TDSPlatformSummary extends PlatformSyncInfo {
  totalPageviews: number;
  totalEngagedViews: number;
  totalEarnings: number;
  articleCount: number;
}

export interface MediumPlatformSummary extends PlatformSyncInfo {
  totalViews: number;
  totalReads: number;
  totalEarnings: number;
  storyCount: number;
}

export interface ContentAnalyticsSummary {
  lastSyncAt: Timestamp;
  platforms: {
    linkedin: LinkedInPlatformSummary | null;
    tds: TDSPlatformSummary | null;
    medium: MediumPlatformSummary | null;
  };
  crossPlatform: CrossPlatformMetrics;
}

// ===== PARSER OUTPUT TYPES =====

export interface ParsedLinkedInData {
  discovery: Omit<LinkedInDiscovery, 'syncedAt'>;
  engagement: LinkedInDailyEngagement[];
  topPosts: LinkedInTopPost[];
  followers: Omit<LinkedInFollowers, 'syncedAt'>;
  demographics: Omit<LinkedInDemographics, 'syncedAt'>;
}

export interface ParsedTDSData {
  articles: TDSArticle[];
  summary: Omit<TDSSummary, 'syncedAt'>;
}

export interface ParsedMediumData {
  stories: MediumStory[];
  summary: Omit<MediumSummary, 'syncedAt'>;
}
