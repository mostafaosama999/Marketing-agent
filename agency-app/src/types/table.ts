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
  { id: 'phone', label: 'Phone', sortable: true, visible: false, type: 'default', order: 2, section: 'general' },
  { id: 'company', label: 'Company', sortable: true, visible: true, type: 'default', order: 3, section: 'general' },
  { id: 'status', label: 'Status', sortable: true, visible: true, type: 'default', order: 4, section: 'general' },
  { id: 'linkedin_status', label: 'LinkedIn', sortable: true, visible: true, type: 'default', order: 5, section: 'linkedin' },
  { id: 'email_outreach_status', label: 'Email Outreach', sortable: true, visible: true, type: 'default', order: 6, section: 'email' },
  { id: 'createdAt', label: 'Created', sortable: true, visible: true, type: 'default', order: 7, section: 'general' },
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

// Writing Program table columns
export const DEFAULT_WRITING_PROGRAM_TABLE_COLUMNS: TableColumnConfig[] = [
  { id: 'company', label: 'Company', sortable: true, visible: true, type: 'default', order: 0, section: 'general' },
  { id: 'website', label: 'Website', sortable: true, visible: true, type: 'default', order: 1, section: 'general' },
  { id: 'programFound', label: 'Program Found', sortable: true, visible: true, type: 'default', order: 2, section: 'general' },
  { id: 'status', label: 'Status', sortable: true, visible: true, type: 'default', order: 3, section: 'general' },
  { id: 'payment', label: 'Payment', sortable: true, visible: true, type: 'default', order: 4, section: 'general' },
  { id: 'paymentMethod', label: 'Payment Method', sortable: true, visible: true, type: 'default', order: 5, section: 'general' },
  { id: 'programUrl', label: 'Program URL', sortable: true, visible: true, type: 'default', order: 6, section: 'general' },
  { id: 'contactEmail', label: 'Contact', sortable: true, visible: true, type: 'default', order: 7, section: 'general' },
  { id: 'publishedDate', label: 'Published', sortable: true, visible: false, type: 'default', order: 8, section: 'general' },
];

// Backwards compatibility
export const DEFAULT_TABLE_COLUMNS = DEFAULT_LEADS_TABLE_COLUMNS;

export const TABLE_COLUMNS_STORAGE_KEY = 'crm_table_columns_visibility';
export const COMPANIES_TABLE_COLUMNS_STORAGE_KEY = 'companies_table_columns_visibility';
export const WRITING_PROGRAM_TABLE_COLUMNS_STORAGE_KEY = 'writing_program_table_columns_visibility';

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
