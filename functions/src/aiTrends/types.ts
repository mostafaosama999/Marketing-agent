/**
 * AI Trends Analysis Types - Backend
 */

export interface AITrend {
  id?: string;
  title: string;
  description: string;
  category: 'models' | 'techniques' | 'applications' | 'tools' | 'research' | 'industry';
  relevanceScore: number;
  keyPoints?: string[];
  sources?: string[];
  leadershipAngle?: string;
}

export interface AITrendsRequest {
  emailCount?: number;
  customPrompt?: string;
}

export interface AITrendsResponse {
  success: boolean;
  session: {
    id: string;
    userId: string;
    trends: AITrend[];
    generatedAt: Date;
    emailCount: number;
    customPrompt?: string;
    totalCost: number;
    model: string;
  };
  message: string;
  costInfo: {
    promptTokens: number;
    completionTokens: number;
    totalCost: number;
  };
}

export interface EmailData {
  id: string;
  subject: string;
  body: string;
  from: {
    email: string;
    name: string;
  };
  receivedAt: Date;
}
