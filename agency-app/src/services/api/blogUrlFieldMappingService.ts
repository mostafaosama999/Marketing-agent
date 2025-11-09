// src/services/api/blogUrlFieldMappingService.ts
// Service for managing global blog URL field mapping

import { Company } from '../../types/crm';

const BLOG_URL_MAPPING_STORAGE_KEY = 'company_blog_url_field_mapping';

/**
 * Get the saved blog URL field mapping from localStorage
 * Returns the custom field name that contains blog URLs
 */
export function getBlogUrlFieldMapping(): string | null {
  try {
    const saved = localStorage.getItem(BLOG_URL_MAPPING_STORAGE_KEY);
    return saved || null;
  } catch (error) {
    console.error('Error loading blog URL field mapping:', error);
    return null;
  }
}

/**
 * Save blog URL field mapping to localStorage
 */
export function saveBlogUrlFieldMapping(fieldName: string): void {
  try {
    localStorage.setItem(BLOG_URL_MAPPING_STORAGE_KEY, fieldName);
  } catch (error) {
    console.error('Error saving blog URL field mapping:', error);
  }
}

/**
 * Get the blog URL for a company using the saved field mapping
 */
export function getCompanyBlogUrl(company: Company): string | undefined {
  const fieldName = getBlogUrlFieldMapping();

  if (!fieldName) {
    return undefined;
  }

  // Check if company has the custom field and it's not empty
  const url = company.customFields?.[fieldName];

  if (url && typeof url === 'string' && url.trim().length > 0) {
    return url.trim();
  }

  return undefined;
}

/**
 * Get all unique custom field names from companies that might contain blog URLs
 * (fields with "blog", "rss", "feed", "url", "link", "content" in the name)
 */
export function getPotentialBlogUrlFields(companies: Company[]): string[] {
  const fieldNames = new Set<string>();

  companies.forEach(company => {
    if (company.customFields) {
      Object.keys(company.customFields).forEach(fieldName => {
        const lowerName = fieldName.toLowerCase();
        // Look for fields that might contain blog URLs
        if (lowerName.includes('blog') ||
            lowerName.includes('rss') ||
            lowerName.includes('feed') ||
            lowerName.includes('url') ||
            lowerName.includes('link') ||
            lowerName.includes('content') ||
            lowerName.includes('website')) {
          fieldNames.add(fieldName);
        }
      });
    }
  });

  return Array.from(fieldNames).sort();
}

/**
 * Clear the blog URL field mapping
 */
export function clearBlogUrlFieldMapping(): void {
  localStorage.removeItem(BLOG_URL_MAPPING_STORAGE_KEY);
}
