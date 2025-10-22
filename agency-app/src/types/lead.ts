// CRM Lead management types

// Lead status type (pipeline stages)
export type LeadStatus = 'new_lead' | 'qualified' | 'contacted' | 'follow_up' | 'won' | 'lost';

// Main Lead interface
export interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string; // Company name (for display/legacy)
  companyId?: string; // Reference to Company document
  companyName?: string; // Denormalized company name for performance
  status: LeadStatus;
  customFields: Record<string, any>; // Dynamic custom field values
  createdAt: Date;
  updatedAt: Date;

  // State History (for duration tracking on cards)
  stateHistory?: {
    new_lead?: string; // ISO timestamp when entered state
    qualified?: string;
    contacted?: string;
    follow_up?: string;
    won?: string;
    lost?: string;
  };

  // State Durations (cumulative time in each state)
  stateDurations?: {
    new_lead?: number; // Days
    qualified?: number;
    contacted?: number;
    follow_up?: number;
    won?: number;
    lost?: number;
  };

  // Apollo enrichment tracking
  apolloEnriched?: boolean;
  lastEnrichedAt?: Date;

  // API Cost Tracking
  totalApiCosts?: number;
  lastApiCostUpdate?: Date;

  // Outreach Tracking (lead-level)
  outreach?: {
    linkedIn?: {
      status: 'not_sent' | 'sent' | 'opened' | 'replied' | 'refused' | 'no_response';
      sentAt?: Date;
      profileUrl?: string;
    };
    email?: {
      status: 'not_sent' | 'sent' | 'opened' | 'replied' | 'bounced' | 'refused' | 'no_response';
      sentAt?: Date;
    };
  };
}

// Lead form data (for create/update operations)
export interface LeadFormData {
  name: string;
  email: string;
  company: string;
  phone: string;
  status: LeadStatus;
  customFields?: Record<string, any>;
  outreach?: {
    linkedIn?: {
      status: 'not_sent' | 'sent' | 'opened' | 'replied' | 'refused' | 'no_response';
      sentAt?: Date;
      profileUrl?: string;
    };
    email?: {
      status: 'not_sent' | 'sent' | 'opened' | 'replied' | 'bounced' | 'refused' | 'no_response';
      sentAt?: Date;
    };
  };
}

// Lead Timeline (state history tracking - subcollection)
export interface LeadTimeline {
  id: string; // Same as lead ID
  leadId: string; // Reference to parent lead

  // State history timestamps
  stateHistory: {
    new_lead?: string;
    qualified?: string;
    contacted?: string;
    follow_up?: string;
    won?: string;
    lost?: string;
  };

  // Cumulative state durations (in days)
  stateDurations: {
    new_lead?: number;
    qualified?: number;
    contacted?: number;
    follow_up?: number;
    won?: number;
    lost?: number;
  };

  // Detailed status change log
  statusChanges: LeadStatusChange[];

  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
}

// Individual status change record
export interface LeadStatusChange {
  id: string;
  fromStatus: LeadStatus | null; // null for lead creation
  toStatus: LeadStatus;
  changedBy: string; // User ID who made change
  changedAt: string; // ISO timestamp
  notes?: string; // Optional change notes
  automaticChange?: boolean; // Whether it was a system change
}

// Complete lead with all subcollections loaded
export interface LeadWithSubcollections extends Lead {
  timeline?: LeadTimeline;
}

// View mode type
export type ViewMode = 'board' | 'table';

// Filter types
export interface LeadFilters {
  search: string;
  stages: string[];
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
}
