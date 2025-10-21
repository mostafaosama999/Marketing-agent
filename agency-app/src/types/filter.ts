// src/types/filter.ts
// Types for the advanced filtering system

import { LeadStatus } from './lead';

/**
 * Filter operators for different field types
 */
export type FilterOperator =
  // Text operators
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'not_equals'
  | 'starts_with'
  | 'ends_with'
  // Number/Date operators
  | 'greater_than'
  | 'less_than'
  | 'greater_than_equal'
  | 'less_than_equal'
  | 'before'
  | 'after'
  | 'between'
  // Select operators
  | 'is_one_of'
  | 'is_none_of'
  // Universal operators
  | 'is_empty'
  | 'is_not_empty'
  // Boolean operators
  | 'is_true'
  | 'is_false';

/**
 * Single filter rule
 */
export interface FilterRule {
  id: string;
  field: string; // Field name (standard field or custom field name)
  fieldLabel: string; // Display label
  operator: FilterOperator;
  value: any; // Value type depends on field type
  logicGate: 'AND' | 'OR'; // Logic connector to next rule
}

/**
 * Advanced filter builder state
 */
export interface FilterBuilderState {
  rules: FilterRule[];
}

/**
 * Unified filter state (for backward compatibility)
 */
export interface FilterState {
  // Standard filters
  search: string;
  statuses: LeadStatus[];
  company: string;
  month: string;

  // Dynamic custom field filters
  [customFieldName: string]: any;
}

/**
 * Field definition for filter builder
 */
export interface FilterableField {
  name: string; // Internal field name
  label: string; // Display label
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: string[]; // For select fields
  isCustomField: boolean;
}

/**
 * Active filter for display in chips
 */
export interface ActiveFilter {
  fieldName: string;
  label: string;
  displayValue: string;
  onRemove: () => void;
}

/**
 * Filter Preset - Saved filter configuration
 */
export interface FilterPreset {
  id: string;
  name: string;
  description?: string;

  // Filter data
  advancedRules: FilterRule[];
  basicFilters: FilterState;

  // View preferences
  viewMode: 'board' | 'table';
  tableColumns?: Record<string, boolean>;

  // Metadata
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  userId: string;
  isDefault?: boolean;

  // Optional: Team sharing (future enhancement)
  shared?: boolean;
  sharedWith?: string[]; // User IDs
}

/**
 * Request to save a filter preset
 */
export interface SavePresetRequest {
  name: string;
  description?: string;
  advancedRules: FilterRule[];
  basicFilters: FilterState;
  viewMode: 'board' | 'table';
  tableColumns?: Record<string, boolean>;
  isDefault?: boolean;
}

/**
 * Preset list item for dropdown display
 */
export interface PresetListItem {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: string;
}
