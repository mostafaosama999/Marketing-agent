/**
 * Apollo.io Organization Enrichment Cloud Function
 *
 * This function enriches company data using Apollo's Organization Enrichment API.
 * It provides detailed company information including employee count, funding,
 * technologies, and social links.
 *
 * Endpoint: POST /api/v1/organizations/enrich
 * Documentation: https://apolloio.github.io/apollo-api-docs/#organization-enrichment
 *
 * Cost: 1 Apollo credit per successful enrichment
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios, { AxiosError } from "axios";

const APOLLO_BASE_URL = "https://api.apollo.io/api/v1";
const DEFAULT_TIMEOUT = 15000; // 15 seconds

interface EnrichOrganizationRequest {
  domain: string;
  companyId?: string; // Optional: to update company record directly
}

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
  sanitized_phone?: string | null;
  industry?: string | null;
  keywords?: string[];
  estimated_num_employees?: number | null;
  industries?: string[];
  secondary_industries?: string[];
  industry_tag_id?: string | null;
  retail_location_count?: number | null;
  raw_address?: string | null;
  street_address?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
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

interface ApolloApiError {
  error?: string;
  message?: string;
}

interface EnrichOrganizationResponse {
  organization: ApolloOrganization | null;
  enriched: boolean;
  error?: string;
  costInfo?: {
    credits: number;
    model: string;
    timestamp: Date;
  };
}

/**
 * Format funding amount for display
 */
function formatFunding(amount: number | null): string | null {
  if (!amount || amount === 0) return null;

  if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B`;
  } else if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`;
  } else if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`;
  }

  return `$${amount.toLocaleString()}`;
}

/**
 * Get employee range category from employee count
 */
function getEmployeeRange(count: number | null): string | null {
  if (!count) return null;

  if (count === 1) return "1";
  if (count <= 10) return "1-10";
  if (count <= 50) return "11-50";
  if (count <= 200) return "51-200";
  if (count <= 500) return "201-500";
  if (count <= 1000) return "501-1000";
  if (count <= 5000) return "1001-5000";
  if (count <= 10000) return "5001-10000";

  return "10000+";
}

/**
 * Callable Cloud Function to enrich organization data from Apollo.io
 *
 * @param data - Request data containing company domain
 * @param context - Firebase callable function context
 * @returns Enriched organization information
 *
 * @example
 * ```typescript
 * // Client-side usage:
 * import { getFunctions, httpsCallable } from 'firebase/functions';
 *
 * const functions = getFunctions();
 * const enrichOrg = httpsCallable(functions, 'enrichOrganizationCloud');
 *
 * const result = await enrichOrg({
 *   domain: 'anthropic.com',
 *   companyId: 'abc123'
 * });
 *
 * console.log(result.data.organization);
 * ```
 */
export const enrichOrganizationCloud = functions.https.onCall(
  async (data: EnrichOrganizationRequest, _context): Promise<EnrichOrganizationResponse> => {
    functions.logger.info("Apollo API: Enriching organization", {
      domain: data.domain,
      companyId: data.companyId || "Not provided",
    });

    // Validate required fields
    if (!data.domain) {
      functions.logger.error("Apollo API: Missing domain");
      return {
        organization: null,
        enriched: false,
        error: "Domain is required",
      };
    }

    // Clean domain (remove protocol, www, trailing slash)
    let cleanDomain = data.domain
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .replace(/\/$/, "")
      .trim();

    // Extract domain from path if provided (e.g., "example.com/blog" -> "example.com")
    cleanDomain = cleanDomain.split("/")[0];

    functions.logger.info("Apollo API: Using cleaned domain:", cleanDomain);

    // Get Apollo API key from Firebase config
    const apiKey = functions.config().apollo?.api_key;

    if (!apiKey) {
      functions.logger.error("Apollo API: Missing API key in Firebase config");
      return {
        organization: null,
        enriched: false,
        error: "Apollo API key not configured. Please set using: firebase functions:config:set apollo.api_key=\"YOUR_KEY\"",
      };
    }

    try {
      const response = await axios.post<{
        organization: ApolloOrganization | null;
      }>(
        `${APOLLO_BASE_URL}/organizations/enrich`,
        {
          domain: cleanDomain,
        },
        {
          headers: {
            "X-Api-Key": apiKey,
            "Content-Type": "application/json",
          },
          timeout: DEFAULT_TIMEOUT,
        }
      );

      const { organization } = response.data;

      if (!organization) {
        functions.logger.info("Apollo API: No organization found for domain:", cleanDomain);
        return {
          organization: null,
          enriched: false,
          error: `No organization found for domain: ${cleanDomain}`,
        };
      }

      // Cost tracking (1 credit per enrichment)
      const costInfo = {
        credits: 1,
        model: "apollo-organization-enrich",
        timestamp: new Date(),
      };

      functions.logger.info("Apollo API: Organization enriched successfully", {
        name: organization.name || "Unknown",
        employees: organization.estimated_num_employees || "Unknown",
        founded: organization.founded_year || "Unknown",
        funding: formatFunding(organization.total_funding ?? null) || "Unknown",
        technologies: organization.technology_names?.length || 0,
        cost: "1 credit",
      });

      // If companyId provided, update Firestore
      if (data.companyId) {
        try {
          const db = admin.firestore();
          const companyRef = db.collection("entities").doc(data.companyId);

          // Prepare enrichment data
          const enrichmentData = {
            apolloEnrichment: {
              apolloId: organization.id || null,
              name: organization.name || null,
              website: organization.website_url || organization.primary_domain || null,
              employeeCount: organization.estimated_num_employees ?? null,
              employeeRange: getEmployeeRange(organization.estimated_num_employees ?? null),
              foundedYear: organization.founded_year || null,
              totalFunding: organization.total_funding ?? null,
              totalFundingFormatted: formatFunding(organization.total_funding ?? null),
              latestFundingStage: organization.latest_funding_stage || null,
              latestFundingDate: organization.latest_funding_round_date || null,
              industry: organization.industry || null,
              industries: organization.industries || [],
              secondaryIndustries: organization.secondary_industries || [],
              keywords: organization.keywords || [],
              technologies: organization.technology_names || [],
              description: organization.short_description || organization.seo_description || null,
              logoUrl: organization.logo_url || null,
              linkedinUrl: organization.linkedin_url || null,
              twitterUrl: organization.twitter_url || null,
              facebookUrl: organization.facebook_url || null,
              crunchbaseUrl: organization.crunchbase_url || null,
              angellistUrl: organization.angellist_url || null,
              blogUrl: organization.blog_url || null,
              phone: organization.primary_phone?.number || organization.sanitized_phone || organization.phone || null,
              address: {
                street: organization.street_address || null,
                city: organization.city || null,
                state: organization.state || null,
                postalCode: organization.postal_code || null,
                country: organization.country || null,
                raw: organization.raw_address || null,
              },
              publiclyTraded: organization.publicly_traded_symbol ? {
                symbol: organization.publicly_traded_symbol,
                exchange: organization.publicly_traded_exchange || null,
              } : null,
              lastEnrichedAt: new Date(),
              costInfo: {
                credits: 1,
                timestamp: new Date(),
              },
            },
            updatedAt: new Date(),
          };

          await companyRef.update(enrichmentData);

          functions.logger.info("Apollo API: Updated company record in Firestore", {
            companyId: data.companyId,
          });
        } catch (firestoreError) {
          functions.logger.error("Apollo API: Error updating Firestore", firestoreError);
          // Don't fail the whole request if Firestore update fails
        }
      }

      return {
        organization,
        enriched: true,
        costInfo,
      };
    } catch (error) {
      functions.logger.error("Apollo API: Error enriching organization", error);

      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<ApolloApiError>;

        // Handle rate limiting
        if (axiosError.response?.status === 429) {
          return {
            organization: null,
            enriched: false,
            error: "Rate limit exceeded. Please try again later.",
          };
        }

        // Handle authentication errors
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          return {
            organization: null,
            enriched: false,
            error: "Invalid Apollo API key. Please check your Firebase config.",
          };
        }

        // Handle not found
        if (axiosError.response?.status === 404) {
          return {
            organization: null,
            enriched: false,
            error: `Organization not found for domain: ${cleanDomain}`,
          };
        }

        // Handle other API errors
        const errorMessage =
          axiosError.response?.data?.error ||
          axiosError.response?.data?.message ||
          axiosError.message ||
          "Unknown error occurred";

        return {
          organization: null,
          enriched: false,
          error: `Apollo API error: ${errorMessage}`,
        };
      }

      // Handle non-Axios errors
      return {
        organization: null,
        enriched: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
);
