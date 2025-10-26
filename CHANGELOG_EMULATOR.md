# Emulator Setup - Changelog

## What Changed

The Firebase configuration has been updated to support **full emulator mode**, allowing you to test with local Firestore, Auth, and Functions instead of production.

## Files Modified

### 1. `agency-app/src/services/firebase/firestore.ts`
- Added imports for `connectFirestoreEmulator` and `connectAuthEmulator`
- Updated connection logic to check `REACT_APP_USE_EMULATOR` environment variable
- When enabled, connects to local emulators instead of production
- Added try-catch blocks to prevent duplicate connection errors
- Added console logging to show which mode is active

### 2. `agency-app/src/services/firebase/auth.ts`
- Same changes as firestore.ts (these files are duplicates)

### 3. `agency-app/.env`
- Added `REACT_APP_USE_EMULATOR=false` environment variable
- Set to `false` by default (production mode)
- Change to `true` to enable emulator mode

### 4. `agency-app/src/index.tsx`
- Added startup console banner showing current mode (Emulator vs Production)
- Displays helpful information about emulator ports and UI
- Warns when connected to production

### 5. `.gitignore`
- Removed `.firebaserc` from ignore list (needed for project configuration)
- Already includes emulator data directories

## New Files Added

### 1. `README.md`
- Main project README with quick start guide
- Explains both production and emulator modes
- Links to detailed documentation

### 2. `EMULATOR_QUICKSTART.md`
- Quick 3-step guide to get started with emulators
- Minimal instructions for developers who just want to test locally

### 3. `EMULATOR_SETUP.md`
- Comprehensive emulator documentation
- Covers all emulator features, workflows, and troubleshooting
- Includes best practices and advanced usage

## How It Works

### Before (Old Behavior)
```
App always connects to:
✅ Production Firestore
✅ Production Auth
✅ Production Functions (unless emulator running)
```

### After (New Behavior)

**With `REACT_APP_USE_EMULATOR=false` (default):**
```
App connects to:
✅ Production Firestore
✅ Production Auth
✅ Production Functions
```

**With `REACT_APP_USE_EMULATOR=true`:**
```
App connects to:
✅ Local Firestore (localhost:8081)
✅ Local Auth (localhost:9099)
✅ Local Functions (localhost:5001)
```

## Migration Path

### For Existing Developers

**No action required!** The default behavior is unchanged:
- `.env` has `REACT_APP_USE_EMULATOR=false` by default
- App still connects to production by default
- Everything works exactly as before

### To Start Using Emulators

1. Edit `agency-app/.env`:
   ```env
   REACT_APP_USE_EMULATOR=true
   ```

2. Start emulators:
   ```bash
   firebase emulators:start
   ```

3. Start your app:
   ```bash
   cd agency-app
   npm start
   ```

4. Check console for confirmation:
   ```
   🧪 EMULATOR MODE
   Using Firebase Emulators - Safe to test!
   ```

## Benefits

### Safety
- Test without risk of affecting production data
- Can't accidentally delete real leads or companies
- Safe to experiment with new features

### Speed
- No network latency to Firebase servers
- Faster development iterations
- Instant database resets

### Cost
- No API costs during development
- No Firestore read/write costs
- No function execution costs

### Flexibility
- Create test scenarios easily
- Test edge cases without cleanup
- Multiple developers can have isolated test environments

## Testing Scenarios

### 1. New Feature Development
Use emulators to build and test new features before touching production.

### 2. Bug Reproduction
Create specific data states to reproduce bugs without affecting production.

### 3. Integration Testing
Test entire workflows end-to-end in isolated environment.

### 4. Performance Testing
Load test with large datasets without production impact.

## Verification Checklist

After pulling these changes:

- [ ] Verify `.env` has `REACT_APP_USE_EMULATOR=false` (default)
- [ ] Confirm app still connects to production (check console on startup)
- [ ] Optionally try emulator mode (set to `true` and start emulators)
- [ ] Check console shows correct mode banner
- [ ] Verify emulator UI accessible at http://localhost:4001

## Rollback Plan

If issues occur, simply ensure `REACT_APP_USE_EMULATOR=false` in `.env`. The app will behave exactly as before.

## Questions?

See detailed documentation:
- Quick start: [EMULATOR_QUICKSTART.md](./EMULATOR_QUICKSTART.md)
- Full guide: [EMULATOR_SETUP.md](./EMULATOR_SETUP.md)
