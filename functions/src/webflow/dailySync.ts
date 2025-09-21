import * as functions from 'firebase-functions';
import { createUrlProcessor, ProcessingStats } from './urlProcessor';

// Google Sheet URL containing URLs in column A
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/19-jLtmvO0x177GH91ur0gPoK_OQd6ozqirgk4JqPFHo/edit?gid=0#gid=0';

/**
 * Daily cron job to sync URLs from Google Sheet to Webflow with content extraction & LinkedIn generation
 * Runs every day at 9:00 AM UTC
 */
export const dailyWebflowSync = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes timeout for the enhanced pipeline
    memory: '2GB' // Increased memory for content processing
  })
  .pubsub
  .schedule('0 9 * * *') // Daily at 9 AM UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    console.log('\n📅 SCHEDULED ENHANCED WEBFLOW SYNC TRIGGERED');
    console.log('🔧 Pipeline: Content Extraction → LinkedIn Generation → Google Doc Update → Webflow Creation');
    console.log(`⏰ Triggered at: ${new Date().toISOString()}`);
    console.log(`📊 Context:`, JSON.stringify(context, null, 2));

    try {
      const result = await performWebflowSync();
      console.log('\n✅ Scheduled sync completed successfully');
      return result;
    } catch (error) {
      console.error('\n❌ Scheduled sync failed:', error);
      throw error;
    }
  });

/**
 * Enhanced sync logic with content extraction, LinkedIn generation, and Google Doc updates
 */
async function performWebflowSync(): Promise<any> {
  const startTime = Date.now();
  console.log('\n🚀 ENHANCED WEBFLOW SYNC STARTED');
  console.log('🔧 Pipeline: Content Extraction → LinkedIn Generation → Google Doc Update → Webflow Creation');
  console.log(`⏰ Execution started at: ${new Date().toISOString()}`);
  console.log(`📊 Sheet URL: ${SHEET_URL}`);

  let stats: ProcessingStats | null = null;

  try {
    console.log('\n🔧 Initializing URL processor...');
    const urlProcessor = createUrlProcessor();

    // Process all URLs from the sheet with enhanced pipeline
    console.log('\n📋 Starting enhanced URL processing from Google Sheet...');
    stats = await urlProcessor.processAllUrls(SHEET_URL);

    // Log final results
    const executionTime = Date.now() - startTime;
    console.log('\n🎉 ENHANCED WEBFLOW SYNC COMPLETED SUCCESSFULLY');
    console.log(`⏱️ Total execution time: ${executionTime}ms (${(executionTime / 1000).toFixed(2)}s)`);
    console.log(`📊 Final Stats:`);
    console.log(`   📈 Total URLs processed: ${stats.totalUrls}`);
    console.log(`   ✅ Already existing URLs: ${stats.existingUrls}`);
    console.log(`   🆕 Newly created blog posts: ${stats.newlyCreated}`);
    console.log(`   ❌ General errors: ${stats.errors}`);
    console.log(`📖 Content extraction: Success=${stats.contentExtractionSuccesses}, Failed=${stats.contentExtractionFailures}`);
    console.log(`🤖 LinkedIn generation: Success=${stats.linkedinGenerationSuccesses}, Failed=${stats.linkedinGenerationFailures}`);
    console.log(`📝 Google Doc updates: Success=${stats.docUpdateSuccesses}, Failed=${stats.docUpdateFailures}`);

    // Log detailed results for debugging
    if (stats.results.length > 0) {
      console.log('\n📋 Detailed Results:');
      stats.results.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.url}:`);
        console.log(`      - Exists: ${result.exists}`);
        console.log(`      - Created: ${result.created}`);
        if (result.error) {
          console.log(`      - Error: ${result.error}`);
        }
        if (result.blogPost) {
          console.log(`      - Blog Post ID: ${result.blogPost._id}`);
        }
      });
    }

    // Log success metrics for monitoring
    console.log('\n📊 SYNC METRICS:');
    console.log(`SUCCESS_RATE: ${stats.totalUrls > 0 ? ((stats.totalUrls - stats.errors) / stats.totalUrls * 100).toFixed(2) : 100}%`);
    console.log(`NEW_POSTS_CREATED: ${stats.newlyCreated}`);
    console.log(`EXECUTION_TIME_MS: ${executionTime}`);

    return {
      success: true,
      executionTime,
      stats
    };

  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('\n❌ WEBFLOW SYNC FAILED');
    console.error(`⏱️ Failed after: ${executionTime}ms (${(executionTime / 1000).toFixed(2)}s)`);
    console.error(`💥 Error:`, error);

    // Log error details for debugging
    if (error instanceof Error) {
      console.error(`📄 Error name: ${error.name}`);
      console.error(`📝 Error message: ${error.message}`);
      console.error(`📚 Error stack:`, error.stack);
    }

    // Log partial stats if available
    if (stats) {
      console.error(`📊 Partial Stats before failure:`);
      console.error(`   📈 URLs processed so far: ${stats.results.length}`);
      console.error(`   ✅ Existing URLs: ${stats.existingUrls}`);
      console.error(`   🆕 Created URLs: ${stats.newlyCreated}`);
      console.error(`   ❌ Errors: ${stats.errors}`);
    }

    // Log failure metrics for monitoring
    console.error('\n📊 FAILURE METRICS:');
    console.error(`EXECUTION_TIME_MS: ${executionTime}`);
    console.error(`ERROR_TYPE: ${error instanceof Error ? error.name : 'UnknownError'}`);

    throw error;
  }
}

