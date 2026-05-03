import axios from "axios";
import {firecrawlApiKey} from "../config";

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";

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
    return {url: args.url, error: extractError(e)};
  }
}

export async function firecrawlSearch(args: FirecrawlSearchArgs): Promise<{
  query: string;
  results: Array<{title?: string; url: string; description?: string; markdown?: string}>;
  error?: string;
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
    return {query: args.query, results: [], error: extractError(e)};
  }
}

function extractError(e: unknown): string {
  if (axios.isAxiosError(e)) {
    return `${e.response?.status || ""} ${e.response?.data?.error || e.message}`.trim();
  }
  return e instanceof Error ? e.message : String(e);
}
