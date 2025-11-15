# Google Analytics Setup Scripts

I've created setup scripts to automatically configure your Google Analytics integration in Firestore.

## 📋 Your Configuration

- **User ID**: `3nJ7C0mLdITkPBpdtnxKrNWMruJ2`
- **GA4 Property ID**: `512779722`
- **Website URL**: `https://yourwebsite.com` (⚠️ UPDATE THIS)

---

## 🚀 Quick Setup (Recommended)

### Option 1: Node.js Script (Simplest)

```bash
cd /Users/mostafa.osama2/Desktop/projects/Marketing-agent

# Update the websiteUrl in the script first!
# Edit setup-google-analytics.js and change 'https://yourwebsite.com' to your actual URL

node setup-google-analytics.js
```

**Requirements**: Firebase Admin SDK (already installed in functions/)

---

### Option 2: Shell Script

```bash
cd /Users/mostafa.osama2/Desktop/projects/Marketing-agent

# Update the WEBSITE_URL in the script first!
# Edit setup-ga-config.sh and change the URL on line 11

./setup-ga-config.sh
```

---

### Option 3: TypeScript Script (from functions directory)

```bash
cd /Users/mostafa.osama2/Desktop/projects/Marketing-agent/functions

# Update the websiteUrl in the script first!
# Edit scripts/setupGoogleAnalyticsConfig.ts and change the URL on line 23

npm run build
node lib/scripts/setupGoogleAnalyticsConfig.js
```

---

## 📝 What the Script Does

1. Creates a document in Firestore at: `googleAnalytics/3nJ7C0mLdITkPBpdtnxKrNWMruJ2`
2. Sets your GA4 Property ID: `512779722`
3. Configures automatic daily sync at 2 AM UTC
4. Enables the integration

---

## ⚠️ Before Running

**Update your website URL** in whichever script you choose to use:

```javascript
websiteUrl: 'https://yourwebsite.com'  // ← Change this!
```

Replace `https://yourwebsite.com` with your actual website (e.g., `https://codecontent.net`)

---

## ✅ After Running the Script

1. **Verify in Firestore**:
   - Go to [Firestore Console](https://console.firebase.google.com/project/marketing-app-cc237/firestore)
   - Navigate to `googleAnalytics` → `3nJ7C0mLdITkPBpdtnxKrNWMruJ2`
   - You should see all the configuration fields

2. **Test in Your App**:
   - Open your CRM app
   - Go to **Analytics** → **Outbound Analytics** (or `/analytics/outbound`)
   - Scroll to the **Website Analytics** section
   - Click **"Sync Now"** button
   - Wait 10-30 seconds
   - You should see your GA4 data populate the charts! 🎉

---

## 🔍 Troubleshooting

### "Error: Permission denied"
**Solution**: Make sure you're logged into Firebase CLI:
```bash
firebase login
```

### "Error: Could not load the default credentials"
**Solution**: Set your project:
```bash
firebase use marketing-app-cc237
```

### Script runs but no data appears in app
**Solution**:
1. Check Firestore to confirm the document was created
2. Verify the Property ID is correct in Google Analytics
3. Make sure the service account has access to the GA4 property
4. Check browser console for errors (F12)

---

## 🎯 What Happens Next

Once the configuration is set up:

- ✅ **Automated Sync**: Runs daily at 2 AM UTC
- ✅ **Manual Sync**: Click "Sync Now" in the app anytime
- ✅ **Real-time Updates**: Charts update instantly
- ✅ **Trend Analysis**: See % change indicators

---

## 📚 Files Created

- `setup-google-analytics.js` - Simple Node.js script (recommended)
- `setup-ga-config.sh` - Shell script with Firebase CLI
- `functions/scripts/setupGoogleAnalyticsConfig.ts` - TypeScript version
- `functions/scripts/setupGoogleAnalytics.js` - Alternative Node.js version

---

**Ready to go!** Just update the website URL and run one of the scripts. Your Google Analytics integration will be live in seconds! 🚀
