# Apollo.io API Integration Setup

This document explains how to configure the Apollo.io API integration for the Marketing Agent application.

## Overview

The Apollo.io integration uses **Firebase Cloud Functions** to proxy API requests, which:
- ✅ Solves CORS issues in production
- ✅ Keeps API keys secure on the server (not exposed in client code)
- ✅ Provides centralized error handling and rate limiting
- ✅ Works consistently across all environments (localhost, staging, production)

## Architecture

```
Client (Browser)
    ↓
Firebase Cloud Function (fetchEmailCloud)
    ↓
Apollo.io API (https://api.apollo.io/api/v1/people/match)
```

## Setup Instructions

### 1. Get Your Apollo.io API Key

1. Sign up for an Apollo.io account at https://apollo.io
2. Navigate to **Settings** → **API Keys**
3. Create a new API key or copy your existing key
4. Save this key securely (you'll need it for the next step)

### 2. Configure Firebase Functions

You need to store your Apollo API key in Firebase Functions configuration (not in client-side environment variables).

#### Option A: Using Firebase CLI (Recommended)

```bash
# Navigate to the project root
cd /Users/mostafa.osama2/Desktop/projects/Marketing-agent

# Set the Apollo API key in Firebase config
firebase functions:config:set apollo.api_key="YOUR_APOLLO_API_KEY_HERE"

# Verify the config was set correctly
firebase functions:config:get

# You should see:
# {
#   "apollo": {
#     "api_key": "YOUR_APOLLO_API_KEY_HERE"
#   }
# }
```

#### Option B: Using Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Functions** → **Configuration**
4. Click **Add Variable**
5. Set `apollo.api_key` to your Apollo API key

### 3. Deploy the Cloud Function

After configuring the API key, deploy the functions:

```bash
# Deploy only the functions (faster)
firebase deploy --only functions

# Or deploy everything (functions + hosting)
firebase deploy
```

### 4. Verify the Deployment

After deployment, you should see:

```
✔  functions[fetchEmailCloud(us-central1)] Successful create operation.
Function URL (fetchEmailCloud): https://us-central1-YOUR-PROJECT.cloudfunctions.net/fetchEmailCloud
```

### 5. Test the Integration

1. Open your deployed app: `https://marketing-app-2v32k.ondigitalocean.app`
2. Navigate to **CRM** → Click on a lead or create a new one
3. In the lead dialog, fill in:
   - **Name**: e.g., "John Doe"
   - **Company**: e.g., "Acme Inc"
4. Click **"Get email from Apollo.io (costs 1 credit)"**
5. You should see the email populated if found

### 6. Monitor Usage and Logs

#### View Function Logs

```bash
# View live logs
firebase functions:log --only fetchEmailCloud

# Or view in Firebase Console:
# Functions → fetchEmailCloud → Logs tab
```

#### Check Apollo.io Credits

1. Go to [Apollo.io Dashboard](https://app.apollo.io)
2. Navigate to **Settings** → **Credits**
3. Monitor your credit usage

## Troubleshooting

### Error: "Apollo API key not configured"

**Solution**: The API key is not set in Firebase config. Run:
```bash
firebase functions:config:set apollo.api_key="YOUR_KEY"
firebase deploy --only functions
```

### Error: "Invalid Apollo API key"

**Solution**: The API key is incorrect or expired. Verify your key:
1. Check your Apollo.io dashboard for the correct key
2. Update the Firebase config with the correct key
3. Redeploy

### Error: "Rate limit exceeded"

**Solution**: You've hit Apollo.io's rate limit. Wait or upgrade your Apollo plan.

### CORS Error Still Appearing

**Solution**: Make sure you deployed the functions after setting the config:
```bash
firebase deploy --only functions
```

Clear browser cache and try again.

### Function Not Found Error

**Solution**: The Cloud Function wasn't deployed. Run:
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

## Local Development

For local development, you can still use the Cloud Function approach:

### Option 1: Use Emulators (Recommended)

```bash
# Start Firebase emulators
firebase emulators:start

# Set local config
firebase functions:config:set apollo.api_key="YOUR_KEY" --project=default

# Your app will connect to local functions at http://localhost:5001
```

### Option 2: Connect to Production Functions

The client code automatically connects to production Cloud Functions, even when running locally. Just make sure the production function is deployed with the API key configured.

## Cost Management

### Apollo.io Credit Costs

- **People Match API** (fetchEmail): **1 credit per successful match**
- Credits are only consumed when a match is found
- No credits used if no match is found

### Firebase Functions Costs

Firebase Cloud Functions has a generous free tier:
- **2M invocations/month** (free)
- **400,000 GB-seconds** of compute time (free)
- **200,000 CPU-seconds** of compute time (free)

The `fetchEmailCloud` function is very lightweight and should stay within free tier limits for most use cases.

## Security Notes

🔒 **API Key Security**:
- ✅ API key is stored in Firebase Functions config (server-side)
- ✅ Never exposed in client-side code or environment variables
- ✅ Not included in version control
- ✅ Only accessible to Cloud Functions with proper permissions

🔐 **Function Security**:
- The Cloud Function is callable from authenticated clients only
- Consider adding additional auth checks if needed
- Monitor function logs for suspicious activity

## Files Modified

### Cloud Function
- `functions/src/apollo/apolloProxy.ts` - Main Cloud Function
- `functions/src/index.ts` - Exports the function

### Client Code
- `agency-app/src/services/api/apolloService.ts` - Calls Cloud Function instead of direct API
- `agency-app/src/components/features/crm/LeadDialog.tsx` - Removed API key parameter

## Support

For issues:
1. Check Firebase Functions logs: `firebase functions:log`
2. Check browser console for client-side errors
3. Verify Apollo.io dashboard for credit usage and API key status
4. Check [Apollo.io API Documentation](https://apolloio.github.io/apollo-api-docs)

## Related Documentation

- [Firebase Functions Config Documentation](https://firebase.google.com/docs/functions/config-env)
- [Apollo.io API Documentation](https://apolloio.github.io/apollo-api-docs)
- [Firebase Functions Pricing](https://firebase.google.com/pricing)
