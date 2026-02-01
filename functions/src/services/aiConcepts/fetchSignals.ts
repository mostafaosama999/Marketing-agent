/**
 * Signal Fetching Service
 *
 * Fetches raw AI signals from external sources:
 * - Hacker News Algolia API (free, 10k req/hour)
 * - arXiv API (free, no rate limit but be polite)
 * - RSS feeds (The Rundown AI, Import AI)
 */

import { RawSignal } from "./types";

// Constants
const HN_ALGOLIA_API = "https://hn.algolia.com/api/v1";
const ARXIV_API = "http://export.arxiv.org/api/query";
const RSS_FEEDS = {
  rundown: "https://rss.beehiiv.com/feeds/2R3C6Bt5wj.xml",
  importai: "https://importai.substack.com/feed",
};

/**
 * Fetch AI-related stories from Hacker News
 * Uses Algolia Search API which is fast and free
 */
export async function fetchHackerNewsSignals(
  query: string = 'AI OR LLM OR "machine learning" OR "artificial intelligence"',
  numResults: number = 20
): Promise<RawSignal[]> {
  try {
    // Search for recent AI stories with high engagement
    const url = `${HN_ALGOLIA_API}/search?query=${encodeURIComponent(query)}&tags=story&hitsPerPage=${numResults}&numericFilters=points>50`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HN API error: ${response.status}`);
    }

    const data = await response.json();

    const signals: RawSignal[] = data.hits.map((hit: any) => ({
      id: `hn_${hit.objectID}`,
      title: hit.title || "Untitled",
      summary: hit.story_text
        ? hit.story_text.substring(0, 300)
        : `Discussion on Hacker News with ${hit.points} points and ${hit.num_comments} comments.`,
      url: hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
      source: "hackernews" as const,
      publishedAt: new Date(hit.created_at),
      score: hit.points,
    }));

    console.log(`[fetchSignals] Fetched ${signals.length} HN signals`);
    return signals;
  } catch (error) {
    console.error("[fetchSignals] HN fetch error:", error);
    return [];
  }
}

/**
 * Fetch recent AI papers from arXiv
 * Categories: cs.AI, cs.CL (NLP), cs.LG (Machine Learning)
 */
export async function fetchArxivSignals(
  categories: string[] = ["cs.AI", "cs.CL", "cs.LG"],
  numResults: number = 15
): Promise<RawSignal[]> {
  try {
    // Build category query
    const categoryQuery = categories.map((c) => `cat:${c}`).join("+OR+");
    const url = `${ARXIV_API}?search_query=${categoryQuery}&sortBy=submittedDate&sortOrder=descending&max_results=${numResults}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`arXiv API error: ${response.status}`);
    }

    const xmlText = await response.text();

    // Parse XML response (simple regex-based parsing for Atom feed)
    const signals: RawSignal[] = [];
    const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    let match;

    while ((match = entryRegex.exec(xmlText)) !== null) {
      const entry = match[1];

      const idMatch = entry.match(/<id>(.*?)<\/id>/);
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
      const publishedMatch = entry.match(/<published>(.*?)<\/published>/);

      if (idMatch && titleMatch) {
        const arxivId = idMatch[1].split("/abs/")[1] || idMatch[1];
        signals.push({
          id: `arxiv_${arxivId}`,
          title: titleMatch[1].replace(/\s+/g, " ").trim(),
          summary: summaryMatch
            ? summaryMatch[1].replace(/\s+/g, " ").trim().substring(0, 300)
            : "",
          url: `https://arxiv.org/abs/${arxivId}`,
          source: "arxiv" as const,
          publishedAt: publishedMatch ? new Date(publishedMatch[1]) : new Date(),
        });
      }
    }

    console.log(`[fetchSignals] Fetched ${signals.length} arXiv signals`);
    return signals;
  } catch (error) {
    console.error("[fetchSignals] arXiv fetch error:", error);
    return [];
  }
}

/**
 * Fetch AI news from RSS feeds
 * Parses RSS/Atom feeds from AI newsletters
 */
export async function fetchRSSSignals(
  feedKeys: (keyof typeof RSS_FEEDS)[] = ["rundown", "importai"],
  numPerFeed: number = 10
): Promise<RawSignal[]> {
  const allSignals: RawSignal[] = [];

  for (const feedKey of feedKeys) {
    const feedUrl = RSS_FEEDS[feedKey];
    if (!feedUrl) continue;

    try {
      const response = await fetch(feedUrl);
      if (!response.ok) {
        console.error(`[fetchSignals] RSS fetch error for ${feedKey}: ${response.status}`);
        continue;
      }

      const xmlText = await response.text();

      // Parse RSS/Atom items
      const signals: RawSignal[] = [];

      // Try RSS format first (<item>)
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;

      while ((match = itemRegex.exec(xmlText)) !== null && signals.length < numPerFeed) {
        const item = match[1];

        const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
        const linkMatch = item.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/);
        const descMatch = item.match(
          /<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/
        );
        const pubDateMatch = item.match(/<pubDate>(.*?)<\/pubDate>/);
        const guidMatch = item.match(/<guid[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/guid>/);

        if (titleMatch) {
          const id = guidMatch?.[1] || linkMatch?.[1] || `${feedKey}_${Date.now()}_${signals.length}`;
          signals.push({
            id: `${feedKey}_${Buffer.from(id).toString("base64").substring(0, 20)}`,
            title: titleMatch[1].replace(/<[^>]*>/g, "").trim(),
            summary: descMatch
              ? descMatch[1]
                  .replace(/<[^>]*>/g, "")
                  .replace(/\s+/g, " ")
                  .trim()
                  .substring(0, 300)
              : "",
            url: linkMatch?.[1] || feedUrl,
            source: feedKey as "rundown" | "importai",
            publishedAt: pubDateMatch ? new Date(pubDateMatch[1]) : new Date(),
          });
        }
      }

      // If no items found, try Atom format (<entry>)
      if (signals.length === 0) {
        const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;

        while ((match = entryRegex.exec(xmlText)) !== null && signals.length < numPerFeed) {
          const entry = match[1];

          const titleMatch = entry.match(/<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/);
          const linkMatch = entry.match(/<link[^>]*href="([^"]*)"[^>]*>/);
          const contentMatch = entry.match(
            /<content[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/content>/
          );
          const summaryMatch = entry.match(
            /<summary[^>]*>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/summary>/
          );
          const publishedMatch = entry.match(/<published>(.*?)<\/published>/);
          const idMatch = entry.match(/<id>(.*?)<\/id>/);

          if (titleMatch) {
            const id = idMatch?.[1] || linkMatch?.[1] || `${feedKey}_${Date.now()}_${signals.length}`;
            const description = contentMatch?.[1] || summaryMatch?.[1] || "";

            signals.push({
              id: `${feedKey}_${Buffer.from(id).toString("base64").substring(0, 20)}`,
              title: titleMatch[1].replace(/<[^>]*>/g, "").trim(),
              summary: description
                .replace(/<[^>]*>/g, "")
                .replace(/\s+/g, " ")
                .trim()
                .substring(0, 300),
              url: linkMatch?.[1] || feedUrl,
              source: feedKey as "rundown" | "importai",
              publishedAt: publishedMatch ? new Date(publishedMatch[1]) : new Date(),
            });
          }
        }
      }

      allSignals.push(...signals);
      console.log(`[fetchSignals] Fetched ${signals.length} signals from ${feedKey}`);
    } catch (error) {
      console.error(`[fetchSignals] RSS fetch error for ${feedKey}:`, error);
    }
  }

  return allSignals;
}

/**
 * Fetch all signals from all sources
 */
export async function fetchAllSignals(): Promise<RawSignal[]> {
  console.log("[fetchSignals] Fetching signals from all sources...");

  const [hnSignals, arxivSignals, rssSignals] = await Promise.all([
    fetchHackerNewsSignals(),
    fetchArxivSignals(),
    fetchRSSSignals(),
  ]);

  const allSignals = [...hnSignals, ...arxivSignals, ...rssSignals];

  // Sort by date (newest first)
  allSignals.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());

  console.log(
    `[fetchSignals] Total signals fetched: ${allSignals.length} ` +
      `(HN: ${hnSignals.length}, arXiv: ${arxivSignals.length}, RSS: ${rssSignals.length})`
  );

  return allSignals;
}

/**
 * Deduplicate signals by title similarity
 */
export function deduplicateSignals(signals: RawSignal[]): RawSignal[] {
  const seen = new Set<string>();
  const deduped: RawSignal[] = [];

  for (const signal of signals) {
    // Create a normalized key from title
    const key = signal.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "")
      .substring(0, 50);

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(signal);
    }
  }

  console.log(`[fetchSignals] Deduplicated: ${signals.length} -> ${deduped.length} signals`);
  return deduped;
}
