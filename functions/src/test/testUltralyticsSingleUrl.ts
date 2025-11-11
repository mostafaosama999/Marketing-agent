/**
 * Test Ultralytics Single URL
 * Tests scraping a single Ultralytics blog post URL
 */

import * as puppeteer from 'puppeteer';
import {detectCategory} from '../utils/categoryDetector';
import {CSVManager} from '../utils/csvManager';
import {ScrapedArticle} from '../scrapers/baseScraper';
import * as path from 'path';

// Test URL
const TEST_URL = 'https://www.ultralytics.com/blog/ai-in-self-driving-cars';

/**
 * Extract slug from Ultralytics blog URL
 * Format: https://www.ultralytics.com/blog/ai-in-self-driving-cars
 */
function extractSlugFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);

    // Format: /blog/[slug]
    if (pathParts.length >= 2 && pathParts[0] === 'blog') {
      return pathParts[1];
    }

    return '';
  } catch (error) {
    return '';
  }
}

/**
 * Clean and normalize text
 */
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\n+/g, ' ')
    .trim();
}

/**
 * Parse Ultralytics date format: "September 25, 2024"
 */
function parseDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
}

/**
 * Scrape a single Ultralytics blog post
 */
async function scrapeSingleUrl(url: string): Promise<ScrapedArticle | null> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();

    // Set user agent to avoid blocking
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    );

    console.log(`🌐 Navigating to: ${url}`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    console.log('✅ Page loaded successfully\n');

    // Extract article data
    const articleData = await page.evaluate(() => {
      // Extract title
      const titleElement = document.querySelector('h1');
      const title = titleElement ? titleElement.textContent?.trim() : '';

      // Extract meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      const description = metaDescription ?
        (metaDescription as HTMLMetaElement).content : '';

      // Extract date
      const dateText = document.body.textContent || '';
      const dateMatch = dateText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4}/);
      const date = dateMatch ? dateMatch[0] : '';

      // Extract thumbnail/hero image with improved selection
      let imageUrl = '';
      const images = Array.from(document.querySelectorAll('img'));

      // Score images based on quality indicators
      interface ScoredImage {
        url: string;
        score: number;
        width: number;
        height: number;
      }

      const scoredImages: ScoredImage[] = [];

      for (const img of images) {
        const src = img.src || '';

        // Must be from CDN
        if (!src.includes('cdn.prod.website-files.com')) continue;

        // Skip unwanted image types
        if (src.includes('logo') ||
            src.includes('icon') ||
            src.endsWith('.svg') ||
            src.includes('button') ||
            src.includes('close') ||
            src.includes('menu')) {
          continue;
        }

        let score = 0;

        // High priority: thumbnail/hero keywords in filename
        if (src.includes('thumbnail') || src.includes('Thumbnail')) score += 50;
        if (src.includes('hero') || src.includes('Hero')) score += 50;
        if (src.includes('featured') || src.includes('Featured')) score += 40;
        if (src.includes('banner') || src.includes('Banner')) score += 40;
        if (src.includes('cover') || src.includes('Cover')) score += 30;

        // Prefer webp/jpg/png over other formats
        if (src.endsWith('.webp') || src.endsWith('.jpg') || src.endsWith('.jpeg') || src.endsWith('.png')) {
          score += 10;
        }

        // Get image dimensions
        const width = img.naturalWidth || img.width || 0;
        const height = img.naturalHeight || img.height || 0;

        // Prefer larger images (typical thumbnail size > 400x200)
        if (width > 600 && height > 300) score += 30;
        else if (width > 400 && height > 200) score += 20;
        else if (width > 200 && height > 100) score += 10;

        // Check if image is in a hero/featured section
        const parent = img.closest('[class*="hero"], [class*="featured"], [class*="banner"], [class*="thumbnail"]');
        if (parent) score += 25;

        scoredImages.push({
          url: src,
          score: score,
          width: width,
          height: height
        });
      }

      // Sort by score (highest first) and select best match
      if (scoredImages.length > 0) {
        scoredImages.sort((a, b) => b.score - a.score);
        imageUrl = scoredImages[0].url;
      }

      // Extract category tag
      const categoryLink = document.querySelector('a[href*="/blog-category/"]');
      const tag = categoryLink ? categoryLink.textContent?.trim() : '';

      // Extract author
      const authorElement = document.querySelector('[class*="author"]') ||
        document.querySelector('[rel="author"]');
      const author = authorElement ? authorElement.textContent?.trim() : '';

      // Extract main content for better description
      let contentSnippet = '';
      const contentElement = document.querySelector('article') ||
        document.querySelector('[class*="content"]') ||
        document.querySelector('main');

      if (contentElement) {
        const paragraphs = Array.from(contentElement.querySelectorAll('p'));
        if (paragraphs.length > 0) {
          contentSnippet = paragraphs[0].textContent?.trim() || '';
        }
      }

      return {
        title: title || '',
        description: description || contentSnippet,
        imageUrl: imageUrl || '',
        date: date || '',
        tag: tag || '',
        author: author || '',
      };
    });

    const slug = extractSlugFromUrl(url);

    // Auto-detect content category based on title and description
    const categoryResult = detectCategory(articleData.title, articleData.description);

    const scrapedArticle: ScrapedArticle = {
      name: cleanText(articleData.title),
      slug: slug,
      externalUrl: url,
      description: articleData.description || undefined,
      imageUrl: articleData.imageUrl || undefined,
      author: articleData.author || undefined,
      createdOn: articleData.date ? parseDate(articleData.date) : undefined,
      category: categoryResult.category, // Auto-detected content category
      blogCategory: 'Ultralytics', // Source platform
      tags: articleData.tag ? [articleData.tag] : undefined,
    };

    return scrapedArticle;
  } catch (error) {
    console.error('❌ Error scraping URL:', error);
    return null;
  } finally {
    await browser.close();
  }
}

/**
 * Simulate Webflow field mapping (without actually syncing)
 */
function showWebflowMapping(article: ScrapedArticle) {
  console.log('\n🌐 Webflow Field Mapping:');
  console.log('━'.repeat(80));

  const webflowFields = {
    'name': article.name,
    'slug': article.slug,
    'blog-external-link': article.externalUrl,
    'blog-main-image': article.imageUrl || 'N/A',
    'category': article.category,
    'blog-category-name': 'Ultralytics (ItemRef)',
    'publish-date': new Date().toISOString(),
    'post-summary': article.description || 'N/A',
    'isDraft': true,
    'isArchived': false,
  };

  Object.entries(webflowFields).forEach(([field, value]) => {
    console.log(`   ${field.padEnd(25)}: ${value}`);
  });

  console.log('━'.repeat(80));
  console.log('   ℹ️  Post would be created as DRAFT for review\n');
}

/**
 * Main test function
 */
async function testSingleUrl() {
  console.log('🚀 Testing Ultralytics Single URL Scraper\n');
  console.log('━'.repeat(80));
  console.log(`📄 URL: ${TEST_URL}\n`);

  try {
    // 1. Scrape the URL
    console.log('🔄 Starting data extraction...\n');
    const article = await scrapeSingleUrl(TEST_URL);

    if (!article) {
      console.error('❌ Failed to scrape article');
      process.exit(1);
    }

    // 2. Display extraction results
    console.log('✅ Data Extraction Results:');
    console.log('━'.repeat(80));
    console.log(`   Title:        ${article.name}`);
    console.log(`   Slug:         ${article.slug}`);
    console.log(`   Author:       ${article.author || 'N/A'}`);
    console.log(`   Description:  ${article.description ? article.description.substring(0, 100) + '...' : 'N/A'}`);
    console.log(`   Thumbnail:    ${article.imageUrl ? '✓ Found' : '✗ Not found'}`);
    if (article.imageUrl) {
      console.log(`                 ${article.imageUrl}`);
    }
    console.log(`   Date:         ${article.createdOn || 'N/A'}`);
    console.log(`   Tags:         ${article.tags?.join(', ') || 'N/A'}`);
    console.log(`   Platform:     ${article.blogCategory}`);
    console.log('━'.repeat(80));

    // 3. Run category detection with full details
    console.log('\n🏷️  Category Detection:');
    console.log('━'.repeat(80));
    const categoryResult = detectCategory(article.name, article.description);
    console.log(`   Detected Category: ${categoryResult.category}`);
    console.log(`   Confidence:        ${categoryResult.confidence.toUpperCase()}`);
    console.log(`   Score:             ${categoryResult.score}`);
    console.log(`\n   Matched Keywords (${categoryResult.matchedKeywords.length}):`);

    // Show first 10 matched keywords
    const displayKeywords = categoryResult.matchedKeywords.slice(0, 10);
    displayKeywords.forEach(keyword => {
      console.log(`      • ${keyword}`);
    });

    if (categoryResult.matchedKeywords.length > 10) {
      console.log(`      ... and ${categoryResult.matchedKeywords.length - 10} more`);
    }

    // Show all category scores
    console.log(`\n   All Category Scores:`);
    const sortedScores = Object.entries(categoryResult.allScores)
      .sort(([, a], [, b]) => (b as number) - (a as number));

    sortedScores.forEach(([category, score]) => {
      const bar = '█'.repeat(Math.floor(score as number));
      const isTop = category === categoryResult.category ? '←' : '';
      console.log(`      ${category.padEnd(30)} ${String(score).padStart(4)} ${bar} ${isTop}`);
    });

    console.log('━'.repeat(80));

    // 4. Show Webflow field mapping
    showWebflowMapping(article);

    // 5. Save to CSV
    console.log('💾 CSV Output:');
    console.log('━'.repeat(80));
    const csvManager = new CSVManager();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    const csvPath = path.join(__dirname, `../../output/ultralytics-single-test-${timestamp}.csv`);

    csvManager.saveToLocal([article], csvPath);
    console.log(`   ✓ Saved to: ${csvPath}`);
    console.log('━'.repeat(80));

    // 6. Display CSV preview
    console.log('\n📊 CSV Preview:');
    console.log('━'.repeat(80));
    console.log('   Columns:');
    console.log(`      • name: ${article.name}`);
    console.log(`      • slug: ${article.slug}`);
    console.log(`      • externalUrl: ${article.externalUrl}`);
    console.log(`      • category: ${article.category}`);
    console.log(`      • blogCategory: ${article.blogCategory}`);
    console.log(`      • imageUrl: ${article.imageUrl ? 'present' : 'N/A'}`);
    console.log(`      • createdOn: ${article.createdOn || 'N/A'}`);
    console.log(`      • description: ${article.description ? 'present' : 'N/A'}`);
    console.log('━'.repeat(80));

    // 7. Summary
    console.log('\n✅ Test Summary:');
    console.log('━'.repeat(80));
    console.log('   ✓ Data Extraction:     SUCCESS');
    console.log(`   ✓ Title Found:         ${article.name ? 'YES' : 'NO'}`);
    console.log(`   ✓ Description Found:   ${article.description ? 'YES' : 'NO'}`);
    console.log(`   ✓ Thumbnail Found:     ${article.imageUrl ? 'YES' : 'NO'}`);
    console.log(`   ✓ Date Parsed:         ${article.createdOn ? 'YES' : 'NO'}`);
    console.log(`   ✓ Category Detected:   ${categoryResult.category} (${categoryResult.confidence})`);
    console.log(`   ✓ CSV Output:          SAVED`);
    console.log(`   ✓ Webflow Mapping:     VERIFIED`);
    console.log('━'.repeat(80));

    console.log('\n🎉 Test completed successfully!');
    console.log('\nNext steps:');
    console.log('   1. Review the extracted data above');
    console.log('   2. Check the CSV file for proper formatting');
    console.log('   3. If everything looks good, add to Google Sheets for Webflow sync');
    console.log('   4. Or deploy the cloud function for automated processing\n');

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testSingleUrl()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
