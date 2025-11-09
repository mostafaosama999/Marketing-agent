# Local Scraper Test

Run the W&B scraper locally and save CSV to your computer.

**NO cloud storage, NO Webflow sync - just a local CSV file.**

## How to Run

```bash
cd /Users/mostafa.osama2/Desktop/projects/Marketing-agent/functions

# Run the scraper
npm run test:scraper
```

## What It Does

1. Scrapes articles from https://wandb.ai/mostafaibrahim17/ml-articles/reportlist
2. Converts to CSV format
3. Saves to `functions/output/wandb-articles-{date}.csv`
4. Shows preview of first 3 articles

## Output Location

```
functions/
  └── output/
      └── wandb-articles-2025-11-09.csv  ← Your CSV file
```

## CSV Format

```csv
Name,Slug,Blog External Link,Created On,Last Edited,Description
"Building a RAG System","building-a-rag-system","https://wandb.ai/...","2024-05-20","4 months ago",""
```

## Notes

- Output folder is git-ignored (CSVs won't be committed)
- Scraper runs with headless Chrome via Puppeteer
- Takes ~30-60 seconds depending on number of articles
- If scraping fails, check your internet connection

## Troubleshooting

**Error: "Cannot find module 'papaparse'"**
```bash
npm install
```

**Error: "Puppeteer failed to launch"**
```bash
# On Mac, install Chromium dependencies
brew install chromium
```

**No articles scraped**
- Check if W&B page structure changed
- Try opening the URL in your browser to verify it loads
