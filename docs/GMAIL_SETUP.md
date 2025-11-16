# Gmail API Integration Setup Guide

This guide explains how to configure the Gmail API integration for the Inbound Generation feature.

## Overview

The Gmail integration fetches newsletter emails from a shared inbox every 3 days via a scheduled Cloud Function. Users can also manually trigger sync via the UI.

## Prerequisites

- Google Cloud Project with Firebase enabled
- Firebase CLI installed and authenticated
- A Gmail/Google Workspace account for the shared newsletter inbox

---

## Step 1: Enable Gmail API in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Navigate to **APIs & Services** > **Library**
4. Search for "Gmail API"
5. Click **Enable**

---

## Step 2: Create a Service Account

1. In Google Cloud Console, go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name it: `gmail-newsletter-reader` (or your preferred name)
4. Description: "Service account for reading newsletter emails"
5. Click **Create and Continue**
6. Skip "Grant this service account access to project" (no roles needed for Gmail)
7. Click **Done**

---

## Step 3: Generate Service Account Key

1. Click on the newly created service account
2. Go to the **Keys** tab
3. Click **Add Key** > **Create new key**
4. Choose **JSON** format
5. Click **Create**
6. A JSON file will be downloaded - **keep this file secure!**

The downloaded JSON file will look like this:

```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "gmail-newsletter-reader@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

---

## Step 4: Configure Google Workspace Domain-Wide Delegation

**Note**: This step is required for service accounts to access Gmail. If you're using a regular Gmail account (not Google Workspace), you'll need to use OAuth 2.0 instead (see Alternative Setup below).

### For Google Workspace Admins:

1. In Google Cloud Console, go to your service account
2. Copy the **Client ID** (numeric value)
3. Go to [Google Workspace Admin Console](https://admin.google.com)
4. Navigate to **Security** > **Access and data control** > **API Controls**
5. Click **Manage Domain Wide Delegation**
6. Click **Add new**
7. Paste the **Client ID**
8. In **OAuth Scopes**, add:
   ```
   https://www.googleapis.com/auth/gmail.readonly
   ```
9. Click **Authorize**

---

## Step 5: Grant Service Account Access to Shared Inbox

1. Log in to the Gmail account you want to use (e.g., `newsletters@yourcompany.com`)
2. Go to Gmail Settings > **See all settings** > **Accounts and Import**
3. In the "Grant access to your account" section, click **Add another account**
4. Enter the service account email: `gmail-newsletter-reader@your-project.iam.gserviceaccount.com`
5. Click **Next Step** > **Send email to grant access**
6. The service account will receive a confirmation email
7. Click the confirmation link (you may need to manually verify)

**Alternative**: Use Gmail delegation in Google Workspace
- Go to Admin Console > **Apps** > **Google Workspace** > **Gmail** > **Delegation**
- Add the service account email with "Read" permissions for the target inbox

---

## Step 6: Configure Firebase Functions Environment

You need to set two configuration values for the Cloud Functions:

### 6.1 Set Gmail Credentials (Service Account JSON)

```bash
# Minify the JSON first (remove newlines and spaces)
# The credentials should be a single-line JSON string

firebase functions:config:set gmail.credentials='{"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"gmail-newsletter-reader@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
```

**Important**: When copying the JSON, preserve the newline characters (`\n`) in the `private_key` field!

**Easier method** (use a helper script):

Create a file `set-gmail-config.sh`:

```bash
#!/bin/bash
# Read the service account JSON file
SERVICE_ACCOUNT_JSON=$(cat path/to/your-service-account-key.json)

# Set the config
firebase functions:config:set gmail.credentials="$SERVICE_ACCOUNT_JSON"
```

Run: `chmod +x set-gmail-config.sh && ./set-gmail-config.sh`

### 6.2 Set Newsletter Inbox Email

```bash
firebase functions:config:set gmail.inbox_email="newsletters@yourcompany.com"
```

Replace `newsletters@yourcompany.com` with your actual shared inbox email.

### 6.3 Verify Configuration

```bash
firebase functions:config:get
```

You should see:

```json
{
  "gmail": {
    "credentials": "{\"type\":\"service_account\",...}",
    "inbox_email": "newsletters@yourcompany.com"
  }
}
```

---

## Step 7: Deploy Cloud Functions

Deploy the Gmail Cloud Functions:

```bash
cd functions
npm install
cd ..

# Deploy only Gmail functions
firebase deploy --only functions:scheduledEmailSync,functions:manualEmailSync

# OR deploy all functions
firebase deploy --only functions
```

---

## Step 8: Deploy Firestore Security Rules

```bash
firebase deploy --only firestore:rules
```

---

## Step 9: Test the Integration

### 9.1 Test Manual Sync

1. Build and run the frontend:
   ```bash
   cd agency-app
   npm install
   npm start
   ```

2. Navigate to the **Inbound Generation** page
3. Click the **Sync Now** button (purple FAB in bottom-right)
4. Check the browser console and Firebase Functions logs for any errors

### 9.2 Check Cloud Functions Logs

```bash
firebase functions:log --only scheduledEmailSync,manualEmailSync
```

### 9.3 Verify Firestore Data

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Firestore Database**
4. Check for the `newsletters` collection:
   - `newsletters/emails/items/{emailId}` - Email documents
   - `newsletters/metadata` - Sync metadata

---

## Step 10: Schedule the Cron Job

The `scheduledEmailSync` function is configured to run every 72 hours (3 days). Firebase will automatically schedule this job when you deploy.

To verify the schedule:

```bash
# List all scheduled functions
firebase functions:list
```

You should see `scheduledEmailSync` with schedule: `every 72 hours`

---

## Troubleshooting

### Error: "Gmail credentials not configured"

**Solution**: Make sure you've set the `gmail.credentials` config value correctly.

```bash
firebase functions:config:get gmail.credentials
```

### Error: "User authentication failed"

**Solution**:
1. Verify domain-wide delegation is set up correctly
2. Check that the service account has the correct OAuth scopes
3. Ensure the inbox email in the config matches the Gmail account

### Error: "Insufficient Permission"

**Solution**: Grant the service account access to the Gmail inbox (see Step 5)

### No emails fetched

**Solution**:
1. Check that the inbox actually has emails from the last 3 days
2. Verify the service account can read emails by testing with Gmail API Explorer
3. Check Cloud Functions logs for detailed error messages

### Scheduled function not running

**Solution**:
1. Make sure you've deployed the function: `firebase deploy --only functions:scheduledEmailSync`
2. Check Firebase Console > Functions to see if the schedule is active
3. Note: Scheduled functions require Firebase Blaze plan (pay-as-you-go)

---

## Alternative Setup: OAuth 2.0 (For Regular Gmail Accounts)

If you're using a personal Gmail account (not Google Workspace), you'll need to modify the code to use OAuth 2.0 instead of service accounts.

**Steps**:

1. Create OAuth 2.0 credentials in Google Cloud Console
2. Implement OAuth consent flow in the frontend
3. Store refresh tokens in Firestore for each user
4. Modify `gmailService.ts` to use OAuth instead of JWT authentication

This requires more complex implementation. Contact the development team if you need this approach.

---

## Security Best Practices

1. **Never commit** the service account JSON file to version control
2. **Restrict** the service account to only the Gmail API scope it needs
3. **Regularly rotate** service account keys (every 90 days)
4. **Monitor** Cloud Functions logs for unauthorized access attempts
5. **Use** Firestore security rules to ensure only authenticated users can read emails
6. **Limit** the number of emails fetched (currently 100 max) to avoid excessive API usage

---

## Cost Estimate

**Gmail API**: Free (no quota limits for most use cases)

**Firebase Cloud Functions**:
- Scheduled function: Runs every 3 days = ~10 invocations/month
- Manual sync: Depends on usage, estimate 20 invocations/month
- **Total**: ~30 invocations/month = **Free tier** (2 million invocations/month free)

**Firestore**:
- Reads: ~100 emails × 30 syncs = 3,000 reads/month
- Writes: ~100 emails × 30 syncs = 3,000 writes/month
- **Total**: **Free tier** (50k reads + 20k writes/day free)

**Estimated total cost**: **$0/month** (within free tier)

---

## Support

For issues with this integration:

1. Check the troubleshooting section above
2. Review Cloud Functions logs: `firebase functions:log`
3. Check Firestore security rules: `firebase firestore:rules get`
4. Contact the development team with error logs

---

## Next Steps (Future Enhancements)

- **Phase 2**: Add AI-powered LinkedIn post generation from emails
- **Phase 3**: Email filtering by sender/subject
- **Phase 4**: Bulk email processing
- **Phase 5**: Email archiving and management

---

**Last updated**: November 2025
