/**
 * Test Webflow Sync with First CSV Row
 * Local test script to verify Webflow sync works before deploying
 */

import * as fs from 'fs';
import * as path from 'path';
import * as Papa from 'papaparse';
import axios, {AxiosInstance} from 'axios';

interface CSVRow {
  Name: string;
  Slug: string;
  'Blog External Link': string;
  'Thumbnail Image'?: string;
  Category?: string;
}

interface ScrapedArticle {
  name: string;
  slug: string;
  externalUrl: string;
  imageUrl?: string;
  category?: string;
  description?: string;
  createdOn?: string;
  lastEdited?: string;
}

/**
 * Local Webflow API client for testing
 * Loads config from .runtimeconfig.json instead of Firebase Functions
 */
class LocalWebflowAPI {
  private api: AxiosInstance;
  private siteId: string;
  private blogCollectionId: string;

  constructor(apiToken: string, siteId: string, blogCollectionId: string) {
    this.siteId = siteId;
    this.blogCollectionId = blogCollectionId;

    this.api = axios.create({
      baseURL: 'https://api.webflow.com',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
        'accept-version': '1.0.0',
      },
    });

    console.log('🔧 Webflow API initialized');
    console.log(`   Site ID: ${this.siteId}`);
    console.log(`   Collection ID: ${this.blogCollectionId}`);
  }

  /**
   * Create article post from ScrapedArticle data
   */
  async createArticlePost(article: ScrapedArticle): Promise<any> {
    try {
      console.log(`\n🆕 Creating article post: ${article.name}`);

      const postData = {
        fieldData: {
          name: article.name,
          slug: article.slug,
          'blog-external-link': article.externalUrl,
          'blog-main-image': article.imageUrl || '',
          'category': article.category || 'Case Studies & Tutorials', // Auto-detected content category (PlainText)
          'blog-category-name': '68ee616f267332a8b301ba59', // W&B category reference (Reference/ItemRef)
          'publish-date': new Date().toISOString(),
        },
        isDraft: true, // Always create as draft for review
        isArchived: false,
      };

      console.log('📤 Sending to Webflow API...');
      console.log('   Endpoint:', `/v2/collections/${this.blogCollectionId}/items`);
      console.log('   Data:', JSON.stringify(postData, null, 2));

      const response = await this.api.post(
        `/v2/collections/${this.blogCollectionId}/items`,
        postData
      );

      const createdItem = response.data;
      console.log(`\n✅ Successfully created article!`);
      console.log('   Item ID:', createdItem.id);
      console.log('   Status:', createdItem.isDraft ? 'Draft' : 'Published');
      console.log('   Name:', createdItem.fieldData.name);
      console.log('   Slug:', createdItem.fieldData.slug);
      console.log('   Category:', createdItem.fieldData.category);

      return createdItem;
    } catch (error: any) {
      console.error('\n❌ Failed to create article:', error.message);
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Response:', JSON.stringify(error.response.data, null, 2));
      }
      throw error;
    }
  }
}

/**
 * Main test function
 */
async function testWebflowSync() {
  console.log('🧪 Testing Webflow sync with first CSV row...\n');

  try {
    // 1. Load configuration from .runtimeconfig.json
    console.log('📋 Loading configuration...');
    const configPath = path.join(__dirname, '../../.runtimeconfig.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    const apiToken = config.webflow.api_token;
    const siteId = config.webflow.site_id;
    const blogCollectionId = config.webflow.blog_collection_id;

    if (!apiToken || !siteId || !blogCollectionId) {
      throw new Error('Missing Webflow configuration in .runtimeconfig.json');
    }

    console.log('   ✓ Configuration loaded\n');

    // 2. Read CSV file
    console.log('📄 Reading CSV file...');
    const csvPath = path.join(__dirname, '../../output/wandb-articles-2025-11-09.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    // 3. Parse CSV
    const parsed = Papa.parse<CSVRow>(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.data.length === 0) {
      throw new Error('No data found in CSV file');
    }

    console.log(`   ✓ Found ${parsed.data.length} articles in CSV\n`);

    // 4. Get first 5 articles
    const articlesToSync = parsed.data.slice(0, 5);
    console.log(`📋 Syncing first ${articlesToSync.length} articles:\n`);

    // 5. Initialize Webflow API
    console.log('🔄 Initializing Webflow API...');
    const webflow = new LocalWebflowAPI(apiToken, siteId, blogCollectionId);

    // 6. Sync each article
    console.log('\n🚀 Starting sync...\n');

    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < articlesToSync.length; i++) {
      const row = articlesToSync[i];

      console.log(`\n[${ i + 1}/${articlesToSync.length}] ${row.Name}`);
      console.log('─'.repeat(80));

      try {
        // Convert to ScrapedArticle format
        const article: ScrapedArticle = {
          name: row.Name,
          slug: row.Slug,
          externalUrl: row['Blog External Link'],
          imageUrl: row['Thumbnail Image'] || undefined,
          category: row.Category || undefined,
        };

        // Sync to Webflow
        await webflow.createArticlePost(article);
        successCount++;

        // Rate limiting: wait 500ms between requests
        if (i < articlesToSync.length - 1) {
          console.log('\n   ⏳ Waiting 500ms before next sync...');
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } catch (error: any) {
        console.error(`\n   ❌ Failed to sync: ${error.message}`);
        failedCount++;
      }
    }

    console.log('\n\n✅ Sync completed!');
    console.log(`   Successful: ${successCount}/${articlesToSync.length}`);
    console.log(`   Failed: ${failedCount}/${articlesToSync.length}`);
    console.log('   You can now view the articles in Webflow CMS (created as Drafts)');
  } catch (error: any) {
    console.error('\n❌ Test failed:', error.message);
    if (error.stack) {
      console.error('   Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testWebflowSync()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
