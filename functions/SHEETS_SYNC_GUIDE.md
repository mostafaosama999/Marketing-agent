# Google Sheets Sync System - Complete Guide

## Overview

The Sheets Sync system automatically reads article URLs from a Google Sheet, scrapes article data, writes results back to the sheet, and creates draft posts in Webflow CMS. It supports multiple blog sources (W&B, Ultralytics, Civo, Supertokens, etc.) with automatic category mapping.

**Key Features:**
- ✅ Reads URLs from Google Sheets "Input" tab
- ✅ Scrapes article title, description, thumbnail, and content
- ✅ Auto-detects content category (AI & ML, Cloud, Developer Tools, etc.)
- ✅ Maps blog sources to Webflow categories automatically
- ✅ Writes results to "Output" tab
- ✅ Marks processed rows as "Published: Yes"
- ✅ Creates draft posts in Webflow
- ✅ Runs daily at 9 AM UTC (cloud function)
- ✅ Can run locally for testing

---

## System Architecture

### Data Flow

```
Google Sheets (Input Tab)
         ↓
    [Read URLs where Published ≠ "yes"]
         ↓
    Puppeteer Scraper
         ↓
    [Extract: Title, Slug, Thumbnail, Description]
         ↓
    Category Detection
         ↓
    Webflow Category Mapping
         ↓
    Google Sheets (Output Tab) + Webflow CMS
         ↓
    [Mark as Published: Yes]
```

### Components

1. **Cloud Function** (`functions/src/webflow/sheetsSync.ts`)
   - Scheduled to run daily at 9 AM UTC
   - Uses Firebase Functions v2
   - Timeout: 9 minutes
   - Memory: 2GiB

2. **Local Test Script** (`functions/src/scripts/testSheetsSync.ts`)
   - Identical logic to cloud function
   - Uses `.env.local` for credentials
   - Browser runs in headless mode
   - Perfect for fast iteration

3. **Core Utilities**
   - `sheetsUtils.ts` - Google Sheets operations
   - `webflowUtils.ts` - Webflow API client
   - `categoryDetector.ts` - Content category detection

---

## Google Sheets Structure

### Input Tab

| Column | Description | Example |
|--------|-------------|---------|
| URL | Article URL to scrape | `https://wandb.ai/...` |
| Published | Processing status | `Yes` / `No` / (empty) |
| Category | Blog source name | `W&B`, `Ultralytics`, `Civo` |

**Filtering Logic:**
- Only processes rows where `Published ≠ "yes"` (case-insensitive)
- Empty Published cells are processed
- "No", blank, or any value except "yes" triggers processing

### Output Tab

| Column | Description | Example |
|--------|-------------|---------|
| Name | Article title | `Building a RAG System...` |
| Slug | URL-friendly slug | `building-a-rag-system...` |
| Blog External Link | Original article URL | `https://wandb.ai/...` |
| Thumbnail Image | Featured image URL | `https://cdn.example.com/img.png` |
| Category | Auto-detected content type | `AI & Machine Learning` |
| Blog Category | Blog source from Input tab | `W&B` |

---

## Setup

### Prerequisites

1. **Google Service Account** with Sheets API access
2. **Webflow API Token** with CMS write permissions
3. **Firebase Project** (for cloud deployment)
4. **Node.js 20** (for local testing)

### One-Time Configuration

#### 1. Google Service Account Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: `ai-adv-5e502`
3. Project Settings → Service Accounts
4. Click "Generate New Private Key" → Download JSON
5. Share your Google Sheet with the service account email:
   ```
   googledrive@ai-adv-5e502.iam.gserviceaccount.com
   ```
   - Set permission to **Editor**
   - Uncheck "Notify people"

#### 2. Create `.env.local` File

```bash
cd functions
cp .env.local.example .env.local
```

Fill in the values from your service account JSON and Webflow settings:

```env
# Google Sheets Configuration
SHEETS_SCRAPER_URL=https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit

# Google Service Account Credentials
GOOGLE_PROJECT_ID=ai-adv-5e502
GOOGLE_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
GOOGLE_CLIENT_EMAIL=googledrive@ai-adv-5e502.iam.gserviceaccount.com
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/...

# Webflow API Configuration
WEBFLOW_API_TOKEN=your_webflow_api_token
WEBFLOW_SITE_ID=your_site_id
WEBFLOW_BLOG_COLLECTION_ID=your_collection_id
```

#### 3. Install Dependencies

```bash
cd functions
npm install
```

---

## Running the Sync

### Local Testing (Recommended for Development)

```bash
cd functions
npm run test:sheets
```

**What Happens:**
1. ✅ Builds TypeScript → JavaScript
2. ✅ Loads credentials from `.env.local`
3. ✅ Reads URLs from Input tab (where Published ≠ "yes")
4. ✅ Launches headless Chrome browser
5. ✅ Fetches Webflow category mapping (8 categories)
6. ✅ Scrapes each URL (3 second delay between URLs)
7. ✅ Writes to Output tab
8. ✅ Marks as "Published: Yes" in Input tab
9. ✅ Creates Webflow draft post
10. ✅ Shows final stats (Total, Processed, Errors, Success Rate)

**Expected Output:**
```
🧪 LOCAL SHEETS SYNC TEST
================================================================================
⏰ Started at: 2025-11-11T21:55:28.521Z
📝 Sheet URL: https://docs.google.com/spreadsheets/d/...
📧 Service Account: googledrive@ai-adv-5e502.iam.gserviceaccount.com
🌐 Webflow Site: 68ee616d267332a8b301b837
================================================================================

📊 Reading from Google Sheet: 1rMbsnVq8K0n8LpyA3la9-Kri8ZsgsLL0IB6UMciahE8
📋 Found 10 URLs to process (filtered: Published ≠ "yes")
🌐 Launching Puppeteer browser...
🏷️ Fetching blog category mapping from Webflow...
🔍 Fetching blog categories from Webflow...
📊 Found 8 category items
  ✓ W&B → 68ee616f267332a8b301ba59
  ✓ Ultralytics → 68ee616f267332a8b301ba19
  ✓ Civo → 68ee616f267332a8b301ba39
  ✓ Supertokens → 68ee616f267332a8b301b9f9
  ✓ HarperDB → 68f780af6c50977ece4e9f0f
  ✓ 365DataScience → 68f780a824291d3170d7d9f0
  ✓ Zilliz → 68f7809eb2f6d6610cb3fe87
  ✓ GiskardAI → 68f7808fd83bccf63e1394f2

[1/10] Processing: https://wandb.ai/...
  → Scraping: https://wandb.ai/...
📂 Category detected: AI & Machine Learning (high confidence, score: 4)
   Keywords: LLM, machine learning, training, model
  ✓ Title: Building a RAG System with Gemini LLM
  ✓ Category: AI & Machine Learning
  ✓ Thumbnail: Found
✅ Successfully appended 1 row(s) to tab "Output"
  ✓ Appended to Output tab
✅ Marked row 78 as Published: Yes
🆕 Creating article post: Building a RAG System with Gemini LLM
  ✓ Using category "W&B" → 68ee616f267332a8b301ba59
✅ Successfully created article: Building a RAG System with Gemini LLM
  ✓ Created Webflow post
  ⏳ Waiting 3s...

...

================================================================================
📊 TEST COMPLETE - FINAL STATS:
   Total URLs: 10
   Processed: 10
   Errors: 0
   Webflow Created: 10
   Success Rate: 100.0%
================================================================================
🔒 Browser closed

✅ LOCAL TEST COMPLETED SUCCESSFULLY!
```

### Cloud Deployment

Deploy to Firebase:

```bash
cd functions
firebase deploy --only functions:sheetsScraperSync
```

**Scheduled Execution:**
- Runs automatically daily at **9 AM UTC**
- No manual trigger needed
- Timeout: 9 minutes (enough for ~180 URLs at 3s each)

**Manual Trigger (for testing):**

Via Firebase Console:
1. Go to Functions → sheetsScraperSync
2. Click "..." → Test function
3. Or use Cloud Scheduler to trigger manually

Via CLI:
```bash
firebase functions:log --only sheetsScraperSync
```

---

## Category Mapping System

### How It Works

1. **Webflow Categories Collection** (`68ee616f267332a8b301b95b`)
   - Contains 8 blog source categories
   - Each has: name (e.g., "W&B") and Webflow item ID

2. **Automatic Mapping**
   - System fetches all categories at sync start
   - Creates name → ID mapping in memory
   - Example: `"W&B" → "68ee616f267332a8b301ba59"`

3. **Usage in Sync**
   - Reads `Category` column from Input tab (e.g., "Ultralytics")
   - Looks up Webflow ID: `"Ultralytics" → "68ee616f267332a8b301ba19"`
   - Creates Webflow post with correct category reference

4. **Fallback Behavior**
   - If category not found in mapping → logs warning
   - Shows available categories in warning
   - Falls back to W&B category ID for safety
   - Processing continues (doesn't fail)

### Supported Blog Categories

| Name | Webflow Item ID |
|------|----------------|
| W&B | 68ee616f267332a8b301ba59 |
| Ultralytics | 68ee616f267332a8b301ba19 |
| Civo | 68ee616f267332a8b301ba39 |
| Supertokens | 68ee616f267332a8b301b9f9 |
| HarperDB | 68f780af6c50977ece4e9f0f |
| 365DataScience | 68f780a824291d3170d7d9f0 |
| Zilliz | 68f7809eb2f6d6610cb3fe87 |
| GiskardAI | 68f7808fd83bccf63e1394f2 |

**Adding New Categories:**
1. Create new category in Webflow CMS
2. Get the item ID from Webflow API
3. Add to Input sheet's Category column
4. System automatically picks it up (no code changes needed!)

---

## Content Category Detection

### Auto-Detected Categories

The system analyzes article title and description to detect content type:

1. **AI & Machine Learning**
   - Keywords: machine learning, neural network, deep learning, LLM, GPT, Claude, model training, RAG, etc.
   - Confidence threshold: 3+ keywords

2. **Cloud & Deployment**
   - Keywords: Kubernetes, Docker, AWS, scaling, Helm, deployment, cloud, infrastructure, etc.
   - Confidence threshold: 3+ keywords

3. **Developer Tools & Security**
   - Keywords: API, authentication, authorization, security, monitoring, testing, package, etc.
   - Confidence threshold: 3+ keywords

4. **Freelancing & Career**
   - Keywords: freelance, career, remote work, resume, job search, design, portfolio, etc.
   - Confidence threshold: 1+ keywords

5. **Case Studies & Tutorials** (Default)
   - Keywords: tutorial, guide, how to, step by step, introduction, learn, example, etc.
   - Used when no other category matches

**Note:** This is different from Blog Category (source). Both are stored in Webflow:
- `category` field = Auto-detected content type (PlainText)
- `blog-category-name` field = Blog source (Reference to category item)

---

## Scraping Logic

### Title Extraction Priority

1. **h1 in article/main content** (most reliable)
   - `article h1`, `main h1`, `[role="main"] h1`
   - Avoids site headers and navigation

2. **First h1 on page**
   - Fallback for simpler page structures

3. **og:title meta tag**
   - Open Graph metadata
   - May include site name

4. **title tag** (last resort)
   - Often includes site name
   - Example: "Article Title | Site Name"

5. **"Untitled Article"** (failure case)
   - Used when nothing found

### Thumbnail Extraction Priority

1. **og:image meta tag** (most reliable)
   - `<meta property="og:image">`
   - Used by social media shares

2. **twitter:image meta tag**
   - `<meta name="twitter:image">`
   - Twitter card image

3. **First large image in content**
   - From `main`, `article`, `[role="main"]`
   - Width > 400px

4. **Featured/cover images**
   - Class names: "cover", "featured", "thumbnail"

5. **Empty string** (failure case)
   - Webflow accepts empty thumbnails

### Slug Generation

```typescript
// Example: "Building a RAG System" → "building-a-rag-system"
title
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-+|-+$/g, "")
```

---

## Configuration Options

### Rate Limiting

**Current setting:** 3 seconds between URLs

```typescript
// In sheetsSync.ts and testSheetsSync.ts
const DELAY_BETWEEN_URLS = 3000; // milliseconds
```

**Why 3 seconds?**
- Prevents overwhelming source websites
- Avoids API rate limits
- Gives pages time to load fully

**Adjust if needed:**
- Faster: `1000` (1 second) - riskier
- Slower: `5000` (5 seconds) - safer

### Browser Settings

**Headless mode** (current: enabled)
```typescript
browser = await puppeteer.launch({
  headless: true, // No visible window
  args: ["--no-sandbox", "--disable-setuid-sandbox"],
});
```

**Set to `false` for debugging:**
- Watch browser navigate in real-time
- Useful for troubleshooting scraping issues

### Timeout Settings

**Page navigation timeout:** 30 seconds
```typescript
await page.goto(url, {
  waitUntil: "networkidle2",
  timeout: 30000,
});
```

**Cloud function timeout:** 9 minutes (540 seconds)
- Set in `sheetsSync.ts` function configuration
- Enough for ~180 URLs at 3s delay

---

## Troubleshooting

### Common Issues

#### 1. "No URLs to process"
**Problem:** All rows marked as Published
**Solution:**
- Change some Input tab rows to `Published: No` or leave blank
- Check column header is exactly "Published" (case-insensitive)

#### 2. "Failed to read from tab 'Input'"
**Problem:** Service account lacks access
**Solution:**
- Share Google Sheet with service account email
- Set permission to **Editor** (not Viewer)
- Check sheet ID in `.env.local` matches actual sheet

#### 3. "Error fetching category mapping"
**Problem:** Webflow API credentials invalid
**Solution:**
- Verify `WEBFLOW_API_TOKEN` in `.env.local`
- Check token hasn't expired in Webflow settings
- Ensure token has CMS read/write permissions

#### 4. Title extraction wrong (getting site name)
**Problem:** Page structure unusual
**Solution:**
- Title extraction uses multiple strategies
- Check if page has proper `<h1>` in content area
- Fallbacks: og:title → title tag → "Untitled Article"

#### 5. Webflow post creation fails (400 error)
**Problem:** Field validation error
**Solution:**
- Check Webflow CMS field requirements
- Verify `WEBFLOW_BLOG_COLLECTION_ID` is correct
- Ensure all required fields are populated

#### 6. Broken thumbnail URLs
**Problem:** og:image points to non-existent file
**Solution:**
- System currently doesn't validate image URLs
- Broken URLs are saved as-is
- Consider manual review of Output tab
- Future enhancement: add URL validation

#### 7. "Category not found in mapping"
**Problem:** Input tab has unknown category name
**Solution:**
- Check warning message for available categories
- Fix typo in Input tab Category column
- Falls back to W&B category automatically

### Debugging Tips

**Enable verbose logging:**
```bash
# Local testing shows all logs by default
npm run test:sheets

# Cloud function logs
firebase functions:log --only sheetsScraperSync --limit 100
```

**Test single URL:**
```bash
npm run test:single-url
# Edit testSingleUrl.ts to change URL
```

**Check browser behavior:**
```typescript
// In testSheetsSync.ts, change:
headless: false  // Make browser visible
```

**Verify Google Sheets access:**
```bash
# Try reading sheet manually
firebase functions:shell
> const {readFromTab} = require('./lib/utils/sheetsUtils')
> readFromTab('YOUR_SHEET_ID', 'Input').then(console.log)
```

---

## Performance & Limits

### Processing Speed

| URLs | Time (3s delay) | Notes |
|------|----------------|-------|
| 10 | ~1 minute | Including overhead |
| 50 | ~3 minutes | Typical batch |
| 100 | ~6 minutes | Within cloud timeout |
| 180 | ~9 minutes | Maximum for 9min timeout |

### Cloud Function Limits

- **Memory:** 2GiB (handles multiple browser tabs)
- **Timeout:** 9 minutes (540 seconds)
- **Concurrency:** 1 instance (sequential processing)
- **Daily runs:** 1 (scheduled at 9 AM UTC)

### Rate Limiting

**Google Sheets API:**
- Read/Write quota: 300 requests per minute per project
- No issue with current usage (1 read + N writes)

**Webflow API:**
- Rate limit: 60 requests per minute
- Current: ~20-30 requests per minute (safe)

**Puppeteer:**
- No built-in limits
- Respect source website robots.txt
- 3-second delay prevents overwhelming servers

---

## Best Practices

### Before Running Sync

1. ✅ Verify Google Sheet is shared with service account
2. ✅ Check Input tab has URLs with `Published ≠ "yes"`
3. ✅ Test with 2-3 URLs first (local test)
4. ✅ Review Output tab structure matches expectations
5. ✅ Confirm Webflow categories exist for all blog sources

### During Sync

1. ✅ Monitor logs for errors
2. ✅ Check Output tab for results in real-time
3. ✅ Verify Published status updates in Input tab
4. ✅ Review Webflow drafts for accuracy

### After Sync

1. ✅ Review final stats (Total, Processed, Errors, Success Rate)
2. ✅ Check Output tab for any missing thumbnails
3. ✅ Verify Webflow drafts have correct categories
4. ✅ Publish Webflow drafts manually (or via publish endpoint)
5. ✅ Archive old Output tab rows if needed

---

## Files Reference

### Core Implementation

| File | Purpose |
|------|---------|
| `functions/src/webflow/sheetsSync.ts` | Cloud function (scheduled daily) |
| `functions/src/scripts/testSheetsSync.ts` | Local test script (identical logic) |
| `functions/src/utils/sheetsUtils.ts` | Google Sheets read/write operations |
| `functions/src/utils/webflowUtils.ts` | Webflow API client & category mapping |
| `functions/src/utils/categoryDetector.ts` | Content category detection |
| `functions/src/utils/auth.ts` | Google authentication |

### Configuration

| File | Purpose |
|------|---------|
| `functions/.env.local` | Local testing credentials (gitignored) |
| `functions/.env.local.example` | Template for credentials |
| `functions/package.json` | Dependencies & npm scripts |
| `functions/LOCAL_TESTING.md` | Detailed local testing guide |

### Documentation

| File | Purpose |
|------|---------|
| `functions/SHEETS_SYNC_GUIDE.md` | This guide |
| `functions/LOCAL_TESTING.md` | Local testing setup & troubleshooting |

---

## Quick Reference

### npm Scripts

```bash
# Build TypeScript
npm run build

# Local testing (main command)
npm run test:sheets

# Test single URL (edit testSingleUrl.ts first)
npm run test:single-url

# Deploy to Firebase
firebase deploy --only functions:sheetsScraperSync

# View logs
firebase functions:log --only sheetsScraperSync
```

### Environment Variables

```env
SHEETS_SCRAPER_URL=<Google Sheet URL>
GOOGLE_CLIENT_EMAIL=<Service account email>
GOOGLE_PRIVATE_KEY=<Service account private key>
WEBFLOW_API_TOKEN=<Webflow API token>
WEBFLOW_SITE_ID=<Webflow site ID>
WEBFLOW_BLOG_COLLECTION_ID=<Webflow collection ID>
```

### Key Endpoints

- **Google Sheet:** https://docs.google.com/spreadsheets/d/1rMbsnVq8K0n8LpyA3la9-Kri8ZsgsLL0IB6UMciahE8/edit
- **Webflow API:** https://api.webflow.com/v2
- **Firebase Console:** https://console.firebase.google.com/project/ai-adv-5e502
- **Blog Categories Collection ID:** `68ee616f267332a8b301b95b`

---

## Support & Maintenance

### Adding New Blog Sources

1. Create category in Webflow CMS
2. Get category item ID from Webflow API
3. Add to Input sheet Category column
4. System auto-detects (no code changes!)

### Updating Scraping Logic

Edit these functions in both files:
- `extractTitle()` - Title extraction strategies
- `extractThumbnail()` - Image extraction strategies
- `extractDescription()` - Description extraction

Apply changes to:
- `functions/src/webflow/sheetsSync.ts` (cloud)
- `functions/src/scripts/testSheetsSync.ts` (local)

### Future Enhancements

- [ ] Image URL validation (verify thumbnails exist)
- [ ] Duplicate detection (check if article already synced)
- [ ] Retry logic for failed URLs
- [ ] Email notifications on completion
- [ ] Parallel processing (multiple URLs at once)
- [ ] Custom field mapping per blog source
- [ ] Slack notifications for errors

---

**Last Updated:** 2025-11-11
**Version:** 1.0
**Maintained By:** Marketing Agent Team
