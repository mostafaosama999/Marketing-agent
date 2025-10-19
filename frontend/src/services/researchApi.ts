import { httpsCallable } from 'firebase/functions';
import { functions } from '../app/config/firebase';

/**
 * Trigger the research flow for a company
 */
export const triggerResearchFlow = httpsCallable(functions, 'triggerResearchFlow');

/**
 * Get company analysis
 */
export const researchCompany = httpsCallable(functions, 'researchCompany');

/**
 * Discover company blog
 */
export const discoverBlog = httpsCallable(functions, 'discoverBlog');

/**
 * Generate content ideas
 */
export const generateIdeas = httpsCallable(functions, 'generateIdeas');

/**
 * Create Google Doc with results
 */
export const createGoogleDoc = httpsCallable(functions, 'createGoogleDoc');

/**
 * Health check function
 */
export const healthCheck = httpsCallable(functions, 'healthCheck');

/**
 * Webflow functions
 */
export const discoverWebflowCollections = httpsCallable(functions, 'discoverWebflowCollections');
export const triggerWebflowSync = httpsCallable(functions, 'triggerWebflowSync');
export const webflowHealthCheck = httpsCallable(functions, 'webflowHealthCheck');
export const testWebflowAPI = httpsCallable(functions, 'testWebflowAPI');

// API types for requests/responses
export interface TriggerResearchRequest {
  companyUrl: string;
}

export interface TriggerResearchResponse {
  success: boolean;
  sessionId: string;
  message: string;
}

export interface CompanyAnalysisRequest {
  url: string;
}

export interface BlogDiscoveryRequest {
  companyUrl: string;
  blogUrl?: string;
}

export interface IdeaGenerationRequest {
  companyAnalysis: any;
  blogThemes: string[];
  aiTrends: any[];
  existingTitles: string[];
}

export interface DocGenerationRequest {
  sessionData: any;
}

/**
 * API Cost Info
 */
export interface ApiCostInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
}

/**
 * Qualify a company's blog
 */
export const qualifyCompanyBlog = httpsCallable(functions, 'qualifyCompanyBlog');

export interface QualifyBlogRequest {
  companyName: string;
  website: string;
  leadId: string;
}

export interface QualifyBlogResponse {
  companyName: string;
  website: string;
  hasActiveBlog: boolean;
  blogPostCount: number;
  lastBlogCreatedAt: string;
  hasMultipleAuthors: boolean;
  authorCount: number;
  authorNames: string;
  isDeveloperB2BSaas: boolean;
  authorsAreEmployees: "employees" | "freelancers" | "mixed" | "unknown";
  coversAiTopics: boolean;
  contentSummary: string;
  blogLinkUsed: string;
  rssFeedFound: boolean;
  analysisMethod: "RSS" | "AI" | "RSS + AI (authors)" | "None";
  qualified: boolean;
  costInfo?: ApiCostInfo;
}

/**
 * Find writing programs for a website
 */
export const findWritingProgram = httpsCallable(functions, 'findWritingProgramCloud');

export interface FindWritingProgramRequest {
  website: string;
  useAiFallback?: boolean;
  concurrent?: number;
  timeout?: number;
  leadId?: string;
}

export interface WritingProgramResult {
  url: string;
  exists: boolean;
  status?: number;
  finalUrl?: string;
  error?: string;
}

export interface AIWritingProgramSuggestion {
  url: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  verified: boolean;
  verificationError?: string;
}

export interface FindWritingProgramResponse {
  website: string;
  totalChecked: number;
  validUrls: WritingProgramResult[];
  patternsFound: string[];
  usedAiFallback: boolean;
  aiSuggestions?: AIWritingProgramSuggestion[];
  aiReasoning?: string;
  costInfo?: ApiCostInfo;
}