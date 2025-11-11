import { Lead, LeadFormData } from '../types/lead';

/**
 * Result of parsing a lead's name into first and last name components
 */
export interface NameParts {
  firstName: string;
  lastName: string;
  missingFields: string[]; // List of missing field names for error messages
}

/**
 * Patterns to search for in custom field names (case-insensitive)
 */
const LAST_NAME_PATTERNS = [
  'last name',
  'lastname',
  'last_name',
  'lead last name',
  'surname',
  'family name',
];

const FIRST_NAME_PATTERNS = [
  'first name',
  'firstname',
  'first_name',
  'given name',
  'lead first name',
];

/**
 * Helper function to find a custom field value by matching patterns (case-insensitive)
 */
function findCustomFieldValue(
  customFields: Record<string, any> | undefined,
  patterns: string[]
): string | null {
  if (!customFields) return null;

  for (const [key, value] of Object.entries(customFields)) {
    const lowerKey = key.toLowerCase();
    if (patterns.some(pattern => lowerKey.includes(pattern.toLowerCase()))) {
      return value?.toString().trim() || null;
    }
  }

  return null;
}

/**
 * Extracts first and last name from a Lead object for Apollo enrichment.
 *
 * Priority:
 * 1. First Name: lead.name (core field) OR custom fields matching first name patterns
 * 2. Last Name: custom fields matching last name patterns
 *
 * Does NOT fall back to space-splitting. Requires explicit fields.
 *
 * @param lead - Lead or LeadFormData object
 * @returns NameParts object with firstName, lastName, and list of missing fields
 */
export function getLeadNameForApollo(lead: Lead | LeadFormData): NameParts {
  const missingFields: string[] = [];

  // Try to get first name from core 'name' field first
  let firstName = lead.name?.trim() || '';

  // If core name is empty, try custom fields
  if (!firstName) {
    firstName = findCustomFieldValue(lead.customFields, FIRST_NAME_PATTERNS) || '';
  }

  // Get last name from custom fields only (no fallback)
  const lastName = findCustomFieldValue(lead.customFields, LAST_NAME_PATTERNS) || '';

  // Track missing fields for error messages
  if (!firstName) {
    missingFields.push('first name');
  }
  if (!lastName) {
    missingFields.push('last name');
  }

  return {
    firstName,
    lastName,
    missingFields,
  };
}

/**
 * Validates that a lead has both first and last name required for Apollo enrichment.
 * Returns a helpful error message if validation fails, or null if valid.
 *
 * @param lead - Lead or LeadFormData object
 * @returns Error message string or null if valid
 */
export function validateNameForApollo(lead: Lead | LeadFormData): string | null {
  const { firstName, lastName, missingFields } = getLeadNameForApollo(lead);

  if (missingFields.length === 0) {
    return null; // Valid
  }

  // Build helpful error message
  const missingFieldsText = missingFields.join(' and ');
  const tip = missingFields.includes('last name')
    ? ` Tip: Add a 'last name' custom field to your leads via CSV import or lead details.`
    : '';

  return `Apollo enrichment requires both first and last name. Missing: ${missingFieldsText}.${tip}`;
}
