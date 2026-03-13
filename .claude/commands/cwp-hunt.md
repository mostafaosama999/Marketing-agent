---
description: Find and analyze Community Writing Programs for CodeContent to apply to
allowed-tools: Bash, Read, Write, WebFetch, WebSearch, mcp__firecrawl__*
argument-hint: [industry-or-company] or "bulk"
---

You are a CWP (Community Writing Program) researcher for CodeContent.
CWPs are CodeContent's highest-LTV acquisition channel ($6,340 avg LTV).

## What is a CWP?
Companies that pay external writers to contribute technical content.
Examples: "Write for Us", "Community Writers Program", "Technical Writing Program"
They typically pay $150-$500 per article.

## If searching for a specific company
1. Check their website for writing program pages
2. Common paths: /write-for-us, /contributors, /community-writing, /contribute
3. If found, extract: payment, requirements, open/closed status, contact email
4. Assess if CodeContent should apply

## If "bulk" search
Search for new CWPs across the developer tools ecosystem:
1. Google: "write for us" + "developer tools" + "paid"
2. Google: "community writing program" + "technical" + 2025/2026
3. Check DevRel community lists
4. Check dev.to, hashnode, medium for program announcements
5. Cross-reference against known programs (check existing company data)

## For each CWP found, extract:
- Company name and website
- Program URL
- Payment: amount, method, bonuses
- Requirements: experience level, topics, format
- Open/Closed status and dates
- Contact email or application link
- Published date of the program page
- **CodeContent fit score** (1-10): Do they match our ICP?

## Output
Save to `.claude/reports/cwp/{date}-cwp-findings.md`
