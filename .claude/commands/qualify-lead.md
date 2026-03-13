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
