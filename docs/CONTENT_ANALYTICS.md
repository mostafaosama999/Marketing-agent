# Content Analytics System

## Overview

A unified content marketing analytics system that syncs performance data from LinkedIn, Towards Data Science (TDS), and Medium into Firestore, displays it in the marketing app dashboard, and feeds into the BDR content-ideas skill for data-driven idea generation.

## Architecture

```
Data Sources                    Sync Methods              Storage           Display + Integration
-----------                    ------------              -------           ---------------------
LinkedIn (Excel .xlsx)  --->   Claude Skill              Firestore         Marketing App UI
                        --->   Browser File Upload   --> (contentAnalytics  (/analytics/outbound
TDS (copy-paste text)   --->   Claude Skill              /mostafa)          ?tab=personal)
                        --->   Browser Paste Dialog
Medium (copy-paste text)--->   Claude Skill                                BDR content-ideas
                        --->   Browser Paste Dialog                        skill (Phase 0)
```

## Data Sources & Formats

### LinkedIn (Excel Export)
Export from LinkedIn analytics page. File placed in `data/linkedin/` directory.

**5 Sheets:**
| Sheet | Content | Key Fields |
|-------|---------|------------|
| DISCOVERY | Overall metrics | impressions, membersReached, period |
| ENGAGEMENT | Daily time series (366 rows) | date, impressions, engagements |
| TOP POSTS | Top 50 posts (two side-by-side tables) | url, publishDate, engagements, impressions |
| FOLLOWERS | Total + daily new followers | totalFollowers, date, newFollowers |
| DEMOGRAPHICS | Audience breakdown | company, location, companySize, seniority, jobTitle with percentages |

### Towards Data Science (Copy-Paste)
Copy from TDS WordPress analytics dashboard (`/wp-admin/` analytics page).

**Per-article fields:** Title, Pageviews (lifetime), Engaged Views (lifetime), Pageviews (30d), Engaged Views (30d), Estimated Payout, Paid, Published Date

**Filtering:** Only articles from 2026 onward are synced.

### Medium (Copy-Paste)
Copy from Medium stats page (`medium.com/me/stats`).

**Monthly summary:** Presentations, Views, Reads, Followers gained, Subscribers gained
**Per-story fields:** Title, Read Time, Publish Date, Presentations, Views, Reads, Earnings

**Filtering:** Only stories from 2026 onward are synced.

## Firestore Schema

**Firebase Project:** `marketing-app-cc237`
**User ID:** `mostafa` (hardcoded constant)

### Parent Document
`contentAnalytics/mostafa`

```typescript
{
  lastSyncAt: Timestamp,
  platforms: {
    linkedin: { lastSyncAt, totalImpressions, totalEngagement, totalFollowers, postCount } | null,
    tds: { lastSyncAt, totalPageviews, totalEngagedViews, totalEarnings, articleCount } | null,
    medium: { lastSyncAt, totalViews, totalReads, totalEarnings, storyCount } | null
  },
  crossPlatform: {
    totalReach: number,
    totalEngagement: number,
    totalContentPieces: number,
    totalEarnings: number,
    topPerformingContent: [{ title, platform, reach, engagement }],
    platformPerformance: [{ platform, totalPieces, avgReachPerPiece, avgEngagementRate }]
  }
}
```

### Subcollections

| Path | Documents | Fields |
|------|-----------|--------|
| `linkedin_discovery/summary` | 1 doc | overallImpressions, membersReached, periodStart, periodEnd |
| `linkedin_engagement/{YYYY-MM-DD}` | ~366 docs | date, impressions, engagements, engagementRate |
| `linkedin_posts/{postId}` | ~50 docs | url, publishDate, engagements, impressions, engagementRate |
| `linkedin_followers/summary` | 1 doc | totalFollowers, asOfDate, dailyNewFollowers[] |
| `linkedin_demographics/summary` | 1 doc | company[], location[], companySize[], seniority[], jobTitle[] |
| `tds_articles/{articleId}` | Variable | title, pageviewsLifetime, engagedViewsLifetime, pageviews30d, engagedViews30d, estimatedPayout, paid, publishedDate |
| `tds_summary/latest` | 1 doc | totalArticles, totalPageviews, totalEngagedViews, totalEarnings, avgEngagementRate |
| `medium_stories/{storyId}` | Variable | title, readTime, publishDate, presentations, views, reads, earnings, readRate |
| `medium_summary/latest` | 1 doc | currentMonth{}, totalStories, totalViews, totalReads, totalEarnings, avgReadRate |

## Sync Methods

### Claude Skill (CLI)
**Skill:** `/sync-analytics` in the BDR repo (`claude_BDR_codecontent/.claude/skills/sync-analytics/SKILL.md`)

```bash
/sync-analytics linkedin    # Parse Excel from data/linkedin/
/sync-analytics tds         # Paste TDS stats
/sync-analytics medium      # Paste Medium stats
/sync-analytics all         # All three
```

LinkedIn uses Python + openpyxl for Excel parsing. TDS and Medium use text parsing from user paste input.

### Browser UI
**Page:** `/analytics/outbound?tab=personal`
**Sync Dialog:** Click "Sync Data" button to open ContentSyncDialog with 3 tabs:
- LinkedIn: File upload (`.xlsx`) parsed client-side with SheetJS
- TDS: Paste textarea
- Medium: Paste textarea

## UI Components

| Component | Purpose |
|-----------|---------|
| `ContentAnalyticsDashboard.tsx` | Main container with platform toggle and sync button |
| `ContentOverview.tsx` | Cross-platform aggregate metrics and charts |
| `LinkedInAnalyticsPanel.tsx` | LinkedIn-specific analytics (discovery, engagement, posts, demographics) |
| `TDSAnalyticsPanel.tsx` | TDS article performance table and metrics |
| `MediumAnalyticsPanel.tsx` | Medium story performance table and metrics |
| `ContentSyncDialog.tsx` | Multi-platform sync dialog with file upload and paste areas |

## BDR Integration

The `content-ideas` skill in the BDR repo reads analytics data in **Phase 0** before launching its 5 research agents.

**What it reads:**
- Cross-platform summary from `contentAnalytics/mostafa`
- TDS articles from `tds_articles` subcollection
- Medium stories from `medium_stories` subcollection
- LinkedIn demographics from `linkedin_demographics/summary`

**How it uses it:**
- Builds an "Analytics Brief" with top performers, topic patterns, platform benchmarks, audience profile
- Passes the brief to all 5 research agents as additional context
- Adds "Historical performance signal" (0-2 points) to idea scoring (total scale now 0-12)

## Key Files

| File | Location |
|------|----------|
| Types | `agency-app/src/types/contentAnalytics.ts` |
| Parsers | `agency-app/src/utils/analyticsParserUtils.ts` |
| Firestore Service | `agency-app/src/services/api/contentAnalyticsService.ts` |
| Dashboard Page | `agency-app/src/pages/analytics/OutboundAnalytics.tsx` |
| UI Components | `agency-app/src/components/features/analytics/Content*.tsx` |
| Sync Skill | `claude_BDR_codecontent/.claude/skills/sync-analytics/SKILL.md` |
| Content Ideas Skill | `claude_BDR_codecontent/.claude/skills/content-ideas/SKILL.md` |
| Analytics Config | `claude_BDR_codecontent/context/analytics-config.md` |
| LinkedIn Data Dir | `data/linkedin/` (Excel files, gitignored) |

## Troubleshooting

| Issue | Solution |
|-------|---------|
| Excel parsing fails | Verify .xlsx format, check sheet names match (DISCOVERY, ENGAGEMENT, TOP POSTS, FOLLOWERS, DEMOGRAPHICS) |
| TDS paste not parsing | Ensure full table is copied including all columns. Skip header/footer noise. |
| Medium paste not parsing | Copy from the "Stories" section of stats. Ensure story title + metrics are included. |
| No data showing in UI | Check Firestore for `contentAnalytics/mostafa` document. Verify sync completed. |
| Old data persists | Each sync deletes existing subcollection docs before writing new ones (clean overwrite). |
| Pre-2026 articles showing | Check that parser filter is working. TDS/Medium only sync 2026+ content. |
| BDR skill can't read analytics | Verify Firebase MCP is configured in BDR Claude instance. Check project is `marketing-app-cc237`. |
