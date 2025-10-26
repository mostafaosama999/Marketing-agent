# Marketing Agent - CRM Pipeline System

## Quick Reference

1. [UI Design](#ui-design) - Design system and styling rules
2. [Pipeline & Leads](#pipeline--leads) - 6-stage pipeline, lead management
3. [Filtering & Bulk Ops](#filtering--bulk-ops) - Advanced filters, CSV import, bulk actions
4. [Companies & Enrichment](#companies--enrichment) - Company mgmt, Apollo, blog analysis
5. [User System](#user-system) - Roles, permissions, settings
6. [Firebase Schema](#firebase-schema) - Collections and data structures

---

## UI Design

**CRITICAL: Design Preservation**

### Core Styling
- **Background**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **Header**: `rgba(255,255,255,0.95)` + `backdropFilter: blur(20px)`
- **Columns**: 280px width, glass-morphism effect
- **Font**: Inter/SF Pro Display
- **FAB**: Bottom-right (24px), purple gradient
- **Duration Colors**: 0-3d green, 4-7d orange, 8+d red

### Key Components
- ViewToggle (Board/Table) with purple accent
- Filter Row: LeadOwner, Company, Month
- Cards: White bg, 10px radius, 12px padding, 3px top border for priority
- Hover: Shadow + translateY(-2px)

---

## Pipeline & Leads

### 6 Pipeline Stages
1. **New Lead** → 2. **Qualified** → 3. **Contacted** → 4. **Follow up** → 5. **Won** / 6. **Lost**

Stored in `pipelineConfig/default`, customizable via `PipelineConfigContext`. Each has: label, color, order, visible.

### Lead Structure
**Core**: id, name, email, phone, company, companyId, status
**Extended**: customFields, apolloEnriched, totalApiCosts, archived, archivedAt
**Outreach**: linkedIn/email status (not_sent|sent|opened|replied|refused|no_response)

### Timeline Tracking (CRITICAL)
- Subcollection `leads/{id}/timeline/{id}`
- `stateHistory`: timestamps for each status
- `stateDurations`: cumulative days in each status
- `statusChanges`: array of change records
- Updates on EVERY status change - supports re-entry

### Board Features
- Drag-and-drop between stages
- Filters: Owner, Company, Month
- View toggle: Board/Table
- Real-time Firebase subscriptions
- FAB to add leads → LeadDialog
- Duration color coding on cards

---

## Filtering & Bulk Ops

### Advanced Filters
**Components**: `AdvancedFiltersModal`, `FilterPresetsMenu`, `applyAdvancedFilters()`

**Operators**: equals, contains, startsWith, endsWith, greaterThan, lessThan, before, after, between, isTrue, isFalse

**Presets**: Saved to `filterPresets/{userId}/presets/{presetId}`, can set default preset

### CSV Import
**Workflow**: Upload CSV → Field Mapping → Deduplication → Import
- Uses `papaparse` library
- Auto-maps columns to lead/company fields
- Custom fields auto-created for unmapped columns
- Dedup strategies: Skip, Update, Create New
- Dedup criteria: Email (primary), Name+Company, Phone

### Bulk Operations
**Actions**: Delete, Edit, Archive, Unarchive
- Table view multi-select with checkboxes
- `BulkActionsToolbar` shows selected count
- Functions: `bulkDeleteLeads()`, `archiveLead()`, `unarchiveLead()`

### Archive System
**Soft-delete** for leads not ready to permanently delete
- `archived` flag + `archivedAt` timestamp
- Separate subscription for archived leads
- `ArchivedLeadsView` modal shows all archived
- Can unarchive to restore to active CRM

---

## Companies & Enrichment

### Apollo.io Integration
**Functions**: `apolloProxy`, `enrichOrganization`, `searchPeople`

**Lead Enrichment**: Verified emails, LinkedIn URLs, job titles, phone numbers
**Company Enrichment**: Employee count, funding, tech stack, industry, social URLs, logo

**Data Structure**: `apolloEnrichment` object with apolloId, employeeCount/Range, funding, technologies[], industries[], address, costInfo

**Cost Tracking**: Per-lead, per-company, and per-user in `userCostTracking` collection

### Company Features
**Core**: name (unique), website, industry, description, customFields
**Extended**: Blog Analysis, Writing Program Analysis, Offer/Pitch Management

### Blog Analysis (`qualifyBlog` function)
Analyzes company blog for content writing fit:
- Last active post, monthly frequency
- Writer types (employees/freelancers)
- Blog nature: isAIWritten, isTechnical, rating (low/medium/high), hasCodeExamples
- isDeveloperB2BSaas flag
- OpenAI GPT-4 powered

### Writing Program Analysis
**Functions**: `findWritingProgram`, `analyzeProgram`
Detects paid writing programs and extracts:
- Payment amount/method/details with sourceSnippet
- Requirements and submission guidelines
- Contact email and response time
- Open/closed dates

### Offer Management
Store custom pitch per company in `offer: { blogIdea, createdAt, updatedAt }`

### Company-Lead Linking
Auto-creates companies when leads added. Lead has `companyId` reference.

---

## User System

### Roles & Permissions
1. **Writer**: Own tasks only, no CRM access
2. **Marketing Analyst**: View/edit leads & companies, no delete
3. **Manager**: Full CRM, create/edit/delete, team view
4. **CEO**: Full system access + user/role management

**Permission Matrix**: Writers blocked from CRM. Analysts can view/edit. Managers/CEOs full access.

### Navigation
`Navbar.tsx` dynamically renders based on role. Writers see "My Tasks", others see Leads/Companies/Analytics/Team/Monitoring.

### Auth System
**Context**: `AuthContext.tsx`, Hook: `useAuth()`
**Protected Routes**: `ProtectedRoute.tsx` wraps all routes except `/login`
**User Profile**: `users/{userId}` collection with uid, email, displayName, role, createdAt

### Settings
**Page**: `SettingsPage.tsx`
**Sections**: Profile, Notifications, Default Views, API Cost Tracking, Data Management
**Collections**: `userPreferences/{userId}`, `userCostTracking/{userId}`
**Table Columns**: `TableColumnVisibilityMenu`, saved to localStorage as 'crm_table_columns'

---

## Cloud Functions

**Runtime**: Node.js 20, Firebase Functions v5, `functions/src/index.ts`

### Apollo Functions
- `apolloProxy`: CORS proxy for Apollo API
- `enrichOrganization`: Company enrichment
- `searchPeople`: Find people at company

### Blog Analysis
- `qualifyBlog`: Analyze blog (RSS/sitemap discovery, OpenAI GPT-4)
- `findWritingProgram`: Detect writing program URL (GPT-3.5)
- `analyzeProgram`: Extract payment/requirements (GPT-4)

### Content Generation
- `generateLinkedInPost`: Blog → LinkedIn post
- `generateBlogIdea`: Generate blog topic ideas

### Integrations
- `webflowDailySync`: Scheduler (2 AM UTC), sync Webflow CMS
- `slackNotification`: onCreate trigger for new leads
- `sheetsSync`: Hourly export to Google Sheets
- `trackApiCost`: onWrite trigger, aggregate user costs

**Deploy**: `npm run deploy` or `firebase deploy --only functions:apolloProxy`
**Security**: All require auth, API keys in env config, input validation

---

## Firebase Schema

### Collections
- `leads/{leadId}` + subcollection `timeline/{leadId}`
- `companies/{companyId}`
- `pipelineConfig/default` (single doc)
- `filterPresets/{userId}/presets/{presetId}`
- `userPreferences/{userId}`
- `userCostTracking/{userId}`
- `users/{userId}`

### Lead Document
**Core**: id, name, email, phone, company, companyId, status, customFields
**Timeline**: stateHistory{}, stateDurations{} (flattened from subcollection)
**Extended**: apolloEnriched, totalApiCosts, outreach{linkedIn, email}, archived, archivedAt, archivedBy

**Subcollection `timeline/{leadId}`**: stateHistory, stateDurations, statusChanges[] with fromStatus, toStatus, changedBy, changedAt

### Company Document
**Core**: id, name (unique), website, industry, description, customFields
**Extended**: totalApiCosts, archived, offer{blogIdea}, blogAnalysis{}, writingProgramAnalysis{}, apolloEnrichment{}

### Other Collections
**pipelineConfig**: stages[] with id, label, color, order, visible
**filterPresets**: filters{}, advancedRules[], isDefault
**userPreferences**: defaultView, defaultFilterPresetId, tableColumns{}, notifications{}, theme
**userCostTracking**: totalCosts{apollo, openai, total}, costsByMonth{}, costsByEntity{}
**users**: uid, email, displayName, role, photoURL

### Firestore Indexes (Required)
**leads**: archived+status+updatedAt, archived+company+updatedAt, status+updatedAt
**companies**: archived+updatedAt, industry+updatedAt

### Security Rules
- All require authentication
- Writers: no access to leads/companies
- Analysts: read/write leads/companies, no delete
- Managers/CEOs: full access
- Users can only r/w own preferences/presets

---

## Best Practices & Troubleshooting

### Performance
- Pagination for large lists, load timeline only in detail view
- Denormalize companyName on lead
- Unsubscribe on component unmount

### Cost Management
- Enrich strategically (qualified leads only)
- Batch OpenAI analysis
- Use Firestore `limit()`

### Data Integrity
- ALWAYS update both lead + timeline subcollection
- Use companyId not just name
- Run dedup before bulk imports

### Common Issues
1. **Leads not showing**: Check subscription active, lead not archived, security rules, cache
2. **Apollo fails**: Verify API key, credit balance, domain valid, CORS
3. **CSV errors**: UTF-8, required fields, email format, dedup strategy
4. **Drag-drop broken**: Board view active, lead has id, refresh if sync lost

**Debug**: `localStorage.setItem('crm_debug', 'true')`

---

**End of Documentation**
