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
 *
 * The rag-web-browser output shape is variable across modes/versions, so
 * markdown extraction tries several candidate field paths before giving up.
 * If everything fails, the raw response shape is logged once for diagnosis.
 */
import axios from "axios";
import * as functions from "firebase-functions";

const APIFY_RAG_BROWSER_ACTOR = "apify~rag-web-browser";
const APIFY_RUN_SYNC_URL =
  `https://api.apify.com/v2/acts/${APIFY_RAG_BROWSER_ACTOR}/run-sync-get-dataset-items`;
const HTTP_TIMEOUT_MS = 90_000;

function apifyToken(): string | undefined {
  return process.env.APIFY_TOKEN || undefined;
}

/**
 * The rag-web-browser Actor has shipped multiple output shapes. Markdown can
 * appear at item.markdown, item.text, item.text_content, item.body, or
 * nested under item.crawl.markdown. Walk the candidates in order.
 */
function extractMarkdown(item: Record<string, unknown> | undefined): string | undefined {
  if (!item) return undefined;
  const candidates = [
    item.markdown,
    item.text,
    item.text_content,
    item.textContent,
    item.body,
    (item.crawl as Record<string, unknown> | undefined)?.markdown,
    (item.crawl as Record<string, unknown> | undefined)?.text,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.length > 0) return c;
  }
  return undefined;
}

function extractTitle(item: Record<string, unknown> | undefined): string | undefined {
  if (!item) return undefined;
  const m = (item.metadata as Record<string, unknown> | undefined)?.title;
  if (typeof m === "string") return m;
  if (typeof item.title === "string") return item.title;
  return undefined;
}

function extractUrl(item: Record<string, unknown> | undefined): string {
  if (!item) return "";
  const m = (item.metadata as Record<string, unknown> | undefined)?.url;
  if (typeof m === "string") return m;
  if (typeof item.url === "string") return item.url;
  return "";
}

function extractDescription(item: Record<string, unknown> | undefined): string | undefined {
  if (!item) return undefined;
  const m = (item.metadata as Record<string, unknown> | undefined)?.description;
  if (typeof m === "string") return m;
  if (typeof item.description === "string") return item.description;
  return undefined;
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
 * `scrapeContent` is true (slower, more credit-heavy, but lets the caller
 * skip a follow-up scrape per result).
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
      title: extractTitle(item),
      url: extractUrl(item),
      description: extractDescription(item),
      markdown: args.scrapeContent ? extractMarkdown(item) : undefined,
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
 * Scrape a single URL via rag-web-browser. The Actor's URL-only mode requires
 * `startUrls` AND a non-empty `query` (the actor uses query as a relevance
 * filter even when given specific URLs — empty query has been observed to
 * yield empty datasets). We pass the URL itself as the query as a no-op
 * filter that still satisfies the validation.
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
        // rag-web-browser quirk: needs a query even with startUrls.
        query: args.url,
        startUrls: [{url: args.url}],
        outputFormats: ["markdown"],
        maxResults: 1,
        scrapingTool: "browser-playwright",
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
    const item = items[0] as Record<string, unknown> | undefined;
    if (!item) {
      // First-call diagnostic: log the empty-dataset shape so we can spot
      // input-format problems on subsequent runs.
      functions.logger.warn("apifyScrape: empty dataset", {
        url: args.url,
        responseShape: truncate(JSON.stringify(res.data), 500),
      });
      return {url: args.url, error: "Apify returned empty dataset"};
    }
    const markdown = extractMarkdown(item);
    if (!markdown) {
      // Item present but no recognizable markdown field. Log the keys so we
      // can adjust extractMarkdown if the Actor output shape changed.
      functions.logger.warn("apifyScrape: item has no markdown-shaped field", {
        url: args.url,
        itemKeys: Object.keys(item),
        sample: truncate(JSON.stringify(item), 500),
      });
      return {url: args.url, error: "Apify returned item without markdown content"};
    }
    return {
      url: args.url,
      markdown,
      title: extractTitle(item),
    };
  } catch (e) {
    return {url: args.url, error: e instanceof Error ? e.message : String(e)};
  }
}

function truncate(s: string, max = 300): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
