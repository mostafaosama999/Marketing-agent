// src/types/apollo.ts

/**
 * Apollo.io API Integration Types
 * Documentation: https://apolloio.github.io/apollo-api-docs
 */

/**
 * Cost information for Apollo API calls
 * Apollo charges credits based on operation type
 */
export interface ApolloCostInfo {
  credits: number;
  model: 'apollo-people-match' | 'apollo-people-search';
  timestamp: Date;
}

/**
 * Apollo organization/company information
 */
export interface ApolloOrganization {
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
  sanitized_phone?: string | null;
  industry?: string | null;
  keywords?: string[];
  estimated_num_employees?: number | null;
  industries?: string[];
  secondary_industries?: string[];
  snippets_loaded?: boolean;
  industry_tag_id?: string | null;
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
  total_funding?: number | null;
  latest_funding_round_date?: string | null;
  latest_funding_stage?: string | null;
  funding_events?: any[];
  technology_names?: string[];
  current_technologies?: any[];
  account_id?: string | null;
}

/**
 * Apollo person/contact employment information
 */
export interface ApolloEmployment {
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

/**
 * Apollo phone number information
 */
export interface ApolloPhoneNumber {
  raw_number?: string | null;
  sanitized_number?: string | null;
  type?: string;
  position?: number;
  status?: string;
  dnc_status?: string | null;
  dnc_other_info?: string | null;
}

/**
 * Apollo person/contact information
 */
export interface ApolloPerson {
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
  country?: string | null;
  state?: string | null;
  city?: string | null;
  organization_id?: string | null;
  organization?: ApolloOrganization | null;
  employment_history?: ApolloEmployment[];
  phone_numbers?: ApolloPhoneNumber[];
  intent_strength?: string | null;
  show_intent?: boolean;
  revealed_for_current_team?: boolean;
}

/**
 * Request payload for Apollo People Match API
 */
export interface ApolloEmailEnrichmentRequest {
  first_name: string;
  last_name: string;
  organization_name?: string;
  domain?: string;
  linkedin_url?: string;
  email?: string;
  reveal_personal_emails?: boolean;
  webhook_url?: string;
}

/**
 * Response from Apollo People Match API
 */
export interface ApolloEmailEnrichmentResponse {
  person: ApolloPerson | null;
  organization: ApolloOrganization | null;
  matched: boolean;
  error?: string;
  costInfo?: ApolloCostInfo;
}

/**
 * Apollo API error response
 */
export interface ApolloApiError {
  error?: string;
  message?: string;
  status?: number;
  details?: any;
}

/**
 * Simplified request for common use case
 */
export interface FetchEmailRequest {
  firstName: string;
  lastName: string;
  companyName?: string;
  linkedinUrl?: string;
}

/**
 * Simplified response for common use case
 */
export interface FetchEmailResponse {
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  title: string | null;
  companyName: string | null;
  companyWebsite: string | null;
  matched: boolean;
  error?: string;
  costInfo?: ApolloCostInfo;
}

// ============================================================================
// People Search API Types
// ============================================================================

/**
 * Pagination information for search results
 */
export interface ApolloPaginationInfo {
  page: number;
  per_page: number;
  total_entries: number;
  total_pages: number;
}

/**
 * Request payload for Apollo People Search API
 *
 * Searches for people matching specified criteria.
 * Supports filtering by company, job titles, and pagination.
 */
export interface ApolloPeopleSearchRequest {
  // Organization filters
  q_organization_name?: string;           // Company name search
  q_organization_domains?: string[];      // Company domains (e.g., ["acme.com"])
  organization_ids?: string[];            // Specific organization IDs

  // Person filters
  person_titles?: string[];               // Job titles (e.g., ["CMO", "VP Marketing"])
  q_keywords?: string;                    // Keyword search in person data
  person_locations?: string[];            // Geographic locations
  person_seniorities?: string[];          // Seniority levels (e.g., ["director", "vp", "c_suite"])

  // Contact information filters
  contact_email_status?: string[];        // Email status (e.g., ["verified", "guessed"])

  // Pagination
  page?: number;                          // Page number (default: 1)
  per_page?: number;                      // Results per page (max: 100, default: 25)

  // Additional options
  reveal_personal_emails?: boolean;       // Reveal personal email addresses
}

/**
 * Response from Apollo People Search API
 */
export interface ApolloPeopleSearchResponse {
  people: ApolloPerson[];
  pagination: ApolloPaginationInfo;
  error?: string;
  costInfo?: ApolloCostInfo;
}

/**
 * Simplified person result from search
 * Contains essential contact information
 */
export interface ApolloSearchPerson {
  id?: string;
  firstName: string | null;
  lastName: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  title: string | null;
  companyName: string | null;
  companyWebsite: string | null;
  photoUrl: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
}

/**
 * Simplified request for People Search
 * Common use case: search by company and job titles
 */
export interface SearchPeopleRequest {
  companyName?: string;
  jobTitles?: string[];
  keywords?: string;
  locations?: string[];
  seniorities?: string[];
  page?: number;
  pageSize?: number;
}

/**
 * Simplified response for People Search
 */
export interface SearchPeopleResponse {
  people: ApolloSearchPerson[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalResults: number;
    totalPages: number;
  };
  success: boolean;
  error?: string;
  costInfo?: ApolloCostInfo;
}
