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

  // Archive status
  archived?: boolean;
  archivedAt?: Date;
  archivedBy?: string; // User ID who archived the company

  // Offer/Pitch for lead outreach
  offer?: {
    blogIdea: string; // The blog idea/topic to offer
    createdAt: Date;
    updatedAt: Date;
  };

  // AI-Generated Blog Ideas (new system)
  offerIdeas?: {
    ideas: Array<{
      id: string;
      title: string;
      content: string;
      approved: boolean;
      rejected: boolean;
      feedback?: string;
      createdAt: Date;
    }>;
    sessionId?: string; // Track generation session
    generationPrompt?: string; // User's input prompt
    lastGeneratedAt?: Date;
    generalFeedback?: string; // Overall notes/feedback
  };

  // Writing Program Analysis
  writingProgramAnalysis?: {
    hasProgram: boolean;
    programUrl: string | null;
    isOpen: boolean | null;
    openDates: { openFrom: string; closedFrom: string } | null;
    payment: {
      amount: string | null;           // e.g., "$300 to $500"
      method: string | null;            // e.g., "Deel", "PayPal", "gift cards"
      details: string | null;           // Additional info: bonuses, performance-based, etc.
      sourceSnippet: string | null;     // Quoted proof from the page (max ~200 chars)
      historical: string | null;        // Previous payment rates if mentioned
    };
    requirements?: string[];
    requirementTypes?: string[];
    submissionGuidelines?: string;
    contactEmail?: string;
    responseTime?: string;
    publishedDate?: string | null;         // Date the writing program was published (e.g., "July 20, 2021")
    publishedDateSource?: string | null;   // Where the date was found (e.g., "article header", "meta tag")
    programDetails?: string;
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
      reasoning?: string; // Why this rating was given
    };
    isDeveloperB2BSaas: boolean;
    contentSummary: string;
    blogUrl: string | null;
    lastPostUrl?: string | null; // URL to the most recent blog post
    rssFeedUrl?: string | null; // URL to the RSS feed
    lastAnalyzedAt: Date;
    costInfo?: {
      totalCost: number;
      totalTokens: number;
    };
  };

  // Apollo Enrichment (Company-specific data from Apollo.io)
  apolloEnrichment?: {
    apolloId: string | null;
    name: string | null;
    website: string | null;
    employeeCount: number | null;
    employeeRange: string | null; // "1-10", "11-50", "51-200", etc.
    foundedYear: number | null;
    totalFunding: number | null;
    totalFundingFormatted: string | null; // e.g., "$10.5M"
    latestFundingStage: string | null; // e.g., "Series A", "Seed"
    latestFundingDate: string | null;
    industry: string | null;
    industries: string[];
    secondaryIndustries: string[];
    keywords: string[];
    technologies: string[]; // Technology stack (e.g., ["React", "Node.js", "AWS"])
    description: string | null;
    logoUrl: string | null;
    linkedinUrl: string | null;
    twitterUrl: string | null;
    facebookUrl: string | null;
    crunchbaseUrl: string | null;
    angellistUrl: string | null;
    blogUrl: string | null;
    phone: string | null;
    address: {
      street: string | null;
      city: string | null;
      state: string | null;
      postalCode: string | null;
      country: string | null;
      raw: string | null;
    };
    publiclyTraded: {
      symbol: string;
      exchange: string | null;
    } | null;
    lastEnrichedAt: Date;
    costInfo?: {
      credits: number;
      timestamp: Date;
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
  fieldType?: 'text' | 'number' | 'date' | 'dropdown'; // Type of field for validation and UI
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
