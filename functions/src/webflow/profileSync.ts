/**
 * Profile Scraper Sync Function
 * Orchestrates scraping from profile pages and syncing to Webflow
 */

import * as functions from 'firebase-functions';
import {WandBScraper} from '../scrapers/wandbScraper';
import {CSVManager, getBucketName} from '../utils/csvManager';
import {createWebflowAPI, SyncStats} from '../utils/webflowUtils';

interface ProfileSyncResult {
  success: boolean;
  scrapeStats: {
    scraperName: string;
    totalScraped: number;
    successCount: number;
    failureCount: number;
    errors: string[];
  };
  csvUrl?: string;
  webflowStats?: SyncStats;
  error?: string;
  executionTime: number;
}

/**
 * Get W&B profile URL from config or use default
 */
function getWandBProfileUrl(): string {
  try {
    const configUrl = functions.config().scraper?.wandb_profile_url;
    if (configUrl) {
      return configUrl;
    }
  } catch (error) {
    console.warn('Could not read scraper config, using default URL');
  }

  // Default URL
  return 'https://wandb.ai/mostafaibrahim17/ml-articles/reportlist';
}

/**
 * Main sync function logic
 */
async function performProfileSync(): Promise<ProfileSyncResult> {
  const startTime = Date.now();

  try {
    console.log('🚀 Starting Profile Scraper Sync...');
    console.log('⏰ Started at:', new Date().toISOString());

    // Step 1: Initialize scraper
    console.log('\n📡 Step 1: Initializing W&B scraper...');
    const wandbUrl = getWandBProfileUrl();
    const scraper = new WandBScraper({
      profileUrl: wandbUrl,
      maxArticles: undefined, // No limit, scrape all
      includeMetadata: true,
    });

    // Step 2: Scrape articles
    console.log('\n🔍 Step 2: Scraping articles from W&B...');
    console.log(`📍 Profile URL: ${wandbUrl}`);

    const articles = await scraper.scrapeWithRetry(3);
    const scrapeStats = scraper.getStats();

    console.log(`✅ Scraped ${articles.length} articles successfully`);

    if (articles.length === 0) {
      console.warn('⚠️  No articles scraped, aborting sync');
      return {
        success: false,
        scrapeStats,
        error: 'No articles scraped',
        executionTime: Date.now() - startTime,
      };
    }

    // Step 3: Save to CSV
    console.log('\n💾 Step 3: Saving articles to CSV...');
    const csvManager = new CSVManager(getBucketName());
    const timestamp = new Date().toISOString().split('T')[0];
    const csvFileName = `wandb-articles-${timestamp}.csv`;

    const csvUrl = await csvManager.saveToCloudStorage(
      articles,
      csvFileName,
      {
        scraper: 'wandb',
        profileUrl: wandbUrl,
      }
    );

    console.log(`✅ CSV saved: ${csvUrl}`);

    // Step 4: Sync to Webflow
    console.log('\n🔄 Step 4: Syncing to Webflow...');
    const webflowAPI = createWebflowAPI();
    const webflowStats = await webflowAPI.syncFromCSV(articles);

    console.log('✅ Webflow sync completed');
    console.log(`   Created: ${webflowStats.created}`);
    console.log(`   Skipped: ${webflowStats.skipped}`);
    console.log(`   Failed: ${webflowStats.failed}`);

    // Step 5: Summary
    const executionTime = Date.now() - startTime;
    console.log('\n📊 Sync Summary:');
    console.log(`   Total articles scraped: ${articles.length}`);
    console.log(`   New articles created: ${webflowStats.created}`);
    console.log(`   Duplicates skipped: ${webflowStats.skipped}`);
    console.log(`   Failed: ${webflowStats.failed}`);
    console.log(`   Execution time: ${(executionTime / 1000).toFixed(2)}s`);
    console.log(`   CSV location: ${csvUrl}`);

    return {
      success: true,
      scrapeStats,
      csvUrl,
      webflowStats,
      executionTime,
    };
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('❌ Profile sync failed:', error);

    return {
      success: false,
      scrapeStats: {
        scraperName: 'W&B',
        totalScraped: 0,
        successCount: 0,
        failureCount: 1,
        errors: [(error as Error).message],
      },
      error: (error as Error).message,
      executionTime,
    };
  }
}

/**
 * Scheduled Cloud Function - Runs daily at 9 AM UTC
 * Can be changed to different schedule as needed
 */
export const profileScraperSync = functions
  .runWith({
    timeoutSeconds: 300, // 5 minutes timeout
    memory: '2GB',
  })
  .pubsub
  .schedule('0 9 * * *') // Daily at 9 AM UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('🔔 Scheduled Profile Scraper Sync triggered');
    console.log(`📅 Scheduled time: ${context.timestamp}`);

    const result = await performProfileSync();

    if (result.success) {
      console.log('✅ Profile scraper sync completed successfully');
    } else {
      console.error('❌ Profile scraper sync failed:', result.error);
    }

    return result;
  });

/**
 * Export the sync logic for manual trigger use
 */
export async function executeProfileSync(): Promise<ProfileSyncResult> {
  return performProfileSync();
}
