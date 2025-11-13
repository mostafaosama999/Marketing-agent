import { Lead, LeadFormData } from '../types/lead';

/**
 * Result of parsing a lead's name into first and last name components
 */
export interface NameParts {
  firstName: string;
  lastName: string;
  missingFields: string[]; // List of missing field names for error messages
  needsConfirmation?: boolean; // Indicates if name was detected as full name and needs user confirmation
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
 * Detects if a string appears to be a full name (first + last name)
 * Returns true if the string contains at least 2 words
 *
 * @param name - Name string to check
 * @returns true if appears to be a full name
 */
export function detectFullName(name: string): boolean {
  if (!name || typeof name !== 'string') return false;
  const trimmed = name.trim();
  const parts = trimmed.split(/\s+/);
  return parts.length >= 2 && parts.every(part => part.length >= 1);
}

/**
 * Splits a full name into first and last name components
 * Takes the first word as first name, everything else as last name
 *
 * @param name - Full name string to split
 * @returns Object with firstName and lastName
 */
export function splitFullName(name: string): { firstName: string; lastName: string } {
  const trimmed = name.trim();
  const spaceIndex = trimmed.indexOf(' ');

  if (spaceIndex === -1) {
    return { firstName: trimmed, lastName: '' };
  }

  return {
    firstName: trimmed.substring(0, spaceIndex).trim(),
    lastName: trimmed.substring(spaceIndex + 1).trim(),
  };
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
  let needsConfirmation = false;

  // Try to get first name from core 'name' field first
  let firstName = lead.name?.trim() || '';

  // If core name is empty, try custom fields
  if (!firstName) {
    firstName = findCustomFieldValue(lead.customFields, FIRST_NAME_PATTERNS) || '';
  }

  // Get last name from custom fields only (no fallback)
  let lastName = findCustomFieldValue(lead.customFields, LAST_NAME_PATTERNS) || '';

  // Check if firstName contains a full name (e.g., "John Doe")
  if (firstName && !lastName && detectFullName(firstName)) {
    needsConfirmation = true;
  }

  // Track missing fields for error messages
  if (!firstName) {
    missingFields.push('first name');
  }
  if (!lastName && !needsConfirmation) {
    missingFields.push('last name');
  }

  return {
    firstName,
    lastName,
    missingFields,
    needsConfirmation,
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
