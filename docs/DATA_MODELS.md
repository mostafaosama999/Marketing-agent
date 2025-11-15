# Data Models Documentation

## Marketing Agent CRM - Complete Data Model Reference

This document provides a comprehensive reference for all data models, interfaces, and type definitions used throughout the Marketing Agent CRM application.

---

## Table of Contents

1. [Core CRM Entities](#1-core-crm-entities)
2. [Pipeline & Configuration](#2-pipeline--configuration)
3. [Field Definitions & Custom Fields](#3-field-definitions--custom-fields)
4. [Filtering System](#4-filtering-system)
5. [User & Authentication](#5-user--authentication)
6. [Apollo.io Integration](#6-apolloio-integration)
7. [Ticket System (Project Management)](#7-ticket-system-project-management)
8. [Client Management](#8-client-management)
9. [Article Ideas & Content](#9-article-ideas--content)
10. [Table Configuration](#10-table-configuration)
11. [Settings & Application Config](#11-settings--application-config)
12. [Release Notes](#12-release-notes)
13. [Alert Rules & Monitoring](#13-alert-rules--monitoring)
14. [CSV Import & Field Mapping](#14-csv-import--field-mapping)
15. [Cloud Functions Types](#15-cloud-functions-types)
16. [Cost Tracking](#16-cost-tracking)
17. [Validation & Helpers](#17-validation--helpers)
18. [Firestore Collections Summary](#18-firestore-collections-summary)
19. [Entity Relationships](#19-entity-relationships)

---

## 1. Core CRM Entities

### 1.1 Lead

**Source File:** `/agency-app/src/types/lead.ts`
**Firestore Collection:** `leads/{leadId}`

```typescript
interface Lead {
  // Core Identity
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  companyId?: string;
  companyName?: string;

  // Pipeline Status
  status: LeadStatus;

  // Custom Fields (Dynamic)
  customFields: Record<string, any>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // State Tracking (Denormalized from subcollection)
  stateHistory?: {
    new_lead?: string;
    qualified?: string;
    contacted?: string;
    follow_up?: string;
    won?: string;
    lost?: string;
  };

  stateDurations?: {
    new_lead?: number;
    qualified?: number;
    contacted?: number;
    follow_up?: number;
    won?: number;
    lost?: number;
  };

  // Apollo Enrichment
  apolloEnriched?: boolean;
  lastEnrichedAt?: Date;
  totalApiCosts?: number;
  lastApiCostUpdate?: Date;

  // Outreach Tracking
  outreach?: {
    linkedIn?: {
      status: string;
      sentAt?: Date;
      profileUrl?: string;
    };
    email?: {
      status: string;
      sentAt?: Date;
    };
  };

  // Archive Management
  archived?: boolean;
  archivedAt?: Date;
  archivedBy?: string;
}

// Lead Status Enum
type LeadStatus = 'new_lead' | 'qualified' | 'contacted' | 'follow_up' | 'won' | 'lost';
```

**Related Types:**

```typescript
// Form data for create/update operations
interface LeadFormData {
  name: string;
  email: string;
  phone: string;
  company: string;
  status: LeadStatus;
  customFields?: Record<string, any>;
}

// Lead with complete subcollection data
interface LeadWithSubcollections extends Lead {
  timeline?: LeadTimeline;
}

// Filter parameters
interface LeadFilters {
  search?: string;
  status?: LeadStatus[];
  company?: string;
  month?: string;
  archived?: boolean;
}
```

**Subcollection: Lead Timeline**

**Firestore Path:** `leads/{leadId}/timeline/{leadId}`

```typescript
interface LeadTimeline {
  leadId: string;
  stateHistory: {
    new_lead?: string;
    qualified?: string;
    contacted?: string;
    follow_up?: string;
    won?: string;
    lost?: string;
  };
  stateDurations: {
    new_lead?: number;
    qualified?: number;
    contacted?: number;
    follow_up?: number;
    won?: number;
    lost?: number;
  };
  statusChanges: LeadStatusChange[];
  lastUpdated: Date;
}

interface LeadStatusChange {
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus;
  changedAt: Date;
  changedBy: string;
  notes?: string;
}
```

---

### 1.2 Company

**Source File:** `/agency-app/src/types/crm.ts`
**Firestore Collection:** `companies/{companyId}`

```typescript
interface Company {
  // Core Identity
  id: string;
  name: string; // Unique, case-insensitive
  website?: string;
  industry?: string;
  description?: string;

  // Custom Fields (Dynamic)
  customFields?: Record<string, any>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Cost Tracking
  totalApiCosts?: number;
  lastApiCostUpdate?: Date;

  // Archive Management
  archived?: boolean;
  archivedAt?: Date;
  archivedBy?: string;

  // Offer/Pitch Management
  offer?: {
    blogIdea: string;
    createdAt: Date;
    updatedAt: Date;
  };

  // AI-Generated Ideas
  offerIdeas?: {
    ideas: Array<{
      id: string;
      title: string;
      content: string;
      approved: boolean;
      createdAt: Date;
      updatedAt?: Date;
    }>;
    sessionId?: string;
    generationPrompt?: string;
    lastGeneratedAt?: Date;
    generalFeedback?: string;
  };

  // Writing Program Analysis
  writingProgramAnalysis?: {
    hasProgram: boolean;
    programUrl: string | null;
    isOpen: boolean | null;
    openDates: {
      openFrom: string;
      closedFrom: string;
    } | null;
    payment: {
      amount: string | null;
      method: string | null;
      details: string | null;
      sourceSnippet: string | null;
      historical: string | null;
    };
    requirements?: string[];
    requirementTypes?: string[];
    submissionGuidelines?: string;
    contactEmail?: string;
    responseTime?: string;
    publishedDate?: string | null;
    publishedDateSource?: string | null;
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
    lastActivePost: string | null;
    monthlyFrequency: number;
    writers: {
      count: number;
      areEmployees: boolean;
      areFreelancers: boolean;
      list: string[];
    };
    blogNature: {
      isAIWritten: boolean;
      isTechnical: boolean;
      rating: 'low' | 'medium' | 'high';
      hasCodeExamples: boolean;
      hasDiagrams: boolean;
      reasoning?: string;
    };
    isDeveloperB2BSaas: boolean;
    contentSummary: string;
    blogUrl: string | null;
    lastPostUrl?: string | null;
    rssFeedUrl?: string | null;
    lastAnalyzedAt: Date;
    costInfo?: {
      totalCost: number;
      totalTokens: number;
    };
  };

  // Apollo.io Enrichment
  apolloEnrichment?: {
    apolloId: string | null;
    name: string | null;
    website: string | null;
    employeeCount: number | null;
    employeeRange: string | null;
    foundedYear: number | null;
    totalFunding: number | null;
    totalFundingFormatted: string | null;
    latestFundingStage: string | null;
    latestFundingDate: string | null;
    industry: string | null;
    industries: string[];
    secondaryIndustries: string[];
    keywords: string[];
    technologies: string[];
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
```

**Related Types:**

```typescript
// Form data for create/update operations
interface CompanyFormData {
  name: string;
  website?: string;
  industry?: string;
  description?: string;
  customFields?: Record<string, any>;
}
```

---

## 2. Pipeline & Configuration

**Source File:** `/agency-app/src/types/crm.ts`
**Firestore Collection:** `pipelineConfig/default`

```typescript
interface PipelineStage {
  id: string;
  label: string;
  color: string; // Hex color code
  order: number;
  visible: boolean;
}

interface PipelineConfig {
  id: string;
  stages: PipelineStage[];
  createdAt: Date;
  updatedAt: Date;
}
```

**Default Pipeline Stages:**

| Order | ID | Label | Color |
|-------|------------|-----------|---------|
| 0 | new_lead | New Lead | #9e9e9e |
| 1 | qualified | Qualified | #ff9800 |
| 2 | contacted | Contacted | #2196f3 |
| 3 | follow_up | Follow up | #9c27b0 |
| 4 | won | Won | #4caf50 |
| 5 | lost | Lost | #607d8b |

---

## 3. Field Definitions & Custom Fields

**Source File:** `/agency-app/src/types/fieldDefinitions.ts`
**Firestore Collection:** `fieldDefinitions/{fieldId}`

```typescript
interface FieldDefinition {
  id: string;
  name: string; // Internal name (e.g., "lead_source")
  label: string; // Display label (e.g., "Lead Source")
  entityType: EntityType; // 'lead' | 'company'
  fieldType: FieldType; // 'text' | 'number' | 'date' | 'dropdown'
  section: FieldSection; // 'general' | 'linkedin' | 'email'
  options?: string[]; // For dropdown fields only
  required?: boolean;
  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

type FieldType = 'text' | 'number' | 'date' | 'dropdown';
type EntityType = 'lead' | 'company';
type FieldSection = 'general' | 'linkedin' | 'email';
```

**Related Types:**

```typescript
// For creating new field definitions
interface CreateFieldDefinitionData {
  name: string;
  label: string;
  entityType: EntityType;
  fieldType: FieldType;
  section: FieldSection;
  options?: string[];
  required?: boolean;
}

// Detected during CSV import
interface DetectedDropdownField {
  csvField: string;
  uniqueValues: string[];
  count: number;
}

interface DetectedDateField {
  csvField: string;
  sampleValues: string[];
}
```

**Key Features:**
- **Dropdown Detection:** Columns with "dropdown" in the name (case-insensitive) are automatically detected during CSV import
- **Inline Editing:** Dropdown custom fields render as purple gradient chips in table view with click-to-edit functionality
- **Type Validation:** Field values are validated against their defined type and options

---

## 4. Filtering System

### 4.1 Lead Filters

**Source File:** `/agency-app/src/types/filter.ts`
**Firestore Collection:** `filterPresets/{userId}/presets/{presetId}`

```typescript
// Filter operators
type FilterOperator =
  // String operators
  | 'contains'
  | 'not_contains'
  | 'equals'
  | 'not_equals'
  | 'starts_with'
  | 'ends_with'
  // Numeric operators
  | 'greater_than'
  | 'less_than'
  | 'greater_than_equal'
  | 'less_than_equal'
  // Date operators
  | 'before'
  | 'after'
  | 'between'
  // Array operators
  | 'is_one_of'
  | 'is_none_of'
  // Null operators
  | 'is_empty'
  | 'is_not_empty'
  // Boolean operators
  | 'is_true'
  | 'is_false';

// Individual filter rule
interface FilterRule {
  id: string;
  field: string; // Field name (e.g., "email", "status", "customFields.industry")
  fieldLabel: string; // Display label
  operator: FilterOperator;
  value: any; // Value to compare against
  logicGate: 'AND' | 'OR'; // Logic operator for combining with next rule
}

// Complete filter preset
interface FilterPreset {
  id: string;
  name: string;
  description?: string;

  // Advanced filter rules
  advancedRules: FilterRule[];

  // Basic filters (quick filters)
  basicFilters: FilterState;

  // View preferences
  viewMode: 'board' | 'table';
  tableColumns?: Record<string, boolean | { visible: boolean; order: number }>;

  // Metadata
  createdAt: string;
  updatedAt: string;
  userId: string;

  // Sharing
  isDefault?: boolean;
  shared?: boolean;
  sharedWith?: string[];
}

// Basic filter state
interface FilterState {
  search: string;
  statuses: LeadStatus[];
  company: string;
  month: string;
  [customFieldName: string]: any; // Dynamic custom field filters
}
```

**Related Types:**

```typescript
// Filter builder state
interface FilterBuilderState {
  rules: FilterRule[];
  activeRuleId: string | null;
}

// Field definition for filter builder
interface FilterableField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'boolean';
  options?: string[];
}

// Active filter chip display
interface ActiveFilter {
  id: string;
  label: string;
  value: string;
  onRemove: () => void;
}

// Request to save preset
interface SavePresetRequest {
  name: string;
  description?: string;
  advancedRules: FilterRule[];
  basicFilters: FilterState;
  viewMode: 'board' | 'table';
  tableColumns?: Record<string, boolean | { visible: boolean; order: number }>;
}
```

### 4.2 Company Filters

**Source File:** `/agency-app/src/types/companyFilter.ts`
**Firestore Collection:** `companyFilterPresets/{userId}/presets/{presetId}`

```typescript
interface CompanyFilterState {
  search: string;
  industry: string;
  employeeRange: string;
  fundingStage: string;
  [customFieldName: string]: any; // Dynamic custom field filters
}

interface CompanyFilterPreset {
  id: string;
  name: string;
  description?: string;

  // Advanced filter rules
  advancedRules: FilterRule[];

  // Basic filters
  basicFilters: CompanyFilterState;

  // Table preferences
  tableColumns?: Record<string, boolean | { visible: boolean; order: number }>;

  // Metadata
  createdAt: string;
  updatedAt: string;
  userId: string;

  // Sharing
  isDefault?: boolean;
  shared?: boolean;
  sharedWith?: string[];
}
```

---

## 5. User & Authentication

### 5.1 User & Roles

**Source File:** `/agency-app/src/types/auth.ts`
**Firestore Collection:** `users/{userId}`

```typescript
// User roles
type UserRole =
  | 'admin'
  | 'manager'
  | 'writer'
  | 'viewer'
  | 'CEO'
  | 'Manager'
  | 'Writer'
  | 'Marketing Analyst';

// Basic user info
interface User {
  id: string;
  email: string;
  displayName?: string;
}

// Complete user profile
interface UserProfile {
  // Identity
  uid: string;
  email: string;
  displayName?: string;
  role: UserRole;

  // Profile info
  department?: string;
  phoneNumber?: string;
  specialties?: string[];
  joinDate?: string;

  // Performance tracking
  performance?: UserPerformance;

  // API Usage Tracking
  apiUsage?: {
    ai: {
      totalCost: number;
      totalTokens: number;
      totalCalls: number;
      lastUpdated: Date;
      breakdown?: {
        blogAnalysis: {
          cost: number;
          calls: number;
          tokens: number;
        };
        writingProgram: {
          cost: number;
          calls: number;
          tokens: number;
        };
        other: {
          cost: number;
          calls: number;
          tokens: number;
        };
      };
    };
    apollo: {
      totalCost: number;
      totalCredits: number;
      totalCalls: number;
      lastUpdated: Date;
      breakdown?: {
        emailEnrichment: {
          cost: number;
          calls: number;
          credits: number;
        };
        organizationEnrichment: {
          cost: number;
          calls: number;
          credits: number;
        };
        peopleSearch: {
          cost: number;
          calls: number;
          credits: number;
        };
      };
    };
  };
}

// Performance metrics
interface UserPerformance {
  averageScore: number;
  tasksCompleted: number;
  onTimeDelivery: number;
}

// Auth context
interface AuthContextType {
  user: any | null;
  userProfile: UserProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
  hasRole: (role: UserRole) => boolean;
  canAccess: (allowedRoles: UserRole[]) => boolean;
}
```

**Role Permissions:**

| Role | CRM Access | Create/Edit | Delete | User Management |
|------|------------|-------------|--------|-----------------|
| Writer | No | Own Tasks | No | No |
| Marketing Analyst | View/Edit | Leads & Companies | No | No |
| Manager | Full | Full | Yes | No |
| CEO | Full | Full | Yes | Yes |

### 5.2 User Preferences

**Source File:** `/agency-app/src/types/userPreferences.ts`
**Firestore Collection:** `userPreferences/{userId}`

```typescript
interface UserPreferences {
  apolloJobTitles?: string[];
  // Future preferences...
}
```

---

## 6. Apollo.io Integration

**Source File:** `/agency-app/src/types/apollo.ts`

```typescript
// Cost tracking
interface ApolloCostInfo {
  credits: number;
  model: 'apollo-people-match' | 'apollo-people-search';
  timestamp: Date;
}

// Organization data from Apollo
interface ApolloOrganization {
  id?: string;
  name?: string;
  website_url?: string;
  blog_url?: string | null;
  angellist_url?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  facebook_url?: string | null;
  primary_phone?: {
    number?: string;
    source?: string;
  } | null;
  languages?: string[];
  alexa_ranking?: number | null;
  phone?: string | null;
  linkedin_uid?: string | null;
  founded_year?: number | null;
  publicly_traded_symbol?: string | null;
  publicly_traded_exchange?: string | null;
  logo_url?: string | null;
  crunchbase_url?: string | null;
  primary_domain?: string | null;
  personas?: string[];
  industry?: string | null;
  keywords?: string[];
  estimated_num_employees?: number | null;
  industries?: string[];
  secondary_industries?: string[];
  snippets_loaded?: boolean;
  industry_tag_id?: string | null;
  industry_tag_hash?: Record<string, any>;
  retail_location_count?: number | null;
  raw_address?: string | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  owned_by_organization_id?: string | null;
  suborganizations?: any[];
  num_suborganizations?: number;
  seo_description?: string | null;
  short_description?: string | null;
  annual_revenue_printed?: string | null;
  annual_revenue?: number | null;
  total_funding?: number | null;
  total_funding_printed?: string | null;
  latest_funding_round_date?: string | null;
  latest_funding_stage?: string | null;
  funding_events?: any[];
  technology_names?: string[];
  current_technologies?: any[];
  account_id?: string | null;
  account?: any | null;
  organization_raw_address?: string | null;
  organization_city?: string | null;
  organization_street_address?: string | null;
  organization_state?: string | null;
  organization_country?: string | null;
  organization_postal_code?: string | null;
  suggest_location_enrichment?: boolean;
  domain?: string | null;
  team_id?: string | null;
  typed_custom_fields?: Record<string, any>;
  organization_id?: string | null;
  show_intent?: boolean;
  sanitized_phone?: string | null;
  label_ids?: string[];
  modality?: string | null;
  contacts?: any[];
}

// Person data from Apollo
interface ApolloPerson {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  linkedin_url?: string | null;
  title?: string | null;
  email?: string | null;
  email_status?: string | null;
  photo_url?: string | null;
  twitter_url?: string | null;
  github_url?: string | null;
  facebook_url?: string | null;
  extrapolated_email_confidence?: number | null;
  headline?: string | null;
  email_source?: string | null;
  email_from_customer?: boolean;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  organization_id?: string | null;
  organization?: ApolloOrganization | null;
  phone_numbers?: ApolloPhoneNumber[];
  intent_strength?: string | null;
  show_intent?: boolean;
  departments?: string[];
  subdepartments?: string[];
  functions?: string[];
  seniority?: string | null;
  employment_history?: ApolloEmployment[];
}

// Phone number data
interface ApolloPhoneNumber {
  raw_number?: string;
  sanitized_number?: string;
  type?: string;
  position?: number;
  status?: string;
}

// Employment history
interface ApolloEmployment {
  id?: string;
  created_at?: string;
  current?: boolean;
  degree?: string | null;
  description?: string | null;
  emails?: string[] | null;
  end_date?: string | null;
  grade_level?: string | null;
  kind?: string | null;
  major?: string | null;
  organization_id?: string | null;
  organization_name?: string | null;
  raw_address?: string | null;
  start_date?: string | null;
  title?: string | null;
  updated_at?: string;
  key?: string;
}
```

### Apollo API Request/Response Types

```typescript
// Email Enrichment
interface ApolloEmailEnrichmentRequest {
  first_name: string;
  last_name: string;
  organization_name?: string;
  domain?: string;
}

interface ApolloEmailEnrichmentResponse {
  person: ApolloPerson;
  costInfo?: ApolloCostInfo;
}

// People Search
interface ApolloPeopleSearchRequest {
  organization_ids?: string[];
  q_organization_domains?: string[];
  person_titles?: string[];
  person_seniorities?: string[];
  contact_email_status?: string[];
  page?: number;
  per_page?: number;
}

interface ApolloPeopleSearchResponse {
  people: ApolloPerson[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
  costInfo?: ApolloCostInfo;
}

// Organization Enrichment
interface ApolloOrganizationEnrichmentRequest {
  domain?: string;
  organization_name?: string;
}

interface ApolloOrganizationEnrichmentResponse {
  organization: ApolloOrganization;
  costInfo?: ApolloCostInfo;
}
```

---

## 7. Ticket System (Project Management)

**Source File:** `/agency-app/src/types/ticket.ts`
**Firestore Collection:** `tickets/{ticketId}`

```typescript
// Ticket status enum
type TicketStatus =
  | 'todo'
  | 'in_progress'
  | 'internal_review'
  | 'client_review'
  | 'done'
  | 'invoiced'
  | 'paid';

// Ticket priority enum
type TicketPriority = 'low' | 'medium' | 'high';

// Main ticket entity
interface Ticket {
  // Identity
  id: string;
  title: string;
  description: string;

  // Relationships
  clientName: string;
  writerName: string;
  assignedTo?: string;
  reviewedBy?: string;
  articleIdeaId?: string;

  // Status & Priority
  status: TicketStatus;
  priority: TicketPriority;
  type: 'blog' | 'tutorial';

  // Dates
  dueDate: string;
  createdAt: any;
  updatedAt: any;

  // State Tracking (Denormalized)
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

  // Financials
  totalCost?: number;
  actualRevenue?: number;
  estimatedRevenue?: number;

  // Content
  content?: string;

  // AI Review
  aiReviewCompleted?: boolean;
  aiReview?: AIReview;

  // Guidelines Checklist
  guidelinesChecklist?: {
    [key: string]: boolean;
  };
}

// AI Review results
interface AIReview {
  overallScore: number;
  strengths: string[];
  improvements: string[];
  detailedFeedback: {
    clarity: { score: number; comments: string };
    technicalAccuracy: { score: number; comments: string };
    structure: { score: number; comments: string };
    engagement: { score: number; comments: string };
  };
  summary: string;
  guidelineCompliance?: {
    [key: string]: {
      compliant: boolean;
      feedback: string;
    };
  };
  reviewedAt: Date;
  reviewedBy: string;
  costInfo?: {
    totalCost: number;
    totalTokens: number;
  };
}

// Manager review cycles
interface ReviewHistoryEntry {
  reviewedAt: Date;
  reviewedBy: string;
  status: 'approved' | 'needs_revision';
  feedback: string;
  scoreChange?: number;
}
```

### Ticket Subcollections

**Content Subcollection**

**Firestore Path:** `tickets/{ticketId}/content/{ticketId}`

```typescript
interface TicketContent {
  ticketId: string;
  content: string;
  wordCount: number;
  keywords: string[];
  lastUpdated: Date;
  updatedBy: string;
}
```

**Financials Subcollection**

**Firestore Path:** `tickets/{ticketId}/financials/{ticketId}`

```typescript
interface TicketFinancials {
  ticketId: string;
  estimatedRevenue: number;
  actualRevenue: number;
  totalCost: number;
  costs: {
    ai: number;
    apollo: number;
    other: number;
  };
  hoursWorked: number;
  profitMargin: number;
  lastUpdated: Date;
}
```

**Timeline Subcollection**

**Firestore Path:** `tickets/{ticketId}/timeline/{ticketId}`

```typescript
interface TicketTimeline {
  ticketId: string;
  stateHistory: {
    todo?: string;
    in_progress?: string;
    internal_review?: string;
    client_review?: string;
    done?: string;
    invoiced?: string;
    paid?: string;
  };
  stateDurations: {
    todo?: number;
    in_progress?: number;
    internal_review?: number;
    client_review?: number;
    done?: number;
    invoiced?: number;
    paid?: number;
  };
  statusChanges: TicketStatusChange[];
  lastUpdated: Date;
}

interface TicketStatusChange {
  fromStatus: TicketStatus | null;
  toStatus: TicketStatus;
  changedAt: Date;
  changedBy: string;
  notes?: string;
}
```

**Related Types:**

```typescript
// Complete ticket with all subcollections
interface TicketWithSubcollections extends Ticket {
  content?: TicketContent;
  financials?: TicketFinancials;
  timeline?: TicketTimeline;
}
```

---

## 8. Client Management

**Source File:** `/agency-app/src/types/client.ts`
**Firestore Collection:** `clients/{clientId}`

```typescript
interface Client {
  // Identity
  id: string;
  name: string;

  // Contact Info
  contactEmail: string;
  contactPhone: string;
  address: string;
  website: string;

  // Business Info
  industry: string;
  status: string;

  // Financials
  contractValue: number;
  monthlyRevenue: number;
  startDate: string;

  // Notes
  notes: string;

  // Metadata
  createdAt?: string;

  // Guidelines & Compensation
  guidelines?: ClientGuidelines;
  compensation?: ClientCompensation;
}

// Client guidelines with sections
interface ClientGuidelines {
  sections?: GuidelineSection[];

  // Legacy fields (backward compatibility)
  brandVoice?: string;
  targetAudience?: string;
  contentStyle?: string;
  keyMessages?: string[];
  avoidTopics?: string[];
  preferredFormats?: string[];
  seoKeywords?: string[];
  competitorAnalysis?: string;
  content?: string;
  updatedAt?: string;
}

// Guideline section
interface GuidelineSection {
  id: string;
  title: string;
  content: string;
  order: number;
  type: 'freeform' | 'checklist';
  checklistItems?: ChecklistItem[];
}

// Checklist item within a section
interface ChecklistItem {
  id: string;
  text: string;
  checked: boolean;
  order: number;
}

// Client compensation rates
interface ClientCompensation {
  blogRate?: number;
  tutorialRate?: number;
  caseStudyRate?: number;
  whitepaperRate?: number;
  socialMediaRate?: number;
  emailRate?: number;
  landingPageRate?: number;
  otherRate?: number;
}
```

---

## 9. Article Ideas & Content

**Source File:** `/agency-app/src/types/ticket.ts`
**Firestore Collection:** `articleIdeas/{ideaId}`

```typescript
interface ArticleIdea {
  // Identity
  id: string;
  clientId: string;

  // Content
  title: string;
  description: string;
  category: string;

  // Planning
  targetMonth: string;
  estimatedWordCount: number;
  targetKeywords: string[];

  // Status
  status: 'idea' | 'assigned' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  type: 'blog' | 'tutorial';

  // Assignment
  assignedTo?: string;
  ticketId?: string;

  // Metadata
  createdAt: any;
}
```

---

## 10. Table Configuration

**Source File:** `/agency-app/src/types/table.ts`

```typescript
interface TableColumnConfig {
  id: string;
  label: string;
  sortable: boolean;
  visible: boolean;
  type: 'default' | 'custom';
  order: number;
  section?: 'general' | 'linkedin' | 'email';
  fieldType?: 'text' | 'number' | 'date' | 'select' | 'dropdown' | 'boolean';
  fieldName?: string;
  dropdownOptions?: string[];
}

type ColumnPreferences = Record<string, { visible: boolean; order: number }>;
```

**Storage Keys:**

| Table | localStorage Key |
|-------|------------------|
| Leads Table | `crm_table_columns_v2` |
| Companies Table | `companies_table_columns_visibility` |
| Writing Program Table | `writing_program_table_columns_visibility` |

**Default Columns:**

**Leads Table:**
- Name, Email, Phone, Company, Status, Created At, Updated At, Actions

**Companies Table:**
- Name, Website, Industry, Has Active Blog, Writing Program Status, Last Active Post, Created At

**Writing Program Table:**
- Company, Program URL, Is Open, Payment Amount, Open Dates, Contact Email, Last Analyzed

---

## 11. Settings & Application Config

**Source File:** `/agency-app/src/types/settings.ts`
**Firestore Collection:** `settings/appConfig`

```typescript
interface AppSettings {
  // Offer templates
  offerTemplate: string;
  offerHeadline?: string;

  // AI prompts
  aiPrompts?: {
    leadEnrichment?: string;
    emailGeneration?: string;
    blogAnalysis?: string;
    writingProgramAnalysis?: string;
  };

  // Metadata
  updatedAt: Date;
  updatedBy: string;
  createdAt?: Date;
}

// Template variable definitions
interface TemplateVariable {
  key: string;
  description: string;
  category: 'basic' | 'outreach' | 'custom' | 'dates' | 'company';
  example?: string;
}
```

**Available Template Variables:**

**Basic:**
- `{{lead.name}}` - Lead's full name
- `{{lead.email}}` - Lead's email
- `{{lead.phone}}` - Lead's phone number
- `{{lead.company}}` - Company name

**Company:**
- `{{company.name}}` - Company name
- `{{company.website}}` - Company website
- `{{company.industry}}` - Company industry

**Outreach:**
- `{{lead.linkedIn.url}}` - LinkedIn profile URL
- `{{lead.linkedIn.status}}` - LinkedIn outreach status

**Dates:**
- `{{today}}` - Current date
- `{{lead.createdAt}}` - Lead creation date

**Custom:**
- `{{customFields.fieldName}}` - Any custom field value

---

## 12. Release Notes

**Source File:** `/agency-app/src/types/releaseNotes.ts`
**Firestore Collections:**
- `releaseNotes/{releaseId}`
- `userReleaseNoteStates/{userId}`

```typescript
interface ReleaseNote {
  // Identity
  id: string;
  version: string;

  // Content
  title: string;
  description: string;
  highlights: string[];

  // Status
  published: boolean;

  // Metadata
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
  updatedBy: string;
}

// User's interaction with release notes
interface UserReleaseNoteState {
  userId: string;
  lastSeenReleaseId: string | null;
  dismissedReleaseIds: string[];
  updatedAt: Date;
}

// Form data for creating/editing releases
interface ReleaseNoteFormData {
  version: string;
  title: string;
  description: string;
  highlights: string[];
  published: boolean;
}
```

**Key Features:**
- Auto-expand for new releases
- Per-user dismiss tracking
- "Don't show again" functionality
- Rich text highlights

---

## 13. Alert Rules & Monitoring

**Source File:** `/agency-app/src/types/ticket.ts`
**Firestore Collection:** `alertRules/{ruleId}`

```typescript
// Alert rule types
type AlertRuleType = 'ticket-based' | 'writer-based' | 'client-based';

// Base alert rule
interface BaseAlertRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: AlertRuleType;
  slackChannel: string;
  createdAt: string;
  updatedAt: string;
}

// Ticket-based alerts
interface TicketBasedAlertRule extends BaseAlertRule {
  type: 'ticket-based';
  conditions: {
    checkType?: 'status-duration' | 'ticket-age';
    statuses: TicketStatus[];
    daysInState: number;
    clientName?: string;
    ticketType?: Ticket['type'];
  };
}

// Writer-based alerts
interface WriterBasedAlertRule extends BaseAlertRule {
  type: 'writer-based';
  conditions: {
    alertType: 'no-tickets-assigned' | 'overloaded' | 'inactive';
    thresholdDays?: number;
    maxTickets?: number;
    writerName?: string;
  };
}

// Client-based alerts
interface ClientBasedAlertRule extends BaseAlertRule {
  type: 'client-based';
  conditions: {
    alertType: 'no-recent-tickets' | 'no-new-tickets';
    thresholdDays: number;
    clientName?: string;
  };
}

// Union type
type AlertRule = TicketBasedAlertRule | WriterBasedAlertRule | ClientBasedAlertRule;
```

### Monitoring Metrics

**Source File:** `/agency-app/src/services/api/monitoringQueries.ts`

```typescript
interface MonitoringTask extends TicketWithSubcollections {
  stateHistory?: {
    todo?: string;
    in_progress?: string;
    internal_review?: string;
    client_review?: string;
    done?: string;
    invoiced?: string;
    paid?: string;
  };
}

interface TaskMetrics {
  totalTasksCreated: number;
  totalTasksCompleted: number;
  averageTimeToComplete: number;
  stuckTasks: MonitoringTask[];
}

interface WriterMetrics {
  writerName: string;
  assignedTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  internalReviewTasks: number;
  clientReviewTasks: number;
  status: 'active' | 'inactive' | 'overloaded' | 'available';
}
```

---

## 14. CSV Import & Field Mapping

**Source File:** `/agency-app/src/services/api/csvImportService.ts`

```typescript
// CSV parsing result
interface ParseResult {
  data: CSVRow[];
  headers: string[];
  totalRows: number;
  errors: string[];
}

// Import operation result
interface ImportResult {
  successful: number;
  failed: number;
  duplicates: number;
  companiesOnly: number;
  errors: string[];
  totalProcessed: number;
}

// CSV row data
interface CSVRow {
  [key: string]: string;
}

// Field mapping configuration
interface FieldMapping {
  csvField: string;
  leadField: string | null;
  section?: FieldSection;
  autoCreate?: boolean;
  entityType?: EntityType;
  fieldType?: 'text' | 'number' | 'date' | 'dropdown';
}
```

### Website Field Mapping

**Source File:** `/agency-app/src/services/api/websiteFieldMappingService.ts`

```typescript
interface WebsiteFieldMapping {
  useTopLevel: boolean; // Store in top-level field vs customFields
  customFieldName?: string;
}
```

**Key Features:**
- Uses `papaparse` library for CSV parsing
- Auto-detects dropdown fields (columns containing "dropdown")
- Deduplication strategies: Skip, Update, Create New
- Deduplication criteria: Email (primary), Name+Company, Phone
- Auto-creates custom fields for unmapped columns

---

## 15. Cloud Functions Types

**Source File:** `/functions/src/types/index.ts`

### Company & Blog Analysis

```typescript
interface CompanyAnalysis {
  url: string;
  title: string;
  description: string;
  summary: string;
  industry?: string;
  keyProducts: string[];
  targetAudience?: string;
}

interface BlogAnalysis {
  blogUrl?: string;
  found: boolean;
  recentPosts: BlogPost[];
  themes: string[];
  contentStyle?: string;
  postingFrequency?: string;
}

interface BlogPost {
  title: string;
  url: string;
  publishedDate?: Date;
  tags?: string[];
  summary?: string;
}
```

### AI Trends & Content Ideas

```typescript
interface AITrend {
  topic: string;
  frequency: number;
  keywords: string[];
  description?: string;
  source: "email" | "manual";
  extractedAt: Date;
}

interface ContentIdea {
  id: string;
  title: string;
  angle: string;
  format: string;
  targetAudience: string;
  productTieIn: string;
  keywords: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  estimatedLength?: string;
  isDuplicate?: boolean;
  duplicateReason?: string;
}
```

### Research Sessions

```typescript
interface ResearchSession {
  id: string;
  companyUrl: string;
  status: "pending" | "in_progress" | "completed" | "error";
  steps: ResearchStep[];
  companyAnalysis?: CompanyAnalysis;
  blogAnalysis?: BlogAnalysis;
  aiTrends?: AITrend[];
  generatedIdeas?: ContentIdea[];
  uniqueIdeas?: ContentIdea[];
  googleDocUrl?: string;
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

interface ResearchStep {
  step: string;
  status: "pending" | "in_progress" | "completed" | "error";
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}
```

### API Cost Tracking

```typescript
interface ApiCostInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
}
```

### Blog Qualification

```typescript
interface BlogQualificationResult {
  // Company info
  companyName: string;
  website: string;

  // Blog status
  hasActiveBlog: boolean;
  blogPostCount: number;
  lastBlogCreatedAt: string;

  // Writers
  hasMultipleAuthors: boolean;
  authorCount: number;
  authorNames: string;
  authorsAreEmployees: "employees" | "freelancers" | "mixed" | "unknown";

  // Company type
  isDeveloperB2BSaas: boolean;

  // Content analysis
  coversAiTopics: boolean;
  contentSummary: string;
  contentQualityRating?: "low" | "medium" | "high";
  contentQualityReasoning?: string;

  // Technical details
  isAIWritten?: boolean;
  aiWrittenConfidence?: "low" | "medium" | "high";
  hasCodeExamples?: boolean;
  hasDiagrams?: boolean;
  technicalDepth?: "beginner" | "intermediate" | "advanced";
  funnelStage?: "top" | "middle" | "bottom";

  // URLs
  blogLinkUsed: string;
  lastPostUrl?: string;
  rssFeedUrl?: string;

  // Analysis metadata
  rssFeedFound: boolean;
  analysisMethod: "RSS" | "AI" | "RSS + AI (authors)" | "RSS + AI (content)" | "None";

  // Qualification
  qualified: boolean;

  // Cost tracking
  costInfo?: ApiCostInfo;
}
```

### Writing Program Analysis

```typescript
interface WritingProgramAnalysisResult {
  programUrl: string;
  hasProgram: boolean;
  isOpen: boolean | null;
  openDates?: {
    openFrom: string;
    closedFrom: string;
  } | null;

  // Payment information
  payment: {
    amount: string | null;
    method: string | null;
    details: string | null;
    sourceSnippet: string | null;
    historical: string | null;
  };

  // Requirements
  requirements?: string[];
  requirementTypes?: string[];
  submissionGuidelines?: string;

  // Contact
  contactEmail?: string;
  responseTime?: string;

  // Dates
  publishedDate?: string | null;
  publishedDateSource?: string | null;

  // Analysis details
  programDetails: string;
  aiReasoning: string;
  costInfo?: ApiCostInfo;
}
```

### Gen AI Idea Generation

```typescript
interface GenAIIdeaResponse {
  companyContext: {
    companyName: string;
    companyWebsite: string;
    companyDescription: string;
    isDeveloperB2BSaaS: boolean;
    isGenAIRelated: boolean;
    category: "ML" | "Data Science" | "Not AI-related";
    toolType: string;
  };

  blogAnalysis: {
    previousArticleTitles: string[];
    topicsTheyDiscuss: string[];
    keywords: string[];
    technicalDepth: "beginner" | "intermediate" | "advanced";
    writerTypes: "employees" | "freelancers" | "mixed" | "unknown";
  };

  ideas: GenAIIdea[];
  linkedInMessage: string;
  costInfo?: ApiCostInfo;
}

interface GenAIIdea {
  id?: string;
  title: string;
  platform: string;
  specificUse: string;
  tool: string;
  description: string;
  whyItFits: string;
  status?: "pending" | "approved" | "attached";
  createdAt?: Date;
  updatedAt?: Date;
  attachedAt?: Date;
}
```

---

## 16. Cost Tracking

**Source File:** `/agency-app/src/services/api/userCostTracking.ts`

```typescript
interface AICostUpdate {
  cost: number;
  tokens: number;
  category: 'blogAnalysis' | 'writingProgram' | 'other';
}

interface ApolloCostUpdate {
  credits: number;
  category: 'emailEnrichment' | 'organizationEnrichment' | 'peopleSearch';
}
```

**Cost Tracking Locations:**
1. **Lead Level:** `Lead.totalApiCosts`
2. **Company Level:** `Company.totalApiCosts`
3. **User Level:** `UserProfile.apiUsage` (AI + Apollo breakdown)
4. **Per-Operation:** `costInfo` objects in analysis results

---

## 17. Validation & Helpers

### Field Validation

**Source File:** `/agency-app/src/services/validation/fieldValidation.ts`

```typescript
interface ValidationResult {
  valid: boolean;
  error?: string;
}
```

### Dynamic Filters

**Source File:** `/agency-app/src/services/api/dynamicFilterService.ts`

```typescript
interface FilterConfig {
  fieldName: string;
  label: string;
  filterType: 'multiselect' | 'text' | 'number-range' | 'date-range' | 'boolean';
  options?: string[];
  min?: number;
  max?: number;
}
```

### Prompts

**Source File:** `/functions/src/prompts/types.ts`

```typescript
type PromptTemplate<T = Record<string, any>> = (variables: T) => string;

interface PromptMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

interface PromptWithMetadata<T = Record<string, any>> {
  template: PromptTemplate<T>;
  metadata: PromptMetadata;
}
```

---

## 18. Firestore Collections Summary

### Main Collections

| Collection | Document ID | Purpose |
|------------|-------------|---------|
| `leads` | `{leadId}` | Lead records |
| `companies` | `{companyId}` | Company records |
| `tickets` | `{ticketId}` | Project tickets |
| `clients` | `{clientId}` | Client profiles |
| `articleIdeas` | `{ideaId}` | Article ideas |
| `users` | `{userId}` | User profiles |
| `pipelineConfig` | `default` | Pipeline configuration (single doc) |
| `fieldDefinitions` | `{fieldId}` | Custom field definitions |
| `settings` | `appConfig` | Application settings (single doc) |
| `releaseNotes` | `{releaseId}` | Release notes |
| `alertRules` | `{ruleId}` | Alert configurations |

### Subcollections

| Parent | Subcollection | Document ID | Purpose |
|--------|---------------|-------------|---------|
| `leads/{id}` | `timeline` | `{leadId}` | Lead state history |
| `tickets/{id}` | `content` | `{ticketId}` | Ticket content |
| `tickets/{id}` | `financials` | `{ticketId}` | Ticket financials |
| `tickets/{id}` | `timeline` | `{ticketId}` | Ticket state history |
| `filterPresets` | `{userId}/presets` | `{presetId}` | Lead filter presets |
| `companyFilterPresets` | `{userId}/presets` | `{presetId}` | Company filter presets |
| `userPreferences` | `{userId}` | - | User preferences |
| `userReleaseNoteStates` | `{userId}` | - | User release note state |

### Required Firestore Indexes

**Leads Collection:**
- `archived` + `status` + `updatedAt`
- `archived` + `company` + `updatedAt`
- `status` + `updatedAt`

**Companies Collection:**
- `archived` + `updatedAt`
- `industry` + `updatedAt`

---

## 19. Entity Relationships

### Visual Relationship Map

```
┌─────────────────────────────────────────────────────────────┐
│                      CORE CRM SYSTEM                         │
└─────────────────────────────────────────────────────────────┘

                    ┌────────────┐
                    │    User    │
                    │  (Profile) │
                    └──────┬─────┘
                           │
                           │ creates/owns
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
   ┌────────┐         ┌────────┐        ┌──────────┐
   │  Lead  │◄────────┤ Company│        │  Ticket  │
   └────┬───┘companyId└───┬────┘        └────┬─────┘
        │                 │                   │
        │                 │                   │
        │ has             │ has               │ has
        │                 │                   │
        ▼                 ▼                   ▼
┌───────────────┐  ┌──────────────┐  ┌────────────────┐
│    Timeline   │  │Blog Analysis │  │Content/Finance │
│(Subcollection)│  │Writing Prog. │  │(Subcollections)│
└───────────────┘  │Apollo Data   │  └────────────────┘
                   └──────────────┘
                           │
                           │ references
                           │
                           ▼
                    ┌─────────────┐
                    │   Client    │
                    └──────┬──────┘
                           │
                           │ has
                           │
                           ▼
                    ┌─────────────┐
                    │Article Ideas│
                    └─────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 CONFIGURATION & SETTINGS                     │
└─────────────────────────────────────────────────────────────┘

    ┌────────────────┐        ┌──────────────┐
    │Pipeline Config │        │  App Settings│
    └────────────────┘        └──────────────┘

    ┌────────────────┐        ┌──────────────┐
    │Field Definitions│       │ Release Notes│
    └────────────────┘        └──────────────┘

    ┌────────────────┐        ┌──────────────┐
    │ Filter Presets │        │  Alert Rules │
    └────────────────┘        └──────────────┘
```

### Key Relationships

1. **Lead → Company**
   - `Lead.companyId` references `Company.id`
   - One-to-many relationship (multiple leads per company)
   - Company auto-created if doesn't exist

2. **Lead → Timeline**
   - Subcollection `leads/{id}/timeline/{id}`
   - One-to-one relationship
   - Tracks state history and durations

3. **Company → Enrichment Data**
   - Embedded in Company document
   - `apolloEnrichment`, `blogAnalysis`, `writingProgramAnalysis`
   - Optional fields populated via API calls

4. **Ticket → Client**
   - `Ticket.clientName` references `Client.name`
   - Many-to-one relationship

5. **ArticleIdea → Client**
   - `ArticleIdea.clientId` references `Client.id`
   - Many-to-one relationship

6. **ArticleIdea → Ticket**
   - `ArticleIdea.ticketId` references `Ticket.id`
   - Optional one-to-one relationship (when idea becomes ticket)

7. **Ticket → Subcollections**
   - `content`, `financials`, `timeline` subcollections
   - One-to-one relationships

8. **User → FilterPreset**
   - `FilterPreset.userId` references `User.id`
   - One-to-many relationship

9. **CustomField → FieldDefinition**
   - `Lead.customFields` and `Company.customFields` validated against `fieldDefinitions`
   - Schema enforcement for dropdown options

10. **User → API Costs**
    - Tracked in `UserProfile.apiUsage`
    - Aggregated from Lead and Company operations

---

## Best Practices

### 1. Data Consistency

- **Always update timeline subcollections** when changing Lead or Ticket status
- **Denormalize frequently accessed data** (e.g., `companyName` on Lead)
- **Use transactions** for multi-document updates (status + timeline)

### 2. Performance Optimization

- **Paginate large lists** using Firestore `limit()` and `startAfter()`
- **Load subcollections lazily** (only when detail view is opened)
- **Unsubscribe from real-time listeners** on component unmount
- **Index custom fields** that are frequently filtered

### 3. Cost Management

- **Enrich strategically** - Only run Apollo/AI enrichment on qualified leads
- **Batch operations** - Group AI analysis requests when possible
- **Track all costs** - Update `totalApiCosts` on every API call
- **Set budgets** - Monitor per-user API usage

### 4. Custom Fields

- **Validate before saving** - Check dropdown values against field definitions
- **Auto-create with caution** - Review auto-created fields from CSV imports
- **Document field purpose** - Add descriptions in field definitions
- **Version field definitions** - Track changes to dropdown options

### 5. Security

- **Validate all inputs** - Sanitize user-provided data
- **Enforce role-based access** - Use Firestore security rules
- **Never expose API keys** - Keep sensitive config in environment variables
- **Audit user actions** - Log important operations (delete, bulk edit)

---

## Migration Notes

### Breaking Changes

1. **Custom Fields Migration (v2.0)**
   - Migrated from loose `customFields` object to schema-based `fieldDefinitions`
   - Dropdown fields now require field definitions in Firestore
   - Legacy custom fields remain supported

2. **Table Columns Storage (v2.1)**
   - Changed localStorage key from `crm_table_columns_visibility` to `crm_table_columns_v2`
   - Forces column refresh with new "Actions" column

3. **User Roles (v1.5)**
   - Added "Marketing Analyst" role
   - Deprecated lowercase role names in favor of titlecase

### Backward Compatibility

- **Client Guidelines:** Still supports legacy flat structure alongside new `sections` array
- **State History:** Supports both subcollection and denormalized formats
- **Filter Presets:** Old presets without `advancedRules` still work

---

## Appendix: Common Queries

### Get All Active Leads

```typescript
const leadsRef = collection(db, 'leads');
const q = query(
  leadsRef,
  where('archived', '==', false),
  orderBy('updatedAt', 'desc')
);
const snapshot = await getDocs(q);
```

### Get Company with Enrichment

```typescript
const companyRef = doc(db, 'companies', companyId);
const companySnap = await getDoc(companyRef);
const company = companySnap.data() as Company;
// Access: company.apolloEnrichment, company.blogAnalysis
```

### Get Lead with Timeline

```typescript
const leadRef = doc(db, 'leads', leadId);
const timelineRef = doc(db, 'leads', leadId, 'timeline', leadId);

const [leadSnap, timelineSnap] = await Promise.all([
  getDoc(leadRef),
  getDoc(timelineRef)
]);

const leadWithTimeline: LeadWithSubcollections = {
  ...leadSnap.data() as Lead,
  timeline: timelineSnap.data() as LeadTimeline
};
```

### Filter Leads by Custom Field

```typescript
const leadsRef = collection(db, 'leads');
const q = query(
  leadsRef,
  where('customFields.industry', '==', 'SaaS'),
  where('archived', '==', false)
);
const snapshot = await getDocs(q);
```

### Get User's Default Filter Preset

```typescript
const presetsRef = collection(db, 'filterPresets', userId, 'presets');
const q = query(presetsRef, where('isDefault', '==', true), limit(1));
const snapshot = await getDocs(q);
const defaultPreset = snapshot.docs[0]?.data() as FilterPreset;
```

---

**End of Documentation**

*Last Updated: 2025-11-11*
*Version: 3.0*
