/**
 * Web search tool — wraps Firecrawl's /search endpoint so the model has a single
 * named tool for "discover URLs about a topic". Distinct from firecrawl_scrape so
 * the model knows whether it's searching vs fetching a known page.
 */
import {firecrawlSearch} from "./firecrawlTool";

export interface WebSearchArgs {
  query: string;
  limit?: number;
}

export async function webSearch(args: WebSearchArgs): Promise<{
  query: string;
  results: Array<{title?: string; url: string; description?: string}>;
  error?: string;
}> {
  const r = await firecrawlSearch({
    query: args.query,
    limit: Math.min(args.limit || 5, 10),
    scrapeContent: false,
  });
  return {
    query: r.query,
    results: r.results.map(({title, url, description}) => ({title, url, description})),
    error: r.error,
  };
}
