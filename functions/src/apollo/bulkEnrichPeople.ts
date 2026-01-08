/**
 * Apollo.io Bulk People Enrichment Cloud Function
 *
 * This function enriches multiple people at once using Apollo's Bulk Match API.
 * It reveals contact information (emails, phones, LinkedIn URLs) for selected people.
 *
 * Endpoint: POST /api/v1/people/bulk_match
 * Documentation: https://apolloio.github.io/apollo-api-docs/#bulk-people-enrichment
 *
 * Cost: Credits vary (typically 1 credit per person with email revealed)
 */

import * as functions from "firebase-functions";
import axios, { AxiosError } from "axios";

const APOLLO_BASE_URL = "https://api.apollo.io/api/v1";
const DEFAULT_TIMEOUT = 30000; // 30 seconds

interface PersonDetail {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  organization_name?: string;
  domain?: string;
  email?: string;
  linkedin_url?: string;
}

interface BulkEnrichRequest {
  personIds?: string[]; // Legacy support
  people?: PersonDetail[]; // New format with full details
}

interface ApolloPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  linkedin_url?: string;
  title?: string;
  phone_numbers?: Array<{
    raw_number?: string;
    sanitized_number?: string;
    type?: string;
  }>;
  organization?: {
    id?: string;
    name?: string;
    website_url?: string;
    primary_domain?: string;
  };
  city?: string;
  state?: string;
  country?: string;
}

interface BulkEnrichResponse {
  people: Array<{
    id: string;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
    email?: string | null;
    phone?: string | null;
    linkedinUrl?: string | null;
    title?: string | null;
    companyName?: string | null;
    companyWebsite?: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  }>;
  success: boolean;
  error?: string;
  costInfo?: {
    credits: number;
    service: string;
    timestamp: Date;
  };
}

/**
 * Callable Cloud Function to bulk enrich people using Apollo.io
 *
 * This function takes an array of person details from search results and enriches them
 * to reveal contact information (emails, phones, LinkedIn URLs).
 *
 * The bulk_match API requires person details (first_name, last_name, organization_name)
 * to match and reveal contact info.
 *
 * Example usage from frontend:
 * ```
 * const enrichPeople = httpsCallable(functions, 'apolloBulkEnrichPeople');
 * const result = await enrichPeople({
 *   people: [
 *     { first_name: 'John', last_name: 'Doe', organization_name: 'Acme Inc' },
 *     { first_name: 'Jane', last_name: 'Smith', organization_name: 'Acme Inc' }
 *   ]
 * });
 * ```
 */
export const apolloBulkEnrichPeople = functions.https.onCall(
  async (
    data: BulkEnrichRequest,
    context: functions.https.CallableContext
  ): Promise<BulkEnrichResponse> => {
    // Check authentication
    if (!context.auth) {
      functions.logger.warn("Apollo API: Unauthenticated request");
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in to use this feature"
      );
    }

    // Validate input - support both old and new format
    const people = data.people;
    if (!people || !Array.isArray(people) || people.length === 0) {
      functions.logger.error("Apollo API: Missing or invalid people array");
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Missing required field: people (must be a non-empty array of person details)"
      );
    }

    functions.logger.info("Apollo API: Bulk enriching people", {
      count: people.length,
      userId: context.auth.uid,
    });

    // Get Apollo API key from Firebase config
    const apiKey = functions.config().apollo?.api_key;

    if (!apiKey) {
      functions.logger.error("Apollo API: Missing API key in Firebase config");
      return {
        people: [],
        success: false,
        error: "Apollo API key not configured. Please set using: firebase functions:config:set apollo.api_key=\"YOUR_KEY\"",
      };
    }

    try {
      // Apollo's bulk_match endpoint expects an array of details objects
      // The ID field is the most reliable way to match - use it if available
      const details = people.map(person => {
        const detail: Record<string, string> = {};

        // Apollo person ID is the most reliable matching criterion
        if (person.id) detail.id = person.id;
        if (person.first_name) detail.first_name = person.first_name;
        if (person.last_name) detail.last_name = person.last_name;
        if (person.organization_name) detail.organization_name = person.organization_name;
        if (person.domain) detail.domain = person.domain;
        if (person.email) detail.email = person.email;
        if (person.linkedin_url) detail.linkedin_url = person.linkedin_url;

        return detail;
      });

      const payload = {
        details,
        reveal_personal_emails: true,
        reveal_phone_number: false,
      };

      functions.logger.info("Apollo API: Sending bulk_match request", {
        detailsCount: details.length,
        sampleDetail: details[0],
      });

      const response = await axios.post<{
        matches: ApolloPerson[];
      }>(
        `${APOLLO_BASE_URL}/people/bulk_match`,
        payload,
        {
          headers: {
            "X-Api-Key": apiKey,
            "Content-Type": "application/json",
          },
          timeout: DEFAULT_TIMEOUT,
        }
      );

      const { matches } = response.data;

      functions.logger.info("Apollo API: Received response", {
        matchesCount: matches?.length || 0,
      });

      if (!matches || matches.length === 0) {
        functions.logger.info("Apollo API: No matches found");
        return {
          people: [],
          success: true,
          costInfo: {
            credits: 0,
            service: "apollo-bulk-enrich",
            timestamp: new Date(),
          },
        };
      }

      // Transform Apollo people to simplified format, filtering out null matches
      const enrichedPeople = matches
        .filter((person) => person !== null && person !== undefined)
        .map((person) => {
          return {
            id: person.id || '',
            firstName: person.first_name || null,
            lastName: person.last_name || null,
            name: person.name || null,
            email: person.email || null,
            phone: null, // Not using phone numbers
            linkedinUrl: person.linkedin_url || null,
            title: person.title || null,
            companyName: person.organization?.name || null,
            companyWebsite:
              person.organization?.website_url ||
              person.organization?.primary_domain ||
              null,
            city: person.city || null,
            state: person.state || null,
            country: person.country || null,
          };
        });

      // Calculate cost (1 credit per person with email)
      const credits = enrichedPeople.filter(p => p.email).length;

      functions.logger.info("Apollo API: Bulk enrichment complete", {
        requested: people.length,
        enriched: enrichedPeople.length,
        withEmails: credits,
        estimatedCost: `${credits} credits`,
      });

      return {
        people: enrichedPeople,
        success: true,
        costInfo: {
          credits,
          service: "apollo-bulk-enrich",
          timestamp: new Date(),
        },
      };

    } catch (error) {
      functions.logger.error("Apollo API: Error enriching people", error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;

        // Log the full error response for debugging
        functions.logger.error("Apollo API: Axios error details", {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
        });

        // Handle rate limiting
        if (axiosError.response?.status === 429) {
          return {
            people: [],
            success: false,
            error: "Rate limit exceeded. Please try again later.",
          };
        }

        // Handle authentication errors
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return {
            people: [],
            success: false,
            error: "Invalid Apollo API key or insufficient permissions. Check your Firebase config and Apollo plan.",
          };
        }

        // Handle bad request (400) - usually invalid payload format
        if (axiosError.response?.status === 400) {
          const responseData = axiosError.response?.data as any;
          return {
            people: [],
            success: false,
            error: `Apollo API validation error: ${responseData?.error || responseData?.message || 'Invalid request format'}`,
          };
        }

        // Handle other API errors
        const errorMessage =
          (axiosError.response?.data as any)?.error ||
          (axiosError.response?.data as any)?.message ||
          axiosError.message ||
          "Unknown error occurred";

        return {
          people: [],
          success: false,
          error: `Apollo API error: ${errorMessage}`,
        };
      }

      // Handle non-Axios errors
      return {
        people: [],
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
);
