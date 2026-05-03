# Nikola — single-user Slack BDR bot

Slack-driven BDR loop for CodeContent. Lives in `functions/src/nikola/`. Posts a daily batch of 1–5 outreach drafts (3 humanized variants each) to `#bdr`, accepts `1️⃣/2️⃣/3️⃣ + ✅ + ❌ + 💬` reactions, processes pasted LinkedIn replies in-thread, and watches Mostafa's personal Gmail (`mostafa.moqbel.ibrahim@gmail.com`) for email replies. Single user (Mostafa). Single channel (`#bdr`). $15/mo hard cost cap.

Implementation plan: `~/.claude/plans/create-a-plan-for-stateful-hamming.md`.

## Cloud Functions exported

| Function | Type | Schedule / trigger | Purpose |
|---|---|---|---|
| `nikolaSlackEvents` | HTTPS | Slack Events API webhook | reactions + thread messages |
| `nikolaSlashCommand` | HTTPS | Slack slash `/nikola` | dispatcher |
| `nikolaMorningBatch` | scheduled | `0 7 * * 1-5` UTC | drafts up to 5 leads |
| `nikolaContextSync` | scheduled | `0 3 * * *` UTC | Notion + reports → `nikolaContext` |
| `nikolaGmailWebhook` | HTTPS | Pub/Sub push (Gmail) | email reply triage |
| `setupNikolaGmailWatchHttp` | HTTPS | manual / weekly cron | sets up / renews Gmail watch |

## Source layout

```
functions/src/nikola/
├── types.ts                       — all shared types
├── config.ts                      — secrets accessors + tunables
├── skillLoader.ts                 — bundled .md + patches + nikolaContext → system prompt
├── skillRunner.ts                 — OpenAI Chat Completions + structured outputs + tool-use loop
├── skillSchemas.ts                — JSON Schemas for structured outputs
├── routeSkill.ts                  — picks generate-outreach vs sales by lead state
├── humanizeWrap.ts                — wraps every variant through humanize skill
├── costGate.ts                    — $15/mo cap + atomic mtdCost increments
├── idleGate.ts                    — auto-pause after 3 silent days
├── variantParser.ts               — normalises model output variants
├── tools/                         — OpenAI function-calling tools (web_search, firecrawl, etc.)
├── slack/                         — verifySignature, eventsHandler, slashHandler, postDraft, etc.
├── slashCommands/                 — try, enrich, find-leads, find-companies, patch*, status, resume
├── jobs/                          — morningBatch, contextSync, dueLeadsQuery
├── gmail/                         — watchManager, notificationHandler, replyMatcher
├── prompts/                       — small prompts for router/replyClassifier/tryParser
├── webhooks/slackEventsEntry.ts   — HTTPS handlers for Slack events + slash
└── index.ts                       — Cloud Function declarations
```

## Firestore collections (all `nikola*`)

`nikolaDrafts`, `nikolaPatches`, `nikolaThreads`, `nikolaContext`, `nikolaSkillRuns`, `nikolaState/singleton`, `nikolaDiscovery`, `nikolaGmailWatch/state`. Schemas in `types.ts`. **Locked** in `firestore.rules` — admin SDK (Cloud Functions) only.

## Skills (bundled at deploy)

Source-of-truth = `claude_BDR_codecontent/.claude/skills/`. Copied into `functions/nikola-bundled/skills/` by `scripts/copy-bdr-assets.js` on every build (`npm run prebuild`). Same for `context/` files and `reports/companies/*.md`.

The 8 bundled skills:
- `generate-outreach`, `sales` — GPT-5 (reasoning, multi-turn)
- `humanize`, `learn`, `lead-generation`, `cwp-hunt`, `cwp-apply`, `gig-hunt` — GPT-4.1 mini

## Slash commands

```
/nikola try <leadId | name | URL | LinkedIn | freeform>   draft on demand
/nikola enrich <leadId>                                   trigger Apollo (paid)
/nikola find-leads [focus]                                discover prospects
/nikola find-companies [focus]                            CWPs + gigs
/nikola patch <skill>: <rule>                             hot rule (permanent)
/nikola patches list                                      show active patches
/nikola patches remove <id>                               soft-delete a patch
/nikola status                                            pipeline + cost + paused
/nikola resume                                            clear paused state
```

Single-user gate: every webhook + slash drops messages where `user_id !== mostafa_user_id`. Channel gate: drops messages where `channel_id !== bdr_channel_id`.

## Required `functions.config()` keys

```
slack.bot_token
slack.signing_secret
slack.bdr_channel_id
slack.mostafa_user_id
openai.api_key
notion.api_key
firecrawl.api_key
```

(Existing `gmail.client_id` + `gmail.client_secret` are reused via `Marketing-agent/functions/src/gmail/oauthService.ts`.)

## One-time setup

1. Create Slack app "Nikola" in CodeContent workspace. Scopes: `chat:write`, `reactions:read`, `channels:history`, `groups:history`, `commands`. Install. Add bot to `#bdr`.
2. Slash command `/nikola` → `nikolaSlashCommand` URL.
3. Events API → `nikolaSlackEvents` URL. Subscribe `reaction_added`, `message.channels`, `message.groups`.
4. `firebase functions:config:set ...` (all 7 keys above).
5. **Rotate `functions/.runtimeconfig.json` plaintext secrets** (xoxb token, GCP key, OpenAI, Apollo, Webflow currently committed) before first deploy.
6. Lock OAuth on `admin` Gmail account if not done (uses existing `getGmailAuthUrl` callable).
7. Gmail Pub/Sub topic + subscription + watch — see `functions/src/nikola/gmail/README.md`.
8. Seed `nikolaState/singleton` (created automatically on first read).

## Cost model

Hard cap **$15/mo** in `config.ts` (`COST_CAP_USD`). `costGate.recordSkillCost` increments `nikolaState.mtdCostUsd` atomically. Warn at $12 (80%). At $15 the morning batch + on-demand commands halt with a clear message; reply ingestion stays alive. `/nikola resume` overrides for the rest of the month.

`nikolaSkillRuns` records per-call model, tokens, tool calls, duration, cost — useful for tuning.

## Deviations from the spec

- **Chat Completions, not Responses API.** Same structured-output guarantees (`response_format: json_schema, strict: true`), more stable SDK surface in `openai@^4.85`. Documented in `skillRunner.ts` header.
- **Generic web_search proxy, not OpenAI built-in.** Wraps Firecrawl's `/search` endpoint so we don't need OpenAI's web_search-tool entitlement.
- **Sheet migration: skipped per Mostafa.** Source of truth is Firestore from day 0.
- **Discovery scheduled jobs: skipped.** On-demand only via `/nikola find-leads` and `/nikola find-companies`.
- **Apollo auto-enrich: off.** `/nikola enrich <leadId>` only.

## Known gotchas

- BDR skills write to `customFields.outreach_*` flat keys; Marketing-agent's `createDraft.ts` writes nested `outreach.linkedIn.status`. Nikola follows the **nested** convention (matches the existing UI). If the BDR skills are edited to output the nested shape directly, no Nikola change is needed.
- `routeSkill.ts` reads `outreach.linkedIn.status`. If a lead exists with only the BDR-flat shape, `dueLeadsQuery` won't pick it up. Migration of pre-existing flat-shape leads is out of scope for v1.
- Gmail watch expires every 7 days. `setupNikolaGmailWatchHttp` should be re-hit weekly (manual ok for v1).
- `nikolaContextSync` runs at 03:00 UTC so `nikolaContext` is fresh for the 07:00 morning batch.

## Bug + system docs rule

Per CLAUDE.md, every bug fix in Nikola must land a `bugs/YYYY-MM-DD-*.md` post-mortem and any system-shape change must update this file.
