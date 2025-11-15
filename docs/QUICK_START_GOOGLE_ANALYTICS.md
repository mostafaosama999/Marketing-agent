# Google Analytics Integration - Quick Start Guide

## 🚀 Get Started in 5 Steps (15 minutes)

### Prerequisites
- ✅ Google Analytics 4 (GA4) property set up
- ✅ Google Cloud Console access
- ✅ Firebase project with billing enabled
- ✅ Firebase CLI installed (`npm install -g firebase-tools`)

---

## Step 1: Enable API (2 min)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. **APIs & Services** → **Library**
4. Search "Google Analytics Data API"
5. Click **Enable**

---

## Step 2: Create Service Account (3 min)

1. **IAM & Admin** → **Service Accounts**
2. Click **+ CREATE SERVICE ACCOUNT**
3. Name: `ga4-analytics-sync`
4. Click **CREATE AND CONTINUE**
5. Skip role assignment → Click **DONE**
6. Click on the new service account
7. **KEYS** tab → **ADD KEY** → **Create new key**
8. Select **JSON** → Click **CREATE**
9. Save the downloaded JSON file (keep it secure!)

---

## Step 3: Grant GA4 Access (2 min)

1. Go to [Google Analytics](https://analytics.google.com/)
2. **Admin** (gear icon) → **Property Access Management**
3. Click **+ Add users**
4. Enter service account email:
   ```
   ga4-analytics-sync@YOUR-PROJECT.iam.gserviceaccount.com
   ```
5. Role: **Viewer**
6. Uncheck "Notify new users"
7. Click **Add**

---

## Step 4: Get Property ID (1 min)

1. In Google Analytics: **Admin** → **Property Settings**
2. Copy your **Property ID** (e.g., `123456789`)

---

## Step 5: Deploy to Firebase (7 min)

### A. Set Service Account Secret

```bash
cd /path/to/Marketing-agent/functions
firebase functions:secrets:set GA4_SERVICE_ACCOUNT
```

When prompted, paste the entire contents of your service account JSON file, then press **Enter** and **Ctrl+D** (Mac: Cmd+D).

### B. Deploy Cloud Functions

```bash
npm run build
firebase deploy --only functions:syncGoogleAnalytics,functions:scheduledGoogleAnalyticsSync
```

Wait for deployment to complete (~2-3 minutes).

### C. Configure in Firestore

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. **Firestore Database** → **Start collection**
3. Collection ID: `googleAnalytics`
4. Document ID: Your Firebase user ID (get from Authentication tab)
5. Add fields:

| Field | Type | Value |
|-------|------|-------|
| `propertyId` | string | `123456789` (from Step 4) |
| `websiteUrl` | string | `https://yourwebsite.com` |
| `enabled` | boolean | `true` |
| `syncInterval` | string | `daily` |
| `createdAt` | timestamp | (click "Set to current time") |
| `createdBy` | string | Your user ID |

6. Click **Save**

---

## ✅ Test Your Integration

1. Log into your CRM app
2. Navigate to **Analytics** (top menu) → **Outbound Analytics**
3. Scroll down to **Website Analytics** section
4. Click **Sync Now** button
5. Wait 10-30 seconds
6. You should see:
   - ✅ "Synced!" success message
   - 📊 Metric cards with data (Users, Sessions, Pageviews, Duration)
   - 📈 Traffic Over Time chart
   - 📊 Traffic Sources bar chart

---

## 🔧 Troubleshooting

### "GA4 service account credentials not configured"
**Fix**: Check that you set the secret correctly in Step 5A
```bash
firebase functions:secrets:access GA4_SERVICE_ACCOUNT
```

### "User does not have sufficient permissions"
**Fix**: Verify service account has "Viewer" access in GA4 (Step 3)
Wait 5-10 minutes for permissions to propagate

### No data in charts
**Fix**:
- Check if your GA4 property has data for the selected date range
- Verify Property ID is correct (numeric only, no "p" prefix)
- Check browser console (F12) for errors
- Look at Firestore: `googleAnalytics/{userId}/metrics` should have documents

### Sync button doesn't work
**Fix**:
- Ensure you're authenticated (logged in)
- Check Cloud Functions logs:
  ```bash
  firebase functions:log --only syncGoogleAnalytics
  ```

---

## 📚 Full Documentation

For detailed information, see:
- **GOOGLE_ANALYTICS_SETUP.md** - Complete 10-step setup guide with troubleshooting
- **GOOGLE_ANALYTICS_IMPLEMENTATION_SUMMARY.md** - Features and technical details
- **GOOGLE_ANALYTICS_ARCHITECTURE.md** - System architecture and data flow

---

## 🎉 You're Done!

Your Google Analytics data will now:
- ✅ Sync automatically every day at 2 AM UTC
- ✅ Display real-time charts and metrics in your CRM
- ✅ Show trend indicators (up/down arrows with percentages)
- ✅ Update instantly when you click "Sync Now"

### Next Steps (Optional)
- Add more users by creating their `googleAnalytics/{userId}` documents
- Set up Firestore security rules to restrict access
- Monitor Cloud Functions logs for any issues
- Consider adding email alerts for sync failures

---

**Questions?** Check the troubleshooting section in GOOGLE_ANALYTICS_SETUP.md or review Cloud Functions logs.
