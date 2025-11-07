// src/types/table.ts

export interface TableColumnConfig {
  id: string;
  label: string;
  sortable: boolean;
  visible: boolean;
  type: 'default' | 'custom';
  order: number; // Order position in the table
  section?: 'general' | 'linkedin' | 'email'; // Section for visual grouping and styling
  fieldType?: 'text' | 'number' | 'date' | 'select' | 'dropdown' | 'boolean'; // Only for custom fields
  fieldName?: string; // Only for custom fields (used to access customFields[fieldName])
  dropdownOptions?: string[]; // For dropdown/select fields - available options
}

// Column preferences type for localStorage
export type ColumnPreferences = Record<string, { visible: boolean; order: number }>;

// Leads table columns
export const DEFAULT_LEADS_TABLE_COLUMNS: TableColumnConfig[] = [
  { id: 'name', label: 'Name', sortable: true, visible: true, type: 'default', order: 0, section: 'general' },
  { id: 'email', label: 'Email', sortable: true, visible: true, type: 'default', order: 1, section: 'email' },
  { id: 'company', label: 'Company', sortable: true, visible: true, type: 'default', order: 2, section: 'general' },
  { id: 'status', label: 'Status', sortable: true, visible: true, type: 'default', order: 3, section: 'general' },
  { id: 'linkedin_status', label: 'LinkedIn', sortable: true, visible: true, type: 'default', order: 4, section: 'linkedin' },
  { id: 'email_outreach_status', label: 'Email Outreach', sortable: true, visible: true, type: 'default', order: 5, section: 'email' },
  { id: 'createdAt', label: 'Created', sortable: true, visible: true, type: 'default', order: 6, section: 'general' },
];

// Companies table columns
export const DEFAULT_COMPANIES_TABLE_COLUMNS: TableColumnConfig[] = [
  { id: 'name', label: 'Company Name', sortable: true, visible: true, type: 'default', order: 0 },
  { id: 'website', label: 'Website', sortable: true, visible: true, type: 'default', order: 1 },
  { id: 'industry', label: 'Industry', sortable: true, visible: true, type: 'default', order: 2 },
  { id: 'description', label: 'Description', sortable: true, visible: false, type: 'default', order: 3 },
  { id: 'leadCount', label: 'Leads', sortable: true, visible: true, type: 'default', order: 4 },
  { id: 'createdAt', label: 'Created', sortable: true, visible: false, type: 'default', order: 5 },
];

// Backwards compatibility
export const DEFAULT_TABLE_COLUMNS = DEFAULT_LEADS_TABLE_COLUMNS;

export const TABLE_COLUMNS_STORAGE_KEY = 'crm_table_columns_visibility';
export const COMPANIES_TABLE_COLUMNS_STORAGE_KEY = 'companies_table_columns_visibility';

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
