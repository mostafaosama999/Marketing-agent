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

// CSV Import types
export interface CSVRow {
  [key: string]: string;
}

export interface FieldMapping {
  csvField: string;
  leadField: string | null; // Lead field name or custom field name
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

// LeadStatus to display label mapping
export const LEAD_STATUS_TO_LABEL: Record<LeadStatus, string> = {
  'new_lead': 'New Lead',
  'qualified': 'Qualified',
  'contacted': 'Contacted',
  'follow_up': 'Follow up',
  'won': 'Won',
  'lost': 'Lost',
};
