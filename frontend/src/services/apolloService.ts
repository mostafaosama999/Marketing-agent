import axios from 'axios';
import { Lead } from '../app/types/crm';

const APOLLO_API_BASE = 'https://api.apollo.io/api/v1';
const APOLLO_API_KEY = process.env.REACT_APP_APOLLO_API_KEY;

export interface ApolloEnrichmentResult {
  email: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  title: string | null;
  organization: string | null;
}

interface ApolloPersonMatch {
  person: {
    email: string;
    phone_numbers: Array<{number: string}>;
    linkedin_url: string;
    title: string;
    organization: {
      name: string;
    };
  };
}

/**
 * Enriches a lead with email and other data from Apollo.io
 * Uses the People Match API which costs 1 credit per match
 */
export async function enrichLeadEmail(lead: Lead): Promise<ApolloEnrichmentResult> {
  if (!APOLLO_API_KEY) {
    throw new Error('Apollo API key not configured');
  }

  try {
    // Extract LinkedIn URL from custom fields if available
    const linkedinUrl = lead.customFields?.linkedin_url || lead.customFields?.linkedin;

    // Build the match request
    // Apollo can match on: first_name + last_name + company, or LinkedIn URL
    const requestBody: any = {
      api_key: APOLLO_API_KEY,
    };

    if (linkedinUrl) {
      // If we have LinkedIn URL, use it (most accurate)
      requestBody.linkedin_url = linkedinUrl;
    } else {
      // Otherwise try to match by name + company
      const nameParts = lead.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || firstName; // Handle single names

      requestBody.first_name = firstName;
      requestBody.last_name = lastName;

      if (lead.company) {
        requestBody.organization_name = lead.company;
      }
    }

    // Call Apollo People Match API
    const response = await axios.post<ApolloPersonMatch>(
      `${APOLLO_API_BASE}/people/match`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      }
    );

    const person = response.data.person;

    if (!person) {
      return {
        email: null,
        phone: null,
        linkedinUrl: null,
        title: null,
        organization: null,
      };
    }

    // Extract the data
    return {
      email: person.email || null,
      phone: person.phone_numbers?.[0]?.number || null,
      linkedinUrl: person.linkedin_url || null,
      title: person.title || null,
      organization: person.organization?.name || null,
    };
  } catch (error: any) {
    // Handle different error types
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error || error.message;

      if (status === 401) {
        throw new Error('Invalid Apollo API key');
      } else if (status === 404) {
        throw new Error('No match found in Apollo database');
      } else if (status === 429) {
        throw new Error('Apollo API rate limit exceeded');
      } else {
        throw new Error(`Apollo API error: ${message}`);
      }
    }

    throw error;
  }
}

/**
 * Searches for people in Apollo.io database
 * Useful for finding leads before enrichment
 */
export async function searchPeople(query: {
  name?: string;
  company?: string;
  title?: string;
  limit?: number;
}): Promise<any[]> {
  if (!APOLLO_API_KEY) {
    throw new Error('Apollo API key not configured');
  }

  try {
    const requestBody: any = {
      api_key: APOLLO_API_KEY,
      page: 1,
      per_page: query.limit || 10,
    };

    if (query.name) {
      requestBody.q_keywords = query.name;
    }

    if (query.company) {
      requestBody.organization_name = query.company;
    }

    if (query.title) {
      requestBody.person_titles = [query.title];
    }

    const response = await axios.post(
      `${APOLLO_API_BASE}/people/search`,
      requestBody,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.people || [];
  } catch (error: any) {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.error || error.message;

      if (status === 401) {
        throw new Error('Invalid Apollo API key');
      } else if (status === 429) {
        throw new Error('Apollo API rate limit exceeded');
      } else {
        throw new Error(`Apollo API error: ${message}`);
      }
    }

    throw error;
  }
}
