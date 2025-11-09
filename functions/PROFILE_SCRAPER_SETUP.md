# Profile Scraper System - Setup & Configuration Guide

## Overview

The Profile Scraper System automatically scrapes article data from profile pages (starting with Weights & Biases) and syncs it to Webflow. The system is designed to be extensible for adding more platforms in the future.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Profile Scraper Pipeline                  │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Scrape Articles (W&B)                                    │
│     ↓                                                         │
│  2. Generate CSV → Cloud Storage                             │
│     ↓                                                         │
│  3. Read CSV → Parse Articles                                │
│     ↓                                                         │
│  4. Sync to Webflow (with deduplication)                     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## File Structure

```
functions/src/
├── webflow/
│   ├── dailySync.ts              # OLD - Original Webflow sync (kept)
│   ├── profileSync.ts            # NEW - Main scraper orchestrator
│   └── manualTrigger.ts          # NEW - Manual trigger functions
├── scrapers/
│   ├── baseScraper.ts            # NEW - Abstract base class
│   ├── wandbScraper.ts           # NEW - W&B implementation
│   └── scraperRegistry.ts        # NEW - Multi-scraper manager
├── utils/
│   ├── csvManager.ts             # NEW - CSV operations
│   └── webflowUtils.ts           # UPDATED - Added sync methods
└── index.ts                      # UPDATED - Added exports
```

## Prerequisites

### 1. Dependencies Installed ✅

Already installed:
- `puppeteer` - For web scraping
- `@google-cloud/storage` - For Cloud Storage
- `papaparse` - For CSV parsing
- `@types/papaparse` - TypeScript types

### 2. Firebase Configuration Required

Set the following environment variables using Firebase CLI:

```bash
# Webflow Configuration (for new collection)
firebase functions:config:set \
  webflow.portfolio_collection_id="YOUR_NEW_COLLECTION_ID"

# Scraper Configuration
firebase functions:config:set \
  scraper.wandb_profile_url="https://wandb.ai/mostafaibrahim17/ml-articles/reportlist"

# Storage Configuration
firebase functions:config:set \
  storage.csv_bucket="YOUR_PROJECT_ID-webflow-sync"
```

**Note:** The existing `webflow.api_token`, `webflow.site_id`, and `webflow.blog_collection_id` are kept for the old sync and reused for the new system.

### 3. Cloud Storage Bucket

The system will auto-create the bucket on first run, but you can create it manually:

```bash
# Via Firebase Console
# Go to Storage → Create bucket → Name: {project-id}-webflow-sync

# Or via gcloud CLI
gsutil mb -l US gs://{project-id}-webflow-sync
```

### 4. Webflow Collection Setup

Create a new Webflow collection with these fields:

| Field Name      | Type      | Required | Notes                           |
|-----------------|-----------|----------|---------------------------------|
| Name            | Text      | Yes      | Article title                   |
| Slug            | Slug      | Yes      | URL-safe slug (auto from name)  |
| External URL    | URL       | No       | Link to original article        |
| Post Summary    | Text      | No       | Article description             |
| Created On      | Date      | No       | Original publish date           |
| Last Edited     | Date      | No       | Last modified date              |

Get the collection ID from Webflow and set it in Firebase config.

## Deployment

### Build TypeScript

```bash
cd functions
npm run build
```

### Deploy All Functions

```bash
firebase deploy --only functions
```

### Deploy Specific Functions

```bash
# Deploy scheduled sync only
firebase deploy --only functions:profileScraperSync

# Deploy manual trigger only
firebase deploy --only functions:triggerProfileScraper
```

## Usage

### 1. Scheduled Sync (Automatic)

The `profileScraperSync` function runs daily at 9 AM UTC automatically.

**To change schedule:**

Edit `functions/src/webflow/profileSync.ts`:

```typescript
.schedule('0 9 * * *') // Daily at 9 AM UTC
// Change to:
.schedule('0 2 * * *') // Daily at 2 AM UTC
// Or:
.schedule('0 */6 * * *') // Every 6 hours
```

### 2. Manual Trigger (On-Demand)

#### From Frontend (React)

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const triggerScraper = httpsCallable(functions, 'triggerProfileScraper');

// Trigger scraping and syncing
const handleTriggerScraper = async () => {
  try {
    const result = await triggerScraper();
    console.log('Sync completed:', result.data);
    // result.data contains: { success, stats, csvUrl, executionTime }
  } catch (error) {
    console.error('Sync failed:', error);
  }
};
```

#### From Firebase CLI

```bash
# Trigger full sync
firebase functions:call triggerProfileScraper

# Run scraper only (no Webflow sync)
firebase functions:call runScraperOnly --data '{"scraperId":"wandb","maxArticles":10}'

# Get scraper status
firebase functions:call getScraperStatusInfo

# List CSV files
firebase functions:call listCSVFiles

# Get CSV download URL
firebase functions:call getCSVDownloadUrl --data '{"fileName":"wandb-articles-2025-11-09.csv"}'
```

### 3. Run Scraper Only (Preview Mode)

Scrape articles without syncing to Webflow - useful for testing:

```typescript
const runScraper = httpsCallable(functions, 'runScraperOnly');

const result = await runScraper({
  scraperId: 'wandb',
  maxArticles: 10  // Optional: limit results
});

// result.data contains:
// {
//   success: true,
//   scraperId: 'wandb',
//   totalArticles: 10,
//   articles: [...],  // First 10 for preview
//   csvUrl: 'gs://...',
//   downloadUrl: 'https://...'  // Signed URL (1 hour expiry)
// }
```

## CSV Output Format

The generated CSV files have this structure:

```csv
Name,Slug,Blog External Link,Created On,Last Edited,Description,Image URL,Author,Tags
"Building a RAG System","building-a-rag-system","https://wandb.ai/...","2024-05-20","2024-09-15","Article description","","",""
```

CSV files are stored in Cloud Storage at:
```
gs://{project-id}-webflow-sync/wandb-articles-{date}.csv
```

## Adding More Scrapers (Future)

### Step 1: Create Scraper Class

Create `functions/src/scrapers/mediumScraper.ts`:

```typescript
import {BaseProfileScraper, ScrapedArticle, ScraperConfig} from './baseScraper';
import * as puppeteer from 'puppeteer';

export class MediumScraper extends BaseProfileScraper {
  getScraperName(): string {
    return 'Medium';
  }

  getPlatformId(): string {
    return 'medium';
  }

  async scrape(): Promise<ScrapedArticle[]> {
    // Implementation here
    // Return array of ScrapedArticle
  }
}
```

### Step 2: Register in Registry

Edit `functions/src/scrapers/scraperRegistry.ts`:

```typescript
import {MediumScraper} from './mediumScraper';

const SCRAPER_REGISTRY: RegisteredScraper[] = [
  {
    id: 'wandb',
    name: 'Weights & Biases',
    platformId: 'wandb',
    enabled: true,
    configKey: 'scraper.wandb_profile_url',
    scraperClass: WandBScraper,
  },
  {
    id: 'medium',
    name: 'Medium',
    platformId: 'medium',
    enabled: true,  // Set to true to enable
    configKey: 'scraper.medium_profile_url',
    scraperClass: MediumScraper,
  },
];
```

### Step 3: Configure

```bash
firebase functions:config:set \
  scraper.medium_profile_url="https://medium.com/@yourprofile"
```

### Step 4: Deploy

```bash
firebase deploy --only functions
```

Now `runAllScrapersManual` will automatically include Medium scraper!

## Monitoring & Debugging

### View Logs

```bash
# All profile scraper logs
firebase functions:log --only profileScraperSync

# Manual trigger logs
firebase functions:log --only triggerProfileScraper

# Real-time streaming
firebase functions:log --only profileScraperSync --tail
```

### Check Scraper Status

```typescript
const getStatus = httpsCallable(functions, 'getScraperStatusInfo');
const status = await getStatus();

// Returns:
// {
//   success: true,
//   scrapers: [
//     { id: 'wandb', name: 'W&B', enabled: true, configured: true }
//   ],
//   total: 1,
//   enabled: 1,
//   configured: 1
// }
```

### Common Issues

#### 1. Scraper Times Out

**Cause:** Puppeteer taking too long

**Solution:** Increase timeout in `functions/src/webflow/profileSync.ts`:

```typescript
.runWith({
  timeoutSeconds: 540, // Increase to 9 minutes
  memory: '2GB',
})
```

#### 2. No Articles Scraped

**Cause:** W&B page structure changed

**Solution:** Update selectors in `functions/src/scrapers/wandbScraper.ts`:

```typescript
const possibleSelectors = [
  '[data-test="report-row"]',
  '.report-row',
  // Add new selectors here
];
```

#### 3. CSV Not Saving

**Cause:** Bucket doesn't exist or wrong permissions

**Solution:**
```bash
# Create bucket manually
gsutil mb -l US gs://{project-id}-webflow-sync

# Check permissions
gsutil iam get gs://{project-id}-webflow-sync
```

#### 4. Webflow Sync Fails

**Cause:** Collection ID mismatch or API rate limit

**Solution:**
- Verify collection ID in Firebase config
- Check Webflow API rate limits (500ms delay between requests)
- Review Webflow API logs in function logs

## Performance Tuning

### Reduce Scraping Time

```typescript
// In wandbScraper.ts, reduce wait time
await page.waitForTimeout(1000); // Reduce from 3000ms
```

### Increase Concurrent Scrapers

```typescript
// In scraperRegistry.ts, run scrapers in parallel
const results = await Promise.all(
  enabledScrapers.map(scraper => scraper.execute())
);
```

### Optimize CSV Storage

```typescript
// Archive old CSVs after 30 days
// Set lifecycle policy on bucket
gsutil lifecycle set lifecycle.json gs://{bucket-name}
```

## Security

### Authentication Required

All manual trigger functions require authentication:

```typescript
if (!context.auth) {
  throw new functions.https.HttpsError('unauthenticated', 'Auth required');
}
```

### Optional: Role-Based Access

Uncomment in `manualTrigger.ts` to restrict to CEO/Manager:

```typescript
const userDoc = await db.collection('users').doc(context.auth.uid).get();
const userRole = userDoc.data()?.role;
if (!['ceo', 'manager'].includes(userRole)) {
  throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
}
```

## Cost Estimation

### Cloud Functions

- **Invocations:** 1 per day (scheduled) + manual triggers
- **Compute Time:** ~30-60 seconds per run
- **Memory:** 2GB allocated
- **Estimated:** $0.01 - $0.05/day

### Cloud Storage

- **Storage:** ~1MB per CSV file
- **Operations:** 1 write + 1 read per day
- **Estimated:** $0.001/day

### Puppeteer Browser

- Runs headless, minimal overhead
- Cloud Functions optimized with `--no-sandbox` flags

**Total Estimated Cost:** < $2/month

## Testing

### Local Testing

```bash
# Start emulators
firebase emulators:start --only functions

# In another terminal, trigger function
curl -X POST http://localhost:5001/{project-id}/us-central1/triggerProfileScraper \
  -H "Content-Type: application/json" \
  -d '{}' \
  -H "Authorization: Bearer {test-token}"
```

### Production Testing

```bash
# Deploy to staging first
firebase use staging
firebase deploy --only functions:profileScraperSync

# Trigger manually
firebase functions:call triggerProfileScraper

# Check logs
firebase functions:log --only profileScraperSync --tail
```

## Next Steps

1. ✅ System deployed and configured
2. 🔄 Test manual trigger to verify W&B scraping
3. 📊 Review CSV output in Cloud Storage
4. 🌐 Verify Webflow sync creates draft posts
5. 🔁 Enable scheduled sync after validation
6. 🚀 Add more scrapers as needed

## Support

For issues or questions:
1. Check function logs: `firebase functions:log`
2. Review error messages in Cloud Console
3. Test with `runScraperOnly` for debugging
4. Check CSV output format matches expectations

---

**Last Updated:** 2025-11-09
**Version:** 1.0.0
