/**
 * Apollo.io People Search Cloud Function
 *
 * This function searches for people using Apollo's People Search API.
 * It allows finding multiple contacts matching specific criteria such as
 * job titles, company name, and location.
 *
 * Endpoint: POST /api/v1/mixed_people/search
 * Documentation: https://apolloio.github.io/apollo-api-docs/#people-search
 *
 * Cost: Credits vary based on results (typically 1 credit per person with email revealed)
 */

import * as functions from "firebase-functions";
import axios, { AxiosError } from "axios";

const APOLLO_BASE_URL = "https://api.apollo.io/api/v1";
const DEFAULT_TIMEOUT = 30000; // 30 seconds for search operations

interface SearchPeopleRequest {
  companyName: string;
  jobTitles: string[];
  page?: number;
  pageSize?: number;
  locations?: string[];
  seniorities?: string[];
  keywords?: string;
}

interface ApolloPerson {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone_numbers?: Array<{
    raw_number?: string;
    sanitized_number?: string;
  }>;
  linkedin_url?: string;
  title?: string;
  photo_url?: string;
  city?: string;
  state?: string;
  country?: string;
  organization?: {
    name?: string;
    website_url?: string;
    primary_domain?: string;
  };
}

interface ApolloPaginationInfo {
  page: number;
  per_page: number;
  total_entries: number;
  total_pages: number;
}

interface ApolloApiError {
  error?: string;
  message?: string;
  error_code?: string;
}

interface SearchPeopleResponse {
  people: Array<{
    id?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    linkedinUrl?: string | null;
    title?: string | null;
    companyName?: string | null;
    companyWebsite?: string | null;
    photoUrl?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  }>;
  pagination: {
    currentPage: number;
    pageSize: number;
    totalResults: number;
    totalPages: number;
  };
  success: boolean;
  error?: string;
  costInfo?: {
    credits: number;
    model: string;
    timestamp: Date;
  };
}

/**
 * Callable Cloud Function to search for people using Apollo.io
 *
 * @param data - Search criteria (company name, job titles, pagination)
 * @param context - Firebase callable function context
 * @returns Search results with people and pagination information
 *
 * @example
 * ```typescript
 * // Client-side usage:
 * import { getFunctions, httpsCallable } from 'firebase/functions';
 *
 * const functions = getFunctions();
 * const searchPeople = httpsCallable(functions, 'searchPeopleCloud');
 *
 * const result = await searchPeople({
 *   companyName: 'Acme Inc',
 *   jobTitles: ['CMO', 'VP Marketing'],
 *   pageSize: 50
 * });
 *
 * console.log(result.data.people);
 * ```
 */
export const searchPeopleCloud = functions.https.onCall(
  async (data: SearchPeopleRequest, _context): Promise<SearchPeopleResponse> => {
    functions.logger.info("Apollo API: Searching for people", {
      companyName: data.companyName,
      jobTitles: data.jobTitles,
      page: data.page || 1,
    });

    // Validate required fields
    if (!data.companyName) {
      functions.logger.error("Apollo API: Missing company name");
      return {
        people: [],
        pagination: {
          currentPage: 1,
          pageSize: 0,
          totalResults: 0,
          totalPages: 0,
        },
        success: false,
        error: "Company name is required",
      };
    }

    if (!data.jobTitles || data.jobTitles.length === 0) {
      functions.logger.error("Apollo API: Missing job titles");
      return {
        people: [],
        pagination: {
          currentPage: 1,
          pageSize: 0,
          totalResults: 0,
          totalPages: 0,
        },
        success: false,
        error: "At least one job title is required",
      };
    }

    // Get Apollo API key from Firebase config
    const apiKey = functions.config().apollo?.api_key;

    if (!apiKey) {
      functions.logger.error("Apollo API: Missing API key in Firebase config");
      return {
        people: [],
        pagination: {
          currentPage: 1,
          pageSize: 0,
          totalResults: 0,
          totalPages: 0,
        },
        success: false,
        error: "Apollo API key not configured. Please set using: firebase functions:config:set apollo.api_key=\"YOUR_KEY\"",
      };
    }

    // Build the API request payload
    const payload: any = {
      page: data.page || 1,
      per_page: Math.min(data.pageSize || 25, 100), // Max 100 per page
      q_organization_name: data.companyName,
      person_titles: data.jobTitles,
    };

    // Add optional filters
    if (data.keywords) {
      payload.q_keywords = data.keywords;
    }

    if (data.locations && data.locations.length > 0) {
      payload.person_locations = data.locations;
    }

    if (data.seniorities && data.seniorities.length > 0) {
      payload.person_seniorities = data.seniorities;
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
            "X-Api-Key": apiKey,
            "Content-Type": "application/json",
          },
          timeout: DEFAULT_TIMEOUT,
        }
      );

      const { people, pagination } = response.data;

      if (!people || people.length === 0) {
        functions.logger.info("Apollo API: No people found matching criteria");
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
            model: "apollo-people-search",
            timestamp: new Date(),
          },
        };
      }

      // Transform Apollo people to simplified format
      const simplifiedPeople = people.map((person) => {
        // Extract phone number (prefer first sanitized number)
        let phone: string | null = null;
        if (person.phone_numbers && person.phone_numbers.length > 0) {
          phone =
            person.phone_numbers[0].sanitized_number ||
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
          companyWebsite:
            person.organization?.website_url ||
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
      const estimatedCredits = simplifiedPeople.filter((p) => p.email).length;

      const costInfo = {
        credits: estimatedCredits,
        model: "apollo-people-search",
        timestamp: new Date(),
      };

      functions.logger.info("Apollo API: Search complete", {
        foundPeople: people.length,
        page: pagination.page,
        totalPages: pagination.total_pages,
        totalResults: pagination.total_entries,
        estimatedCost: `${estimatedCredits} credits`,
      });

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
      functions.logger.error("Apollo API: Error searching for people", error);

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
            error: "Rate limit exceeded. Please try again later.",
          };
        }

        // Handle authentication errors
        if (
          axiosError.response?.status === 401 ||
          axiosError.response?.status === 403
        ) {
          return {
            people: [],
            pagination: {
              currentPage: 1,
              pageSize: 0,
              totalResults: 0,
              totalPages: 0,
            },
            success: false,
            error: "Invalid Apollo API key or insufficient permissions. Check your Firebase config and Apollo plan.",
          };
        }

        // Handle API inaccessible (plan limitation)
        if (axiosError.response?.data?.error_code === "API_INACCESSIBLE") {
          return {
            people: [],
            pagination: {
              currentPage: 1,
              pageSize: 0,
              totalResults: 0,
              totalPages: 0,
            },
            success: false,
            error: axiosError.response.data.error || "This API endpoint is not accessible with your current Apollo plan. Please upgrade your plan to use the People Search feature.",
          };
        }

        // Handle other API errors
        const errorMessage =
          axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          axiosError.message ||
          "Unknown error occurred";

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
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
);
