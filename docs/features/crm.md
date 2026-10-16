<!-- moved from claude.md 2026-10-16 -->

# CRM features: filtering, CSV import, custom fields, bulk ops, companies

Reference for the CRM board in `agency-app/`. Companies are stored in the `entities` Firestore collection (`COMPANIES_COLLECTION` in `agency-app/src/services/api/companies.ts`), not `companies`.

## Board
- Drag-and-drop between stages, Board/Table view toggle, real-time Firestore subscriptions
- Filters: Owner, Company, Month
- FAB opens `LeadDialog` to add a lead
- Cards are colour-coded by time in current stage

## Advanced filters
- Components: `AdvancedFiltersModal`, `FilterPresetsMenu`, `applyAdvancedFilters()`
- Operators: equals, contains, startsWith, endsWith, greaterThan, lessThan, before, after, between, isTrue, isFalse
- Presets are saved to `filterPresets/{userId}/presets/{presetId}`; one can be the default

## CSV import
Workflow: upload CSV → field mapping → deduplication → import.
- Parsed with `papaparse`; columns auto-map to lead/company fields
- Unmapped columns become custom fields
- Columns whose name contains "dropdown" (case-insensitive, e.g. "Lead Type_Dropdown") become dropdown fields. Unique CSV values become the initial options, editable in `DropdownOptionsEditor` (inside `CSVFieldMappingDialog`) before import
- Field definitions are saved to `fieldDefinitions`
- Dedup strategies: Skip, Update, Create New. Dedup criteria: Email (primary), Name+Company, Phone

## Custom fields
- Types: text, number, date, dropdown. Stored in `fieldDefinitions/{fieldId}` with name, label, entityType, fieldType, section, options
- Dropdown fields render as purple gradient chips in table view and can be edited inline (click chip → pick option → saved immediately). Works for leads and companies. Other field types are edited through the dialog
- Services: `fieldDefinitionsService.ts` (CRUD), `fieldValidation.ts` (validates dropdown values), `updateLeadCustomField()`, `updateCompanyCustomField()`
- Inline editing lives in `CRMLeadsTable`

## Bulk operations and archive
- Actions: Delete, Edit, Archive, Unarchive. Table view multi-select; `BulkActionsToolbar` shows the selected count
- Functions: `bulkDeleteLeads()`, `archiveLead()`, `unarchiveLead()`
- Archive is a soft delete: `archived` flag plus `archivedAt`. Archived leads have their own subscription and are listed in the `ArchivedLeadsView` modal, from which they can be restored

## Companies

### Apollo enrichment
- Cloud Functions: `fetchApolloEmail`, `apolloBulkEnrichPeople`, `enrichOrganizationCloud`, `searchPeopleCloud`
- Lead enrichment: verified emails, LinkedIn URLs, job titles, phone numbers
- Company enrichment: employee count, funding, tech stack, industry, social URLs, logo. Stored as `apolloEnrichment` (apolloId, employeeCount/Range, funding, technologies[], industries[], address, costInfo)
- Costs are tracked per lead, per company and per user (`userCostTracking`)

### Company status
A company's status is derived from its leads, with a manual override.
- Fields: `status` (a `LeadStatus`), `statusLockedManually`, `statusLastUpdatedAt`, `statusLastUpdatedBy`
- Calculation: the most common status among non-archived leads; ties go to the most advanced status; no leads → `new_lead`
- Auto-sync runs on lead status change, create, delete and bulk operations, and is skipped when `statusLockedManually` is true. Errors are logged and never fail the lead operation
- Picking a status from the badge menu sets it and locks it; "Unlock" recalculates from leads
- UI: `CompanyStatusBadge` (lock icon), status column in `CompanyTable`
- Logic: `companyStatus.ts` (`calculateCompanyStatus`, `updateCompanyStatusFromLeads`, `setCompanyStatusManually`, `unlockCompanyStatus`), called from `companies.ts` and `leads.ts`

### Blog and writing-program analysis
- `qualifyCompanyBlog`: last active post, monthly frequency, writer types, blog nature (isAIWritten, isTechnical, rating, hasCodeExamples), isDeveloperB2BSaas
- `findWritingProgramCloud` and `analyzeWritingProgramDetailsCloud`: detect paid writing programs and extract payment, requirements, contact and open/closed dates

### Offer and linking
- Custom pitch per company: `offer: { blogIdea, createdAt, updatedAt }`
- Companies are auto-created when leads are added; leads reference them by `companyId`

## Settings
- `SettingsPage.tsx`: Profile, Notifications, Default Views, API Cost Tracking, Data Management
- Stored in `userPreferences/{userId}` and `userCostTracking/{userId}`
- Table column visibility (`TableColumnVisibilityMenu`) is saved to localStorage as `crm_table_columns`

## Performance and cost habits
- Paginate large lists; load the timeline only in detail views; unsubscribe on unmount
- Denormalise `companyName` on leads
- Enrich qualified leads only; batch OpenAI analysis; use Firestore `limit()`
- Run dedup before bulk imports

## Common issues
1. Leads not showing: check the subscription is active, the lead isn't archived, and the cache
2. Apollo fails: check the API key, credit balance, a valid domain, CORS
3. CSV errors: UTF-8 encoding, required fields, email format, dedup strategy
4. Drag-and-drop broken: Board view active, lead has an id; refresh if sync was lost
5. Dropdown fields not detected: column name must contain "dropdown"; check CSV encoding
6. Inline edit not working: the field definition must exist in `fieldDefinitions` with fieldType `dropdown`
7. Company status not updating: check `statusLockedManually` and that the lead has a `companyId`

Debug logging: `localStorage.setItem('crm_debug', 'true')`
