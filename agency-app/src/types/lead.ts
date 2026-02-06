// CRM Lead management types

// Lead status type (pipeline stages)
export type LeadStatus = 'new_lead' | 'qualified' | 'contacted' | 'follow_up' | 'nurture' | 'won' | 'lost' | 'previous_client' | 'existing_client';

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
  customFieldsUpdatedBy?: Record<string, string>; // fieldName -> userId who last updated
  createdAt: Date;
  updatedAt: Date;

  // State History (for duration tracking on cards)
  stateHistory?: {
    new_lead?: string; // ISO timestamp when entered state
    qualified?: string;
    contacted?: string;
    follow_up?: string;
    nurture?: string;
    won?: string;
    lost?: string;
    previous_client?: string;
    existing_client?: string;
  };

  // State Durations (cumulative time in each state)
  stateDurations?: {
    new_lead?: number; // Days
    qualified?: number;
    contacted?: number;
    follow_up?: number;
    nurture?: number;
    won?: number;
    lost?: number;
    previous_client?: number;
    existing_client?: number;
  };

  // Apollo enrichment tracking
  apolloEnriched?: boolean;
  lastEnrichedAt?: Date;

  // API Cost Tracking
  totalApiCosts?: number;
  lastApiCostUpdate?: Date;

  // Rating (built-in field like Company's ratingV2)
  rating?: number | null;
  ratingUpdatedBy?: string;
  ratingUpdatedAt?: Date;

  // Outreach Tracking (lead-level)
  outreach?: {
    linkedIn?: {
      status: 'not_sent' | 'sent' | 'opened' | 'replied' | 'refused' | 'no_response';
      sentAt?: Date;
      profileUrl?: string;
      connectionRequest?: {
        status: 'not_sent' | 'sent' | 'accepted' | 'rejected';
        sentAt?: Date;
      };
    };
    email?: {
      status: 'not_sent' | 'sent' | 'opened' | 'replied' | 'bounced' | 'refused' | 'no_response';
      sentAt?: Date;
      draftCreatedAt?: Date; // When Gmail draft was created
      draftId?: string; // Gmail draft ID
      draftUrl?: string; // Direct link to Gmail draft
      originalSubject?: string; // Subject of original email (for follow-up threading)
      followUpStatus?: 'not_sent' | 'sent';
      followUpDraftCreatedAt?: Date;
      followUpDraftId?: string;
      followUpDraftUrl?: string;
    };
  };

  // Archive status
  archived?: boolean;
  archivedAt?: Date;
  archivedBy?: string; // User ID who archived the lead
  archiveReason?: string; // Optional reason for archiving
  cascadedFrom?: string; // Company ID if archived as part of company cascade

  // Manual nurture tracking
  lastContactedDate?: Date; // Manually set date when lead was last contacted (for nurture reminders)

  // Final email for nurture leads
  finalEmail?: string; // Final email text sent to nurture lead
  finalEmailUpdatedAt?: Date; // When final email was last updated
  finalEmailUpdatedBy?: string; // User ID who last updated the final email
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
      status: 'not_sent' | 'sent' | 'sent' | 'opened' | 'replied' | 'refused' | 'no_response';
      sentAt?: Date;
      profileUrl?: string;
      connectionRequest?: {
        status: 'not_sent' | 'sent' | 'accepted' | 'rejected';
        sentAt?: Date;
      };
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
    nurture?: string;
    won?: string;
    lost?: string;
    previous_client?: string;
    existing_client?: string;
  };

  // Cumulative state durations (in days)
  stateDurations: {
    new_lead?: number;
    qualified?: number;
    contacted?: number;
    follow_up?: number;
    nurture?: number;
    won?: number;
    lost?: number;
    previous_client?: number;
    existing_client?: number;
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
