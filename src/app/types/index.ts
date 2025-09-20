// Core data model interfaces for the Marketing Operations Pipeline Manager

export interface Company {
  id: string;
  name: string;
  url: string;
  description?: string;
  industry?: string;
  status: CompanyStatus;
  blogUrl?: string;
  hasWriteForUsProgram?: boolean;
  programDetails?: {
    submissionGuidelines?: string;
    paymentInfo?: string;
    contactEmail?: string;
  };
  contentThemes?: string[];
  recentPosts?: BlogPost[];
  metrics?: {
    responseTime?: number;
    acceptanceRate?: number;
    averagePayment?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Contact {
  id: string;
  companyId: string;
  name: string;
  role?: string;
  email?: string;
  linkedInUrl?: string;
  preferredCommunication?: 'email' | 'linkedin' | 'phone';
  responsePattern?: {
    averageResponseTime?: number;
    bestTimeToContact?: string;
    responseRate?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Idea {
  id: string;
  companyId: string;
  title: string;
  angle: string;
  format: ContentFormat;
  targetAudience?: string;
  keywords?: string[];
  status: IdeaStatus;
  generatedBy: 'ai' | 'manual';
  trends?: string[];
  estimatedWordCount?: number;
  pitchedAt?: Date;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Interaction {
  id: string;
  companyId: string;
  contactId?: string;
  type: InteractionType;
  platform: 'email' | 'linkedin' | 'phone' | 'meeting' | 'other';
  subject?: string;
  content?: string;
  outcome?: InteractionOutcome;
  followUpRequired?: boolean;
  followUpDate?: Date;
  attachments?: string[];
  createdAt: Date;
}

export interface Article {
  id: string;
  companyId: string;
  ideaId: string;
  title: string;
  status: ArticleStatus;
  assignedDate?: Date;
  dueDate?: Date;
  submittedDate?: Date;
  publishedDate?: Date;
  publishedUrl?: string;
  wordCount?: number;
  payment?: {
    amount: number;
    currency: string;
    terms: string;
    invoiceSent?: Date;
    paymentReceived?: Date;
  };
  performance?: {
    views?: number;
    shares?: number;
    engagement?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface Template {
  id: string;
  name: string;
  type: 'pitch' | 'followup' | 'acceptance' | 'rejection';
  subject?: string;
  content: string;
  tags: string[];
  industrySpecific?: string[];
  performance?: {
    sent: number;
    opened?: number;
    replied?: number;
    accepted?: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BlogPost {
  title: string;
  url: string;
  publishedDate?: Date;
  topics?: string[];
}

// Enums
export type CompanyStatus =
  | 'discovered'
  | 'researching'
  | 'contacted'
  | 'in_discussion'
  | 'active'
  | 'published'
  | 'rejected'
  | 'paused';

export type IdeaStatus =
  | 'draft'
  | 'pitched'
  | 'accepted'
  | 'rejected'
  | 'in_progress'
  | 'submitted'
  | 'published';

export type ArticleStatus =
  | 'assigned'
  | 'writing'
  | 'review'
  | 'submitted'
  | 'revision_requested'
  | 'approved'
  | 'published';

export type ContentFormat =
  | 'tutorial'
  | 'guide'
  | 'case_study'
  | 'listicle'
  | 'opinion'
  | 'interview'
  | 'review'
  | 'comparison'
  | 'news'
  | 'how_to';

export type InteractionType =
  | 'initial_outreach'
  | 'follow_up'
  | 'pitch_response'
  | 'article_discussion'
  | 'payment_discussion'
  | 'relationship_building';

export type InteractionOutcome =
  | 'no_response'
  | 'positive_response'
  | 'negative_response'
  | 'meeting_scheduled'
  | 'article_accepted'
  | 'article_rejected'
  | 'payment_received';

// User interface
export interface User {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
  preferences?: {
    defaultFollowUpDays: number;
    emailNotifications: boolean;
    timeZone: string;
    currency: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Filter and search types
export interface CompanyFilters {
  status?: CompanyStatus[];
  industry?: string[];
  hasProgram?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface IdeaFilters {
  status?: IdeaStatus[];
  format?: ContentFormat[];
  generatedBy?: ('ai' | 'manual')[];
  companyId?: string;
}