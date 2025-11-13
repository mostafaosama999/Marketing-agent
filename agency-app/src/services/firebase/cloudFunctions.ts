// src/services/firebase/cloudFunctions.ts
// Service for calling Firebase Cloud Functions

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firestore';

// Initialize Functions
const functions = getFunctions(app);

// Types for cloud function requests/responses
export interface WritingProgramResult {
  website: string;
  totalChecked: number;
  validUrls: Array<{
    url: string;
    exists: boolean;
    status?: number;
    finalUrl?: string;
  }>;
  patternsFound: string[];
  usedAiFallback: boolean;
  aiSuggestions?: Array<{
    url: string;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    verified: boolean;
    verificationError?: string;
  }>;
  aiReasoning?: string;
  costInfo?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
}

export interface BlogQualificationResult {
  companyName: string;
  website: string;
  hasActiveBlog: boolean;
  blogPostCount: number;
  lastBlogCreatedAt: string;
  hasMultipleAuthors: boolean;
  authorCount: number;
  authorNames: string;
  isDeveloperB2BSaas: boolean;
  authorsAreEmployees: 'employees' | 'freelancers' | 'mixed' | 'unknown';
  coversAiTopics: boolean;
  contentSummary: string;
  blogLinkUsed: string;
  rssFeedFound: boolean;
  analysisMethod: 'RSS' | 'AI' | 'RSS + AI (authors)' | 'RSS + AI (content)' | 'None';
  qualified: boolean;
  costInfo?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
  // Content quality fields
  contentQualityRating?: 'low' | 'medium' | 'high';
  contentQualityReasoning?: string;
  lastPostUrl?: string;
  rssFeedUrl?: string;
  // Enhanced content analysis fields
  isAIWritten?: boolean;
  aiWrittenConfidence?: 'low' | 'medium' | 'high';
  aiWrittenEvidence?: string;
  hasCodeExamples?: boolean;
  codeExamplesCount?: number;
  codeLanguages?: string[];
  hasDiagrams?: boolean;
  diagramsCount?: number;
  technicalDepth?: 'beginner' | 'intermediate' | 'advanced';
  funnelStage?: 'top' | 'middle' | 'bottom';
  exampleQuotes?: string[];
}

export interface WritingProgramAnalysisResult {
  programUrl: string;
  hasProgram: boolean;
  isOpen: boolean | null;
  openDates?: {
    openFrom: string;
    closedFrom: string;
  } | null;
  payment: {
    amount: string | null;           // e.g., "$300 to $500"
    method: string | null;            // e.g., "Deel", "PayPal", "gift cards"
    details: string | null;           // Additional info: bonuses, performance-based, etc.
    sourceSnippet: string | null;     // Quoted proof from the page (max ~200 chars)
    historical: string | null;        // Previous payment rates if mentioned
  };
  requirements?: string[];
  requirementTypes?: string[]; // Classified categories: "Idea", "Case study", etc.
  submissionGuidelines?: string;
  contactEmail?: string;
  responseTime?: string;
  programDetails: string;
  aiReasoning: string;
  costInfo?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
}

/**
 * Analyze company's writing program
 */
export async function analyzeWritingProgram(
  companyWebsite: string
): Promise<WritingProgramResult> {
  try {
    const findWritingProgram = httpsCallable<
      { website: string },
      WritingProgramResult
    >(functions, 'findWritingProgramCloud');

    const result = await findWritingProgram({ website: companyWebsite });
    return result.data;
  } catch (error: any) {
    console.error('Error analyzing writing program:', error);
    throw new Error(
      error.message || 'Failed to analyze writing program'
    );
  }
}

/**
 * Analyze company's blog
 */
export async function analyzeBlog(
  companyName: string,
  companyWebsite: string
): Promise<BlogQualificationResult> {
  try {
    const qualifyBlog = httpsCallable<
      { companyName: string; website: string },
      BlogQualificationResult
    >(functions, 'qualifyCompanyBlog');

    const result = await qualifyBlog({
      companyName,
      website: companyWebsite,
    });

    return result.data;
  } catch (error: any) {
    console.error('Error analyzing blog:', error);
    throw new Error(error.message || 'Failed to analyze blog');
  }
}

/**
 * Analyze detailed information for a specific writing program URL
 */
export async function analyzeWritingProgramDetails(
  programUrl: string,
  companyId?: string,
  leadId?: string
): Promise<WritingProgramAnalysisResult> {
  try {
    const analyzeDetails = httpsCallable<
      { programUrl: string; companyId?: string; leadId?: string },
      WritingProgramAnalysisResult
    >(functions, 'analyzeWritingProgramDetailsCloud');

    const result = await analyzeDetails({
      programUrl,
      companyId,
      leadId,
    });

    return result.data;
  } catch (error: any) {
    console.error('Error analyzing writing program details:', error);
    throw new Error(error.message || 'Failed to analyze writing program details');
  }
}

/**
 * Format cost info for display
 */
export function formatCost(costInfo?: {
  totalCost: number;
  totalTokens: number;
}): string {
  if (!costInfo) return '';
  return `$${costInfo.totalCost.toFixed(4)} (${costInfo.totalTokens.toLocaleString()} tokens)`;
}

/**
 * Extract payment info from AI reasoning
 * Looks for dollar amounts and payment-related keywords
 */
export function extractPaymentInfo(
  aiSuggestions?: Array<{ reasoning: string }>
): {
  amount: string | null;
  historical: string | null;
} {
  if (!aiSuggestions || aiSuggestions.length === 0) {
    return { amount: null, historical: null };
  }

  const allReasoning = aiSuggestions.map(s => s.reasoning).join(' ');
  const lowerReasoning = allReasoning.toLowerCase();

  // Look for dollar amounts
  const dollarRegex = /\$\s*(\d{1,3}(?:,?\d{3})*(?:\.\d{2})?)/g;
  const matches = allReasoning.match(dollarRegex);

  let amount: string | null = null;
  let historical: string | null = null;

  if (matches && matches.length > 0) {
    // Look for keywords to distinguish current vs historical
    if (lowerReasoning.includes('previously') || lowerReasoning.includes('used to')) {
      historical = matches[0];
    } else if (lowerReasoning.includes('currently') || lowerReasoning.includes('pay')) {
      amount = matches[0];
    } else {
      // Default to current amount
      amount = matches[0];
    }

    // If multiple amounts found, try to categorize
    if (matches.length > 1) {
      if (lowerReasoning.includes('previously')) {
        historical = matches[0];
        amount = matches[1];
      }
    }
  }

  return { amount, historical };
}

/**
 * Extract open/closed status from AI reasoning
 */
export function extractProgramStatus(
  aiSuggestions?: Array<{ reasoning: string }>
): {
  isOpen: boolean | null;
  openDates: { openFrom: string; closedFrom: string } | null;
} {
  if (!aiSuggestions || aiSuggestions.length === 0) {
    return { isOpen: null, openDates: null };
  }

  const allReasoning = aiSuggestions.map(s => s.reasoning).join(' ').toLowerCase();

  // Check for explicit status
  let isOpen: boolean | null = null;

  if (
    allReasoning.includes('currently open') ||
    allReasoning.includes('accepting submissions') ||
    allReasoning.includes('now open')
  ) {
    isOpen = true;
  } else if (
    allReasoning.includes('currently closed') ||
    allReasoning.includes('not accepting') ||
    allReasoning.includes('temporarily closed') ||
    allReasoning.includes('on hold')
  ) {
    isOpen = false;
  }

  // Try to extract dates (simplified - could be enhanced)
  let openDates: { openFrom: string; closedFrom: string } | null = null;

  const monthRegex = /(january|february|march|april|may|june|july|august|september|october|november|december)/gi;
  const months = allReasoning.match(monthRegex);

  if (months && months.length >= 2) {
    openDates = {
      openFrom: months[0],
      closedFrom: months[1],
    };
  }

  return { isOpen, openDates };
}

/**
 * Generate AI-powered blog ideas for a company
 */
export interface GenerateCompanyIdeasRequest {
  companyId: string;
  prompt: string;
  context?: {
    companyName?: string;
    website?: string;
    industry?: string;
    blogUrl?: string;
  };
}

export interface GenerateCompanyIdeasResponse {
  ideas: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  totalGenerated: number;
  sessionId: string;
  costInfo?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
}

export async function generateCompanyIdeas(
  request: GenerateCompanyIdeasRequest
): Promise<GenerateCompanyIdeasResponse> {
  try {
    const generateIdeas = httpsCallable<
      GenerateCompanyIdeasRequest,
      GenerateCompanyIdeasResponse
    >(functions, 'generateCustomIdeasCloud');

    const result = await generateIdeas(request);
    return result.data;
  } catch (error: any) {
    console.error('Error generating company ideas:', error);
    throw new Error(error.message || 'Failed to generate ideas');
  }
}

// Find Competitors Types
export interface FindCompetitorsRequest {
  companyId: string;
  companyName: string;
  website?: string;
  description?: string;
  industry?: string;
}

export interface Competitor {
  name: string;
  website: string;
  description: string;
  companySize: string;
  whyCompetitor: string;
}

export interface FindCompetitorsResponse {
  competitors: Competitor[];
  companyName: string;
  analysisComplete: boolean;
  costInfo?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
    model: string;
  };
}

export async function findCompetitors(
  request: FindCompetitorsRequest
): Promise<FindCompetitorsResponse> {
  try {
    const findCompetitorsFunc = httpsCallable<
      FindCompetitorsRequest,
      FindCompetitorsResponse
    >(functions, 'findCompetitors');

    const result = await findCompetitorsFunc(request);
    return result.data;
  } catch (error: any) {
    console.error('Error finding competitors:', error);
    throw new Error(error.message || 'Failed to find competitors');
  }
}
