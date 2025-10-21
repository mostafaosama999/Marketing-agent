// src/types/index.ts
export type { Client, ClientGuidelines, ClientCompensation, GuidelineSection, ChecklistItem } from './client';

// Ticket types (current system)
export type {
  Ticket,
  TicketStatus,
  TicketPriority,
  TicketContent,
  TicketFinancials,
  TicketTimeline,
  TicketStatusChange,
  TicketWithSubcollections,
  ArticleIdea,
  CompensationStructure,
  TeamMember,
  AIReview,
  AlertRule,
  AlertRuleConditions,
  TicketBasedAlertRule,
  WriterBasedAlertRule,
  ClientBasedAlertRule,
  AlertRuleType,
  BaseAlertRule
} from './ticket';

// CRM Lead types
export type {
  Lead,
  LeadStatus,
  LeadFormData,
  LeadTimeline,
  LeadStatusChange,
  LeadWithSubcollections,
  ViewMode,
  LeadFilters
} from './lead';

// CRM Configuration types
export type {
  Company,
  CompanyFormData,
  PipelineStage,
  PipelineConfig,
  CustomField,
  CustomFieldType,
  CustomFieldsConfig,
  CSVRow,
  FieldMapping
} from './crm';

export {
  DEFAULT_PIPELINE_STAGES,
  DEFAULT_CUSTOM_FIELDS,
  STATUS_TO_LEAD_STATUS,
  LEAD_STATUS_TO_LABEL
} from './crm';

export type { UserRole, UserProfile, AuthContextType, User, AuthUser, UserPerformance } from './auth';

// Apollo.io API types
export type {
  ApolloCostInfo,
  ApolloOrganization,
  ApolloEmployment,
  ApolloPhoneNumber,
  ApolloPerson,
  ApolloEmailEnrichmentRequest,
  ApolloEmailEnrichmentResponse,
  ApolloApiError,
  FetchEmailRequest,
  FetchEmailResponse,
  ApolloPaginationInfo,
  ApolloPeopleSearchRequest,
  ApolloPeopleSearchResponse,
  ApolloSearchPerson,
  SearchPeopleRequest,
  SearchPeopleResponse
} from './apollo';