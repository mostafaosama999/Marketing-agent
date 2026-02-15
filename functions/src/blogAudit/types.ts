/**
 * Blog Audit Pipeline Types
 *
 * Defines all interfaces for the agentic blog audit pipeline
 * that analyzes a company's blog vs competitors.
 */

// ============================================
// REQUEST / RESPONSE
// ============================================

export interface BlogAuditRequest {
  companyId: string;
  companyName: string;
  website: string;
  /** Apollo enrichment data for industry/tech context */
  apolloData?: {
    industry?: string;
    industries?: string[];
    technologies?: string[];
    description?: string;
    keywords?: string[];
    employeeRange?: string;
  };
  /** Existing blog analysis data (if available) */
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

export interface BlogAuditResponse {
  success: boolean;
  /** The short paragraph sent to the prospect */
  offerParagraph: string;
  /** Detailed methodology and evidence (internal use only) */
  internalJustification: string;
  /** Structured data from the agent's research */
  companyBlogSnapshot: CompanyBlogSnapshot;
  competitorSnapshots: CompetitorBlogSnapshot[];
  competitorsAnalyzed: number;
  /** Agent execution metadata */
  agentIterations: number;
  toolCallsCount: number;
  costInfo: BlogAuditCostInfo;
  generatedAt: string;
  model: string;
}

// ============================================
// BLOG SNAPSHOTS
// ============================================

export interface CompanyBlogSnapshot {
  blogUrl: string;
  postsPerMonth: number;
  recentTopics: string[];
  contentTypes: string[];
  recentPosts: Array<{
    title: string;
    date: string;
    url?: string;
  }>;
}

export interface CompetitorBlogSnapshot {
  companyName: string;
  blogUrl: string;
  postsPerMonth: number;
  recentTopics: string[];
  notableStrengths: string;
}

// ============================================
// COST TRACKING
// ============================================

export interface BlogAuditCostInfo {
  totalCost: number;
  totalTokens: number;
  iterationCosts: number[];
}

// ============================================
// AGENT INTERNALS
// ============================================

export interface CompanyContext {
  companyId: string;
  companyName: string;
  website: string;
  industry?: string;
  industries?: string[];
  technologies?: string[];
  description?: string;
  keywords?: string[];
  employeeRange?: string;
  existingBlogUrl?: string;
  existingBlogFrequency?: number;
  existingBlogSummary?: string;
}

/** Output format the agent must produce */
export interface AgentFinalOutput {
  offerParagraph: string;
  internalJustification: string;
  companyBlogSnapshot: CompanyBlogSnapshot;
  competitorSnapshots: CompetitorBlogSnapshot[];
}

// ============================================
// TOOL OUTPUTS
// ============================================

export interface BrowseBlogResult {
  success: boolean;
  blogUrl: string;
  posts: Array<{
    title: string;
    date: string;
    url?: string;
    snippet?: string;
    author?: string;
  }>;
  postsPerMonth: number;
  totalPostsFound: number;
  rssAvailable: boolean;
  error?: string;
}

export interface ScrapePageResult {
  success: boolean;
  url: string;
  title: string;
  content: string;
  error?: string;
}
