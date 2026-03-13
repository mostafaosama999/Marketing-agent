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
