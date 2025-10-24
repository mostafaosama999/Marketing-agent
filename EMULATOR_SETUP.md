# Firebase Emulator Setup - Functions Only

This project is configured to use Firebase Emulators for **Cloud Functions only** during local development. Auth and Firestore remain connected to production, allowing you to:
- Login with real production accounts
- Access real production data
- Test Cloud Functions locally before deploying

## Prerequisites

- Firebase CLI installed: `npm install -g firebase-tools`
- Logged in to Firebase: `firebase login`

## Configuration

Only the Functions emulator is used:
- **Functions**: `localhost:5001`
- **Emulator UI**: `localhost:4000` (optional, for monitoring)
- **Auth**: Production Firebase (real authentication)
- **Firestore**: Production Firebase (real database)

## Quick Start

### 1. Start the Functions Emulator

From the agency-app directory:

```bash
cd agency-app
npm run emulators
```

This will start only the Functions emulator on port 5001.

### 2. Start the React App with Emulator Mode

In a new terminal, from the `agency-app` directory:

```bash
npm run start:emulator
```

This will start the React app and connect it to the local emulators.

### 3. Access the Emulator UI (Optional)

Open your browser to: http://localhost:4000

Here you can:
- Monitor function calls
- View function logs
- Test function invocations

**Note**: Firestore and Auth data will show production data, not emulated data.

## Environment Variables

Create a `.env.local` file in the `agency-app` directory (copy from `.env.local.example`):

```bash
# Set to 'true' to use emulators
REACT_APP_USE_EMULATOR=true

# Your Firebase API key
REACT_APP_FIREBASE_API_KEY=your-api-key-here
```

## Scripts

### From `agency-app` directory:

- `npm run emulators` - Start Functions emulator only
- `npm run emulators:ui` - Start Functions emulator with UI
- `npm start` - Start React app in full production mode
- `npm run start:emulator` - Start React app with local Functions (Auth & Firestore still production)

## Development Workflow

### Option 1: Local Functions Testing (Recommended for Development)
1. Terminal 1: Start Functions emulator: `npm run emulators`
2. Terminal 2: Start app with local functions: `npm run start:emulator`
3. Login works with real accounts
4. Data reads/writes to production Firestore
5. Functions execute locally (changes visible immediately without deploying)

### Option 2: Full Production Mode
1. `npm start`
2. Everything connects to production Firebase (including Functions)

## Important Notes

### Data Persistence
Since only Functions are emulated, there is no emulator data to persist. All Firestore and Auth data is in production.

### Testing Functions
- Functions run locally and can be modified without redeploying
- Changes to function code require restarting the emulator
- Functions can read/write to production Firestore
- Be careful: Function side effects (writes, emails, etc.) affect production data!

## Troubleshooting

### Emulator won't start
- Check if port 5001 is already in use: `lsof -i :5001`
- Kill any existing Firebase processes: `pkill -f firebase`
- Ensure functions are built: `cd functions && npm run build`

### App still connects to production functions
- Ensure `REACT_APP_USE_EMULATOR=true` is set in `.env.local`
- Check browser console for "🔧 Connecting Functions to local emulator..." message
- Restart the React app after changing environment variables

### Can't login
- This means Auth is correctly connecting to production (intended behavior)
- Verify your credentials are correct in production Firebase
- Check Firebase Console for authentication issues

### Functions not working
- Ensure functions are built: `cd ../functions && npm run build`
- Check Functions emulator logs in terminal or Emulator UI at http://localhost:4000
- Verify function name matches what you're calling from the app

## Security Rules

Since Firestore is connected to production, production security rules apply. Be mindful of this when testing.

## Testing

You can use the Functions emulator for automated testing:

```bash
# Start emulator in background for tests
firebase emulators:exec --only functions "npm test"
```

## Why Functions-Only?

This setup provides the best of both worlds:
- **Real User Authentication**: Test with actual user accounts and permissions
- **Real Data**: See actual production data for realistic testing
- **Local Functions**: Iterate quickly on function code without deploying
- **Safety**: Functions can be tested and debugged before pushing to production

## Additional Resources

- [Firebase Emulator Suite Documentation](https://firebase.google.com/docs/emulator-suite)
- [Connect your app to the Emulators](https://firebase.google.com/docs/emulator-suite/connect_and_prototype)
