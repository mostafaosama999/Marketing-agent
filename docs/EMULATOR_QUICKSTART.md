# Firebase Emulator Quick Start

## TL;DR

Want to test without touching production? Follow these 3 steps:

### 1. Enable Emulator Mode
Edit `agency-app/.env`:
```env
REACT_APP_USE_EMULATOR=true
```

### 2. Start Emulators (Terminal 1)
```bash
firebase emulators:start
```

### 3. Start Your App (Terminal 2)
```bash
cd agency-app
npm start
```

**That's it!** Your app now uses a local test database instead of production.

---

## What Gets Emulated?

✅ **Firestore** (localhost:8081) - Local database
✅ **Auth** (localhost:9099) - Local authentication
✅ **Functions** (localhost:5001) - Local cloud functions
✅ **UI** (localhost:4001) - Web interface to manage everything

---

## How to Verify It's Working

Open your browser console when the app starts. You should see:

```
✅ Firestore connected to emulator (localhost:8081)
✅ Auth connected to emulator (localhost:9099)
✅ Functions connected to emulator (localhost:5001)
🎯 All Firebase services connected to local emulators
```

Also visit the Emulator UI: http://localhost:4001

---

## Creating Test Users

### Option 1: Use Emulator UI
1. Go to http://localhost:4001/auth
2. Click "Add user"
3. Enter email/password

### Option 2: Sign Up in Your App
Just use your app's normal sign-up flow!

---

## Adding Test Data

### Option 1: Use Your App
Just use your app normally - create leads, companies, etc.

### Option 2: Use Emulator UI
1. Go to http://localhost:4001/firestore
2. Click "Start collection"
3. Add documents manually

---

## Switching Back to Production

Edit `agency-app/.env`:
```env
REACT_APP_USE_EMULATOR=false
```

Then restart your app. No need to stop emulators.

---

## Common Issues

### "Can't connect to emulators"
- Make sure emulators are running: `firebase emulators:start`
- Check `REACT_APP_USE_EMULATOR=true` in `.env`
- Restart your React app after changing `.env`

### "Ports already in use"
Kill existing processes:
```bash
lsof -ti:8081,9099,5001,4001 | xargs kill -9
```

### "My data disappeared"
Emulator data is temporary by default. To persist:
```bash
firebase emulators:start --export-on-exit=./emulator-data
```

---

## Want More Details?

See the full guide: [EMULATOR_SETUP.md](./EMULATOR_SETUP.md)
