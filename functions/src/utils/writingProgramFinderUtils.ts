import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import * as functions from "firebase-functions";
import {
  WritingProgramResult,
  WritingProgramFinderResult,
  AIWritingProgramSuggestion,
} from "../types";
import {extractTokenUsage, calculateCost, CostInfo} from "./costTracker";

// Lazy-initialize OpenAI (only when needed, not at import time)
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: functions.config().openai?.key || process.env.OPENAI_API_KEY || "",
    });
  }
  return openaiInstance;
}

/**
 * Common URL patterns for writing/guest author programs
 * Ordered by likelihood/popularity
 * Note: Excludes general pages like /blog, /careers, /community
 */
const URL_PATTERNS = [
  "/write-for-us",
  "/write-for-us/",
  "/blog/write-for-us",
  "/blog/write-for-us/",
  "/community/write-for-us",
  "/community/write-for-us/",
  "/guest-authors",
  "/guest-authors/",
  "/guest-authorship",
  "/guest-authorship/",
  "/writers-program",
  "/writer-program",
  "/technical-writer-program",
  "/contributor-program",
  "/contributor-program/",
  "/contribute",
  "/contribute/",
  "/community-content-program",
  "/guest-writing",
  "/guest-writing/",
  "/community/tutorials/how-to-write",
  "/docs/community/programs/guest-authors",
  "/community/pages/write-for-us",
  "/write-with-us",
  "/write-with-us/",
  "/become-an-author",
  "/blog/guest-author-program",
  "/community/write",
  "/scholars",
  "/scholars/",
  "/scholars-program",
  "/scholars-program/",
  "/blog/scholars",
  "/blog/scholars/",
  "/community/scholars",
  "/community/scholars/",
  "/developer-scholars",
  "/technical-scholars",
  "/content-creator-program",
  "/ambassador-program",
  "/advocates",
  "/advocates/",
];

/**
 * Subdomain prefixes to check
 */
const SUBDOMAIN_PREFIXES = ["blog", "community", "developer", "learn", "docs"];

/**
 * Extract domain information from URL
 */
function extractDomain(url: string): {
  protocol: string;
  hostname: string;
  origin: string;
} | null {
  try {
    // Normalize URL
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;
    const urlObj = new URL(normalizedUrl);

    return {
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      origin: urlObj.origin,
    };
  } catch (error) {
    console.error(`Invalid URL: ${url}`, error);
    return null;
  }
}

/**
 * Extract company name from domain
 */
function extractCompanyName(hostname: string): string {
  return hostname
    .replace(/^(www\.)/, "")
    .split(".")[0];
}

/**
 * Generate all candidate URLs to check for writing programs
 */
function generateCandidateUrls(websiteUrl: string): string[] {
  const domain = extractDomain(websiteUrl);
  if (!domain) return [];

  const candidates: string[] = [];

  // Main domain patterns
  URL_PATTERNS.forEach((pattern) => {
    candidates.push(`${domain.origin}${pattern}`);
  });

  // Subdomain patterns (blog.domain.com, community.domain.com, etc.)
  SUBDOMAIN_PREFIXES.forEach((prefix) => {
    const subdomainUrl = domain.hostname.replace(/^(www\.)?/, `${prefix}.`);

    URL_PATTERNS.forEach((pattern) => {
      candidates.push(`${domain.protocol}//${subdomainUrl}${pattern}`);
    });
  });

  // Company-specific patterns (using company name from domain)
  const companyName = extractCompanyName(domain.hostname);
  const companySpecificPatterns = [
    `/write-for-${companyName}`,
    `/blog/write-for-${companyName}`,
    `/${companyName}-writers-program`,
    `/blog/${companyName}-technical-writer-program`,
    `/${companyName}-writer-program`,
    `/community/tutorials/how-to-write-an-article-for-${companyName}`,
    `/community/tutorials/how-to-write-an-article-for-the-${companyName}-community`,
    `/community/tutorials/write-for-${companyName}`,
    `/blog/how-to-write-for-${companyName}`,
    `/community/write-an-article`,
    `/community/contribute-article`,
    `/community/submit-tutorial`,
    `/community/tutorials/write`,
    `/blog/become-a-contributor`,
    `/docs/contributing`,
    `/docs/contribute-content`,
  ];

  companySpecificPatterns.forEach((pattern) => {
    candidates.push(`${domain.origin}${pattern}`);
  });

  // Notion pattern
  candidates.push(`https://${companyName}.notion.site/Write-for-us`);

  // Remove duplicates
  return [...new Set(candidates)];
}

/**
 * Scrape common pages (/community, /blog) to find links to writing programs
 */
async function findWritingProgramLinksOnPage(
  websiteUrl: string
): Promise<string[]> {
  const domain = extractDomain(websiteUrl);
  if (!domain) return [];

  const foundLinks: string[] = [];
  const pagesToCheck = [
    `${domain.origin}/community`,
    `${domain.origin}/blog`,
    `${domain.origin}/community/tutorials`,
    `${domain.origin}/docs`,
  ];

  for (const pageUrl of pagesToCheck) {
    try {
      const response = await axios.get(pageUrl, {
        timeout: 10000,
        validateStatus: (status) => status >= 200 && status < 400,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      const $ = cheerio.load(response.data);

      // Find all links that might lead to writing programs
      $("a").each((_, element) => {
        const href = $(element).attr("href");
        const linkText = $(element).text().toLowerCase().trim();

        if (!href) return;

        // Check if link text contains writing-related keywords
        const writingKeywords = [
          "write for us",
          "write an article",
          "submit article",
          "submit tutorial",
          "contribute",
          "contributor",
          "become a writer",
          "become an author",
          "guest author",
          "technical writer",
          "how to write",
        ];

        const hasWritingKeyword = writingKeywords.some((keyword) =>
          linkText.includes(keyword)
        );

        if (hasWritingKeyword) {
          // Normalize the URL
          let fullUrl = href;
          if (href.startsWith("/")) {
            fullUrl = `${domain.origin}${href}`;
          } else if (!href.startsWith("http")) {
            fullUrl = `${domain.origin}/${href}`;
          }

          // Only add if it's from the same domain
          if (fullUrl.includes(domain.hostname)) {
            foundLinks.push(fullUrl);
            console.log(`🔍 Found potential link on ${pageUrl}: ${fullUrl} ("${linkText}")`);
          }
        }
      });
    } catch (error) {
      // Silently continue if page doesn't exist
      continue;
    }
  }

  return [...new Set(foundLinks)];
}

/**
 * Check if a URL leads to a 404 or Not Found page
 */
function isNotFoundPage(finalUrl: string, htmlContent: string): boolean {
  const lowerUrl = finalUrl.toLowerCase();
  const lowerContent = htmlContent.toLowerCase().substring(0, 5000);

  // Check URL patterns
  if (
    lowerUrl.includes("not-found") ||
    lowerUrl.includes("404") ||
    lowerUrl.includes("error") ||
    lowerUrl.endsWith("/not-found.htm") ||
    lowerUrl.endsWith("/not-found.html")
  ) {
    return true;
  }

  // Check content patterns
  const errorPatterns = [
    "page not found",
    "404 error",
    "page could not be found",
    "page couldn't be found",
    "this page doesn't exist",
    "page does not exist",
    "the page you are looking for",
    "the page you were looking for",
    "sorry, we couldn't find",
    "oops! that page can't be found",
  ];

  return errorPatterns.some((pattern) => lowerContent.includes(pattern));
}

/**
 * Validate if page content is related to writing programs
 */
function hasWritingProgramContent(htmlContent: string): boolean {
  const lowerContent = htmlContent.toLowerCase();

  // Keywords that should appear on a writing program page
  const writingKeywords = [
    "write for us",
    "guest author",
    "contributor",
    "writing program",
    "submit an article",
    "submit your article",
    "guest post",
    "contribute content",
    "become a writer",
    "become an author",
    "technical writer",
    "community writer",
    "content creator",
    "scholar program",
    "scholars program",
    "developer scholar",
    "technical scholar",
    "ambassador program",
    "advocate program",
    "paid to write",
    "freelance writ",
  ];

  // Count how many keywords are found
  const foundKeywords = writingKeywords.filter((keyword) =>
    lowerContent.includes(keyword)
  );

  // Consider valid if at least 1 strong keyword found
  return foundKeywords.length >= 1;
}

/**
 * Check if URL exists and returns 200
 */
async function checkUrl(
  url: string,
  timeout: number = 5000
): Promise<WritingProgramResult> {
  try {
    // Try GET directly to validate content (skip HEAD to save a request)
    const getResponse = await axios.get(url, {
      timeout,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const finalUrl = getResponse.request?.res?.responseUrl || url;
    const htmlContent = typeof getResponse.data === "string" ? getResponse.data : "";

    // Check if it's a 404/Not Found page
    if (isNotFoundPage(finalUrl, htmlContent)) {
      return {
        url,
        exists: false,
        error: "Redirects to Not Found page",
      };
    }

    // Always validate content for writing program pages
    if (htmlContent && !hasWritingProgramContent(htmlContent)) {
      return {
        url,
        exists: false,
        error: "Page doesn't contain writing program content",
      };
    }

    return {
      url,
      exists: true,
      status: getResponse.status,
      finalUrl,
    };
  } catch (error: any) {
    return {
      url,
      exists: false,
      error: error.message,
    };
  }
}

/**
 * Process URLs in batches with concurrency control
 */
async function checkUrlsInBatches(
  urls: string[],
  concurrent: number = 5,
  timeout: number = 5000
): Promise<WritingProgramResult[]> {
  const results: WritingProgramResult[] = [];

  for (let i = 0; i < urls.length; i += concurrent) {
    const batch = urls.slice(i, i + concurrent);
    const batchResults = await Promise.all(
      batch.map((url) => checkUrl(url, timeout))
    );
    results.push(...batchResults);

    // Log found URLs
    const foundUrls = batchResults.filter((r) => r.exists);
    if (foundUrls.length > 0) {
      foundUrls.forEach((result) => {
        console.log(`✓ FOUND: ${result.url} (${result.status})`);
      });
    }

    // Add small delay between batches to be respectful
    if (i + concurrent < urls.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

/**
 * Extract pattern type from URL
 */
function extractPattern(url: string): string {
  try {
    const urlObj = new URL(url);
    return urlObj.pathname;
  } catch {
    return url;
  }
}

/**
 * Scrape website to gather context for AI
 */
async function scrapeWebsiteContext(websiteUrl: string): Promise<{
  content: string;
  navLinks: string[];
  headings: string[];
}> {
  try {
    const normalizedUrl = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;

    const response = await axios.get(normalizedUrl, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $("script, style, nav, header, footer").remove();

    // Extract navigation links
    const navLinks: string[] = [];
    $("a").each((_, element) => {
      const href = $(element).attr("href");
      const text = $(element).text().trim().toLowerCase();
      if (href && text) {
        navLinks.push(`${text}: ${href}`);
      }
    });

    // Extract headings
    const headings: string[] = [];
    $("h1, h2, h3").each((_, element) => {
      const heading = $(element).text().trim();
      if (heading) {
        headings.push(heading);
      }
    });

    // Extract main content
    let content = $("body").text().trim();
    // Clean and limit content
    content = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join(" ")
      .substring(0, 8000); // Limit to 8k chars for AI

    return {
      content,
      navLinks: navLinks.slice(0, 50), // Limit to 50 links
      headings: headings.slice(0, 20), // Limit to 20 headings
    };
  } catch (error) {
    console.error(`Failed to scrape website context:`, error);
    return {
      content: "",
      navLinks: [],
      headings: [],
    };
  }
}

/**
 * Use AI to find writing program URL
 */
async function findWithAI(
  websiteUrl: string,
  context: {
    content: string;
    navLinks: string[];
    headings: string[];
  }
): Promise<{
  suggestions: AIWritingProgramSuggestion[];
  overallReasoning: string;
  costInfo: CostInfo | null;
}> {
  try {
    const prompt = `
Analyze the following website and find their community writing program, guest author program, or contributor program URL.

Website: ${websiteUrl}

Headings found on the site:
${context.headings.join("\n")}

Navigation links (text: url):
${context.navLinks.slice(0, 30).join("\n")}

Website content excerpt:
${context.content.substring(0, 3000)}

Based on this information, suggest the most likely URLs for their writing/guest author/contributor program.
Return your response as a JSON object with this structure:
{
  "suggestions": [
    {
      "url": "full URL including https://",
      "confidence": "high" | "medium" | "low",
      "reasoning": "why you think this is the writing program URL"
    }
  ],
  "overallReasoning": "general analysis of the website's writing program presence"
}

Only suggest URLs you have evidence for. Provide up to 3 suggestions maximum.
`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing websites to find community writing programs, guest author programs, and contributor programs. You look at navigation links, content, and headings to identify where companies host their writing program information. Return only valid JSON.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3, // Lower temperature for more focused results
      max_tokens: 1000,
    });

    // Track API cost
    let costInfo: CostInfo | null = null;
    const tokenUsage = extractTokenUsage(completion);
    if (tokenUsage) {
      costInfo = calculateCost(tokenUsage, "gpt-4");
      console.log(`💰 OpenAI cost: $${costInfo.totalCost.toFixed(4)} (${tokenUsage.totalTokens} tokens)`);
    }

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON response
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      const parsed = JSON.parse(jsonStr);

      // Transform to our format
      const suggestions: AIWritingProgramSuggestion[] = (parsed.suggestions || []).map(
        (s: any) => ({
          url: s.url,
          confidence: s.confidence || "medium",
          reasoning: s.reasoning || "",
          verified: false, // Will be verified separately
        })
      );

      return {
        suggestions,
        overallReasoning: parsed.overallReasoning || "AI analysis completed",
        costInfo,
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("AI response was:", responseText);
      return {
        suggestions: [],
        overallReasoning: "Failed to parse AI response",
        costInfo,
      };
    }
  } catch (error) {
    console.error("AI fallback error:", error);
    return {
      suggestions: [],
      overallReasoning: `AI error: ${error}`,
      costInfo: null,
    };
  }
}

/**
 * Verify an AI-suggested URL
 */
async function verifyAiSuggestion(
  suggestion: AIWritingProgramSuggestion,
  timeout: number = 5000
): Promise<AIWritingProgramSuggestion> {
  try {
    // First check if URL is accessible
    const response = await axios.get(suggestion.url, {
      timeout,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    // Scrape the page to verify it's actually about writing programs
    const $ = cheerio.load(response.data);
    const pageText = $("body").text().toLowerCase();

    // Keywords that should appear on a writing program page
    const writingKeywords = [
      "write for us",
      "guest author",
      "contributor",
      "writing program",
      "submit",
      "article",
      "guest post",
      "contribute",
      "writer",
      "author",
    ];

    const foundKeywords = writingKeywords.filter((keyword) =>
      pageText.includes(keyword)
    );

    if (foundKeywords.length >= 2) {
      // At least 2 keywords found - likely a writing program page
      return {
        ...suggestion,
        verified: true,
      };
    } else {
      return {
        ...suggestion,
        verified: false,
        verificationError: "Page content doesn't match writing program keywords",
      };
    }
  } catch (error: any) {
    return {
      ...suggestion,
      verified: false,
      verificationError: error.message || "URL verification failed",
    };
  }
}

/**
 * AI fallback to find writing programs when pattern matching fails
 */
async function findWithAiFallback(
  websiteUrl: string,
  timeout: number = 5000
): Promise<{
  aiSuggestions: AIWritingProgramSuggestion[];
  aiReasoning: string;
  costInfo: CostInfo | null;
}> {
  console.log("\n🤖 Using AI fallback to find writing program...");

  // 1. Scrape website for context
  const context = await scrapeWebsiteContext(websiteUrl);

  if (!context.content && context.navLinks.length === 0) {
    console.log("❌ Failed to scrape website context for AI");
    return {
      aiSuggestions: [],
      aiReasoning: "Failed to scrape website content",
      costInfo: null,
    };
  }

  // 2. Use AI to find suggestions
  const aiResult = await findWithAI(websiteUrl, context);

  if (aiResult.suggestions.length === 0) {
    console.log("❌ AI found no suggestions");
    return {
      aiSuggestions: [],
      aiReasoning: aiResult.overallReasoning,
      costInfo: aiResult.costInfo,
    };
  }

  console.log(`🔍 AI suggested ${aiResult.suggestions.length} URLs`);

  // 3. Verify each suggestion
  const verifiedSuggestions = await Promise.all(
    aiResult.suggestions.map((suggestion) =>
      verifyAiSuggestion(suggestion, timeout)
    )
  );

  // Log results
  verifiedSuggestions.forEach((suggestion) => {
    if (suggestion.verified) {
      console.log(`✅ AI suggestion verified: ${suggestion.url}`);
    } else {
      console.log(
        `❌ AI suggestion failed verification: ${suggestion.url} - ${suggestion.verificationError}`
      );
    }
  });

  return {
    aiSuggestions: verifiedSuggestions,
    aiReasoning: aiResult.overallReasoning,
    costInfo: aiResult.costInfo,
  };
}

/**
 * Main function to find writing programs for a website
 */
export async function findWritingProgram(
  websiteUrl: string,
  options: {
    concurrent?: number;
    timeout?: number;
    useAiFallback?: boolean;
  } = {}
): Promise<WritingProgramFinderResult> {
  const {
    concurrent = 5,
    timeout = 5000,
    useAiFallback = true,
  } = options;

  console.log(`\nSearching for writing programs: ${websiteUrl}`);

  // Generate candidate URLs
  const candidates = generateCandidateUrls(websiteUrl);
  console.log(`Generated ${candidates.length} candidate URLs from patterns\n`);

  // Scrape common pages to find additional writing program links
  console.log("🔍 Scraping /community, /blog, and /docs pages for writing program links...");
  const scrapedLinks = await findWritingProgramLinksOnPage(websiteUrl);
  if (scrapedLinks.length > 0) {
    console.log(`✅ Found ${scrapedLinks.length} additional URLs from scraping`);
    candidates.push(...scrapedLinks);
  }

  console.log(`Total URLs to check: ${candidates.length}\n`);

  // Check URLs
  const results = await checkUrlsInBatches(candidates, concurrent, timeout);

  // Filter valid URLs
  let validUrls = results.filter((r) => r.exists);

  // Extract patterns found
  let patternsFound = validUrls.map((r) => extractPattern(r.url));

  // AI fallback if no results found
  let usedAiFallback = false;
  let aiSuggestions: AIWritingProgramSuggestion[] | undefined;
  let aiReasoning: string | undefined;
  let costInfo: CostInfo | null = null;

  if (validUrls.length === 0 && useAiFallback) {
    console.log("\n⚠️  No URLs found with pattern matching, trying AI fallback...");

    const aiResult = await findWithAiFallback(websiteUrl, timeout);
    usedAiFallback = true;
    aiSuggestions = aiResult.aiSuggestions;
    aiReasoning = aiResult.aiReasoning;
    costInfo = aiResult.costInfo;

    // Add verified AI suggestions to validUrls
    const verifiedAiUrls = aiResult.aiSuggestions
      .filter((s) => s.verified)
      .map((s) => ({
        url: s.url,
        exists: true,
        status: 200,
        finalUrl: s.url,
      }));

    validUrls = [...validUrls, ...verifiedAiUrls];
    patternsFound = [...patternsFound, ...verifiedAiUrls.map((r) => extractPattern(r.url))];
  }

  console.log(`\n--- Results for ${websiteUrl} ---`);
  console.log(`Found ${validUrls.length} valid URLs out of ${candidates.length} checked`);
  if (usedAiFallback) {
    console.log(`🤖 AI Fallback: ${aiSuggestions?.length || 0} suggestions, ${aiSuggestions?.filter(s => s.verified).length || 0} verified`);
  }
  validUrls.forEach((result) => {
    console.log(`  - ${result.url}`);
  });

  return {
    website: websiteUrl,
    totalChecked: candidates.length,
    validUrls,
    patternsFound,
    usedAiFallback,
    aiSuggestions,
    aiReasoning,
    costInfo: costInfo || undefined,
  };
}

/**
 * Batch process multiple websites
 */
export async function findMultipleWritingPrograms(
  websites: string[],
  options: {
    concurrent?: number;
    timeout?: number;
    delayBetweenWebsites?: number;
    useAiFallback?: boolean;
  } = {}
): Promise<Map<string, WritingProgramFinderResult>> {
  const {
    concurrent = 5,
    timeout = 5000,
    delayBetweenWebsites = 1000,
    useAiFallback = true,
  } = options;

  const allResults = new Map<string, WritingProgramFinderResult>();

  for (const website of websites) {
    try {
      const result = await findWritingProgram(website, {concurrent, timeout, useAiFallback});
      allResults.set(website, result);

      // Add delay between websites to be respectful
      if (delayBetweenWebsites > 0 && website !== websites[websites.length - 1]) {
        await new Promise((resolve) => setTimeout(resolve, delayBetweenWebsites));
      }
    } catch (error) {
      console.error(`Error processing ${website}:`, error);
      allResults.set(website, {
        website,
        totalChecked: 0,
        validUrls: [],
        patternsFound: [],
        usedAiFallback: false,
      });
    }
  }

  return allResults;
}
