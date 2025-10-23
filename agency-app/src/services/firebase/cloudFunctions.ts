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
  analysisMethod: 'RSS' | 'AI' | 'RSS + AI (authors)' | 'None';
  qualified: boolean;
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
