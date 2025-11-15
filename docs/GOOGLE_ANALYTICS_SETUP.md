# Google Analytics Integration Setup Guide

This guide will walk you through setting up Google Analytics (GA4) integration with your Marketing Agent CRM to automatically sync website traffic data to Firestore.

## Overview

The integration consists of:
- **Cloud Functions**: Server-side sync using Google Analytics Data API
- **Firestore Storage**: Website metrics and traffic sources stored in collections
- **Frontend Dashboard**: Real-time charts and metrics in the Outbound Analytics page
- **Automated Sync**: Daily scheduled sync at 2 AM UTC

## Prerequisites

- Google Analytics 4 (GA4) property set up for your website
- Google Cloud Console access with billing enabled
- Firebase project with Cloud Functions deployed
- Admin access to GA4 property

---

## Step 1: Enable Google Analytics Data API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project (or create a new one)
3. Navigate to **APIs & Services** → **Library**
4. Search for "Google Analytics Data API"
5. Click on "Google Analytics Data API"
6. Click **Enable**

---

## Step 2: Create Service Account

1. In Google Cloud Console, go to **IAM & Admin** → **Service Accounts**
2. Click **+ CREATE SERVICE ACCOUNT**
3. Fill in the details:
   - **Service account name**: `ga4-analytics-sync`
   - **Service account ID**: `ga4-analytics-sync` (auto-generated)
   - **Description**: `Service account for syncing Google Analytics data to Firestore`
4. Click **CREATE AND CONTINUE**
5. Skip role assignment (we'll grant GA4 access separately)
6. Click **DONE**

---

## Step 3: Generate Service Account Key

1. Find the service account you just created in the list
2. Click on the service account email (e.g., `ga4-analytics-sync@your-project.iam.gserviceaccount.com`)
3. Go to the **KEYS** tab
4. Click **ADD KEY** → **Create new key**
5. Select **JSON** format
6. Click **CREATE**
7. A JSON file will be downloaded to your computer
8. **IMPORTANT**: Keep this file secure and never commit it to version control

The downloaded JSON file will look like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "ga4-analytics-sync@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "..."
}
```

---

## Step 4: Grant Service Account Access to GA4

1. Go to [Google Analytics](https://analytics.google.com/)
2. Select your GA4 property
3. Click **Admin** (gear icon in bottom left)
4. In the **Property** column, click **Property Access Management**
5. Click **+ Add users**
6. Enter the service account email:
   ```
   ga4-analytics-sync@your-project.iam.gserviceaccount.com
   ```
7. Select role: **Viewer** (read-only access is sufficient)
8. Uncheck "Notify new users by email"
9. Click **Add**

---

## Step 5: Get Your GA4 Property ID

1. In Google Analytics, go to **Admin** → **Property Settings**
2. Find your **Property ID** (format: `123456789`)
3. Copy this ID - you'll need it for configuration

**Alternative method:**
- Go to any report in GA4
- Look at the URL: `https://analytics.google.com/analytics/web/#/pXXXXXXXXX/...`
- The number after `/p` is your property ID (without the "p")

---

## Step 6: Configure Firebase Functions

### Option A: Using Firebase CLI (Recommended)

1. Open terminal in your project's `functions` directory

2. Set the service account JSON as a secret:
   ```bash
   firebase functions:secrets:set GA4_SERVICE_ACCOUNT
   ```

3. When prompted, paste the entire contents of your service account JSON file

4. Press Enter, then Ctrl+D (or Cmd+D on Mac) to finish

### Option B: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to **Functions** → **Configuration**
4. Under "Environment variables", add:
   - **Key**: `GA4_SERVICE_ACCOUNT`
   - **Value**: Paste the entire JSON content (as a single-line string)

---

## Step 7: Deploy Cloud Functions

1. Navigate to your functions directory:
   ```bash
   cd /path/to/your/project/functions
   ```

2. Build the TypeScript functions:
   ```bash
   npm run build
   ```

3. Deploy the Google Analytics functions:
   ```bash
   firebase deploy --only functions:syncGoogleAnalytics,functions:scheduledGoogleAnalyticsSync
   ```

4. Wait for deployment to complete. You should see:
   ```
   ✔ functions[syncGoogleAnalytics(us-central1)] Successful create operation.
   ✔ functions[scheduledGoogleAnalyticsSync(us-central1)] Successful create operation.
   ```

---

## Step 8: Configure in CRM Application

### Method 1: Using Firestore Console

1. Go to [Firebase Console](https://console.firebase.google.com/) → Firestore Database
2. Create a new document:
   - **Collection**: `googleAnalytics`
   - **Document ID**: Your user ID (get from Firebase Authentication)
   - **Fields**:
     ```
     propertyId: "123456789" (your GA4 property ID from Step 5)
     websiteUrl: "https://yourwebsite.com"
     enabled: true
     syncInterval: "daily"
     createdAt: [Timestamp] (current time)
     createdBy: [Your user ID]
     ```

### Method 2: Using Frontend (Future Enhancement)

A configuration UI can be added to the Settings page to allow users to configure GA4 directly from the app.

---

## Step 9: Test the Integration

### Manual Sync Test

1. Log into your CRM application
2. Navigate to **Analytics** → **Outbound Analytics** (or `/analytics/outbound`)
3. Scroll down to the "Website Analytics" section
4. Click **Sync Now** button
5. Wait for sync to complete (should take 10-30 seconds)
6. You should see:
   - Success message: "Synced!"
   - Metrics cards populated with data
   - Traffic charts displaying

### Verify Firestore Data

1. Go to Firebase Console → Firestore Database
2. Navigate to: `googleAnalytics/{userId}/metrics`
3. You should see documents for each day with fields:
   - `date`: "YYYY-MM-DD"
   - `sessions`: number
   - `users`: number
   - `pageviews`: number
   - `avgSessionDuration`: number
   - `bounceRate`: number

4. Navigate to: `googleAnalytics/{userId}/trafficSources`
5. You should see documents for traffic sources:
   - `source`: "organic", "direct", "social", etc.
   - `sessions`: number
   - `percentage`: number

### Check Cloud Function Logs

```bash
firebase functions:log --only syncGoogleAnalytics
```

Look for successful execution logs:
```
✅ Successfully synced X metrics and Y traffic sources for user [userId]
```

---

## Step 10: Verify Automated Sync (Optional)

The `scheduledGoogleAnalyticsSync` function runs automatically every day at 2:00 AM UTC.

To verify:

1. Wait until after 2:00 AM UTC the next day
2. Check Firestore for updated data with recent timestamps
3. Or check Cloud Scheduler logs:
   ```bash
   firebase functions:log --only scheduledGoogleAnalyticsSync
   ```

---

## Firestore Schema Reference

### Collection: `googleAnalytics/{userId}`

Main configuration document:

| Field | Type | Description |
|-------|------|-------------|
| `propertyId` | string | GA4 Property ID (e.g., "123456789") |
| `websiteUrl` | string | Website URL being tracked |
| `enabled` | boolean | Whether sync is enabled |
| `syncInterval` | string | "daily" or "hourly" |
| `lastSyncAt` | timestamp | Last successful sync time |
| `lastSyncStatus` | string | "success" or "error" |
| `lastSyncError` | string | Error message if sync failed |
| `createdAt` | timestamp | When configured |
| `createdBy` | string | User ID who configured |

### Subcollection: `googleAnalytics/{userId}/metrics/{date}`

Daily metrics (one document per day):

| Field | Type | Description |
|-------|------|-------------|
| `date` | string | YYYY-MM-DD |
| `sessions` | number | Total sessions |
| `users` | number | Total users |
| `newUsers` | number | New users |
| `pageviews` | number | Total pageviews |
| `avgSessionDuration` | number | Avg session duration (seconds) |
| `bounceRate` | number | Bounce rate (0-100) |
| `syncedAt` | timestamp | When this data was synced |

### Subcollection: `googleAnalytics/{userId}/trafficSources/{date_source}`

Traffic source breakdown:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | "{date}_{source}" (e.g., "2025-11-15_organic") |
| `date` | string | YYYY-MM-DD |
| `source` | string | "organic", "direct", "social", "referral", "email", "paid", "other" |
| `sessions` | number | Sessions from this source |
| `users` | number | Users from this source |
| `newUsers` | number | New users from this source |
| `percentage` | number | Percentage of total sessions |
| `syncedAt` | timestamp | When this data was synced |

---

## Required Firestore Indexes

Create these indexes for optimal query performance:

```
Collection: googleAnalytics/{userId}/metrics
- date ASC, syncedAt DESC

Collection: googleAnalytics/{userId}/trafficSources
- date ASC, source ASC
- date ASC, sessions DESC
```

To create indexes:

1. Go to Firebase Console → Firestore Database → **Indexes** tab
2. Click **Add Index**
3. Configure as shown above
4. Or wait for Firebase to suggest indexes when you run queries

---

## Troubleshooting

### Error: "GA4 service account credentials not configured"

**Solution**: Ensure you've set the `GA4_SERVICE_ACCOUNT` secret in Step 6.

Verify:
```bash
firebase functions:secrets:access GA4_SERVICE_ACCOUNT
```

### Error: "User does not have sufficient permissions"

**Solution**:
1. Verify service account email in GA4 Property Access Management (Step 4)
2. Ensure role is "Viewer" or higher
3. Wait 5-10 minutes for permissions to propagate

### Error: "Property ID not found"

**Solution**:
1. Double-check your GA4 Property ID (Step 5)
2. Ensure it's numeric only (no "p" prefix)
3. Verify you have access to this property in Google Analytics

### No data appearing in charts

**Possible causes**:
1. Check if sync was successful (look for green "Synced!" message)
2. Verify Firestore has data in `googleAnalytics/{userId}/metrics`
3. Check selected date range matches available data
4. Look for errors in browser console (F12)

### Scheduled sync not running

**Solution**:
1. Verify Cloud Scheduler is enabled in Google Cloud Console
2. Check function deployment:
   ```bash
   firebase functions:list | grep scheduledGoogleAnalyticsSync
   ```
3. Review Cloud Scheduler logs in Google Cloud Console

---

## Cost Considerations

### Google Analytics Data API
- **Free tier**: 25,000 API requests per day per project
- Our sync uses approximately 2-3 requests per sync
- Daily sync for 100 users = ~300 requests/day
- **Well within free tier limits**

### Firestore
- **Storage**: ~1KB per metric document
- 30 days × 2 documents (metrics + sources) = 60KB per user
- **Reads**: Real-time subscriptions + manual queries
- **Writes**: 2-4 writes per day per user (automated sync)

### Cloud Functions
- **Invocations**: 1 scheduled + manual syncs
- **Compute time**: ~2-5 seconds per sync
- **Free tier**: 2 million invocations/month, 400,000 GB-seconds
- **Well within free tier for typical usage**

---

## Security Best Practices

1. **Never commit service account JSON** to version control
   - Add to `.gitignore`: `*-service-account.json`

2. **Use Firebase Functions secrets** for storing credentials
   - Avoid environment variables in code

3. **Grant minimum necessary permissions**
   - Service account only needs "Viewer" role in GA4

4. **Rotate service account keys** periodically (every 90 days)

5. **Monitor API usage** in Google Cloud Console
   - Set up billing alerts

6. **Review Firestore security rules**
   - Ensure only authenticated users can read their own analytics data:
   ```javascript
   match /googleAnalytics/{userId} {
     allow read, write: if request.auth != null && request.auth.uid == userId;
     match /metrics/{document=**} {
       allow read: if request.auth != null && request.auth.uid == userId;
     }
     match /trafficSources/{document=**} {
       allow read: if request.auth != null && request.auth.uid == userId;
     }
   }
   ```

---

## Maintenance

### Updating GA4 Property ID

To change the GA4 property being tracked:

1. Update Firestore document:
   ```
   Collection: googleAnalytics/{userId}
   Update field: propertyId = "new-property-id"
   ```

2. Grant service account access to new property (Step 4)

3. Trigger manual sync to populate new data

### Disabling Sync

To temporarily disable automated sync:

1. Update Firestore document:
   ```
   Collection: googleAnalytics/{userId}
   Update field: enabled = false
   ```

2. Scheduled sync will skip this user

3. Re-enable by setting `enabled = true`

---

## Support

For issues or questions:
1. Check Firebase Functions logs: `firebase functions:log`
2. Review browser console for frontend errors
3. Verify Firestore data structure matches schema
4. Ensure GA4 property has data for the selected date range

---

## Next Steps

After successful setup:
- Monitor daily sync logs for any errors
- Set up alerts for failed syncs
- Consider adding more metrics (conversions, goals, custom dimensions)
- Implement user-facing configuration UI in Settings page
- Add export functionality for analytics reports

---

**Setup complete!** 🎉

Your Google Analytics data will now automatically sync to Firestore daily and display in beautiful charts on your Outbound Analytics page.
