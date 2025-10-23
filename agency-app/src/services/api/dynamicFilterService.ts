// src/services/api/dynamicFilterService.ts
// Service for dynamically generating filter options from lead data

import { Lead } from '../../types/lead';

/**
 * Extract unique values for a custom field from leads
 * @param leads Array of leads
 * @param fieldName Custom field name (e.g., "priority", "lead_owner")
 * @returns Array of unique values, sorted
 */
export function getUniqueValuesForField(
  leads: Lead[],
  fieldName: string
): string[] {
  const uniqueValues = new Set<string>();

  for (const lead of leads) {
    const value = lead.customFields?.[fieldName];

    // Handle different value types
    if (value !== undefined && value !== null && value !== '') {
      // Convert to string for consistency
      const stringValue = String(value).trim();
      if (stringValue) {
        uniqueValues.add(stringValue);
      }
    }
  }

  // Convert to array and sort
  return Array.from(uniqueValues).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true })
  );
}

/**
 * Determine if a custom field should be filterable
 * Fields are filterable if they have reasonable number of unique values
 */
export function isFieldFilterable(fieldName: string, leads: Lead[]): boolean {
  // Get unique values for this field
  const uniqueValues = getUniqueValuesForField(leads, fieldName);

  // Text fields are filterable if they have between 1-100 unique values
  // (otherwise it becomes impractical)
  return uniqueValues.length > 0 && uniqueValues.length < 100;
}

/**
 * Get filter configuration for a custom field
 * Returns the filter widget type and available options
 */
export interface FilterConfig {
  fieldName: string;
  label: string;
  filterType: 'multiselect' | 'text' | 'number-range' | 'date-range' | 'boolean';
  options?: string[]; // For multiselect
  min?: number; // For number-range
  max?: number; // For number-range
}

export function getFilterConfig(
  fieldName: string,
  leads: Lead[]
): FilterConfig | null {
  if (!isFieldFilterable(fieldName, leads)) {
    return null;
  }

  const label = fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' ');

  // Extract unique values for this field
  const options = getUniqueValuesForField(leads, fieldName);

  // Default to multiselect filter for all custom fields
  return {
    fieldName,
    label,
    filterType: 'multiselect',
    options,
  };
}

/**
 * Get all filterable custom fields with their configurations from actual leads data
 */
export function getFilterableFields(
  leads: Lead[]
): FilterConfig[] {
  const filterConfigs: FilterConfig[] = [];

  // Extract all unique custom field names from leads
  const customFieldNames = new Set<string>();
  leads.forEach(lead => {
    if (lead.customFields) {
      Object.keys(lead.customFields).forEach(fieldName => {
        customFieldNames.add(fieldName);
      });
    }
  });

  // Create filter configs for each custom field
  for (const fieldName of Array.from(customFieldNames).sort()) {
    const config = getFilterConfig(fieldName, leads);
    if (config) {
      filterConfigs.push(config);
    }
  }

  return filterConfigs;
}

/**
 * Apply a filter value to a lead
 * Returns true if the lead passes the filter
 */
export function applyFilter(
  lead: Lead,
  fieldName: string,
  filterValue: any,
  filterType: FilterConfig['filterType']
): boolean {
  const leadValue = lead.customFields?.[fieldName];

  switch (filterType) {
    case 'multiselect':
      // filterValue is an array of selected values
      if (!Array.isArray(filterValue) || filterValue.length === 0) return true;
      if (leadValue === undefined || leadValue === null || leadValue === '') return false;
      return filterValue.includes(String(leadValue));

    case 'boolean':
      // filterValue is boolean or null
      if (filterValue === null || filterValue === undefined) return true;
      return Boolean(leadValue) === Boolean(filterValue);

    case 'number-range':
      // filterValue is { min?: number, max?: number }
      if (!filterValue || (filterValue.min === undefined && filterValue.max === undefined)) return true;
      const numValue = Number(leadValue);
      if (isNaN(numValue)) return false;

      if (filterValue.min !== undefined && numValue < filterValue.min) return false;
      if (filterValue.max !== undefined && numValue > filterValue.max) return false;
      return true;

    case 'date-range':
      // filterValue is { start?: Date, end?: Date }
      if (!filterValue || (filterValue.start === undefined && filterValue.end === undefined)) return true;
      if (!leadValue) return false;

      const dateValue = new Date(leadValue);
      if (isNaN(dateValue.getTime())) return false;

      if (filterValue.start && dateValue < filterValue.start) return false;
      if (filterValue.end && dateValue > filterValue.end) return false;
      return true;

    case 'text':
      // filterValue is a search string
      if (!filterValue || filterValue.trim() === '') return true;
      if (!leadValue) return false;
      return String(leadValue).toLowerCase().includes(filterValue.toLowerCase());

    default:
      return true;
  }
}
