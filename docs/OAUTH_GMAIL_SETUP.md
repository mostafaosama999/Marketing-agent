# Gmail OAuth 2.0 Setup Guide
## For: mostafaainews@gmail.com

This guide shows you how to set up Gmail OAuth 2.0 authentication for the Inbound Generation feature.

---

## Overview

- **Your Gmail**: `mostafaainews@gmail.com`
- **Google Cloud Project**: `mostafa@codecontent.net`
- **Auth Method**: OAuth 2.0 (One-time setup)
- **Redirect URI**: `http://localhost:3000/auth/gmail/callback`

---

## Step 1: Enable Gmail API (2 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (under `mostafa@codecontent.net`)
3. Navigate to **APIs & Services** > **Library**
4. Search for "Gmail API"
5. Click **Enable**

---

## Step 2: Create OAuth 2.0 Credentials (3 minutes)

1. In Google Cloud Console, go to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. If prompted, configure the OAuth consent screen first:
   - User Type: **External** (for personal Gmail)
   - App name: `Marketing Agent`
   - User support email: `mostafaainews@gmail.com`
   - Developer contact: `mostafaainews@gmail.com`
   - Click **Save and Continue**
   - Scopes: Click **Add or Remove Scopes** > Add `https://www.googleapis.com/auth/gmail.readonly`
   - Test users: Add `mostafaainews@gmail.com`
   - Click **Save and Continue**

4. Back to **Create OAuth client ID**:
   - Application type: **Web application**
   - Name: `Gmail Newsletter Sync`
   - Authorized redirect URIs:
     - Click **+ ADD URI**
     - Enter: `http://localhost:3000/auth/gmail/callback`
     - Click **CREATE**

5. You'll see your **Client ID** and **Client secret**
   - Click **DOWNLOAD JSON** or copy both values
   - Keep this safe!

**Example values** (yours will be different):
```
Client ID: 123456789-abcdefghijklmnop.apps.googleusercontent.com
Client secret: GOCSPX-AbCdEfGh1234567890
```

---

## Step 3: Configure Firebase Functions (2 minutes)

Open your terminal and run:

```bash
# Navigate to project
cd /Users/mostafa.osama2/Desktop/projects/Marketing-agent

# Set OAuth client ID
firebase functions:config:set gmail.client_id="YOUR_CLIENT_ID_HERE"

# Set OAuth client secret
firebase functions:config:set gmail.client_secret="YOUR_CLIENT_SECRET_HERE"

# Set your Gmail email (for reference)
firebase functions:config:set gmail.inbox_email="mostafaainews@gmail.com"

# Verify configuration
firebase functions:config:get
```

**Expected output:**
```json
{
  "gmail": {
    "client_id": "123456789-abcdefghijklmnop.apps.googleusercontent.com",
    "client_secret": "GOCSPX-AbCdEfGh1234567890",
    "inbox_email": "mostafaainews@gmail.com"
  }
}
```

---

## Step 4: Deploy Cloud Functions (2 minutes)

```bash
# Deploy all Gmail functions
firebase deploy --only functions:scheduledEmailSync,functions:manualEmailSync,functions:getGmailAuthUrl,functions:exchangeGmailOAuthCode,functions:checkGmailConnectionStatus

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

Wait for deployment to complete (~1-2 minutes).

---

## Step 5: Connect Gmail (One-Time, 1 minute)

1. Start the frontend:
   ```bash
   cd agency-app
   npm start
   ```

2. Open http://localhost:3000/inbound-generation

3. You'll see a **red banner** saying "Gmail Not Connected"

4. Click the **"Connect Gmail"** button

5. You'll be redirected to Google's OAuth consent screen:
   - Sign in as `mostafaainews@gmail.com` (if not already)
   - You may see a warning "Google hasn't verified this app"
     - Click **Advanced** > **Go to Marketing Agent (unsafe)**
     - This is safe - it's your own app!
   - Review permissions (Read-only Gmail access)
   - Click **Allow**

6. You'll be redirected back to the app automatically

7. You should see: **"Success! Gmail is now connected!"**

8. The banner will disappear and you can now sync emails

---

## Step 6: Test Email Sync (1 minute)

1. Click the purple **"Sync Now"** FAB button (bottom-right)

2. Wait a few seconds

3. Your emails should appear in the table!

4. Check Firestore to verify:
   - Firebase Console > Firestore Database
   - Look for `newsletters/emails/items/` collection
   - Should see your emails stored there

---

## How OAuth Works

### First-Time Setup:
1. User clicks "Connect Gmail" →
2. Redirected to Google OAuth consent screen →
3. User grants permission →
4. Google redirects back with authorization code →
5. App exchanges code for **refresh token** →
6. Refresh token saved to Firestore (`gmailTokens/admin`)

### Automated Syncing:
1. Scheduled function (every 3 days) or manual sync triggered →
2. App uses refresh token to get **access token** →
3. Access token used to call Gmail API →
4. Emails fetched and stored in Firestore →
5. Access tokens auto-refresh when expired (Google handles this)

### Security:
✅ **Refresh tokens never expire** (unless you revoke access)
✅ **Access tokens auto-refresh** (no user interaction needed)
✅ **Read-only access** (app cannot send/delete emails)
✅ **Tokens stored securely** in Firestore (not in code)

---

## Troubleshooting

### Error: "Redirect URI mismatch"

**Solution**:
- Go to Google Cloud Console > Credentials
- Edit your OAuth client
- Make sure redirect URI is exactly: `http://localhost:3000/auth/gmail/callback`
- No trailing slash!

### Error: "Access blocked: This app's request is invalid"

**Solution**:
- Check that Gmail API is enabled
- Verify OAuth consent screen is configured
- Make sure `mostafaainews@gmail.com` is added as a test user

### "Gmail Not Connected" banner keeps showing

**Solution**:
1. Check Cloud Functions logs: `firebase functions:log`
2. Verify tokens in Firestore: `gmailTokens/admin` document exists
3. Try disconnecting and reconnecting:
   - Delete `gmailTokens/admin` document in Firestore
   - Refresh page and click "Connect Gmail" again

### No emails syncing

**Solution**:
- Make sure you have emails in your inbox from the last 3 days
- Check Cloud Functions logs for errors
- Try manual sync first before relying on scheduled sync
- Verify OAuth token is working: check Firestore for recent `accessToken`

---

## Production Deployment (Future)

For production, you'll need to:

1. **Update Redirect URI** in Google Cloud Console:
   - Add: `https://yourapp.com/auth/gmail/callback`
   - Keep localhost URI for development

2. **Update OAuth Service** (`functions/src/gmail/oauthService.ts`):
   - Change `REDIRECT_URI` to use environment variable
   - Support both localhost and production URLs

3. **Publish OAuth Consent Screen**:
   - Currently in "Testing" mode (max 100 users)
   - For public use, submit for Google verification

---

## Revoke Access

If you need to disconnect Gmail:

1. Delete refresh token from Firestore:
   ```
   gmailTokens/admin (delete this document)
   ```

2. Revoke app access at Google:
   - Go to https://myaccount.google.com/permissions
   - Find "Marketing Agent"
   - Click **Remove Access**

3. Refresh the Inbound Generation page
   - Banner will reappear
   - Click "Connect Gmail" to reconnect

---

## Cost

**Free Forever** (within limits):
- Gmail API: Free (1 billion quota units/day)
- Cloud Functions: Free tier (2M invocations/month)
- Firestore: Free tier (50k reads + 20k writes/day)

**Estimated usage**:
- Manual sync: ~10/month
- Scheduled sync: ~10/month
- Token refresh: ~30/month
- **Total**: ~50 invocations/month = **$0**

---

## Quick Reference

```bash
# Check Firebase config
firebase functions:config:get

# View function logs
firebase functions:log --only getGmailAuthUrl,exchangeGmailOAuthCode

# Re-deploy functions
firebase deploy --only functions

# Check Firestore tokens
# Firebase Console > Firestore > gmailTokens > admin

# Test locally
cd agency-app && npm start
# Navigate to: http://localhost:3000/inbound-generation
```

---

## File Changes Summary

### Backend (Cloud Functions):
```
functions/src/gmail/
  ├── oauthService.ts               (NEW - OAuth token management)
  ├── generateAuthUrl.ts            (NEW - Get OAuth URL)
  ├── exchangeOAuthCode.ts          (NEW - Exchange code for tokens)
  ├── checkGmailConnection.ts       (NEW - Check connection status)
  ├── gmailService.ts               (UPDATED - Now uses OAuth2)
  ├── scheduledEmailSync.ts         (UPDATED - Uses OAuth2)
  └── manualEmailSync.ts            (UPDATED - Uses OAuth2)
```

### Frontend (React):
```
agency-app/src/
  ├── pages/auth/GmailCallback.tsx          (NEW - OAuth callback handler)
  ├── components/inbound/GmailConnectionBanner.tsx  (NEW - Connection UI)
  ├── pages/analytics/InboundGeneration.tsx (UPDATED - Added banner)
  ├── services/api/gmailService.ts          (UPDATED - OAuth methods)
  └── App.tsx                               (UPDATED - Added route)
```

### Firestore Schema:
```
gmailTokens/
  └── admin/
      ├── refreshToken: string
      ├── accessToken: string
      ├── expiresAt: Timestamp
      ├── email: string
      └── createdAt: Timestamp
```

---

## Next Steps

1. ✅ Complete Step 1-5 above (~10 minutes total)
2. ✅ Connect Gmail via UI
3. ✅ Test manual sync
4. ✅ Verify emails in Firestore
5. 🚀 **Phase 2**: Add AI-powered LinkedIn post generation

---

**Setup completed**: Ready to sync!
**Status**: ✅ OAuth 2.0 configured
**Total time**: ~10 minutes
