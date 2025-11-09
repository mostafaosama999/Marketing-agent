/**
 * Base Profile Scraper
 * Abstract class defining the interface for all profile scrapers
 */

export interface ScrapedArticle {
  name: string;
  slug: string;
  externalUrl: string;
  createdOn?: string;
  lastEdited?: string;
  description?: string;
  imageUrl?: string;
  author?: string;
  tags?: string[];
}

export interface ScraperConfig {
  profileUrl: string;
  maxArticles?: number;
  includeMetadata?: boolean;
}

export interface ScraperStats {
  scraperName: string;
  profileUrl: string;
  totalScraped: number;
  successCount: number;
  failureCount: number;
  startTime: Date;
  endTime?: Date;
  errors: string[];
}

export abstract class BaseProfileScraper {
  protected config: ScraperConfig;
  protected stats: ScraperStats;

  constructor(config: ScraperConfig) {
    this.config = config;
    this.stats = {
      scraperName: this.getScraperName(),
      profileUrl: config.profileUrl,
      totalScraped: 0,
      successCount: 0,
      failureCount: 0,
      startTime: new Date(),
      errors: [],
    };
  }

  /**
   * Main scraping method - must be implemented by each scraper
   */
  abstract scrape(): Promise<ScrapedArticle[]>;

  /**
   * Get the name of the scraper (e.g., "W&B", "Medium", "Dev.to")
   */
  abstract getScraperName(): string;

  /**
   * Get the platform identifier (e.g., "wandb", "medium", "devto")
   */
  abstract getPlatformId(): string;

  /**
   * Validate scraper configuration
   */
  protected validateConfig(): void {
    if (!this.config.profileUrl) {
      throw new Error(`${this.getScraperName()}: Profile URL is required`);
    }
  }

  /**
   * Get scraper statistics
   */
  getStats(): ScraperStats {
    return {
      ...this.stats,
      endTime: this.stats.endTime || new Date(),
    };
  }

  /**
   * Reset statistics
   */
  protected resetStats(): void {
    this.stats = {
      scraperName: this.getScraperName(),
      profileUrl: this.config.profileUrl,
      totalScraped: 0,
      successCount: 0,
      failureCount: 0,
      startTime: new Date(),
      errors: [],
    };
  }

  /**
   * Record an error
   */
  protected recordError(error: string | Error): void {
    const errorMessage = error instanceof Error ? error.message : error;
    this.stats.errors.push(errorMessage);
    this.stats.failureCount++;
    console.error(`[${this.getScraperName()}] Error:`, errorMessage);
  }

  /**
   * Record a success
   */
  protected recordSuccess(): void {
    this.stats.successCount++;
  }

  /**
   * Generate a slug from a title
   */
  protected generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Clean and normalize text
   */
  protected cleanText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, ' ');
  }

  /**
   * Execute the scraping with error handling and stats tracking
   */
  async execute(): Promise<ScrapedArticle[]> {
    try {
      this.validateConfig();
      this.resetStats();

      console.log(`[${this.getScraperName()}] Starting scrape of ${this.config.profileUrl}`);

      const articles = await this.scrape();

      this.stats.totalScraped = articles.length;
      this.stats.endTime = new Date();

      console.log(`[${this.getScraperName()}] Completed. Scraped ${articles.length} articles`);
      console.log(`[${this.getScraperName()}] Stats:`, this.getStats());

      return articles;
    } catch (error) {
      this.recordError(error as Error);
      this.stats.endTime = new Date();

      console.error(`[${this.getScraperName()}] Fatal error:`, error);
      throw error;
    }
  }
}
