## Summary
Opening the Companies tab on the "AI Native DevCon (Tessl Devcon Spring 2026)" event detail page crashed with `TypeError: Cannot read properties of undefined (reading 'bg')`. The page rendered as a blank screen.

## Investigation
- Stack trace pointed to a minified `Array.map` callback inside the events bundle.
- Grepped for `.bg` accesses in `pages/events/` — top candidates were `EventCompaniesTab.tsx:267`, `EventLeadsTab.tsx`, `EventStatusStepper.tsx`, `EventsTable.tsx` — all of which key into a colors map by an enum value.
- URL was `/events/ZWu2q2ZubDHLmRMm6Vbl?tab=companies`, narrowing the suspect to `EventCompaniesTab`.
- Queried the `events/ZWu2q2ZubDHLmRMm6Vbl/companies` subcollection in Firestore. First doc was `Tessl` with `role: "host"`.
- `EventCompanyRole` type was `'sponsor' | 'exhibitor' | 'speaker' | 'organizer' | 'attendee'` — "host" was not in it. The `ROLE_COLORS` lookup returned `undefined`, and the next line read `.bg` on it.

## Root Cause
Production Firestore data contained a role value (`"host"`) that the frontend type and `ROLE_COLORS` map didn't declare. The render path indexed the map without a fallback, so an unexpected role string crashed the whole tab.

## Fix
- `agency-app/src/types/event.ts:18` — Added `'host'` to `EventCompanyRole`.
- `agency-app/src/pages/events/EventCompaniesTab.tsx`
  - Added `{ value: 'host', label: 'Host' }` to `ROLE_OPTIONS` so it appears in the add/edit dropdown.
  - Added `host: { bg: '#e0e7ff', text: '#3730a3' }` to `ROLE_COLORS`.
  - Introduced `DEFAULT_ROLE_COLOR` and changed `ROLE_COLORS[company.role]` to fall back to it, so any future unknown role renders a neutral chip instead of crashing.

## Tech Debt
- The same `Record<Enum, ...>[someStringFromFirestore]` pattern is used in `EventStatusStepper.tsx`, `EventLeadsTab.tsx`, `EventsTable.tsx`, `EventDetailPage.tsx`, `EventOverviewTab.tsx`, and `EventCompaniesTab.tsx` (for `priorityConfig`, etc.). Any of them could crash the same way if Firestore data drifts from the TypeScript enum. The fix here only hardens the role lookup in this one file. A broader pass adding fallbacks (or a typed helper like `lookupOrDefault(map, key, fallback)`) would prevent the next instance.
- No schema validation at write-time: form input is cast `as EventCompanyRole`, but other writers (e.g. AI agents / scripts) can — and clearly did — write arbitrary strings.
