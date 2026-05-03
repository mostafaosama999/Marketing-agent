/**
 * Apify wrapper used as a fallback when Firecrawl runs out of monthly credit.
 * Uses the `apify/rag-web-browser` Actor for both search ("query" mode) and
 * scrape ("url" mode) — same Actor backs both shapes, so we only need one
 * APIFY_TOKEN to cover the failure modes of both Firecrawl endpoints.
 *
 * Reads APIFY_TOKEN from process.env (populated when the calling function's
 * `runWith` includes the secret). Returns gracefully if the secret is not
 * available rather than throwing — the caller (firecrawlTool) will surface
 * the original Firecrawl error in that case.
 */
import axios from "axios";

const APIFY_RAG_BROWSER_ACTOR = "apify~rag-web-browser";
const APIFY_RUN_SYNC_URL =
  `https://api.apify.com/v2/acts/${APIFY_RAG_BROWSER_ACTOR}/run-sync-get-dataset-items`;
const HTTP_TIMEOUT_MS = 90_000;

function apifyToken(): string | undefined {
  return process.env.APIFY_TOKEN || undefined;
}

export interface ApifySearchResultItem {
  title?: string;
  url: string;
  description?: string;
  markdown?: string;
}

export interface ApifySearchResult {
  query: string;
  results: ApifySearchResultItem[];
  error?: string;
}

/**
 * Search the web via the rag-web-browser Actor in "query" mode. Returns up to
 * `limit` results — title + url + brief description. Pulls full markdown when
 * `scrapeContent` is true (slower, more credit-heavy).
 */
export async function apifySearch(args: {
  query: string;
  limit?: number;
  scrapeContent?: boolean;
}): Promise<ApifySearchResult> {
  const token = apifyToken();
  if (!token) {
    return {query: args.query, results: [], error: "APIFY_TOKEN not configured"};
  }
  try {
    const limit = Math.min(Math.max(args.limit || 5, 1), 10);
    const res = await axios.post(
      APIFY_RUN_SYNC_URL,
      {
        query: args.query,
        maxResults: limit,
        outputFormats: args.scrapeContent ? ["markdown"] : [],
      },
      {
        params: {token},
        timeout: HTTP_TIMEOUT_MS,
        headers: {"Content-Type": "application/json"},
        validateStatus: (s) => s < 500,
      }
    );
    if (res.status >= 400) {
      return {
        query: args.query,
        results: [],
        error: `Apify HTTP ${res.status}: ${truncate(JSON.stringify(res.data))}`,
      };
    }
    const items = Array.isArray(res.data) ? res.data : [];
    const results: ApifySearchResultItem[] = items.slice(0, limit).map((item) => ({
      title: item?.metadata?.title || item?.title || undefined,
      url: item?.metadata?.url || item?.url || "",
      description: item?.metadata?.description || item?.description || undefined,
      markdown: args.scrapeContent ? item?.markdown : undefined,
    }));
    return {query: args.query, results: results.filter((r) => r.url)};
  } catch (e) {
    return {
      query: args.query,
      results: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export interface ApifyScrapeResult {
  url: string;
  markdown?: string;
  title?: string;
  error?: string;
}

/**
 * Scrape a single URL via rag-web-browser ("url" mode) — handles JS-rendered
 * pages, near-1:1 substitute for firecrawl_scrape.
 */
export async function apifyScrape(args: {url: string}): Promise<ApifyScrapeResult> {
  const token = apifyToken();
  if (!token) {
    return {url: args.url, error: "APIFY_TOKEN not configured"};
  }
  try {
    const res = await axios.post(
      APIFY_RUN_SYNC_URL,
      {
        startUrls: [{url: args.url}],
        outputFormats: ["markdown"],
        maxResults: 1,
      },
      {
        params: {token},
        timeout: HTTP_TIMEOUT_MS,
        headers: {"Content-Type": "application/json"},
        validateStatus: (s) => s < 500,
      }
    );
    if (res.status >= 400) {
      return {
        url: args.url,
        error: `Apify HTTP ${res.status}: ${truncate(JSON.stringify(res.data))}`,
      };
    }
    const items = Array.isArray(res.data) ? res.data : [];
    const item = items[0];
    if (!item) {
      return {url: args.url, error: "Apify returned empty dataset"};
    }
    return {
      url: args.url,
      markdown: item.markdown,
      title: item?.metadata?.title || item?.title,
    };
  } catch (e) {
    return {url: args.url, error: e instanceof Error ? e.message : String(e)};
  }
}

function truncate(s: string, max = 300): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
