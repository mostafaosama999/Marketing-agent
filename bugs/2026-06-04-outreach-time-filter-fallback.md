# Outreach Activity time filters barely changed the numbers (status fallback leak)

## Summary
The 7/14/30-day filters on the Analytics → Outreach Activity stat cards barely changed the counts — e.g. "7 Days" showed 384 LinkedIn outreach vs 463 for "All Time", even though the Monthly Outreach Summary showed only ~1 LinkedIn send in the last week.

## Investigation
- Compared the stat cards against the Monthly Outreach Summary table: the table's per-month LinkedIn Sent values summed to 463 (= the All Time card), but a 7-day window ending Jun 4 could not plausibly contain 384 of those 463 lifetime sends.
- Read `outreachMetrics` in `agency-app/src/pages/analytics/LeadAnalytics.tsx`: for specific day ranges, after the `date >= cutoffDate` check failed, a fallback included any lead whose `outreach.linkedIn.status` (or email status) was `sent`/`opened`/`replied` — **regardless of date**.
- Confirmed the Daily Outreach Activity chart (`outreachActivityData` in the same file) filters purely by date with no status fallback — which is why the chart and the cards disagreed.
- Found the same fallback duplicated in `OutreachResponseModal.tsx` (the "who responded" list opened by clicking the response-rate cards).

## Root Cause
For specific date ranges (7/14/30 days), leads with an outreach **status** but whose contact **date** fell outside the range (or was missing) were re-included by the status fallback. Since most historical leads have a sent/opened/replied status, nearly the whole lifetime population leaked into every range, so switching ranges barely moved the numbers.

## Fix
- `agency-app/src/pages/analytics/LeadAnalytics.tsx` (`outreachMetrics` memo): for specific day ranges, only count leads with a contact date within range — the status fallback now applies only to "All Time" (where it is intentional, to count undated-but-contacted leads).
- `agency-app/src/components/features/analytics/OutreachResponseModal.tsx` (`filteredLeads` memo): identical fix so the response detail list stays consistent with the cards.
- Also in this change set (feature work, same commit):
  - Added more time ranges to the selector: 60 Days, 90 Days, 6 Months, 1 Year (type widened from `7 | 14 | 30 | 'all'` to `number | 'all'` in both files).
  - New "Response Trends" analytics tab (`agency-app/src/pages/analytics/ResponseAnalytics.tsx`) graphing LinkedIn/email responses and response rates over time, with shared helpers extracted to `agency-app/src/utils/outreachHelpers.ts`.

## Tech Debt
- `getLinkedInDate` / `getEmailDate` / `hasLinkedInResponse` / `hasEmailResponse` are now duplicated in **four** places (LeadAnalytics, OutreachActivityTable, OutreachResponseModal, and the new shared `utils/outreachHelpers.ts`). The existing three components were intentionally not rewired to the shared util in this change to keep the bug fix surgical — consolidate them onto `utils/outreachHelpers.ts` in a follow-up.
- Leads with an outreach status but no contact date are now invisible in all specific-range views (correct semantics, but means backfilling missing contact dates is the only way to get them counted in ranges).
- Responses have no timestamp of their own; all response analytics attribute a response to the date the outreach was **sent** (same convention as the Monthly Outreach Summary).
