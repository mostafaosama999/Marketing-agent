# Marketing Agent: CRM, Nikola BDR bot, Hiring

React frontend (`agency-app/`) plus Firebase Cloud Functions (`functions/`) on Firebase project `marketing-app-cc237`. Three products share it: the sales CRM (leads, companies, outreach analytics), Nikola (the Slack BDR bot), and the Hiring board.

## Firebase project
- IMPORTANT: always pass `--project marketing-app-cc237` and address Firestore as `projects/marketing-app-cc237/...`; the Firebase MCP's default may resolve to `ai-adv-5e502` (the Agent repo).
- If the MCP/CLI misbehaves, use `claude_BDR_codecontent/tools/fsq` (defaults to this project). See the workstation root `CLAUDE.md`.

## Commands
There is no root `package.json`; run everything from `agency-app/` or `functions/`.

| Where | Command | What it does |
|---|---|---|
| `agency-app/` | `npm start` | CRA dev server against production Firebase |
| `agency-app/` | `npm run start:emulator` | Dev server with `REACT_APP_USE_EMULATOR=true` |
| `agency-app/` | `npm run build` | Production build into `agency-app/build` |
| `functions/` | `npm run build` | `tsc`. The `prebuild` hook runs `scripts/copy-bdr-assets.js`, which copies BDR skills and context files from the sibling `claude_BDR_codecontent/` repo into `functions/nikola-bundled/` (gitignored) for Nikola. The build fails if that repo isn't checked out next to this one |
| `functions/` | `npm run emulator` | Emulators with `--import=../emulator-data --export-on-exit` |
| `functions/` | `npm run deploy` | `firebase deploy --only functions` (the `firebase.json` predeploy hook rebuilds first) |
| `functions/` | `npm run logs` | Function logs |

- Single function: `firebase deploy --only functions:<exportName> --project marketing-app-cc237`.
- No real test suite. The `test:*`, `debug:*` and `list:*` scripts in `functions/package.json` are ad-hoc scripts that hit live services; `agency-app`'s `npm test` has no meaningful tests.
- Node: `agency-app` engines 18.x; `functions` runtime Node 20.

## Deploy
- **Functions** deploy with Firebase (above).
- **Frontend** is served from DigitalOcean App Platform, not Firebase Hosting. `firebase.json` `hosting.public` points at `frontend/build`, which doesn't exist, so never run `firebase deploy --only hosting` or a bare `firebase deploy`. The newest URL in code is `marketing-app-0149.ondigitalocean.app` (`functions/src/hiring/notifyAppliedThreshold.ts`); Gmail OAuth (`functions/src/gmail/oauthService.ts`) still allow-lists the older `marketing-app-2v32k`. How a DO deploy is triggered (auto-deploy on push to `main`?) is unverified; `agency-app/.app-spec.yaml` is a placeholder template.
- Small, low-risk changes (bug fixes, small UI tweaks, copy/column changes, one-off data corrections): commit, push, build and deploy without asking. Confirm first for larger features, schema or security-rule changes, or anything the user hasn't reviewed in-session.

## Pipeline and leads
- 9 `LeadStatus` values (`agency-app/src/types/lead.ts`): `new_lead`, `qualified`, `contacted`, `follow_up`, `nurture`, `won`, `lost`, `previous_client`, `existing_client`. Board stage config lives in `pipelineConfig/default` via `PipelineConfigContext` (label, color, order, visible).
- Every status change must update both the lead and its `leads/{id}/timeline` subcollection (`stateHistory`, `stateDurations`, `statusChanges[]`). Re-entry into a stage is supported.
- Outreach channel status: `not_sent | sent | opened | replied | refused | no_response`.
- Outreach response types counted as positive: `Interested`, `Meeting Scheduled`, `Referred Us`, `Question / Objection`. The list is hardcoded in five places (`utils/outreachHelpers.ts`, `OutreachActivityTable.tsx`, `OutreachResponseModal.tsx`, `KPIsPage.tsx`, `LeadAnalytics.tsx`); update all of them when adding one.
- Link leads to companies by `companyId`, never by company name.
- Filtering, CSV import, custom/dropdown fields, bulk ops, archive, company status and enrichment: `docs/features/crm.md`.

## Companies live in `entities`
- The Firestore collection is `entities`, not `companies` (`COMPANIES_COLLECTION` in `agency-app/src/services/api/companies.ts`). A few old scripts still read `companies`; don't copy them.
- `firestore.indexes.json` still declares indexes on `companies` and none on `entities`. Known, not yet fixed.

## Users and routes
- `UserRole` (`agency-app/src/types/auth.ts`): `CEO`, `Manager`, `Marketing Analyst`, `Writer`, plus lowercase `admin`, `manager`, `writer`, `viewer`. `Navbar.tsx` only checks the capitalised ones.
- Nav (`Navbar.tsx`): Settings, Leads, Companies, Analytics and KPIs for every role; Team and Monitoring for CEO/Manager/Marketing Analyst; "My Tasks" (`/writer`) for Writers, but `App.tsx` has no `/writer` route.
- Routes (`App.tsx`): `/`, `/crm`, `/leads`, `/leads/:leadId`, `/companies`, `/companies/:companyId`, `/events`, `/events/:eventId`, `/hiring`, `/hiring/writing-tests`, `/hiring/outbound`, `/hiring/analytics`, `/team`, `/team-member/:userId`, `/analytics`, `/analytics/outbound`, `/inbound-generation`, `/kpis`, `/monitoring`, `/settings`, `/settings/:tab`, `/auth/gmail/callback`, `/login`.
- Auth: `AuthContext.tsx` / `useAuth()`; `ProtectedRoute.tsx` wraps everything except `/login`.

## Cloud Functions
All exports are in `functions/src/index.ts`. Grouped by area:

| Area | Exports |
|---|---|
| Apollo | `fetchApolloEmail`, `apolloBulkEnrichPeople`, `enrichOrganizationCloud`, `searchPeopleCloud`, `initApolloJobTitles` |
| Blog / writing programs | `qualifyCompanyBlog`, `findWritingProgramCloud`, `analyzeWritingProgramDetailsCloud`, `generateBlogAuditCloud`, `discoverCompanyWebsiteCloud` |
| Offer / blog ideas | `analyzeCompanyOffer`, `analyzeCompanyWebsiteCloud`, `generateOfferIdeasCloud` (V1), `generateOfferIdeasV2Cloud` + `v2Stage*Cloud`, `generateOfferIdeasV3Cloud`, `refreshAIConceptsCloud`, `getAIConceptsStatusCloud`, `sendOfferSlackNotificationCloud` |
| LinkedIn content | `generateLinkedInPostAsync`, `getLinkedInGenerationJob`, `generatePostIdeas`, `generatePostFromIdea`, `generatePostIdeasRAG`, `generatePostFromIdeaRAG`, `generateAITrends` |
| RAG newsletters | `indexNewsletters`, `indexSingleNewsletter`, `getRAGStatus` |
| Competitors | `findCompetitorsV2`, `extractCompetitorPosts` |
| Analytics | `extractLinkedInAnalytics`, `syncGoogleAnalytics`, `scheduledGoogleAnalyticsSync` |
| Gmail | `scheduledEmailSync`, `manualEmailSync`, `getGmailAuthUrl`, `exchangeGmailOAuthCode`, `checkGmailConnectionStatus`, `createGmailDraftCloud`, `createFollowUpDraftCloud`, `createHiringDraftCloud` |
| Hiring | `webflowHiringWebhook`, `payloadApplicationWebhook`, `importApplicantsCloud`, `parseApplicantProfileCloud`, `scoreApplicantOnCreate`, `ghostStaleWritingTests`, `backfillJobPostCloud`, `backfillRecruiterAttributionCloud`, `syncRecruiterAttributionScheduled`, `backfillAiRejectedCloud` |
| Events | `researchEventOrganizer`, `onEventCreatedResearchOrganizer` |
| Webflow / Sheets | `dailyWebflowSync`, `profileScraperSync`, `sheetsScraperSync`, `triggerSheetsScraper`, `triggerProfileScraper`, `runScraperOnly`, `runAllScrapersManual`, `getCSVDownloadUrl`, `listCSVFiles`, `getScraperStatusInfo` |
| Nikola | `nikolaSlackEvents`, `nikolaSlashCommand`, `nikolaContextSync`, `nikolaGmailWebhook`, `setupNikolaGmailWatchHttp`, `nikolaWorkQueueProcessor`, `nikolaCompanyIndustrySync`, `nikolaMemoryExtractor` (`nikolaMorningBatch` is disabled) |
| Misc | `healthCheck` |

- Blog idea V1 (`functions/src/offerAnalysis/generateOfferIdeas.ts`) is FROZEN: never modify it. Each new version gets its own directory (`v2/`, `v3/`, next `v4/`). Stage details: `docs/OFFER_IDEA_GENERATION.md`.
- New features or versions must never block or degrade existing ones: each version runs, saves to Firestore incrementally and displays independently; an error in one must not stop the others; a page refresh restores completed results.
- Functions use the v1 API (`functions.https.onCall`, `functions.runWith`) on firebase-functions v5. Config comes mostly from `functions.config()`; `hiring/scoreApplicant.ts` mixes in `defineSecret("APIFY_TOKEN")` via `runWith({secrets})`.

## Nikola (Slack BDR bot)
- Overview and function table: `docs/NIKOLA.md`. Architecture (routing, analyst/planner skills, hybrid memory): `docs/NIKOLA_V2.md`.
- After any wrong dispatch, fill in `docs/NIKOLA_MISROUTE_POSTMORTEM.md`; it feeds prompt fixes.
- Firecrawl defaults for Nikola code: `.claude/rules/nikola.md`.

## Firestore
- Collection reference: `docs/DATA_MODELS.md` (section 20 lists the newer collections, including all `nikola*`).
- WARNING: `firestore.rules` is in DEVELOPMENT MODE: every collection is readable and writable by anyone, with no auth check, except the nine listed `nikola*` collections, which are `if false` (admin SDK only). `nikolaMemory`, `nikolaMemoryCandidates`, `nikolaRoutingDecisions` and `nikolaPendingClarifications` are not in that list, so they're open too.

## Content Analytics
- Full docs: `docs/CONTENT_ANALYTICS.md`. Stored under `contentAnalytics/mostafa`; the user ID is hardcoded to `'mostafa'`, not a Firebase Auth UID.
- Synced by the `/sync-analytics` skill in `claude_BDR_codecontent/` or the in-app ContentSyncDialog. TDS and Medium sync 2026+ content only. LinkedIn Excel uploads go in `data/linkedin/` (gitignored).

## Feature docs
Check `docs/` before working on a feature; several have non-obvious constraints (frozen files, caching, independent pipelines).

| Doc | Feature |
|---|---|
| `docs/features/crm.md` | Filters, CSV import, custom fields, bulk ops, archive, company status, enrichment, common issues |
| `docs/DATA_MODELS.md` | Firestore collections and types |
| `docs/OFFER_IDEA_GENERATION.md` | V1/V2/V3 blog idea generation, AI concepts, costs |
| `docs/CONTENT_ANALYTICS.md` | LinkedIn/TDS/Medium analytics, schema, sync skill |
| `docs/HIRING_AUTOSCORING.md` | Applicant autoscoring (Apify LinkedIn enrichment + GPT-4o-mini) |
| `docs/HIRING_BATCH_NOTIFICATIONS.md` | #hiring Slack ping every 5 new `applied` applicants |
| `docs/NIKOLA.md`, `docs/NIKOLA_V2.md`, `docs/NIKOLA_MISROUTE_POSTMORTEM.md` | Nikola bot, architecture, misroute template |
| `docs/GMAIL_INTEGRATION_SUMMARY.md`, `docs/GMAIL_SETUP.md`, `docs/GMAIL_QUICK_START.md` | Gmail sync and drafts |
| `docs/GOOGLE_ANALYTICS_ARCHITECTURE.md`, `docs/GOOGLE_ANALYTICS_SETUP.md`, `docs/GOOGLE_ANALYTICS_IMPLEMENTATION_SUMMARY.md` | GA4 sync |
| `docs/COMPETITOR_SYNC_GUIDE.md` | Competitor post extraction |
| `docs/DEPLOYMENT.md` | Possibly stale: uses `functions:config:set` and Firebase Hosting |
| `.claude/rules/ui.md` | UI design tokens (loads when editing `agency-app/src/**`) |

## Mandatory documentation
- **New system:** create a `.md` in `docs/` and add it to the table above.
- **Changed system:** update its existing doc in the same change.
- **Every bug fix:** add `bugs/YYYY-MM-DD-short-description.md` with these sections: Summary, Investigation (what was checked and ruled out), Root Cause, Fix (files and lines), Tech Debt. Do it even for small fixes; investigations are expensive to repeat.

## Debugging
- CRM debug logging: `localStorage.setItem('crm_debug', 'true')`.
- Troubleshooting list for common CRM issues: `docs/features/crm.md`.
