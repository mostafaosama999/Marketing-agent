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