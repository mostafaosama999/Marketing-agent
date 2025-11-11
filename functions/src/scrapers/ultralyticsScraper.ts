/**
 * Ultralytics Profile Scraper
 * Scrapes blog posts from Ultralytics author profile pages
 */

import * as puppeteer from 'puppeteer';
import {BaseProfileScraper, ScrapedArticle, ScraperConfig} from './baseScraper';
import {detectCategorySimple} from '../utils/categoryDetector';

interface UltralyticsArticleRow {
  title: string;
  url: string;
  imageUrl?: string;
  date?: string;
  readTime?: string;
  tag?: string; // Ultralytics YOLO, Vision AI, etc.
}

export class UltralyticsScraper extends BaseProfileScraper {
  constructor(config: ScraperConfig) {
    super(config);
  }

  getScraperName(): string {
    return 'UltralyticsScraper';
  }

  getPlatformId(): string {
    return 'ultralytics';
  }

  /**
   * Scrape articles from Ultralytics author profile
   */
  async scrape(): Promise<ScrapedArticle[]> {
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

      console.log(`[${this.getScraperName()}] Navigating to: ${this.config.profileUrl}`);

      await page.goto(this.config.profileUrl, {
        waitUntil: 'networkidle2',
        timeout: 60000,
      });

      console.log(`[${this.getScraperName()}] Page loaded, extracting blog URLs...`);

      // Extract all blog URLs from profile page
      const blogLinks = await page.evaluate(() => {
        // Find all links that match the blog pattern
        const links = Array.from(document.querySelectorAll('a[href*="/blog/"]'));

        // Extract unique blog URLs
        const uniqueUrls = new Set<string>();

        links.forEach((link) => {
          const href = (link as HTMLAnchorElement).href;
          // Only include main blog posts, not category pages
          if (href.includes('/blog/') && !href.includes('/blog-category/')) {
            uniqueUrls.add(href);
          }
        });

        return Array.from(uniqueUrls);
      });

      console.log(`[${this.getScraperName()}] Found ${blogLinks.length} blog posts`);

      // Extract article data by visiting each blog page
      const articles: UltralyticsArticleRow[] = [];

      for (let i = 0; i < blogLinks.length; i++) {
        const url = blogLinks[i];

        // Apply max articles limit
        if (this.config.maxArticles && i >= this.config.maxArticles) {
          console.log(`[${this.getScraperName()}] Reached maxArticles limit: ${this.config.maxArticles}`);
          break;
        }

        console.log(`\n[${this.getScraperName()}] [${i + 1}/${blogLinks.length}] Fetching: ${url}`);

        try {
          await page.goto(url, {
            waitUntil: 'networkidle2',
            timeout: 30000,
          });

          // Extract article data
          const articleData = await page.evaluate(() => {
            // Extract title
            const titleElement = document.querySelector('h1');
            const title = titleElement ? titleElement.textContent?.trim() : '';

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

            return {
              title: title || '',
              imageUrl: imageUrl || '',
              date: date || '',
              tag: tag || '',
            };
          });

          articles.push({
            title: articleData.title,
            url: url,
            imageUrl: articleData.imageUrl,
            date: articleData.date,
            tag: articleData.tag,
          });

          console.log(`   ✓ Title: ${articleData.title}`);
          console.log(`   ✓ Image: ${articleData.imageUrl ? 'Found' : 'Not found'}`);
          console.log(`   ✓ Date: ${articleData.date || 'N/A'}`);
          console.log(`   ✓ Tag: ${articleData.tag || 'N/A'}`);

          // Small delay to be respectful
          await new Promise(resolve => setTimeout(resolve, 500));

        } catch (error) {
          console.error(`   ❌ Error fetching article: ${error}`);
          this.recordError(error as Error);
        }
      }

      console.log(`\n✅ Successfully extracted ${articles.length} articles`);

      // Count thumbnails
      const thumbnailsFound = articles.filter(a => a.imageUrl).length;
      console.log(`\n✅ Successfully extracted ${thumbnailsFound}/${articles.length} thumbnails\n`);

      // Transform to ScrapedArticle format
      const scrapedArticles: ScrapedArticle[] = articles.map((article) => {
        const slug = this.extractSlugFromUrl(article.url) || this.generateSlug(article.title);

        // Auto-detect content category based on title
        const detectedCategory = detectCategorySimple(article.title, undefined);

        this.recordSuccess();

        return {
          name: this.cleanText(article.title),
          slug: slug,
          externalUrl: article.url,
          imageUrl: article.imageUrl || undefined,
          createdOn: article.date ? this.parseDate(article.date) : undefined,
          category: detectedCategory, // Auto-detected content category
          blogCategory: 'Ultralytics', // Source platform
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
      console.error(`[${this.getScraperName()}] Scraping failed:`, error);
      throw error;
    } finally {
      await browser.close();
    }
  }

  /**
   * Extract slug from Ultralytics blog URL
   * Format: https://www.ultralytics.com/blog/ai-in-self-driving-cars
   */
  private extractSlugFromUrl(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/').filter(p => p.length > 0);

      // Format: /blog/[slug]
      if (pathParts.length >= 2 && pathParts[0] === 'blog') {
        return pathParts[1];
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse Ultralytics date format: "September 25, 2024"
   */
  private parseDate(dateStr: string): string {
    try {
      const date = new Date(dateStr);
      return date.toISOString();
    } catch (error) {
      return new Date().toISOString();
    }
  }
}
