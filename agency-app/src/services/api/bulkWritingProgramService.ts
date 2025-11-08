// src/services/api/bulkWritingProgramService.ts
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Company } from '../../types/crm';

export interface FindProgramResult {
  companyId: string;
  companyName: string;
  website: string;
  success: boolean;
  urls: Array<{
    url: string;
    exists: boolean;
    status?: number;
  }>;
  aiSuggestions?: Array<{
    url: string;
    confidence: 'high' | 'medium' | 'low';
    reasoning: string;
    verified: boolean;
  }>;
  error?: string;
}

export interface AnalyzeProgramResult {
  companyId: string;
  companyName: string;
  programUrl: string;
  success: boolean;
  data?: any;
  error?: string;
}

export type ProgressCallback = (
  companyId: string,
  phase: 'finding' | 'analyzing',
  status: 'pending' | 'success' | 'error',
  message?: string
) => void;

const BATCH_SIZE = 5; // Process 5 companies at a time to avoid rate limits
const RETRY_ATTEMPTS = 2;
const RETRY_DELAY = 2000; // 2 seconds

/**
 * Helper function to delay execution
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper function to extract domain from URL
 */
function extractDomainFromUrl(url: string): string | null {
  try {
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    return urlObj.hostname.replace('www.', '');
  } catch (error) {
    return null;
  }
}

/**
 * Helper function to chunk array into batches
 */
function chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Find writing program URLs for multiple companies in parallel
 * Processes companies in batches to avoid overwhelming the API
 */
export async function bulkFindWritingPrograms(
  companies: Company[],
  onProgress?: ProgressCallback
): Promise<Map<string, FindProgramResult>> {
  const functions = getFunctions();
  const findProgramCloud = httpsCallable(functions, 'findWritingProgramCloud');

  const results = new Map<string, FindProgramResult>();

  // Prepare companies with websites (either from website field or extracted from programUrl)
  const companiesWithWebsites: Array<Company & { effectiveWebsite: string }> = [];

  companies.forEach(company => {
    let effectiveWebsite = company.website;

    // If no website, try to extract domain from existing writing program URL
    if (!effectiveWebsite && (company as any).writingProgramAnalysis?.programUrl) {
      const programUrl = (company as any).writingProgramAnalysis.programUrl;
      const extractedDomain = extractDomainFromUrl(programUrl);
      if (extractedDomain) {
        effectiveWebsite = extractedDomain;
      }
    }

    if (effectiveWebsite) {
      companiesWithWebsites.push({ ...company, effectiveWebsite });
    } else {
      // Mark companies without any website source as errors
      results.set(company.id, {
        companyId: company.id,
        companyName: company.name,
        website: '',
        success: false,
        urls: [],
        error: 'No website found. Please add a website to this company.',
      });
      if (onProgress) {
        onProgress(company.id, 'finding', 'error', 'No website found. Please add a website to this company.');
      }
    }
  });

  // Process companies in batches
  const batches = chunkArray(companiesWithWebsites, BATCH_SIZE);

  for (const batch of batches) {
    // Mark all in batch as pending
    batch.forEach(company => {
      if (onProgress) {
        onProgress(company.id, 'finding', 'pending');
      }
    });

    // Process batch in parallel with retry logic
    const batchPromises = batch.map(async (company) => {
      let lastError: any = null;

      for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
        try {
          const response = await findProgramCloud({
            website: company.effectiveWebsite,
            useAiFallback: true,
          });

          const data: any = response.data;

          const result: FindProgramResult = {
            companyId: company.id,
            companyName: company.name,
            website: company.effectiveWebsite || '',
            success: true,
            urls: data.validUrls || [],
            aiSuggestions: data.aiSuggestions || [],
          };

          results.set(company.id, result);

          if (onProgress) {
            const urlCount = (data.validUrls?.length || 0) + (data.aiSuggestions?.length || 0);
            onProgress(
              company.id,
              'finding',
              'success',
              urlCount > 0 ? `Found ${urlCount} URL${urlCount > 1 ? 's' : ''}` : 'No URLs found'
            );
          }

          return; // Success, break retry loop
        } catch (error) {
          lastError = error;
          console.error(`Attempt ${attempt + 1} failed for ${company.name}:`, error);

          if (attempt < RETRY_ATTEMPTS) {
            await delay(RETRY_DELAY * (attempt + 1)); // Exponential backoff
          }
        }
      }

      // All retries failed
      const errorMessage = lastError instanceof Error ? lastError.message : 'Failed to find writing program';
      results.set(company.id, {
        companyId: company.id,
        companyName: company.name,
        website: company.effectiveWebsite || '',
        success: false,
        urls: [],
        error: errorMessage,
      });

      if (onProgress) {
        onProgress(company.id, 'finding', 'error', errorMessage);
      }
    });

    await Promise.all(batchPromises);

    // Small delay between batches
    if (batches.indexOf(batch) < batches.length - 1) {
      await delay(1000);
    }
  }

  return results;
}

/**
 * Analyze selected writing program URLs in parallel
 * Processes URLs in batches to avoid overwhelming the API
 */
export async function bulkAnalyzeWritingPrograms(
  selections: Map<string, { companyId: string; companyName: string; programUrl: string }>,
  onProgress?: ProgressCallback
): Promise<Map<string, AnalyzeProgramResult>> {
  const functions = getFunctions();
  const analyzeProgram = httpsCallable(functions, 'analyzeWritingProgramDetailsCloud');

  const results = new Map<string, AnalyzeProgramResult>();
  const selectionsArray = Array.from(selections.values());

  // Process selections in batches
  const batches = chunkArray(selectionsArray, BATCH_SIZE);

  for (const batch of batches) {
    // Mark all in batch as pending
    batch.forEach(selection => {
      if (onProgress) {
        onProgress(selection.companyId, 'analyzing', 'pending');
      }
    });

    // Process batch in parallel with retry logic
    const batchPromises = batch.map(async (selection) => {
      let lastError: any = null;

      for (let attempt = 0; attempt <= RETRY_ATTEMPTS; attempt++) {
        try {
          const response = await analyzeProgram({
            programUrl: selection.programUrl,
            companyId: selection.companyId,
          });

          const data: any = response.data;

          const result: AnalyzeProgramResult = {
            companyId: selection.companyId,
            companyName: selection.companyName,
            programUrl: selection.programUrl,
            success: true,
            data,
          };

          results.set(selection.companyId, result);

          if (onProgress) {
            const paymentInfo = data.payment?.amount || 'Unknown payment';
            const statusInfo = data.isOpen === true ? 'Open' : data.isOpen === false ? 'Closed' : 'Unknown status';
            onProgress(
              selection.companyId,
              'analyzing',
              'success',
              `${paymentInfo} - ${statusInfo}`
            );
          }

          return; // Success, break retry loop
        } catch (error) {
          lastError = error;
          console.error(`Attempt ${attempt + 1} failed for ${selection.companyName}:`, error);

          if (attempt < RETRY_ATTEMPTS) {
            await delay(RETRY_DELAY * (attempt + 1)); // Exponential backoff
          }
        }
      }

      // All retries failed
      const errorMessage = lastError instanceof Error ? lastError.message : 'Failed to analyze writing program';
      results.set(selection.companyId, {
        companyId: selection.companyId,
        companyName: selection.companyName,
        programUrl: selection.programUrl,
        success: false,
        error: errorMessage,
      });

      if (onProgress) {
        onProgress(selection.companyId, 'analyzing', 'error', errorMessage);
      }
    });

    await Promise.all(batchPromises);

    // Small delay between batches
    if (batches.indexOf(batch) < batches.length - 1) {
      await delay(1000);
    }
  }

  return results;
}
