/**
 * Apollo.io API Proxy Cloud Function
 *
 * This function proxies requests to Apollo.io's API from the client,
 * solving CORS issues and keeping API keys secure on the server.
 *
 * Cost: 1 Apollo credit per successful match
 */

import * as functions from "firebase-functions";
import axios, { AxiosError } from "axios";

const APOLLO_BASE_URL = "https://api.apollo.io/api/v1";
const DEFAULT_TIMEOUT = 10000; // 10 seconds

interface FetchEmailRequest {
  firstName: string;
  lastName: string;
  companyName?: string;
  linkedinUrl?: string;
}

interface FetchEmailResponse {
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  title: string | null;
  companyName: string | null;
  companyWebsite: string | null;
  matched: boolean;
  error?: string;
  costInfo?: {
    credits: number;
    model: string;
    timestamp: Date;
  };
}

interface ApolloEmailEnrichmentRequest {
  first_name: string;
  last_name: string;
  organization_name?: string;
  linkedin_url?: string;
}

interface ApolloPhoneNumber {
  raw_number: string;
  sanitized_number?: string;
  type?: string;
  position?: number;
  status?: string;
}

interface ApolloOrganization {
  id?: string;
  name?: string;
  website_url?: string;
  primary_domain?: string;
}

interface ApolloPerson {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  email?: string;
  phone_numbers?: ApolloPhoneNumber[];
  linkedin_url?: string;
  title?: string;
  organization?: ApolloOrganization;
}

interface ApolloApiError {
  error?: string;
  message?: string;
}

/**
 * Callable Cloud Function to fetch email from Apollo.io
 *
 * This function is called from the client using Firebase Functions SDK.
 * It proxies the request to Apollo.io's API, keeping the API key secure.
 *
 * @param data - Request data containing person information
 * @param context - Firebase callable function context
 * @returns Enriched contact information
 *
 * @example
 * ```typescript
 * // Client-side usage:
 * import { getFunctions, httpsCallable } from 'firebase/functions';
 *
 * const functions = getFunctions();
 * const fetchApolloEmail = httpsCallable(functions, 'fetchApolloEmail');
 *
 * const result = await fetchApolloEmail({
 *   firstName: 'John',
 *   lastName: 'Doe',
 *   companyName: 'Acme Inc',
 *   linkedinUrl: 'https://linkedin.com/in/johndoe'
 * });
 *
 * console.log(result.data.email);
 * ```
 */
export const fetchApolloEmail = functions.https.onCall(
  async (data: FetchEmailRequest, _context): Promise<FetchEmailResponse> => {
    functions.logger.info("Apollo API: Fetching email for", {
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName || "Not provided",
    });

    // Validate required fields
    if (!data.firstName || !data.lastName) {
      functions.logger.error("Apollo API: Missing required fields");
      return {
        email: null,
        phone: null,
        linkedinUrl: null,
        title: null,
        companyName: null,
        companyWebsite: null,
        matched: false,
        error: "First name and last name are required",
      };
    }

    // Get Apollo API key from Firebase config
    const apiKey = functions.config().apollo?.api_key;

    if (!apiKey) {
      functions.logger.error("Apollo API: Missing API key in Firebase config");
      return {
        email: null,
        phone: null,
        linkedinUrl: null,
        title: null,
        companyName: null,
        companyWebsite: null,
        matched: false,
        error: "Apollo API key not configured. Please set using: firebase functions:config:set apollo.api_key=\"YOUR_KEY\"",
      };
    }

    // Build the API request payload
    const payload: ApolloEmailEnrichmentRequest = {
      first_name: data.firstName,
      last_name: data.lastName,
    };

    // Add optional fields with priority to LinkedIn URL (most accurate)
    if (data.linkedinUrl) {
      payload.linkedin_url = data.linkedinUrl;
      functions.logger.info("Apollo API: Using LinkedIn URL for matching:", data.linkedinUrl);
    }

    if (data.companyName) {
      payload.organization_name = data.companyName;
      functions.logger.info("Apollo API: Using company name for matching:", data.companyName);
    }

    try {
      const response = await axios.post<{
        person: ApolloPerson | null;
        organization: ApolloOrganization | null;
      }>(
        `${APOLLO_BASE_URL}/people/match`,
        payload,
        {
          headers: {
            "X-Api-Key": apiKey,
            "Content-Type": "application/json",
          },
          timeout: DEFAULT_TIMEOUT,
        }
      );

      const { person, organization } = response.data;

      if (!person) {
        functions.logger.info("Apollo API: No match found");
        return {
          email: null,
          phone: null,
          linkedinUrl: null,
          title: null,
          companyName: null,
          companyWebsite: null,
          matched: false,
          error: "No match found for the provided information",
        };
      }

      // Extract phone number (prefer first sanitized number)
      let phone: string | null = null;
      if (person.phone_numbers && person.phone_numbers.length > 0) {
        phone =
          person.phone_numbers[0].sanitized_number ||
          person.phone_numbers[0].raw_number ||
          null;
      }

      // Extract email
      const email = person.email || null;

      // Extract LinkedIn URL
      const linkedinUrl = person.linkedin_url || null;

      // Extract title
      const title = person.title || null;

      // Extract company information
      const companyName = organization?.name || person.organization?.name || null;
      const companyWebsite =
        organization?.website_url ||
        organization?.primary_domain ||
        person.organization?.website_url ||
        person.organization?.primary_domain ||
        null;

      // Cost tracking (1 credit per match)
      const costInfo = {
        credits: 1,
        model: "apollo-people-match",
        timestamp: new Date(),
      };

      functions.logger.info("Apollo API: Match found", {
        email: email || "Not found",
        phone: phone || "Not found",
        linkedin: linkedinUrl || "Not found",
        title: title || "Not found",
        company: companyName || "Not found",
        cost: "1 credit",
      });

      return {
        email,
        phone,
        linkedinUrl,
        title,
        companyName,
        companyWebsite,
        matched: true,
        costInfo,
      };
    } catch (error) {
      functions.logger.error("Apollo API: Error fetching email", error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApolloApiError>;

        // Handle rate limiting
        if (axiosError.response?.status === 429) {
          return {
            email: null,
            phone: null,
            linkedinUrl: null,
            title: null,
            companyName: null,
            companyWebsite: null,
            matched: false,
            error: "Rate limit exceeded. Please try again later.",
          };
        }

        // Handle authentication errors
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return {
            email: null,
            phone: null,
            linkedinUrl: null,
            title: null,
            companyName: null,
            companyWebsite: null,
            matched: false,
            error: "Invalid Apollo API key. Please check your Firebase config.",
          };
        }

        // Handle other API errors
        const errorMessage =
          axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          axiosError.message ||
          "Unknown error occurred";

        return {
          email: null,
          phone: null,
          linkedinUrl: null,
          title: null,
          companyName: null,
          companyWebsite: null,
          matched: false,
          error: `Apollo API error: ${errorMessage}`,
        };
      }

      // Handle non-Axios errors
      return {
        email: null,
        phone: null,
        linkedinUrl: null,
        title: null,
        companyName: null,
        companyWebsite: null,
        matched: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
);
