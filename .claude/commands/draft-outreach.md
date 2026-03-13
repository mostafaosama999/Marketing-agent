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
