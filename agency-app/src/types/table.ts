// src/types/table.ts

import { CustomFieldType } from './crm';

export interface TableColumnConfig {
  id: string;
  label: string;
  sortable: boolean;
  visible: boolean;
  type: 'default' | 'custom';
  order: number; // Order position in the table
  fieldType?: CustomFieldType; // Only for custom fields
  fieldName?: string; // Only for custom fields (used to access customFields[fieldName])
}

export const DEFAULT_TABLE_COLUMNS: TableColumnConfig[] = [
  { id: 'name', label: 'Name', sortable: true, visible: true, type: 'default', order: 0 },
  { id: 'email', label: 'Email', sortable: true, visible: true, type: 'default', order: 1 },
  { id: 'company', label: 'Company', sortable: true, visible: true, type: 'default', order: 2 },
  { id: 'status', label: 'Status', sortable: true, visible: true, type: 'default', order: 3 },
  { id: 'linkedin_status', label: 'LinkedIn', sortable: true, visible: true, type: 'default', order: 4 },
  { id: 'email_outreach_status', label: 'Email Outreach', sortable: true, visible: true, type: 'default', order: 5 },
  { id: 'createdAt', label: 'Created', sortable: true, visible: true, type: 'default', order: 6 },
];

export const TABLE_COLUMNS_STORAGE_KEY = 'crm_table_columns_visibility';

/**
 * Apply saved visibility preferences to column list
 */
export function applyVisibilityPreferences(
  columns: TableColumnConfig[],
  savedPreferences: Record<string, boolean> | null
): TableColumnConfig[] {
  if (!savedPreferences) return columns;

  return columns.map(col => ({
    ...col,
    visible: savedPreferences[col.id] !== undefined ? savedPreferences[col.id] : col.visible,
  }));
}
