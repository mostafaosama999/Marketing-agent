import axios from "axios";
import * as functions from "firebase-functions";
import {firecrawlApiKey} from "../config";
import {apifyScrape, apifySearch} from "./apifyTool";

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";

/**
 * Detect Firecrawl monthly-credit / payment errors so we can fall back to
 * Apify. Firecrawl returns 402 Payment Required and includes phrases like
 * "credits", "limit", "payment" in the body; we also catch 429 since that
 * effectively blocks the same request stream.
 */
function isQuotaError(rawError: string | undefined): boolean {
  if (!rawError) return false;
  const lower = rawError.toLowerCase();
  return (
    lower.includes("402") ||
    lower.includes("429") ||
    lower.includes("payment required") ||
    lower.includes("insufficient credit") ||
    lower.includes("out of credit") ||
    lower.includes("monthly limit") ||
    lower.includes("quota") ||
    lower.includes("limit exceeded")
  );
}

export interface FirecrawlScrapeArgs {
  url: string;
  onlyMainContent?: boolean;
  formats?: Array<"markdown" | "html">;
}

export interface FirecrawlSearchArgs {
  query: string;
  limit?: number;
  scrapeContent?: boolean;
}

export async function firecrawlScrape(args: FirecrawlScrapeArgs): Promise<{
  url: string;
  markdown?: string;
  html?: string;
  title?: string;
  error?: string;
  fallbackUsed?: "apify";
}> {
  try {
    const res = await axios.post(
      `${FIRECRAWL_BASE}/scrape`,
      {
        url: args.url,
        formats: args.formats || ["markdown"],
        onlyMainContent: args.onlyMainContent ?? true,
      },
      {
        headers: {Authorization: `Bearer ${firecrawlApiKey()}`},
        timeout: 60_000,
      }
    );
    const data = res.data?.data;
    return {
      url: args.url,
      markdown: data?.markdown,
      html: data?.html,
      title: data?.metadata?.title,
    };
  } catch (e) {
    const rawError = extractError(e);
    if (isQuotaError(rawError)) {
      functions.logger.warn("firecrawlScrape quota error — falling back to Apify", {
        url: args.url,
        firecrawlError: rawError,
      });
      const apifyResult = await apifyScrape({url: args.url});
      if (apifyResult.markdown || !apifyResult.error) {
        return {
          url: apifyResult.url,
          markdown: apifyResult.markdown,
          title: apifyResult.title,
          fallbackUsed: "apify",
        };
      }
      return {
        url: args.url,
        error: `firecrawl: ${rawError}; apify-fallback: ${apifyResult.error}`,
        fallbackUsed: "apify",
      };
    }
    return {url: args.url, error: rawError};
  }
}

export async function firecrawlSearch(args: FirecrawlSearchArgs): Promise<{
  query: string;
  results: Array<{title?: string; url: string; description?: string; markdown?: string}>;
  error?: string;
  fallbackUsed?: "apify";
}> {
  try {
    const res = await axios.post(
      `${FIRECRAWL_BASE}/search`,
      {
        query: args.query,
        limit: args.limit || 5,
        scrapeOptions: args.scrapeContent
          ? {formats: ["markdown"], onlyMainContent: true}
          : undefined,
      },
      {
        headers: {Authorization: `Bearer ${firecrawlApiKey()}`},
        timeout: 60_000,
      }
    );
    const items = (res.data?.data || []) as Array<{
      title?: string;
      url: string;
      description?: string;
      markdown?: string;
    }>;
    return {query: args.query, results: items};
  } catch (e) {
    const rawError = extractError(e);
    if (isQuotaError(rawError)) {
      functions.logger.warn("firecrawlSearch quota error — falling back to Apify", {
        query: args.query,
        firecrawlError: rawError,
      });
      const apifyResult = await apifySearch({
        query: args.query,
        limit: args.limit,
        scrapeContent: args.scrapeContent,
      });
      if (apifyResult.results.length > 0) {
        return {
          query: apifyResult.query,
          results: apifyResult.results.map((r) => ({
            title: r.title,
            url: r.url,
            description: r.description,
            markdown: r.markdown,
          })),
          fallbackUsed: "apify",
        };
      }
      return {
        query: args.query,
        results: [],
        error: `firecrawl: ${rawError}; apify-fallback: ${apifyResult.error || "no results"}`,
        fallbackUsed: "apify",
      };
    }
    return {query: args.query, results: [], error: rawError};
  }
}

function extractError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    return `${e.response?.status || ""} ${e.response?.data?.error || e.message}`.trim();
  }
  return e instanceof Error ? e.message : String(e);
}
