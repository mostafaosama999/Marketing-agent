# Won Leads modal renders "undefined NaN, NaN" as a date

## Summary
One row in the Won Leads modal (Hiba / Firecrawl) showed `undefined NaN, NaN` in the Date Won column instead of a date or a graceful fallback.

## Investigation
- Reproduced from the analytics screenshot: 7 won leads, 6 with valid dates, 1 with `undefined NaN, NaN`.
- Traced to `getDateWon()` in `agency-app/src/components/features/analytics/WonLeadsModal.tsx`, which wrapped `new Date(lead.stateHistory.won)` in a try/catch.
- Ruled out a missing value: `formatDate()` already returns `'No date'` for `null`, so the value was not null — it was a `Date` object.

## Root Cause
`new Date(<unparseable value>)` does **not** throw — it returns an Invalid Date. The try/catch could therefore never fire, and the Invalid Date flowed into `formatDate()`, where `monthNames[NaN]` → `undefined`, `getDate()` → `NaN`, `getFullYear()` → `NaN`, producing the literal string `undefined NaN, NaN`.

The same hole existed on the `updatedAt` fallback path.

## Fix
`agency-app/src/components/features/analytics/WonLeadsModal.tsx`
- Added `toValidDate()` which parses a value and returns `null` when `isNaN(date.getTime())`.
- `getDateWon()` is now `toValidDate(stateHistory?.won) ?? toValidDate(updatedAt)` — an unparseable `stateHistory.won` now falls through to `updatedAt` instead of poisoning the row, and a bad value on both paths renders as `No date`.
- Such leads are grouped under a trailing "No date won" month section (see the month-grouping change in the same commit).

## Tech Debt
- The underlying data is still wrong: whatever wrote `stateHistory.won` for that lead stored an unparseable value. The UI now degrades gracefully but the lead's real won date is unknown. Worth an audit of `stateHistory.won` values in Firestore if more rows land in the "No date won" group.
- The same `new Date(...)` inside try/catch pattern may exist elsewhere in the analytics components; not swept in this fix.
