// CRM Lead management types

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  status: string; // Now flexible to support custom pipeline stages
  customFields: Record<string, any>; // Dynamic custom field values
  createdAt: Date;
  updatedAt: Date;
  apolloEnriched?: boolean; // Track if enriched with Apollo
  lastEnrichedAt?: Date; // Last enrichment timestamp
  // Blog Qualification
  blogQualified?: boolean; // Whether blog was qualified
  blogQualificationData?: BlogQualificationData; // Full qualification results
  blogQualifiedAt?: Date; // When qualification was performed
  // API Cost Tracking
  totalApiCosts?: number; // Total API costs accumulated for this lead
  lastApiCostUpdate?: Date; // Last time API costs were updated
}

export interface BlogQualificationData {
  website: string;
  hasActiveBlog: boolean;
  blogPostCount: number;
  lastBlogCreatedAt: string;
  hasMultipleAuthors: boolean;
  authorCount: number;
  authorNames: string;
  isDeveloperB2BSaas: boolean;
  authorsAreEmployees: "employees" | "freelancers" | "mixed" | "unknown";
  coversAiTopics: boolean;
  contentSummary: string;
  blogLinkUsed: string;
  rssFeedFound: boolean;
  analysisMethod: "RSS" | "AI" | "RSS + AI (authors)" | "None";
  qualified: boolean;
}

export type ViewMode = 'board' | 'table';

export interface LeadFormData {
  name: string;
  email: string;
  company: string;
  phone: string;
  status: string;
  customFields?: Record<string, any>; // Optional for form data
}

// Pipeline Stage Configuration
export interface PipelineStage {
  id: string;
  label: string;
  color: string;
  order: number;
  visible: boolean;
}

export interface PipelineConfig {
  id: string;
  stages: PipelineStage[];
  createdAt: Date;
  updatedAt: Date;
}

// Default pipeline stages
export const DEFAULT_PIPELINE_STAGES: Omit<PipelineStage, 'id'>[] = [
  { label: 'New Lead', color: '#9e9e9e', order: 0, visible: true },
  { label: 'Contacted', color: '#2196f3', order: 1, visible: true },
  { label: 'Qualified', color: '#ff9800', order: 2, visible: true },
  { label: 'Proposal', color: '#9c27b0', order: 3, visible: true },
  { label: 'Negotiation', color: '#f44336', order: 4, visible: true },
  { label: 'Won', color: '#4caf50', order: 5, visible: true },
  { label: 'Lost', color: '#607d8b', order: 6, visible: true },
];

// Filter types
export interface LeadFilters {
  search: string;
  stages: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}

// CSV Import types
export interface CSVRow {
  [key: string]: string;
}

export interface FieldMapping {
  csvField: string;
  leadField: keyof LeadFormData | string | null; // Allow custom field names
}

// Custom Fields Configuration
export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'url';

export interface CustomField {
  id: string;
  name: string; // Internal field name (e.g., "lead_owner")
  label: string; // Display label (e.g., "Lead Owner")
  type: CustomFieldType;
  options?: string[]; // For select, radio, checkbox types
  required: boolean;
  visible: boolean; // Show in UI
  showInTable: boolean; // Display as column in table view
  showInCard: boolean; // Display on kanban cards
  order: number; // Display order
}

export interface CustomFieldsConfig {
  id: string;
  fields: CustomField[];
  createdAt: Date;
  updatedAt: Date;
}

// Default custom fields
export const DEFAULT_CUSTOM_FIELDS: Omit<CustomField, 'id'>[] = [
  {
    name: 'lead_owner',
    label: 'Lead Owner',
    type: 'select',
    options: ['Unassigned', 'Sales Team A', 'Sales Team B', 'Sales Team C'],
    required: false,
    visible: true,
    showInTable: true,
    showInCard: true,
    order: 0,
  },
  {
    name: 'priority',
    label: 'Priority',
    type: 'select',
    options: ['Low', 'Medium', 'High', 'Urgent'],
    required: false,
    visible: true,
    showInTable: true,
    showInCard: true,
    order: 1,
  },
  {
    name: 'deal_value',
    label: 'Deal Value',
    type: 'number',
    required: false,
    visible: true,
    showInTable: true,
    showInCard: false,
    order: 2,
  },
];
