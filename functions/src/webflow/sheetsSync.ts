/**
 * Google Sheets Scraper Sync
 * Reads URLs from Google Sheets "Input" tab, scrapes them, and writes results to "Output" tab
 */

import * as functions from "firebase-functions/v2";
import {defineString} from "firebase-functions/params";
import {readFromTab, appendToTab, extractSheetId} from "../utils/sheetsUtils";
import {WebflowAPI} from "../utils/webflowUtils";
import {detectCategorySimple} from "../utils/categoryDetector";
import * as puppeteer from "puppeteer";

// Configuration
const GOOGLE_SHEET_URL = defineString("SHEETS_SCRAPER_URL", {
  default: "https://docs.google.com/spreadsheets/d/1rMbsnVq8K0n8LpyA3la9-Kri8ZsgsLL0IB6UMciahE8/edit?gid=342086020#gid=342086020",
});

const INPUT_TAB_NAME = "Input";
const OUTPUT_TAB_NAME = "Output";

// Rate limiting
const DELAY_BETWEEN_URLS = 3000; // 3 seconds between each URL

interface InputRow {
  url: string;
  published: string;
  category: string; // Blog category (W&B, Medium, etc.)
  rowIndex: number;
}

interface ScrapedData {
  name: string;
  slug: string;
  externalUrl: string;
  imageUrl?: string;
  category: string; // Auto-detected content category
  blogCategory: string; // From Input tab
}

interface SyncStats {
  totalUrls: number;
  processed: number;
  skipped: number;
  errors: number;
  webflowCreated: number;
}

/**
 * Parse Input tab data
 */
function parseInputData(values: string[][]): InputRow[] {
  if (values.length === 0) {
    return [];
  }

  const headers = values[0].map((h) => h.toLowerCase().trim());
  const urlIndex = headers.findIndex((h) => h === "url");
  const publishedIndex = headers.findIndex((h) => h === "published");
  const categoryIndex = headers.findIndex((h) => h === "category");

  if (urlIndex === -1) {
    throw new Error('Input tab must have a "URL" column');
  }

  const rows: InputRow[] = [];

  // Start from row 1 (skip header)
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const url = row[urlIndex]?.trim();
    const published = row[publishedIndex]?.trim().toLowerCase() || "";
    const category = row[categoryIndex]?.trim() || "W&B";

    // Skip if URL is empty or marked as published
    if (!url || published === "yes") {
      continue;
    }

    rows.push({
      url,
      published,
      category,
      rowIndex: i,
    });
  }

  return rows;
}

/**
 * Extract title from page
 */
async function extractTitle(page: puppeteer.Page): Promise<string> {
  return await page.evaluate(() => {
    // Try multiple strategies
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      const content = ogTitle.getAttribute("content");
      if (content) return content;
    }

    const h1 = document.querySelector("h1");
    if (h1) return h1.textContent?.trim() || "";

    const titleTag = document.querySelector("title");
    if (titleTag) return titleTag.textContent?.trim() || "";

    return "Untitled Article";
  });
}

/**
 * Extract description from page
 */
async function extractDescription(page: puppeteer.Page): Promise<string | undefined> {
  return await page.evaluate(() => {
    // Try multiple strategies
    const ogDesc = document.querySelector('meta[property="og:description"]');
    if (ogDesc) {
      const content = ogDesc.getAttribute("content");
      if (content) return content;
    }

    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      const content = metaDesc.getAttribute("content");
      if (content) return content;
    }

    return undefined;
  });
}

/**
 * Extract thumbnail from page (reusing W&B scraper logic)
 */
async function extractThumbnail(page: puppeteer.Page): Promise<string | undefined> {
  return await page.evaluate(() => {
    // Strategy 1: Open Graph meta tag (most reliable)
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      const content = ogImage.getAttribute("content");
      if (content) return content;
    }

    // Strategy 2: Twitter card image
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) {
      const content = twitterImage.getAttribute("content");
      if (content) return content;
    }

    // Strategy 3: First large image in main content area
    const contentImages = document.querySelectorAll("main img, article img, [role=\"main\"] img");
    for (const img of Array.from(contentImages)) {
      const htmlImg = img as HTMLImageElement;
      // Check if image is large enough to be a featured image
      if (htmlImg.naturalWidth > 400 || htmlImg.width > 400) {
        return htmlImg.src;
      }
    }

    // Strategy 4: Any img with 'cover' or 'featured' or 'thumbnail' in class/id
    const featuredImg = document.querySelector(
      "img[class*=\"cover\"], img[class*=\"featured\"], img[class*=\"thumbnail\"], img[id*=\"cover\"]"
    );
    if (featuredImg) {
      return (featuredImg as HTMLImageElement).src;
    }

    return undefined;
  });
}

/**
 * Generate slug from title
 */
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Scrape a single URL
 */
async function scrapeUrl(
  browser: puppeteer.Browser,
  url: string,
  blogCategory: string
): Promise<ScrapedData | null> {
  let page: puppeteer.Page | null = null;

  try {
    console.log(`  → Scraping: ${url.substring(0, 80)}...`);

    page = await browser.newPage();
    await page.setViewport({width: 1920, height: 1080});

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Wait for images to load
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Extract data
    const title = await extractTitle(page);
    const description = await extractDescription(page);
    const imageUrl = await extractThumbnail(page);

    // Generate metadata
    const slug = generateSlug(title);
    const category = detectCategorySimple(title, description);

    console.log(`  ✓ Title: ${title}`);
    console.log(`  ✓ Category: ${category}`);
    console.log(`  ✓ Thumbnail: ${imageUrl ? "Found" : "Not found"}`);

    return {
      name: title,
      slug,
      externalUrl: url,
      imageUrl,
      category,
      blogCategory,
    };
  } catch (error) {
    console.error(`  ✗ Failed to scrape URL: ${(error as Error).message}`);
    return null;
  } finally {
    if (page) {
      try {
        await page.close();
      } catch (e) {
        // Ignore close errors
      }
    }
  }
}

/**
 * Main sync function
 */
export async function performSheetsSync(): Promise<SyncStats> {
  const stats: SyncStats = {
    totalUrls: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    webflowCreated: 0,
  };

  let browser: puppeteer.Browser | null = null;

  try {
    console.log("🚀 GOOGLE SHEETS SCRAPER SYNC STARTED");
    console.log(`⏰ Execution started at: ${new Date().toISOString()}`);

    // Extract sheet ID
    const sheetUrl = GOOGLE_SHEET_URL.value();
    const sheetId = extractSheetId(sheetUrl);
    console.log(`📊 Reading from Google Sheet: ${sheetId}`);

    // Read Input tab
    const inputData = await readFromTab(sheetId, INPUT_TAB_NAME);
    const inputRows = parseInputData(inputData.values);

    stats.totalUrls = inputRows.length;
    console.log(`📋 Found ${inputRows.length} URLs to process (filtered: Published ≠ "yes")`);

    if (inputRows.length === 0) {
      console.log("✅ No URLs to process. Exiting.");
      return stats;
    }

    // Launch browser
    console.log("🌐 Launching Puppeteer browser...");
    browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    });

    // Initialize Webflow client
    const webflowClient = new WebflowAPI();

    // Process each URL
    for (let i = 0; i < inputRows.length; i++) {
      const row = inputRows[i];

      console.log(`\n[${i + 1}/${inputRows.length}] Processing: ${row.url}`);

      // Scrape URL
      const scrapedData = await scrapeUrl(browser, row.url, row.category);

      if (!scrapedData) {
        stats.errors++;
        console.log(`  ⚠ Skipping due to scraping error`);
        continue;
      }

      // Append to Output tab
      try {
        const outputRow = [
          scrapedData.name,
          scrapedData.slug,
          scrapedData.externalUrl,
          scrapedData.imageUrl || "",
          scrapedData.category,
          scrapedData.blogCategory,
        ];

        await appendToTab(sheetId, OUTPUT_TAB_NAME, [outputRow]);
        console.log(`  ✓ Appended to Output tab`);
      } catch (error) {
        console.error(`  ✗ Failed to append to Output tab:`, error);
        stats.errors++;
      }

      // Create Webflow post
      try {
        const article = {
          name: scrapedData.name,
          slug: scrapedData.slug,
          externalUrl: scrapedData.externalUrl,
          imageUrl: scrapedData.imageUrl,
          category: scrapedData.category,
          blogCategory: scrapedData.blogCategory,
        };

        await webflowClient.createArticlePost(article);
        stats.webflowCreated++;
        console.log(`  ✓ Created Webflow post`);
      } catch (error) {
        console.error(`  ✗ Failed to create Webflow post:`, error);
        // Don't increment errors - we still wrote to Output tab
      }

      stats.processed++;

      // Rate limiting: delay between URLs
      if (i < inputRows.length - 1) {
        console.log(`  ⏳ Waiting ${DELAY_BETWEEN_URLS / 1000}s before next URL...`);
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_URLS));
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 SYNC COMPLETE - FINAL STATS:");
    console.log(`   Total URLs: ${stats.totalUrls}`);
    console.log(`   Processed: ${stats.processed}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Webflow Created: ${stats.webflowCreated}`);
    console.log(`   Success Rate: ${((stats.processed / stats.totalUrls) * 100).toFixed(1)}%`);
    console.log("=".repeat(80));

    return stats;
  } catch (error) {
    console.error("❌ SHEETS SYNC FAILED:", error);
    throw error;
  } finally {
    if (browser) {
      try {
        await browser.close();
        console.log("🔒 Browser closed");
      } catch (e) {
        console.error("Error closing browser:", e);
      }
    }
  }
}

/**
 * Scheduled Cloud Function - Runs daily at 9 AM UTC
 */
export const sheetsScraperSync = functions.scheduler.onSchedule(
  {
    schedule: "0 9 * * *", // Daily at 9 AM UTC
    timeoutSeconds: 540, // 9 minutes
    memory: "2GiB",
    region: "us-central1",
  },
  async () => {
    try {
      await performSheetsSync();
    } catch (error) {
      console.error("Scheduled sync failed:", error);
      throw error;
    }
  }
);
