# Personal Gmail Setup Guide
## For: mostafaainews@gmail.com

This guide is specifically for setting up the Gmail integration using your personal Gmail account with IMAP and App Password.

---

## Step 1: Enable IMAP in Gmail (1 minute)

1. Go to https://gmail.com and log in as **mostafaainews@gmail.com**
2. Click the gear icon ⚙️ (top right) > **See all settings**
3. Go to the **Forwarding and POP/IMAP** tab
4. In the "IMAP access" section, select **Enable IMAP**
5. Click **Save Changes** at the bottom

---

## Step 2: Enable 2-Step Verification (Required for App Passwords)

1. Go to https://myaccount.google.com/security
2. Look for **"2-Step Verification"**
3. If it's OFF:
   - Click on it
   - Follow the setup wizard (use your phone number)
   - Complete the 2-step verification setup

**Note**: You MUST have 2-step verification enabled to create app passwords.

---

## Step 3: Generate Gmail App Password (2 minutes)

1. Go to https://myaccount.google.com/apppasswords
   - If you see "2-Step Verification is not set up", go back to Step 2
2. Sign in if prompted
3. Under "Select app", choose **Mail**
4. Under "Select device", choose **Other (Custom name)**
5. Type: `Marketing Agent Newsletter Sync`
6. Click **Generate**
7. You'll see a 16-character password like: `abcd efgh ijkl mnop`

**IMPORTANT: Copy this password immediately - you won't be able to see it again!**

Example: `abcdefghijklmnop` (remove spaces when saving)

---

## Step 4: Configure Firebase Functions (3 minutes)

Open your terminal and run these commands:

```bash
# Navigate to your project
cd /Users/mostafa.osama2/Desktop/projects/Marketing-agent

# Set your Gmail email
firebase functions:config:set gmail.inbox_email="mostafaainews@gmail.com"

# Set your App Password (remove spaces!)
# Replace the password below with YOUR actual app password from Step 3
firebase functions:config:set gmail.app_password="abcdefghijklmnop"

# Verify the configuration
firebase functions:config:get
```

**Expected output:**
```json
{
  "gmail": {
    "inbox_email": "mostafaainews@gmail.com",
    "app_password": "abcdefghijklmnop"
  }
}
```

---

## Step 5: Deploy Cloud Functions (2 minutes)

```bash
# Make sure you're in the project directory
cd /Users/mostafa.osama2/Desktop/projects/Marketing-agent

# Deploy the Gmail functions
firebase deploy --only functions:scheduledEmailSync,functions:manualEmailSync

# Deploy Firestore rules
firebase deploy --only firestore:rules
```

**Wait for deployment to complete** (usually 1-2 minutes)

---

## Step 6: Test the Integration (1 minute)

### Option A: Test from UI

1. Start the frontend:
   ```bash
   cd agency-app
   npm start
   ```

2. Open http://localhost:3000/inbound-generation

3. Click the purple **"Sync Now"** button (bottom-right FAB)

4. Watch the table populate with your emails!

### Option B: Test from Command Line

```bash
# Trigger the manual sync function
firebase functions:shell

# In the shell, run:
manualEmailSync()

# Or test with Firebase CLI
firebase functions:call manualEmailSync
```

---

## Step 7: Verify Firestore Data

1. Go to https://console.firebase.google.com
2. Select your project (under mostafa@codecontent.net)
3. Go to **Firestore Database**
4. Check for the `newsletters` collection:
   ```
   newsletters/
     ├── emails/items/
     │   └── (your emails here)
     └── metadata/
         └── (sync status)
   ```

---

## Troubleshooting

### Error: "Username and password not accepted"

**Solution**:
- Make sure you copied the app password correctly (no spaces)
- Verify 2-step verification is enabled
- Generate a new app password if needed

### Error: "IMAP connection failed"

**Solution**:
- Check that IMAP is enabled in Gmail settings
- Verify your email is correct: `mostafaainews@gmail.com`
- Check your internet connection

### No emails showing up

**Solution**:
- Make sure you have emails in your inbox from the last 3 days
- Check Cloud Functions logs: `firebase functions:log`
- Verify Firestore rules are deployed: `firebase firestore:rules get`

### App Password not working

**Solution**:
1. Revoke the old app password: https://myaccount.google.com/apppasswords
2. Generate a new one
3. Update Firebase config: `firebase functions:config:set gmail.app_password="new-password"`
4. Re-deploy: `firebase deploy --only functions`

---

## Security Notes

✅ **App Passwords are Secure**: They're designed for this exact use case
✅ **Scoped Access**: App passwords can only access Gmail, not your full Google account
✅ **Revocable**: You can revoke app passwords anytime at https://myaccount.google.com/apppasswords
✅ **No 2FA Prompts**: App passwords bypass 2FA, which is why they work for automated access

**Best Practices**:
1. Never share your app password with anyone
2. Don't commit app passwords to git repositories
3. Rotate app passwords every 90 days
4. Revoke unused app passwords immediately

---

## What Happens Next?

### Automatic Syncing:
- **Scheduled Sync**: Runs every 3 days (72 hours) automatically
- **Manual Sync**: You can trigger anytime from the UI

### Email Storage:
- Emails are stored in Firestore `newsletters/emails/items/`
- Deduplication prevents duplicates (based on message ID)
- Last 100 emails from past 3 days are fetched

### Cost:
- **IMAP**: Free (unlimited)
- **Cloud Functions**: Free tier (2M invocations/month)
- **Firestore**: Free tier (50k reads + 20k writes/day)
- **Total**: $0/month

---

## Quick Reference Commands

```bash
# Check Firebase config
firebase functions:config:get

# View function logs
firebase functions:log

# Re-deploy functions
firebase deploy --only functions:scheduledEmailSync,functions:manualEmailSync

# Test locally (emulator)
firebase emulators:start

# Update app password
firebase functions:config:set gmail.app_password="new-password"
firebase deploy --only functions
```

---

## Next Steps After Setup

1. ✅ Verify emails are syncing
2. ✅ Check Firestore for email data
3. ✅ Monitor Cloud Functions logs
4. 🚀 **Phase 2**: Add AI-powered LinkedIn post generation
5. 🚀 **Phase 3**: Add email filtering and management

---

## Support

**Your Configuration:**
- Gmail: `mostafaainews@gmail.com`
- Google Cloud Project: `mostafa@codecontent.net`
- Auth Method: IMAP + App Password
- Sync Frequency: Every 3 days (automatic)

**Need Help?**
1. Check this guide's troubleshooting section
2. Review Cloud Functions logs: `firebase functions:log`
3. Check the main documentation: `GMAIL_INTEGRATION_SUMMARY.md`

---

**Setup Time**: ~10 minutes
**Last Updated**: November 2025
