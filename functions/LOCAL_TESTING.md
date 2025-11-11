# Local Testing Guide - Google Sheets Scraper Sync

This guide explains how to run the Sheets Sync function locally for fast testing without deploying to Firebase.

## Why Local Testing?

- **Fast iteration**: No need to wait for deployment (5-10 min → 10 sec)
- **See the browser**: Browser runs in non-headless mode, watch it scrape in real-time
- **Instant logs**: See console output immediately
- **Same code**: Uses the EXACT SAME scraping logic as the cloud function
- **Real actions**: Actually reads from Google Sheets, writes to Output tab, and creates Webflow posts

## Setup (One-Time)

### 1. Create `.env.local` File

Copy the example file and fill in your credentials:

```bash
cd functions
cp .env.local.example .env.local
```

### 2. Get Your Credentials

#### Google Service Account Credentials

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `ai-adv-5e502`
3. Project Settings → Service Accounts
4. Click "Generate New Private Key" → Download JSON file
5. Open the JSON file and copy values to `.env.local`:
   - `GOOGLE_PROJECT_ID` → `project_id`
   - `GOOGLE_PRIVATE_KEY_ID` → `private_key_id`
   - `GOOGLE_PRIVATE_KEY` → `private_key` (keep the quotes and `\n` characters!)
   - `GOOGLE_CLIENT_EMAIL` → `client_email`
   - `GOOGLE_CLIENT_ID` → `client_id`
   - `GOOGLE_CLIENT_X509_CERT_URL` → `client_x509_cert_url`

#### Webflow API Credentials

Get these from Firebase Functions config:

```bash
firebase functions:config:get
```

Or from Webflow directly:
1. Go to your Webflow site → Settings → Integrations → API Access
2. Generate API token
3. Get Site ID from site settings
4. Get Collection ID from CMS Collections

### 3. Share Google Sheet with Service Account

**CRITICAL**: The service account needs Editor access to the Google Sheet!

1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/1rMbsnVq8K0n8LpyA3la9-Kri8ZsgsLL0IB6UMciahE8/edit
2. Click "Share" button
3. Add email from `.env.local` → `GOOGLE_CLIENT_EMAIL` (e.g., `googledrive@ai-adv-5e502.iam.gserviceaccount.com`)
4. Set permission to **Editor**
5. Uncheck "Notify people"
6. Click "Share"

## Running the Test

### Basic Run

```bash
cd functions
npm run test:sheets
```

This will:
1. ✅ Build TypeScript code
2. ✅ Read URLs from "Input" tab (where Published ≠ "yes")
3. ✅ Launch Chrome browser (visible!)
4. ✅ Scrape each URL
5. ✅ Append results to "Output" tab
6. ✅ Create Webflow posts (as drafts)
7. ✅ Show detailed logs and stats

### What You'll See

```
🧪 LOCAL SHEETS SYNC TEST
================================================================================
⏰ Started at: 2025-11-11T18:30:00.000Z
📝 Sheet URL: https://docs.google.com/spreadsheets/d/...
📧 Service Account: googledrive@ai-adv-5e502.iam.gserviceaccount.com
🌐 Webflow Site: 676a1234567890abcdef
================================================================================

📊 Reading from Google Sheet: 1rMbsnVq8K0n8LpyA3la9-Kri8ZsgsLL0IB6UMciahE8
📋 Found 3 URLs to process (filtered: Published ≠ "yes")
🌐 Launching Puppeteer browser...

[1/3] Processing: https://wandb.ai/...
  → Scraping: https://wandb.ai/...
  ✓ Title: Building a RAG System with Gemini LLM
  ✓ Category: AI & Machine Learning
  ✓ Thumbnail: Found
  ✓ Appended to Output tab
  ✓ Created Webflow post
  ⏳ Waiting 3s...

[2/3] Processing: https://wandb.ai/...
  ...

================================================================================
📊 TEST COMPLETE - FINAL STATS:
   Total URLs: 3
   Processed: 3
   Errors: 0
   Webflow Created: 3
   Success Rate: 100.0%
================================================================================
```

### Browser Behavior

- **Visible Chrome window** will open and navigate to each URL
- Watch it scrape in real-time (helpful for debugging!)
- To run headless, edit `testSheetsSync.ts` line 389: `headless: true`

## Configuration Options

### Test with Specific URLs Only

Edit your Google Sheet "Input" tab:
- Mark URLs you want to skip as `Published: Yes`
- Leave URLs you want to test as blank or anything except "yes"

### Adjust Rate Limiting

Edit `testSheetsSync.ts` line 40:
```typescript
const DELAY_BETWEEN_URLS = 3000; // Change to 1000 for faster, 5000 for slower
```

### Skip Webflow Creation (Sheets Only)

Comment out lines 425-431 in `testSheetsSync.ts`:
```typescript
// try {
//   await webflowClient.createArticlePost(scrapedData);
//   stats.webflowCreated++;
//   console.log(`  ✓ Created Webflow post`);
// } catch (error) {
//   console.error(`  ✗ Failed to create Webflow post:`, error);
// }
```

## Troubleshooting

### Error: Missing environment variable

**Problem**: One or more variables not set in `.env.local`

**Solution**:
1. Check `.env.local.example` for required variables
2. Make sure no typos in variable names
3. Verify Google private key is wrapped in quotes with `\n` intact

### Error: Failed to read from tab "Input"

**Problem**: Service account doesn't have access to the sheet

**Solution**: Share the Google Sheet with the service account email (see Setup step 3)

### Error: Webflow API Error 401

**Problem**: Invalid Webflow API token

**Solution**:
1. Regenerate token from Webflow
2. Update `WEBFLOW_API_TOKEN` in `.env.local`

### Browser doesn't open

**Problem**: Puppeteer not installed correctly

**Solution**:
```bash
cd functions
npm install puppeteer
```

### URLs not showing up

**Problem**: All URLs marked as "Published: yes"

**Solution**: Change some URLs to blank or "no" in the Published column

## Comparing with Cloud Function

The local script uses **identical logic** to the cloud function:

| Feature | Local | Cloud |
|---------|-------|-------|
| Read from Google Sheets | ✅ Same | ✅ Same |
| Puppeteer scraping | ✅ Same | ✅ Same |
| Thumbnail extraction | ✅ Same | ✅ Same |
| Category detection | ✅ Same | ✅ Same |
| Write to Output tab | ✅ Same | ✅ Same |
| Create Webflow posts | ✅ Same | ✅ Same |
| Browser visibility | ✅ Visible | ❌ Headless |
| Deployment time | ✅ 0 seconds | ❌ 5-10 minutes |

## Next Steps

Once your local testing passes:

1. **Deploy to Firebase**:
   ```bash
   cd functions
   firebase deploy --only functions:sheetsScraperSync
   ```

2. **Verify deployment**:
   ```bash
   firebase functions:log --only sheetsScraperSync
   ```

3. **Test scheduled run**: Wait for 9 AM UTC or trigger manually from Firebase Console

4. **Check results**: Verify Output tab and Webflow drafts

## Tips

- Test with 2-3 URLs first before running on the full sheet
- Watch the browser to understand what it's scraping
- Check Output tab in Google Sheets immediately after run
- Check Webflow drafts to verify posts were created
- Review logs for any errors or warnings

---

**Happy testing!** 🚀
