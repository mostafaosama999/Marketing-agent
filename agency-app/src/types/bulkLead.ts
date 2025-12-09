// Types for bulk lead addition feature

export interface BulkLeadRow {
  id: string;
  name: string;
  lastName: string;
  jobTitle: string;
  linkedInUrl: string;
  email: string;
}

export interface BulkLeadValidation {
  isValid: boolean;
  errors: {
    name?: string;
    email?: string;
    linkedInUrl?: string;
  };
}

export interface BulkLeadImportResult {
  successful: number;
  failed: number;
  leadIds: string[];
  errors: string[];
}
