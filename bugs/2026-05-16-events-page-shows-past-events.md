## Summary
The Events page showed all events regardless of date — past events that the user can no longer attend appeared in the table alongside upcoming events, cluttering the view.

## Investigation
- Reviewed `EventsPage.tsx` `filteredEvents` useMemo: filters covered search, status, type, month, ICP, and tier — but had no date cutoff.
- The summary cards (`EventSummaryCards.tsx`) already computed "upcoming events" with a `start >= today` check, but the table received the unfiltered list (only the four bar filters applied).
- Screenshot showed events from 1 Apr – 7 May 2026 visible on a 2026-05-16 session.

## Root Cause
No filter was hiding past events from the table. The page treated past and future events identically.

## Fix
- `agency-app/src/pages/events/EventsPage.tsx`
  - Added `showPastEvents` state (default `false`).
  - In `filteredEvents` useMemo: when `showPastEvents` is false, drop events whose `endDate || startDate < today`.
  - Reset `showPastEvents` on tab change.
  - Wired props through to `<EventsFilters>`.
- `agency-app/src/pages/events/EventsFilters.tsx`
  - Added `showPastEvents` / `onShowPastEventsChange` to the props interface.
  - Rendered a "Show past events" checkbox in the filter bar (shows for both Client and Educational tabs).

## Tech Debt
- The cutoff uses local browser midnight via `new Date()`; for users in different timezones an event ending late today may flip past slightly early/late. Acceptable for the current use case.
- `EventSummaryCards` independently computes "upcoming" from the full `events` list, not `filteredEvents`. That is intentional — the cards summarize the underlying data, not the current filter — but worth noting in case future requirements change.
