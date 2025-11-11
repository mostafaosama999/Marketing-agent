/**
 * Weights & Biases Profile Scraper
 * Scrapes article reports from W&B profile pages
 */

import * as puppeteer from 'puppeteer';
import {BaseProfileScraper, ScrapedArticle, ScraperConfig} from './baseScraper';
import {detectCategorySimple} from '../utils/categoryDetector';

interface WandBArticleRow {
  title: string;
  url: string;
  imageUrl?: string;
  description?: string;
  createdOn?: string;
  lastEdited?: string;
  views?: number;
}

export class WandBScraper extends BaseProfileScraper {
  constructor(config: ScraperConfig) {
    super(config);
  }

  getScraperName(): string {
    return 'Weights & Biases';
  }

  getPlatformId(): string {
    return 'wandb';
  }

  /**
   * Extract slug from W&B report URL
   * Example: https://wandb.ai/.../reports/Building-a-RAG-System--Vmlldzo4MDI5NDc4
   * Returns: building-a-rag-system
   */
  private extractSlugFromUrl(url: string): string {
    try {
      const urlParts = url.split('/reports/');
      if (urlParts.length > 1) {
        const reportPart = urlParts[1];
        // Remove the ID part after the double dash
        const titlePart = reportPart.split('--')[0];
        return titlePart.toLowerCase();
      }
      // Fallback: generate from title
      return '';
    } catch (error) {
      console.warn('Failed to extract slug from URL:', url);
      return '';
    }
  }

  /**
   * Parse relative date to absolute date
   * Examples: "4 months ago", "1 year ago", "2024-05-20"
   */
  private parseDate(dateStr: string): string {
    if (!dateStr) return '';

    // Already in YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      return dateStr;
    }

    // Parse relative dates
    const now = new Date();
    const match = dateStr.match(/(\d+)\s+(month|year|day|week)s?\s+ago/i);

    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();

      switch (unit) {
        case 'day':
          now.setDate(now.getDate() - value);
          break;
        case 'week':
          now.setDate(now.getDate() - (value * 7));
          break;
        case 'month':
          now.setMonth(now.getMonth() - value);
          break;
        case 'year':
          now.setFullYear(now.getFullYear() - value);
          break;
      }

      return now.toISOString().split('T')[0];
    }

    return dateStr;
  }

  /**
   * Extract thumbnail image from individual report page
   */
  private async extractThumbnailFromReportPage(
    browser: puppeteer.Browser,
    reportUrl: string,
    articleTitle: string
  ): Promise<string | undefined> {
    let page: puppeteer.Page | null = null;

    try {
      page = await browser.newPage();
      await page.setViewport({width: 1920, height: 1080});

      console.log(`  → Loading ${articleTitle.substring(0, 50)}...`);

      await page.goto(reportUrl, {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });

      // Wait a bit for images to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Extract thumbnail using multiple strategies
      const imageUrl = await page.evaluate(() => {
        // Strategy 1: Open Graph meta tag (most reliable)
        const ogImage = document.querySelector('meta[property="og:image"]');
        if (ogImage) {
          const content = ogImage.getAttribute('content');
          if (content) return content;
        }

        // Strategy 2: Twitter card image
        const twitterImage = document.querySelector('meta[name="twitter:image"]');
        if (twitterImage) {
          const content = twitterImage.getAttribute('content');
          if (content) return content;
        }

        // Strategy 3: First large image in main content area
        const contentImages = document.querySelectorAll('main img, article img, [role="main"] img');
        for (const img of Array.from(contentImages)) {
          const htmlImg = img as HTMLImageElement;
          // Check if image is large enough to be a featured image
          if (htmlImg.naturalWidth > 400 || htmlImg.width > 400) {
            return htmlImg.src;
          }
        }

        // Strategy 4: Any img with 'cover' or 'featured' or 'thumbnail' in class/id
        const featuredImg = document.querySelector(
          'img[class*="cover"], img[class*="featured"], img[class*="thumbnail"], img[id*="cover"]'
        );
        if (featuredImg) {
          return (featuredImg as HTMLImageElement).src;
        }

        return null;
      });

      if (imageUrl) {
        console.log(`  ✓ Found thumbnail`);
      } else {
        console.log(`  ⚠ No thumbnail found`);
      }

      return imageUrl || undefined;
    } catch (error) {
      console.warn(`  ✗ Failed to extract thumbnail: ${(error as Error).message}`);
      return undefined;
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
   * Main scraping method using Puppeteer
   */
  async scrape(): Promise<ScrapedArticle[]> {
    let browser: puppeteer.Browser | null = null;

    try {
      console.log(`[${this.getScraperName()}] Launching browser...`);

      // Launch browser with minimal configuration for Cloud Functions
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      const page = await browser.newPage();

      // Set viewport
      await page.setViewport({width: 1920, height: 1080});

      // Set user agent to avoid bot detection
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      console.log(`[${this.getScraperName()}] Navigating to ${this.config.profileUrl}...`);

      // Navigate to the reports list page
      await page.goto(this.config.profileUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      // Wait for the reports table/list to load
      console.log(`[${this.getScraperName()}] Waiting for content to load...`);

      // Try multiple possible selectors for W&B reports
      const possibleSelectors = [
        '[data-test="report-row"]',
        '.report-row',
        'table tbody tr',
        '[role="row"]',
        'div[class*="report"]',
      ];

      let contentLoaded = false;
      for (const selector of possibleSelectors) {
        try {
          await page.waitForSelector(selector, {timeout: 10000});
          console.log(`[${this.getScraperName()}] Found content using selector: ${selector}`);
          contentLoaded = true;
          break;
        } catch (e) {
          // Try next selector
          continue;
        }
      }

      if (!contentLoaded) {
        console.warn(`[${this.getScraperName()}] Could not find content with known selectors, trying page evaluation...`);
      }

      // Give extra time for dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Extract all report data from the page
      const articles = await page.evaluate(() => {
        const results: WandBArticleRow[] = [];

        // W&B uses direct links for each report
        const reportLinks = document.querySelectorAll('a[href*="/reports/"]');

        reportLinks.forEach((link) => {
          try {
            const anchorElement = link as HTMLAnchorElement;
            const title = anchorElement.textContent?.trim() || '';
            const href = anchorElement.href;

            if (title && href) {
              results.push({
                title,
                url: href,
                description: '', // W&B doesn't show descriptions on list page
                createdOn: '', // Dates would need more complex scraping
                lastEdited: '',
                views: 0,
              });
            }
          } catch (error) {
            console.error('Error parsing link:', error);
          }
        });

        return results;
      });

      console.log(`[${this.getScraperName()}] Extracted ${articles.length} raw articles`);

      // Close the list page - we're done with it
      await page.close();

      // Extract thumbnails from individual report pages
      console.log(`\n[${this.getScraperName()}] 📸 Extracting thumbnails from individual pages...\n`);

      for (let i = 0; i < articles.length; i++) {
        const article = articles[i];

        console.log(`[${i + 1}/${articles.length}]`, article.title.substring(0, 60));

        // Extract thumbnail
        article.imageUrl = await this.extractThumbnailFromReportPage(
          browser,
          article.url,
          article.title
        );

        // Add delay between requests to avoid rate limiting
        if (i < articles.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
        }
      }

      // Close browser after all thumbnails are extracted
      await browser.close();
      browser = null;

      // Count successful thumbnail extractions
      const thumbnailsFound = articles.filter(a => a.imageUrl).length;
      console.log(`\n✅ Successfully extracted ${thumbnailsFound}/${articles.length} thumbnails\n`);

      // Transform to ScrapedArticle format
      const scrapedArticles: ScrapedArticle[] = articles.map((article) => {
        const slug = this.extractSlugFromUrl(article.url) || this.generateSlug(article.title);

        this.recordSuccess();

        // Auto-detect category based on article title and description
        const detectedCategory = detectCategorySimple(
          article.title,
          article.description
        );

        return {
          name: this.cleanText(article.title),
          slug: slug,
          externalUrl: article.url,
          imageUrl: article.imageUrl || undefined,
          description: article.description ? this.cleanText(article.description) : undefined,
          createdOn: article.createdOn ? this.parseDate(article.createdOn) : undefined,
          lastEdited: article.lastEdited ? this.parseDate(article.lastEdited) : undefined,
          category: detectedCategory, // Auto-detected content category
          blogCategory: 'W&B', // Source platform
        };
      });

      // Apply max articles limit if specified
      const limitedArticles = this.config.maxArticles ?
        scrapedArticles.slice(0, this.config.maxArticles) :
        scrapedArticles;

      console.log(`[${this.getScraperName()}] Successfully processed ${limitedArticles.length} articles`);

      return limitedArticles;
    } catch (error) {
      this.recordError(error as Error);
      throw new Error(`Failed to scrape W&B profile: ${(error as Error).message}`);
    } finally {
      // Ensure browser is closed
      if (browser) {
        try {
          await browser.close();
        } catch (e) {
          console.error('Error closing browser:', e);
        }
      }
    }
  }

  /**
   * Scrape with retry logic
   */
  async scrapeWithRetry(maxRetries = 3): Promise<ScrapedArticle[]> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`[${this.getScraperName()}] Attempt ${attempt}/${maxRetries}`);
        return await this.execute();
      } catch (error) {
        lastError = error as Error;
        console.error(`[${this.getScraperName()}] Attempt ${attempt} failed:`, error);

        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000); // Exponential backoff
          console.log(`[${this.getScraperName()}] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw new Error(`Failed after ${maxRetries} attempts: ${lastError?.message}`);
  }
}
