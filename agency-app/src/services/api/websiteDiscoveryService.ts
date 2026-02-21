// src/services/api/websiteDiscoveryService.ts
// Shared utility for resolving or auto-discovering company websites.
// Used by bulk blog analysis, bulk writing program finder, and any other
// website-dependent process.

import { Company } from '../../types/crm';
import { getCompanyWebsite } from './websiteFieldMappingService';
import { getCompanyBlogUrl } from './blogUrlFieldMappingService';
import { updateCompany } from './companies';
import { discoverCompanyWebsite } from '../firebase/cloudFunctions';

/**
 * Resolve an existing website URL for a company, or auto-discover one via SerpAPI.
 * If a website is discovered, it is saved permanently to the company record.
 *
 * Resolution order:
 *   1. Blog URL field mapping (custom field)
 *   2. Website field mapping (custom field or top-level)
 *   3. company.website (direct)
 *   4. apolloEnrichment.website (via getCompanyWebsite fallback)
 *   5. SerpAPI Google search (auto-discover + save)
 */
export async function resolveOrDiscoverWebsite(
  company: Company
): Promise<string | null> {
  // 1-4: Try existing resolution (getCompanyWebsite now includes Apollo fallback)
  const existing = getCompanyBlogUrl(company) || getCompanyWebsite(company);
  if (existing) return existing;

  // 5: Auto-discover via SerpAPI
  try {
    const result = await discoverCompanyWebsite(company.name);
    if (!result.website) return null;

    // Save to company record permanently so subsequent operations don't need to rediscover
    await updateCompany(company.id, { website: result.website });

    return result.website;
  } catch (error) {
    console.error(`[websiteDiscovery] Failed to discover website for ${company.name}:`, error);
    return null;
  }
}
