/**
 * Debug Scraper - Inspect W&B page structure
 * This will show what's actually on the page to help fix selectors
 */

import * as puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';

async function debugWandBPage() {
  console.log('🔍 Debugging W&B page structure...\n');

  const browser = await puppeteer.launch({
    headless: false, // Open visible browser so you can see what's happening
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({width: 1920, height: 1080});

  const url = 'https://wandb.ai/mostafaibrahim17/ml-articles/reportlist';
  console.log(`📍 Navigating to: ${url}`);

  await page.goto(url, {
    waitUntil: 'networkidle2',
    timeout: 60000,
  });

  console.log('✅ Page loaded');
  console.log('⏳ Waiting 5 seconds for dynamic content...\n');

  await new Promise(resolve => setTimeout(resolve, 5000));

  // Take screenshot
  const outputDir = path.join(__dirname, '../../output');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, {recursive: true});
  }

  const screenshotPath = path.join(outputDir, 'wandb-page-screenshot.png') as `${string}.png`;
  await page.screenshot({path: screenshotPath, fullPage: true});
  console.log(`📸 Screenshot saved: ${screenshotPath}\n`);

  // Extract page info
  const pageInfo = await page.evaluate(() => {
    // Try to find reports/articles
    const possibleContainers = [
      'table',
      '[data-test*="report"]',
      '[class*="report"]',
      '[class*="table"]',
      'tbody tr',
      '[role="row"]',
      'a[href*="/reports/"]',
    ];

    const results: any = {};

    possibleContainers.forEach(selector => {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        results[selector] = {
          count: elements.length,
          sample: Array.from(elements).slice(0, 2).map(el => ({
            tagName: el.tagName,
            className: el.className,
            textContent: el.textContent?.substring(0, 100),
          })),
        };
      }
    });

    // Find all links that look like reports
    const reportLinks = Array.from(document.querySelectorAll('a[href*="/reports/"]'));
    results.reportLinks = {
      count: reportLinks.length,
      samples: reportLinks.slice(0, 5).map(link => ({
        href: (link as HTMLAnchorElement).href,
        text: link.textContent?.trim(),
      })),
    };

    return results;
  });

  console.log('📊 Page Analysis:');
  console.log(JSON.stringify(pageInfo, null, 2));

  // Save HTML for inspection
  const html = await page.content();
  const htmlPath = path.join(outputDir, 'wandb-page.html');
  fs.writeFileSync(htmlPath, html, 'utf-8');
  console.log(`\n📄 HTML saved: ${htmlPath}`);

  console.log('\n⏸️  Browser will stay open for 30 seconds so you can inspect...');
  console.log('   Look at the page and identify the correct selectors');

  await new Promise(resolve => setTimeout(resolve, 30000));

  await browser.close();

  console.log('\n✅ Debug complete!');
  console.log('📝 Next steps:');
  console.log('   1. Open the screenshot to see the page');
  console.log('   2. Open the HTML file in a browser');
  console.log('   3. Check the JSON output above for element counts');
  console.log('   4. Update selectors in wandbScraper.ts based on findings');
}

debugWandBPage()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Debug failed:', error);
    process.exit(1);
  });
