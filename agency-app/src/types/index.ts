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
  CSVRow,
  FieldMapping
} from './crm';

export {
  DEFAULT_PIPELINE_STAGES,
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
  SearchPeopleResponse,
  ApolloOrganizationEnrichmentRequest,
  ApolloOrganizationEnrichmentResponse,
  EnrichOrganizationRequest,
  EnrichOrganizationResponse
} from './apollo';

// Filter and Preset types
export type {
  FilterOperator,
  FilterRule,
  FilterBuilderState,
  FilterState,
  FilterableField,
  ActiveFilter,
  FilterPreset,
  SavePresetRequest,
  PresetListItem
} from './filter';

// Google Analytics types
export type {
  TrafficSourceType,
  GAMetrics,
  GATrafficSource,
  GATopPage,
  GAConfig,
  GASyncResult,
  GADateRange,
  GAMetricsSummary,
  GATrafficSourceSummary,
  GAChartDataPoint
} from './googleAnalytics';

// Event types
export type {
  Event,
  EventStatus,
  EventType,
  TicketAvailability,
  IcpMatch,
  EventCompanyRole,
  EventLeadRole,
  EventLeadPersona,
  OutreachStatus,
  EventDiscoverySource,
  EventLocation,
  EventPricing,
  EventScoringBreakdown,
  EventIcpSummary,
  OutreachEntry,
  EventCompany,
  EventLead,
  EventFormData,
  EventCompanyFormData,
  EventLeadFormData,
  EventFilters,
} from './event';

export {
  EVENT_STATUS_ORDER,
  EVENT_STATUS_LABELS,
  EVENT_STATUS_COLORS,
  EVENT_TYPE_LABELS,
  ICP_MATCH_LABELS,
  PERSONA_LABELS,
  PERSONA_COLORS,
} from './event';