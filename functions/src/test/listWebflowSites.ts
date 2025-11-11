/**
 * List Webflow Sites
 * Shows all sites accessible with the API token
 */

import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

async function listSites() {
  console.log('🔍 Listing Webflow Sites...\n');

  try {
    // Load configuration
    const configPath = path.join(__dirname, '../../.runtimeconfig.json');
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);

    const apiToken = config.webflow.api_token;

    console.log('📋 Configuration:');
    console.log(`   API Token: ${apiToken.substring(0, 20)}...\n`);

    // Create axios instance for v2 API
    const api = axios.create({
      baseURL: 'https://api.webflow.com',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    // List all sites
    console.log('🚀 Fetching sites...\n');
    const response = await api.get('/v2/sites');

    const sites = response.data.sites || response.data;

    console.log(`✅ Found ${sites.length} sites:\n`);

    sites.forEach((site: any, index: number) => {
      console.log(`${index + 1}. ${site.displayName}`);
      console.log(`   Site ID: ${site.id}`);
      console.log(`   Short Name: ${site.shortName}`);
      console.log(`   Created: ${new Date(site.createdOn).toLocaleDateString()}`);
      console.log('');
    });

    console.log('\n💡 Copy the Site ID you want to use and update .runtimeconfig.json');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

listSites()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
