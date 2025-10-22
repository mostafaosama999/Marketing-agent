// src/services/api/apolloService.ts

import axios, { AxiosError } from 'axios';
import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  ApolloEmailEnrichmentRequest,
  ApolloEmailEnrichmentResponse,
  ApolloPerson,
  ApolloOrganization,
  ApolloApiError,
  ApolloCostInfo,
  FetchEmailRequest,
  FetchEmailResponse,
  ApolloPeopleSearchRequest,
  ApolloPeopleSearchResponse,
  ApolloPaginationInfo,
  SearchPeopleRequest,
  SearchPeopleResponse,
  ApolloSearchPerson,
} from '../../types';

/**
 * Apollo.io API Service
 *
 * This service provides email enrichment and people search capabilities
 * using Firebase Cloud Functions that proxy Apollo.io's REST API.
 *
 * This approach solves CORS issues and keeps API keys secure on the server.
 *
 * API Documentation: https://apolloio.github.io/apollo-api-docs
 */

const APOLLO_BASE_URL = 'https://api.apollo.io/api/v1';
const DEFAULT_TIMEOUT = 10000; // 10 seconds

/**
 * Fetch email and contact information for a person using Apollo.io People Match API
 *
 * This function calls a Firebase Cloud Function that proxies the request to Apollo.io,
 * solving CORS issues and keeping API keys secure on the server.
 *
 * Cost: 1 Apollo credit per successful match
 *
 * Matching Strategy:
 * - Primary: LinkedIn URL (most accurate)
 * - Fallback: first_name + last_name + organization_name/domain
 *
 * @param request - Person details for enrichment
 * @returns Enriched contact information including email, phone, LinkedIn, title, organization
 *
 * @example
 * ```typescript
 * const result = await fetchEmail({
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   companyName: 'Acme Inc',
 *   linkedinUrl: 'https://www.linkedin.com/in/johndoe'
 * });
 *
 * if (result.matched) {
 *   console.log('Email:', result.email);
 *   console.log('Phone:', result.phone);
 * }
 * ```
 */
export async function fetchEmail(
  request: FetchEmailRequest
): Promise<FetchEmailResponse> {
  console.log('Apollo API: Fetching email for', request.firstName, request.lastName);

  try {
    // Call Firebase Cloud Function to proxy the Apollo API request
    const functions = getFunctions();
    const fetchEmailCloud = httpsCallable<FetchEmailRequest, FetchEmailResponse>(
      functions,
      'fetchEmailCloud'
    );

    const result = await fetchEmailCloud(request);

    console.log('Apollo API: Cloud Function response:', result.data.matched ? 'Match found' : 'No match');

    return result.data;
  } catch (error) {
    console.error('Apollo API: Error calling Cloud Function', error);

    return {
      email: null,
      phone: null,
      linkedinUrl: null,
      title: null,
      companyName: null,
      companyWebsite: null,
      matched: false,
      error: error instanceof Error ? error.message : 'Failed to fetch email. Please try again.',
    };
  }
}

/**
 * Advanced email enrichment with full Apollo API response
 *
 * This function provides access to the complete Apollo API response,
 * including detailed person and organization information.
 *
 * Use this when you need more than just basic contact information
 * (e.g., employment history, technologies, funding information).
 *
 * @param request - Full Apollo enrichment request parameters
 * @param apiKey - Apollo.io API key
 * @returns Complete Apollo API response with person and organization data
 */
export async function enrichEmail(
  request: ApolloEmailEnrichmentRequest,
  apiKey: string
): Promise<ApolloEmailEnrichmentResponse> {
  console.log('Apollo API: Enriching email with full details');

  if (!apiKey) {
    console.error('Apollo API: Missing API key');
    return {
      person: null,
      organization: null,
      matched: false,
      error: 'Missing Apollo API key. Please set REACT_APP_APOLLO_API_KEY environment variable.',
    };
  }

  try {
    const response = await axios.post<{
      person: ApolloPerson | null;
      organization: ApolloOrganization | null;
    }>(
      `${APOLLO_BASE_URL}/people/match`,
      request,
      {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: DEFAULT_TIMEOUT,
      }
    );

    const { person, organization } = response.data;

    if (!person) {
      console.log('Apollo API: No match found');
      return {
        person: null,
        organization: null,
        matched: false,
        error: 'No match found for the provided information',
      };
    }

    // Cost tracking (1 credit per match)
    const costInfo: ApolloCostInfo = {
      credits: 1,
      model: 'apollo-people-match',
      timestamp: new Date(),
    };

    console.log('Apollo API: Enrichment complete');
    console.log(`  Person ID: ${person.id || 'N/A'}`);
    console.log(`  Email: ${person.email || 'Not found'}`);
    console.log(`  Cost: 1 credit`);

    return {
      person,
      organization,
      matched: true,
      costInfo,
    };

  } catch (error) {
    console.error('Apollo API: Error enriching email', error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApolloApiError>;

      // Handle rate limiting
      if (axiosError.response?.status === 429) {
        return {
          person: null,
          organization: null,
          matched: false,
          error: 'Rate limit exceeded. Please try again later.',
        };
      }

      // Handle authentication errors
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        return {
          person: null,
          organization: null,
          matched: false,
          error: 'Invalid Apollo API key. Please check your REACT_APP_APOLLO_API_KEY.',
        };
      }

      // Handle other API errors
      const errorMessage = axiosError.response?.data?.error ||
                          axiosError.response?.data?.message ||
                          axiosError.message ||
                          'Unknown error occurred';

      return {
        person: null,
        organization: null,
        matched: false,
        error: `Apollo API error: ${errorMessage}`,
      };
    }

    // Handle non-Axios errors
    return {
      person: null,
      organization: null,
      matched: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Search for people using Apollo.io People Search API
 *
 * This function allows you to find multiple contacts matching specific criteria
 * such as job titles, company name, and location. Useful for bulk lead generation.
 *
 * Cost: Credits vary based on results and filters used
 *
 * @param request - Search criteria (company, job titles, pagination)
 * @param apiKey - Apollo.io API key
 * @returns Array of matching people with contact information and pagination data
 *
 * @example
 * ```typescript
 * // Find all CMOs at a specific company
 * const results = await searchPeople({
 *   companyName: 'Acme Inc',
 *   jobTitles: ['CMO', 'Chief Marketing Officer'],
 *   page: 1,
 *   pageSize: 25
 * }, process.env.REACT_APP_APOLLO_API_KEY!);
 *
 * if (results.success) {
 *   console.log(`Found ${results.people.length} people`);
 *   results.people.forEach(person => {
 *     console.log(`${person.name} - ${person.title} at ${person.companyName}`);
 *     console.log(`Email: ${person.email}, Phone: ${person.phone}`);
 *   });
 * }
 * ```
 */
export async function searchPeople(
  request: SearchPeopleRequest,
  apiKey: string
): Promise<SearchPeopleResponse> {
  console.log('Apollo API: Searching for people');
  console.log(`  Company: ${request.companyName || 'Any'}`);
  console.log(`  Job Titles: ${request.jobTitles?.join(', ') || 'Any'}`);
  console.log(`  Page: ${request.page || 1}, Size: ${request.pageSize || 25}`);

  if (!apiKey) {
    console.error('Apollo API: Missing API key');
    return {
      people: [],
      pagination: {
        currentPage: 1,
        pageSize: 0,
        totalResults: 0,
        totalPages: 0,
      },
      success: false,
      error: 'Missing Apollo API key. Please set REACT_APP_APOLLO_API_KEY environment variable.',
    };
  }

  // Build the API request payload
  const payload: ApolloPeopleSearchRequest = {
    page: request.page || 1,
    per_page: Math.min(request.pageSize || 25, 100), // Max 100 per page
  };

  // Add optional filters
  if (request.companyName) {
    payload.q_organization_name = request.companyName;
  }

  if (request.jobTitles && request.jobTitles.length > 0) {
    payload.person_titles = request.jobTitles;
  }

  if (request.keywords) {
    payload.q_keywords = request.keywords;
  }

  if (request.locations && request.locations.length > 0) {
    payload.person_locations = request.locations;
  }

  if (request.seniorities && request.seniorities.length > 0) {
    payload.person_seniorities = request.seniorities;
  }

  try {
    const response = await axios.post<{
      people: ApolloPerson[];
      pagination: ApolloPaginationInfo;
    }>(
      `${APOLLO_BASE_URL}/mixed_people/search`,
      payload,
      {
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
        },
        timeout: DEFAULT_TIMEOUT,
      }
    );

    const { people, pagination } = response.data;

    if (!people || people.length === 0) {
      console.log('Apollo API: No people found matching criteria');
      return {
        people: [],
        pagination: {
          currentPage: pagination?.page || 1,
          pageSize: pagination?.per_page || 0,
          totalResults: pagination?.total_entries || 0,
          totalPages: pagination?.total_pages || 0,
        },
        success: true,
        costInfo: {
          credits: 0,
          model: 'apollo-people-search',
          timestamp: new Date(),
        },
      };
    }

    // Transform Apollo people to simplified format
    const simplifiedPeople: ApolloSearchPerson[] = people.map(person => {
      // Extract phone number (prefer first sanitized number)
      let phone: string | null = null;
      if (person.phone_numbers && person.phone_numbers.length > 0) {
        phone = person.phone_numbers[0].sanitized_number ||
                person.phone_numbers[0].raw_number ||
                null;
      }

      return {
        id: person.id,
        firstName: person.first_name || null,
        lastName: person.last_name || null,
        name: person.name || null,
        email: person.email || null,
        phone,
        linkedinUrl: person.linkedin_url || null,
        title: person.title || null,
        companyName: person.organization?.name || null,
        companyWebsite: person.organization?.website_url ||
                       person.organization?.primary_domain ||
                       null,
        photoUrl: person.photo_url || null,
        city: person.city || null,
        state: person.state || null,
        country: person.country || null,
      };
    });

    // Estimate cost (rough estimate - actual cost may vary)
    // Apollo typically charges per export/reveal, not per search
    const estimatedCredits = simplifiedPeople.filter(p => p.email).length;

    const costInfo: ApolloCostInfo = {
      credits: estimatedCredits,
      model: 'apollo-people-search',
      timestamp: new Date(),
    };

    console.log('Apollo API: Search complete');
    console.log(`  Found: ${people.length} people`);
    console.log(`  Page: ${pagination.page}/${pagination.total_pages}`);
    console.log(`  Total Results: ${pagination.total_entries}`);
    console.log(`  Estimated Cost: ${estimatedCredits} credits`);

    return {
      people: simplifiedPeople,
      pagination: {
        currentPage: pagination.page,
        pageSize: pagination.per_page,
        totalResults: pagination.total_entries,
        totalPages: pagination.total_pages,
      },
      success: true,
      costInfo,
    };

  } catch (error) {
    console.error('Apollo API: Error searching people', error);

    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError<ApolloApiError>;

      // Handle rate limiting
      if (axiosError.response?.status === 429) {
        return {
          people: [],
          pagination: {
            currentPage: 1,
            pageSize: 0,
            totalResults: 0,
            totalPages: 0,
          },
          success: false,
          error: 'Rate limit exceeded. Please try again later.',
        };
      }

      // Handle authentication errors
      if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
        return {
          people: [],
          pagination: {
            currentPage: 1,
            pageSize: 0,
            totalResults: 0,
            totalPages: 0,
          },
          success: false,
          error: 'Invalid Apollo API key. Please check your REACT_APP_APOLLO_API_KEY.',
        };
      }

      // Handle other API errors
      const errorMessage = axiosError.response?.data?.error ||
                          axiosError.response?.data?.message ||
                          axiosError.message ||
                          'Unknown error occurred';

      return {
        people: [],
        pagination: {
          currentPage: 1,
          pageSize: 0,
          totalResults: 0,
          totalPages: 0,
        },
        success: false,
        error: `Apollo API error: ${errorMessage}`,
      };
    }

    // Handle non-Axios errors
    return {
      people: [],
      pagination: {
        currentPage: 1,
        pageSize: 0,
        totalResults: 0,
        totalPages: 0,
      },
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Apollo Service object with all available methods
 *
 * This provides a clean interface for importing and using Apollo functionality:
 *
 * @example
 * ```typescript
 * import { apolloService } from './services/api/apolloService';
 *
 * const result = await apolloService.fetchEmail({...}, apiKey);
 * const searchResults = await apolloService.searchPeople({...}, apiKey);
 * ```
 */
export const apolloService = {
  fetchEmail,
  enrichEmail,
  searchPeople,
};
