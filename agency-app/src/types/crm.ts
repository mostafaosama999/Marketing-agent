// CRM Configuration and Company types

import { LeadStatus } from './lead';

// Company management types
export interface Company {
  id: string;
  name: string; // Required, unique (case-insensitive)
  website?: string;
  industry?: string;
  description?: string;
  customFields?: Record<string, any>; // Dynamic custom field values
  createdAt: Date;
  updatedAt: Date;

  // API Cost Tracking
  totalApiCosts?: number;
  lastApiCostUpdate?: Date;

  // Writing Program Analysis
  writingProgramAnalysis?: {
    hasProgram: boolean;
    programUrl: string | null;
    isOpen: boolean | null;
    openDates: { openFrom: string; closedFrom: string } | null;
    paymentAmount: string | null;
    historicalPayment: string | null;
    lastAnalyzedAt: Date;
    aiReasoning?: string;
    costInfo?: {
      totalCost: number;
      totalTokens: number;
    };
  };

  // Blog Analysis
  blogAnalysis?: {
    lastActivePost: string | null; // ISO date string or relative time
    monthlyFrequency: number; // Posts per month
    writers: {
      count: number;
      areEmployees: boolean;
      areFreelancers: boolean;
      list: string[]; // Array of writer names
    };
    blogNature: {
      isAIWritten: boolean;
      isTechnical: boolean;
      rating: 'low' | 'medium' | 'high';
      hasCodeExamples: boolean;
      hasDiagrams: boolean;
    };
    isDeveloperB2BSaas: boolean;
    contentSummary: string;
    blogUrl: string | null;
    lastAnalyzedAt: Date;
    costInfo?: {
      totalCost: number;
      totalTokens: number;
    };
  };
}

export interface CompanyFormData {
  name: string;
  website?: string;
  industry?: string;
  description?: string;
  customFields?: Record<string, any>;
}

// Pipeline Stage Configuration
export interface PipelineStage {
  id: string;
  label: string; // Display name (becomes the lead's status field)
  color: string; // Hex color for the column
  order: number; // Position in the board (0-5)
  visible: boolean; // Whether the stage is visible
}

export interface PipelineConfig {
  id: string;
  stages: PipelineStage[];
  createdAt: Date;
  updatedAt: Date;
}

// Default pipeline stages matching requirements
export const DEFAULT_PIPELINE_STAGES: Omit<PipelineStage, 'id'>[] = [
  { label: 'New Lead', color: '#9e9e9e', order: 0, visible: true },
  { label: 'Qualified', color: '#ff9800', order: 1, visible: true },
  { label: 'Contacted', color: '#2196f3', order: 2, visible: true },
  { label: 'Follow up', color: '#9c27b0', order: 3, visible: true },
  { label: 'Won', color: '#4caf50', order: 4, visible: true },
  { label: 'Lost', color: '#607d8b', order: 5, visible: true },
];

// CSV Import types
export interface CSVRow {
  [key: string]: string;
}

export type FieldSection = 'general' | 'linkedin' | 'email';
export type EntityType = 'lead' | 'company';

export interface FieldMapping {
  csvField: string;
  leadField: string | null; // Lead field name or custom field name
  section?: FieldSection; // Section grouping for UI
  autoCreate?: boolean; // Whether to auto-create this field as custom field if unmapped
  entityType?: EntityType; // Whether this field applies to lead or company entity
}

// Status to internal LeadStatus mapping
export const STATUS_TO_LEAD_STATUS: Record<string, LeadStatus> = {
  'New Lead': 'new_lead',
  'Qualified': 'qualified',
  'Contacted': 'contacted',
  'Follow up': 'follow_up',
  'Won': 'won',
  'Lost': 'lost',
};

// LeadStatus to display label mapping (default/fallback values)
// Note: Use usePipelineConfigContext().getLabel() for dynamic labels from Firestore
export const LEAD_STATUS_TO_LABEL: Record<LeadStatus, string> = {
  'new_lead': 'New Lead',
  'qualified': 'Qualified',
  'contacted': 'Contacted',
  'follow_up': 'Follow up',
  'won': 'Won',
  'lost': 'Lost',
};

/**
 * Get label for a status with fallback to default
 * This is a helper for components that can't use the context
 */
export function getStatusLabel(
  status: LeadStatus,
  labelMap?: Record<LeadStatus, string>
): string {
  if (labelMap) {
    return labelMap[status] || LEAD_STATUS_TO_LABEL[status];
  }
  return LEAD_STATUS_TO_LABEL[status];
}
