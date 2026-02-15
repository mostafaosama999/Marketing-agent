/**
 * browse_blog tool for the Blog Audit Agent
 *
 * Fetches a blog page via RSS or HTML scraping,
 * extracts recent posts, frequency, and topics.
 * Reuses patterns from blogQualifierService.ts.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import Parser from "rss-parser";
import {BrowseBlogResult} from "../types";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

const rssParser = new Parser({
  timeout: 10000,
  headers: {"User-Agent": USER_AGENT},
});

/**
 * Try to find and parse an RSS feed for a blog URL
 */
async function tryRssFeed(baseUrl: string): Promise<Parser.Output<any> | null> {
  const cleanBase = baseUrl.replace(/\/+$/, "");

  // Platform-specific patterns
  const platformPatterns: Record<string, (url: string) => string> = {
    "medium.com": (url) => url.replace("medium.com/", "medium.com/feed/"),
    "substack.com": (url) => url + "/feed",
    "ghost.io": (url) => url + "/rss",
    "wordpress.com": (url) => url + "/feed",
  };

  for (const [platform, patternFunc] of Object.entries(platformPatterns)) {
    if (cleanBase.toLowerCase().includes(platform)) {
      try {
        const feed = await rssParser.parseURL(patternFunc(cleanBase));
        if (feed.items?.length) return feed;
      } catch { /* continue */ }
    }
  }

  // Common RSS paths
  const paths = [
    "/feed", "/rss", "/blog/feed", "/blog/rss",
    "/rss.xml", "/feed.xml", "/atom.xml",
    "/blog/feed.xml", "/blog/rss.xml", "/index.xml",
  ];

  for (const path of paths) {
    try {
      const feed = await rssParser.parseURL(cleanBase + path);
      if (feed.items?.length) return feed;
    } catch { /* continue */ }
  }

  // Try finding RSS link in HTML
  try {
    const response = await axios.get(cleanBase, {
      timeout: 8000,
      headers: {"User-Agent": USER_AGENT},
    });
    const $ = cheerio.load(response.data);
    const rssLinks = $('link[type="application/rss+xml"], link[type="application/atom+xml"]');

    for (let i = 0; i < rssLinks.length; i++) {
      let href = $(rssLinks[i]).attr("href");
      if (!href) continue;

      if (href.startsWith("//")) href = "https:" + href;
      else if (href.startsWith("/")) {
        const parsed = new URL(cleanBase);
        href = `${parsed.protocol}//${parsed.host}${href}`;
      } else if (!href.startsWith("http")) {
        href = cleanBase + "/" + href;
      }

      try {
        const feed = await rssParser.parseURL(href);
        if (feed.items?.length) return feed;
      } catch { /* continue */ }
    }
  } catch { /* continue */ }

  return null;
}

/**
 * Scrape blog posts from HTML when RSS is not available
 */
async function scrapeBlogHtml(url: string): Promise<BrowseBlogResult> {
  const cleanUrl = url.replace(/\/+$/, "");

  // Try the URL itself, then common blog paths
  const urlsToTry = [
    cleanUrl,
    cleanUrl + "/blog",
    cleanUrl + "/blog/",
    cleanUrl + "/articles",
    cleanUrl + "/resources",
    cleanUrl + "/news",
  ];

  for (const tryUrl of urlsToTry) {
    try {
      const response = await axios.get(tryUrl, {
        timeout: 10000,
        headers: {"User-Agent": USER_AGENT},
      });

      const $ = cheerio.load(response.data);

      // Look for article/post elements (common patterns)
      const posts: BrowseBlogResult["posts"] = [];
      const selectors = [
        "article", ".post", ".blog-post", ".entry",
        '[class*="post"]', '[class*="article"]', '[class*="blog-item"]',
        ".card", ".content-item",
      ];

      for (const selector of selectors) {
        $(selector).each((_i: number, el: any) => {
          if (posts.length >= 15) return;

          const $el = $(el);
          // Find title - look for headings or links
          const title =
            $el.find("h1, h2, h3, h4").first().text().trim() ||
            $el.find("a").first().text().trim();

          if (!title || title.length < 5 || title.length > 300) return;

          // Find date
          const dateEl =
            $el.find("time").attr("datetime") ||
            $el.find('[class*="date"]').text().trim() ||
            $el.find("time").text().trim() ||
            "";

          // Find link
          const linkEl = $el.find("a").first().attr("href") || "";
          let postUrl = "";
          if (linkEl) {
            if (linkEl.startsWith("http")) postUrl = linkEl;
            else if (linkEl.startsWith("/")) {
              const parsed = new URL(tryUrl);
              postUrl = `${parsed.protocol}//${parsed.host}${linkEl}`;
            }
          }

          // Avoid duplicates
          if (!posts.some((p) => p.title === title)) {
            posts.push({
              title,
              date: dateEl,
              url: postUrl || undefined,
            });
          }
        });

        if (posts.length >= 5) break;
      }

      if (posts.length > 0) {
        return {
          success: true,
          blogUrl: tryUrl,
          posts,
          postsPerMonth: estimateFrequency(posts),
          totalPostsFound: posts.length,
          rssAvailable: false,
        };
      }
    } catch { /* try next URL */ }
  }

  return {
    success: false,
    blogUrl: url,
    posts: [],
    postsPerMonth: 0,
    totalPostsFound: 0,
    rssAvailable: false,
    error: "Could not find blog posts at this URL",
  };
}

/**
 * Estimate monthly posting frequency from a list of posts with dates
 */
function estimateFrequency(posts: Array<{date: string}>): number {
  const dates = posts
    .map((p) => {
      try {
        return new Date(p.date).getTime();
      } catch {
        return 0;
      }
    })
    .filter((d) => d > 0)
    .sort((a, b) => b - a);

  if (dates.length < 2) return posts.length > 0 ? 1 : 0;

  const newestMs = dates[0];
  const oldestMs = dates[dates.length - 1];
  const spanDays = (newestMs - oldestMs) / (1000 * 60 * 60 * 24);

  if (spanDays < 1) return dates.length;
  const months = Math.max(spanDays / 30, 1);
  return Math.round((dates.length / months) * 10) / 10;
}

/**
 * Main tool function: browse a blog URL and extract posts + metrics
 */
export async function browseBlog(url: string): Promise<BrowseBlogResult> {
  console.log(`[browseBlog] Analyzing: ${url}`);

  try {
    // Try RSS first (more reliable, structured data)
    const feed = await tryRssFeed(url);

    if (feed && feed.items && feed.items.length > 0) {
      const posts = feed.items.slice(0, 15).map((item) => ({
        title: item.title?.trim() || "Untitled",
        date: item.pubDate || item.isoDate || "",
        url: item.link || undefined,
        snippet: item.contentSnippet?.substring(0, 200) || undefined,
        author: item.creator || item.author || undefined,
      }));

      return {
        success: true,
        blogUrl: feed.link || url,
        posts,
        postsPerMonth: estimateFrequency(posts),
        totalPostsFound: feed.items.length,
        rssAvailable: true,
      };
    }

    // Fallback: scrape HTML
    return await scrapeBlogHtml(url);
  } catch (error: any) {
    console.error(`[browseBlog] Error for ${url}:`, error.message);
    return {
      success: false,
      blogUrl: url,
      posts: [],
      postsPerMonth: 0,
      totalPostsFound: 0,
      rssAvailable: false,
      error: error.message || "Failed to browse blog",
    };
  }
}

/**
 * OpenAI function definition for the browse_blog tool
 */
export const browseBlogToolDefinition = {
  type: "function" as const,
  function: {
    name: "browse_blog",
    description:
      "Fetch and analyze a company's blog. Extracts recent posts, posting frequency, " +
      "topics, and content types. Tries RSS feed first, falls back to HTML scraping. " +
      "Use this to analyze both the target company's blog and competitor blogs.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "The blog URL to analyze. Can be the company website (will try /blog) " +
            "or a direct blog URL.",
        },
      },
      required: ["url"],
    },
  },
};
