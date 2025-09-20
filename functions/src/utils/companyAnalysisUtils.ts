import axios from "axios";
import * as cheerio from "cheerio";
import {CompanyAnalysis, WebScrapingResponse} from "../types";

/**
 * Scrape webpage content
 */
export async function scrapeWebpage(url: string): Promise<WebScrapingResponse> {
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    // Remove script and style elements
    $("script, style, noscript").remove();

    // Extract title
    const title = $("title").text().trim() ||
                 $("h1").first().text().trim() ||
                 "Company";

    // Extract meta description
    const description = $("meta[name=\"description\"]").attr("content") ||
                       $("meta[property=\"og:description\"]").attr("content") ||
                       "";

    // Extract headings
    const headings: string[] = [];
    $("h1, h2, h3").each((_, element) => {
      const text = $(element).text().trim();
      if (text && text.length > 3) {
        headings.push(text);
      }
    });

    // Extract main content
    const content = $("main, .main, #main, .content, #content, article")
      .text()
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 5000); // Limit content length

    // Look for blog links
    const blogUrl = findBlogUrl($, url);

    // Extract navigation links
    const navLinks: string[] = [];
    $("nav a, .nav a, .menu a, header a").each((_, element) => {
      const href = $(element).attr("href");
      const text = $(element).text().trim();
      if (href && text) {
        navLinks.push(`${text}: ${href}`);
      }
    });

    return {
      title,
      description,
      headings: headings.slice(0, 10), // Limit headings
      content,
      blogUrl,
      navLinks: navLinks.slice(0, 20), // Limit nav links
    };
  } catch (error) {
    console.error("Web scraping error:", error);
    throw new Error("Failed to scrape webpage");
  }
}

/**
 * Find blog URL in the webpage
 */
function findBlogUrl($: cheerio.CheerioAPI, baseUrl: string): string | undefined {
  const blogKeywords = ["blog", "news", "articles", "insights", "updates"];

  for (const keyword of blogKeywords) {
    const link = $(`a[href*="${keyword}"]`).first().attr("href");
    if (link) {
      try {
        return new URL(link, baseUrl).href;
      } catch {
        // Invalid URL, continue searching
      }
    }
  }

  return undefined;
}

/**
 * Extract company information from scraped content
 */
export async function extractCompanyInfo(
  scrapingResult: WebScrapingResponse,
  url: string
): Promise<CompanyAnalysis> {
  const {title, description, content, headings} = scrapingResult;

  // Basic analysis - in a real implementation, you'd use AI/NLP here
  const keyProducts = extractProducts(content, headings);
  const industry = extractIndustry(content, title, description);
  const targetAudience = extractTargetAudience(content);

  // Generate summary
  const summary = description ||
    `${title} is a company that provides various products and services. ` +
    `Based on their website content, they focus on ${keyProducts.slice(0, 2).join(" and ")}.`;

  return {
    url,
    title: title.replace(/\s+\|\s+.*$/, "").trim(), // Clean title
    description: description.substring(0, 500),
    summary: summary.substring(0, 1000),
    industry,
    keyProducts: keyProducts.slice(0, 5),
    targetAudience,
  };
}

/**
 * Extract potential products from content
 */
function extractProducts(content: string, headings: string[]): string[] {
  const products: string[] = [];
  const productKeywords = [
    "platform", "solution", "software", "service", "product", "tool",
    "app", "system", "technology", "framework", "library", "API",
  ];

  // Look in headings first
  headings.forEach((heading) => {
    productKeywords.forEach((keyword) => {
      if (heading.toLowerCase().includes(keyword) &&
          heading.split(" ").length <= 5) {
        products.push(heading);
      }
    });
  });

  // Look in content for product mentions
  const words = content.toLowerCase().split(/\s+/);
  for (let i = 0; i < words.length - 1; i++) {
    if (productKeywords.includes(words[i]) &&
        words[i + 1] &&
        words[i + 1].length > 2) {
      products.push(`${words[i]} ${words[i + 1]}`);
    }
  }

  return [...new Set(products)]; // Remove duplicates
}

/**
 * Extract industry from content
 */
function extractIndustry(content: string, title: string, description: string): string {
  const text = `${title} ${description} ${content}`.toLowerCase();

  const industries = [
    "technology", "fintech", "healthcare", "finance", "education",
    "e-commerce", "retail", "manufacturing", "consulting", "marketing",
    "artificial intelligence", "machine learning", "software", "saas",
    "real estate", "entertainment", "media", "automotive", "energy",
  ];

  for (const industry of industries) {
    if (text.includes(industry)) {
      return industry.charAt(0).toUpperCase() + industry.slice(1);
    }
  }

  return "Technology"; // Default
}

/**
 * Extract target audience from content
 */
function extractTargetAudience(content: string): string {
  const text = content.toLowerCase();

  const audiences = [
    "developers", "businesses", "enterprises", "startups", "students",
    "professionals", "teams", "individuals", "companies", "organizations",
    "small business", "large enterprise", "freelancers", "agencies",
  ];

  const found = audiences.filter((audience) => text.includes(audience));

  if (found.length > 0) {
    return found.slice(0, 2).join(" and ");
  }

  return "Business professionals";
}

/**
 * Analyze company homepage and return analysis
 */
export async function analyzeCompany(url: string): Promise<CompanyAnalysis> {
  // Normalize URL
  const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

  console.log(`Analyzing company: ${normalizedUrl}`);

  // Scrape the homepage
  const scrapingResult = await scrapeWebpage(normalizedUrl);

  // Extract company information
  const companyAnalysis = await extractCompanyInfo(scrapingResult, normalizedUrl);

  return companyAnalysis;
}