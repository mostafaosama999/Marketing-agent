/**
 * One-time test script to scrape a single URL
 * Usage: npm run build && node lib/scripts/testSingleUrl.js
 */

import * as dotenv from "dotenv";
import * as path from "path";
import * as puppeteer from "puppeteer";
import {detectCategorySimple} from "../utils/categoryDetector";

// Load environment variables
dotenv.config({ path: path.join(__dirname, "../../.env.local") });

/**
 * Extract title from page
 */
async function extractTitle(page: puppeteer.Page): Promise<string> {
  return await page.evaluate(() => {
    // Strategy 1: h1 in article/main content areas
    const contentH1 = document.querySelector("article h1, main h1, [role=\"main\"] h1, .article h1, .content h1");
    if (contentH1) {
      const title = contentH1.textContent?.trim();
      if (title && title.length > 0) return title;
    }

    // Strategy 2: First h1 anywhere
    const h1 = document.querySelector("h1");
    if (h1) {
      const title = h1.textContent?.trim();
      if (title && title.length > 0) return title;
    }

    // Strategy 3: og:title
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) {
      const content = ogTitle.getAttribute("content");
      if (content && content.length > 0) return content;
    }

    // Strategy 4: title tag
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
 * Main test function
 */
async function testSingleUrl() {
  const testUrl = "https://supertokens.com/blog/mastering-nextjs-api-routes";
  const blogCategory = "Supertokens";

  console.log("🧪 SINGLE URL TEST");
  console.log("=".repeat(80));
  console.log(`🔗 URL: ${testUrl}`);
  console.log(`🏷️  Blog Category: ${blogCategory}`);
  console.log("=".repeat(80));

  let browser: puppeteer.Browser | null = null;

  try {
    console.log("\n🌐 Launching browser...");
    browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setViewport({width: 1920, height: 1080});

    console.log(`\n→ Navigating to: ${testUrl}`);
    await page.goto(testUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    console.log("⏳ Waiting for images to load...");
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Extract all data
    console.log("\n📊 EXTRACTING DATA:");
    console.log("-".repeat(80));

    const title = await extractTitle(page);
    console.log(`✓ Title: "${title}"`);

    const slug = generateSlug(title);
    console.log(`✓ Slug: "${slug}"`);

    const description = await extractDescription(page);
    console.log(`✓ Description: ${description ? `"${description.substring(0, 100)}..."` : "Not found"}`);

    const imageUrl = await extractThumbnail(page);
    console.log(`✓ Thumbnail: ${imageUrl ? `"${imageUrl}"` : "Not found"}`);

    const category = detectCategorySimple(title, description);
    console.log(`✓ Auto-detected Category: "${category}"`);

    console.log(`✓ Blog Category (from sheet): "${blogCategory}"`);

    // Final summary
    console.log("\n" + "=".repeat(80));
    console.log("📋 FINAL DATA OBJECT:");
    console.log("=".repeat(80));
    console.log(JSON.stringify({
      name: title,
      slug: slug,
      externalUrl: testUrl,
      imageUrl: imageUrl || "",
      category: category,
      blogCategory: blogCategory,
    }, null, 2));

    console.log("\n✅ Test completed successfully!");
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    throw error;
  } finally {
    if (browser) {
      console.log("\n🔒 Closing browser in 5 seconds...");
      await new Promise((resolve) => setTimeout(resolve, 5000));
      await browser.close();
    }
  }
}

// Run the test
testSingleUrl()
  .then(() => {
    console.log("\n✅ SCRIPT COMPLETED!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ SCRIPT FAILED:", error);
    process.exit(1);
  });
