/**
 * Local Testing Script for Sheets Sync
 * Run with: npm run test:sheets
 *
 * This script runs the EXACT SAME logic as the cloud function
 * but locally for faster testing without deployment
 */

import * as dotenv from "dotenv";
import * as path from "path";
import {google} from "googleapis";
import {detectCategorySimple} from "../utils/categoryDetector";
import {extractSheetId} from "../utils/sheetsUtils";
import * as puppeteer from "puppeteer";

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, "../../.env.local") });

// Validate required environment variables
const requiredVars = [
  "SHEETS_SCRAPER_URL",
  "GOOGLE_CLIENT_EMAIL",
  "GOOGLE_PRIVATE_KEY",
  "WEBFLOW_API_TOKEN",
  "WEBFLOW_SITE_ID",
  "WEBFLOW_BLOG_COLLECTION_ID",
];

for (const varName of requiredVars) {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    console.error("Please check your .env.local file");
    process.exit(1);
  }
}

const INPUT_TAB_NAME = "Input";
const OUTPUT_TAB_NAME = "Output";
const DELAY_BETWEEN_URLS = 3000;

interface InputRow {
  url: string;
  published: string;
  category: string;
  rowIndex: number;
}

interface ScrapedData {
  name: string;
  slug: string;
  externalUrl: string;
  imageUrl?: string;
  category: string;
  blogCategory: string;
}

interface SyncStats {
  totalUrls: number;
  processed: number;
  skipped: number;
  errors: number;
  webflowCreated: number;
}

/**
 * Get Google Sheets Auth (local version)
 */
async function getLocalGoogleAuth() {
  const credentials = {
    type: "service_account",
    project_id: process.env.GOOGLE_PROJECT_ID || "ai-adv-5e502",
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.GOOGLE_CLIENT_X509_CERT_URL,
    universe_domain: "googleapis.com",
  };

  const auth = new google.auth.GoogleAuth({
    credentials: credentials as any,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return await auth.getClient();
}

/**
 * Read from tab (local version)
 */
async function readFromTabLocal(sheetId: string, tabName: string) {
  const auth = await getLocalGoogleAuth();
  const sheets = google.sheets({version: "v4", auth: auth as any});

  const fullRange = `'${tabName}'!A:Z`;
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: fullRange,
  });

  return {values: response.data.values || []};
}

/**
 * Append to tab (local version)
 */
async function appendToTabLocal(sheetId: string, tabName: string, values: string[][]) {
  const auth = await getLocalGoogleAuth();
  const sheets = google.sheets({version: "v4", auth: auth as any});

  const range = `'${tabName}'!A:Z`;
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range,
    valueInputOption: "RAW",
    requestBody: {values},
  });

  console.log(`✅ Successfully appended ${values.length} row(s) to tab "${tabName}"`);
}

/**
 * Mark a row as Published in the Input tab
 */
async function updatePublishedStatus(
  sheetId: string,
  tabName: string,
  rowIndex: number,
  publishedColumnIndex: number
) {
  const auth = await getLocalGoogleAuth();
  const sheets = google.sheets({version: "v4", auth: auth as any});

  // Convert column index to letter (0 = A, 1 = B, etc.)
  const columnLetter = String.fromCharCode(65 + publishedColumnIndex);

  // Row index in sheets is 1-based (header is row 1, data starts at row 2)
  const sheetRow = rowIndex + 1;
  const range = `'${tabName}'!${columnLetter}${sheetRow}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range,
    valueInputOption: "RAW",
    requestBody: {
      values: [["Yes"]],
    },
  });

  console.log(`✅ Marked row ${sheetRow} as Published: Yes`);
}

/**
 * Parse Input tab data
 */
function parseInputData(values: string[][]): InputRow[] {
  if (values.length === 0) return [];

  const headers = values[0].map((h) => h.toLowerCase().trim());
  const urlIndex = headers.findIndex((h) => h === "url");
  const publishedIndex = headers.findIndex((h) => h === "published");
  const categoryIndex = headers.findIndex((h) => h === "category");

  if (urlIndex === -1) {
    throw new Error('Input tab must have a "URL" column');
  }

  const rows: InputRow[] = [];

  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    const url = row[urlIndex]?.trim();
    const published = row[publishedIndex]?.trim().toLowerCase() || "";
    const category = row[categoryIndex]?.trim() || "W&B";

    if (!url || published === "yes") continue;

    rows.push({url, published, category, rowIndex: i});
  }

  return rows;
}

/**
 * Extract title from page
 * Priority: h1 in article/main > first h1 > og:title > title tag
 */
async function extractTitle(page: puppeteer.Page): Promise<string> {
  return await page.evaluate(() => {
    // Strategy 1: Try h1 in article/main content areas first (most reliable for article title)
    const contentH1 = document.querySelector("article h1, main h1, [role=\"main\"] h1, .article h1, .content h1");
    if (contentH1) {
      const title = contentH1.textContent?.trim();
      if (title && title.length > 0) return title;
    }

    // Strategy 2: Try first h1 anywhere on the page
    const h1 = document.querySelector("h1");
    if (h1) {
      const title = h1.textContent?.trim();
      if (title && title.length > 0) return title;
    }

    // Strategy 3: Try og:title meta tag (but might contain site name)
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      const content = ogTitle.getAttribute("content");
      if (content && content.length > 0) return content;
    }

    // Strategy 4: Last resort - title tag (often contains site name)
    const titleTag = document.querySelector("title");
    if (titleTag) {
      const title = titleTag.textContent?.trim();
      if (title && title.length > 0) return title;
    }

    return "Untitled Article";
  });
}

/**
 * Extract description from page
 */
async function extractDescription(page: puppeteer.Page): Promise<string | undefined> {
  return await page.evaluate(() => {
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
 * Extract thumbnail from page
 */
async function extractThumbnail(page: puppeteer.Page): Promise<string | undefined> {
  return await page.evaluate(() => {
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage) {
      const content = ogImage.getAttribute("content");
      if (content) return content;
    }

    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage) {
      const content = twitterImage.getAttribute("content");
      if (content) return content;
    }

    const contentImages = document.querySelectorAll("main img, article img, [role=\"main\"] img");
    for (const img of Array.from(contentImages)) {
      const htmlImg = img as HTMLImageElement;
      if (htmlImg.naturalWidth > 400 || htmlImg.width > 400) {
        return htmlImg.src;
      }
    }

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

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const title = await extractTitle(page);
    const description = await extractDescription(page);
    const imageUrl = await extractThumbnail(page);

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
        // Ignore
      }
    }
  }
}

/**
 * Local Webflow API (mocks firebase-functions config)
 */
class LocalWebflowAPI {
  private api: any;
  private blogCollectionId: string;

  constructor() {
    const axios = require("axios");

    this.blogCollectionId = process.env.WEBFLOW_BLOG_COLLECTION_ID!;

    this.api = axios.create({
      baseURL: "https://api.webflow.com",
      headers: {
        Authorization: `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
        "Content-Type": "application/json",
      },
    });
  }

  async createArticlePost(article: any) {
    console.log(`🆕 Creating article post: ${article.name}`);

    const postData = {
      fieldData: {
        name: article.name,
        slug: article.slug,
        "blog-external-link": article.externalUrl,
        "blog-main-image": article.imageUrl || "",
        category: article.category || "Case Studies & Tutorials",
        "blog-category-name": "68ee616f267332a8b301ba59",
        "publish-date": new Date().toISOString(),
      },
      isDraft: true,
      isArchived: false,
    };

    const response = await this.api.post(
      `/v2/collections/${this.blogCollectionId}/items`,
      postData
    );

    console.log(`✅ Successfully created article: ${response.data.fieldData.name}`);
    return response.data;
  }
}

/**
 * Main test function
 */
async function runLocalTest() {
  const stats: SyncStats = {
    totalUrls: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    webflowCreated: 0,
  };

  let browser: puppeteer.Browser | null = null;

  console.log("🧪 LOCAL SHEETS SYNC TEST");
  console.log("=".repeat(80));
  console.log(`⏰ Started at: ${new Date().toISOString()}`);
  console.log(`📝 Sheet URL: ${process.env.SHEETS_SCRAPER_URL}`);
  console.log(`📧 Service Account: ${process.env.GOOGLE_CLIENT_EMAIL}`);
  console.log(`🌐 Webflow Site: ${process.env.WEBFLOW_SITE_ID}`);
  console.log("=".repeat(80));

  try {
    const sheetUrl = process.env.SHEETS_SCRAPER_URL!;
    const sheetId = extractSheetId(sheetUrl);
    console.log(`\n📊 Reading from Google Sheet: ${sheetId}`);

    const inputData = await readFromTabLocal(sheetId, INPUT_TAB_NAME);
    const inputRows = parseInputData(inputData.values);

    stats.totalUrls = inputRows.length;
    console.log(`📋 Found ${inputRows.length} URLs to process (filtered: Published ≠ "yes")`);

    if (inputRows.length === 0) {
      console.log("✅ No URLs to process. Exiting.");
      return stats;
    }

    console.log("🌐 Launching Puppeteer browser...");
    browser = await puppeteer.launch({
      headless: false, // Set to false to see browser (helpful for debugging!)
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const webflowClient = new LocalWebflowAPI();

    for (let i = 0; i < inputRows.length; i++) {
      const row = inputRows[i];

      console.log(`\n[${i + 1}/${inputRows.length}] Processing: ${row.url}`);

      const scrapedData = await scrapeUrl(browser, row.url, row.category);

      if (!scrapedData) {
        stats.errors++;
        console.log(`  ⚠ Skipping due to scraping error`);
        continue;
      }

      try {
        const outputRow = [
          scrapedData.name,
          scrapedData.slug,
          scrapedData.externalUrl,
          scrapedData.imageUrl || "",
          scrapedData.category,
          scrapedData.blogCategory,
        ];

        await appendToTabLocal(sheetId, OUTPUT_TAB_NAME, [outputRow]);
        console.log(`  ✓ Appended to Output tab`);
      } catch (error) {
        console.error(`  ✗ Failed to append to Output tab:`, error);
        stats.errors++;
      }

      try {
        await webflowClient.createArticlePost(scrapedData);
        stats.webflowCreated++;
        console.log(`  ✓ Created Webflow post`);
      } catch (error) {
        console.error(`  ✗ Failed to create Webflow post:`, error);
      }

      stats.processed++;

      if (i < inputRows.length - 1) {
        console.log(`  ⏳ Waiting ${DELAY_BETWEEN_URLS / 1000}s...`);
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_URLS));
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("📊 TEST COMPLETE - FINAL STATS:");
    console.log(`   Total URLs: ${stats.totalUrls}`);
    console.log(`   Processed: ${stats.processed}`);
    console.log(`   Errors: ${stats.errors}`);
    console.log(`   Webflow Created: ${stats.webflowCreated}`);
    console.log(`   Success Rate: ${((stats.processed / stats.totalUrls) * 100).toFixed(1)}%`);
    console.log("=".repeat(80));

    return stats;
  } catch (error) {
    console.error("\n❌ TEST FAILED:", error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
      console.log("🔒 Browser closed");
    }
  }
}

// Run the test
runLocalTest()
  .then(() => {
    console.log("\n✅ LOCAL TEST COMPLETED SUCCESSFULLY!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ LOCAL TEST FAILED:", error);
    process.exit(1);
  });
