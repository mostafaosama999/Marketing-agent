// functions/src/linkedinGeneration/postIdeasTypes.ts

import {Timestamp} from 'firebase-admin/firestore';

/**
 * Individual Post Idea structure
 */
export interface PostIdea {
  id: string; // Unique ID for the idea (idea1, idea2, etc.)
  hook: string; // 12-18 word headline
  postStyle: string; // e.g., "Listicle", "Contrarian Insight", "Personal Story"
  topicAndAngle: string; // 1-2 sentences explaining the idea
  whyThisWorks: string; // Reference to analytics insights
  targetAudience: string; // Specific audience description
  estimatedWordCount: string; // e.g., "140-160 words"
}

/**
 * Analytics insights extracted from LinkedIn data
 */
export interface AnalyticsInsights {
  totalPosts: number;
  topTopics: string[]; // Most successful themes
  bestWordCountRange: string; // e.g., "130-160 words"
  toneStyle: string; // e.g., "Direct, opinionated, technical"
  structurePatterns: string[]; // e.g., ["Strong one-liner hook", "Use of lists"]
  topHashtags: string[]; // Most used hashtags
  avgImpressions: number;
  avgEngagementRate: number;
}

/**
 * Post Ideas Session - stored in Firestore
 */
export interface PostIdeasSession {
  id: string;
  userId: string;
  createdAt: Timestamp;

  // The 5 generated ideas
  ideas: PostIdea[];

  // Analysis insights
  analyticsInsights: AnalyticsInsights;
  aiTrends: string[]; // Top AI trends identified from newsletters
  competitorInsights: string[]; // Key insights from competitor analysis

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
 * Request to generate post ideas
 */
export interface GeneratePostIdeasRequest {
  // No parameters needed - will fetch from Firestore automatically
}

/**
 * Response from post ideas generation
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

/**
 * Request to generate full post from selected idea
 */
export interface GeneratePostFromIdeaRequest {
  sessionId: string; // Which ideas session
  ideaId: string; // Which idea to use (idea1, idea2, etc.)
}

/**
 * Response from full post generation
 */
export interface GeneratePostFromIdeaResponse {
  success: boolean;
  jobId: string; // Points to linkedInGenerationJobs collection
  message: string;
}

/**
 * OpenAI response for analytics analysis
 */
export interface AnalyticsAnalysisResponse {
  topTopics: string[];
  bestWordCountRange: string;
  toneStyle: string;
  structurePatterns: string[];
  topHashtags: string[];
}

/**
 * OpenAI response for newsletter trends analysis
 */
export interface NewsletterTrendsResponse {
  trends: string[]; // Array of trend descriptions
}

/**
 * OpenAI response for competitor insights
 */
export interface CompetitorInsightsResponse {
  insights: string[]; // Array of key insights
  overusedTopics: string[];
  contentGaps: string[];
}

/**
 * OpenAI response for post ideas generation
 */
export interface PostIdeasGenerationResponse {
  ideas: Array<{
    hook: string;
    postStyle: string;
    topicAndAngle: string;
    whyThisWorks: string;
    targetAudience: string;
    estimatedWordCount: string;
  }>;
}
