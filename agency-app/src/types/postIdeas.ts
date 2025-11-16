// src/types/postIdeas.ts

import {Timestamp} from 'firebase/firestore';

/**
 * Individual Post Idea
 */
export interface PostIdea {
  id: string; // idea1, idea2, etc.
  hook: string; // 12-18 word headline
  postStyle: string; // e.g., "Listicle", "Contrarian Insight"
  topicAndAngle: string; // 1-2 sentences
  whyThisWorks: string; // Analytics reference
  targetAudience: string; // Specific audience
  estimatedWordCount: string; // e.g., "140-160 words"
}

/**
 * Analytics insights from LinkedIn data
 */
export interface AnalyticsInsights {
  totalPosts: number;
  topTopics: string[];
  bestWordCountRange: string;
  toneStyle: string;
  structurePatterns: string[];
  topHashtags: string[];
  avgImpressions: number;
  avgEngagementRate: number;
}

/**
 * Post Ideas Session
 */
export interface PostIdeasSession {
  id: string;
  userId: string;
  createdAt: Timestamp;

  // The 5 generated ideas
  ideas: PostIdea[];

  // Analysis insights
  analyticsInsights: AnalyticsInsights;
  aiTrends: string[];
  competitorInsights: string[];

  // Metadata
  dataSourceCounts: {
    linkedInPosts: number;
    newsletterEmails: number;
    competitorPosts: number;
  };
  totalCost: number;
  costs: {
    analyticsAnalysis: number;
    newsletterAnalysis: number;
    competitorAnalysis: number;
    ideaGeneration: number;
  };
}

/**
 * API Request/Response types
 */
export interface GeneratePostIdeasResponse {
  success: boolean;
  sessionId: string;
  message: string;
  dataSourceCounts?: {
    linkedInPosts: number;
    newsletterEmails: number;
    competitorPosts: number;
  };
}

export interface GeneratePostFromIdeaRequest {
  sessionId: string;
  ideaId: string;
}

export interface GeneratePostFromIdeaResponse {
  success: boolean;
  jobId: string;
  message: string;
}
