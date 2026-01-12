// src/services/firebase/cloudFunctions.ts
// Service for calling Firebase Cloud Functions

import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firestore';

// Initialize Functions with explicit region
const functions = getFunctions(app, 'us-central1');

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
 * Handles both formats:
 * - Legacy: { totalCost, totalTokens }
 * - Offer Analysis: { stage1Cost, stage2Cost, totalCost }
 */
export function formatCost(costInfo?: {
  totalCost?: number;
  totalTokens?: number;
  stage1Cost?: number;
  stage2Cost?: number;
}): string {
  if (!costInfo) return '';

  const totalCost = costInfo.totalCost ?? 0;

  // If totalTokens is available, include token count
  if (costInfo.totalTokens) {
    return `$${totalCost.toFixed(4)} (${costInfo.totalTokens.toLocaleString()} tokens)`;
  }

  // Otherwise just show the cost
  return `$${totalCost.toFixed(4)}`;
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
  excludeCompanies?: Array<{ name: string; website: string }>;
  count?: number;
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
  console.log('=== findCompetitors Service Call ===');
  console.log('Timestamp:', new Date().toISOString());
  console.log('Request:', JSON.stringify(request, null, 2));
  console.log('Functions region:', functions.region);
  console.log('Functions app:', functions.app?.name);

  try {
    console.log('Creating httpsCallable for findCompetitorsV2...');
    const findCompetitorsFunc = httpsCallable<
      FindCompetitorsRequest,
      FindCompetitorsResponse
    >(functions, 'findCompetitorsV2');
    console.log('httpsCallable created successfully');

    console.log('Invoking cloud function...');
    const startTime = Date.now();
    const result = await findCompetitorsFunc(request);
    const endTime = Date.now();

    console.log(`Cloud function completed in ${endTime - startTime}ms`);
    console.log('Result data:', JSON.stringify(result.data, null, 2));
    console.log('=== findCompetitors Service Call Successful ===');

    return result.data;
  } catch (error: any) {
    console.error('=== findCompetitors Service Call FAILED ===');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error code:', error?.code);
    console.error('Error message:', error?.message);
    console.error('Error details:', error?.details);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    console.error('Error stack:', error?.stack);

    // Log Firebase-specific error properties
    if (error?.code) {
      console.error('Firebase error code:', error.code);
    }
    if (error?.details) {
      console.error('Firebase error details:', error.details);
    }

    throw new Error(error.message || 'Failed to find competitors');
  }
}

// Company Offer Analysis Types
export interface CompanyAnalysis {
  companyName: string;
  companyType: 'Generative AI' | 'AI tool' | 'Data science' | 'Service provider' | 'Content maker';
  companySummary: string;
  canTrainLLMs: boolean;
  reliesOnAI: boolean;
  businessModel: 'B2B' | 'B2C' | 'Both';
  country: string;
  linkedinUrl: string | null;
  blogUrl: string | null;
}

export interface BlogIdea {
  title: string;
  whyItFits: string;
  whatReaderLearns: string[];
  keyStackTools: string[];
  angleToAvoidDuplication: string;
  platform?: string;
  specificUse?: string;
  companyTool?: string;
}

export interface CompanyOfferAnalysisRequest {
  companyId: string;
  companyName: string;
  website: string;
  blogContent?: string;
}

export interface CompanyOfferAnalysisResult {
  companyAnalysis: CompanyAnalysis;
  ideas: BlogIdea[];
  promptUsed: 'genai' | 'non-genai';
  costInfo?: {
    totalCost: number;
    totalTokens?: number;
    inputTokens?: number;
    outputTokens?: number;
    stage1Cost?: number;
    stage2Cost?: number;
  };
}

// Stage 1: Website Analysis Response
export interface WebsiteAnalysisResult {
  success: boolean;
  companyAnalysis: CompanyAnalysis;
  costInfo: {
    totalCost: number;
    inputTokens: number;
    outputTokens: number;
  };
  analyzedAt: string;
}

// Stage 2: Idea Generation Response
export interface IdeaGenerationResult {
  success: boolean;
  ideas: BlogIdea[];
  promptUsed: 'genai' | 'non-genai';
  costInfo: {
    totalCost: number;
    inputTokens: number;
    outputTokens: number;
  };
  generatedAt: string;
}

// Extended timeout: 5 minutes (300000 ms) for each stage
const EXTENDED_TIMEOUT = 300000;

/**
 * Stage 1: Analyze company website to determine company type
 * Returns company analysis (type, summary, etc.)
 */
export async function analyzeCompanyWebsite(
  companyId: string,
  companyName: string,
  website: string,
  blogContent?: string
): Promise<WebsiteAnalysisResult> {
  const analyzeWebsite = httpsCallable<
    { companyId: string; companyName: string; website: string; blogContent?: string },
    WebsiteAnalysisResult
  >(functions, 'analyzeCompanyWebsiteCloud', { timeout: EXTENDED_TIMEOUT });

  const result = await analyzeWebsite({
    companyId,
    companyName,
    website,
    blogContent,
  });

  return result.data;
}

/**
 * Stage 2: Generate blog ideas based on company analysis
 * Requires company analysis from Stage 1
 */
export async function generateOfferIdeas(
  companyId: string,
  companyName: string,
  website: string,
  companyAnalysis: CompanyAnalysis,
  blogContent?: string
): Promise<IdeaGenerationResult> {
  const generateIdeas = httpsCallable<
    {
      companyId: string;
      companyName: string;
      website: string;
      companyAnalysis: CompanyAnalysis;
      blogContent?: string;
    },
    IdeaGenerationResult
  >(functions, 'generateOfferIdeasCloud', { timeout: EXTENDED_TIMEOUT });

  const result = await generateIdeas({
    companyId,
    companyName,
    website,
    companyAnalysis,
    blogContent,
  });

  return result.data;
}

/**
 * Analyze company and generate blog ideas (two-step process)
 * Step 1: Website analysis → returns company type (displayed immediately)
 * Step 2: Idea generation → returns blog ideas
 *
 * @param onStage1Complete - Optional callback when stage 1 completes (for incremental UI updates)
 */
export async function analyzeCompanyOfferTwoStep(
  companyId: string,
  companyName: string,
  website: string,
  blogContent?: string,
  onStage1Complete?: (analysis: CompanyAnalysis, cost: number) => void
): Promise<CompanyOfferAnalysisResult> {
  // Stage 1: Analyze website
  const stage1Result = await analyzeCompanyWebsite(
    companyId,
    companyName,
    website,
    blogContent
  );

  // Notify callback if provided (for incremental UI)
  if (onStage1Complete) {
    onStage1Complete(stage1Result.companyAnalysis, stage1Result.costInfo.totalCost);
  }

  // Stage 2: Generate ideas
  const stage2Result = await generateOfferIdeas(
    companyId,
    companyName,
    website,
    stage1Result.companyAnalysis,
    blogContent
  );

  // Combine results
  return {
    companyAnalysis: stage1Result.companyAnalysis,
    ideas: stage2Result.ideas,
    promptUsed: stage2Result.promptUsed,
    costInfo: {
      stage1Cost: stage1Result.costInfo.totalCost,
      stage2Cost: stage2Result.costInfo.totalCost,
      totalCost: stage1Result.costInfo.totalCost + stage2Result.costInfo.totalCost,
    },
  };
}

/**
 * Legacy function - calls the original combined cloud function
 * @deprecated Use analyzeCompanyOfferTwoStep for better reliability
 */
export async function analyzeCompanyOffer(
  companyId: string,
  companyName: string,
  website: string,
  blogContent?: string
): Promise<CompanyOfferAnalysisResult> {
  const analyzeOffer = httpsCallable<
    CompanyOfferAnalysisRequest,
    CompanyOfferAnalysisResult
  >(functions, 'analyzeCompanyOffer', { timeout: EXTENDED_TIMEOUT });

  const result = await analyzeOffer({
    companyId,
    companyName,
    website,
    blogContent,
  });

  return result.data;
}
