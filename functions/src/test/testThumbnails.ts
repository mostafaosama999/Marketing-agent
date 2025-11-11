/**
 * Test Thumbnail Extraction with 3 Articles
 * Quick test before running full scrape
 */

import {WandBScraper} from '../scrapers/wandbScraper';

async function testThumbnails() {
  console.log('🧪 Testing thumbnail extraction with 3 articles...\n');

  const scraper = new WandBScraper({
    profileUrl: 'https://wandb.ai/mostafaibrahim17/ml-articles/reportlist',
    maxArticles: 3, // Only scrape 3 articles for testing
    includeMetadata: true,
  });

  try {
    const articles = await scraper.execute();

    console.log('\n📊 Test Results:');
    console.log(`   Total articles scraped: ${articles.length}`);
    console.log(`   Articles with thumbnails: ${articles.filter(a => a.imageUrl).length}`);

    console.log('\n📋 Article Details:');
    articles.forEach((article, idx) => {
      console.log(`\n   ${idx + 1}. ${article.name}`);
      console.log(`      Slug: ${article.slug}`);
      console.log(`      URL: ${article.externalUrl}`);
      console.log(`      Thumbnail: ${article.imageUrl || 'NOT FOUND'}`);
    });

    const allHaveThumbnails = articles.every(a => a.imageUrl);
    if (allHaveThumbnails) {
      console.log('\n✅ Test passed! All articles have thumbnails.');
    } else {
      console.log('\n⚠️  Some articles are missing thumbnails.');
    }

    console.log('\n✅ Test completed successfully');
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

testThumbnails()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
