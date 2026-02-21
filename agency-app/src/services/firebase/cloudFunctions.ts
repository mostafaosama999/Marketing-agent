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

// ============================================================
// V2 Blog Idea Generation Types
// ============================================================

/**
 * V2 Blog Idea - enhanced with personalization fields
 */
export interface BlogIdeaV2 {
  title: string;
  whyOnlyTheyCanWriteThis: string;
  specificEvidence: string;
  targetGap: string;
  audienceFit: string;
  whatReaderLearns: string[];
  keyStackTools: string[];
  angleToAvoidDuplication: string;
  differentiatorUsed?: string;
  contentGapFilled?: string;
  probability?: number;
  // AI Concept fields (V2 enhancement)
  aiConcept?: string;              // Which AI concept this relates to (if any)
  isConceptTutorial?: boolean;     // Is this a bottom-of-funnel AI tutorial?
  conceptFitScore?: number;        // How well the concept fits (from matching)
}

/**
 * Validation scores for V2 ideas
 */
export interface IdeaValidationScores {
  personalization: number;
  uniqueness: number;
  buzzwordDensity: number;
  audienceRelevance: number;
  timeliness: number;
  overallScore: number;
}

/**
 * V2 Idea Validation Result
 */
export interface IdeaValidationResult {
  idea: BlogIdeaV2;
  isValid: boolean;
  scores: IdeaValidationScores;
  rejectionReason?: string;
  improvementSuggestion?: string;
}

/**
 * Company Profile from V2 analysis
 */
export interface CompanyProfileV2 {
  companyName: string;
  uniqueDifferentiators: Array<{
    claim: string;
    evidence: string;
    uniquenessScore: number;
    category: string;
  }>;
  targetAudience: {
    primary: string;
    secondary: string;
    sophisticationLevel: 'beginner' | 'intermediate' | 'advanced';
    jobTitles: string[];
    industries: string[];
  };
  contentStyle: {
    tone: string;
    technicalDepth: 'low' | 'medium' | 'high';
    formatPreferences: string[];
    topicsTheyLike: string[];
    topicsToAvoid: string[];
  };
  growthSignals: {
    stage: 'early' | 'growth' | 'mature';
    fundingStage: string | null;
    teamSize: string | null;
    recentChanges: string[];
    likelyPriorities: string[];
  };
  techStack: string[];
  companyType: string;
  oneLinerDescription: string;
}

/**
 * Content Gap from V2 analysis
 */
export interface ContentGap {
  topic: string;
  gapType: 'tech_stack' | 'audience' | 'differentiation' | 'funnel' | 'trending';
  whyItMatters: string;
  whyTheyrePositioned: string;
  howItDiffersFromCompetitors: string;
  suggestedAngle: string;
  priorityScore: number;
}

/**
 * V2 Result structure (from 4-stage personalized pipeline)
 */
export interface V2IdeaGenerationResult {
  success: boolean;
  version: 'v2';
  ideas: BlogIdeaV2[];
  validationResults: IdeaValidationResult[];
  companyProfile: CompanyProfileV2;
  contentGaps: ContentGap[];
  matchedConcepts?: MatchedConceptSimple[];
  allConcepts?: RawConceptSimple[];
  conceptsEvaluated?: number;
  costInfo: {
    stage0Cost: number;
    stage1Cost: number;
    stage1_5Cost: number;
    stage2Cost: number;
    stage3Cost: number;
    stage4Cost: number;
    totalCost: number;
  };
  generatedAt: string;
  rejectedCount: number;
  regenerationAttempts: number;
}

/**
 * V3 Blog Idea - trend-relevance fusion output
 */
export interface BlogIdeaV3 {
  title: string;
  whyOnlyTheyCanWriteThis: string;
  specificEvidence: string;
  targetGap: string;
  audienceFit: string;
  whatReaderLearns: string[];
  keyStackTools: string[];
  angleToAvoidDuplication: string;
  differentiatorUsed?: string;
  contentGapFilled?: string;
  probability?: number;
  aiConcept?: string;
  isConceptTutorial?: boolean;
  conceptFitScore?: number;
  trendEvidence: string;
  productTrendIntegration: string;
  trendFreshnessScore: number;
  sourceConceptType?: 'curated' | 'dynamic';
}

export interface V3MatchedConcept {
  concept: {
    id: string;
    name: string;
    description: string;
    whyHot: string;
    useCases: string[];
    keywords: string[];
    category: 'paradigm' | 'technique' | 'protocol' | 'architecture' | 'tool';
    hypeLevel: 'emerging' | 'peak' | 'maturing' | 'declining';
    lastUpdated: string;
    sourceType: 'curated' | 'dynamic';
    freshnessScore: number;
    evidenceCount: number;
    confidenceScore: number;
  };
  fitScore: number;
  fitReason: string;
  productIntegration: string;
  tutorialAngle: string;
  fromFallback: boolean;
}

export interface V3ValidationResult {
  idea: BlogIdeaV3;
  isValid: boolean;
  scores: {
    companyRelevance: number;
    trendFreshness: number;
    productTrendIntegration: number;
    audienceRelevance: number;
    developerActionability: number;
    overallScore: number;
  };
  rejectionReason?: string;
  improvementSuggestion?: string;
}

export interface V3IdeaGenerationResult {
  success: boolean;
  version: 'v3';
  ideas: BlogIdeaV3[];
  validationResults: V3ValidationResult[];
  companyProfile: CompanyProfileV2;
  contentGaps: ContentGap[];
  matchedConcepts: V3MatchedConcept[];
  trendConceptsUsed: V3MatchedConcept['concept'][];
  debug: {
    stage0: {
      cached: boolean;
      dynamicExtractionFailed: boolean;
      curatedCount: number;
      dynamicCount: number;
      mergedCount: number;
      selectedForMatching: number;
    };
    stage1: {
      differentiatorsFound: number;
      techStackCount: number;
    };
    stage1_5: {
      rankedCandidates: number;
      matchedCount: number;
      fallbackUsed: boolean;
      fallbackInjectedCount: number;
      rejectedSample: string[];
    };
    stage2: {
      gapsFound: number;
      topGapTopics: string[];
    };
    stage3Attempts: Array<{
      attempt: number;
      generatedCount: number;
      conceptTutorialCount: number;
      cost: number;
      rejectionSummaryUsed?: string;
    }>;
    stage4Attempts: Array<{
      attempt: number;
      validCount: number;
      rejectedCount: number;
      cost: number;
      topRejectionReasons: string[];
    }>;
    degradedMode: boolean;
  };
  costInfo: {
    stage0Cost: number;
    stage1Cost: number;
    stage1_5Cost: number;
    stage2Cost: number;
    stage3Cost: number;
    stage4Cost: number;
    totalCost: number;
  };
  generatedAt: string;
  regenerationAttempts: number;
  rejectedCount: number;
}

// Extended timeout for V2: 9 minutes (540000 ms) - 4-stage pipeline takes longer
const V2_TIMEOUT = 540000;

/**
 * Generate offer ideas using V2 personalized 4-stage pipeline
 *
 * Stage 1: Analyze company differentiators
 * Stage 2: Identify content gaps
 * Stage 3: Generate ideas from company context
 * Stage 4: Validate and filter ideas
 */
export async function generateOfferIdeasV2(
  companyId: string,
  companyName: string,
  website: string,
  apolloData?: {
    industry?: string | null;
    industries?: string[];
    employeeCount?: number | null;
    employeeRange?: string | null;
    foundedYear?: number | null;
    totalFunding?: number | null;
    totalFundingFormatted?: string | null;
    latestFundingStage?: string | null;
    technologies?: string[];
    keywords?: string[];
    description?: string | null;
  },
  blogAnalysis?: {
    isTechnical?: boolean;
    hasCodeExamples?: boolean;
    hasDiagrams?: boolean;
    isDeveloperB2BSaas?: boolean;
    monthlyFrequency?: number;
    contentSummary?: string;
    rating?: 'low' | 'medium' | 'high';
  },
  companyType?: 'Generative AI' | 'AI tool' | 'Data science' | 'Service provider' | 'Content maker'
): Promise<V2IdeaGenerationResult> {
  const generateIdeasV2 = httpsCallable<
    {
      companyId: string;
      companyName: string;
      website: string;
      apolloData?: typeof apolloData;
      blogAnalysis?: typeof blogAnalysis;
      companyType?: typeof companyType;
    },
    V2IdeaGenerationResult
  >(functions, 'generateOfferIdeasV2Cloud', { timeout: V2_TIMEOUT });

  const result = await generateIdeasV2({
    companyId,
    companyName,
    website,
    apolloData,
    blogAnalysis,
    companyType,
  });

  return result.data;
}

/**
 * Generate offer ideas using independent V3 trend-relevance fusion pipeline
 */
export async function generateOfferIdeasV3(
  companyId: string,
  companyName: string,
  website: string,
  apolloData?: {
    industry?: string | null;
    industries?: string[];
    employeeCount?: number | null;
    employeeRange?: string | null;
    foundedYear?: number | null;
    totalFunding?: number | null;
    totalFundingFormatted?: string | null;
    latestFundingStage?: string | null;
    technologies?: string[];
    keywords?: string[];
    description?: string | null;
  },
  blogAnalysis?: {
    isTechnical?: boolean;
    hasCodeExamples?: boolean;
    hasDiagrams?: boolean;
    isDeveloperB2BSaas?: boolean;
    monthlyFrequency?: number;
    contentSummary?: string;
    rating?: 'low' | 'medium' | 'high';
  },
  companyType?: 'Generative AI' | 'AI tool' | 'Data science' | 'Service provider' | 'Content maker',
  specificRequirements?: string
): Promise<V3IdeaGenerationResult> {
  const generateIdeasV3 = httpsCallable<
    {
      companyId: string;
      companyName: string;
      website: string;
      apolloData?: typeof apolloData;
      blogAnalysis?: typeof blogAnalysis;
      companyType?: typeof companyType;
      specificRequirements?: string;
    },
    V3IdeaGenerationResult
  >(functions, 'generateOfferIdeasV3Cloud', { timeout: V2_TIMEOUT });

  const result = await generateIdeasV3({
    companyId,
    companyName,
    website,
    apolloData,
    blogAnalysis,
    companyType,
    specificRequirements,
  });

  return result.data;
}

// ============================================================
// V2 Staged Cloud Functions (Progressive UI Updates)
// ============================================================

// Stage 1 timeout: 2 minutes
const V2_STAGE_TIMEOUT = 120000;

// Stage 3 timeout: 3 minutes (idea generation takes longer)
const V2_STAGE3_TIMEOUT = 180000;

/**
 * V2 Stage 1: Analyze company differentiators
 * Returns: Company profile with unique differentiators
 * Typical time: 15-20 seconds
 */
export interface V2Stage1Response {
  success: boolean;
  profile: CompanyProfileV2;
  costInfo: {
    totalCost: number;
    inputCost: number;
    outputCost: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    model: string;
  };
  analyzedAt: string;
}

export async function v2Stage1Differentiators(
  companyId: string,
  companyName: string,
  website: string,
  apolloData?: {
    industry?: string | null;
    industries?: string[];
    employeeCount?: number | null;
    employeeRange?: string | null;
    foundedYear?: number | null;
    totalFunding?: number | null;
    totalFundingFormatted?: string | null;
    latestFundingStage?: string | null;
    technologies?: string[];
    keywords?: string[];
    description?: string | null;
  },
  blogAnalysis?: {
    isTechnical?: boolean;
    hasCodeExamples?: boolean;
    hasDiagrams?: boolean;
    isDeveloperB2BSaas?: boolean;
    monthlyFrequency?: number;
    contentSummary?: string;
    rating?: 'low' | 'medium' | 'high';
  },
  companyType?: 'Generative AI' | 'AI tool' | 'Data science' | 'Service provider' | 'Content maker'
): Promise<V2Stage1Response> {
  const stage1 = httpsCallable<
    {
      companyId: string;
      companyName: string;
      website: string;
      apolloData?: typeof apolloData;
      blogAnalysis?: typeof blogAnalysis;
      companyType?: typeof companyType;
    },
    V2Stage1Response
  >(functions, 'v2Stage1Cloud', { timeout: V2_STAGE_TIMEOUT });

  const result = await stage1({
    companyId,
    companyName,
    website,
    apolloData,
    blogAnalysis,
    companyType,
  });

  return result.data;
}

/**
 * V2 Stage 2: Analyze content gaps
 * Returns: List of content gap opportunities
 * Typical time: 15-20 seconds
 */
export interface V2Stage2Response {
  success: boolean;
  gaps: ContentGap[];
  costInfo: {
    totalCost: number;
    inputCost: number;
    outputCost: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    model: string;
  };
  analyzedAt: string;
}

export async function v2Stage2ContentGaps(
  companyId: string,
  profile: CompanyProfileV2,
  blogContentSummary?: string
): Promise<V2Stage2Response> {
  const stage2 = httpsCallable<
    {
      companyId: string;
      profile: CompanyProfileV2;
      blogContentSummary?: string;
    },
    V2Stage2Response
  >(functions, 'v2Stage2Cloud', { timeout: V2_STAGE_TIMEOUT });

  const result = await stage2({
    companyId,
    profile,
    blogContentSummary,
  });

  return result.data;
}

/**
 * V2 Stage 1.5: AI Concept Matching
 * Fetches trending AI concepts and matches them to the company
 * Returns: Matched AI concepts for bottom-of-funnel tutorials
 * Typical time: 5-15 seconds (concepts are cached 24h)
 */
export interface MatchedConceptSimple {
  name: string;
  fitScore: number;
  fitReason: string;
  productIntegration: string;
  tutorialAngle: string;
}

export interface RawConceptSimple {
  name: string;
  description: string;
  whyHot: string;
  useCases: string[];
  category: string;
  hypeLevel: string;
}

export interface V2Stage1_5Response {
  success: boolean;
  matchedConcepts: MatchedConceptSimple[];
  allConcepts: RawConceptSimple[];
  conceptsEvaluated: number;
  stage0Cost: number;
  stage1_5Cost: number;
  cached: boolean;
  stale?: boolean;
  ageHours?: number;
  generatedAt: string;
}

export async function v2Stage1_5ConceptMatching(
  companyId: string,
  profile: CompanyProfileV2
): Promise<V2Stage1_5Response> {
  const stage1_5 = httpsCallable<
    {
      companyId: string;
      profile: CompanyProfileV2;
    },
    V2Stage1_5Response
  >(functions, 'v2Stage1_5Cloud', { timeout: V2_STAGE_TIMEOUT });

  const result = await stage1_5({
    companyId,
    profile,
  });

  return result.data;
}

/**
 * V2 Stage 3: Generate ideas
 * Returns: Raw blog ideas (before validation)
 * Typical time: 20-30 seconds
 * Enhanced: Now accepts optional matchedConcepts for AI concept tutorials
 */
export interface V2Stage3Response {
  success: boolean;
  ideas: BlogIdeaV2[];
  costInfo: {
    totalCost: number;
    inputCost: number;
    outputCost: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    model: string;
  };
  generatedAt: string;
}

export async function v2Stage3GenerateIdeas(
  companyId: string,
  profile: CompanyProfileV2,
  gaps: ContentGap[],
  matchedConcepts?: MatchedConceptSimple[],
  allConcepts?: RawConceptSimple[]
): Promise<V2Stage3Response> {
  const stage3 = httpsCallable<
    {
      companyId: string;
      profile: CompanyProfileV2;
      gaps: ContentGap[];
      matchedConcepts?: MatchedConceptSimple[];
      allConcepts?: RawConceptSimple[];
    },
    V2Stage3Response
  >(functions, 'v2Stage3Cloud', { timeout: V2_STAGE3_TIMEOUT });

  const result = await stage3({
    companyId,
    profile,
    gaps,
    matchedConcepts,
    allConcepts,
  });

  return result.data;
}

/**
 * V2 Stage 4: Validate ideas
 * Returns: Validated ideas with scores
 * Typical time: 10-15 seconds (uses GPT-4o-mini)
 */
export interface V2Stage4Response {
  success: boolean;
  validIdeas: IdeaValidationResult[];
  rejectedIdeas: IdeaValidationResult[];
  costInfo: {
    totalCost: number;
    inputCost: number;
    outputCost: number;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    model: string;
  };
  validatedAt: string;
}

export async function v2Stage4ValidateIdeas(
  companyId: string,
  ideas: BlogIdeaV2[],
  profile: CompanyProfileV2
): Promise<V2Stage4Response> {
  const stage4 = httpsCallable<
    {
      companyId: string;
      ideas: BlogIdeaV2[];
      profile: CompanyProfileV2;
    },
    V2Stage4Response
  >(functions, 'v2Stage4Cloud', { timeout: V2_STAGE_TIMEOUT });

  const result = await stage4({
    companyId,
    ideas,
    profile,
  });

  return result.data;
}

// ============================================================
// Blog Audit (Agentic Competitive Analysis)
// ============================================================

export interface BlogAuditRequest {
  companyId: string;
  companyName: string;
  website: string;
  apolloData?: {
    industry?: string;
    industries?: string[];
    technologies?: string[];
    description?: string;
    keywords?: string[];
    employeeRange?: string;
  };
  blogAnalysis?: {
    blogUrl?: string | null;
    monthlyFrequency?: number;
    contentSummary?: string;
    blogNature?: {
      isTechnical?: boolean;
      rating?: string;
      hasCodeExamples?: boolean;
    };
  };
}

export interface BlogAuditResult {
  success: boolean;
  offerParagraph: string;
  internalJustification: string;
  companyBlogSnapshot: {
    blogUrl: string;
    postsPerMonth: number;
    recentTopics: string[];
    contentTypes: string[];
    recentPosts: Array<{ title: string; date: string; url?: string }>;
  };
  competitorSnapshots: Array<{
    companyName: string;
    blogUrl: string;
    postsPerMonth: number;
    recentTopics: string[];
    notableStrengths: string;
  }>;
  competitorsAnalyzed: number;
  agentIterations: number;
  toolCallsCount: number;
  costInfo: {
    totalCost: number;
    totalTokens: number;
    iterationCosts: number[];
  };
  generatedAt: string;
  model: string;
}

/**
 * Generate Blog Audit using agentic ReAct pipeline
 * Analyzes company blog vs competitors and produces offer paragraph
 */
export async function generateBlogAudit(
  companyId: string,
  companyName: string,
  website: string,
  apolloData?: BlogAuditRequest['apolloData'],
  blogAnalysis?: BlogAuditRequest['blogAnalysis']
): Promise<BlogAuditResult> {
  const blogAudit = httpsCallable<BlogAuditRequest, BlogAuditResult>(
    functions,
    'generateBlogAuditCloud',
    { timeout: V2_TIMEOUT }
  );

  const result = await blogAudit({
    companyId,
    companyName,
    website,
    apolloData,
    blogAnalysis,
  });

  return result.data;
}

/**
 * Discover a company's website via OpenAI lookup
 */
export async function discoverCompanyWebsite(
  companyName: string
): Promise<{ website: string | null; source: string }> {
  try {
    const discover = httpsCallable<
      { companyName: string },
      { website: string | null; source: string }
    >(functions, 'discoverCompanyWebsiteCloud', { timeout: 30000 });

    const result = await discover({ companyName });
    return result.data;
  } catch (error: any) {
    console.error('Error discovering company website:', error);
    throw new Error(error.message || 'Failed to discover company website');
  }
}

/**
 * Send Slack notification after all offer versions complete
 */
export async function sendOfferSlackNotification(
  companyName: string,
  v1Count: number,
  v2Count: number,
  v3Count: number,
  totalCost?: number
): Promise<void> {
  const sendNotification = httpsCallable<
    { companyName: string; v1Count: number; v2Count: number; v3Count: number; totalCost?: number },
    { success: boolean }
  >(functions, 'sendOfferSlackNotificationCloud', { timeout: 30000 });

  await sendNotification({ companyName, v1Count, v2Count, v3Count, totalCost });
}
