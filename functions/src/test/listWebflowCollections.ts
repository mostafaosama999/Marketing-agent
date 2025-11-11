/**
 * List Webflow Collections
 * Debug script to find all collections for the site
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

async function listCollections() {
  console.log('🔍 Listing Webflow Collections...\n');

  try {
    // Load configuration
    const configPath = path.join(__dirname, '../../.runtimeconfig.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    const apiToken = config.webflow.api_token;
    const siteId = config.webflow.site_id;

    console.log('📋 Configuration:');
    console.log(`   API Token: ${apiToken.substring(0, 20)}...`);
    console.log(`   Site ID: ${siteId}\n`);

    // Create axios instance for v2 API
    const api = axios.create({
      baseURL: 'https://api.webflow.com',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    // First, get site info
    console.log('🔍 Fetching site info...\n');
    try {
      const siteResponse = await api.get(`/v2/sites/${siteId}`);
      console.log(`✅ Site found: ${siteResponse.data.displayName}`);
      console.log(`   Short name: ${siteResponse.data.shortName}\n`);
    } catch (error: any) {
      console.error('❌ Site not found or API error');
      throw error;
    }

    // List collections using v2 API
    console.log('🚀 Fetching collections...\n');
    const response = await api.get(`/v2/sites/${siteId}/collections`);

    const collections = response.data.collections || response.data;

    console.log(`✅ Found ${collections.length} collections:\n`);

    collections.forEach((collection: any, index: number) => {
      console.log(`${index + 1}. ${collection.displayName || collection.name}`);
      console.log(`   Collection ID: ${collection.id || collection._id}`);
      console.log(`   Slug: ${collection.slug}`);
      console.log('');
    });

    // Get detailed field information for each collection
    console.log('\n📋 Fetching detailed field information...\n');
    for (const collection of collections) {
      const collectionId = collection.id || collection._id;
      console.log(`Collection: ${collection.displayName || collection.name} (${collectionId})`);

      try {
        // Fetch collection fields
        const fieldsResponse = await api.get(`/v2/collections/${collectionId}`);
        const fields = fieldsResponse.data.fields;

        console.log('Fields:');
        if (fields && fields.length > 0) {
          fields.forEach((field: any) => {
            console.log(`  - ${field.displayName} (${field.slug}) - Type: ${field.type}`);
          });
        } else {
          console.log('  (No fields)');
        }
      } catch (error: any) {
        console.log(`  ⚠️  Could not fetch fields: ${error.message}`);
      }
      console.log('');
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

listCollections()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
