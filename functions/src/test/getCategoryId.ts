/**
 * Get Blog Category Item ID
 * Queries the Blog Categories collection to find the W&B category item ID
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

async function getCategoryId() {
  console.log('🔍 Finding W&B Category Item ID...\n');

  try {
    // Load configuration
    const configPath = path.join(__dirname, '../../.runtimeconfig.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    const apiToken = config.webflow.api_token;
    const blogCategoriesCollectionId = '68ee616f267332a8b301b95b'; // From list:collections output

    console.log('📋 Configuration:');
    console.log(`   API Token: ${apiToken.substring(0, 20)}...`);
    console.log(`   Blog Categories Collection ID: ${blogCategoriesCollectionId}\n`);

    // Create axios instance for v2 API
    const api = axios.create({
      baseURL: 'https://api.webflow.com',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    // Fetch all category items
    console.log('🚀 Fetching category items...\n');
    const response = await api.get(`/v2/collections/${blogCategoriesCollectionId}/items`);

    const items = response.data.items || [];

    console.log(`✅ Found ${items.length} category items:\n`);

    // List all categories
    items.forEach((item: any, index: number) => {
      console.log(`${index + 1}. ${item.fieldData.name}`);
      console.log(`   Item ID: ${item.id}`);
      console.log(`   Slug: ${item.fieldData.slug}`);
      console.log('');
    });

    // Find W&B category
    const wbCategory = items.find((item: any) => item.fieldData.name === 'W&B');

    if (wbCategory) {
      console.log('🎯 W&B Category Found!');
      console.log(`   Item ID: ${wbCategory.id}`);
      console.log(`   Name: ${wbCategory.fieldData.name}`);
      console.log(`   Slug: ${wbCategory.fieldData.slug}`);
      console.log('\n💡 Use this Item ID in your Webflow sync code for the blog-category-name field');
    } else {
      console.log('❌ W&B category not found in the collection');
      console.log('   You may need to create it in Webflow CMS first');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

getCategoryId()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
