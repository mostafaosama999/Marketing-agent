# Marketing Agent

> Intelligent B2B SaaS Marketing Automation & CRM Platform

A comprehensive marketing automation platform that combines CRM functionality with AI-powered company research, blog qualification, content idea generation, and writing program discovery to streamline B2B SaaS marketing workflows.

---

## Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Features

### ✅ Production-Ready Features

#### CRM System
- **Lead Management**: Full CRUD operations with customizable fields
- **Company Management**: Automated company creation and cascading deletion
- **Pipeline Views**: Kanban board and sortable table views
- **Custom Fields**: 10 field types (text, textarea, number, select, radio, checkbox, date, URL, email, phone)
- **Bulk Operations**: Multi-select, bulk edit, bulk delete
- **Advanced Filtering**: Multi-field filters with saved presets
- **CSV Import/Export**: Field mapping, type detection, duplicate prevention
- **Drag & Drop**: Reorder leads and move between pipeline stages

#### AI-Powered Research
- **Blog Qualification**: Automated blog analysis with 230+ RSS patterns, author detection, and content scoring
- **Company Research**: 7-step automated research flow with Google Docs output
- **Custom Idea Generator**: User-defined prompts generating 5-10 structured content ideas with status workflow
- **Writing Program Finder**: Discover guest author and community writing programs with AI fallback

#### Integrations
- **Apollo.io**: Lead enrichment with email, phone, and LinkedIn data
- **OpenAI GPT-4**: AI-powered analysis and content generation with cost tracking
- **Webflow**: Automated content publishing with LinkedIn post generation
- **Slack**: Marketing report notifications
- **Google Services**: Docs and Sheets integration

#### Cost Management
- **API Cost Tracking**: Real-time OpenAI usage tracking per lead and user
- **Budget Monitoring**: Comprehensive cost analytics and reporting

### 🧪 Beta Features
- Apollo Title Presets (localStorage-based)
- Enhanced Webflow sync pipeline

### ⚠️ Placeholder Features
- Analytics Dashboard
- Ideas Page
- Pipeline Editor
- Tasks Management
- Settings Page

---

## Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **UI Library**: Material-UI v7
- **Build Tool**: CRACO (Create React App wrapper)
- **State Management**: React Context API
- **Drag & Drop**: @dnd-kit
- **Deployment**: DigitalOcean App Platform

### Backend
- **Runtime**: Node.js 20
- **Framework**: Firebase Cloud Functions
- **Database**: Cloud Firestore (NoSQL)
- **Authentication**: Firebase Authentication
- **AI**: OpenAI GPT-4 / GPT-4 Turbo
- **Web Scraping**: Cheerio + Axios

### Key Dependencies
- firebase v12.3.0
- openai v4.38.2
- @mui/material v7.3.2
- @dnd-kit v6.3.1
- papaparse v5.5.3
- rss-parser v3.13.0

---

## Quick Start

### Prerequisites

- Node.js 18.x or 20.x
- npm 9.x or later
- Firebase CLI: `npm install -g firebase-tools`
- Firebase account with Blaze plan
- OpenAI API key
- Apollo.io API key (optional)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Marketing-agent
   ```

2. **Install dependencies**
   ```bash
   # Frontend
   cd frontend
   npm install

   # Backend
   cd ../functions
   npm install
   ```

3. **Configure Firebase**
   ```bash
   firebase login
   firebase use marketing-app-cc237
   ```

4. **Set up environment variables**

   **Frontend** (`frontend/.env.local`):
   ```bash
   REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
   REACT_APP_APOLLO_API_KEY=your_apollo_api_key
   REACT_APP_USE_FUNCTIONS_EMULATOR=true  # For local dev
   ```

   **Backend** (`functions/.runtimeconfig.json`):
   ```json
   {
     "openai": {
       "key": "sk-proj-your-openai-key"
     }
   }
   ```

5. **Run locally**

   **Terminal 1 - Functions Emulator:**
   ```bash
   cd functions
   npm run serve
   ```

   **Terminal 2 - Frontend:**
   ```bash
   cd frontend
   npm start
   ```

6. **Access the application**
   - Frontend: http://localhost:3000
   - Functions Emulator: http://localhost:5001

### First-Time Setup

#### Create a User Account

1. **Enable Email/Password Authentication**
   - Firebase Console → Authentication → Sign-in method
   - Enable "Email/Password" provider

2. **Create User in Firebase Auth**
   - Firebase Console → Authentication → Users
   - Add user with email and password
   - **Copy the UID**

3. **Create User Profile in Firestore**
   - Firebase Console → Firestore Database
   - Create document at: `users/{paste-uid-here}`
   - Add fields:
     ```json
     {
       "email": "user@domain.com",
       "displayName": "Full Name",
       "role": "Manager",
       "department": "Marketing"
     }
     ```

**⚠️ Important**: The user document ID must exactly match the Firebase Authentication UID.

---

## Project Structure

```
Marketing-agent/
├── frontend/                    # React application
│   ├── src/
│   │   ├── app/                # App-wide config & providers
│   │   ├── components/         # Shared components
│   │   ├── contexts/           # React contexts
│   │   ├── features/           # Feature modules
│   │   │   ├── crm/           # CRM lead management (25 components)
│   │   │   ├── companies/     # Company research (3 components)
│   │   │   ├── analytics/     # Analytics dashboard (placeholder)
│   │   │   ├── ideas/         # Content ideas (placeholder)
│   │   │   ├── pipeline/      # Pipeline management (placeholder)
│   │   │   └── tasks/         # Task management (placeholder)
│   │   ├── pages/             # Top-level pages
│   │   ├── services/          # API & Firebase services (12 services)
│   │   └── utils/             # Helper functions
│   ├── public/                # Static assets
│   └── package.json
│
├── functions/                  # Firebase Cloud Functions
│   ├── src/
│   │   ├── blogQualifier/     # Blog qualification logic
│   │   ├── ideaGenerator/     # Custom idea generation (NEW!)
│   │   ├── writingProgramFinder/ # Writing program discovery
│   │   ├── research/          # Research orchestrator
│   │   ├── reports/           # Report generation
│   │   ├── webflow/           # Webflow integration
│   │   ├── utils/             # Shared utilities (19 modules)
│   │   └── index.ts           # Function exports (10 functions)
│   └── package.json
│
├── firebase.json              # Firebase configuration
├── firestore.rules            # Security rules
├── firestore.indexes.json     # Database indexes
├── README.md                  # This file
├── DOCUMENTATION.md           # Complete user & API documentation
└── CLAUDE.md                  # Technical implementation guide
```

---

## Documentation

### Complete Documentation Files

1. **[DOCUMENTATION.md](./DOCUMENTATION.md)** - Comprehensive user guide and API reference
   - Project overview and features
   - Database schema
   - User guide (CRM, imports, research)
   - API & Cloud Functions reference
   - Development setup
   - Deployment guide
   - Troubleshooting

2. **[CLAUDE.md](./CLAUDE.md)** - Technical implementation guide
   - Architecture details
   - Authentication system
   - Companies and leads relationship
   - Custom fields implementation
   - CSV import/export internals
   - Drag and drop implementation
   - Common errors and solutions

### Quick Links

- [Database Schema](./DOCUMENTATION.md#database-schema)
- [API Functions](./DOCUMENTATION.md#api--cloud-functions)
- [User Guide](./DOCUMENTATION.md#user-guide)
- [Troubleshooting](./DOCUMENTATION.md#troubleshooting)
- [Roadmap](./DOCUMENTATION.md#roadmap--future-features)

---

## Deployment

### Frontend (DigitalOcean App Platform)

**Configuration:**
- Source Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `build`
- Build Resources: **Professional (4GB RAM)**

**Environment Variables:**
```bash
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=marketing-app-cc237.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=marketing-app-cc237
REACT_APP_FIREBASE_STORAGE_BUCKET=marketing-app-cc237.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=967626109033
REACT_APP_FIREBASE_APP_ID=1:967626109033:web:9eab40f10ec512f1bc72f8
```

**Deploy:**
- Push to `main` branch → Auto-deploys

### Backend (Firebase Functions)

**Set OpenAI API Key:**
```bash
firebase functions:config:set openai.key="sk-proj-..."
```

**Deploy Functions:**
```bash
# Deploy all
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:qualifyCompanyBlog
```

**Deploy Database Rules:**
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## Useful Commands

```bash
# Frontend Development
cd frontend
npm start                    # Development server (http://localhost:3000)
npm run build               # Production build
npm test                    # Run tests

# Backend Development
cd functions
npm run serve               # Start emulator (http://localhost:5001)
npm run build               # Compile TypeScript
npm run deploy              # Deploy to Firebase

# Firebase
firebase login
firebase projects:list
firebase use marketing-app-cc237
firebase deploy --only functions
firebase functions:log

# Git
git status
git add .
git commit -m "message"
git push origin main
```

---

## Contributing

### Adding New Features

When contributing:

1. **Update Types**: Add TypeScript interfaces in `app/types/` directories
2. **Update Documentation**: Update DOCUMENTATION.md and CLAUDE.md
3. **Add Tests**: Create test/example files in `functions/src/examples/`
4. **Security Rules**: Update `firestore.rules` for new collections
5. **Indexes**: Update `firestore.indexes.json` if needed
6. **Environment Variables**: Document any new API keys or configs

### Code Style

- Use TypeScript for all new code
- Follow existing component structure
- Add prop types and JSDoc comments
- Handle errors gracefully
- Use React hooks over class components

---

## Troubleshooting

### Common Issues

**"JavaScript heap out of memory" during build**
- Solution: Already configured with 4GB heap (`NODE_OPTIONS=--max_old_space_size=4096`)
- Ensure DigitalOcean uses Professional build resources

**"User profile not found in database"**
- Solution: Create Firestore document at `users/{uid}` matching Firebase Auth UID

**CORS Error when calling Cloud Functions**
- Solution: Ensure `REACT_APP_USE_FUNCTIONS_EMULATOR=true` in `.env.local` and emulator is running

**Functions emulator not loading**
- Solution: Check `.runtimeconfig.json` exists and run `npm run build` in functions

For more troubleshooting, see [DOCUMENTATION.md#troubleshooting](./DOCUMENTATION.md#troubleshooting)

---

## License

Proprietary - All Rights Reserved

---

## Support

For issues or questions:
- Check [DOCUMENTATION.md](./DOCUMENTATION.md)
- Review [CLAUDE.md](./CLAUDE.md) for technical details
- Check Firebase Console logs
- Review browser console for frontend errors

---

**Marketing Agent** - Intelligent B2B SaaS Marketing Automation

*Last Updated: January 2025*
