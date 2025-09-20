// Types for the 7-step content research flow
import { ContentFormat } from './index';

export interface ResearchStep {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  result?: any;
  error?: string;
}

export interface CompanyResearchRequest {
  url: string;
  email?: string;
}

export interface CompanyAnalysis {
  url: string;
  title: string;
  description: string;
  summary: string;
  industry?: string;
  keyProducts: string[];
  targetAudience?: string;
}

export interface BlogAnalysis {
  blogUrl?: string;
  found: boolean;
  recentPosts: BlogPost[];
  themes: string[];
  contentStyle?: string;
  postingFrequency?: string;
}

export interface BlogPost {
  title: string;
  url: string;
  publishedDate?: Date;
  tags?: string[];
  summary?: string;
}

export interface AITrend {
  topic: string;
  frequency: number;
  keywords: string[];
  description?: string;
  source: 'email' | 'manual';
  extractedAt: Date;
}

export interface ContentIdea {
  id: string;
  title: string;
  angle: string;
  format: ContentFormat;
  targetAudience: string;
  productTieIn: string;
  keywords: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedLength?: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
}

export interface ResearchSession {
  id: string;
  companyUrl: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  steps: ResearchStep[];
  companyAnalysis?: CompanyAnalysis;
  blogAnalysis?: BlogAnalysis;
  aiTrends?: AITrend[];
  generatedIdeas?: ContentIdea[];
  uniqueIdeas?: ContentIdea[];
  googleDocUrl?: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

export interface EmailTrendData {
  emails: EmailContent[];
  extractedTrends: AITrend[];
  lastChecked: Date;
}

export interface EmailContent {
  subject: string;
  content: string;
  date: Date;
  sender: string;
}

export interface GoogleDocTemplate {
  companySection: string;
  blogThemesSection: string;
  trendsSection: string;
  ideasSection: string;
}

// API Response types
export interface ResearchApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  step?: number;
}

export interface WebScrapingResponse {
  title: string;
  description: string;
  headings: string[];
  content: string;
  blogUrl?: string;
  navLinks: string[];
}

export interface IdeaGenerationRequest {
  companyAnalysis: CompanyAnalysis;
  blogThemes: string[];
  aiTrends: AITrend[];
  existingTitles: string[];
}

export interface IdeaGenerationResponse {
  ideas: ContentIdea[];
  totalGenerated: number;
  uniqueCount: number;
  duplicatesRemoved: number;
}