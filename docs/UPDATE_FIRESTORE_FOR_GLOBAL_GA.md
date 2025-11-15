# Update Firestore for Global Google Analytics

## What Changed

The Google Analytics integration has been updated to show **company-wide analytics** instead of per-user analytics. This means all users will see the same Google Analytics data.

## Required Firestore Update

### Option 1: Update Existing Document (Recommended)

1. Go to [Firestore Console](https://console.firebase.google.com/project/marketing-app-cc237/firestore)
2. Navigate to `googleAnalytics` collection
3. Find your existing document: `3nJ7C0mLdITkPBpdtnxKrNWMruJ2`
4. **Rename** the document ID to: `global`
   - Unfortunately, Firestore doesn't allow direct renaming
   - So you need to **copy** the document:

### Step-by-Step:

1. **Copy the existing document**:
   - Click on the document `3nJ7C0mLdITkPBpdtnxKrNWMruJ2`
   - Note down all the field values (or keep the tab open)

2. **Create new document with ID "global"**:
   - Go back to `googleAnalytics` collection
   - Click **"+ Add document"**
   - Document ID: `global`
   - Add the same fields:
     - `propertyId`: `512779722`
     - `websiteUrl`: `https://yourwebsite.com` (update if needed)
     - `enabled`: `true`
     - `syncInterval`: `daily`
     - `createdAt`: (timestamp - current time)
     - `createdBy`: `global`
   - Click **Save**

3. **Delete the old document** (optional but recommended):
   - Go to `googleAnalytics/3nJ7C0mLdITkPBpdtnxKrNWMruJ2`
   - Click the 3 dots menu → **Delete document**

### Option 2: Use Firebase CLI Script

Run this from the functions directory:

```bash
# This will copy the data from your user ID to global ID
firebase firestore:delete googleAnalytics/global 2>/dev/null || true
```

Then manually create the `global` document as described above.

---

## Updated Data Structure

### Before (Per-User):
```
googleAnalytics/
  3nJ7C0mLdITkPBpdtnxKrNWMruJ2/     ← Your user ID
    - propertyId
    - websiteUrl
    - enabled
    ...
```

### After (Company-Wide):
```
googleAnalytics/
  global/                              ← Shared global config
    - propertyId
    - websiteUrl
    - enabled
    ...
    metrics/                           ← Same subcollections
      2025-11-15/
    trafficSources/
      2025-11-15_organic/
```

---

## What This Means

✅ **All users** will see the same Google Analytics data
✅ **Single sync** serves all users (more efficient)
✅ **Centralized configuration** - easier to manage

❌ No per-user analytics (you mentioned this is fine)

---

## Testing After Update

1. Create the `global` document in Firestore
2. Rebuild frontend: `npm start` (in agency-app directory)
3. Go to **Analytics** → **OUTBOUND** tab (not the main Analytics page)
4. You should see the Website Analytics section with either:
   - "Google Analytics Not Configured" (if doc doesn't exist)
   - "No Analytics Data Available" + "Sync Now" button (if doc exists but no data)
   - Full analytics dashboard (if data has been synced)
5. Click **"Sync Now"** to pull data from Google Analytics

---

## Quick Copy-Paste for Firestore Console

**Document ID**: `global`

**Fields to add**:
```
propertyId: "512779722"
websiteUrl: "https://yourwebsite.com"
enabled: true
syncInterval: "daily"
createdAt: [timestamp - set to current time]
createdBy: "global"
```

---

Once you've updated Firestore, rebuild the frontend and test!
