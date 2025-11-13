// src/services/api/competitorWorkflowService.ts
// Services for the competitor workflow - bulk enrichment, analysis, and import

import { enrichOrganization } from './apolloService';
import { EnrichOrganizationResponse } from '../../types';
import { analyzeBlog, BlogQualificationResult } from '../firebase/cloudFunctions';
import { createCompany, updateCompany, getCompanies } from './companies';
import { CompetitorWithEnrichment } from '../../components/features/companies/CompetitorWorkflowDialog';

// Progress callback type
export type ProgressCallback = (
  competitorId: string,
  status: 'pending' | 'success' | 'error' | 'skipped',
  data?: any,
  error?: string
) => void;

// Apollo Enrichment Results
export interface EnrichResult {
  status: 'success' | 'error' | 'skipped';
  data?: EnrichOrganizationResponse;
  error?: string;
}

// Blog Analysis Results
export interface BlogResult {
  status: 'success' | 'error' | 'skipped';
  data?: BlogQualificationResult;
  error?: string;
}

/**
 * Bulk enrich competitors with Apollo data (parallel processing)
 */
export async function bulkEnrichCompetitors(
  competitors: CompetitorWithEnrichment[],
  userId: string,
  onProgress: ProgressCallback
): Promise<Map<string, EnrichResult>> {
  const results = new Map<string, EnrichResult>();
  const selectedCompetitors = competitors.filter(c => c.selected);

  // Process all selected competitors in parallel (max 5 concurrent)
  const promises = selectedCompetitors.map(async (comp) => {
    // Skip if no website
    if (!comp.website || comp.website.trim() === '') {
      onProgress(comp.id, 'skipped', null, 'No website available');
      results.set(comp.id, { status: 'skipped', error: 'No website' });
      return;
    }

    try {
      onProgress(comp.id, 'pending');

      // Extract domain from website
      let domain = comp.website;
      try {
        const url = new URL(comp.website.startsWith('http') ? comp.website : `https://${comp.website}`);
        domain = url.hostname.replace(/^www\./, '');
      } catch {
        // If URL parsing fails, use as-is
        domain = comp.website.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
      }


      // Call Apollo enrichment
      const result = await enrichOrganization({ domain }, userId);

      if (result.enriched && result.organization) {
        onProgress(comp.id, 'success', result.organization);
        results.set(comp.id, { status: 'success', data: result });
      } else {
        onProgress(comp.id, 'error', null, result.error || 'Enrichment failed');
        results.set(comp.id, { status: 'error', error: result.error || 'No data returned' });
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Enrichment failed';
      onProgress(comp.id, 'error', null, errorMessage);
      results.set(comp.id, { status: 'error', error: errorMessage });
    }
  });

  // Wait for all enrichments to complete
  await Promise.allSettled(promises);

  return results;
}

/**
 * Bulk analyze competitor blogs (parallel processing)
 */
export async function bulkAnalyzeBlogs(
  competitors: CompetitorWithEnrichment[],
  onProgress: ProgressCallback
): Promise<Map<string, BlogResult>> {
  const results = new Map<string, BlogResult>();
  const selectedCompetitors = competitors.filter(c => c.selected);

  // Process all selected competitors in parallel
  const promises = selectedCompetitors.map(async (comp) => {
    // Skip if no website or blog URL
    if ((!comp.website || comp.website.trim() === '') && (!comp.blogUrl || comp.blogUrl.trim() === '')) {
      onProgress(comp.id, 'skipped', null, 'No website or blog URL available');
      results.set(comp.id, { status: 'skipped', error: 'No website or blog URL' });
      return;
    }

    try {
      onProgress(comp.id, 'pending');


      // Call blog analysis - use blogUrl if available, otherwise use website
      const urlToAnalyze = comp.blogUrl || comp.website;
      const result = await analyzeBlog(comp.name, urlToAnalyze);

      onProgress(comp.id, 'success', result);
      results.set(comp.id, { status: 'success', data: result });

    } catch (error: any) {
      const errorMessage = error.message || 'Blog analysis failed';
      onProgress(comp.id, 'error', null, errorMessage);
      results.set(comp.id, { status: 'error', error: errorMessage });
    }
  });

  // Wait for all analyses to complete
  await Promise.allSettled(promises);

  return results;
}

/**
 * Import competitors as companies to Firestore
 */
export async function importCompetitors(
  competitors: CompetitorWithEnrichment[],
  originalCompanyId: string,
  duplicateStrategy: 'skip' | 'update' | 'create',
  onProgress: ProgressCallback
): Promise<Map<string, string | null>> {
  const results = new Map<string, string | null>();
  const selectedCompetitors = competitors.filter(c => c.selected);

  // Get all existing companies for duplicate detection
  const existingCompanies = await getCompanies();
  const existingByName = new Map(
    existingCompanies.map(c => [c.name.toLowerCase().trim(), c])
  );

  for (const comp of selectedCompetitors) {
    try {
      onProgress(comp.id, 'pending');

      const normalizedName = comp.name.toLowerCase().trim();
      const existing = existingByName.get(normalizedName);

      // Handle duplicate
      if (existing) {
        if (duplicateStrategy === 'skip') {
          onProgress(comp.id, 'skipped', null, 'Company already exists');
          results.set(comp.id, null);
          continue;
        } else if (duplicateStrategy === 'update') {

          // Update with new data
          await updateCompany(existing.id, {
            website: comp.website || existing.website,
            description: comp.description || existing.description,
            apolloEnrichment: comp.apolloData || existing.apolloEnrichment,
            blogAnalysis: comp.blogData || existing.blogAnalysis,
            customFields: {
              ...existing.customFields,
              competitorOf: originalCompanyId,
              foundVia: 'ai-competitor-search',
              companySize: comp.companySize,
              whyCompetitor: comp.whyCompetitor,
            },
          });

          onProgress(comp.id, 'success', existing.id);
          results.set(comp.id, existing.id);
          continue;
        }
        // 'create' strategy: falls through to create new with suffix
      }

      // Create new company
      let finalName = comp.name;
      if (existing && duplicateStrategy === 'create') {
        finalName = `${comp.name} (2)`;
        // Make sure the suffixed name is also unique
        let suffix = 2;
        while (existingByName.has(finalName.toLowerCase().trim())) {
          suffix++;
          finalName = `${comp.name} (${suffix})`;
        }
      }


      // Create the company first
      const companyId = await createCompany({
        name: finalName,
        website: comp.website || '',
        description: comp.description || '',
        customFields: {
          competitorOf: originalCompanyId,
          foundVia: 'ai-competitor-search',
          foundAt: new Date().toISOString(),
          companySize: comp.companySize,
          whyCompetitor: comp.whyCompetitor,
        },
      });

      // Update with enrichment data if available
      if (comp.apolloData || comp.blogData) {
        const updateData: any = {};
        if (comp.apolloData) {
          updateData.apolloEnrichment = comp.apolloData;
        }
        if (comp.blogData) {
          updateData.blogAnalysis = comp.blogData;
        }
        await updateCompany(companyId, updateData);
      }

      onProgress(comp.id, 'success', companyId);
      results.set(comp.id, companyId);

      // Add to our tracking map to catch duplicates within this batch
      existingByName.set(finalName.toLowerCase().trim(), { id: companyId, name: finalName } as any);

    } catch (error: any) {
      const errorMessage = error.message || 'Import failed';
      onProgress(comp.id, 'error', null, errorMessage);
      results.set(comp.id, null);
    }
  }

  return results;
}

/**
 * Check if a company name already exists (case-insensitive)
 */
export async function checkDuplicateCompanies(
  competitorNames: string[]
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();

  try {
    const existingCompanies = await getCompanies();
    const existingNames = new Set(
      existingCompanies.map(c => c.name.toLowerCase().trim())
    );

    for (const name of competitorNames) {
      const normalized = name.toLowerCase().trim();
      results.set(name, existingNames.has(normalized));
    }
  } catch (error) {
    // Return false for all on error
    for (const name of competitorNames) {
      results.set(name, false);
    }
  }

  return results;
}
