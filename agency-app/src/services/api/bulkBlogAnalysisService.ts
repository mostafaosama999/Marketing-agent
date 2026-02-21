// src/services/api/bulkBlogAnalysisService.ts
import { Company } from '../../types/crm';
import { analyzeBlog, BlogQualificationResult } from '../firebase/cloudFunctions';
import { getCompanyWebsite } from './websiteFieldMappingService';
import { getCompanyBlogUrl } from './blogUrlFieldMappingService';
import { updateCompany } from './companies';
import { resolveOrDiscoverWebsite } from './websiteDiscoveryService';

export type BlogAnalysisProgressCallback = (
  companyId: string,
  status: 'pending' | 'running' | 'success' | 'error' | 'skipped',
  message?: string,
  costInfo?: { totalCost: number; totalTokens: number }
) => void;

const BATCH_SIZE = 5;
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY = 2000;

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Transform BlogQualificationResult into the blogAnalysis shape stored on Company documents.
 * Extracted from CompanyDetailPage.tsx for reuse.
 */
export function transformBlogResult(
  result: BlogQualificationResult,
  urlAnalyzed: string
): NonNullable<Company['blogAnalysis']> {
  const authorNames = result.authorNames ? result.authorNames.split(', ') : [];
  const areEmployees = result.authorsAreEmployees === 'employees' || result.authorsAreEmployees === 'mixed';
  const areFreelancers = result.authorsAreEmployees === 'freelancers' || result.authorsAreEmployees === 'mixed';

  let rating: 'low' | 'medium' | 'high' = result.contentQualityRating || 'low';
  if (!result.contentQualityRating) {
    if (result.isDeveloperB2BSaas && result.coversAiTopics) {
      rating = 'high';
    } else if (result.isDeveloperB2BSaas || result.coversAiTopics) {
      rating = 'medium';
    }
  }

  const blogNature: any = {
    isAIWritten: result.isAIWritten || false,
    isTechnical: result.technicalDepth === 'advanced' || result.technicalDepth === 'intermediate',
    rating,
    reasoning: result.contentQualityReasoning || 'No detailed reasoning provided by analysis',
    hasCodeExamples: result.hasCodeExamples || false,
    codeExamplesCount: result.codeExamplesCount || 0,
    codeLanguages: result.codeLanguages || [],
    hasDiagrams: result.hasDiagrams || false,
    diagramsCount: result.diagramsCount || 0,
    exampleQuotes: result.exampleQuotes || [],
    aiWrittenConfidence: result.aiWrittenConfidence || null,
    aiWrittenEvidence: result.aiWrittenEvidence || null,
    technicalDepth: result.technicalDepth || null,
    funnelStage: result.funnelStage || null,
  };

  const analysisData: any = {
    lastActivePost: result.lastBlogCreatedAt || null,
    monthlyFrequency: result.blogPostCount,
    writers: {
      count: result.authorCount,
      areEmployees,
      areFreelancers,
      list: authorNames,
    },
    blogNature,
    isDeveloperB2BSaas: result.isDeveloperB2BSaas,
    contentSummary: result.contentSummary,
    blogUrl: urlAnalyzed,
    lastPostUrl: result.lastPostUrl || null,
    rssFeedUrl: result.rssFeedUrl || null,
    analysisMethod: result.analysisMethod || 'Unknown',
    lastAnalyzedAt: new Date(),
  };

  if (result.costInfo) {
    analysisData.costInfo = {
      totalCost: result.costInfo.totalCost,
      totalTokens: result.costInfo.totalTokens,
    };
  }

  return analysisData;
}

/**
 * Resolve the best URL to analyze for a company (synchronous, no discovery).
 * Priority: blog URL mapping > website mapping > company.website > apolloEnrichment.website
 */
function resolveCompanyUrl(company: Company): string | undefined {
  return getCompanyBlogUrl(company) || getCompanyWebsite(company) || company.website;
}

/**
 * Check if a company was analyzed recently (within skipDays).
 */
function wasRecentlyAnalyzed(company: Company, skipDays: number): boolean {
  if (!company.blogAnalysis?.lastAnalyzedAt) return false;
  const analyzedAt = company.blogAnalysis.lastAnalyzedAt instanceof Date
    ? company.blogAnalysis.lastAnalyzedAt
    : new Date(company.blogAnalysis.lastAnalyzedAt);
  const daysSince = (Date.now() - analyzedAt.getTime()) / (1000 * 60 * 60 * 24);
  return daysSince < skipDays;
}

/**
 * Bulk analyze blog activity for multiple companies.
 * Processes in batches with retry logic. Auto-discovers websites via SerpAPI
 * when no website is found through normal resolution.
 */
export async function bulkAnalyzeBlogActivity(
  companies: Company[],
  onProgress?: BlogAnalysisProgressCallback,
  skipRecentDays: number = 7
): Promise<{
  results: Map<string, { success: boolean; blogAnalysis?: any; error?: string; costInfo?: { totalCost: number; totalTokens: number } }>;
  totalCost: number;
}> {
  const results = new Map<string, { success: boolean; blogAnalysis?: any; error?: string; costInfo?: { totalCost: number; totalTokens: number } }>();
  let totalCost = 0;

  // Separate companies into: skip (recently analyzed) and to-process
  const toProcess: Company[] = [];

  for (const company of companies) {
    // Skip recently analyzed
    if (skipRecentDays > 0 && wasRecentlyAnalyzed(company, skipRecentDays)) {
      const freq = company.blogAnalysis?.monthlyFrequency ?? 0;
      results.set(company.id, { success: true, blogAnalysis: company.blogAnalysis });
      onProgress?.(company.id, 'skipped', `Already analyzed (${freq} posts/mo)`);
      continue;
    }

    toProcess.push(company);
  }

  // Process in batches
  const batches = chunkArray(toProcess, BATCH_SIZE);

  for (const batch of batches) {
    batch.forEach(company => {
      onProgress?.(company.id, 'pending');
    });

    const batchPromises = batch.map(async (company) => {
      // Step 1: Resolve or discover the website URL
      let url = resolveCompanyUrl(company);

      if (!url) {
        onProgress?.(company.id, 'running', 'Discovering website...');
        try {
          url = await resolveOrDiscoverWebsite(company) ?? undefined;
        } catch {
          // Discovery failed, will be handled below
        }
      }

      if (!url) {
        results.set(company.id, { success: false, error: 'No website found (discovery failed)' });
        onProgress?.(company.id, 'error', 'No website found (discovery failed)');
        return;
      }

      // Step 2: Analyze the blog
      onProgress?.(company.id, 'running', 'Analyzing blog...');
      let lastError: any = null;

      for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
        try {
          const result = await analyzeBlog(company.name, url);

          // Check for complete failure
          if (!result.rssFeedUrl && result.blogPostCount === 0 && (!result.analysisMethod || result.analysisMethod === 'None')) {
            throw new Error('Unable to analyze blog - no RSS feed or content found');
          }

          const analysisData = transformBlogResult(result, url);

          // Save to Firestore
          await updateCompany(company.id, { blogAnalysis: analysisData });

          const cost = result.costInfo ? { totalCost: result.costInfo.totalCost, totalTokens: result.costInfo.totalTokens } : undefined;
          if (cost) {
            totalCost += cost.totalCost;
          }

          results.set(company.id, { success: true, blogAnalysis: analysisData, costInfo: cost });
          onProgress?.(company.id, 'success', `${analysisData.monthlyFrequency} posts/mo`, cost);
          return;
        } catch (error) {
          lastError = error;
          if (attempt < RETRY_ATTEMPTS) {
            await delay(RETRY_DELAY * (attempt + 1));
          }
        }
      }

      const errorMessage = lastError instanceof Error ? lastError.message : 'Failed to analyze blog';
      results.set(company.id, { success: false, error: errorMessage });
      onProgress?.(company.id, 'error', errorMessage);
    });

    await Promise.all(batchPromises);

    // Small delay between batches
    if (batches.indexOf(batch) < batches.length - 1) {
      await delay(1000);
    }
  }

  return { results, totalCost };
}
