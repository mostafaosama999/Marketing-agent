/**
 * Scraper Registry
 * Central registry for managing multiple profile scrapers
 */

import {BaseProfileScraper, ScrapedArticle, ScraperConfig} from './baseScraper';
import {WandBScraper} from './wandbScraper';
import * as functions from 'firebase-functions';

export interface RegisteredScraper {
  id: string;
  name: string;
  platformId: string;
  enabled: boolean;
  configKey: string; // Firebase config key for profile URL
  scraperClass: new (config: ScraperConfig) => BaseProfileScraper;
}

export interface MultiScraperResult {
  totalArticles: number;
  articlesByScraper: {
    [scraperName: string]: number;
  };
  articles: ScrapedArticle[];
  errors: {
    [scraperName: string]: string[];
  };
}

/**
 * Registry of all available scrapers
 */
const SCRAPER_REGISTRY: RegisteredScraper[] = [
  {
    id: 'wandb',
    name: 'Weights & Biases',
    platformId: 'wandb',
    enabled: true,
    configKey: 'scraper.wandb_profile_url',
    scraperClass: WandBScraper,
  },
  // Future scrapers can be added here:
  // {
  //   id: 'medium',
  //   name: 'Medium',
  //   platformId: 'medium',
  //   enabled: false,
  //   configKey: 'scraper.medium_profile_url',
  //   scraperClass: MediumScraper,
  // },
  // {
  //   id: 'devto',
  //   name: 'Dev.to',
  //   platformId: 'devto',
  //   enabled: false,
  //   configKey: 'scraper.devto_profile_url',
  //   scraperClass: DevToScraper,
  // },
];

/**
 * Scraper Registry Manager
 */
export class ScraperRegistry {
  /**
   * Get all registered scrapers
   */
  static getAllScrapers(): RegisteredScraper[] {
    return SCRAPER_REGISTRY;
  }

  /**
   * Get enabled scrapers only
   */
  static getEnabledScrapers(): RegisteredScraper[] {
    return SCRAPER_REGISTRY.filter(s => s.enabled);
  }

  /**
   * Get a scraper by ID
   */
  static getScraperById(id: string): RegisteredScraper | undefined {
    return SCRAPER_REGISTRY.find(s => s.id === id);
  }

  /**
   * Get profile URL from Firebase config
   */
  private static getProfileUrl(configKey: string, defaultUrl?: string): string | null {
    try {
      const keys = configKey.split('.');
      let config: any = functions.config();

      for (const key of keys) {
        config = config[key];
        if (!config) break;
      }

      return config || defaultUrl || null;
    } catch (error) {
      console.warn(`Could not read config key: ${configKey}`);
      return defaultUrl || null;
    }
  }

  /**
   * Create a scraper instance
   */
  static createScraper(
    scraperId: string,
    options?: {
      profileUrl?: string;
      maxArticles?: number;
      includeMetadata?: boolean;
    }
  ): BaseProfileScraper | null {
    const scraperDef = this.getScraperById(scraperId);

    if (!scraperDef) {
      console.error(`Scraper not found: ${scraperId}`);
      return null;
    }

    // Get profile URL from options or config
    const profileUrl = options?.profileUrl ||
      this.getProfileUrl(scraperDef.configKey) ||
      '';

    if (!profileUrl) {
      console.error(`No profile URL configured for scraper: ${scraperId}`);
      return null;
    }

    const config: ScraperConfig = {
      profileUrl,
      maxArticles: options?.maxArticles,
      includeMetadata: options?.includeMetadata ?? true,
    };

    return new scraperDef.scraperClass(config);
  }

  /**
   * Run all enabled scrapers
   */
  static async runAllScrapers(options?: {
    maxArticlesPerScraper?: number;
    includeMetadata?: boolean;
  }): Promise<MultiScraperResult> {
    const result: MultiScraperResult = {
      totalArticles: 0,
      articlesByScraper: {},
      articles: [],
      errors: {},
    };

    const enabledScrapers = this.getEnabledScrapers();

    if (enabledScrapers.length === 0) {
      console.warn('No enabled scrapers found');
      return result;
    }

    console.log(`🚀 Running ${enabledScrapers.length} enabled scrapers...`);

    // Run scrapers in sequence (to avoid resource overload)
    for (const scraperDef of enabledScrapers) {
      try {
        console.log(`\n📡 Running ${scraperDef.name} scraper...`);

        const scraper = this.createScraper(scraperDef.id, {
          maxArticles: options?.maxArticlesPerScraper,
          includeMetadata: options?.includeMetadata,
        });

        if (!scraper) {
          result.errors[scraperDef.name] = ['Failed to create scraper instance'];
          continue;
        }

        const articles = await scraper.execute();
        const stats = scraper.getStats();

        result.articles.push(...articles);
        result.articlesByScraper[scraperDef.name] = articles.length;

        if (stats.errors.length > 0) {
          result.errors[scraperDef.name] = stats.errors;
        }

        console.log(`✅ ${scraperDef.name}: Scraped ${articles.length} articles`);

        // Add delay between scrapers to be polite
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`❌ Failed to run ${scraperDef.name} scraper:`, error);
        result.errors[scraperDef.name] = [(error as Error).message];
      }
    }

    result.totalArticles = result.articles.length;

    console.log(`\n✅ All scrapers completed`);
    console.log(`   Total articles: ${result.totalArticles}`);
    console.log(`   By scraper:`, result.articlesByScraper);

    return result;
  }

  /**
   * Run a specific scraper by ID
   */
  static async runScraper(
    scraperId: string,
    options?: {
      profileUrl?: string;
      maxArticles?: number;
      includeMetadata?: boolean;
    }
  ): Promise<ScrapedArticle[]> {
    const scraper = this.createScraper(scraperId, options);

    if (!scraper) {
      throw new Error(`Failed to create scraper: ${scraperId}`);
    }

    return await scraper.execute();
  }

  /**
   * Get scraper status for all registered scrapers
   */
  static getScraperStatus(): Array<{
    id: string;
    name: string;
    enabled: boolean;
    configured: boolean;
  }> {
    return SCRAPER_REGISTRY.map(scraper => ({
      id: scraper.id,
      name: scraper.name,
      enabled: scraper.enabled,
      configured: this.getProfileUrl(scraper.configKey) !== null,
    }));
  }
}

/**
 * Convenience function to run all scrapers
 */
export async function runAllScrapers(options?: {
  maxArticlesPerScraper?: number;
  includeMetadata?: boolean;
}): Promise<MultiScraperResult> {
  return ScraperRegistry.runAllScrapers(options);
}

/**
 * Convenience function to run a single scraper
 */
export async function runScraper(
  scraperId: string,
  options?: {
    profileUrl?: string;
    maxArticles?: number;
    includeMetadata?: boolean;
  }
): Promise<ScrapedArticle[]> {
  return ScraperRegistry.runScraper(scraperId, options);
}

/**
 * Get status of all scrapers
 */
export function getScraperStatus() {
  return ScraperRegistry.getScraperStatus();
}
