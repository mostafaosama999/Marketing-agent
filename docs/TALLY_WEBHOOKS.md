# Tally Form Webhooks

## Overview

Tally.so forms are used on the CodeContent website (`write-share-blossom` repo) for:
1. **Hiring Application** (`/apply`) — collects job applications, stores in Firestore + Google Sheets, sends Slack notification
2. **Contact Form** (`/contact`) — collects inbound leads, sends Slack notification to `#project-reports`

Both webhooks receive POST requests from Tally when a form is submitted, verify the HMAC-SHA256 signature, extract field data, and trigger downstream actions.

## Architecture

```
Tally Form → Webhook POST → Cloud Function → Firestore / Google Sheets / Slack
```

## Cloud Functions

### `tallyHiringWebhook`

**File:** `functions/src/hiring/tallyWebhook.ts`  
**URL:** `https://us-central1-marketing-app-cc237.cloudfunctions.net/tallyHiringWebhook`  
**Tally Form ID:** `ODYrB7`

**What it does:**
1. Verifies webhook signature (HMAC-SHA256 via `tally-signature` header)
2. Extracts applicant fields from Tally payload (`data.fields[]` array)
3. Deduplicates by email and `tallySubmissionId`
4. Stores applicant in Firestore `applicants` collection (source: `"tally"`)
5. Syncs to Google Sheets hiring tracker (`1rs-yLkcHUcL9hNBNAdtOxlkiORlqDAuvLG6kqtFOtlY`)

**Applicant document fields:**
- name, email, phone, linkedInUrl, bio, education, sex, age, availability
- status: `"applied"` (default)
- score: `null` (filled by reviewers)
- formAnswers: `{ questionLabel: answer }` — maps long-form questions
- source: `"tally"`
- tallyFormId, tallySubmissionId

**Question mapping:** Uses the same `QUESTION_MAP` as the Webflow webhook for consistency. Matches field labels by substring (case-insensitive).

### `tallyContactWebhook`

**File:** `functions/src/hiring/tallyContactWebhook.ts`  
**URL:** `https://us-central1-marketing-app-cc237.cloudfunctions.net/tallyContactWebhook`  
**Tally Form ID:** `eq2P1Q`

**What it does:**
1. Verifies webhook signature
2. Extracts contact fields: name, email, company, docs URL, message
3. Sends formatted Slack notification to `#project-reports`

**No Firestore storage** — contact submissions are kept in Tally's built-in submissions dashboard.

## Environment Variables

```env
# In functions/.env
TALLY_WEBHOOK_SECRET=<signing secret from Tally webhook config>
```

Both webhooks use the same signing secret. This is set in Tally under each form's **Integrations → Webhooks → Signing Secret**.

## Tally Webhook Payload Format

```json
{
  "eventId": "unique-event-id",
  "eventType": "FORM_RESPONSE",
  "createdAt": "2026-04-05T12:00:00.000Z",
  "data": {
    "responseId": "response-id",
    "submissionId": "submission-id",
    "formId": "ODYrB7",
    "formName": "CodeContent Hiring Application",
    "createdAt": "2026-04-05T12:00:00.000Z",
    "fields": [
      { "key": "question_abc", "label": "Name", "type": "INPUT_TEXT", "value": "John Doe" },
      { "key": "question_def", "label": "Email", "type": "INPUT_EMAIL", "value": "john@example.com" }
    ]
  }
}
```

## Signature Verification

Tally signs webhooks using HMAC-SHA256:
- **Header:** `tally-signature`
- **Algorithm:** HMAC-SHA256 of the raw request body using the signing secret
- **Encoding:** Base64

Currently logs a warning on verification failure but does not block the request (same approach as Webflow webhook).

## Relationship to Webflow Webhook

The `tallyHiringWebhook` is the Tally equivalent of `webflowHiringWebhook`. Both write to the same Firestore `applicants` collection and the same Google Sheets tracker. The key differences:

| | Webflow | Tally |
|---|---------|-------|
| Source field | `source: "webflow"` | `source: "tally"` |
| Submission ID field | `webflowSubmissionId` | `tallySubmissionId` |
| Form ID field | `webflowFormId` | `tallyFormId` |
| Payload format | `payload.data` key-value object | `data.fields[]` array with label/value |
| Signature header | `x-webflow-signature` | `tally-signature` |
| Signature format | `{timestamp}:{body}` HMAC hex | Body-only HMAC base64 |

## Website Integration (write-share-blossom)

Forms are embedded as iframes in the React pages:

- **Apply page:** `src/pages/Apply.tsx` — embeds Tally form `ODYrB7`
- **Contact page:** `src/pages/Contact.tsx` — embeds Tally form `eq2P1Q`

Both use the Tally embed script (`https://tally.so/widgets/embed.js`) for dynamic height and transparent background.

## Troubleshooting

- **Webhook not firing:** Check Tally form → Integrations → Webhooks → ensure endpoint URL is correct and status is "Connected"
- **Signature verification failing:** Verify `TALLY_WEBHOOK_SECRET` in `functions/.env` matches the signing secret in Tally
- **Duplicate applicants:** Deduplication checks email and `tallySubmissionId` — both must be unique
- **Slack notification not sending:** Check `slack.bot_token` and `slack.channel` in Firebase runtime config
- **Sheet sync failing:** Check Google service account permissions on the hiring tracker sheet
