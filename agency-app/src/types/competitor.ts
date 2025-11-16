import { Timestamp } from 'firebase/firestore';

export interface Competitor {
  id: string;
  name: string;
  linkedInUrl: string;
  profileUrl?: string;
  notes?: string;
  addedAt: Timestamp;
  addedBy: string;
  active: boolean;
}

export type PostType = 'text' | 'image' | 'video' | 'carousel' | 'article' | 'poll' | 'document';

export interface MediaInfo {
  type: 'image' | 'video' | 'carousel' | 'document';
  count?: number;
  hasAlt?: boolean;
  description?: string;
}

export interface CompetitorPost {
  id: string;
  competitorId: string;
  competitorName: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  impressions?: number;
  postedDate: string; // Relative format like "2w", "3d", etc.
  postedDateParsed?: Date;
  hashtags: string[];
  mentions: string[];
  postType: PostType;
  mediaInfo?: MediaInfo;
  extractedAt: Timestamp;
  extractedBy: string;
}

export interface CompetitorPostsData {
  competitorId: string;
  competitorName: string;
  posts: CompetitorPost[];
  totalPosts: number;
  extractedAt: Timestamp;
  extractedBy: string;
}

export interface CompetitorSyncMetadata {
  competitorId: string;
  lastSync: Timestamp | null;
  lastSyncSuccess: boolean;
  postCount: number;
  lastSyncBy?: string;
  lastSyncErrors?: string[];
}

export interface CompetitorMetrics {
  competitorId: string;
  competitorName: string;
  totalPosts: number;
  totalLikes: number;
  totalComments: number;
  totalShares: number;
  totalImpressions: number;
  totalEngagement: number;
  avgEngagementRate: number;
  topPost?: CompetitorPost;
  lastPosted?: string;
}

export interface CompetitorComparison {
  competitors: CompetitorMetrics[];
  dateRange?: {
    from: Date;
    to: Date;
  };
}
