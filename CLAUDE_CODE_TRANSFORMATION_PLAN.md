# CodeContent: Claude Code Transformation Plan

## How to Supercharge Your Marketing Operations with Claude Code

**Based on**: Full codebase analysis (43 cloud functions, 52 services, 9 component systems), CodeContent AI Context (Notion), claudecodeformarketers.com, Claude Code official docs, MCP ecosystem research, and marketing automation trends.

---

## Table of Contents
1. [The Big Picture](#1-the-big-picture)
2. [Skills to Create](#2-skills-to-create)
3. [Sub-Agents to Build](#3-sub-agents-to-build)
4. [MCP Servers to Add](#4-mcp-servers-to-add)
5. [Hooks to Configure](#5-hooks-to-configure)
6. [Innovative Ideas](#6-innovative-ideas-beyond-the-current-codebase)
7. [Implementation Roadmap](#7-implementation-roadmap)

---

## 1. The Big Picture

### What Your Web App Does Well (KEEP)
Your React + Firebase CRM app excels at things that need **persistent state, real-time collaboration, and visual dashboards**:

- **Pipeline visualization** — The Kanban board with drag-drop, duration colors, and stage tracking is inherently visual and interactive
- **Team collaboration** — Real-time Firestore subscriptions, role-based permissions, multi-user concurrent access
- **Data persistence** — Lead timelines, status history, cost tracking, archive system
- **Bulk operations UI** — CSV import with field mapping, bulk status changes, multi-select actions
- **Analytics dashboards** — Lead analytics, company analytics, KPIs, outbound tracking

### What Claude Code Can Do Better (MOVE/AUGMENT)

Your current system has many **workflow-heavy operations** that involve multiple steps, AI calls, and human judgment. These are where Claude Code shines because it can:

1. **Replace rigid multi-stage cloud function pipelines with conversational, adaptive workflows** — Your V1/V2/V3 idea generation is a 5-stage pipeline hardcoded in cloud functions. In Claude Code, this becomes an interactive conversation where you can steer, iterate, and refine ideas in real-time.

2. **Eliminate the "build a feature for every operation" pattern** — Every new workflow (blog analysis, writing program detection, competitor analysis, LinkedIn post generation) requires building a cloud function + frontend UI + Firestore schema. With Claude Code skills, a new workflow is just a Markdown file.

3. **Turn your founder bottleneck into a force multiplier** — Mostafa currently does ALL QA, ALL sales, ALL client management. Claude Code skills can encode his decision-making patterns so the team can run operations independently.

4. **Make research and enrichment interactive instead of fire-and-forget** — Currently, you click "Enrich" and wait for a cloud function. With Claude Code, you can have a conversation: "Research this company, focus on their AI content gaps, and draft a pitch based on what you find."

### The Paradigm Shift

```
CURRENT: User → Web App UI → Cloud Function → AI API → Firestore → UI shows results
                    (rigid, one-size-fits-all, no iteration)

FUTURE:  User → Claude Code skill → Interactive AI conversation → MCP tools → Firestore
                    (adaptive, iterative, human-in-the-loop)
```

**The web app becomes the data layer and dashboard. Claude Code becomes the operator.**

---

## 2. Skills to Create

Skills are reusable Markdown instruction files stored in `.claude/commands/` (slash commands) or `.claude/skills/` (auto-invocable). Each one encodes a workflow that currently requires either a cloud function or manual multi-step process.

### Skill 1: `/research-company` — Deep Company Research

**Replaces**: Manual process of checking website → running `qualifyBlog` → running `findWritingProgram` → running `enrichOrganization` → reviewing results → deciding next steps

**What it does**: Comprehensive company research in one interactive session

```markdown
<!-- .claude/commands/research-company.md -->
---
description: Research a company for client acquisition. Analyzes blog, writing programs, tech stack, and fit for CodeContent.
allowed-tools: Bash, Read, Write, WebFetch, WebSearch, mcp__firecrawl__*, mcp__apollo__*
argument-hint: <company-name> [website-url]
---

You are a B2B sales researcher for CodeContent, a developer-first technical content agency.

## Your Task
Research $ARGUMENTS thoroughly for client acquisition potential.

## Research Steps
1. **Find the company website** if not provided (use WebSearch)
2. **Analyze their blog**:
   - Find their blog URL (check /blog, /resources, /articles, /developers)
   - Check posting frequency (last 3 months)
   - Identify if content is AI-written or human-written
   - Assess technical depth (beginner/intermediate/advanced)
   - Check for code examples, diagrams, real implementations
   - Identify author types (employees, freelancers, community)
3. **Check for a Community Writing Program (CWP)**:
   - Search for /write-for-us, /contributors, /community-writing-program
   - If found: extract payment amount, requirements, open/closed status
4. **Enrich via Apollo** (if MCP available):
   - Employee count, funding stage, tech stack, industry
5. **Assess fit for CodeContent**:
   - Is this a B2D company (developer tools, AI/ML, infrastructure)?
   - Series A-C? Budget likely > $2K/month?
   - Do they need better content? (low quality, infrequent, AI-generated)
   - Do they have a product worth explaining?

## Output Format
Save research to `.claude/reports/companies/{company-name}.md` with:
- Company overview (name, website, industry, funding, employees)
- Blog analysis (frequency, quality rating 1-10, AI-written %, technical depth)
- Writing program details (if found)
- CWP acquisition opportunity (if applicable)
- **Fit Score** (1-10 with reasoning)
- **Recommended next action** (reach out, skip, add to nurture, apply to CWP)

## Context
@CLAUDE.md for company context and ICP criteria.
CodeContent's ICP: Series A-C developer tools, AI/ML, infrastructure companies with 20-500 employees that need technically credible content.
```

**Impact**: Replaces 3 separate cloud functions (`qualifyBlog`, `findWritingProgram`, `enrichOrganization`) with one interactive, steerable workflow. Can follow up with "dig deeper into their tech stack" or "compare their blog to Draft.dev's clients."

---

### Skill 2: `/generate-pitch` — AI-Powered Pitch Generation

**Replaces**: The V1/V2/V3 offer idea generation pipeline (currently 43+ cloud function calls across 3 parallel pipelines)

```markdown
<!-- .claude/commands/generate-pitch.md -->
---
description: Generate personalized blog ideas and pitch for a company based on research
allowed-tools: Bash, Read, Write, WebFetch, WebSearch
argument-hint: <company-name>
---

You are a content strategist for CodeContent, generating blog topic pitches for potential clients.

## Context
Read the company research from `.claude/reports/companies/$ARGUMENTS.md` first.
If no research exists, tell the user to run /research-company first.

@CLAUDE.md for CodeContent's positioning and content quality rules.

## Generation Process

### Step 1: Understand the Company
- What is their product and who uses it?
- What technical topics would their audience care about?
- What content gaps exist on their blog?
- What AI/ML trends are relevant to their space?

### Step 2: Check Current AI Trends
Search for the latest trends from:
- Hacker News top stories related to their tech stack
- Recent arXiv papers in their domain
- ProductHunt launches in their category
Focus: 80% Agentic AI + developer tooling, 20% other relevant trends

### Step 3: Generate 5 Blog Ideas
For each idea:
- **Title**: Specific, not generic. "How [Company] Customers Use [Feature] for [Specific Outcome]" not "Why AI Matters"
- **Why Only They Can Write This**: What company-specific data/product makes this unique
- **What the Reader Learns**: 3-4 specific takeaways with working code
- **Key Stack/Tools**: Technologies involved
- **Angle to Avoid Duplication**: How this differs from existing content
- **AI Trend Connection**: Which current trend this taps into (if applicable)

### Step 4: Self-Validate
For each idea, check:
- [ ] Would this work for a competitor? If yes → too generic, regenerate
- [ ] Does it reference a specific company differentiator?
- [ ] Would a developer with 10+ years experience find this valuable?
- [ ] Does it solve a real problem (not just "thought leadership")?
- [ ] Could CodeContent's engineer-writers actually implement and validate this?

### Step 5: Draft the Pitch Email
Using the best 3 ideas, draft a personalized outreach email following CodeContent's tone:
- Technical-first, direct, honest
- Lead with THEIR problem, not our capabilities
- Reference specific things you found on their blog
- Keep it under 200 words

## Output
Save to `.claude/reports/pitches/{company-name}.md`:
- All 5 validated ideas with scores
- The pitch email draft
- Suggested subject lines (3 options)
- Follow-up email draft (for 5 days later)
```

**Impact**: Replaces 15+ cloud function files (V1/V2/V3 pipelines) with an interactive process. You can say "idea #3 is too generic, make it more specific to their Kubernetes product" and iterate in real-time. No more waiting for 3 parallel pipelines to finish.

---

### Skill 3: `/cwp-hunt` — Community Writing Program Hunter

**Replaces**: The current `findWritingProgram` + `analyzeProgram` two-phase system

```markdown
<!-- .claude/commands/cwp-hunt.md -->
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
```

**Impact**: CWPs are CodeContent's unique competitive advantage ($31,700 LTV from this channel). Currently finding them requires manual searching + 2 cloud function calls. This skill makes CWP hunting a systematic, repeatable process.

---

### Skill 4: `/draft-outreach` — Personalized Email Drafting

**Replaces**: The bulk Gmail draft creation system (template variable replacement + Gmail API)

```markdown
<!-- .claude/commands/draft-outreach.md -->
---
description: Draft personalized outreach emails for leads using company research
allowed-tools: Bash, Read, Write, WebFetch
argument-hint: <company-name> [lead-name] [lead-email]
---

You are drafting outreach emails for CodeContent.

## Context
Read company research: `.claude/reports/companies/$1.md`
Read pitch ideas: `.claude/reports/pitches/$1.md`

## CodeContent's Email Style
- SHORT (under 200 words)
- Lead with THEIR problem, reference THEIR blog specifically
- Never use marketing fluff: "cutting-edge", "revolutionary", "synergy"
- Be direct: "I noticed your blog hasn't posted in 3 months. Here's why that's costing you."
- Include 1-2 specific blog topic ideas personalized to them
- CTA: "Worth a 15-minute chat?"
- Sign off as Mostafa Ibrahim, CodeContent

## What to Reference
- Something specific from their blog (a recent post, a gap you noticed)
- Their tech stack or product (show you understand what they build)
- A relevant data point (developer trust stats, content ROI stats)
- One of the pitch ideas generated

## Output
1. Subject line (3 options)
2. Email body
3. Follow-up email (for 5 days later, different angle)
4. LinkedIn connection request message (shorter, more casual)

Save to `.claude/reports/outreach/{company-name}-draft.md`
```

---

### Skill 5: `/linkedin-content` — Company Brand Building

**Replaces**: The `generateLinkedInPost` cloud function + manual posting

```markdown
<!-- .claude/commands/linkedin-content.md -->
---
description: Generate LinkedIn posts for CodeContent's company brand building
allowed-tools: Bash, Read, Write, WebSearch
argument-hint: [topic] or "weekly-batch"
---

You are a LinkedIn content strategist for CodeContent.

## Context
CodeContent's marketing maturity is 2/10 — the weakest among all competitors.
Competitors like Hackmamba post 1-2x DAILY on LinkedIn.
Goal: Build from 0 to consistent 3-5 posts/week.

## CodeContent's LinkedIn Voice
- Technical-first, direct, honest
- Written by Mostafa Ibrahim (ex-GoCardless, UK-based engineer turned content agency founder)
- Never corporate fluff — write like an engineer talking to engineers
- Share real experiences, data, and opinions
- Reference: actual client work, content quality problems, AI content crisis stats

## Content Pillars (rotate between these)
1. **The AI Content Problem** — Stats about AI-generated content failing developers
2. **Behind the Scenes** — How CodeContent validates tutorials, real QA process
3. **Developer Content Tips** — What makes technical content credible
4. **Industry Insights** — Trends in DevRel, developer tools, content marketing
5. **Client Wins** — (Once case studies exist) Before/after content quality stories

## Key Stats to Reference (from AI Context)
- 74.2% of new web pages contain AI content
- 46% of developers distrust AI output
- 86% of top-ranking articles still human-written
- $85B lost annually to poor documentation
- 702% B2B SaaS SEO ROI over 24 months

## If "weekly-batch"
Generate 5 posts for the week (one per day Mon-Fri), varying across pillars.

## Output Format (per post)
- Hook (first line — must stop the scroll)
- Body (150-250 words, use line breaks for readability)
- CTA (subtle — "What do you think?" or link to a resource)
- 3-5 relevant hashtags
- Best time to post (suggestion)

Save to `.claude/reports/linkedin/{date}-posts.md`
```

**Impact**: Addresses CodeContent's #1 weakness (2/10 marketing maturity, no LinkedIn presence). Competitors have daily posting cadences. This skill makes weekly batch creation a 15-minute process.

---

### Skill 6: `/case-study` — Case Study Generator

**Replaces**: Nothing (CodeContent has ZERO case studies — the biggest credibility gap)

```markdown
<!-- .claude/commands/case-study.md -->
---
description: Generate a case study from client engagement data
allowed-tools: Bash, Read, Write, WebSearch
argument-hint: <client-name>
---

You are creating a case study for CodeContent's website and sales materials.

## Why This Matters
CodeContent has ZERO case studies. Every competitor has them:
- Draft.dev: "Earthly 346% traffic growth", "Sinch Mailgun 20-45% CTR"
- Hackmamba: 8 featured case studies
This is CodeContent's single biggest credibility gap.

## Process
Ask me questions one at a time about this client engagement:
1. Client name and what they do
2. What was the content challenge before CodeContent?
3. What content did CodeContent produce? (types, volume, topics)
4. What was the review process like? (rounds, time per piece)
5. What results can we share? (traffic, signups, SEO rankings, reduced review time)
6. Any quotes from the client?
7. What made this engagement different from typical agencies?

## Output Structure
### Short Version (for website)
- Headline: "[Client] achieved [result] with CodeContent"
- Challenge → Solution → Results (3 bullets each)
- Client quote
- 200-300 words total

### Long Version (for sales proposals)
- Full narrative with specifics
- Before/after comparison
- Process description
- Results with data
- Why CodeContent was the right fit
- 800-1200 words

### Social Snippet
- LinkedIn post announcing the case study
- 2-3 key metrics highlighted

Save to `.claude/reports/case-studies/{client-name}.md`
```

---

### Skill 7: `/competitive-intel` — Competitor Monitoring

**Replaces**: The `findCompetitorsV2` + `extractCompetitorPosts` cloud functions

```markdown
<!-- .claude/commands/competitive-intel.md -->
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
```

---

### Skill 8: `/newsletter-draft` — Monthly Newsletter

**Replaces**: Nothing (CodeContent has no newsletter — identified as a strategic gap)

```markdown
<!-- .claude/commands/newsletter-draft.md -->
---
description: Draft CodeContent's monthly newsletter for developer content leaders
allowed-tools: Bash, Read, Write, WebSearch
argument-hint: [month-year]
---

## Context
Draft.dev has 3,000 newsletter subscribers. Hackmamba has a biweekly newsletter.
CodeContent has nothing. This skill addresses that gap.

## Newsletter Structure
1. **Opening**: 2-3 sentences on a trend/observation (Mostafa's voice)
2. **This Month in Developer Content**: 3-4 curated links with commentary
3. **The AI Content Crisis Update**: One fresh stat or finding
4. **Tutorial of the Month**: Highlight one piece CodeContent published
5. **Quick Tips**: 2-3 actionable content strategy tips
6. **CTA**: "Need help with developer content? Reply to this email."

## Research Required
- Search for latest developer content marketing news
- Find fresh AI content statistics
- Check what competitors published this month
- Look for relevant HN discussions about content quality

## Output
Save to `.claude/reports/newsletter/{month-year}-draft.md`
```

---

### Skill 9: `/qualify-lead` — Lead Scoring and Qualification

**Replaces**: Manual review of Apollo data + blog analysis to decide lead quality

```markdown
<!-- .claude/commands/qualify-lead.md -->
---
description: Score and qualify a lead based on ICP criteria
allowed-tools: Bash, Read, Write, WebSearch
argument-hint: <company-name>
---

## CodeContent ICP Scoring Criteria (from AI Context)

### Must-Have Signals (+20 points each, max 100)
1. Is a B2D company (developer tools, AI/ML, infrastructure, APIs)
2. Series A+ funding (indicates budget for content)
3. Has an existing blog (already investing in content)
4. Has a real technical product developers use
5. 20-500 employees (sweet spot for outsourced content)

### Bonus Signals (+10 points each)
- Has a CWP (CodeContent's highest-LTV channel)
- Blog is inactive/low quality (clear need)
- AI/ML or infrastructure focus (CodeContent's specialty)
- UK or US based (timezone alignment)
- Recent funding round (fresh marketing budget)

### Disqualifying Signals (auto-reject)
- Pre-product startup (nothing to write about)
- Non-technical B2B (HR tools, CRMs for business buyers)
- Budget likely < $2K/month
- Consumer app (not B2D)

## Read Research
Check `.claude/reports/companies/{company}.md` for existing research.
If no research exists, suggest running /research-company first.

## Output
- **Score**: X/100 with breakdown
- **Tier**: Hot (80+) / Warm (60-79) / Cold (40-59) / Skip (<40)
- **Recommended Action**: Specific next step
- **Priority**: Where in the pipeline this should go

Save score to `.claude/reports/leads/{company-name}-score.md`
```

---

### Skill 10: `/content-repurpose` — One Piece → Multiple Formats

```markdown
<!-- .claude/commands/content-repurpose.md -->
---
description: Repurpose a tutorial or blog post into multiple content formats
allowed-tools: Bash, Read, Write
argument-hint: <content-url-or-filepath>
---

Take a single piece of technical content and create:
1. **3 LinkedIn posts** (different angles, different hooks)
2. **5 Twitter/X threads** (technical insights, stats, hot takes)
3. **Newsletter blurb** (2-3 paragraph summary with link)
4. **Email pitch snippet** (for sending to prospects showing capability)
5. **Case study data point** (if metrics are available)

Voice: Mostafa Ibrahim — engineer-founder, direct, technical-first.
Never use: "cutting-edge", "revolutionary", "game-changing", "synergy"

Save to `.claude/reports/repurposed/{content-title}/`
```

---

## 3. Sub-Agents to Build

Sub-agents are autonomous Claude Code instances that handle specific tasks. Define them as `.claude/agents/*.md` files.

### Agent 1: `company-researcher` — Autonomous Company Research

```yaml
# .claude/agents/company-researcher.md
---
name: company-researcher
description: >
  Researches a company for B2B content agency client acquisition.
  Use PROACTIVELY when the user mentions a company name to research.
tools: Read, Write, Glob, Grep, WebSearch, WebFetch
model: sonnet
maxTurns: 30
memory: project
---

You are a B2B sales researcher for CodeContent, a developer-first technical content agency.

When invoked with a company name:
1. Find their website and blog
2. Analyze blog quality (posting frequency, technical depth, AI-written detection)
3. Check for Community Writing Programs
4. Assess ICP fit (B2D? Series A+? 20-500 employees? Technical product?)
5. Generate a fit score (1-10)
6. Write findings to .claude/reports/companies/{name}.md

Key ICP criteria:
- Must be B2D (developer tools, AI/ML, infrastructure)
- Series A-C preferred ($2K+/month budget likely)
- Must have existing blog (already investing in content)
- Content quality gap = opportunity for CodeContent

Always be specific. Reference actual URLs and content you found.
```

### Agent 2: `pitch-generator` — Personalized Idea Generation

```yaml
# .claude/agents/pitch-generator.md
---
name: pitch-generator
description: >
  Generates personalized blog ideas and pitch emails for companies.
  Use after company research is complete.
tools: Read, Write, WebSearch, WebFetch
model: sonnet
maxTurns: 25
memory: project
---

You generate blog topic ideas for CodeContent's sales outreach.

Process:
1. Read company research from .claude/reports/companies/{name}.md
2. Identify 3-5 content gaps on their blog
3. Research current AI/ML trends relevant to their space
4. Generate 5 blog ideas that ONLY they could write (pass the "competitor test")
5. Self-validate each idea against quality criteria
6. Draft a personalized outreach email using the best 3 ideas
7. Save to .claude/reports/pitches/{name}.md

Quality Rules:
- Every idea must reference a specific company differentiator
- "Would this work for a competitor?" If yes → too generic
- No buzzwords: cutting-edge, revolutionary, synergy, etc.
- Ideas should involve working code and real implementations
- Target audience: developers with 10+ years experience
```

### Agent 3: `blog-analyst` — Technical Blog Quality Assessor

```yaml
# .claude/agents/blog-analyst.md
---
name: blog-analyst
description: >
  Analyzes company blogs for content quality, frequency, and AI detection.
  Use when evaluating a company's current content strategy.
tools: Read, Write, WebFetch, WebSearch
model: haiku
maxTurns: 15
memory: project
---

You analyze company blogs for CodeContent's lead qualification.

Analysis checklist:
1. Find the blog URL (check /blog, /resources, /articles, /developers, /engineering)
2. Count posts in last 90 days
3. Identify posting frequency (weekly/biweekly/monthly/sporadic)
4. Check last post date
5. Analyze 3-5 recent posts for:
   - AI-written indicators (generic phrasing, lack of specifics, no code)
   - Technical depth (beginner/intermediate/advanced)
   - Code examples present? Working code or pseudocode?
   - Author types (employees, freelancers, community writers)
   - Topics covered (match to company product?)
6. Rate overall quality: low/medium/high
7. Identify content gaps and opportunities

Output to .claude/reports/blog-analysis/{company}.md
```

### Agent 4: `cwp-researcher` — CWP Discovery Specialist

```yaml
# .claude/agents/cwp-researcher.md
---
name: cwp-researcher
description: >
  Finds and analyzes Community Writing Programs (paid writing opportunities).
  Use PROACTIVELY when user mentions CWP, writing programs, or "find programs".
tools: Read, Write, WebSearch, WebFetch
model: haiku
maxTurns: 20
memory: project
---

You find Community Writing Programs (CWPs) for CodeContent.

CWPs are CodeContent's highest-LTV acquisition channel ($6,340 avg per client).
No competitor uses this channel — it's CodeContent's unique unfair advantage.

Search patterns:
- "[company] write for us"
- "[company] community writing program"
- "[company] technical writing program"
- "write for us developer tools 2026"
- "paid technical writing programs"

For each program found, extract:
- Payment amount and method
- Requirements (experience, topics, format)
- Open/closed status
- Contact email or application link
- Company fit for CodeContent (1-10)

Always verify URLs are accessible before reporting.
Save to .claude/reports/cwp/{company-or-date}.md
```

### Agent 5: `outreach-coordinator` — Multi-Company Orchestration

```yaml
# .claude/agents/outreach-coordinator.md
---
name: outreach-coordinator
description: >
  Coordinates parallel research and outreach for multiple companies.
  Use when the user wants to process a batch of leads.
tools: Task(company-researcher, pitch-generator, blog-analyst, cwp-researcher), Read, Write, Bash
model: sonnet
maxTurns: 50
---

You coordinate parallel research on multiple companies for CodeContent.

When given a list of companies:
1. Spawn company-researcher agents in parallel (max 5 concurrent)
2. Wait for research to complete
3. Review results and filter by ICP fit score (>= 6/10)
4. For qualifying companies, spawn pitch-generator agents
5. Compile a summary report: .claude/reports/batch/{date}-summary.md

Summary includes:
- Companies researched (count)
- Qualified leads (count and names)
- Top opportunities (sorted by fit score)
- CWP opportunities found
- Recommended immediate actions
- Total cost estimate
```

---

## 4. MCP Servers to Add

### Immediate (Replace/Augment Existing Cloud Functions)

#### Firecrawl — Replace Blog Scraping Layer
```bash
claude mcp add --transport stdio \
  --env FIRECRAWL_API_KEY=${FIRECRAWL_API_KEY} \
  firecrawl -- npx -y firecrawl-mcp-server
```
**Replaces**: The RSS/sitemap discovery + `fetchPostWithBackoff()` in `qualifyBlog`. Claude can now scrape any blog page directly.

#### Apollo.io — Direct Enrichment
```bash
claude mcp add --transport stdio \
  --env APOLLO_API_KEY=${APOLLO_API_KEY} \
  apollo -- npx -y apollo-io-mcp-server
```
**Replaces**: The `apolloProxy` cloud function CORS workaround. Claude can query Apollo's 275M+ contact database directly.

#### Playwright — Browser Automation for Writing Programs
```bash
claude mcp add playwright -- npx -y @playwright/mcp@latest
```
**Replaces**: The manual URL-checking logic in `findWritingProgram`. Claude can navigate actual websites, handle JavaScript rendering, and find writing program pages that simple HTTP requests miss.

### Strategic (New Capabilities)

#### Notion — Connected Workspace
Already configured in your project. Use for:
- Reading/updating your Business Plan content
- Accessing AI Context programmatically
- Creating client briefs directly in Notion

#### Slack — Team Notifications
```bash
claude mcp add --transport http slack https://mcp.slack.com/mcp --scope user
```
**Replaces**: The `slackNotification` cloud function. Claude can send Slack messages directly during workflows.

#### Google Sheets — Data Sync
```bash
claude mcp add --transport stdio \
  --env GOOGLE_CREDENTIALS=${GOOGLE_CREDENTIALS_PATH} \
  gsheets -- npx -y @gpwork4u/google-sheets-mcp
```
**Replaces**: The `sheetsSync` hourly export cloud function. Claude can read/write sheets directly.

### Nuclear Option — Pipedream (3,000+ APIs)
```bash
claude mcp add-json "pipedream" '{"command":"npx","args":["@pipedream/mcp"]}'
```
If you want one server that covers Apollo, Gmail, Slack, Google Sheets, LinkedIn, and 2,994 more APIs. Trade-off: less control, more convenience.

### Recommended `.mcp.json` for Project

```json
{
  "mcpServers": {
    "firecrawl": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "firecrawl-mcp-server"],
      "env": { "FIRECRAWL_API_KEY": "${FIRECRAWL_API_KEY}" }
    },
    "playwright": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"]
    },
    "apollo": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "apollo-io-mcp-server"],
      "env": { "APOLLO_API_KEY": "${APOLLO_API_KEY}" }
    }
  }
}
```

---

## 5. Hooks to Configure

### Protect Frozen V1 File (CRITICAL)

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "INPUT=$(cat); FILE=$(echo \"$INPUT\" | jq -r '.tool_input.file_path // empty'); if echo \"$FILE\" | grep -q 'generateOfferIdeas.ts'; then echo 'BLOCKED: V1 offer generation file is FROZEN. Do not modify.' >&2; exit 2; fi; exit 0"
          }
        ]
      }
    ]
  }
}
```

### Protect Main Branch

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "INPUT=$(cat); CMD=$(echo \"$INPUT\" | jq -r '.tool_input.command // empty'); if echo \"$CMD\" | grep -qE 'git push.*(origin|upstream)\\s+main'; then echo 'BLOCKED: Do not push directly to main. Use a feature branch.' >&2; exit 2; fi; exit 0"
          }
        ]
      }
    ]
  }
}
```

### Auto-Format TypeScript After Edits

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "INPUT=$(cat); FILE=$(echo \"$INPUT\" | jq -r '.tool_input.file_path // empty'); if echo \"$FILE\" | grep -qE '\\.(ts|tsx)$'; then npx prettier --write \"$FILE\" 2>/dev/null || true; fi; exit 0"
          }
        ]
      }
    ]
  }
}
```

### Desktop Notification When Claude Needs Attention

```json
{
  "hooks": {
    "Notification": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude Code needs your attention\" with title \"Claude Code\"'"
          }
        ]
      }
    ]
  }
}
```

### Re-inject Critical Context After Compaction

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "compact",
        "hooks": [
          {
            "type": "command",
            "command": "echo 'REMINDER: Firestore companies collection is \"entities\" NOT \"companies\". V1 generateOfferIdeas.ts is FROZEN. Check CLAUDE.md for full project context.'"
          }
        ]
      }
    ]
  }
}
```

---

## 6. Innovative Ideas (Beyond the Current Codebase)

### Idea 1: "Sales Autopilot" — Weekly Automated Prospecting Sprint

Create a weekly ritual powered by Claude Code:

```
Every Monday morning, run:
1. /competitive-intel full-scan (15 min) → what competitors are doing
2. /cwp-hunt bulk (20 min) → find new writing programs to apply to
3. /research-company [5 new prospects] (30 min) → enrich pipeline
4. /generate-pitch [qualified ones] (20 min) → draft outreach
5. /linkedin-content weekly-batch (15 min) → week's social content
6. /newsletter-draft [this-month] (10 min) → if end of month

Total: ~2 hours → 5 new researched leads, 5 LinkedIn posts, CWP applications, competitive intel
```

This replaces what currently requires the founder to manually operate 6+ different features in the web app, each requiring multiple clicks and waiting for cloud functions.

### Idea 2: "Inbound Content Engine" — Build CodeContent's Brand

CodeContent's 2/10 marketing maturity is the biggest bottleneck. Use Claude Code to systematically build content:

1. **Create a `/blog-post` skill** that helps Mostafa write blog posts about developer content marketing
2. **Create a `/medium-article` skill** that repurposes posts for Medium (currently the only inbound channel generating $11.5K LTV)
3. **Create a `/dev-to-post` skill** for cross-posting to DEV.to (Hackmamba has 331 posts there)
4. **Create a `/reddit-post` skill** for Reddit marketing (Infrasity's growth channel)

This directly addresses the strategic priorities from the AI Context: "Start LinkedIn company page", "Launch monthly newsletter", and "Zero case studies."

### Idea 3: "Deal Room" Agent Team — Full Sales Cycle Support

When a prospect responds positively, spin up a team:

```
Outreach Coordinator (Lead)
├── Research Agent — deep-dive into prospect's tech stack, competitors, content history
├── Proposal Generator — create customized proposal with pricing, timeline, samples
├── Content Strategist — draft a 3-month content roadmap specific to prospect
└── Competitive Analyst — show prospect how their content compares to competitors
```

Output: A complete sales package (proposal + content roadmap + competitive analysis) generated in 30 minutes instead of 3 hours of founder time.

### Idea 4: "ReviewMind in Claude Code" — AI Content QA

CodeContent has an internal tool called ReviewMind (v1, v2, v3). Port its review criteria into a Claude Code skill:

```markdown
<!-- .claude/commands/review-content.md -->
Review this technical content against CodeContent's quality rubric:
- [ ] All code snippets tested and runnable
- [ ] Technical claims validated by implementation
- [ ] No AI-generated filler (check for generic phrasing)
- [ ] Hard-stop errors: factual inaccuracies, broken code, misleading claims
- [ ] Depth appropriate for 10+ year developer audience
- [ ] Honest trade-offs acknowledged
- [ ] Structure: clear headings, logical flow, scannable
```

This helps delegate first-pass review from CEO to the team (addressing the #1 structural bottleneck).

### Idea 5: "Client Health Monitor" — Proactive Account Management

```markdown
<!-- .claude/commands/client-health.md -->
For each active client:
1. Check when we last delivered content
2. Review their blog for new posts (are they publishing our content?)
3. Check if our content is ranking (Google search)
4. Flag any client that hasn't received content in 30+ days
5. Generate a "check-in email" for at-risk accounts
```

### Idea 6: "AI Context Auto-Updater" — Keep Notion Context Fresh

Your Notion AI Context document is the foundation for all AI operations. Create a skill that periodically refreshes it:

```markdown
<!-- .claude/commands/update-ai-context.md -->
1. Check for new market data (developer surveys, funding reports)
2. Update competitor information (new pricing, new clients, new hires)
3. Refresh financial metrics (current MRR, client count)
4. Add any new case studies or client wins
5. Update the "Last updated" date
```

### Idea 7: Self-Improving CLAUDE.md

After every major interaction, prompt Claude:
> "Based on our work today, what should we add to CLAUDE.md to make future sessions better?"

Over time, your CLAUDE.md becomes an increasingly accurate encoding of CodeContent's institutional knowledge — the "Mostafa brain backup" that lets the team operate independently.

---

## 7. Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

**Set up the infrastructure:**

1. **Split CLAUDE.md into modular rules**:
   - `.claude/rules/firebase-schema.md` (Firestore patterns, collection names)
   - `.claude/rules/cloud-functions.md` (function conventions, frozen files)
   - `.claude/rules/ui-design.md` (design system, colors, typography)
   - `.claude/rules/codecontent-context.md` (company identity, ICP, voice)
   - Keep root `CLAUDE.md` under 150 lines with key architecture + commands

2. **Configure MCP servers**:
   - Add Firecrawl (blog scraping)
   - Add Playwright (browser automation)
   - Verify Notion MCP works (already connected)

3. **Configure hooks**:
   - V1 file protection
   - Main branch protection
   - Desktop notifications
   - Context re-injection after compaction

4. **Create first 3 skills**:
   - `/research-company` (most impactful, replaces 3 cloud functions)
   - `/qualify-lead` (fast to implement, immediate value)
   - `/linkedin-content` (addresses biggest strategic gap)

### Phase 2: Core Workflows (Week 3-4)

5. **Create remaining skills**:
   - `/generate-pitch`
   - `/cwp-hunt`
   - `/draft-outreach`
   - `/case-study`
   - `/competitive-intel`

6. **Create sub-agents**:
   - `company-researcher`
   - `blog-analyst`
   - `cwp-researcher`
   - `pitch-generator`

7. **Add Apollo MCP server** (once comfortable with Firecrawl/Playwright)

8. **Test the "Sales Autopilot" workflow** end-to-end

### Phase 3: Advanced (Week 5-8)

9. **Build agent teams**:
   - `outreach-coordinator` (parallel company research)
   - "Deal Room" team for qualified prospects

10. **Create content engine skills**:
    - `/newsletter-draft`
    - `/content-repurpose`
    - `/blog-post` (for CodeContent's own blog)
    - `/review-content` (ReviewMind in Claude Code)

11. **Create the "Sales Autopilot" weekly ritual** as a documented process

12. **Add Slack + Google Sheets MCP servers**

### Phase 4: Scale (Month 2+)

13. **Encode Mostafa's QA process** into skills (delegate first-pass review)
14. **Build client health monitoring**
15. **Create the AI Context auto-updater**
16. **Consider Pipedream MCP** for maximum API coverage
17. **Explore Agent Teams** (experimental) for fully autonomous research sprints
18. **Build a `/onboard-client` skill** for new client setup workflow

---

## Summary: What Changes and What Stays

| Operation | Current (Web App) | Future (Claude Code) | Why |
|-----------|-------------------|---------------------|-----|
| CRM Pipeline Tracking | Web app (board/table views) | **STAYS in web app** | Visual, collaborative, persistent |
| Lead Enrichment | Cloud function (fire-and-forget) | **Claude Code skill** (interactive) | Can steer, iterate, follow up |
| Blog Analysis | Cloud function (rigid 5-min timeout) | **Claude Code + Firecrawl MCP** | More flexible, no timeout limits |
| Writing Program Detection | 2 cloud functions (find + analyze) | **Claude Code + Playwright MCP** | Browser automation handles JS sites |
| Offer/Idea Generation | 15+ cloud function files (V1/V2/V3) | **Claude Code skill** (conversational) | Interactive iteration, no rigid pipeline |
| Email Drafting | Template variable replacement | **Claude Code skill** | True personalization, not templates |
| LinkedIn Posts | Cloud function (single generation) | **Claude Code skill** | Batch creation, voice calibration |
| Competitive Analysis | 2 cloud functions | **Claude Code skill** | Interactive, deeper, follow-up questions |
| CSV Import | Web app (upload + mapping UI) | **STAYS in web app** | Visual field mapping is better in UI |
| Analytics Dashboards | Web app (charts, KPIs) | **STAYS in web app** | Dashboards need persistent visual display |
| Team Collaboration | Web app (roles, permissions) | **STAYS in web app** | Multi-user real-time needs a web UI |
| Cost Tracking | Firestore (per-user, per-entity) | **STAYS in web app** | Persistent aggregation needs a database |
| Case Studies | NOTHING EXISTS | **Claude Code skill (NEW)** | Fills biggest credibility gap |
| Newsletter | NOTHING EXISTS | **Claude Code skill (NEW)** | Addresses marketing maturity gap |
| CWP Hunting | Manual + 2 cloud functions | **Claude Code skill** | Systematic, repeatable, batch-capable |
| Client Health Monitoring | NOTHING EXISTS | **Claude Code skill (NEW)** | Proactive account management |

---

## Cost Comparison

| Approach | Monthly Cost | Notes |
|----------|-------------|-------|
| Current Cloud Functions | ~$50-200/mo (OpenAI API + Firebase) | Fixed pipelines, no iteration |
| Claude Code (Sonnet) | ~$100-300/mo (API usage) | Interactive, adaptive, no infra needed |
| Claude Code (Haiku for agents) | ~$30-100/mo | 90% quality at 3x lower cost for data extraction |

The cost is comparable, but the value is dramatically higher because every interaction is interactive, iterative, and steerable. No more "click enrich and pray."

---

## The Bottom Line

Your web app is excellent at what web apps do best: **persistent data, visual dashboards, team collaboration.** Keep it.

But for the **workflow-heavy operations** that are your actual daily work — researching companies, analyzing blogs, generating pitches, crafting outreach, building content — Claude Code with skills, sub-agents, and MCP servers is a paradigm shift from "build a feature for every workflow" to "describe the workflow in Markdown and execute it conversationally."

The single biggest unlock: **encoding Mostafa's brain into Claude Code skills and sub-agents.** This is the path from founder-bottleneck to scalable operations — exactly what CodeContent needs to grow from $5K to $50K MRR.
