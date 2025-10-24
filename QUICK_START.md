# Quick Start - Functions Emulator

## TL;DR

```bash
# Terminal 1 - Start Functions Emulator
cd agency-app
npm run emulators

# Terminal 2 - Start App with Local Functions
npm run start:emulator
```

Now you can:
- ✅ Login with production accounts (Auth → Production)
- ✅ Access production data (Firestore → Production)
- ✅ Test functions locally (Functions → Local Emulator)

## What Changed?

- **Functions**: Run locally on `localhost:5001`
- **Auth**: Production (you can login normally)
- **Firestore**: Production (real data)

## Environment Setup

Copy `.env.local.example` to `.env.local` and set:
```bash
REACT_APP_USE_EMULATOR=true
```

## When to Use Each Mode

**Development Mode** (`npm run start:emulator`):
- Testing function changes locally
- Debugging function code
- Iterating quickly without deploying

**Production Mode** (`npm start`):
- Testing the full production stack
- Final testing before release
- When you want functions to run in production environment

## See Also

- Full documentation: [EMULATOR_SETUP.md](./EMULATOR_SETUP.md)
- Firebase Console: https://console.firebase.google.com/project/marketing-app-cc237
