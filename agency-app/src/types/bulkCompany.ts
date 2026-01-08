// Types for bulk company addition feature

export interface BulkCompanyRow {
  id: string; // Client-side unique ID for row tracking
  name: string;
  website: string;
  industry: string;
  description: string;
  ratingV2: string; // String in input, converted to number on validation
}

export interface BulkCompanyValidation {
  isValid: boolean;
  isDuplicate?: boolean; // Warning flag for existing company
  errors: {
    name?: string;
    website?: string;
    ratingV2?: string;
  };
}

export interface BulkCompanyImportResult {
  successful: number;
  failed: number;
  companyIds: string[];
  errors: string[];
}
