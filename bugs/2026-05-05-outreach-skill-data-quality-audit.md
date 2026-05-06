# Audit: `generate_outreach_skill` data-quality issues (2026-05-05)

## Summary
Audit of all leads/entities written to `marketing-app-cc237` Firestore by the BDR `/generate-outreach` skill across two batches:
- **2026-05-03 run:** Voxel51 + Jimmy Guerrero (primary) + Brian Moore (secondary)
- **2026-05-04 run:** Encord (Otto), TinyFish (Sudheesh), Browser Use (Magnus), Browserbase (Paul), SuperAnnotate (Julianne), V7 Labs (Christian), Authentik (Fletcher), Cerbos (Emre), FusionAuth (Dayna)

(No clean Jan/Feb baseline exists for `generate_outreach_skill` — skill is new. Older Jan leads come from `apollo_discovery` and have a different shape.)

The skill is **mostly writing the right structure** but is making 9 categories of mistakes, several of them ship-blocking.

---

## 1. Variant DM fields contain EMAILS, not DMs (every recent lead)

`customFields.outreach_variant_a_dm` through `outreach_variant_f_dm` are supposed to be LinkedIn DM bodies. Across **every** recent lead they contain full email bodies starting with `"Subject: ...\n\nHey <name>,\n\n..."`.

Examples:
- `leads/jimmy-guerrero_2026-05-03` → `outreach_variant_f_dm`: `"Subject: After the False Positives 70.9% post on your blog\n\nHey Jimmy,..."`
- `leads/otto-szoke` → `outreach_variant_a_dm`: `"Subject: Tutorial gap on Encord's blog (Physical AI suite)\n\nHey Otto,..."`
- `leads/sudheesh-nair` → `outreach_variant_a_dm`: `"Subject: TinyFish + LangGraph integration story\n\nHey Sudheesh,..."`
- `leads/dayna-rothman` → `outreach_variant_a_dm`: `"Subject: Passkey content gap on FusionAuth's blog\n\nHey Dayna,..."`

LinkedIn DMs have no subject line and a much tighter character budget. If Mostafa copy-pastes any `*_dm` field into LinkedIn, the literal "Subject: ..." line goes with it.

**Likely cause:** The skill is generating one body per variant and duplicating it into both `*_dm` and `*_email_body`, prepending "Subject: " in the DM branch.

---

## 2. Brian Moore's variants B–F are placeholder strings (not real content)

`leads/brian-moore_2026-05-03` (secondary lead for Voxel51) — only Variant A is real. Variants B–F all contain literal note-to-self text:

```
"outreach_variant_b_dm":         "(Same as Jimmy's Variant B, with greeting changed to 'Hey Brian,'. Founder-escalation use only. See Jimmy's lead doc for full body.)"
"outreach_variant_c_email_body": "(Same as Jimmy's Variant C email, with greeting changed to 'Hey Brian,'. Founder-escalation use only. See Jimmy's lead doc for full body.)"
... (B, C, D, E, F all the same shape)

"outreach_followup_1": "(Founder-escalation reframe needed before sending. Use Jimmy's follow-up 1 as a template, but acknowledge that this is reaching out to the founder after the editorial gateway went silent.)"
"outreach_followup_2": "(Founder-escalation reframe needed before sending. Use Jimmy's follow-up 2 as a template.)"
```

**Ship-blocking.** If Mostafa picks Variant E for Brian in the CRM and sends, the recipient gets a self-referential parenthetical.

**Likely cause:** Skill ran out of context budget on the secondary lead and emitted shorthand instead of fully expanding each variant.

---

## 3. Brian Moore should not have been written as a lead at all

`SKILL.md` Step 3.1 explicitly: *"Never write tertiary or escalation contacts as leads. Marketing-track and founder are parallel/escalation paths in Hard Rule 17a's hierarchy, not pitch-level secondary contacts."*

Brian's `outreach_hook_signal` says outright: *"Founder fallback for escalation only. Primary contact is Jimmy Guerrero..."* — i.e., the skill recognized he's an escalation contact, then wrote him anyway. Doc ID `brian-moore_2026-05-03` shouldn't exist.

---

## 4. Otto Szoke has Variant G + 4 invented fields

`leads/otto-szoke` includes:
- `outreach_variant_g_dm`, `outreach_variant_g_email_body`, `outreach_variant_g_email_subject` — schema only defines A–F
- `outreach_eric_intro_dm` — DM template addressed to a third party (Eric at W&B), not Otto
- `outreach_mutual_connection`, `outreach_otto_connection_status`, `outreach_warm_intro_path` — fully off-schema flags

These won't render in the agency-app form (no field definitions for them), and they bypass the contract documented in `firestore-schema.md`. Either the schema needs to grow a "warm-intro" branch with a `variant_g` slot and explicit warm-intro fields, or the skill needs to compress these into the existing A–F slots and `customFields.outreach_hook_*`.

---

## 5. Timestamps are fabricated / rounded (not real `now`)

Schema requires `createdAt`/`updatedAt`/`outreach_generated_at`/`ratingV2UpdatedAt` to be `<ISO_NOW>`. Actual values are rounded fakes — sometimes minutes, sometimes hours, sometimes midnight:

| Doc | Stored `createdAt` | Real `createTime` |
|---|---|---|
| `leads/jimmy-guerrero_2026-05-03` | `2026-05-03T00:00:00Z` (midnight) | `2026-05-03T09:38:08.490Z` |
| `leads/brian-moore_2026-05-03` | `2026-05-03T00:00:00Z` (midnight) | `2026-05-03T09:38:47.681Z` |
| `leads/otto-szoke` | `2026-05-04T17:15:00Z` (15-min round) | `2026-05-04T17:35:10.558Z` |
| `leads/sudheesh-nair` | `2026-05-04T18:00:00Z` (top of hour) | `2026-05-04T22:39:55.749Z` (4+ hr off) |
| `leads/dayna-rothman` | `2026-05-04T12:00:00Z` (noon) | `2026-05-04T22:34:01.066Z` (10+ hr off) |
| `entities/voxel51_2026-05-03` | `2026-05-03T00:00:00Z` | `2026-05-03T09:36:35.909Z` |
| `entities/fusionauth` | `2026-05-04T12:00:00Z` | `2026-05-04T22:32:32.777Z` |

`outreach_generated_at`, `ratingV2UpdatedAt`, `outreach.email.draftCreatedAt`, `updatedAt` all mirror this fabricated pattern.

**Likely cause:** The LLM executing the skill is hallucinating plausible timestamps rather than reading actual wall-clock time. Schema's worked-example shows full precision (`14:22:11.000Z`) but the model is rounding to "today at noon"-style anchors.

**Side effect:** Time-in-stage analytics, "Time in Current State" UI (which showed "No data" in the user's form dump), and any sort-by-recency are all unreliable.

---

## 6. Doc-ID convention inconsistent across the two batches

`SKILL.md` Step 2 / 3.2 / "Critical conventions checklist" all say: clean slug, **no date suffix**.

The 2026-05-03 batch violated this (legacy convention):
- `entities/voxel51_2026-05-03`
- `leads/jimmy-guerrero_2026-05-03`
- `leads/brian-moore_2026-05-03`

The 2026-05-04 batch follows the rule:
- `entities/encord`, `entities/fusionauth`, `entities/tinyfish`
- `leads/otto-szoke`, `leads/dayna-rothman`, `leads/sudheesh-nair`, `leads/magnus-mueller`, etc.

So the convention was tightened between May 3 and May 4. Voxel51's records will permanently sit under awkward URLs.

---

## 7. Timeline `stateDurations` stores SECONDS instead of DAYS

`leads/jimmy-guerrero_2026-05-03/timeline/jimmy-guerrero_2026-05-03`:
```
"stateDurations": {
  "contacted": 0,
  "new_lead": 86400    ← this is 1 day expressed in seconds
}
```

`agency-app/src/types/lead.ts` is explicit: `stateDurations?: { new_lead?: number; // Days }`. The board UI's duration color-coding (`0-3d green, 4-7d orange, 8+d red`) will read 86400 and paint everything blood-red.

Otto's timeline is fine (`new_lead: 0`) only because no transition has occurred yet. The bug surfaces the moment a status changes.

---

## 8. LinkedIn URL canonicalization is uneven

Schema (Step 1): *"strip protocol, strip `www.` and `m.` subdomain prefixes, strip trailing slash, strip query string, lowercase."*

Actual `customFields.lead_linkedin` values:

| Lead | Stored value | Issue |
|---|---|---|
| Jimmy | `linkedin.com/in/jiguerrero` | ✅ canonical |
| Otto | `uk.linkedin.com/in/ottosz` | country subdomain `uk.` kept (schema doesn't address) |
| Magnus | (need to verify) | likely fine |
| Sudheesh | `https://www.linkedin.com/in/sudheenair/` | ❌ protocol, `www.`, trailing `/` all kept |
| Dayna | `https://www.linkedin.com/in/daynalrothman` | ❌ protocol, `www.` kept |

This breaks LinkedIn-URL dedup matching — if Otto comes through a future scan as `linkedin.com/in/ottosz` (no `uk.`), the dedup would write a duplicate.

`outreach.linkedIn.profileUrl` mirrors the same uncanonicalized values. (Side note: the schema's Worked Example contradicts itself here — it shows `https://www.linkedin.com/in/theo-vasilis/` for `profileUrl`, which is fully un-stripped. The schema needs disambiguation: either `lead_linkedin` and `profileUrl` share canonical form, or one keeps the raw URL.)

---

## 9. Off-schema "send-time" fields appearing on Jimmy's lead

`leads/jimmy-guerrero_2026-05-03` has these fields that aren't in `firestore-schema.md`:
- `customFields.outreach_sent_at` (timestamp)
- `customFields.outreach_sent_channel` (`"linkedin"`)
- `outreach.linkedIn.sentAt` ✓ this one IS in `lead.ts`
- `outreach.linkedIn.sentVariant` (`"E"`) — not in `lead.ts` Lead type

These appear added by a separate "send" workflow after the skill ran. They're not the skill's bug per se, but the schema doesn't document them, and `sentVariant` isn't typed in `lead.ts`. If the agency-app form is rendering the dump the user pasted, `sentVariant` may be the source of the orphan `"E"` value the user saw labeled under `Outreach Variant F Dm`.

---

## What's actually correct (so the skill isn't all bad)

To balance: the skill IS getting these right consistently:
- `customFields.contact_tier` (`primary` / `secondary`)
- `customFields.contact_apify_verified` (true/false based on enrichment path)
- `customFields.outreach_hook_type` (one of the documented enum values)
- `customFields.outreach_hook_signal` (one-sentence observation)
- `customFields.outreach_report_path` (correct relative path under `reports/outreach/`)
- `customFields.outreach_icp_score` / `outreach_icp_tier` on entities
- `customFields.labels` mapped correctly (`Hot_Prospect` for 80+ tier)
- `ratingV2` math (`min(10, round(score/10))`)
- Entity `description`, `website`, `website_blog_link`, `company_country`, `ai_company_type`
- Initial `status: "new_lead"`, `archived: false`, `pendingOfferApproval: false`
- `outreach.email.status: "not_sent"` and `outreach.linkedIn.status: "not_sent"` initial values
- `outreach.email.originalSubject` denormalized from Variant A's subject
- Canonical fields (`outreach_dm_body`, `outreach_email_body`, `outreach_email_subject`, `outreach_selected_variant`) initialized to `null` per spec

---

## Severity-ranked fix list

### P0 — Ship-blocking (will be sent to a real person)
1. **Brian Moore B–F variants are placeholders.** Either expand the secondary-lead variants fully or skip writing the secondary entirely (Brian shouldn't be a lead at all per Step 3.1).
2. **All `*_dm` fields are emails with `Subject:` prefixes.** Generate distinct, shorter, no-subject DM bodies — or rename the schema fields to make it explicit they're "DM-as-email" (and adjust the agency-app UI accordingly).

### P1 — Data integrity
3. **Stop fabricating timestamps.** Use real wall-clock ISO_NOW for `createdAt`/`updatedAt`/`outreach_generated_at`/`ratingV2UpdatedAt`/`draftCreatedAt`. Add an explicit instruction in `SKILL.md` Step 0 with a tool call to compute `now()` (e.g., a `date -u +%FT%TZ` Bash call) and reuse the captured value in every doc payload.
4. **`stateDurations` must be days, not seconds.** Whatever code path computed `86400` for Jimmy's `new_lead` slot needs to divide by 86400 (or just write integer days from the start).
5. **Decide the doc-ID rule and enforce it for entities too.** Voxel51's `_2026-05-03`-suffixed entity needs to either be migrated to `voxel51` or the schema needs to acknowledge the legacy.

### P2 — Schema drift
6. **Decide on Variant G + warm-intro fields.** Either grow the schema to support warm-intro mode (Variant G + `outreach_warm_intro_path` + a structured `outreach_warm_intro_via` field), or constrain the skill back to A–F + a single `outreach_hook_signal` note about the warm path.
7. **Disambiguate LinkedIn URL canonicalization.** Either fully canonical for both `lead_linkedin` and `outreach.linkedIn.profileUrl`, or pick one to be raw. The schema's worked example is currently inconsistent with the canonical-form rule above it.
8. **Document `outreach_sent_at`, `outreach_sent_channel`, `outreach.linkedIn.sentVariant`.** Add to `lead.ts` types and either document them in `firestore-schema.md` (if the skill writes them) or in a separate "send-flow" schema doc (if a different workflow writes them).

### P3 — Hygiene
9. **Don't write a secondary lead when the only secondary candidate is a founder/escalation contact.** Step 3.1 says so already; the skill ignored it for Voxel51.
10. **`outreach_variant_b_email_subject` for Jimmy = `"Re: FiftyOne's NVIDIA + Porsche content"`** — leading with `Re:` on a cold email tries to fake a thread. Probably intentional, but worth flagging in `learnings.md` as a tactical choice the skill is making unilaterally.

## Tech Debt
- The composite index on `leads.customFields.importedFrom + createdAt` is missing — `firestore_query_collection` MCP fails with `FAILED_PRECONDITION` when ordering. Either create the index or update the skill's dedup code path to fetch unordered.
- The `firestore_query_collection` MCP tool has a serializer bug: it returns "expected record, received array" on multi-doc results. `firestore_list_documents` works fine. Worth filing upstream.

---

## Fixes applied (2026-05-05 same-day)

### Skill files patched
- `claude_BDR_codecontent/.claude/skills/generate-outreach/SKILL.md`
  - **Step 4 / contact hierarchy:** added a HARD RULE forbidding founder/CEO from being written as a secondary lead. Founder is only written when they're the primary (small-team case). Brian Moore at Voxel51 cited as the audit-revealing violation.
  - **Step 9b (entity upsert):** doc-ID rule changed from `slugify(name)_YYYY-MM-DD` (always-with-date-suffix) to clean slug. Date suffix now reserved for archived-collision fallback. Same for Step 9c (lead writes).
  - **Step 9c:** added explicit "variants must be FULLY EXPANDED bodies" rule with the Brian Moore placeholder string as the cautionary example.
  - **Step 9-pre:** added new sub-step (a) requiring `date -u +%Y-%m-%dT%H:%M:%S.000Z` capture once at start of run; that captured value must be reused for ALL timestamp fields. References the May 3–4 fabricated-timestamp finding.
  - **Step 6 / DM rules:** removed the "Subject: <text>\n\n" prefix instruction from the `outreach_variant_*_dm` block layout. DMs are now body-only.

- `claude_BDR_codecontent/.claude/skills/generate-outreach/references/firestore-schema.md`
  - **Top-of-file:** added a "2026-05-05 audit fixes" notice listing the 7 most load-bearing rules.
  - **Step 0:** added 0a (capture wall-clock NOW once via Bash) before the existing project probe, with the specific list of fields that must use the captured value.
  - **Step 3.1:** added "founder never gets a secondary slot" + "variants must be fully expanded" + "Variants A–F only, no Variant G" rules. Documented why the warm-intro fields invented for Otto Szoke (`outreach_eric_intro_dm`, `outreach_warm_intro_path`, etc.) are off-schema.
  - **Step 4 / Timeline payload:** added the `stateDurations` is integer DAYS not seconds rule with the Jimmy 86400 example.

### Firestore data cleaned
- **61 DM fields stripped** of leading `Subject: <line>\n\n` prefix across 11 leads: `jimmy-guerrero_2026-05-03` (6), `brian-moore_2026-05-03` (1 — only Variant A was real), `otto-szoke` (6), `sudheesh-nair` (6), `dayna-rothman` (6), `magnus-mueller` (6), `paul-klein-iv` (6), `julianne-fong` (6), `christian-harinarain` (6), `fletcher-heisler` (6), `emre-baran` (6).
- **`leads/brian-moore_2026-05-03` archived** with `archived: true`, `archivedBy: "claude_skill_audit_fix"`, `archiveReason` pointing back to this audit doc. The lead remains in Firestore for history but is hidden from the active CRM.
- **`leads/jimmy-guerrero_2026-05-03/timeline/jimmy-guerrero_2026-05-03` `stateDurations.new_lead` patched 86400 → 1** (days, not seconds). Lead-card duration UI will now correctly show "1d" instead of "blood-red >> 8 days".

### Send-flow documentation added (after EDA on 3,893 leads)

Audited every lead in `marketing-app-cc237` for sent-time field usage. Two conventions exist: legacy (Jan–Mar 2026, ~1,800 leads using `customFields.linkedin_date_of_linkedin_contact` / `email_date_sending_email`) vs current (Apr 2026 onward, all using `outreach.{linkedIn|email}.sentAt`). The cutover was clean — zero May leads write the legacy custom fields.

Otto Szoke (`leads/otto-szoke`) is the canonical reference for the new convention: LinkedIn sent at 2026-05-04T23:08:00Z and email sent at 2026-05-05T09:36:00Z, ~10 hours apart, fully independent timestamps and `sentVariant` values per channel.

Added a new **"Send-flow fields"** section to `firestore-schema.md` covering:
- The legacy-vs-current convention table
- Per-channel independence rule (never cross-write LinkedIn timestamp into email field or vice versa, since `KPIsPage.tsx` and `LeadAnalytics.tsx` query them as separate analytics series)
- The lead-level `status` flip rules: `"contacted"` on FIRST channel send only; second channel send updates only that channel's nested fields
- The DEPRECATED flat-key denormalizations (`customFields.outreach_sent_at` / `outreach_sent_channel`) — present on exactly 1 lead (Jimmy) as an experimental holdover
- The `outreach.{channel}.sentVariant` typing gap — present on 7 leads but not in `lead.ts`; documented recommended addition for a future Marketing-agent PR
- Response-tracking field drift FYI (`LeadAnalytics.tsx` checks 5 variants of `lead_response`)

The skill `/generate-outreach` itself does not write any sent-time fields (and the new section says so explicitly) — it only initializes `outreach.{channel}.status: "not_sent"`. The cross-skill reference exists so whichever sister skill or UI flow flips status to sent (currently a mix of agency-app clicks and ad-hoc skill updates) stays aligned.

Also fixed a stale checklist item in `firestore-schema.md`'s "Critical conventions" — was still saying `slugify(name)_YYYY-MM-DD` (always-with-date-suffix) instead of clean slug (date suffix only on archived collisions).

### Follow-up fixes after advisor review

- **`SKILL.md` cold email subject formula:** removed `"Re: [Company]'s [recent product/feature]"` from the suggested subject formulas and replaced with `"After [Company]'s ..."` / `"... one tutorial later"`. Added explicit ban on leading `Re:` for cold first-touch (was the source of Jimmy/Otto/Sudheesh's Variant B subjects).
- **`firestore-schema.md` LinkedIn URL contradiction:** worked example's `outreach.linkedIn.profileUrl` value updated from `"https://www.linkedin.com/in/theo-vasilis/"` to `"linkedin.com/in/theo-vasilis"` so it matches the canonicalization rule in Step 1 and the `customFields.lead_linkedin` field. The contradiction between rule and example was the root of Sudheesh's `https://www.linkedin.com/in/sudheenair/` keeping its full URL while Jimmy's was stripped.
- **Brian Moore's placeholder variants null'd in Firestore:** 17 fields (variants B–F dm/subject/body + both follow-ups) overwritten with `nullValue` on `leads/brian-moore_2026-05-03`. Variant A — the only real one — preserved. Lead remains archived.

### Not fixed (deliberately deferred)
- **Doc-ID migration for `entities/voxel51_2026-05-03`, `leads/jimmy-guerrero_2026-05-03`, `leads/brian-moore_2026-05-03`.** These three were written with the legacy date-suffix convention (skill spec was inconsistent at the time). Migrating them to clean slugs (`voxel51`, `jimmy-guerrero`, `brian-moore`) would require updating cross-references (`lead.companyId` on every Voxel51 lead) — risky for a cosmetic gain. The skill is now patched to write clean slugs; future Voxel51 runs will land at `entities/voxel51` if Voxel51 is re-researched.
- **Otto Szoke's off-schema warm-intro fields** (`outreach_variant_g_*`, `outreach_eric_intro_dm`, `outreach_mutual_connection`, `outreach_otto_connection_status`, `outreach_warm_intro_path`). The fields don't render in the agency-app form so they're harmless. Removing them via field-deletion via the Firestore REST API is doable but low-leverage; the schema patch ensures no new Variant Gs get written.
- **Off-schema `outreach_sent_at` / `outreach_sent_channel` / `outreach.linkedIn.sentVariant` on Jimmy's lead.** These were added by a different skill/workflow during send-tracking. Not the generate-outreach skill's bug. Worth typing in `lead.ts` later but not load-bearing.
- **Fabricated-timestamp data on the existing leads.** All 11 leads have `createdAt`/`updatedAt`/`outreach_generated_at` fields with rounded values. Backfilling these to the real `createTime` requires reading `createTime` and writing it back as `createdAt` for each — possible but not high-leverage since the skill is now patched to capture wall-clock NOW. New runs will be correct.
