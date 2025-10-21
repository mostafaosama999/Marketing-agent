// src/types/ticket.ts
export type TicketStatus = 'todo' | 'in_progress' | 'internal_review' | 'client_review' | 'done' | 'invoiced' | 'paid';
export type TicketPriority = 'low' | 'medium' | 'high';

// Main Ticket Document - Core fields only (~12-15 fields)
export interface Ticket {
  id: string;
  title: string;
  description: string;
  clientName: string;
  writerName: string;
  status: TicketStatus;
  priority: TicketPriority;
  type: 'blog' | 'tutorial';
  dueDate: string;
  createdAt: any;
  updatedAt: any;
  assignedTo?: string;
  reviewedBy?: string;
  articleIdeaId?: string;
  aiReviewCompleted?: boolean; // Simple flag for quick filtering

  // Timeline fields (loaded from subcollection)
  stateHistory?: {
    todo?: string;
    in_progress?: string;
    internal_review?: string;
    client_review?: string;
    done?: string;
    invoiced?: string;
    paid?: string;
  };
  stateDurations?: {
    todo?: number;
    in_progress?: number;
    internal_review?: number;
    client_review?: number;
    done?: number;
    invoiced?: number;
    paid?: number;
  };

  // Financial fields (loaded from subcollection)
  totalCost?: number;
  actualRevenue?: number;
  estimatedRevenue?: number;

  // Content fields (when loaded from subcollection, store as flat properties)
  content?: string;
  aiReview?: AIReview;
  guidelinesChecklist?: { [key: string]: boolean };
}

// Subcollection 1: Content & Reviews
export interface TicketContent {
  id: string; // Same as parent ticket ID
  ticketId: string; // Reference to parent ticket
  content?: string; // Rich HTML content
  wordCount?: number; // Calculated word count
  finalArticleSubmissionGoogleDocsLink?: string; // Submission link
  targetKeywords?: string[]; // SEO keywords
  category?: string; // Content category
  labels?: string[]; // Ticket labels/tags
  estimatedWordCount?: number; // Target word count
  aiReview?: AIReview; // AI review results
  reviewNotes?: string; // Human review notes
  reviewHistory?: ReviewHistoryEntry[]; // Manager review history
  completedAt?: string; // When ticket was completed
  createdAt: any;
  updatedAt: any;
}

// Subcollection 2: Financial & Time Tracking
export interface TicketFinancials {
  id: string; // Same as parent ticket ID
  ticketId: string; // Reference to parent ticket
  estimatedRevenue?: number; // Expected revenue
  actualRevenue?: number; // Actual revenue earned
  assigneeHours?: number; // Hours spent by assignee
  reviewerHours?: number; // Hours spent by reviewer
  totalCost?: number; // Total ticket cost
  costBreakdown?: {
    assigneeCost: number;
    reviewerCost: number;
    assigneeRate: number | string; // Could be hourly rate or "Fixed"
    reviewerRate: number | string;
  };
  createdAt: any;
  updatedAt: any;
}

// Subcollection 3: Timeline & State History
export interface TicketTimeline {
  id: string; // Same as parent ticket ID
  ticketId: string; // Reference to parent ticket
  stateHistory: {
    todo?: string; // ISO timestamp when ticket entered todo state
    in_progress?: string; // ISO timestamp when ticket entered in_progress state
    internal_review?: string; // ISO timestamp when ticket entered internal_review state
    client_review?: string; // ISO timestamp when ticket entered client_review state
    done?: string; // ISO timestamp when ticket entered done state
    invoiced?: string; // ISO timestamp when ticket entered invoiced state
    paid?: string; // ISO timestamp when ticket entered paid state
  };
  stateDurations: {
    todo?: number; // Total days spent in todo state (cumulative)
    in_progress?: number; // Total days spent in in_progress state (cumulative)
    internal_review?: number; // Total days spent in internal_review state (cumulative)
    client_review?: number; // Total days spent in client_review state (cumulative)
    done?: number; // Total days spent in done state (cumulative)
    invoiced?: number; // Total days spent in invoiced state (cumulative)
    paid?: number; // Total days spent in paid state (cumulative)
  };
  statusChanges?: TicketStatusChange[]; // Detailed change log
  createdAt: any;
  updatedAt: any;
}

// Individual status change record
export interface TicketStatusChange {
  id: string;
  fromStatus: TicketStatus | null; // null for initial creation
  toStatus: TicketStatus;
  changedBy: string; // User ID who made the change
  changedAt: string; // ISO timestamp
  notes?: string; // Optional notes about the change
  automaticChange?: boolean; // Whether it was an automatic system change
}

// Complete Ticket with all subcollection data (for when you need everything)
export interface TicketWithSubcollections extends Omit<Ticket, 'content' | 'aiReview' | 'guidelinesChecklist'> {
  content?: TicketContent;
  financials?: TicketFinancials;
  timeline?: TicketTimeline;
}

export interface AIReview {
  overallScore: number;
  categories: { [key: string]: string };
  feedback: string;
  suggestions: string[];
}

export interface ReviewHistoryEntry {
  cycleNumber: number;
  managerScore: number;
  feedback?: string;
  reviewedAt: string;
  reviewedBy: string;
}

export interface ArticleIdea {
  id: string;
  clientId: string;
  title: string;
  description: string;
  targetMonth: string;
  status: 'idea' | 'assigned' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  type: 'blog' | 'tutorial';
  estimatedWordCount: number;
  targetKeywords: string[];
  category: string;
  createdAt: any;
  assignedTo?: string;
  ticketId?: string; // Changed from taskId to ticketId
}

export interface CompensationStructure {
  type: 'hourly' | 'fixed';
  hourlyRate?: number;
  blogRate?: number;
  tutorialRate?: number;
}

export interface TeamMember {
  id: string;
  email: string;
  displayName: string;
  role: string;
  compensation?: CompensationStructure;
}

// Alert Rules Types
export type AlertRuleType = 'ticket-based' | 'writer-based' | 'client-based';

export interface BaseAlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: AlertRuleType;
  slackChannel: string;
  createdAt: string;
  updatedAt: string;
}

export interface TicketBasedAlertRule extends BaseAlertRule {
  type: 'ticket-based';
  conditions: {
    checkType?: 'status-duration' | 'ticket-age'; // What to check (defaults to 'status-duration')
    statuses: TicketStatus[]; // States to monitor
    daysInState: number; // Threshold in days (for status-duration) or days since creation (for ticket-age)
    clientName?: string; // Optional client filter
    ticketType?: Ticket['type']; // Optional type filter
  };
}


export interface WriterBasedAlertRule extends BaseAlertRule {
  type: 'writer-based';
  conditions: {
    alertType: 'no-tickets-assigned' | 'overloaded' | 'inactive';
    thresholdDays?: number; // For inactive writers
    maxTickets?: number; // For overloaded writers
    writerName?: string; // Optional writer filter
  };
}

export interface ClientBasedAlertRule extends BaseAlertRule {
  type: 'client-based';
  conditions: {
    alertType: 'no-recent-tickets' | 'no-new-tickets';
    thresholdDays: number; // Days without activity
    clientName?: string; // Optional client filter
  };
}

export type AlertRule = TicketBasedAlertRule | WriterBasedAlertRule | ClientBasedAlertRule;

export interface AlertRuleConditions {
  statuses: TicketStatus[];
  daysInState: number;
  clientName?: string;
  ticketType?: Ticket['type'];
}