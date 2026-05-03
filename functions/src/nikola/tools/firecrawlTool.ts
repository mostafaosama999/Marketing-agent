import axios from "axios";
import * as functions from "firebase-functions";
import {firecrawlApiKey} from "../config";
import {apifyScrape, apifySearch} from "./apifyTool";

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";
const HTTP_TIMEOUT_MS = 60_000;

/**
 * Detect Firecrawl monthly-credit / payment / quota errors so we can fall
 * back to Apify. Firecrawl returns multiple shapes when out of credit:
 *   - HTTP 402 Payment Required (axios throws)
 *   - HTTP 429 Rate Limited (axios throws)
 *   - HTTP 200 with body `{success: false, error: "Insufficient credits ..."}`
 *     (does NOT throw — this is the one we missed before)
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
    lower.includes("limit exceeded") ||
    lower.includes("upgrade your plan") ||
    lower.includes("subscription")
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

interface FirecrawlBody<T> {
  success?: boolean;
  data?: T;
  error?: string;
}

/**
 * Call Firecrawl. Doesn't throw on 4xx — returns a normalized
 * `{ok, body, errorMsg}` so the caller can distinguish quota-shaped failures
 * from genuine ok responses without juggling axios catch-blocks.
 */
async function callFirecrawl<T>(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<{ok: boolean; body?: FirecrawlBody<T>; errorMsg?: string}> {
  try {
    const res = await axios.post(`${FIRECRAWL_BASE}${endpoint}`, payload, {
      headers: {Authorization: `Bearer ${firecrawlApiKey()}`},
      timeout: HTTP_TIMEOUT_MS,
      // Don't throw on 4xx — body usually carries the failure reason.
      validateStatus: (s) => s < 500,
    });
    const body = res.data as FirecrawlBody<T> | undefined;
    if (res.status >= 400) {
      const msg = `${res.status} ${body?.error || JSON.stringify(body || {}).slice(0, 200)}`;
      return {ok: false, body, errorMsg: msg};
    }
    if (body && body.success === false) {
      return {ok: false, body, errorMsg: body.error || "firecrawl reported success=false"};
    }
    return {ok: true, body};
  } catch (e) {
    let msg: string;
    if (axios.isAxiosError(e)) {
      msg = `${e.response?.status || ""} ${e.response?.data?.error || e.message}`.trim();
    } else {
      msg = e instanceof Error ? e.message : String(e);
    }
    return {ok: false, errorMsg: msg};
  }
}

export async function firecrawlScrape(args: FirecrawlScrapeArgs): Promise<{
  url: string;
  markdown?: string;
  html?: string;
  title?: string;
  error?: string;
  fallbackUsed?: "apify";
}> {
  const r = await callFirecrawl<{markdown?: string; html?: string; metadata?: {title?: string}}>(
    "/scrape",
    {
      url: args.url,
      formats: args.formats || ["markdown"],
      onlyMainContent: args.onlyMainContent ?? true,
    }
  );
  if (r.ok) {
    const data = r.body?.data;
    return {
      url: args.url,
      markdown: data?.markdown,
      html: data?.html,
      title: data?.metadata?.title,
    };
  }
  // Quota-shaped failure → try Apify.
  if (isQuotaError(r.errorMsg)) {
    functions.logger.warn("firecrawlScrape quota error — falling back to Apify", {
      url: args.url,
      firecrawlError: r.errorMsg,
    });
    const apifyResult = await apifyScrape({url: args.url});
    if (apifyResult.markdown && !apifyResult.error) {
      functions.logger.info("Apify fallback scrape OK", {url: args.url});
      return {
        url: apifyResult.url,
        markdown: apifyResult.markdown,
        title: apifyResult.title,
        fallbackUsed: "apify",
      };
    }
    return {
      url: args.url,
      error:
        `BOTH SEARCH PROVIDERS FAILED. Firecrawl: ${r.errorMsg}. ` +
        `Apify-fallback: ${apifyResult.error || "no content returned"}. ` +
        `Top up Firecrawl credits at firecrawl.dev or Apify credits at apify.com to restore web scraping.`,
      fallbackUsed: "apify",
    };
  }
  return {url: args.url, error: r.errorMsg};
}

export async function firecrawlSearch(args: FirecrawlSearchArgs): Promise<{
  query: string;
  results: Array<{title?: string; url: string; description?: string; markdown?: string}>;
  error?: string;
  fallbackUsed?: "apify";
}> {
  const r = await callFirecrawl<Array<{title?: string; url: string; description?: string; markdown?: string}>>(
    "/search",
    {
      query: args.query,
      limit: args.limit || 5,
      scrapeOptions: args.scrapeContent
        ? {formats: ["markdown"], onlyMainContent: true}
        : undefined,
    }
  );
  if (r.ok) {
    const items = (r.body?.data || []) as Array<{
      title?: string;
      url: string;
      description?: string;
      markdown?: string;
    }>;
    return {query: args.query, results: items};
  }
  // Quota-shaped failure → try Apify.
  if (isQuotaError(r.errorMsg)) {
    functions.logger.warn("firecrawlSearch quota error — falling back to Apify", {
      query: args.query,
      firecrawlError: r.errorMsg,
    });
    const apifyResult = await apifySearch({
      query: args.query,
      limit: args.limit,
      scrapeContent: args.scrapeContent,
    });
    if (apifyResult.results.length > 0) {
      functions.logger.info("Apify fallback search OK", {
        query: args.query,
        resultCount: apifyResult.results.length,
      });
      return {
        query: apifyResult.query,
        results: apifyResult.results.map((rr) => ({
          title: rr.title,
          url: rr.url,
          description: rr.description,
          markdown: rr.markdown,
        })),
        fallbackUsed: "apify",
      };
    }
    return {
      query: args.query,
      results: [],
      error:
        `BOTH SEARCH PROVIDERS FAILED. Firecrawl: ${r.errorMsg}. ` +
        `Apify-fallback: ${apifyResult.error || "no results returned"}. ` +
        `Top up Firecrawl credits at firecrawl.dev or Apify credits at apify.com to restore web search.`,
      fallbackUsed: "apify",
    };
  }
  return {query: args.query, results: [], error: r.errorMsg};
}
