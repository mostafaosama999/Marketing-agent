/**
 * Local Scraper Test Script
 * Run this locally to scrape W&B and save CSV to your computer
 * NO Cloud Storage, NO Webflow sync - just local CSV file
 */

import {WandBScraper} from '../scrapers/wandbScraper';
import * as Papa from 'papaparse';
import * as fs from 'fs';
import * as path from 'path';

interface CSVRow {
  Name: string;
  Slug: string;
  'Blog External Link': string;
  'Thumbnail Image'?: string;
}

async function runLocalScraper() {
  console.log('🚀 Starting local W&B scraper...\n');

  try {
    // Step 1: Initialize scraper
    const wandbUrl = 'https://wandb.ai/mostafaibrahim17/ml-articles/reportlist';
    console.log(`📍 Scraping from: ${wandbUrl}\n`);

    const scraper = new WandBScraper({
      profileUrl: wandbUrl,
      maxArticles: undefined, // Scrape all articles
      includeMetadata: true,
    });

    // Step 2: Scrape articles
    console.log('🔍 Scraping articles...');
    const articles = await scraper.scrapeWithRetry(3);
    const stats = scraper.getStats();

    console.log(`\n✅ Successfully scraped ${articles.length} articles!`);
    console.log(`   Success: ${stats.successCount}`);
    console.log(`   Failures: ${stats.failureCount}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      stats.errors.forEach(err => console.log(`   - ${err}`));
    }

    if (articles.length === 0) {
      console.log('\n❌ No articles found. Exiting.');
      return;
    }

    // Step 3: Convert to CSV format
    console.log('\n📝 Converting to CSV...');
    const csvRows: CSVRow[] = articles.map(article => ({
      Name: article.name,
      Slug: article.slug,
      'Blog External Link': article.externalUrl,
      'Thumbnail Image': article.imageUrl || '',
    }));

    const csv = Papa.unparse(csvRows, {
      header: true,
      quotes: true,
      delimiter: ',',
      newline: '\n',
    });

    // Step 4: Save to local file
    const outputDir = path.join(__dirname, '../../output');
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `wandb-articles-${timestamp}.csv`;
    const filePath = path.join(outputDir, fileName);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, {recursive: true});
    }

    fs.writeFileSync(filePath, csv, 'utf-8');

    console.log(`\n✅ CSV saved locally!`);
    console.log(`   File: ${filePath}`);
    console.log(`   Rows: ${articles.length}`);
    console.log(`   Size: ${(csv.length / 1024).toFixed(2)} KB`);

    // Step 5: Print summary
    console.log(`\n📊 Summary:`);
    console.log(`   Total articles: ${articles.length}`);
    console.log(`   Output file: ${fileName}`);
    console.log(`   Location: ${outputDir}`);

    // Print first 3 articles as preview
    console.log(`\n📋 Preview (first 3 articles):`);
    articles.slice(0, 3).forEach((article, idx) => {
      console.log(`\n   ${idx + 1}. ${article.name}`);
      console.log(`      Slug: ${article.slug}`);
      console.log(`      URL: ${article.externalUrl}`);
      if (article.createdOn) console.log(`      Created: ${article.createdOn}`);
    });

    console.log(`\n\n🎉 Done! Open the CSV file to view all articles.`);
  } catch (error) {
    console.error('\n❌ Scraper failed:', error);
    if (error instanceof Error) {
      console.error('   Error:', error.message);
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the scraper
runLocalScraper()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
