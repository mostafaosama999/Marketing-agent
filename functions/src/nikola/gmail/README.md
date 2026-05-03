# Nikola Gmail Reply Watch

Nikola watches `mostafa.moqbel.ibrahim@gmail.com` (the `accountType: "admin"`
account already configured in `Marketing-agent/functions/src/gmail/oauthService.ts`)
for replies to its drafted prospect emails. Personal inbox traffic is dropped at
the matcher layer (see `replyMatcher.ts`).

## One-time setup

1. **Confirm OAuth on the `admin` account.**
   The existing `getGmailAuthUrl` / `exchangeGmailOAuthCode` callables already
   handle this. Confirm the refresh token is stored:

   ```
   firebase firestore:get gmailTokens/admin --project marketing-app-cc237
   ```

   If empty, run the existing OAuth flow from the Marketing-agent UI for the
   admin account.

2. **Create the Pub/Sub topic.**

   ```bash
   gcloud pubsub topics create nikola-gmail-replies --project marketing-app-cc237
   gcloud pubsub topics add-iam-policy-binding nikola-gmail-replies \
     --member=serviceAccount:gmail-api-push@system.gserviceaccount.com \
     --role=roles/pubsub.publisher \
     --project marketing-app-cc237
   ```

3. **Create the push subscription.**
   The subscription pushes Gmail notifications to the `nikolaGmailWebhook`
   HTTPS function.

   ```bash
   gcloud pubsub subscriptions create nikola-gmail-replies-sub \
     --topic=nikola-gmail-replies \
     --push-endpoint="https://us-central1-marketing-app-cc237.cloudfunctions.net/nikolaGmailWebhook" \
     --ack-deadline=60 \
     --project marketing-app-cc237
   ```

4. **Start the watch.**
   Call the `setupNikolaGmailWatch` function once after deploy:

   ```bash
   curl -X POST "https://us-central1-marketing-app-cc237.cloudfunctions.net/setupNikolaGmailWatch"
   ```

   Or invoke from the Firebase shell. The function persists the
   `historyId` to `nikolaGmailWatch/state`. Watches expire every 7 days, so
   re-run the setup weekly (or wire a scheduled function for renewal).

## Verification

1. Send a test email from any address Nikola has previously drafted to (the
   reply matcher requires either `lead.email` or `lead.outreach.email.recipientEmail`
   to match).
2. The Pub/Sub topic should fire, Cloud Function should run sales skill, and a
   draft should appear in `#bdr` within ~60s.
3. Logs: `firebase functions:log --only nikolaGmailWebhook --project marketing-app-cc237`

## Limits

- Gmail watch persists for 7 days max — re-call `setupNikolaGmailWatch` weekly.
- Cloud Functions Pub/Sub subscriptions retry on non-2xx; ensure
  `nikolaGmailWebhook` returns 200 even on internal errors so we don't get
  stuck in a retry loop.
- Mostafa's personal inbox is **not** sent to OpenAI unless the From address
  matches a Nikola-tracked lead. This is a hard filter in `replyMatcher.ts`.
