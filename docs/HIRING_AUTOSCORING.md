# Hiring Autoscoring with LinkedIn Enrichment

The `applicants` collection has an automatic Cloud Function that scores every new applicant on a 0–10 scale across six dimensions, using both their application form answers and a verified LinkedIn profile pulled via Apify.

## Trigger flow

```
Webflow / Payload form  ──►  applicants/{id} created  ──►  scoreApplicantOnCreate
                                                              │
                                                              ▼
                                            1. Approved-university pre-screen
                                                  │
                                                  ├── fail ─►  status: ai_rejected, total: 0
                                                  │
                                                  ▼ pass
                                            2. Apify LinkedIn enrichment (soft)
                                                  │
                                                  ▼
                                            3. GPT-4o-mini scoring with cross-checks
                                                  │
                                                  ▼
                                            4. Firestore update: aiScore + apifyEnrichment
```

The pre-screen and scoring live in `functions/src/hiring/scoreApplicant.ts`. The Apify wrapper lives in `functions/src/hiring/enrichLinkedInProfile.ts`.

## Apify enrichment

- **Actor:** `harvestapi/linkedin-profile-scraper`
- **Mode:** `Profile details no email ($4 per 1k)` — email already comes from the form
- **Cost:** $0.004 per successful enrichment, logged via `logApiCost` under service `applicant-linkedin-enrichment` (category `hiring`)
- **Endpoint:** `POST https://api.apify.com/v2/acts/harvestapi~linkedin-profile-scraper/run-sync-get-dataset-items`
- **Same actor used by the BDR `source` skill**, so inbound + outbound share a profile schema.

Enrichment is a **soft dependency**. Any failure (no token, missing URL, bad URL format, Apify HTTP error, empty response) falls back to form-only scoring rather than blocking the trigger. The applicant doc records what happened in `enrichmentStatus`.

### `enrichmentStatus` values

| Status | Meaning |
|---|---|
| `enriched` | Apify returned a profile; `apifyEnrichment` populated |
| `skipped_no_url` | Applicant has no LinkedIn URL |
| `skipped_invalid_url` | URL is set but doesn't match `linkedin.com/in/<slug>` |
| `skipped_no_token` | `APIFY_TOKEN` not configured in Functions config |
| `failed` | Apify HTTP error, empty dataset, or profile-not-found; `enrichmentError` populated |

## Cross-check rules baked into the scoring prompt

When a `Verified LinkedIn Profile` block is appended to the GPT user prompt:

1. **University mismatch.** If the verified `education[].schoolName` doesn't match the candidate's claimed `Education` field (case-insensitive substring, either direction), GPT adds red flag `"Claimed university does not match LinkedIn"` and caps Dimension 1 at 0.5.
2. **Experience verification.** Verified `experience[]` outweighs the form claim. Multi-year tenures, founder roles, and recognized companies count as 2.0+. If the form claims experience but LinkedIn shows nothing, Dimension 2 is capped at 1.0.
3. **Location verification.** If LinkedIn shows a non-Egypt country, Dimension 1 is capped at 1.0.
4. **LinkedIn bonus.** `followers >= 500` OR a founder/co-founder role at an active company counts as the LinkedIn-activity bonus signal (within the existing 1.0 bonus cap).

If no `Verified LinkedIn Profile` block is present (enrichment skipped or failed), GPT scores from form data only — no penalty.

## Firestore document shape

```ts
applicants/{id} {
  // ... existing fields ...
  aiScore: { total, dimensions, tier, reasoning, redFlags, strengths, ... }
  apifyEnrichment: Record<string, any> | null   // raw harvestapi profile
  enrichmentStatus: 'enriched' | 'skipped_no_url' | 'skipped_invalid_url' | 'skipped_no_token' | 'failed'
  enrichmentError: string | null                // populated only when status === 'failed'
  enrichmentScrapedAt: Timestamp | null         // populated only when status === 'enriched'
}
```

The matching frontend type is in `agency-app/src/types/applicant.ts`. The detail dialog renders a **Verified LinkedIn Profile** panel under the AI Score breakdown — see `agency-app/src/components/features/hiring/ApplicantDetailDialog.tsx`.

## Configuration

The Apify token must be set in Firebase Functions config before deploying:

```bash
APIFY_TOKEN=<your token>
firebase functions:config:set apify.token="$APIFY_TOKEN"
```

Confirm with `firebase functions:config:get apify` (the value will be redacted in logs but visible in the JSON output — keep that off-screen).

The function reads the token at runtime via `functions.config().apify?.token || process.env.APIFY_TOKEN`, mirroring the OpenAI key pattern.

## Cost model

Per inbound applicant who passes the university pre-screen:

| Step | Service | Cost |
|---|---|---|
| LinkedIn enrichment | `apify-harvestapi-linkedin-profile-scraper` | $0.004 |
| GPT scoring | `gpt-4o-mini` (~600 input + ~300 output tokens) | ~$0.0003 |

Both costs flow through `logApiCost` with `userId: 'system-ai-scorer'` and aggregate under `users/system-ai-scorer/apiUsage/ai/breakdown/hiring`.

## Function configuration

`scoreApplicantOnCreate` runs with `timeoutSeconds: 300, memory: 512MB` to accommodate Apify run-sync calls (typically 30–90s, p99 ~120s) on top of the GPT call.

## Out of scope (intentional)

- **No backfill.** Existing applicants keep their original score; only new applicants trigger enrichment.
- **No manual rescore button.** A re-score requires deleting `aiScore` from the doc to re-trigger the function — adding a UI button is future work.
- **No daily cost cap.** Current scale is 1–2 applicants/day; not worth a flag yet.
