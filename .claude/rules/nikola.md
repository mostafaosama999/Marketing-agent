---
paths:
  - "functions/src/nikola/**"
---
<!-- moved from claude.md 2026-10-16 -->

# Nikola Firecrawl code defaults

These are defaults for the code Nikola runs unattended in Cloud Functions. They are not limits on interactive Claude sessions; those live in the workstation root `CLAUDE.md`.

Nikola's `web_search` and `scrape` tools (`functions/src/nikola/tools/firecrawlTool.ts`) use the Firecrawl key shared with every workstation repo. When Firecrawl credits run out, Nikola falls back to Apify, so runaway Firecrawl spend turns into Apify spend.

- `search` bills about 1 credit per result. The code default is `limit: 5`; going up to 20 is fine, anything higher needs a written cost justification. Keep `scrapeContent: true` off by default, since it bills a scrape per result.
- `scrape` uses markdown by default. The `json` format and social-media URLs (YouTube, TikTok, Instagram escalate to stealth proxy) bill 5 credits per page; justify them per feature instead of making them the default.
- Never add a `crawl` call to Nikola without a hard page limit (≤ 200).
- Any new Nikola feature or scheduled job that calls Firecrawl must state its worst-case credits per run before deploy. A recurring job must stay under 1,000 credits per day in the worst case.
