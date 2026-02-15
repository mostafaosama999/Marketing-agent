/**
 * scrape_page tool for the Blog Audit Agent
 *
 * General-purpose page scraping: fetches a URL,
 * strips scripts/styles, returns cleaned text content.
 * Reuses patterns from blogQualifierService.ts.
 */

import axios from "axios";
import * as cheerio from "cheerio";
import {ScrapePageResult} from "../types";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const MAX_CONTENT_LENGTH = 5000;

/**
 * Main tool function: scrape a page and return cleaned text content
 */
export async function scrapePage(url: string): Promise<ScrapePageResult> {
  console.log(`[scrapePage] Scraping: ${url}`);

  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {"User-Agent": USER_AGENT},
      maxRedirects: 3,
    });

    const $ = cheerio.load(response.data);

    // Remove non-content elements
    $("script, style, nav, footer, header, iframe, noscript").remove();
    $('[class*="cookie"], [class*="popup"], [class*="modal"], [class*="banner"]').remove();
    $('[id*="cookie"], [id*="popup"], [id*="modal"]').remove();

    // Extract title
    const title =
      $("title").text().trim() ||
      $("h1").first().text().trim() ||
      "";

    // Extract main content - prefer article/main elements
    let content = "";
    const mainSelectors = ["article", "main", '[role="main"]', ".post-content", ".entry-content", ".article-body"];

    for (const selector of mainSelectors) {
      const el = $(selector);
      if (el.length) {
        content = el.text().trim();
        break;
      }
    }

    // Fallback to body
    if (!content || content.length < 100) {
      content = $("body").text().trim();
    }

    // Clean up whitespace
    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
    content = lines.join("\n");

    // Truncate to max length
    if (content.length > MAX_CONTENT_LENGTH) {
      content = content.substring(0, MAX_CONTENT_LENGTH) + "\n[...truncated]";
    }

    return {
      success: true,
      url,
      title,
      content,
    };
  } catch (error: any) {
    console.error(`[scrapePage] Error for ${url}:`, error.message);
    return {
      success: false,
      url,
      title: "",
      content: "",
      error: error.message || "Failed to scrape page",
    };
  }
}

/**
 * OpenAI function definition for the scrape_page tool
 */
export const scrapePageToolDefinition = {
  type: "function" as const,
  function: {
    name: "scrape_page",
    description:
      "Fetch and extract text content from any web page. " +
      "Returns cleaned text (no HTML) up to 5000 characters. " +
      "Use this to read specific blog posts, about pages, or competitor websites.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "The URL to scrape content from.",
        },
      },
      required: ["url"],
    },
  },
};
