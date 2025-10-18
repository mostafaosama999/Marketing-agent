// CRM Lead management types

export interface Lead {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  status: string; // Now flexible to support custom pipeline stages
  createdAt: Date;
  updatedAt: Date;
}

export type ViewMode = 'board' | 'table';

export interface LeadFormData {
  name: string;
  email: string;
  company: string;
  phone: string;
  status: string;
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
  leadField: keyof LeadFormData | null;
}
