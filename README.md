# Marketing Agent - CRM Pipeline System

A comprehensive CRM system for managing leads, companies, and marketing campaigns with Firebase backend.

## Quick Start

### Development Mode (Production Database)

```bash
cd agency-app
npm install
npm start
```

### Testing Mode (Local Emulators)

**Recommended for development to avoid affecting production data!**

1. Enable emulator mode in `agency-app/.env`:
   ```env
   REACT_APP_USE_EMULATOR=true
   ```

2. Start Firebase emulators (Terminal 1):
   ```bash
   firebase emulators:start
   ```

3. Start the app (Terminal 2):
   ```bash
   cd agency-app
   npm start
   ```

See [EMULATOR_QUICKSTART.md](./EMULATOR_QUICKSTART.md) for more details.

## Environment Setup

Copy the `.env` file in `agency-app/` and configure:

```env
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id

# Apollo.io API (for lead enrichment)
REACT_APP_APOLLO_API_KEY=your-apollo-key

# Emulator mode (true = local testing, false = production)
REACT_APP_USE_EMULATOR=false
```

## Project Structure

```
Marketing-agent/
├── agency-app/          # React frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/       # Page components
│   │   ├── services/    # API and Firebase services
│   │   └── types/       # TypeScript type definitions
├── functions/           # Firebase Cloud Functions
│   └── src/
└── firebase.json        # Firebase configuration
```

## Features

### Lead Management
- 6-stage pipeline (New Lead → Qualified → Contacted → Follow up → Won/Lost)
- Drag-and-drop board view
- Advanced filtering and search
- CSV import with field mapping
- Bulk operations (edit, delete, archive)
- Apollo.io enrichment integration

### Company Management
- Company profiles with custom fields
- Blog analysis and qualification
- Writing program detection
- Apollo.io company enrichment
- Technology stack tracking

### Analytics
- Pipeline conversion metrics
- Lead source tracking
- Performance dashboards
- Cost tracking (API usage)

### User Management
- Role-based access control (Writer, Marketing Analyst, Manager, CEO)
- User preferences and settings
- Activity tracking

## Development

### Available Scripts

From `agency-app/` directory:

- `npm start` - Start development server (uses .env config)
- `npm test` - Run tests
- `npm run build` - Build for production
- `npm run serve` - Serve production build locally

### Firebase Emulators

**Why use emulators?**
- Test without affecting production data
- Faster development iterations
- Create test scenarios safely
- No API costs during development

See detailed guides:
- [EMULATOR_QUICKSTART.md](./EMULATOR_QUICKSTART.md) - Quick setup guide
- [EMULATOR_SETUP.md](./EMULATOR_SETUP.md) - Complete documentation

### Cloud Functions

Functions are in the `functions/` directory:

```bash
cd functions
npm install
npm run build    # Build TypeScript
npm run serve    # Run locally
npm run deploy   # Deploy to Firebase
```

## Deployment

### Deploy Frontend

```bash
cd agency-app
npm run build
firebase deploy --only hosting
```

### Deploy Functions

```bash
cd functions
npm run build
firebase deploy --only functions
```

### Deploy Everything

```bash
firebase deploy
```

## Documentation

- [CLAUDE.md](./CLAUDE.md) - Complete system documentation
- [EMULATOR_QUICKSTART.md](./EMULATOR_QUICKSTART.md) - Emulator quick start
- [EMULATOR_SETUP.md](./EMULATOR_SETUP.md) - Detailed emulator guide

## Tech Stack

- **Frontend**: React 19, TypeScript, Material-UI
- **Backend**: Firebase (Firestore, Auth, Functions, Hosting)
- **Cloud Functions**: Node.js 20, TypeScript
- **External APIs**: Apollo.io, OpenAI
- **Build Tools**: Create React App, Firebase CLI

## License

Proprietary - All rights reserved
