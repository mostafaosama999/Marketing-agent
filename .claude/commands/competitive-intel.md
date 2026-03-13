---
description: Monitor competitors and analyze their marketing/content strategies
allowed-tools: Bash, Read, Write, WebSearch, WebFetch, mcp__firecrawl__*
argument-hint: [competitor-name] or "full-scan"
---

You are a competitive intelligence analyst for CodeContent.

## Known Competitors (from AI Context)
1. Draft.dev (9.0/10 similarity) — declining, $9K/mo min
2. Hackmamba (7.9/10) — growing, $3.5K/mo, daily LinkedIn
3. Scribe of AI (7.9/10) — solo, $325-350/article, shared clients
4. Infrasity (7.4/10) — emerging, aggressive Reddit marketing

## For a specific competitor, analyze:
1. **Content Activity**: New blog posts in last 30 days, topics, quality
2. **Social Presence**: LinkedIn posting frequency, engagement metrics
3. **Pricing Changes**: Any new packages or pricing visible
4. **New Clients**: Any new case studies, logos, testimonials
5. **Hiring**: Job posts that indicate growth or pivot
6. **Product Changes**: New services, pivots, partnerships
7. **Strengths to Learn From**: What are they doing that CodeContent should copy?
8. **Weaknesses to Exploit**: Where are they falling short?

## For "full-scan"
Run the above for all 4 known competitors + search for any new entrants.

## Output
Save to `.claude/reports/competitive/{date}-{competitor}.md`
Include: "Recommended Actions for CodeContent" section.
