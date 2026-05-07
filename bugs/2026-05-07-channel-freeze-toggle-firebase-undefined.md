# Channel freeze toggle crashes with `Unsupported field value: undefined`

## Summary
Toggling any per-channel freeze in the hiring board failed with `FirebaseError: Function setDoc() called with invalid data. Unsupported field value: undefined (found in field channelFreezes.<key>.frozenAt in document hiringConfig/default)`. The error message named whichever channel had been previously resumed — most recently `upwork-recruiter` — but the failing write was triggered by toggling LinkedIn (or any other channel).

## Investigation
- Searched for `channelFreezes` references: writer in `agency-app/src/services/api/hiringConfig.ts`, toggle handlers in `agency-app/src/components/features/hiring/HiringBoard.tsx`.
- Read `handleToggleChannelFreeze` (HiringBoard.tsx:112): builds `next = { ...prev, [key]: nextEntry }` and persists via `updateChannelFreezes` → `setDoc(..., { merge: true })`. The locally-built `nextEntry` is shaped correctly (`{ frozen: false }` on resume, `{ frozen: true, frozenAt: Date }` on freeze) — no explicit `undefined`.
- The `undefined` had to be coming from `prev`, since the spread carried it through. Traced `prev` back to the deserializer: `deserializeChannelFreezes` (hiringConfig.ts:24) always assigned `frozenAt: toDate(e.frozenAt)`, and `toDate` returns `undefined` when the stored entry has no `frozenAt`. That meant any resumed channel produced an in-memory state shape `{ frozen: false, frozenAt: undefined }` with `frozenAt` as an own property, not absent.
- Confirmed Firestore rejects `setDoc` with explicit-undefined fields even under `{ merge: true }` — that is the source of the error.

## Root Cause
`deserializeChannelFreezes` introduced `frozenAt: undefined` as an own property on resumed-channel entries. The next toggle spread `prev` into the write payload, propagating that explicit `undefined` to Firestore, which rejected the write.

## Fix
- `agency-app/src/services/api/hiringConfig.ts:24` (`deserializeChannelFreezes`): only attach `frozenAt` when it has a value, so resumed entries deserialize as `{ frozen: false }` with no `frozenAt` key.
- `agency-app/src/services/api/hiringConfig.ts:73` (`updateChannelFreezes`): added a sanitization pass that strips any `frozenAt: undefined` before writing to Firestore. Defense-in-depth — also covers legacy docs and any future caller that builds the map without going through the deserializer.

## Tech Debt
- The legacy migration path in `getHiringConfig` (lines 50–57) and `buildAllFrozenMap`/`buildAllResumedMap` builders are independent of this fix; they were already producing well-shaped entries. No follow-up needed there.
- A unit-test pass over `hiringConfig` deserialize/write round-trips would catch this class of bug. Not added now — outside scope of this fix.
