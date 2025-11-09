/**
 * Manual Trigger Functions
 * HTTP callable functions for on-demand scraping and syncing
 */

import * as functions from 'firebase-functions';
import {executeProfileSync} from './profileSync';
import {runScraper, runAllScrapers, getScraperStatus} from '../scrapers/scraperRegistry';
import {CSVManager, getBucketName} from '../utils/csvManager';

/**
 * Manually trigger the profile scraper sync
 * HTTP Callable Function - Can be called from frontend or CLI
 */
export const triggerProfileScraper = functions
  .runWith({
    timeoutSeconds: 300, // 5 minutes
    memory: '2GB',
  })
  .https
  .onCall(async (data, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to trigger scraper'
      );
    }

    // Optionally check for specific roles (CEO/Manager)
    // const db = admin.firestore();
    // const userDoc = await db.collection('users').doc(context.auth.uid).get();
    // const userRole = userDoc.data()?.role;
    // if (!['ceo', 'manager'].includes(userRole)) {
    //   throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
    // }

    console.log('🔔 Manual trigger requested by user:', context.auth.uid);

    try {
      const result = await executeProfileSync();

      if (!result.success) {
        throw new functions.https.HttpsError(
          'internal',
          `Sync failed: ${result.error}`,
          result
        );
      }

      return {
        success: true,
        message: 'Profile scraper sync completed successfully',
        stats: {
          scraped: result.scrapeStats.totalScraped,
          created: result.webflowStats?.created || 0,
          skipped: result.webflowStats?.skipped || 0,
          failed: result.webflowStats?.failed || 0,
        },
        csvUrl: result.csvUrl,
        executionTime: result.executionTime,
      };
    } catch (error) {
      console.error('❌ Manual trigger failed:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Sync failed: ${(error as Error).message}`
      );
    }
  });

/**
 * Run a specific scraper without syncing to Webflow
 * Returns scraped data for preview/testing
 */
export const runScraperOnly = functions
  .runWith({
    timeoutSeconds: 300,
    memory: '2GB',
  })
  .https
  .onCall(async (data, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const {scraperId, maxArticles} = data;

    if (!scraperId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'scraperId is required'
      );
    }

    console.log(`🔍 Running scraper: ${scraperId} (max: ${maxArticles || 'all'})`);

    try {
      const articles = await runScraper(scraperId, {maxArticles});

      // Save to CSV for download
      const csvManager = new CSVManager(getBucketName());
      const timestamp = Date.now();
      const csvFileName = `${scraperId}-preview-${timestamp}.csv`;

      const csvUrl = await csvManager.saveToCloudStorage(articles, csvFileName, {
        scraper: scraperId,
        preview: 'true',
      });

      // Get download URL
      const downloadUrl = await csvManager.getDownloadUrl(csvFileName);

      return {
        success: true,
        scraperId,
        totalArticles: articles.length,
        articles: articles.slice(0, 10), // Return first 10 for preview
        csvUrl,
        downloadUrl,
      };
    } catch (error) {
      console.error(`❌ Scraper failed: ${scraperId}`, error);
      throw new functions.https.HttpsError(
        'internal',
        `Scraper failed: ${(error as Error).message}`
      );
    }
  });

/**
 * Get CSV download URL
 */
export const getCSVDownloadUrl = functions
  .https
  .onCall(async (data, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const {fileName} = data;

    if (!fileName) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'fileName is required'
      );
    }

    try {
      const csvManager = new CSVManager(getBucketName());
      const downloadUrl = await csvManager.getDownloadUrl(fileName);

      return {
        success: true,
        fileName,
        downloadUrl,
        expiresIn: 3600, // 1 hour
      };
    } catch (error) {
      console.error('❌ Failed to generate download URL:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to generate download URL: ${(error as Error).message}`
      );
    }
  });

/**
 * List all CSV files
 */
export const listCSVFiles = functions
  .https
  .onCall(async (data, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    try {
      const csvManager = new CSVManager(getBucketName());
      const files = await csvManager.listCSVFiles();

      return {
        success: true,
        files,
        total: files.length,
      };
    } catch (error) {
      console.error('❌ Failed to list CSV files:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to list files: ${(error as Error).message}`
      );
    }
  });

/**
 * Get status of all scrapers
 */
export const getScraperStatusInfo = functions
  .https
  .onCall(async (data, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    try {
      const status = getScraperStatus();

      return {
        success: true,
        scrapers: status,
        total: status.length,
        enabled: status.filter(s => s.enabled).length,
        configured: status.filter(s => s.configured).length,
      };
    } catch (error) {
      console.error('❌ Failed to get scraper status:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to get status: ${(error as Error).message}`
      );
    }
  });

/**
 * Run all enabled scrapers (for future multi-site support)
 */
export const runAllScrapersManual = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes for multiple scrapers
    memory: '2GB',
  })
  .https
  .onCall(async (data, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }

    const {maxArticlesPerScraper} = data;

    console.log('🚀 Running all enabled scrapers...');

    try {
      const result = await runAllScrapers({
        maxArticlesPerScraper,
        includeMetadata: true,
      });

      // Save combined CSV
      const csvManager = new CSVManager(getBucketName());
      const timestamp = new Date().toISOString().split('T')[0];
      const csvFileName = `all-scrapers-${timestamp}.csv`;

      const csvUrl = await csvManager.saveToCloudStorage(
        result.articles,
        csvFileName,
        {
          scraperType: 'multi',
          totalScrapers: Object.keys(result.articlesByScraper).length.toString(),
        }
      );

      return {
        success: true,
        totalArticles: result.totalArticles,
        articlesByScraper: result.articlesByScraper,
        errors: result.errors,
        csvUrl,
      };
    } catch (error) {
      console.error('❌ Failed to run all scrapers:', error);
      throw new functions.https.HttpsError(
        'internal',
        `Failed to run scrapers: ${(error as Error).message}`
      );
    }
  });
