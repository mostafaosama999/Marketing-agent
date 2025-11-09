import axios from "axios";
import * as cheerio from "cheerio";
import Parser from "rss-parser";
import OpenAI from "openai";
import {
  BlogQualificationResult,
  CompanyInput,
  RSSFeedPost,
  AIBlogAnalysis,
} from "../types";
import {extractTokenUsage, calculateCost, CostInfo} from "./costTracker";

const rssParser = new Parser({
  timeout: 10000,
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
});

/**
 * Scrape website content
 */
async function scrapeWebsite(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    // Remove script and style elements
    $("script, style").remove();

    const text = $("body").text();
    const lines = text.split("\n").map((line) => line.trim());
    const chunks = lines.flatMap((line) => line.split("  "));
    const cleanText = chunks.filter((chunk) => chunk).join(" ");

    return cleanText.substring(0, 10000); // Limit to 10k chars
  } catch (error) {
    console.error(`Scraping error for ${url}:`, error);
    return "";
  }
}

/**
 * Find RSS feed URL for a website
 */
async function findRssFeed(website: string): Promise<string | null> {
  const baseUrl = website.replace(/\/+$/, "");  // Remove all trailing slashes

  // Platform-specific RSS patterns
  const platformPatterns: Record<string, (url: string) => string> = {
    "medium.com": (url) => url.replace("medium.com/", "medium.com/feed/"),
    "tumblr.com": (url) => url + "/rss",
    "blogspot.com": (url) => url + "/feeds/posts/default",
    "blogger.com": (url) => url + "/feeds/posts/default",
    "wordpress.com": (url) => url + "/feed",
    "substack.com": (url) => url + "/feed",
    "ghost.io": (url) => url + "/rss",
  };

  // Check if it's a known platform
  for (const [platform, patternFunc] of Object.entries(platformPatterns)) {
    if (baseUrl.toLowerCase().includes(platform)) {
      try {
        const rssUrl = patternFunc(baseUrl);
        const feed = await rssParser.parseURL(rssUrl);
        if (feed.items && feed.items.length > 0) {
          console.log(`Found RSS feed (platform-specific): ${rssUrl}`);
          return rssUrl;
        }
      } catch {
        // Continue to next pattern
      }
    }
  }

  // Common RSS feed paths
  const commonPaths = [
    "/feed",
    "/feed/",
    "/rss",
    "/rss/",
    "/blog/feed",
    "/blog/rss",
    "/blog/feed/",
    "/blog/rss/",
    "/feeds/posts/default",
    "/rss.xml",
    "/feed.xml",
    "/atom.xml",
    "/blog/feed.xml",
    "/blog/rss.xml",
    "/index.xml",
    "/blog/index.xml",
    "/posts/index.xml",
    "/feed/atom",
    "/feed/rss",
    "/blogs/feed",
    "/blogs/rss",
    "/news/feed",
    "/articles/feed",
    "/posts/feed",
  ];

  // Try common paths
  for (const path of commonPaths) {
    const rssUrl = baseUrl + path;
    try {
      const response = await axios.head(rssUrl, {
        timeout: 5000,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; RSS Feed Finder/1.0)",
        },
      });

      if (response.status === 200) {
        try {
          const feed = await rssParser.parseURL(rssUrl);
          if (feed.items && feed.items.length > 0) {
            console.log(`Found RSS feed: ${rssUrl}`);
            return rssUrl;
          }
        } catch {
          // Continue to next path
        }
      }
    } catch {
      // Continue to next path
    }
  }

  // Try to find RSS link in HTML
  try {
    const response = await axios.get(website, {
      timeout: 10000,
      headers: {
        "User-Agent": "Mozilla/5.0",
      },
    });

    const $ = cheerio.load(response.data);

    // Look for RSS link tags
    const rssLinks = $('link[type="application/rss+xml"], link[type="application/atom+xml"]');

    for (let i = 0; i < rssLinks.length; i++) {
      const link = $(rssLinks[i]);
      let href = link.attr("href");

      if (href) {
        // Handle different URL formats
        if (href.startsWith("http")) {
          // Already absolute
        } else if (href.startsWith("//")) {
          href = "https:" + href;
        } else if (href.startsWith("/")) {
          const parsedUrl = new URL(website);
          href = `${parsedUrl.protocol}//${parsedUrl.host}${href}`;
        } else {
          href = baseUrl + "/" + href;
        }

        try {
          const feed = await rssParser.parseURL(href);
          if (feed.items && feed.items.length > 0) {
            console.log(`Found RSS feed in HTML: ${href}`);
            return href;
          }
        } catch {
          // Continue to next link
        }
      }
    }

    // Look for blog page first, then check for RSS there
    const blogPages = ["/blog", "/blog/", "/blogs", "/blogs/", "/news", "/articles", "/resources", "/insights", "/posts"];

    for (const blogPath of blogPages) {
      try {
        const blogUrl = baseUrl + blogPath;
        const blogResponse = await axios.get(blogUrl, {
          timeout: 5000,
          headers: {"User-Agent": "Mozilla/5.0"},
        });

        if (blogResponse.status === 200) {
          const blogSoup = cheerio.load(blogResponse.data);

          // Look for RSS links on blog page
          const blogRssLinks = blogSoup('link[type="application/rss+xml"], link[type="application/atom+xml"]');

          for (let i = 0; i < blogRssLinks.length; i++) {
            const link = blogSoup(blogRssLinks[i]);
            let href = link.attr("href");

            if (href) {
              if (href.startsWith("http")) {
                // Already absolute
              } else if (href.startsWith("//")) {
                href = "https:" + href;
              } else if (href.startsWith("/")) {
                const parsedUrl = new URL(website);
                href = `${parsedUrl.protocol}//${parsedUrl.host}${href}`;
              } else {
                href = baseUrl + "/" + href;
              }

              try {
                const feed = await rssParser.parseURL(href);
                if (feed.items && feed.items.length > 0) {
                  console.log(`Found RSS feed on blog page: ${href}`);
                  return href;
                }
              } catch {
                // Continue
              }
            }
          }

          // Try standard paths from blog URL
          for (const feedSuffix of ["/feed", "/rss", "/feed/", "/index.xml", "/rss.xml"]) {
            try {
              const rssUrl = blogUrl.replace(/\/$/, "") + feedSuffix;
              const feed = await rssParser.parseURL(rssUrl);
              if (feed.items && feed.items.length > 0) {
                console.log(`Found RSS feed: ${rssUrl}`);
                return rssUrl;
              }
            } catch {
              // Continue
            }
          }
        }
      } catch {
        // Continue to next blog path
      }
    }
  } catch (error) {
    console.error("Error searching for RSS in HTML:", error);
  }

  console.log("No RSS feed found");
  return null;
}

/**
 * Parse entry date from RSS feed
 */
function parseEntryDate(item: any): Date | null {
  const dateFields = ["pubDate", "isoDate", "date"];

  for (const field of dateFields) {
    if (item[field]) {
      try {
        const date = new Date(item[field]);
        if (!isNaN(date.getTime())) {
          return date;
        }
      } catch {
        // Continue to next field
      }
    }
  }

  return null;
}

/**
 * Detect programming language from code snippet or class names
 */
function detectLanguageFromCode(codeText: string, className?: string): string | null {
  // Check class names first (most reliable)
  if (className) {
    const langMatch = className.match(/language-(\w+)|lang-(\w+)|highlight-(\w+)|brush:\s*(\w+)/i);
    if (langMatch) {
      const lang = (langMatch[1] || langMatch[2] || langMatch[3] || langMatch[4]).toLowerCase();
      // Normalize common language names
      const langMap: Record<string, string> = {
        js: "JavaScript",
        javascript: "JavaScript",
        ts: "TypeScript",
        typescript: "TypeScript",
        py: "Python",
        python: "Python",
        go: "Go",
        golang: "Go",
        java: "Java",
        rb: "Ruby",
        ruby: "Ruby",
        php: "PHP",
        cpp: "C++",
        c: "C",
        cs: "C#",
        csharp: "C#",
        rust: "Rust",
        swift: "Swift",
        kotlin: "Kotlin",
        sql: "SQL",
        bash: "Bash",
        shell: "Bash",
        yaml: "YAML",
        json: "JSON",
        xml: "XML",
        html: "HTML",
        css: "CSS",
      };
      return langMap[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
    }
  }

  // Heuristic detection based on code patterns
  const code = codeText.toLowerCase().trim();
  if (code.includes("import ") && code.includes("from ") || code.includes("def ") || code.includes("print(")) return "Python";
  if (code.includes("const ") || code.includes("let ") || code.includes("function ") || code.includes("=>")) return "JavaScript";
  if (code.includes("interface ") || code.includes(": string") || code.includes(": number")) return "TypeScript";
  if (code.includes("func ") || code.includes("package main") || code.includes(":=")) return "Go";
  if (code.includes("public class ") || code.includes("public static void")) return "Java";
  if (code.includes("<?php") || code.includes("$") && code.includes("->")) return "PHP";
  if (code.includes("SELECT ") || code.includes("FROM ") || code.includes("WHERE ")) return "SQL";

  return null;
}

/**
 * Fetch and extract content from a blog post URL
 * Returns cleaned text content with metadata about code blocks and structure
 */
async function fetchBlogPostContent(
  postUrl: string
): Promise<{
  content: string;
  hasCode: boolean;
  codeBlockCount: number;
  codeLanguages: string[];
  codeSamples: string[];
  hasDiagrams: boolean;
  imageCount: number;
  headingCount: number;
} | null> {
  try {
    const response = await axios.get(postUrl, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    if (response.status !== 200) {
      return null;
    }

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $("script, style, nav, header, footer, aside, .advertisement, .ad, .social-share").remove();

    // Extract code blocks with language detection
    const codeBlocks = $("pre, code, .highlight, .code-block, [class*='code']");
    const detectedLanguages = new Set<string>();
    const codeSamples: string[] = [];
    let substantialCodeCount = 0;

    codeBlocks.each((_, elem) => {
      const codeText = $(elem).text().trim();
      const className = $(elem).attr("class") || "";

      // Only count blocks with >3 lines of code
      const lines = codeText.split("\n").filter(line => line.trim().length > 0);
      if (lines.length > 3) {
        substantialCodeCount++;
        codeSamples.push(codeText.substring(0, 200)); // First 200 chars

        const lang = detectLanguageFromCode(codeText, className);
        if (lang) {
          detectedLanguages.add(lang);
        }
      }
    });

    const codeBlockCount = substantialCodeCount;
    const hasCode = codeBlockCount > 0;
    const codeLanguages = Array.from(detectedLanguages);

    // Count images (potential diagrams)
    const images = $("img, svg, [class*='diagram'], [class*='chart']");
    const imageCount = images.length;
    const hasDiagrams = imageCount > 2; // More than 2 images suggests diagrams

    // Count headings (indicates structure)
    const headings = $("h1, h2, h3, h4, h5, h6");
    const headingCount = headings.length;

    // Extract main content (try common article selectors)
    let contentElement = $("article").first();
    if (contentElement.length === 0) {
      contentElement = $("[class*='post-content'], [class*='article-content'], [class*='entry-content'], main").first();
    }
    if (contentElement.length === 0) {
      contentElement = $("body");
    }

    // Get text content
    const text = contentElement.text();
    const lines = text.split("\n").map((line) => line.trim());
    const cleanText = lines.filter((line) => line.length > 0).join(" ");

    // Limit to 5000 characters per post (increased for better analysis)
    const content = cleanText.substring(0, 5000);

    return {
      content,
      hasCode,
      codeBlockCount,
      codeLanguages,
      codeSamples,
      hasDiagrams,
      imageCount,
      headingCount,
    };
  } catch (error) {
    console.error(`Error fetching blog post ${postUrl}:`, error);
    return null;
  }
}

/**
 * Check blog activity using RSS feed
 */
async function checkBlogActivity(
  website: string
): Promise<{
  hasActiveBlog: boolean;
  postCount: number;
  recentPosts: RSSFeedPost[];
  rssUrl: string | null;
  lastPostDate: string | null;
} | null> {
  console.log("Searching for RSS feed...");
  const rssUrl = await findRssFeed(website);

  if (!rssUrl) {
    console.log("No RSS feed found - will try AI fallback");
    return null;
  }

  try {
    const feed = await rssParser.parseURL(rssUrl);

    if (!feed.items || feed.items.length === 0) {
      console.log("RSS feed found but no entries - will try AI fallback");
      return null;
    }

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    const allPostsWithDates: RSSFeedPost[] = [];
    const recentPosts: RSSFeedPost[] = [];

    for (const item of feed.items) {
      const postDate = parseEntryDate(item);

      if (postDate) {
        const author = item.creator || item.author || "Unknown";

        const post: RSSFeedPost = {
          title: item.title || "Untitled",
          date: postDate,
          author,
          link: item.link || "",
        };

        allPostsWithDates.push(post);

        if (postDate > cutoffDate) {
          recentPosts.push(post);
        }
      }
    }

    // Find the most recent post date
    let lastPostDate: string | null = null;
    if (allPostsWithDates.length > 0) {
      allPostsWithDates.sort((a, b) => b.date.getTime() - a.date.getTime());
      lastPostDate = allPostsWithDates[0].date.toISOString().split("T")[0];
    }

    const postCount = recentPosts.length;
    const hasActiveBlog = postCount >= 1;

    console.log(
      `${hasActiveBlog ? "✅" : "❌"} Active blog: ${hasActiveBlog} (${postCount} posts in last 30 days)`
    );
    if (lastPostDate) {
      console.log(`   Last post: ${lastPostDate}`);
    }

    return {
      hasActiveBlog,
      postCount,
      recentPosts,
      rssUrl,
      lastPostDate,
    };
  } catch (error) {
    console.error(`RSS parsing error: ${error} - will try AI fallback`);
    return null;
  }
}

/**
 * Check for multiple authors
 */
function checkMultipleAuthors(
  recentPosts: RSSFeedPost[]
): {
  hasMultiple: boolean;
  authorCount: number;
  authorList: string[];
} {
  if (!recentPosts || recentPosts.length === 0) {
    return {hasMultiple: false, authorCount: 0, authorList: []};
  }

  const authors = new Set<string>();
  for (const post of recentPosts) {
    const author = post.author.trim();
    if (author && author.toLowerCase() !== "unknown" && author.toLowerCase() !== "admin" && author.toLowerCase() !== "administrator" && author !== "") {
      authors.add(author);
    }
  }

  const authorCount = authors.size;
  const authorList = Array.from(authors);
  const hasMultiple = authorCount >= 2;

  const authorsStr = authorList.slice(0, 10).join(", ") || "None";
  console.log(
    `${hasMultiple ? "✅" : "❌"} Multiple authors: ${hasMultiple} (${authorCount} unique authors)`
  );
  if (authorList.length > 0) {
    console.log(`   Authors: ${authorsStr}`);
  }

  return {hasMultiple, authorCount, authorList};
}

/**
 * Analyze blog with AI - optionally with actual blog post content
 */
async function analyzeBlogWithAI(
  website: string,
  openaiApiKey: string,
  postUrls?: string[]
): Promise<{
  aiActive: boolean;
  aiPosts: number;
  aiMultiAuth: boolean;
  aiAuthCount: number;
  aiAuthors: string;
  blogUrl: string | null;
  aiLastPost: string | null;
  isDevSaas: boolean;
  authEmployees: "employees" | "freelancers" | "mixed" | "unknown";
  coversAi: boolean;
  contentSumm: string;
  contentQualityRating: "low" | "medium" | "high" | null;
  contentQualityReasoning: string;
  isAIWritten: boolean;
  aiWrittenConfidence: "low" | "medium" | "high";
  aiWrittenEvidence: string;
  hasCodeExamples: boolean;
  codeExamplesCount: number;
  codeLanguages: string[];
  hasDiagrams: boolean;
  diagramsCount: number;
  technicalDepth: "beginner" | "intermediate" | "advanced";
  funnelStage: "top" | "middle" | "bottom";
  exampleQuotes: string[];
  costInfo: CostInfo | null;
}> {
  console.log(postUrls ? `Analyzing ${postUrls.length} blog posts with AI...` : "RSS not found, trying AI analysis of blog page...");

  // If blog post URLs provided, fetch their content
  let blogPostsContent: Array<{url: string; content: string; metadata: any}> = [];
  let totalCodeBlocks = 0;
  let totalDiagrams = 0;
  const allDetectedLanguages = new Set<string>();

  if (postUrls && postUrls.length > 0) {
    console.log(`Fetching content from ${postUrls.length} blog posts...`);
    const fetchPromises = postUrls.slice(0, 5).map(async (url) => {
      const postData = await fetchBlogPostContent(url);
      if (postData) {
        totalCodeBlocks += postData.codeBlockCount;
        totalDiagrams += postData.imageCount;
        postData.codeLanguages.forEach(lang => allDetectedLanguages.add(lang));
        return {url, content: postData.content, metadata: postData};
      }
      return null;
    });

    const results = await Promise.all(fetchPromises);
    blogPostsContent = results.filter((r): r is NonNullable<typeof r> => r !== null);
    console.log(`Successfully fetched ${blogPostsContent.length} blog posts`);
    console.log(`Total code blocks found: ${totalCodeBlocks}`);
    console.log(`Total images found: ${totalDiagrams}`);
    if (allDetectedLanguages.size > 0) {
      console.log(`Languages detected: ${Array.from(allDetectedLanguages).join(", ")}`);
    }
  }

  // Try to find blog page (for general analysis if no post URLs provided)
  const baseUrl = website.replace(/\/+$/, "");  // Remove all trailing slashes
  const blogPages = ["/blog", "/blogs", "/news", "/articles", "/resources", "/insights", "/posts", ""];

  let blogContent: string | null = null;
  let blogUrl: string | null = null;

  // Only scrape blog index if we don't have post content
  if (blogPostsContent.length === 0) {
    for (const blogPath of blogPages) {
      try {
        const testUrl = blogPath ? baseUrl + blogPath : baseUrl;
        const response = await axios.get(testUrl, {
          timeout: 10000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (response.status === 200) {
          blogContent = await scrapeWebsite(testUrl);
          if (blogContent && blogContent.length > 200) {
            blogUrl = testUrl;
            console.log(`Found blog page: ${blogUrl}`);
            break;
          }
        }
      } catch {
        // Continue to next path
      }
    }

    if (!blogContent) {
      console.log("Could not find or scrape blog page");
      return {
        aiActive: false,
        aiPosts: 0,
        aiMultiAuth: false,
        aiAuthCount: 0,
        aiAuthors: "",
        blogUrl: null,
        aiLastPost: null,
        isDevSaas: false,
        authEmployees: "unknown",
        coversAi: false,
        contentSumm: "",
        contentQualityRating: null,
        contentQualityReasoning: "",
        isAIWritten: false,
        aiWrittenConfidence: "low",
        aiWrittenEvidence: "",
        hasCodeExamples: false,
        codeExamplesCount: 0,
        codeLanguages: [],
        hasDiagrams: false,
        diagramsCount: 0,
        technicalDepth: "beginner",
        funnelStage: "top",
        exampleQuotes: [],
        costInfo: null,
      };
    }
  }

  // Call OpenAI
  const openai = new OpenAI({apiKey: openaiApiKey});

  // Build comprehensive prompt with blog post content if available
  let contentSection = "";
  if (blogPostsContent.length > 0) {
    contentSection = `\n${"=".repeat(60)}\nRECENT BLOG POSTS (${blogPostsContent.length} posts analyzed):\n${"=".repeat(60)}\n\n`;
    blogPostsContent.forEach((post, i) => {
      contentSection += `[POST ${i + 1}] ${post.url}\n`;
      contentSection += `Content: ${post.content}\n`;
      contentSection += `Metadata: ${post.metadata.codeBlockCount} code blocks, ${post.metadata.imageCount} images, ${post.metadata.headingCount} headings\n`;
      contentSection += `Has code: ${post.metadata.hasCode ? "YES" : "NO"}\n`;
      if (post.metadata.codeLanguages && post.metadata.codeLanguages.length > 0) {
        contentSection += `Languages detected: ${post.metadata.codeLanguages.join(", ")}\n`;
      }
      if (post.metadata.codeSamples && post.metadata.codeSamples.length > 0) {
        contentSection += `Code sample preview: ${post.metadata.codeSamples[0].substring(0, 100)}...\n`;
      }
      contentSection += `${"-".repeat(60)}\n\n`;
    });
  } else if (blogContent) {
    contentSection = `\nBlog URL: ${blogUrl}\nContent (first 12000 chars):\n${blogContent.substring(0, 12000)}\n`;
  }

  const prompt = `You are an expert content analyst evaluating B2B SaaS blog quality for partnership opportunities.

COMPANY: ${website}
ANALYSIS TYPE: ${blogPostsContent.length > 0 ? `Detailed analysis of ${blogPostsContent.length} actual blog posts` : "Blog index page analysis"}
${blogPostsContent.length > 0 ? `DETECTED: ${totalCodeBlocks} total code blocks, ${totalDiagrams} total images/diagrams` : ""}
${contentSection}

⚠️ CRITICAL REQUIREMENTS ⚠️
1. NEVER return empty strings ("") for reasoning/evidence/summary fields
2. ALL reasoning fields MUST be at least 100 characters long with SPECIFIC examples
3. If you cannot determine something, say "Unable to determine" with explanation - NOT empty string
4. Quote actual phrases from the content to support your analysis
5. Be HARSH but FAIR in your ratings - don't inflate scores

YOUR TASK:
Perform a rigorous content quality analysis. We need to distinguish between:
- HIGH-quality: Deep technical content that experienced developers value
- LOW-quality: Generic marketing fluff or AI-generated surface-level content

ANALYSIS CRITERIA:

1. TECHNICAL DEPTH
   - Are there code examples? (actual implementations, not just snippets)
   - What technical concepts are covered? (algorithms, architecture, protocols?)
   - Does it explain HOW things work internally, not just WHAT they are?
   - Target audience: beginners vs. experienced developers?
   - Product internals and implementation details shown?

2. AI-GENERATED CONTENT DETECTION (Be thorough - this is critical!)
   🚨 STRONG AI-writing indicators (if 3+ present, likely AI-written):
   - Generic intros: "In today's fast-paced world", "In the ever-evolving landscape", "In recent years"
   - Repetitive sentence structures: Every paragraph starts same way
   - Overly polished without personality: No humor, no opinions, no "I" or "we"
   - Lack of specifics: No real metrics, dates, company names, or concrete examples
   - Surface-level only: Explains WHAT but never HOW or WHY at technical level
   - Listicles without depth: "5 ways to...", "10 tips for..." with 2-3 sentences each
   - Generic conclusions: "In conclusion...", "As we've seen...", restate intro without adding value
   - Buzzword density: Every sentence has "innovative", "seamless", "cutting-edge", "robust"
   - No code examples despite technical topic
   - No controversy or strong opinions (AI plays it safe)

   🎯 Human-written indicators:
   - Specific war stories: "When we tried X at Company Y, Z happened"
   - Strong opinions: "X is terrible because...", "Everyone says Y but they're wrong"
   - Actual code with comments explaining decisions
   - Real metrics/data: "We reduced latency from 500ms to 50ms"
   - Personality/humor: Jokes, sarcasm, colloquialisms
   - Multiple authors with different writing styles

3. CONTENT TYPE & FUNNEL STAGE
   - Top-of-funnel: "What is X?" content, generic tutorials, listicles
   - Middle-funnel: Use cases, comparisons, best practices with some depth
   - Bottom-funnel: Deep dives, architecture, product internals, advanced concepts

4. CODE & DIAGRAMS
   - Count actual code blocks with real implementations
   - What languages/frameworks? (Python, Go, JavaScript, etc.)
   - Are there system diagrams, architecture diagrams, data flows?
   - Technical illustrations showing how things work?

5. EVIDENCE & EXAMPLES
   - Quote specific passages that demonstrate quality (or lack of it)
   - Identify real technical topics mentioned
   - Note any AI-writing red flags found

RESPONSE FORMAT (JSON ONLY - MUST be valid JSON):
{
  "activeBlog": boolean,
  "postCount": number,
  "multipleAuthors": boolean,
  "authorCount": number,
  "authors": ["Name 1", "Name 2"],
  "lastPostDate": "YYYY-MM-DD" or null,
  "isDeveloperB2BSaas": boolean,
  "authorsAreEmployees": "employees"|"freelancers"|"mixed"|"unknown",
  "coversAiTopics": boolean,
  "contentSummary": "REQUIRED: Bullet list of 3-5 main topics covered. Min 50 chars. Use • Topic format.",

  "contentQualityRating": "low"|"medium"|"high" (REQUIRED - pick one),
  "contentQualityReasoning": "REQUIRED: Min 150 chars. Must include: (1) Specific topics mentioned (2) Code languages if any (3) Quoted phrases showing quality level (4) Why you chose this rating. Example: 'Posts cover data ingestion architecture with Python examples. Quote: \"We implemented CDC using Debezium...\" Shows intermediate depth but lacks advanced system design.'",

  "isAIWritten": boolean (REQUIRED),
  "aiWrittenConfidence": "low"|"medium"|"high" (REQUIRED),
  "aiWrittenEvidence": "REQUIRED: Min 100 chars. If AI: List specific patterns found with quotes. If human: Explain why (specific examples, personality, real data). Example: 'Generic intro detected: \"In today\\'s digital landscape\". No specific metrics or war stories. Repetitive structure across posts.' OR 'Human indicators: Real metrics (\"500ms → 50ms\"), specific company examples (Stripe, AWS), author personality.'",

  "hasCodeExamples": boolean,
  "codeExamplesCount": number (count actual code blocks with >3 lines),
  "codeLanguages": ["Python", "JavaScript", "Go"] (extract from code blocks, empty [] if none),

  "hasDiagrams": boolean,
  "diagramsCount": number,

  "technicalDepth": "beginner"|"intermediate"|"advanced" (REQUIRED),
  "funnelStage": "top"|"middle"|"bottom" (REQUIRED),

  "exampleQuotes": ["Quote 1 showing quality/issues", "Quote 2", "Quote 3"] (REQUIRED: Provide 2-3 actual quotes from content)
}

RATING GUIDELINES (Be HARSH but FAIR):

HIGH (⭐⭐⭐⭐):
- 3+ code examples per post with real implementations
- Architecture/system diagrams present
- Advanced technical concepts (distributed systems, algorithms, protocols)
- Real product implementation details and internals
- Targets experienced developers
- NOT AI-generated
- Bottom-of-funnel content
Example topics: "Implementing Raft consensus in Go", "Our database query optimizer internals"

MEDIUM (⭐⭐⭐):
- 1-2 code examples per post
- Solid technical explanations with some depth
- Practical but not deeply advanced
- May mix some marketing with technical content
- Intermediate developers can learn from it
Example topics: "Building a REST API with error handling", "Deploying with Docker best practices"

LOW (⭐⭐):
- No or minimal code examples
- Generic marketing language
- Surface-level "What is X?" content
- AI-generated patterns detected (generic intros, repetitive structure)
- Top-of-funnel only
- Could be written by someone with no deep expertise
Example topics: "5 Benefits of Cloud Computing", "Why You Need Event-Driven Architecture"

⚠️ BEFORE SUBMITTING YOUR RESPONSE, VERIFY:
✓ contentQualityReasoning is at least 150 characters with specific examples
✓ aiWrittenEvidence is at least 100 characters with specific examples
✓ contentSummary is at least 50 characters
✓ exampleQuotes has 2-3 actual quotes from the content
✓ NO empty strings ("") in any field
✓ All REQUIRED fields are filled

RESPOND WITH ONLY THE JSON OBJECT - no markdown, no explanation, just valid JSON.`;


  let costInfo: CostInfo | null = null;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{role: "user", content: prompt}],
      temperature: 0.3,
    });

    const response = completion.choices[0].message.content || "";

    // Extract token usage and calculate cost
    const tokenUsage = extractTokenUsage(completion);
    if (tokenUsage) {
      costInfo = calculateCost(tokenUsage, "gpt-4-turbo-preview");
      console.log(`💰 OpenAI cost: $${costInfo.totalCost.toFixed(4)} (${tokenUsage.totalTokens} tokens)`);
    }

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const data: AIBlogAnalysis = JSON.parse(jsonMatch[0]);

    // Validate response quality
    const validationErrors: string[] = [];

    if (!data.contentQualityReasoning || data.contentQualityReasoning.length < 100) {
      validationErrors.push("contentQualityReasoning too short or missing");
    }
    if (!data.aiWrittenEvidence || data.aiWrittenEvidence.length < 80) {
      validationErrors.push("aiWrittenEvidence too short or missing");
    }
    if (!data.contentSummary || data.contentSummary.length < 30) {
      validationErrors.push("contentSummary too short or missing");
    }
    if (!data.exampleQuotes || data.exampleQuotes.length < 1) {
      validationErrors.push("exampleQuotes missing or empty");
    }
    if (!data.contentQualityRating) {
      validationErrors.push("contentQualityRating missing");
    }

    if (validationErrors.length > 0) {
      console.warn(`⚠️  AI response validation warnings: ${validationErrors.join(", ")}`);
      console.warn("   Response quality may be suboptimal - consider retrying or using defaults");
    }

    const aiActive = data.activeBlog || false;
    const aiPosts = data.postCount || 0;
    const aiMultiAuth = data.multipleAuthors || false;
    const aiAuthCount = data.authorCount || 0;
    const authorsList = data.authors || [];
    const aiLastPost = data.lastPostDate || null;
    const isDevSaas = data.isDeveloperB2BSaas || false;
    const authEmployees = data.authorsAreEmployees || "unknown";
    const coversAi = data.coversAiTopics || false;
    const contentSumm = data.contentSummary || "No summary provided";
    const contentQualityRating = data.contentQualityRating || null;
    const contentQualityReasoning = data.contentQualityReasoning || "No reasoning provided";

    // Parse enhanced content analysis fields
    const isAIWritten = data.isAIWritten || false;
    const aiWrittenConfidence = data.aiWrittenConfidence || "low";
    const aiWrittenEvidence = data.aiWrittenEvidence || "No evidence provided";
    const hasCodeExamples = data.hasCodeExamples || false;
    const codeExamplesCount = data.codeExamplesCount || 0;
    const codeLanguages = data.codeLanguages || [];
    const hasDiagrams = data.hasDiagrams || false;
    const diagramsCount = data.diagramsCount || 0;
    const technicalDepth = data.technicalDepth || "beginner";
    const funnelStage = data.funnelStage || "top";
    const exampleQuotes = data.exampleQuotes || [];

    const aiAuthors = authorsList.join(", ");

    console.log(`${aiActive ? "✅" : "❌"} Active blog (AI): ${aiActive} (${aiPosts} posts estimated)`);
    console.log(`${aiMultiAuth ? "✅" : "❌"} Multiple authors (AI): ${aiMultiAuth} (${aiAuthCount} authors)`);
    if (aiAuthors) {
      console.log(`   Authors: ${aiAuthors}`);
    }
    if (aiLastPost) {
      console.log(`   Last post: ${aiLastPost}`);
    }
    console.log(`${isDevSaas ? "✅" : "❌"} Developer-first B2B SaaS: ${isDevSaas}`);
    console.log(`📋 Authors are: ${authEmployees}`);
    console.log(`${coversAi ? "✅" : "❌"} Covers AI topics: ${coversAi}`);
    if (contentSumm) {
      const summaryPreview = contentSumm.replace(/\n/g, " ").substring(0, 100);
      console.log(`   Content: ${summaryPreview}${contentSumm.length > 100 ? "..." : ""}`);
    }
    if (contentQualityRating) {
      console.log(`⭐ Content Quality: ${contentQualityRating.toUpperCase()}`);
      if (contentQualityReasoning) {
        console.log(`   Reasoning: ${contentQualityReasoning.substring(0, 150)}${contentQualityReasoning.length > 150 ? "..." : ""}`);
      }
    }

    // Log enhanced content analysis
    console.log(`🤖 AI Written: ${isAIWritten ? "YES" : "NO"} (confidence: ${aiWrittenConfidence})`);
    if (aiWrittenEvidence) {
      console.log(`   Evidence: ${aiWrittenEvidence.substring(0, 100)}${aiWrittenEvidence.length > 100 ? "..." : ""}`);
    }
    console.log(`💻 Code Examples: ${hasCodeExamples ? "YES" : "NO"} (${codeExamplesCount} found)`);
    if (codeLanguages.length > 0) {
      console.log(`   Languages: ${codeLanguages.join(", ")}`);
    }
    console.log(`📊 Diagrams: ${hasDiagrams ? "YES" : "NO"} (${diagramsCount} found)`);
    console.log(`🎯 Technical Depth: ${technicalDepth.toUpperCase()}`);
    console.log(`📈 Funnel Stage: ${funnelStage.toUpperCase()}-of-funnel`);
    if (exampleQuotes.length > 0) {
      console.log(`📝 Example Quotes:`);
      exampleQuotes.slice(0, 2).forEach((quote, idx) => {
        console.log(`   ${idx + 1}. "${quote.substring(0, 80)}${quote.length > 80 ? "..." : ""}"`);
      });
    }

    return {
      aiActive,
      aiPosts,
      aiMultiAuth,
      aiAuthCount,
      aiAuthors,
      blogUrl,
      aiLastPost,
      isDevSaas,
      authEmployees,
      coversAi,
      contentSumm,
      contentQualityRating,
      contentQualityReasoning,
      isAIWritten,
      aiWrittenConfidence,
      aiWrittenEvidence,
      hasCodeExamples,
      codeExamplesCount,
      codeLanguages,
      hasDiagrams,
      diagramsCount,
      technicalDepth,
      funnelStage,
      exampleQuotes,
      costInfo,
    };
  } catch (error) {
    console.error(`Failed to parse AI response: ${error}`);
    return {
      aiActive: false,
      aiPosts: 0,
      aiMultiAuth: false,
      aiAuthCount: 0,
      aiAuthors: "",
      blogUrl: null,
      aiLastPost: null,
      isDevSaas: false,
      authEmployees: "unknown",
      coversAi: false,
      contentSumm: "",
      contentQualityRating: null,
      contentQualityReasoning: "",
      isAIWritten: false,
      aiWrittenConfidence: "low",
      aiWrittenEvidence: "",
      hasCodeExamples: false,
      codeExamplesCount: 0,
      codeLanguages: [],
      hasDiagrams: false,
      diagramsCount: 0,
      technicalDepth: "beginner",
      funnelStage: "top",
      exampleQuotes: [],
      costInfo: null,
    };
  }
}

/**
 * Qualify a single company
 */
export async function qualifyCompany(
  company: CompanyInput,
  openaiApiKey: string
): Promise<BlogQualificationResult> {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`🔍 Analyzing: ${company.name}`);
  console.log(`   Website: ${company.website}`);
  console.log(`${"=".repeat(60)}`);

  const result: BlogQualificationResult = {
    companyName: company.name,
    website: company.website,
    hasActiveBlog: false,
    blogPostCount: 0,
    lastBlogCreatedAt: "",
    hasMultipleAuthors: false,
    authorCount: 0,
    authorNames: "",
    isDeveloperB2BSaas: false,
    authorsAreEmployees: "unknown",
    coversAiTopics: false,
    contentSummary: "",
    blogLinkUsed: "",
    rssFeedFound: false,
    analysisMethod: "None",
    qualified: false,
  };

  // Check 1: Active blog (try RSS first)
  console.log("\n1️⃣  Checking blog activity (1+ posts in last 30 days)...");
  const blogActivity = await checkBlogActivity(company.website);

  // If RSS failed, use AI fallback
  if (!blogActivity) {
    const aiResult = await analyzeBlogWithAI(company.website, openaiApiKey);

    result.hasActiveBlog = aiResult.aiActive;
    result.blogPostCount = aiResult.aiPosts;
    result.lastBlogCreatedAt = aiResult.aiLastPost || "";
    result.authorNames = aiResult.aiAuthors;

    // Count authors programmatically from the comma-separated string (more reliable than LLM count)
    const authorCount = result.authorNames
      ? result.authorNames.split(",").map((a) => a.trim()).filter((a) => a.length > 0).length
      : 0;

    result.authorCount = authorCount;
    result.hasMultipleAuthors = authorCount >= 2;
    result.isDeveloperB2BSaas = aiResult.isDevSaas;
    result.authorsAreEmployees = aiResult.authEmployees;
    result.coversAiTopics = aiResult.coversAi;
    result.contentSummary = aiResult.contentSumm;
    result.contentQualityRating = aiResult.contentQualityRating || undefined;
    result.contentQualityReasoning = aiResult.contentQualityReasoning || undefined;
    result.blogLinkUsed = aiResult.blogUrl || "";
    result.rssFeedFound = false;
    result.analysisMethod = "AI";
    result.costInfo = aiResult.costInfo || undefined;

    // Populate enhanced content analysis fields
    result.isAIWritten = aiResult.isAIWritten;
    result.aiWrittenConfidence = aiResult.aiWrittenConfidence;
    result.aiWrittenEvidence = aiResult.aiWrittenEvidence;
    result.hasCodeExamples = aiResult.hasCodeExamples;
    result.codeExamplesCount = aiResult.codeExamplesCount;
    result.codeLanguages = aiResult.codeLanguages;
    result.hasDiagrams = aiResult.hasDiagrams;
    result.diagramsCount = aiResult.diagramsCount;
    result.technicalDepth = aiResult.technicalDepth;
    result.funnelStage = aiResult.funnelStage;
    result.exampleQuotes = aiResult.exampleQuotes;

    console.log("\n2️⃣  Author check completed via AI analysis");
  } else {
    // RSS worked
    result.hasActiveBlog = blogActivity.hasActiveBlog;
    result.blogPostCount = blogActivity.postCount;
    result.lastBlogCreatedAt = blogActivity.lastPostDate || "";
    result.blogLinkUsed = blogActivity.rssUrl || "";
    result.rssFeedUrl = blogActivity.rssUrl || undefined;
    result.rssFeedFound = blogActivity.recentPosts.length > 0;
    result.analysisMethod = "RSS";

    // Extract lastPostUrl from most recent post
    if (blogActivity.recentPosts.length > 0) {
      const sortedPosts = [...blogActivity.recentPosts].sort((a, b) => b.date.getTime() - a.date.getTime());
      result.lastPostUrl = sortedPosts[0].link || undefined;
    }

    // Check 2: Multiple authors
    console.log("\n2️⃣  Checking for multiple authors (2+)...");
    const authorsResult = checkMultipleAuthors(blogActivity.recentPosts);
    result.hasMultipleAuthors = authorsResult.hasMultiple;
    result.authorCount = authorsResult.authorCount;
    result.authorNames = authorsResult.authorList.slice(0, 5).join(", ");

    // ALWAYS run content quality analysis with actual blog post URLs
    console.log("\n3️⃣  Analyzing blog content quality...");
    const postUrls = blogActivity.recentPosts
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)
      .map(post => post.link)
      .filter((link): link is string => !!link);

    if (postUrls.length > 0) {
      console.log(`   → Analyzing ${postUrls.length} recent blog posts for content quality...`);
      const aiResult = await analyzeBlogWithAI(company.website, openaiApiKey, postUrls);

      // If RSS feed had no author information, use AI author data
      if (result.authorCount === 0) {
        console.log("   → No author info in RSS feed, using AI author analysis...");
        result.authorNames = aiResult.aiAuthors;

        // Count authors programmatically from the comma-separated string (more reliable than LLM count)
        const authorCount = result.authorNames
          ? result.authorNames.split(",").map((a) => a.trim()).filter((a) => a.length > 0).length
          : 0;

        result.authorCount = authorCount;
        result.hasMultipleAuthors = authorCount >= 2;
      }

      // Always populate content analysis fields
      result.isDeveloperB2BSaas = aiResult.isDevSaas;
      result.authorsAreEmployees = aiResult.authEmployees;
      result.coversAiTopics = aiResult.coversAi;
      result.contentSummary = aiResult.contentSumm;
      result.contentQualityRating = aiResult.contentQualityRating || undefined;
      result.contentQualityReasoning = aiResult.contentQualityReasoning || undefined;

      // Populate enhanced content analysis fields
      result.isAIWritten = aiResult.isAIWritten;
      result.aiWrittenConfidence = aiResult.aiWrittenConfidence;
      result.aiWrittenEvidence = aiResult.aiWrittenEvidence;
      result.hasCodeExamples = aiResult.hasCodeExamples;
      result.codeExamplesCount = aiResult.codeExamplesCount;
      result.codeLanguages = aiResult.codeLanguages;
      result.hasDiagrams = aiResult.hasDiagrams;
      result.diagramsCount = aiResult.diagramsCount;
      result.technicalDepth = aiResult.technicalDepth;
      result.funnelStage = aiResult.funnelStage;
      result.exampleQuotes = aiResult.exampleQuotes;

      result.analysisMethod = result.authorCount === 0 ? "RSS + AI (authors)" : "RSS + AI (content)";
      result.costInfo = aiResult.costInfo || undefined;
    } else {
      console.log("   → No valid post URLs found in RSS feed for content analysis");
    }
  }

  // Determine if qualified
  result.qualified =
    result.hasActiveBlog &&
    result.hasMultipleAuthors &&
    result.isDeveloperB2BSaas;

  // Print summary
  console.log(`\n${"-".repeat(60)}`);
  const status = result.qualified ? "✅ QUALIFIED" : "❌ NOT QUALIFIED";
  console.log(`📊 RESULT: ${status}`);
  const criteriaMet = [
    result.hasActiveBlog,
    result.hasMultipleAuthors,
    result.isDeveloperB2BSaas,
  ].filter(Boolean).length;
  console.log(`   Criteria met: ${criteriaMet}/3`);
  console.log(`   - Active blog (1+ posts/30d): ${result.hasActiveBlog}`);
  console.log(`   - Multiple authors (2+): ${result.hasMultipleAuthors}`);
  console.log(`   - Developer-first B2B SaaS: ${result.isDeveloperB2BSaas}`);
  console.log(`   Method used: ${result.analysisMethod}`);
  console.log(`${"-".repeat(60)}`);

  return result;
}

/**
 * Qualify multiple companies
 */
export async function qualifyCompanies(
  companies: CompanyInput[],
  openaiApiKey: string,
  delayMs: number = 2000
): Promise<BlogQualificationResult[]> {
  const results: BlogQualificationResult[] = [];

  for (let i = 0; i < companies.length; i++) {
    console.log(`\n\n${"#".repeat(60)}`);
    console.log(`Processing Company ${i + 1}/${companies.length}`);
    console.log(`${"#".repeat(60)}`);

    const result = await qualifyCompany(companies[i], openaiApiKey);
    results.push(result);

    if (i < companies.length - 1) {
      console.log(`\n⏳ Waiting ${delayMs / 1000} seconds before next company...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Print final summary
  const qualifiedCount = results.filter((r) => r.qualified).length;
  console.log(`\n\n${"=".repeat(60)}`);
  console.log(`📈 FINAL SUMMARY:`);
  console.log(`${"-".repeat(60)}`);
  console.log(`   Total Companies Analyzed: ${results.length}`);
  console.log(`   ✅ Qualified: ${qualifiedCount}`);
  console.log(`   ❌ Not Qualified: ${results.length - qualifiedCount}`);
  console.log(`   📊 Success Rate: ${((qualifiedCount / results.length) * 100).toFixed(1)}%`);
  console.log(`${"-".repeat(60)}`);

  if (qualifiedCount > 0) {
    console.log(`\n🎉 QUALIFIED COMPANIES:`);
    const qualified = results.filter((r) => r.qualified);
    qualified.forEach((row) => {
      console.log(
        `   • ${row.companyName} (${row.blogPostCount} posts, ${row.authorCount} authors)`
      );
    });
  }

  return results;
}
