// src/services/api/websiteFieldMappingService.ts
// Service for managing global website field mapping

import { Company } from '../../types/crm';

const WEBSITE_MAPPING_STORAGE_KEY = 'company_website_field_mapping';

export interface WebsiteFieldMapping {
  useTopLevel: boolean; // Use company.website
  customFieldName?: string; // Or use company.customFields[customFieldName]
}

/**
 * Get the saved website field mapping from localStorage
 */
export function getWebsiteFieldMapping(): WebsiteFieldMapping | null {
  try {
    const saved = localStorage.getItem(WEBSITE_MAPPING_STORAGE_KEY);
    if (!saved) return null;
    return JSON.parse(saved);
  } catch (error) {
    console.error('Error loading website field mapping:', error);
    return null;
  }
}

/**
 * Save website field mapping to localStorage
 */
export function saveWebsiteFieldMapping(mapping: WebsiteFieldMapping): void {
  try {
    localStorage.setItem(WEBSITE_MAPPING_STORAGE_KEY, JSON.stringify(mapping));
  } catch (error) {
    console.error('Error saving website field mapping:', error);
  }
}

/**
 * Get the website URL for a company using the saved field mapping
 */
export function getCompanyWebsite(company: Company): string | undefined {
  const mapping = getWebsiteFieldMapping();

  let resolved: string | undefined;

  if (!mapping) {
    resolved = company.website;
  } else if (mapping.useTopLevel) {
    resolved = company.website;
  } else if (mapping.customFieldName) {
    resolved = company.customFields?.[mapping.customFieldName];
  } else {
    resolved = company.website;
  }

  // Fallback to Apollo enrichment website if nothing else resolved
  if (!resolved && company.apolloEnrichment?.website) {
    resolved = company.apolloEnrichment.website;
  }

  return resolved;
}

/**
 * Get all unique custom field names from companies that might contain website URLs
 * (fields with "website", "url", "link" in the name)
 */
export function getPotentialWebsiteFields(companies: Company[]): string[] {
  const fieldNames = new Set<string>();

  companies.forEach(company => {
    if (company.customFields) {
      Object.keys(company.customFields).forEach(fieldName => {
        const lowerName = fieldName.toLowerCase();
        if (lowerName.includes('website') ||
            lowerName.includes('url') ||
            lowerName.includes('link') ||
            lowerName.includes('web')) {
          fieldNames.add(fieldName);
        }
      });
    }
  });

  return Array.from(fieldNames).sort();
}

/**
 * Clear the website field mapping
 */
export function clearWebsiteFieldMapping(): void {
  localStorage.removeItem(WEBSITE_MAPPING_STORAGE_KEY);
}
