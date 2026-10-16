---
paths:
  - "agency-app/src/**"
---
<!-- moved from claude.md 2026-10-16 -->

# agency-app UI design rules

Preserve the existing design. Don't restyle pages or components unless asked.

## Core styling
- Page background: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- Header: `rgba(255,255,255,0.95)` with `backdropFilter: blur(20px)`
- Board columns: 280px wide, glass-morphism effect
- Font: Inter / SF Pro Display
- FAB: bottom-right (24px offset), purple gradient
- Duration colours on lead cards: 0-3 days green, 4-7 days orange, 8+ days red

## Key components
- ViewToggle (Board/Table) with a purple accent
- Filter row: Lead Owner, Company, Month
- Cards: white background, 10px radius, 12px padding, 3px top border for priority
- Hover: shadow plus `translateY(-2px)`
