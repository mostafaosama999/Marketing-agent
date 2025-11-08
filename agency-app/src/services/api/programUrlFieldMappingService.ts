// src/services/api/programUrlFieldMappingService.ts
// Service for managing global program URL field mapping

import { Company } from '../../types/crm';

const PROGRAM_URL_MAPPING_STORAGE_KEY = 'company_program_url_field_mapping';

/**
 * Get the saved program URL field mapping from localStorage
 * Returns the custom field name that contains program URLs
 */
export function getProgramUrlFieldMapping(): string | null {
  try {
    const saved = localStorage.getItem(PROGRAM_URL_MAPPING_STORAGE_KEY);
    return saved || null;
  } catch (error) {
    console.error('Error loading program URL field mapping:', error);
    return null;
  }
}

/**
 * Save program URL field mapping to localStorage
 */
export function saveProgramUrlFieldMapping(fieldName: string): void {
  try {
    localStorage.setItem(PROGRAM_URL_MAPPING_STORAGE_KEY, fieldName);
  } catch (error) {
    console.error('Error saving program URL field mapping:', error);
  }
}

/**
 * Get the program URL for a company using the saved field mapping
 */
export function getCompanyProgramUrl(company: Company): string | undefined {
  const fieldName = getProgramUrlFieldMapping();

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
 * Get all unique custom field names from companies that might contain program URLs
 * (fields with "program", "community", "writing", "url", "link" in the name)
 */
export function getPotentialProgramUrlFields(companies: Company[]): string[] {
  const fieldNames = new Set<string>();

  companies.forEach(company => {
    if (company.customFields) {
      Object.keys(company.customFields).forEach(fieldName => {
        const lowerName = fieldName.toLowerCase();
        // Look for fields that might contain program URLs
        if (lowerName.includes('program') ||
            lowerName.includes('community') ||
            lowerName.includes('writing') ||
            lowerName.includes('url') ||
            lowerName.includes('link') ||
            lowerName.includes('contributor')) {
          fieldNames.add(fieldName);
        }
      });
    }
  });

  return Array.from(fieldNames).sort();
}

/**
 * Clear the program URL field mapping
 */
export function clearProgramUrlFieldMapping(): void {
  localStorage.removeItem(PROGRAM_URL_MAPPING_STORAGE_KEY);
}
