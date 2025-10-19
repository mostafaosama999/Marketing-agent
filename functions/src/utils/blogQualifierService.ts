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
  const baseUrl = website.replace(/\/$/, "");

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
 * Analyze blog with AI when RSS fails
 */
async function analyzeBlogWithAI(
  website: string,
  openaiApiKey: string
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
}> {
  console.log("RSS not found, trying AI analysis of blog page...");

  // Try to find blog page
  const baseUrl = website.replace(/\/$/, "");
  const blogPages = ["/blog", "/blogs", "/news", "/articles", "/resources", "/insights", "/posts", ""];

  let blogContent: string | null = null;
  let blogUrl: string | null = null;

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
    };
  }

  // Call OpenAI
  const openai = new OpenAI({apiKey: openaiApiKey});

  const prompt = `Analyze this blog page content and extract comprehensive information about the company and blog.

Blog URL: ${blogUrl}
Content (first 8000 chars):
${blogContent.substring(0, 8000)}

Instructions:
1. Count blog posts published in the last 30 days
2. Identify all unique author names
3. Find the most recent blog post date
4. Determine if this is a developer-first B2B SaaS company (look for: APIs, SDKs, developer tools, infrastructure, platforms for developers)
5. Analyze if authors are employees or freelancers (look for: company email domains, "team member", employee titles, vs. "guest author", "contributor")
6. Check if blog covers recent AI/ML topics (LLMs, RAG, AI agents, machine learning, transformers, neural networks, GPT, Claude, embeddings, vector databases)
7. Summarize the main topics as bullet points

IMPORTANT: You MUST respond with ONLY valid JSON in this EXACT format:
{
  "active_blog": true or false,
  "post_count": <number of posts in last 30 days>,
  "multiple_authors": true or false,
  "author_count": <number of unique authors>,
  "authors": ["Author Name 1", "Author Name 2", "Author Name 3"],
  "last_post_date": "YYYY-MM-DD",
  "is_developer_b2b_saas": true or false,
  "authors_are_employees": "employees" or "freelancers" or "mixed" or "unknown",
  "covers_ai_topics": true or false,
  "content_summary": "• Topic 1\\n• Topic 2\\n• Topic 3"
}

Rules:
- "authors" must be an array of actual author names (e.g., ["Anna Geller", "Benoit Pimpaud"])
- Do NOT use placeholder text like "Multiple authors" or "Yes"
- If you cannot find author names, use an empty array: []
- If you cannot find the date, use null for last_post_date
- active_blog is true if post_count >= 1
- multiple_authors is true if author_count >= 2
- is_developer_b2b_saas: true if company builds tools/platforms FOR developers (APIs, infrastructure, dev tools)
- authors_are_employees: "employees" if most are staff, "freelancers" if guests, "mixed" if both, "unknown" if unclear
- covers_ai_topics: true if blog discusses AI/ML topics, frameworks, or implementations
- content_summary: If covers AI, list the AI topics. If not, list what the blog covers instead. Use bullet points (• Topic)

Respond with ONLY the JSON object, no other text.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [{role: "user", content: prompt}],
      temperature: 0.3,
    });

    const response = completion.choices[0].message.content || "";

    // Parse JSON response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const data: AIBlogAnalysis = JSON.parse(jsonMatch[0]);

    const aiActive = data.activeBlog || false;
    const aiPosts = data.postCount || 0;
    const aiMultiAuth = data.multipleAuthors || false;
    const aiAuthCount = data.authorCount || 0;
    const authorsList = data.authors || [];
    const aiLastPost = data.lastPostDate || null;
    const isDevSaas = data.isDeveloperB2BSaas || false;
    const authEmployees = data.authorsAreEmployees || "unknown";
    const coversAi = data.coversAiTopics || false;
    const contentSumm = data.contentSummary || "";

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
    result.hasMultipleAuthors = aiResult.aiMultiAuth;
    result.authorCount = aiResult.aiAuthCount;
    result.authorNames = aiResult.aiAuthors;
    result.isDeveloperB2BSaas = aiResult.isDevSaas;
    result.authorsAreEmployees = aiResult.authEmployees;
    result.coversAiTopics = aiResult.coversAi;
    result.contentSummary = aiResult.contentSumm;
    result.blogLinkUsed = aiResult.blogUrl || "";
    result.rssFeedFound = false;
    result.analysisMethod = "AI";

    console.log("\n2️⃣  Author check completed via AI analysis");
  } else {
    // RSS worked
    result.hasActiveBlog = blogActivity.hasActiveBlog;
    result.blogPostCount = blogActivity.postCount;
    result.lastBlogCreatedAt = blogActivity.lastPostDate || "";
    result.blogLinkUsed = blogActivity.rssUrl || "";
    result.rssFeedFound = blogActivity.recentPosts.length > 0;
    result.analysisMethod = "RSS";

    // Check 2: Multiple authors
    console.log("\n2️⃣  Checking for multiple authors (2+)...");
    const authorsResult = checkMultipleAuthors(blogActivity.recentPosts);
    result.hasMultipleAuthors = authorsResult.hasMultiple;
    result.authorCount = authorsResult.authorCount;
    result.authorNames = authorsResult.authorList.slice(0, 5).join(", ");

    // If RSS feed had no author information, use AI
    if (result.authorCount === 0) {
      console.log("   → No author info in RSS feed, checking blog page with AI...");
      const aiResult = await analyzeBlogWithAI(company.website, openaiApiKey);
      result.hasMultipleAuthors = aiResult.aiMultiAuth;
      result.authorCount = aiResult.aiAuthCount;
      result.authorNames = aiResult.aiAuthors;
      result.isDeveloperB2BSaas = aiResult.isDevSaas;
      result.authorsAreEmployees = aiResult.authEmployees;
      result.coversAiTopics = aiResult.coversAi;
      result.contentSummary = aiResult.contentSumm;
      result.analysisMethod = "RSS + AI (authors)";
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
