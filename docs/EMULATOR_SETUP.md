# Firebase Emulator Setup

This project can be configured to use Firebase Emulators for local development and testing. You can choose between:

1. **Full Emulator Mode**: Auth, Firestore, and Functions all local (isolated testing)
2. **Functions-Only Mode**: Only Functions emulated, Auth & Firestore use production (realistic testing)

## Full Emulator Mode (Recommended for Testing)

Use this mode when you want to test without affecting production data at all.

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Logged in to Firebase: `firebase login`

## Emulator Ports

- **Firestore**: `localhost:8081`
- **Auth**: `localhost:9099`
- **Functions**: `localhost:5001`
- **Emulator UI**: `localhost:4001` (web interface)

## Quick Start - Full Emulator Mode

### 1. Enable Emulator Mode

Edit `agency-app/.env`:

```env
REACT_APP_USE_EMULATOR=true
```

### 2. Start All Emulators

From the project root:

```bash
firebase emulators:start
```

### 3. Start the React App

In a new terminal:

```bash
cd agency-app
npm start
```

### 4. Access the Emulator UI

Open your browser to: http://localhost:4001

Here you can:
- View and edit Firestore documents
- Create test users in Auth
- Monitor function calls and logs
- See all emulator activity

## Creating Test Data

### Option 1: Use the Emulator UI
1. Open http://localhost:4001/firestore
2. Click "Start collection"
3. Add documents manually
4. Create test users at http://localhost:4001/auth

### Option 2: Import Production Data (for testing)
```bash
# Export from production (requires permissions)
firebase firestore:export ./firestore-export

# Start emulators with imported data
firebase emulators:start --import=./firestore-export
```

### Option 3: Use Your App
Just use the app normally - all data is created locally!

## Persisting Emulator Data

By default, emulator data is cleared when stopped. To persist:

```bash
# Export current emulator data
firebase emulators:export ./emulator-data

# Start with previously exported data
firebase emulators:start --import=./emulator-data --export-on-exit=./emulator-data
```

Add to `.gitignore`:
```
emulator-data/
firestore-export/
```

## Switching Modes

### Use Full Emulator Mode (Local Testing)
```env
# agency-app/.env
REACT_APP_USE_EMULATOR=true
```
Start emulators: `firebase emulators:start`

### Use Production Mode
```env
# agency-app/.env
REACT_APP_USE_EMULATOR=false
```
No need to start emulators

**Important**: Always restart your React dev server after changing this setting!

## Development Workflows

### Workflow 1: Isolated Testing (Full Emulator Mode)
Best for: Testing new features without risk to production

1. Set `REACT_APP_USE_EMULATOR=true` in `.env`
2. Terminal 1: `firebase emulators:start`
3. Terminal 2: `cd agency-app && npm start`
4. All data is local - production is completely untouched
5. Great for experimenting, testing edge cases, debugging

### Workflow 2: Production Mode
Best for: Testing with real data, final verification before deployment

1. Set `REACT_APP_USE_EMULATOR=false` in `.env`
2. Terminal: `cd agency-app && npm start`
3. Everything connects to production Firebase
4. Use with caution - changes affect real data!

## Important Notes

### Emulator Data is Temporary
- By default, emulator data is cleared when you stop the emulators
- Use `--export-on-exit` flag to persist data between sessions
- Emulator data is NOT backed up - it's for testing only

### Security Rules Still Apply
- Firestore security rules are enforced in emulators
- You can test security rule changes locally
- Make sure rules allow necessary operations for testing

### Functions Behavior
- Functions run locally and can be modified without redeploying
- Changes to function code require restarting the emulator
- In emulator mode, functions read/write to emulated Firestore (safe!)
- External API calls (Apollo, OpenAI) still reach real services

## Troubleshooting

### "Port already in use" errors
```bash
# Find and kill processes using emulator ports
lsof -ti:8081 | xargs kill -9  # Firestore
lsof -ti:9099 | xargs kill -9  # Auth
lsof -ti:5001 | xargs kill -9  # Functions
lsof -ti:4001 | xargs kill -9  # Emulator UI
```

### Emulators won't start
- Kill any existing Firebase processes: `pkill -f firebase`
- Check if ports are available
- Ensure functions are built: `cd functions && npm run build`

### App still connects to production
- Ensure `REACT_APP_USE_EMULATOR=true` is set in `.env`
- Check browser console for emulator connection messages:
  - "✅ Firestore connected to emulator"
  - "✅ Auth connected to emulator"
  - "✅ Functions connected to emulator"
- Restart the React app after changing environment variables
- Hard refresh browser (Cmd+Shift+R on Mac, Ctrl+Shift+R on Windows)

### Can't login to emulated Auth
- Create a test user via Emulator UI: http://localhost:4001/auth
- Or use the sign-up flow in your app
- Remember: Emulated users are separate from production users

### Functions not working
- Ensure functions are built: `cd functions && npm run build`
- Check Functions emulator logs in terminal
- View detailed logs in Emulator UI at http://localhost:4001
- Verify function name matches what you're calling from the app

### Data disappeared
- Emulator data is temporary by default
- Use `--export-on-exit` to persist data
- Check if you accidentally switched back to production mode

## Testing with Emulators

### Manual Testing
1. Start emulators with UI: `firebase emulators:start`
2. Use your app normally
3. View data/logs in Emulator UI: http://localhost:4001

### Automated Testing
```bash
# Start emulators, run tests, then stop
firebase emulators:exec "cd agency-app && npm test"
```

### CI/CD Testing
```bash
# In your CI pipeline
firebase emulators:exec --only firestore,auth,functions "npm test"
```

## Best Practices

1. **Always use emulators for development**: Prevents accidentally modifying production data
2. **Create seed data**: Export a "clean slate" with test data for consistent testing
3. **Test edge cases**: Use emulators to create unusual scenarios safely
4. **Separate environments**: Never run production traffic through emulators
5. **Version control**: Add emulator data folders to `.gitignore`
6. **Document test scenarios**: Keep track of different data states for testing

## Additional Resources

- [Firebase Emulator Suite Documentation](https://firebase.google.com/docs/emulator-suite)
- [Firestore Emulator Guide](https://firebase.google.com/docs/emulator-suite/connect_firestore)
- [Auth Emulator Guide](https://firebase.google.com/docs/emulator-suite/connect_auth)
- [Functions Emulator Guide](https://firebase.google.com/docs/emulator-suite/connect_functions)
- [Connect your app to the Emulators](https://firebase.google.com/docs/emulator-suite/connect_and_prototype)

## Quick Reference Card

### Start Emulators
```bash
firebase emulators:start                    # Basic start
firebase emulators:start --import=./data    # With existing data
firebase emulators:start --export-on-exit=./data  # Auto-save on exit
```

### Environment Variable
```env
REACT_APP_USE_EMULATOR=true   # Use emulators
REACT_APP_USE_EMULATOR=false  # Use production
```

### Emulator URLs
- **UI**: http://localhost:4001
- **Firestore**: http://localhost:4001/firestore
- **Auth**: http://localhost:4001/auth
- **Functions**: http://localhost:4001/functions
- **Logs**: http://localhost:4001/logs

### Console Messages (to verify connection)
When emulators are connected, you should see:
```
✅ Firestore connected to emulator (localhost:8081)
✅ Auth connected to emulator (localhost:9099)
✅ Functions connected to emulator (localhost:5001)
🎯 All Firebase services connected to local emulators
```

When using production:
```
🌐 Using production Firebase services
```
