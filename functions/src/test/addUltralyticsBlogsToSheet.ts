/**
 * Add Ultralytics Blogs to Google Sheets
 * One-time script to extract all blog URLs from Ultralytics profile and add to Google Sheets
 */

import {UltralyticsScraper} from '../scrapers/ultralyticsScraper';
import {appendToTab} from '../utils/sheetsUtils';

// Configuration
const PROFILE_URL = 'https://www.ultralytics.com/authors/mostafa-ibrahim';
const SHEET_ID = '1rMbsnVq8K0n8LpyA3la9-Kri8ZsgsLL0IB6UMciahE8';
const TAB_NAME = 'Input';
const CATEGORY = 'Ultralytics';

async function addUltralyticsBlogsToSheet() {
  console.log('🚀 Adding Ultralytics Blogs to Google Sheets\n');
  console.log('━'.repeat(80));

  try {
    // 1. Display configuration
    console.log('📋 Configuration:');
    console.log(`   Profile URL:  ${PROFILE_URL}`);
    console.log(`   Sheet ID:     ${SHEET_ID}`);
    console.log(`   Tab:          ${TAB_NAME}`);
    console.log(`   Category:     ${CATEGORY}`);
    console.log('━'.repeat(80));

    // 2. Initialize scraper
    console.log('\n🔄 Scraping Ultralytics profile...');
    const scraper = new UltralyticsScraper({
      profileUrl: PROFILE_URL,
      // No maxArticles limit - get all blogs
      includeMetadata: false, // We only need URLs
    });

    // 3. Scrape articles
    const articles = await scraper.scrape();
    console.log(`   ✓ Found ${articles.length} blog posts\n`);

    if (articles.length === 0) {
      console.log('⚠️  No articles found. Exiting.');
      process.exit(0);
    }

    // 4. Format data for Google Sheets
    // Columns: URL | Category | Published
    const rows: string[][] = articles.map(article => [
      article.externalUrl,  // Column A: URL
      CATEGORY,             // Column B: Category
      '',                   // Column C: Published (empty)
    ]);

    // 5. Display sample URLs
    console.log('📊 Sample URLs to add:');
    const sampleCount = Math.min(5, articles.length);
    for (let i = 0; i < sampleCount; i++) {
      console.log(`   ${i + 1}. ${articles[i].externalUrl}`);
    }
    if (articles.length > sampleCount) {
      console.log(`   ... and ${articles.length - sampleCount} more`);
    }
    console.log();

    // 6. Append to Google Sheets
    console.log('📝 Adding rows to Google Sheets...');
    await appendToTab(SHEET_ID, TAB_NAME, rows);

    // 7. Success summary
    console.log();
    console.log('━'.repeat(80));
    console.log('✅ Success!');
    console.log('━'.repeat(80));
    console.log(`   Total URLs added:    ${articles.length}`);
    console.log(`   Sheet ID:            ${SHEET_ID}`);
    console.log(`   Tab:                 ${TAB_NAME}`);
    console.log(`   Category:            ${CATEGORY}`);
    console.log(`   Published status:    Empty (ready for processing)`);
    console.log('━'.repeat(80));

    console.log('\n📖 Next Steps:');
    console.log('   1. Open the Google Sheet to verify the URLs were added');
    console.log('   2. Run the Webflow sync to process these URLs');
    console.log('   3. Check the "Output" tab for results');
    console.log('   4. URLs with empty "Published" column will be processed\n');

    console.log('🔗 Google Sheet:');
    console.log(`   https://docs.google.com/spreadsheets/d/${SHEET_ID}/edit#gid=0\n`);

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the script
addUltralyticsBlogsToSheet()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
