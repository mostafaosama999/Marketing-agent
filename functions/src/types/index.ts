// Shared types for Cloud Functions
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
  source: "email" | "manual";
  extractedAt: Date;
}

export interface ContentIdea {
  id: string;
  title: string;
  angle: string;
  format: string;
  targetAudience: string;
  productTieIn: string;
  keywords: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedLength?: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
}

export interface ResearchStep {
  id: number;
  title: string;
  description: string;
  status: "pending" | "in_progress" | "completed" | "error";
  result?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  duration?: number; // Duration in milliseconds
}

export interface ResearchSession {
  id: string;
  companyUrl: string;
  status: "pending" | "in_progress" | "completed" | "error";
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

export interface GoogleDocTemplate {
  companySection: string;
  blogThemesSection: string;
  trendsSection: string;
  ideasSection: string;
}