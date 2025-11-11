/**
 * Test Ultralytics Scraper
 * Local test script to verify Ultralytics profile scraping
 */

import {UltralyticsScraper} from '../scrapers/ultralyticsScraper';
import {CSVManager} from '../utils/csvManager';
import * as path from 'path';

async function testUltralyticsScraper() {
  console.log('🧪 Testing Ultralytics Profile Scraper\n');

  try {
    // 1. Configure scraper
    const profileUrl = 'https://www.ultralytics.com/authors/mostafa-ibrahim';
    const maxArticles = 10; // Limit for testing

    console.log('📋 Configuration:');
    console.log(`   Profile URL: ${profileUrl}`);
    console.log(`   Max Articles: ${maxArticles}\n`);

    // 2. Initialize scraper
    console.log('🔄 Initializing Ultralytics scraper...');
    const scraper = new UltralyticsScraper({
      profileUrl,
      maxArticles,
      includeMetadata: true,
    });

    // 3. Run scraper
    console.log('\n🚀 Starting scrape...\n');
    console.log('='.repeat(80));

    const articles = await scraper.scrape();

    console.log('='.repeat(80));
    console.log(`\n✅ Scraping complete! Found ${articles.length} articles\n`);

    // 4. Display stats
    const stats = scraper.getStats();
    console.log('📊 Scraping Statistics:');
    console.log(`   Total Scraped: ${stats.totalScraped}`);
    console.log(`   Successful: ${stats.successCount}`);
    console.log(`   Failed: ${stats.failureCount}`);
    console.log(`   Success Rate: ${Math.round((stats.successCount / stats.totalScraped) * 100)}%\n`);

    // 5. Display category distribution
    const categoryCount: Record<string, number> = {};
    articles.forEach(article => {
      const category = article.category || 'Unknown';
      categoryCount[category] = (categoryCount[category] || 0) + 1;
    });

    console.log('📂 Category Distribution:');
    Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        console.log(`   ${category}: ${count}`);
      });

    // 6. Display thumbnail stats
    const withThumbnails = articles.filter(a => a.imageUrl).length;
    console.log(`\n🖼️  Thumbnail Extraction:`);
    console.log(`   With Thumbnails: ${withThumbnails}/${articles.length}`);
    console.log(`   Success Rate: ${Math.round((withThumbnails / articles.length) * 100)}%\n`);

    // 7. Display sample articles
    console.log('📝 Sample Articles:\n');
    articles.slice(0, 3).forEach((article, index) => {
      console.log(`${index + 1}. ${article.name}`);
      console.log(`   Slug: ${article.slug}`);
      console.log(`   Category: ${article.category}`);
      console.log(`   Blog Category: ${article.blogCategory}`);
      console.log(`   URL: ${article.externalUrl}`);
      console.log(`   Image: ${article.imageUrl ? 'Yes' : 'No'}`);
      console.log(`   Date: ${article.createdOn || 'N/A'}`);
      console.log('');
    });

    // 8. Save to CSV
    console.log('💾 Saving to CSV...');
    const csvManager = new CSVManager();
    const timestamp = new Date().toISOString().split('T')[0];
    const csvPath = path.join(__dirname, `../../output/ultralytics-articles-${timestamp}.csv`);

    csvManager.saveToLocal(articles, csvPath);
    console.log(`✓ CSV saved: ${csvPath}\n`);

    console.log('✅ Test completed successfully!');
    console.log(`   ${articles.length} Ultralytics articles ready to sync to Webflow`);

  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testUltralyticsScraper()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
