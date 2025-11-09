/**
 * Weights & Biases Profile Scraper
 * Scrapes article reports from W&B profile pages
 */

import * as puppeteer from 'puppeteer';
import {BaseProfileScraper, ScrapedArticle, ScraperConfig} from './baseScraper';

interface WandBArticleRow {
  title: string;
  url: string;
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

        // Try to find reports table
        // W&B typically uses a table or list structure
        const rows = document.querySelectorAll('tr, [data-test="report-row"], [role="row"]');

        rows.forEach((row) => {
          try {
            // Look for title and link
            const linkElement = row.querySelector('a[href*="/reports/"]') as HTMLAnchorElement;

            if (linkElement) {
              const title = linkElement.textContent?.trim() || '';
              const href = linkElement.href;

              // Look for description
              const descElement = row.querySelector('[class*="description"], [class*="summary"]');
              const description = descElement?.textContent?.trim() || '';

              // Look for dates
              const dateElements = row.querySelectorAll('time, [class*="date"]');
              let createdOn = '';
              let lastEdited = '';

              if (dateElements.length >= 1) {
                createdOn = dateElements[0].textContent?.trim() || '';
              }
              if (dateElements.length >= 2) {
                lastEdited = dateElements[1].textContent?.trim() || '';
              }

              // Look for view count
              const viewsElement = row.querySelector('[class*="views"], [class*="count"]');
              const views = viewsElement ? parseInt(viewsElement.textContent?.trim() || '0') : 0;

              if (title && href) {
                results.push({
                  title,
                  url: href,
                  description,
                  createdOn,
                  lastEdited,
                  views,
                });
              }
            }
          } catch (error) {
            console.error('Error parsing row:', error);
          }
        });

        return results;
      });

      console.log(`[${this.getScraperName()}] Extracted ${articles.length} raw articles`);

      // Close browser
      await browser.close();
      browser = null;

      // Transform to ScrapedArticle format
      const scrapedArticles: ScrapedArticle[] = articles.map((article) => {
        const slug = this.extractSlugFromUrl(article.url) || this.generateSlug(article.title);

        this.recordSuccess();

        return {
          name: this.cleanText(article.title),
          slug: slug,
          externalUrl: article.url,
          description: article.description ? this.cleanText(article.description) : undefined,
          createdOn: article.createdOn ? this.parseDate(article.createdOn) : undefined,
          lastEdited: article.lastEdited ? this.parseDate(article.lastEdited) : undefined,
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
