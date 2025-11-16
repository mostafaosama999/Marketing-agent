# Gmail Integration - Quick Start Guide

## 🚀 5-Minute Setup (For Google Workspace)

### Step 1: Enable Gmail API (2 min)
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. **APIs & Services** > **Library** > Search "Gmail API" > **Enable**

### Step 2: Create Service Account (2 min)
1. **IAM & Admin** > **Service Accounts** > **Create Service Account**
2. Name: `gmail-newsletter-reader`
3. Skip roles, click **Done**
4. Click the service account > **Keys** > **Add Key** > **Create new key** (JSON)
5. **Download and save the JSON file securely**

### Step 3: Configure Domain-Wide Delegation (1 min)
1. Copy the **Client ID** from the service account
2. Go to [Google Workspace Admin Console](https://admin.google.com)
3. **Security** > **API Controls** > **Manage Domain Wide Delegation**
4. Click **Add new**:
   - Client ID: `<paste from service account>`
   - OAuth Scopes: `https://www.googleapis.com/auth/gmail.readonly`
5. Click **Authorize**

### Step 4: Configure Firebase (3 min)

**Method 1: Using the JSON file directly**
```bash
# Navigate to your project
cd /Users/mostafa.osama2/Desktop/projects/Marketing-agent

# Set credentials (replace path with your JSON file)
SERVICE_ACCOUNT_JSON=$(cat /path/to/your-service-account-key.json)
firebase functions:config:set gmail.credentials="$SERVICE_ACCOUNT_JSON"

# Set inbox email
firebase functions:config:set gmail.inbox_email="newsletters@yourcompany.com"

# Verify config
firebase functions:config:get
```

**Method 2: Manual (if Method 1 doesn't work)**
```bash
# Copy the entire JSON content
cat /path/to/your-service-account-key.json

# Set it manually (paste JSON as one line)
firebase functions:config:set gmail.credentials='{"type":"service_account",...}'
firebase functions:config:set gmail.inbox_email="newsletters@yourcompany.com"
```

### Step 5: Deploy (2 min)
```bash
# Deploy Gmail functions
firebase deploy --only functions:scheduledEmailSync,functions:manualEmailSync

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

### Step 6: Test (1 min)
```bash
# Start frontend
cd agency-app
npm start

# 1. Open http://localhost:3000/inbound-generation
# 2. Click the purple "Sync Now" button (bottom-right)
# 3. Check for emails in the table
```

---

## ✅ Verification Checklist

After setup, verify:

- [ ] Gmail API enabled in Google Cloud Console
- [ ] Service account created with JSON key downloaded
- [ ] Domain-wide delegation configured (Client ID + scope)
- [ ] Service account has access to shared inbox
- [ ] Firebase config set correctly:
  ```bash
  firebase functions:config:get gmail.credentials  # Should return JSON
  firebase functions:config:get gmail.inbox_email  # Should return email
  ```
- [ ] Functions deployed successfully (check Firebase Console)
- [ ] Firestore rules deployed
- [ ] Manual sync works in UI
- [ ] Emails appear in Firestore: `newsletters/emails/items/`

---

## 🔍 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| "Gmail credentials not configured" | Run `firebase functions:config:set gmail.credentials='...'` |
| "User authentication failed" | Check domain-wide delegation in Workspace Admin Console |
| "Insufficient Permission" | Grant service account access to Gmail inbox |
| No emails fetched | Ensure inbox has emails from last 3 days |
| Functions won't deploy | Run `npm install` in `functions/` directory |
| UI shows errors | Check browser console and Firebase logs |

**View logs:**
```bash
firebase functions:log --only scheduledEmailSync,manualEmailSync
```

---

## 📊 Expected Results

After successful setup:

1. **Firestore Database**:
   ```
   newsletters/
     ├── emails/items/
     │   ├── <message-id-1>/
     │   ├── <message-id-2>/
     │   └── ...
     └── metadata/
         └── (sync status)
   ```

2. **UI (Inbound Generation Page)**:
   - Sync status card (last sync time, email counts)
   - Table with emails (subject, from, date, status)
   - Click rows to expand and see full content
   - Purple "Sync Now" FAB button

3. **Scheduled Sync**:
   - Automatically runs every 3 days (72 hours)
   - Check Firebase Console > Functions > Logs

---

## 🎯 One-Command Deploy (After Config)

```bash
# From project root
firebase deploy --only functions:scheduledEmailSync,functions:manualEmailSync,firestore:rules
```

---

## 📚 Full Documentation

For detailed explanations, see:
- **`GMAIL_SETUP.md`** - Comprehensive setup guide
- **`GMAIL_INTEGRATION_SUMMARY.md`** - Technical implementation details

---

## 🆘 Need Help?

1. Check logs: `firebase functions:log`
2. Review `GMAIL_SETUP.md` troubleshooting section
3. Verify all steps in the checklist above
4. Check Firestore for data: Firebase Console > Firestore Database

---

**Total Setup Time**: ~15 minutes (first time)
**Cost**: $0/month (free tier)
**Sync Frequency**: Every 3 days (automatic) + manual on-demand
