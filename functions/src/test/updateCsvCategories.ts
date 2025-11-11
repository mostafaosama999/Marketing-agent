/**
 * Update CSV Categories
 * Updates existing CSV file with auto-detected categories
 */

import * as fs from 'fs';
import * as path from 'path';
import * as Papa from 'papaparse';
import {detectCategory} from '../utils/categoryDetector';

interface CSVRow {
  Name: string;
  Slug: string;
  'Blog External Link': string;
  'Thumbnail Image'?: string;
  Category?: string;
  'Blog Category'?: string;
}

async function updateCsvCategories() {
  console.log('📝 Updating CSV with Auto-Detected Categories\n');

  try {
    // 1. Read existing CSV
    const csvPath = path.join(__dirname, '../../output/wandb-articles-2025-11-09.csv');
    console.log(`📄 Reading CSV: ${csvPath}`);

    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    // 2. Parse CSV
    const parsed = Papa.parse<CSVRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0) {
      console.warn('⚠️  CSV parsing warnings:', parsed.errors);
    }

    console.log(`✓ Found ${parsed.data.length} articles\n`);

    // 3. Track category distribution
    const categoryDistribution: Record<string, number> = {};
    let highConfidence = 0;
    let mediumConfidence = 0;
    let lowConfidence = 0;

    // 4. Update each row
    console.log('🔄 Detecting categories...\n');

    const updatedRows = parsed.data.map((row, index) => {
      // Detect category based on title (description not available in CSV)
      const result = detectCategory(row.Name, undefined);

      // Track distribution
      categoryDistribution[result.category] = (categoryDistribution[result.category] || 0) + 1;

      // Track confidence
      if (result.confidence === 'high') highConfidence++;
      else if (result.confidence === 'medium') mediumConfidence++;
      else lowConfidence++;

      // Log every 10th article for progress
      if ((index + 1) % 10 === 0) {
        console.log(`   Processed ${index + 1}/${parsed.data.length} articles...`);
      }

      return {
        ...row,
        Category: result.category, // Auto-detected content category
        'Blog Category': 'W&B', // Source platform
      };
    });

    console.log(`\n✓ Category detection complete!\n`);

    // 5. Display summary
    console.log('📊 Category Distribution:');
    console.log('─'.repeat(50));
    Object.entries(categoryDistribution)
      .sort((a, b) => b[1] - a[1])
      .forEach(([category, count]) => {
        const percentage = Math.round((count / updatedRows.length) * 100);
        console.log(`   ${category.padEnd(35)} ${count.toString().padStart(3)} (${percentage}%)`);
      });

    console.log('\n📊 Confidence Levels:');
    console.log('─'.repeat(50));
    console.log(`   High Confidence:   ${highConfidence} (${Math.round(highConfidence / updatedRows.length * 100)}%)`);
    console.log(`   Medium Confidence: ${mediumConfidence} (${Math.round(mediumConfidence / updatedRows.length * 100)}%)`);
    console.log(`   Low Confidence:    ${lowConfidence} (${Math.round(lowConfidence / updatedRows.length * 100)}%)`);

    // 6. Generate new CSV
    console.log('\n💾 Writing updated CSV...');
    const newCsv = Papa.unparse(updatedRows, {
      header: true,
      quotes: true,
      delimiter: ',',
      newline: '\n',
    });

    // 7. Save to file
    fs.writeFileSync(csvPath, newCsv, 'utf-8');
    console.log(`✓ CSV updated: ${csvPath}`);

    console.log('\n✅ Update complete!');
    console.log(`   ${updatedRows.length} articles now have auto-detected categories`);
    console.log(`   All articles marked with Blog Category: "W&B"`);

  } catch (error: any) {
    console.error('\n❌ Update failed:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the update
updateCsvCategories()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
