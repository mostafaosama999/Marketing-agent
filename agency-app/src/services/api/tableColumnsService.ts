// src/services/api/tableColumnsService.ts
// Service for managing table columns (default + custom fields)

import { TableColumnConfig, DEFAULT_TABLE_COLUMNS } from '../../types/table';
import { getCustomFieldsConfig } from './customFieldsService';
import { CustomField } from '../../types/crm';

/**
 * Build complete table column list from default columns + custom fields
 * @returns Array of all available table columns
 */
export async function buildTableColumns(): Promise<TableColumnConfig[]> {
  try {
    // Start with default columns
    const columns: TableColumnConfig[] = [...DEFAULT_TABLE_COLUMNS];

    // Fetch custom fields configuration
    const customFieldsConfig = await getCustomFieldsConfig();

    // Add custom fields that should show in table
    const customFieldColumns: TableColumnConfig[] = customFieldsConfig.fields
      .filter((field: CustomField) => field.showInTable)
      .sort((a: CustomField, b: CustomField) => a.order - b.order)
      .map((field: CustomField, index: number) => ({
        id: `custom_${field.name}`,
        label: field.label,
        sortable: true,
        visible: field.visible !== false, // Default to visible if not specified
        type: 'custom' as const,
        order: columns.length + index, // Continue numbering after default columns
        fieldType: field.type,
        fieldName: field.name,
      }));

    return [...columns, ...customFieldColumns];
  } catch (error) {
    console.error('Error building table columns:', error);
    // Return just default columns on error
    return DEFAULT_TABLE_COLUMNS;
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
