// src/services/api/dynamicFilterService.ts
// Service for dynamically generating filter options from lead data and custom fields

import { Lead } from '../../types/lead';
import { CustomField, CustomFieldType } from '../../types/crm';

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
 * Fields are filterable if they're visible and have reasonable number of unique values
 */
export function isFieldFilterable(field: CustomField, leads: Lead[]): boolean {
  // Must be visible
  if (!field.visible) return false;

  // Get unique values for this field
  const uniqueValues = getUniqueValuesForField(leads, field.name);

  // Different criteria based on field type
  switch (field.type) {
    case 'select':
    case 'radio':
      // Always filterable if it's a select/radio field
      return true;

    case 'checkbox':
      // Boolean fields are always filterable
      return true;

    case 'text':
    case 'textarea':
      // Text fields are filterable if they have < 100 unique values
      // (otherwise it becomes impractical)
      return uniqueValues.length > 0 && uniqueValues.length < 100;

    case 'number':
      // Number fields are always filterable (as ranges)
      return uniqueValues.length > 0;

    case 'date':
      // Date fields are always filterable (as ranges)
      return uniqueValues.length > 0;

    case 'url':
      // URLs are generally not filterable (too specific)
      return false;

    default:
      return false;
  }
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
  field: CustomField,
  leads: Lead[]
): FilterConfig | null {
  if (!isFieldFilterable(field, leads)) {
    return null;
  }

  const baseConfig = {
    fieldName: field.name,
    label: field.label,
  };

  switch (field.type) {
    case 'select':
    case 'radio':
      // Use predefined options if available, otherwise extract from data
      const options = field.options?.length
        ? field.options
        : getUniqueValuesForField(leads, field.name);

      return {
        ...baseConfig,
        filterType: 'multiselect',
        options,
      };

    case 'checkbox':
      return {
        ...baseConfig,
        filterType: 'boolean',
      };

    case 'text':
    case 'textarea':
      // Text autocomplete with available values
      return {
        ...baseConfig,
        filterType: 'multiselect',
        options: getUniqueValuesForField(leads, field.name),
      };

    case 'number':
      // Extract numeric values and find min/max
      const numericValues = leads
        .map((lead) => lead.customFields?.[field.name])
        .filter((val) => val !== undefined && val !== null && val !== '')
        .map((val) => Number(val))
        .filter((val) => !isNaN(val));

      if (numericValues.length === 0) return null;

      return {
        ...baseConfig,
        filterType: 'number-range',
        min: Math.min(...numericValues),
        max: Math.max(...numericValues),
      };

    case 'date':
      return {
        ...baseConfig,
        filterType: 'date-range',
      };

    default:
      return null;
  }
}

/**
 * Get all filterable custom fields with their configurations
 */
export function getFilterableFields(
  customFields: CustomField[],
  leads: Lead[]
): FilterConfig[] {
  const filterConfigs: FilterConfig[] = [];

  for (const field of customFields) {
    const config = getFilterConfig(field, leads);
    if (config) {
      filterConfigs.push(config);
    }
  }

  // Sort by field order
  return filterConfigs.sort((a, b) => {
    const fieldA = customFields.find((f) => f.name === a.fieldName);
    const fieldB = customFields.find((f) => f.name === b.fieldName);
    return (fieldA?.order || 0) - (fieldB?.order || 0);
  });
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
