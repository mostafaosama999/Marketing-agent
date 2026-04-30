# Hiring Batch Notifications

Posts a single Slack message to the `#hiring` channel every time **5 new applicants** accumulate in `status='applied'` after surviving AI screening.

## Why

Inbound hiring volume is high. Pinging Slack on every application would create noise; pinging only when AI auto-rejects would miss the human-review work. Batching at 5 survivors gives a single, actionable "time to look at the queue" signal.

## How it works

1. An applicant document is created in Firestore (via Webflow webhook, Payload webhook, CSV import, or manual creation). Default `status` is `applied`.
2. `scoreApplicantOnCreate` (Firestore onCreate trigger on `applicants/{id}`) runs:
   - Pre-screens education against the approved-university list. If rejected → `status='ai_rejected'`, **not counted**.
   - Otherwise calls GPT-4o-mini scoring. If tier is `REJECT` → `status='ai_rejected'`, **not counted**.
   - Otherwise leaves `status='applied'` → **counted**.
3. After the final status decision, the trigger calls `recordAppliedApplicant(id, name)`.
4. `recordAppliedApplicant` runs a Firestore transaction on `hiringConfig/notificationState`:
   - Appends `{id, name, queuedAt}` to a `pending` array
   - When length reaches `5`, captures the batch, clears the array, bumps `totalNotifiedBatches`
5. After the transaction, if a batch was captured, posts to Slack via `sendHiringSlackMessage()`.

## Files

| File | Role |
|------|------|
| `functions/src/hiring/notifyAppliedThreshold.ts` | Counter + Slack send |
| `functions/src/hiring/scoreApplicant.ts` | Calls `recordAppliedApplicant()` at the three "applied-survives" exit paths |
| `functions/src/utils/slackUtils.ts` | `sendHiringSlackMessage()` (reused) |

## Firestore schema

`hiringConfig/notificationState`:
```
{
  pending: Array<{ id: string; name: string; queuedAt: Timestamp }>,
  lastNotifiedAt: Timestamp | null,
  totalNotifiedBatches: number
}
```

Created lazily on first run.

## Counted vs not counted

| Path | Counted? |
|------|----------|
| Webhook/CSV/manual create → AI passes | ✅ |
| Webhook/CSV/manual create → AI auto-rejects | ❌ |
| University pre-screen rejects | ❌ |
| OpenAI key missing | ✅ (still in `applied`) |
| GPT call throws | ✅ (still in `applied`) |
| Manual move from `ai_rejected` → `applied` | ❌ (onCreate trigger only) |

## Configuration

- **Threshold**: hardcoded `APPLIED_NOTIFICATION_THRESHOLD = 5` in `notifyAppliedThreshold.ts`. Change the constant and redeploy `scoreApplicantOnCreate`.
- **Slack channel**: uses `slack.hiring_channel` (default `"hiring"`). Set via `firebase functions:config:set slack.hiring_channel="..."`.
- **Hiring board URL**: hardcoded `HIRING_BOARD_URL` in `notifyAppliedThreshold.ts`.

## Testing

1. Seed `hiringConfig/notificationState` with 4 dummy entries via Firebase console:
   ```json
   {
     "pending": [
       { "id": "t1", "name": "Test 1" },
       { "id": "t2", "name": "Test 2" },
       { "id": "t3", "name": "Test 3" },
       { "id": "t4", "name": "Test 4" }
     ],
     "lastNotifiedAt": null,
     "totalNotifiedBatches": 0
   }
   ```
2. Add one applicant via the app with an approved university.
3. After scoring completes (~10s), check `#hiring` for the message and verify `pending` is empty + `totalNotifiedBatches: 1`.

## Failure semantics

- Slack send wrapped in try/catch — outage logs but doesn't throw.
- Counter transaction wrapped in try/catch — failure logs and the trigger proceeds. The trade-off: under transaction failure we may miss a count, but we never block the scoring pipeline.
- Once a batch fires, the queue is cleared even if Slack later fails. We accept losing one notification rather than risking duplicate sends on retry.
