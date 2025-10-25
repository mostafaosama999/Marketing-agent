// src/services/api/tableColumnsService.ts
// Service for managing table columns (default + custom fields)

import {
  TableColumnConfig,
  DEFAULT_TABLE_COLUMNS,
  DEFAULT_LEADS_TABLE_COLUMNS,
  DEFAULT_COMPANIES_TABLE_COLUMNS
} from '../../types/table';
import { Company } from '../../types/crm';
import { Lead } from '../../types/lead';

/**
 * Get all unique custom field names from leads
 * @param leads Array of leads to scan for custom fields
 * @returns Array of unique custom field names (sorted alphabetically)
 */
export function getLeadCustomFieldNames(leads: Lead[]): string[] {
  const customFieldNames = new Set<string>();

  leads.forEach(lead => {
    if (lead.customFields) {
      Object.keys(lead.customFields).forEach(fieldName => {
        customFieldNames.add(fieldName);
      });
    }
  });

  return Array.from(customFieldNames).sort();
}

/**
 * Build complete table column list from default columns + custom fields (for leads)
 * @param leads Array of leads to scan for custom fields
 * @returns Array of all available table columns
 */
export async function buildTableColumns(leads: Lead[]): Promise<TableColumnConfig[]> {
  return buildLeadsTableColumns(leads);
}

/**
 * Build leads table columns (default + custom fields from actual lead data)
 * Scans all leads' customFields to find unique field names
 */
export async function buildLeadsTableColumns(leads: Lead[]): Promise<TableColumnConfig[]> {
  try {
    // Start with default columns
    const columns: TableColumnConfig[] = [...DEFAULT_LEADS_TABLE_COLUMNS];

    // Extract all unique custom field names from leads
    const customFieldNames = new Set<string>();
    leads.forEach(lead => {
      if (lead.customFields) {
        Object.keys(lead.customFields).forEach(fieldName => {
          customFieldNames.add(fieldName);
        });
      }
    });

    // Create column configs for each custom field
    const customFieldColumns: TableColumnConfig[] = Array.from(customFieldNames)
      .sort()
      .map((fieldName, index) => {
        const totalIndex = columns.length + index;

        return {
          id: `custom_${fieldName}`,
          label: fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' '),
          sortable: true,
          visible: totalIndex < 30, // Show first 30 total columns by default
          type: 'custom' as const,
          order: totalIndex,
          fieldType: 'text' as const, // Default to text for custom fields
          fieldName: fieldName,
        };
      });

    return [...columns, ...customFieldColumns];
  } catch (error) {
    console.error('Error building leads table columns:', error);
    // Return just default columns on error
    return DEFAULT_LEADS_TABLE_COLUMNS;
  }
}

/**
 * Build companies table columns (default + custom fields from companies)
 * Scans all companies' customFields to find unique field names
 */
export async function buildCompaniesTableColumns(companies: Company[]): Promise<TableColumnConfig[]> {
  try {
    // Start with default columns
    const columns: TableColumnConfig[] = [...DEFAULT_COMPANIES_TABLE_COLUMNS];

    // Extract all unique custom field names from companies
    const customFieldNames = new Set<string>();
    companies.forEach(company => {
      if (company.customFields) {
        Object.keys(company.customFields).forEach(fieldName => {
          customFieldNames.add(fieldName);
        });
      }
    });

    // Create column configs for each custom field
    const customFieldColumns: TableColumnConfig[] = Array.from(customFieldNames)
      .sort()
      .map((fieldName, index) => {
        const totalIndex = columns.length + index;

        return {
          id: `custom_${fieldName}`,
          label: fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' '),
          sortable: true,
          visible: totalIndex < 10, // Show first 10 total columns by default
          type: 'custom' as const,
          order: totalIndex,
          fieldType: 'text' as const, // Default to text for company custom fields
          fieldName: fieldName,
        };
      });

    return [...columns, ...customFieldColumns];
  } catch (error) {
    console.error('Error building companies table columns:', error);
    // Return just default columns on error
    return DEFAULT_COMPANIES_TABLE_COLUMNS;
  }
}

/**
 * Convert column list to visibility map for localStorage
 */
export function columnsToVisibilityMap(columns: TableColumnConfig[]): Record<string, boolean> {
  return columns.reduce((acc, col) => {
    acc[col.id] = col.visible;
    return acc;
  }, {} as Record<string, boolean>);
}
