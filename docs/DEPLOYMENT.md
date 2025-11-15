# Deployment Checklist

Quick reference for deploying the Marketing Agent application.

## 🚀 Initial Deployment

### 1. Configure Apollo.io API Key

```bash
# Set Apollo API key in Firebase Functions config
firebase functions:config:set apollo.api_key="YOUR_APOLLO_API_KEY"

# Verify it was set
firebase functions:config:get
```

### 2. Build and Deploy

```bash
# Build the frontend
cd agency-app
npm run build
cd ..

# Deploy everything (functions + hosting)
firebase deploy

# Or deploy separately:
firebase deploy --only functions
firebase deploy --only hosting
```

### 3. Verify Deployment

- ✅ Check Firebase Console for deployed functions
- ✅ Open deployed URL and test Apollo email fetch
- ✅ Check Firebase Functions logs for any errors

## 🔄 Updating After Changes

### Frontend Changes Only

```bash
cd agency-app
npm run build
cd ..
firebase deploy --only hosting
```

### Backend/Functions Changes Only

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### Both Frontend and Backend

```bash
# Build frontend
cd agency-app
npm run build
cd ..

# Build functions
cd functions
npm run build
cd ..

# Deploy everything
firebase deploy
```

## 🐛 Troubleshooting

### Apollo CORS Error in Production

**Problem**: `Access to XMLHttpRequest has been blocked by CORS policy`

**Solution**:
1. Verify Cloud Function is deployed: `firebase functions:list`
2. Check API key is configured: `firebase functions:config:get`
3. Redeploy if needed: `firebase deploy --only functions`

### Function Not Found

**Problem**: `Error: Function fetchEmailCloud not found`

**Solution**:
```bash
cd functions
npm install
npm run build
cd ..
firebase deploy --only functions
```

### Environment Variables Not Working

**Problem**: `REACT_APP_APOLLO_API_KEY` not working in production

**This is expected!** The API key should be in Firebase config, not env vars:
```bash
firebase functions:config:set apollo.api_key="YOUR_KEY"
```

## 📊 Monitoring

### View Function Logs

```bash
# Real-time logs
firebase functions:log

# Specific function
firebase functions:log --only fetchEmailCloud

# Or use Firebase Console:
# https://console.firebase.google.com → Functions → fetchEmailCloud → Logs
```

### Check Deployment Status

```bash
# List all deployed functions
firebase functions:list

# Check hosting status
firebase hosting:sites:list
```

## 🔐 Security Checklist

Before deploying:
- [ ] Apollo API key is in Firebase config (not in code)
- [ ] No sensitive data in environment variables
- [ ] Firestore security rules are configured
- [ ] Authentication is properly set up

## 💰 Cost Monitoring

### Apollo.io Credits
- Check usage: https://app.apollo.io → Settings → Credits
- 1 credit per email fetch (only on successful match)

### Firebase Costs
- View usage: https://console.firebase.google.com → Usage
- Free tier limits:
  - 2M function invocations/month
  - 400K GB-seconds compute time
  - 10 GB hosting storage

## 📚 Additional Resources

- [Apollo Setup Guide](./APOLLO_SETUP.md) - Detailed Apollo configuration
- [Firebase Functions Docs](https://firebase.google.com/docs/functions)
- [Firebase Hosting Docs](https://firebase.google.com/docs/hosting)
