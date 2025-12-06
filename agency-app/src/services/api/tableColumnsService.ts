// src/services/api/tableColumnsService.ts
// Service for managing table columns (default + custom fields)

import {
  TableColumnConfig,
  DEFAULT_LEADS_TABLE_COLUMNS,
  DEFAULT_COMPANIES_TABLE_COLUMNS,
  DEFAULT_WRITING_PROGRAM_TABLE_COLUMNS
} from '../../types/table';
import { Company } from '../../types/crm';
import { Lead } from '../../types/lead';
import { getFieldDefinitions, getDeletedDefaultFieldIds } from './fieldDefinitionsService';
import { FieldSection } from '../../types/crm';
import { getSectionFromFieldName } from '../../types/fieldDefinitions';

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
 * Auto-group columns by section for visual organization
 * Order: General → LinkedIn → Email
 * Preserves relative order within each section
 */
function autoGroupColumnsBySection(columns: TableColumnConfig[]): TableColumnConfig[] {
  // Section priority order
  const sectionOrder: Record<string, number> = {
    general: 0,
    linkedin: 1,
    email: 2,
  };

  // Group columns by section
  const general: TableColumnConfig[] = [];
  const linkedin: TableColumnConfig[] = [];
  const email: TableColumnConfig[] = [];
  const unsectioned: TableColumnConfig[] = [];

  columns.forEach(col => {
    if (col.section === 'general') {
      general.push(col);
    } else if (col.section === 'linkedin') {
      linkedin.push(col);
    } else if (col.section === 'email') {
      email.push(col);
    } else {
      // Default to general for columns without section
      unsectioned.push(col);
    }
  });

  // Concatenate in order: General → LinkedIn → Email
  const grouped = [...general, ...unsectioned, ...linkedin, ...email];

  // Reassign order indices to match new grouping
  return grouped.map((col, index) => ({
    ...col,
    order: index,
  }));
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
 * Auto-groups columns by section: General → LinkedIn → Email
 * Filters out deleted default fields
 */
export async function buildLeadsTableColumns(leads: Lead[]): Promise<TableColumnConfig[]> {
  try {
    // Get deleted default field IDs to filter them out
    const deletedFieldIds = await getDeletedDefaultFieldIds('lead');

    // Start with default columns, filtering out deleted ones
    const columns: TableColumnConfig[] = DEFAULT_LEADS_TABLE_COLUMNS.filter(
      col => !deletedFieldIds.has(col.id)
    );

    // Extract all unique custom field names from leads
    const customFieldNames = new Set<string>();
    leads.forEach(lead => {
      if (lead.customFields) {
        Object.keys(lead.customFields).forEach(fieldName => {
          customFieldNames.add(fieldName);
        });
      }
    });

    // Fetch ALL field definitions (not just dropdowns) to get section and type info
    const fieldDefinitions = await getFieldDefinitions('lead');

    const fieldDefMap = new Map(fieldDefinitions.map(def => [def.name, def]));

    // Also include field names from field definitions (even if no leads have data yet)
    fieldDefinitions.forEach(def => {
      customFieldNames.add(def.name);
    });

    // Fields that are built-in (not custom) - exclude from custom field columns
    const builtInFieldNames = new Set(['rating']);

    // Create column configs for each custom field (excluding built-in fields, only those with definitions)
    const customFieldColumns: TableColumnConfig[] = Array.from(customFieldNames)
      .filter(fieldName => !builtInFieldNames.has(fieldName) && fieldDefMap.has(fieldName))
      .sort()
      .map((fieldName, index) => {
        const totalIndex = columns.length + index;
        const fieldDef = fieldDefMap.get(fieldName);

        // Use label from field definition if available, otherwise generate from field name
        let label: string;
        if (fieldDef?.label) {
          label = fieldDef.label;
        } else {
          // Clean up label by removing section prefixes (linkedin_, email_)
          const cleanFieldName = fieldName
            .replace(/^linkedin_/, '')
            .replace(/^email_/, '');

          label = cleanFieldName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }

        // Get field type and section from field definition, or use defaults
        const fieldType: 'dropdown' | 'text' = fieldDef?.fieldType === 'dropdown' ? 'dropdown' : 'text';
        // Auto-detect section from field name if not set in field definition
        const section: FieldSection | undefined = fieldDef?.section || getSectionFromFieldName(fieldName);

        return {
          id: `custom_${fieldName}`,
          label: label,
          sortable: true,
          visible: totalIndex < 30, // Show first 30 total columns by default
          type: 'custom' as const,
          order: totalIndex,
          section: section, // Include section for visual grouping
          fieldType: fieldType,
          fieldName: fieldName,
        };
      });

    // Combine default and custom columns
    const allColumns = [...columns, ...customFieldColumns];

    // Auto-group by section (General → LinkedIn → Email)
    return autoGroupColumnsBySection(allColumns);
  } catch (error) {
    console.error('Error building leads table columns:', error);
    // Return just default columns on error
    return DEFAULT_LEADS_TABLE_COLUMNS;
  }
}

/**
 * Build companies table columns (default + custom fields from companies)
 * Scans all companies' customFields to find unique field names
 * Filters out deleted default fields
 */
export async function buildCompaniesTableColumns(companies: Company[]): Promise<TableColumnConfig[]> {
  try {
    // Get deleted default field IDs to filter them out
    const deletedFieldIds = await getDeletedDefaultFieldIds('company');

    // Start with default columns, filtering out deleted ones
    const columns: TableColumnConfig[] = DEFAULT_COMPANIES_TABLE_COLUMNS.filter(
      col => !deletedFieldIds.has(col.id)
    );

    // Extract all unique custom field names from companies
    const customFieldNames = new Set<string>();
    companies.forEach(company => {
      if (company.customFields) {
        Object.keys(company.customFields).forEach(fieldName => {
          customFieldNames.add(fieldName);
        });
      }
    });

    // Query field definitions to determine field types and sections
    const fieldDefinitions = await getFieldDefinitions('company');
    const fieldDefMap = new Map(fieldDefinitions.map(def => [def.name, def]));

    // Also include field names from field definitions (even if no companies have data yet)
    fieldDefinitions.forEach(def => {
      customFieldNames.add(def.name);
    });

    // Create column configs for each custom field (only those with field definitions)
    const customFieldColumns: TableColumnConfig[] = Array.from(customFieldNames)
      .filter(fieldName => fieldDefMap.has(fieldName)) // Only show fields with definitions
      .sort()
      .map((fieldName, index) => {
        const totalIndex = columns.length + index;
        const fieldDef = fieldDefMap.get(fieldName);

        // Use label from field definition if available, otherwise generate from field name
        let label: string;
        if (fieldDef?.label) {
          label = fieldDef.label;
        } else {
          // Clean up label by removing section prefixes (linkedin_, email_)
          const cleanFieldName = fieldName
            .replace(/^linkedin_/, '')
            .replace(/^email_/, '');

          label = cleanFieldName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }

        // Get field type and section from field definition, or use defaults
        const fieldType: 'dropdown' | 'text' = fieldDef?.fieldType === 'dropdown' ? 'dropdown' : 'text';
        // Auto-detect section from field name if not set in field definition
        const section: FieldSection | undefined = fieldDef?.section || getSectionFromFieldName(fieldName);

        return {
          id: `custom_${fieldName}`,
          label: label,
          sortable: true,
          visible: totalIndex < 10, // Show first 10 total columns by default
          type: 'custom' as const,
          order: totalIndex,
          section: section, // Include section for visual grouping
          fieldType: fieldType,
          fieldName: fieldName,
        };
      });

    // Combine default and custom columns
    const allColumns = [...columns, ...customFieldColumns];

    // Auto-group by section (General → LinkedIn → Email)
    return autoGroupColumnsBySection(allColumns);
  } catch (error) {
    console.error('Error building companies table columns:', error);
    // Return just default columns on error
    return DEFAULT_COMPANIES_TABLE_COLUMNS;
  }
}

/**
 * Build writing program table columns (default + custom fields from companies)
 * Only includes custom fields that contain "community", "writing", or "program" in their name
 * These are likely related to writing programs and should be shown in the writing program view
 */
export async function buildWritingProgramTableColumns(companies: Company[]): Promise<TableColumnConfig[]> {
  try {
    // Start with default writing program columns
    const columns: TableColumnConfig[] = [...DEFAULT_WRITING_PROGRAM_TABLE_COLUMNS];

    // Extract custom field names that are related to writing programs
    const customFieldNames = new Set<string>();
    companies.forEach(company => {
      if (company.customFields) {
        Object.keys(company.customFields).forEach(fieldName => {
          // Only include fields that likely relate to writing programs
          const lowerFieldName = fieldName.toLowerCase();
          if (
            lowerFieldName.includes('community') ||
            lowerFieldName.includes('writing') ||
            lowerFieldName.includes('program') ||
            lowerFieldName.includes('contributor')
          ) {
            customFieldNames.add(fieldName);
          }
        });
      }
    });

    // Query field definitions to determine field types and sections
    const fieldDefinitions = await getFieldDefinitions('company');
    const fieldDefMap = new Map(fieldDefinitions.map(def => [def.name, def]));

    // Create column configs for each writing-program-related custom field
    const customFieldColumns: TableColumnConfig[] = Array.from(customFieldNames)
      .sort()
      .map((fieldName, index) => {
        const totalIndex = columns.length + index;
        const fieldDef = fieldDefMap.get(fieldName);

        // Use label from field definition if available, otherwise generate from field name
        let label: string;
        if (fieldDef?.label) {
          label = fieldDef.label;
        } else {
          // Clean up label by removing prefixes
          const cleanFieldName = fieldName
            .replace(/^linkedin_/, '')
            .replace(/^email_/, '');

          label = cleanFieldName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        }

        // Get field type from definition, or default to text
        const fieldType: 'dropdown' | 'text' = fieldDef?.fieldType === 'dropdown' ? 'dropdown' : 'text';
        const section: FieldSection | undefined = fieldDef?.section || getSectionFromFieldName(fieldName);

        return {
          id: `custom_${fieldName}`,
          label: label,
          sortable: true,
          visible: true, // Show all writing program custom fields by default
          type: 'custom' as const,
          order: totalIndex,
          section: section,
          fieldType: fieldType,
          fieldName: fieldName,
        };
      });

    // Combine default and custom columns
    const allColumns = [...columns, ...customFieldColumns];

    // Auto-group by section
    return autoGroupColumnsBySection(allColumns);
  } catch (error) {
    console.error('Error building writing program table columns:', error);
    // Return just default columns on error
    return DEFAULT_WRITING_PROGRAM_TABLE_COLUMNS;
  }
}

/**
 * Convert column list to visibility map for localStorage (backward compatibility)
 */
export function columnsToVisibilityMap(columns: TableColumnConfig[]): Record<string, boolean> {
  return columns.reduce((acc, col) => {
    acc[col.id] = col.visible;
    return acc;
  }, {} as Record<string, boolean>);
}

/**
 * Convert column list to full preferences (visibility + order) for localStorage
 */
export function columnsToPreferences(columns: TableColumnConfig[]): Record<string, { visible: boolean; order: number }> {
  return columns.reduce((acc, col) => {
    acc[col.id] = {
      visible: col.visible,
      order: col.order,
    };
    return acc;
  }, {} as Record<string, { visible: boolean; order: number }>);
}

/**
 * Apply saved preferences (visibility + order) to column list
 * Handles both old format (visibility only) and new format (visibility + order)
 * Intelligently inserts new columns (without saved preferences) next to their section siblings
 */
export function applyColumnPreferences(
  columns: TableColumnConfig[],
  savedPreferences: Record<string, boolean | { visible: boolean; order: number }> | null
): TableColumnConfig[] {
  if (!savedPreferences) return columns;

  // Separate columns into two groups: with and without saved preferences
  const columnsWithSavedOrder: TableColumnConfig[] = [];
  const newColumnsWithoutSavedOrder: TableColumnConfig[] = [];

  columns.forEach(col => {
    const pref = savedPreferences[col.id];

    if (pref === undefined) {
      // New column without saved preference
      newColumnsWithoutSavedOrder.push(col);
    } else if (typeof pref === 'boolean') {
      // Old format: boolean (visibility only)
      columnsWithSavedOrder.push({ ...col, visible: pref });
    } else {
      // New format: object with visibility and order
      columnsWithSavedOrder.push({
        ...col,
        visible: pref.visible,
        order: pref.order,
      });
    }
  });

  // If no new columns, just return the saved columns sorted
  if (newColumnsWithoutSavedOrder.length === 0) {
    return columnsWithSavedOrder.sort((a, b) => a.order - b.order);
  }

  // Sort columns with saved preferences by order
  const sortedSavedColumns = columnsWithSavedOrder.sort((a, b) => a.order - b.order);

  // For each new column, find the best insertion position based on its section
  // Insert it right after the last column with the same section
  const result = [...sortedSavedColumns];

  newColumnsWithoutSavedOrder.forEach(newCol => {
    // Find the index of the last column with the same section
    let insertIndex = -1;
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i].section === newCol.section) {
        insertIndex = i + 1;
        break;
      }
    }

    // If no column with same section found, append to end
    if (insertIndex === -1) {
      insertIndex = result.length;
    }

    // Insert the new column at the calculated position
    result.splice(insertIndex, 0, newCol);
  });

  // Reassign order indices to match final positions
  return result.map((col, index) => ({
    ...col,
    order: index,
  }));
}
