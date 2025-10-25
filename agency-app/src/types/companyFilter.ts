// src/types/companyFilter.ts
// Types for company filtering system

import { FilterRule } from './filter';

/**
 * Company-specific filter state
 */
export interface CompanyFilterState {
  // Standard filters
  search: string;
  industry: string;
  employeeRange: string;
  fundingStage: string;

  // Dynamic custom field filters
  [customFieldName: string]: any;
}

/**
 * Default/empty company filter state
 */
export const DEFAULT_COMPANY_FILTER_STATE: CompanyFilterState = {
  search: '',
  industry: '',
  employeeRange: '',
  fundingStage: '',
};

/**
 * Company Filter Preset - Saved filter configuration for companies
 */
export interface CompanyFilterPreset {
  id: string;
  name: string;
  description?: string;

  // Filter data
  advancedRules: FilterRule[];
  basicFilters: CompanyFilterState;

  // View preferences
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
 * Request to save a company filter preset
 */
export interface SaveCompanyPresetRequest {
  name: string;
  description?: string;
  advancedRules: FilterRule[];
  basicFilters: CompanyFilterState;
  tableColumns?: Record<string, boolean>;
  isDefault?: boolean;
}

/**
 * Company preset list item for dropdown display
 */
export interface CompanyPresetListItem {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  createdAt: string;
}
