import axios from "axios";
import * as cheerio from "cheerio";
import {BlogAnalysis, BlogPost} from "../types";

/**
 * Discover blog URL from company website
 */
async function discoverBlogUrl(companyUrl: string): Promise<string | undefined> {
  try {
    const normalizedUrl = companyUrl.startsWith("http") ? companyUrl : `https://${companyUrl}`;
    const response = await axios.get(normalizedUrl, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(response.data);
    const baseUrl = new URL(normalizedUrl);

    // Common blog URL patterns
    const blogKeywords = [
      "blog", "news", "articles", "insights", "updates", "resources",
      "learn", "knowledge", "stories", "posts", "content",
    ];

    // Look for blog links in navigation and footer
    for (const keyword of blogKeywords) {
      const links = $(`a[href*="${keyword}"], a:contains("${keyword}")`);

      for (let i = 0; i < links.length; i++) {
        const link = $(links[i]);
        const href = link.attr("href");
        const text = link.text().toLowerCase();

        if (href && (text.includes(keyword) || href.includes(keyword))) {
          try {
            const blogUrl = new URL(href, baseUrl.origin).href;
            // Verify it's actually a blog by checking content
            if (await verifyBlogUrl(blogUrl)) {
              return blogUrl;
            }
          } catch {
            // Invalid URL, continue
          }
        }
      }
    }

    // Try common blog paths
    const commonPaths = ["/blog", "/news", "/articles", "/insights", "/blog/", "/news/"];
    for (const path of commonPaths) {
      try {
        const blogUrl = `${baseUrl.origin}${path}`;
        if (await verifyBlogUrl(blogUrl)) {
          return blogUrl;
        }
      } catch {
        // Continue to next path
      }
    }

    return undefined;
  } catch (error) {
    console.error("Blog discovery error:", error);
    return undefined;
  }
}

/**
 * Verify if URL is actually a blog by checking content
 */
async function verifyBlogUrl(url: string): Promise<boolean> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    // Look for blog indicators
    const blogIndicators = [
      "article", ".post", ".blog-post", ".entry",
      "time", ".date", ".published", ".author",
    ];

    for (const indicator of blogIndicators) {
      if ($(indicator).length > 0) {
        return true;
      }
    }

    // Check for blog-like content in text
    const text = $("body").text().toLowerCase();
    const blogTerms = ["posted", "published", "written by", "read more", "continue reading"];

    return blogTerms.some((term) => text.includes(term));
  } catch {
    return false;
  }
}

/**
 * Analyze blog content and extract posts
 */
async function analyzeBlog(blogUrl: string): Promise<BlogAnalysis> {
  try {
    const response = await axios.get(blogUrl, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    // Extract blog posts
    const recentPosts = extractBlogPosts($, blogUrl);

    // Extract themes from post titles and content
    const themes = extractBlogThemes(recentPosts, $);

    // Analyze posting frequency (simplified)
    const postingFrequency = analyzePostingFrequency(recentPosts);

    // Analyze content style (simplified)
    const contentStyle = analyzeContentStyle($);

    return {
      blogUrl,
      found: true,
      recentPosts: recentPosts.slice(0, 20), // Limit to 20 most recent
      themes: themes.slice(0, 10), // Limit to 10 themes
      contentStyle,
      postingFrequency,
    };
  } catch (error) {
    console.error("Blog analysis error:", error);
    return {
      found: false,
      recentPosts: [],
      themes: [],
    };
  }
}

/**
 * Extract blog posts from the page
 */
function extractBlogPosts($: cheerio.CheerioAPI, blogUrl: string): BlogPost[] {
  const posts: BlogPost[] = [];
  const baseUrl = new URL(blogUrl);

  // Common blog post selectors
  const postSelectors = [
    "article", ".post", ".blog-post", ".entry", ".article",
    ".content-item", ".post-item", ".blog-item",
  ];

  for (const selector of postSelectors) {
    const elements = $(selector);

    if (elements.length > 0) {
      elements.each((_, element) => {
        const post = extractSinglePost($(element), baseUrl);
        if (post && post.title) {
          posts.push(post);
        }
      });

      if (posts.length > 0) break; // Found posts with this selector
    }
  }

  // If no posts found with article selectors, try link-based extraction
  if (posts.length === 0) {
    $("a").each((_, element) => {
      const link = $(element);
      const href = link.attr("href");
      const title = link.text().trim();

      if (href && title && title.length > 10 && title.length < 200) {
        try {
          const url = new URL(href, baseUrl.origin).href;
          posts.push({
            title,
            url,
          });
        } catch {
          // Invalid URL
        }
      }
    });
  }

  return posts;
}

/**
 * Extract single blog post information
 */
function extractSinglePost($element: cheerio.Cheerio<any>, baseUrl: URL): BlogPost | null {
  // Extract title
  const titleSelectors = ["h1", "h2", "h3", ".title", ".post-title", "a"];
  let title = "";

  for (const selector of titleSelectors) {
    const titleEl = $element.find(selector).first();
    if (titleEl.length > 0) {
      title = titleEl.text().trim();
      if (title) break;
    }
  }

  if (!title) return null;

  // Extract URL
  let url = "";
  const linkEl = $element.find("a").first();
  if (linkEl.length > 0) {
    const href = linkEl.attr("href");
    if (href) {
      try {
        url = new URL(href, baseUrl.origin).href;
      } catch {
        // Invalid URL
      }
    }
  }

  // Extract date
  let publishedDate: Date | undefined;
  const dateSelectors = ["time", ".date", ".published", ".post-date"];

  for (const selector of dateSelectors) {
    const dateEl = $element.find(selector).first();
    if (dateEl.length > 0) {
      const dateText = dateEl.attr("datetime") || dateEl.text();
      const parsed = new Date(dateText);
      if (!isNaN(parsed.getTime())) {
        publishedDate = parsed;
        break;
      }
    }
  }

  // Extract summary
  const summary = $element.find(".excerpt, .summary, p").first().text().trim().substring(0, 300);

  return {
    title,
    url: url || "",
    publishedDate,
    summary: summary || undefined,
  };
}

/**
 * Extract themes from blog posts
 */
function extractBlogThemes(posts: BlogPost[], $: cheerio.CheerioAPI): string[] {
  const themes = new Set<string>();

  // Extract from post titles
  posts.forEach((post) => {
    const words = post.title.toLowerCase().split(/\s+/);
    words.forEach((word) => {
      if (word.length > 4 && !isCommonWord(word)) {
        themes.add(word);
      }
    });
  });

  // Extract from page content
  const text = $("body").text().toLowerCase();
  const technicalTerms = [
    "artificial intelligence", "machine learning", "api", "cloud", "saas",
    "analytics", "automation", "integration", "platform", "framework",
    "development", "technology", "innovation", "digital", "data",
  ];

  technicalTerms.forEach((term) => {
    if (text.includes(term)) {
      themes.add(term);
    }
  });

  return Array.from(themes);
}

/**
 * Check if word is a common word to filter out
 */
function isCommonWord(word: string): boolean {
  const commonWords = [
    "the", "and", "for", "are", "but", "not", "you", "all", "can", "had",
    "her", "was", "one", "our", "out", "day", "get", "has", "him", "his",
    "how", "its", "may", "new", "now", "old", "see", "two", "who", "boy",
    "did", "what", "with", "your", "from", "they", "have", "this", "that",
  ];

  return commonWords.includes(word);
}

/**
 * Analyze posting frequency
 */
function analyzePostingFrequency(posts: BlogPost[]): string {
  const datedPosts = posts.filter((post) => post.publishedDate);

  if (datedPosts.length < 2) {
    return "Irregular";
  }

  const sortedPosts = datedPosts.sort((a, b) =>
    (b.publishedDate?.getTime() || 0) - (a.publishedDate?.getTime() || 0)
  );

  // Calculate average days between posts
  let totalDays = 0;
  for (let i = 0; i < sortedPosts.length - 1; i++) {
    const diff = (sortedPosts[i].publishedDate?.getTime() || 0) -
                 (sortedPosts[i + 1].publishedDate?.getTime() || 0);
    totalDays += diff / (1000 * 60 * 60 * 24);
  }

  const avgDays = totalDays / (sortedPosts.length - 1);

  if (avgDays <= 3) return "Daily";
  if (avgDays <= 10) return "Weekly";
  if (avgDays <= 35) return "Monthly";
  return "Irregular";
}

/**
 * Analyze content style
 */
function analyzeContentStyle($: cheerio.CheerioAPI): string {
  const text = $("body").text().toLowerCase();

  if (text.includes("tutorial") || text.includes("how to") || text.includes("step by step")) {
    return "Educational/Tutorial";
  }

  if (text.includes("announcement") || text.includes("release") || text.includes("update")) {
    return "News/Announcements";
  }

  if (text.includes("opinion") || text.includes("think") || text.includes("believe")) {
    return "Opinion/Thought Leadership";
  }

  return "Mixed Content";
}

/**
 * Discover and analyze company blog
 */
export async function analyzeBlogFromCompany(companyUrl: string, blogUrl?: string): Promise<BlogAnalysis> {
  console.log(`Discovering blog for: ${companyUrl}`);

  let discoveredBlogUrl = blogUrl;

  // If no blog URL provided, try to discover it
  if (!discoveredBlogUrl) {
    discoveredBlogUrl = await discoverBlogUrl(companyUrl);
  }

  let blogAnalysis: BlogAnalysis;

  if (discoveredBlogUrl) {
    // Analyze the blog
    blogAnalysis = await analyzeBlog(discoveredBlogUrl);
  } else {
    // No blog found
    blogAnalysis = {
      found: false,
      recentPosts: [],
      themes: [],
    };
  }

  return blogAnalysis;
}