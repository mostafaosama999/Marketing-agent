// src/types/companyFilter.ts
// Types for company filtering system

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
