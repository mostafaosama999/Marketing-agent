# CRM leads table buries newest leads behind largest company

## Summary
With sort = `createdAt desc` (the default), the leads table page 1 showed only "Red Hat" leads dated Aug 17, 2024 — leads created as recently as 2026-05-04 (Sudheesh / TinyFish, Paul / Browserbase, Magnus / Browser Use, etc.) were nowhere near the top, even though the dataset contained them.

## Investigation
- Verified via Firebase MCP (`marketing-app-cc237`, collection `leads`, ordered by `createdAt desc`) that several leads with `createdAt` in May 2026 exist and are not archived — so the data was correct, the rendering was wrong.
- Traced the code path:
  - `subscribeToLeads` (`agency-app/src/services/api/leads.ts:125`) returns leads ordered by `createdAt desc` from Firestore.
  - `CRMLeadsTable` re-sorts via `sortedLeads` (`agency-app/src/components/features/crm/CRMLeadsTable.tsx:801`) using the user-selected `orderBy/order` (default `createdAt`/`desc`). Correct.
  - `groupedLeads` then groups by company name. Correct.
  - `sortedCompanies` (line 904) sorted **company groups** by `groupedLeads[company].length` desc, then alphabetically — completely independent of the active sort.
  - `paginatedCompanyLeads` walks `sortedCompanies` to build pages, so page 1 always started with the largest company group regardless of the user's sort.
- Red Hat is the largest single-company import (hundreds of leads, all with `createdAt` ≈ Aug 17, 2024). The newest individual leads each belong to companies with one or two leads, so they got pushed past page 1.

## Root Cause
`sortedCompanies` ignored `orderBy` entirely. Lead-level sorting was only ever applied **within** a company group — the order of the groups themselves was hard-pinned by lead count.

## Fix
`agency-app/src/components/features/crm/CRMLeadsTable.tsx:903-918` — replace the count-based comparator with one that orders companies by where their first lead lands in `sortedLeads`. Because the leads inside each group are already in the user's chosen sort order, taking the index of each company's first lead in `sortedLeads` makes group order automatically follow lead order:

- `createdAt desc` → company holding the newest lead bubbles to the top.
- `name asc` → company whose alphabetically-earliest lead is first.
- `company` column sort → still does the right thing (groups are anchored by their own name).

`useMemo` deps updated to `[sortedLeads, groupedLeads]`. Pagination (`paginatedCompanyLeads`, line 914) was unaffected — it just iterates `sortedCompanies`.

## Tech Debt
- The "biggest company first" default is now gone. If a user wanted that view, they'd have to add an explicit "lead count" column / sort. No one was relying on it (only one usage in the file, and it wasn't user-configurable), but worth keeping in mind.
- "No Company" leads (no `company` and no `companyName`) now interleave by `createdAt` like every other group — previously they'd land alphabetically. Acceptable, possibly preferable.
