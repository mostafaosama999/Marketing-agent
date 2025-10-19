# Marketing Agent - Complete Documentation

**Last Updated:** October 19, 2025
**Version:** 1.0.0
**Firebase Project:** marketing-app-cc237

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Project Structure](#project-structure)
4. [Current Features](#current-features)
5. [Database Schema](#database-schema)
6. [User Guide](#user-guide)
7. [API & Cloud Functions](#api--cloud-functions)
8. [Development Setup](#development-setup)
9. [Deployment](#deployment)
10. [Roadmap & Future Features](#roadmap--future-features)
11. [Troubleshooting](#troubleshooting)

---

## Project Overview

The **Marketing Agent** is a comprehensive CRM and marketing automation platform designed for B2B SaaS companies. It combines lead management, blog qualification, content idea generation, and writing program discovery to streamline marketing workflows.

### Key Capabilities

- **CRM System**: Full-featured lead management with customizable pipelines
- **Blog Qualification**: AI-powered blog analysis to identify qualified writing opportunities
- **Writing Program Finder**: Automated discovery of guest author and community writing programs
- **Content Research**: Company analysis and content idea generation
- **Apollo.io Integration**: Lead enrichment with company data
- **Analytics Dashboard**: Track leads, conversions, and marketing metrics

---

## Technology Stack

### Frontend
- **Framework**: React 19 + TypeScript
- **UI Library**: Material-UI v7
- **State Management**: React Context API
- **Drag & Drop**: @dnd-kit
- **CSV Handling**: PapaParse
- **Build Tool**: Create React App (react-scripts)
- **Deployment**: DigitalOcean App Platform

### Backend
- **Runtime**: Node.js 20
- **Framework**: Firebase Cloud Functions
- **Language**: TypeScript
- **AI**: OpenAI GPT-4
- **Web Scraping**: Cheerio, Axios
- **RSS Parsing**: rss-parser

### Database & Services
- **Database**: Cloud Firestore (NoSQL)
- **Authentication**: Firebase Authentication
- **Storage**: Firebase Storage
- **Integrations**:
  - Apollo.io API
  - OpenAI API
  - Google Sheets API
  - Slack API
  - Webflow API

---

## Project Structure

```
Marketing-agent/
├── frontend/                    # React application
│   ├── src/
│   │   ├── app/                # App-wide config & providers
│   │   │   ├── config/         # Firebase, theme configs
│   │   │   ├── providers/      # Context providers
│   │   │   ├── store/          # Global state
│   │   │   └── types/          # TypeScript types
│   │   ├── components/         # Shared components
│   │   │   ├── auth/          # Login, ProtectedRoute
│   │   │   ├── layout/        # AppLayout, Sidebar, Header
│   │   │   └── ui/            # Reusable UI components
│   │   ├── contexts/          # React contexts
│   │   ├── features/          # Feature modules
│   │   │   ├── crm/           # CRM lead management
│   │   │   ├── companies/     # Company research
│   │   │   ├── ideas/         # Content ideas
│   │   │   ├── analytics/     # Analytics dashboard
│   │   │   ├── pipeline/      # Pipeline management
│   │   │   └── tasks/         # Task management
│   │   ├── pages/             # Top-level pages
│   │   ├── services/          # API & Firebase services
│   │   └── utils/             # Helper functions
│   ├── public/                # Static assets
│   └── package.json
│
├── functions/                  # Firebase Cloud Functions
│   ├── src/
│   │   ├── blogQualifier/     # Blog qualification logic
│   │   ├── writingProgramFinder/ # Writing program discovery
│   │   ├── research/          # Research orchestrator
│   │   ├── reports/           # Report generation
│   │   ├── webflow/           # Webflow integration
│   │   ├── utils/             # Shared utilities
│   │   ├── types/             # TypeScript types
│   │   ├── examples/          # Usage examples
│   │   └── index.ts           # Function exports
│   ├── .runtimeconfig.json    # Local config (API keys)
│   └── package.json
│
├── firebase.json              # Firebase configuration
├── firestore.rules            # Security rules
├── firestore.indexes.json     # Database indexes
├── claude.md                  # Technical implementation guide
└── DOCUMENTATION.md           # This file
```

---

## Current Features

### ✅ 1. CRM System (`/crm`)

**Status**: Fully Implemented

#### Features:
- **Lead Management**
  - Create, read, update, delete leads
  - Customizable lead fields
  - Import/export via CSV
  - Duplicate detection on import
  - Apollo.io enrichment integration

- **Pipeline Views**
  - **Board View**: Kanban-style drag-and-drop
  - **Table View**: Sortable data grid with filters
  - Customizable pipeline stages
  - Stage-based lead tracking

- **Custom Fields System**
  - Dynamic field creation
  - 8 field types: text, textarea, number, select, radio, checkbox, date, URL
  - Show/hide fields in different views
  - Editable column headers
  - Field ordering

- **Blog Qualification** 🆕
  - AI-powered blog analysis
  - RSS feed detection and parsing
  - Author identification (employees vs freelancers)
  - Content topic analysis
  - Qualification saved to lead
  - Visual status indicators (green/red buttons)
  - Prevents re-qualification

- **Filtering & Search**
  - Full-text search across leads
  - Filter by pipeline stage
  - Date range filtering
  - Status-based filtering

#### Database Collections:
- `leads` - Lead documents
- `pipeline_config` - Pipeline stage configuration
- `custom_fields` - Custom field definitions

---

### ✅ 2. Blog Qualification System

**Status**: Fully Implemented

#### How It Works:
1. User clicks "Qualify Blog" button on a lead
2. System attempts RSS feed discovery (30+ patterns)
3. If RSS found: Parse blog posts, extract authors
4. If no RSS: Use AI to analyze blog content
5. Qualification criteria:
   - Active blog (recent posts)
   - Multiple authors
   - Developer/B2B SaaS focus
   - AI topic coverage
   - Authors are employees (not freelancers)
6. Results saved to lead document
7. Button changes to green (qualified) or red (not qualified)

#### Cloud Function:
- **`qualifyCompanyBlog`**
  - Input: `companyName`, `website`, `leadId`
  - Output: `BlogQualificationResult`
  - Saves result to Firestore
  - Updates lead document

#### Files:
- Frontend: `frontend/src/features/crm/components/LeadCard.tsx`
- Backend: `functions/src/blogQualifier/qualifyBlog.ts`
- Service: `functions/src/utils/blogQualifierService.ts`
- Documentation: `functions/src/utils/BLOG_QUALIFIER_README.md`

---

### ✅ 3. Writing Program Finder 🆕

**Status**: Fully Implemented (Local Testing)

#### How It Works:
1. Generate 120+ URL patterns to check
2. Check common paths: `/write-for-us`, `/guest-authors`, etc.
3. Check subdomains: `blog.domain.com`, `community.domain.com`
4. Check company-specific patterns
5. If no results found, use AI fallback:
   - Scrape website for context
   - AI suggests likely URLs
   - Verify suggestions (check page content)
   - Return only verified URLs

#### Features:
- **Pattern Matching**: 35+ common URL patterns
- **Subdomain Detection**: 5 subdomain prefixes
- **AI Fallback**: GPT-4 powered intelligent discovery
- **Verification**: Confirms pages contain writing-related content
- **Batch Processing**: Handle multiple websites
- **Confidence Levels**: High, medium, low confidence scores

#### Cloud Function:
- **`findWritingProgramCloud`** (Ready, not deployed yet)
  - Input: `website`, `useAiFallback`, `concurrent`, `timeout`
  - Output: `WritingProgramFinderResult`

#### Files:
- Utility: `functions/src/utils/writingProgramFinderUtils.ts`
- Cloud Function: `functions/src/writingProgramFinder/findWritingProgram.ts`
- Test File: `functions/src/examples/testWritingProgramFinder.ts`
- Documentation: `WRITING_PROGRAM_FINDER_SETUP.md`

---

### ✅ 4. Company Research System

**Status**: Implemented

#### Features:
- Company website analysis
- Blog discovery (30+ URL patterns)
- Blog content extraction
- Recent post analysis
- Theme extraction
- Content style analysis
- Posting frequency detection

#### Cloud Functions:
- **`triggerResearchFlow`** - Orchestrates research process
- **`researchCompany`** - Analyzes company website
- **`discoverBlog`** - Finds and analyzes blog

#### Files:
- Orchestrator: `functions/src/research/orchestrator.ts`
- Blog Discovery: `functions/src/utils/blogDiscoveryUtils.ts`
- Company Analysis: `functions/src/utils/companyAnalysisUtils.ts`

---

### ⚠️ 5. Content Ideas Generation

**Status**: Partially Implemented

#### Current Features:
- AI-powered idea generation using GPT-4
- Company-specific content ideas
- Blog theme analysis
- AI trend integration
- Duplicate detection

#### Cloud Function:
- **`generateIdeas`**
  - Input: Company analysis, blog themes, AI trends
  - Output: Array of content ideas

#### Status:
- Backend: ✅ Implemented
- Frontend UI: ⚠️ Placeholder page exists
- Integration: ❌ Not fully connected

#### Files:
- Function: `functions/src/utils/ideaGenerationUtils.ts`
- Frontend: `frontend/src/features/ideas/pages/IdeasPage.tsx`

---

### ⚠️ 6. Analytics Dashboard

**Status**: Placeholder

#### Planned Features:
- Lead conversion metrics
- Pipeline analytics
- Blog qualification stats
- Time-based trends
- Export capabilities

#### Status:
- Frontend: ⚠️ Page exists but empty
- Backend: ❌ Not implemented
- Charts/Graphs: ❌ Not implemented

#### Files:
- Frontend: `frontend/src/features/analytics/pages/AnalyticsPage.tsx`

---

### ⚠️ 7. Companies Page

**Status**: Placeholder

#### Planned Features:
- Company database
- Research status tracking
- Bulk operations
- Company profiles

#### Status:
- Frontend: ⚠️ Page exists but minimal
- Backend: ⚠️ Some services exist
- Integration: ❌ Not complete

#### Files:
- Frontend: `frontend/src/features/companies/pages/CompaniesPage.tsx`

---

### ⚠️ 8. Pipeline Management

**Status**: Placeholder

#### Current Features:
- Pipeline configuration stored in Firestore
- Default stages defined

#### Missing:
- UI for editing stages
- Adding/removing stages
- Custom stage colors
- Stage ordering

#### Files:
- Frontend: `frontend/src/features/pipeline/pages/PipelinePage.tsx`
- Service: `frontend/src/services/pipelineService.ts`

---

### ⚠️ 9. Tasks Management

**Status**: Placeholder

#### Status:
- Frontend: ⚠️ Empty page
- Backend: ❌ Not implemented

---

### ✅ 10. Additional Features

#### Apollo.io Integration
- **Status**: Implemented
- **Service**: `frontend/src/services/apolloService.ts`
- Lead enrichment with company data
- Requires Apollo API key

#### Webflow Integration
- **Status**: Implemented
- **Functions**:
  - `dailyWebflowSync` - Scheduled sync
  - URL processor for content migration
- **Files**: `functions/src/webflow/`

#### LinkedIn Post Generation
- **Status**: Implemented (backend only)
- **Function**: `functions/src/utils/linkedinPostUtils.ts`
- Generate posts from extracted content
- Not exposed via Cloud Function yet

#### Report Generation
- **Status**: Implemented (backend only)
- **Function**: `functions/src/reports/generateReport.ts`
- Marketing report generation
- Scheduled reports via `scheduledMarketingReport`

---

## Database Schema

### Collection: `leads`

Stores CRM lead information.

```typescript
interface Lead {
  id: string;                    // Document ID
  name: string;                  // Lead contact name
  email: string;                 // Email address
  company: string;               // Company name
  phone: string;                 // Phone number
  status: string;                // Pipeline stage (e.g., "New Lead", "Qualified")
  customFields: {                // Dynamic custom field values
    [fieldName: string]: any;
  };
  createdAt: Date;               // Creation timestamp
  updatedAt: Date;               // Last update timestamp

  // Apollo.io Enrichment
  apolloEnriched?: boolean;      // Whether enriched with Apollo data
  lastEnrichedAt?: Date;         // Last enrichment timestamp

  // Blog Qualification (New)
  blogQualified?: boolean;       // Whether blog was qualified
  blogQualificationData?: {      // Full qualification results
    website: string;
    hasActiveBlog: boolean;
    blogPostCount: number;
    lastBlogCreatedAt: string;
    hasMultipleAuthors: boolean;
    authorCount: number;
    authorNames: string;
    isDeveloperB2BSaas: boolean;
    authorsAreEmployees: "employees" | "freelancers" | "mixed" | "unknown";
    coversAiTopics: boolean;
    contentSummary: string;
    blogLinkUsed: string;
    rssFeedFound: boolean;
    analysisMethod: "RSS" | "AI" | "RSS + AI (authors)" | "None";
    qualified: boolean;
  };
  blogQualifiedAt?: Date;        // When qualification was performed
}
```

**Indexes Needed:**
- `status` (for filtering by pipeline stage)
- `createdAt` (for sorting)
- `blogQualified` (for filtering qualified leads)

---

### Collection: `pipeline_config`

Stores pipeline stage configuration.

```typescript
interface PipelineConfig {
  id: string;                    // Document ID (usually "default")
  stages: PipelineStage[];       // Array of pipeline stages
  createdAt: Date;
  updatedAt: Date;
}

interface PipelineStage {
  id: string;                    // Stage ID
  label: string;                 // Display label (e.g., "New Lead")
  color: string;                 // Hex color code
  order: number;                 // Display order
  visible: boolean;              // Whether stage is visible
}
```

**Default Stages:**
1. New Lead (gray)
2. Contacted (blue)
3. Qualified (orange)
4. Proposal (purple)
5. Negotiation (red)
6. Won (green)
7. Lost (gray)

---

### Collection: `custom_fields`

Stores custom field definitions.

```typescript
interface CustomFieldsConfig {
  id: string;                    // Document ID (usually "default")
  fields: CustomField[];         // Array of custom field definitions
  createdAt: Date;
  updatedAt: Date;
}

interface CustomField {
  id: string;                    // Field ID
  name: string;                  // Internal name (e.g., "lead_owner")
  label: string;                 // Display label (e.g., "Lead Owner")
  type: CustomFieldType;         // Field type
  options?: string[];            // For select/radio/checkbox types
  required: boolean;             // Whether field is required
  visible: boolean;              // Show in UI
  showInTable: boolean;          // Display as column in table view
  showInCard: boolean;           // Display on kanban cards
  order: number;                 // Display order
}

type CustomFieldType =
  | 'text'       // Short text input
  | 'textarea'   // Multi-line text
  | 'number'     // Numeric input
  | 'select'     // Dropdown (single choice)
  | 'radio'      // Radio buttons
  | 'checkbox'   // Multiple checkboxes
  | 'date'       // Date picker
  | 'url';       // URL input with validation
```

**Default Custom Fields:**
- `lead_owner` (select): Unassigned, Sales Team A, B, C
- `priority` (select): Low, Medium, High, Urgent
- `deal_value` (number): Deal value in currency

---

### Collection: `research_sessions`

Stores company research session data.

```typescript
interface ResearchSession {
  id: string;                    // Session ID
  companyUrl: string;            // Company website URL
  status: "pending" | "in_progress" | "completed" | "error";
  steps: ResearchStep[];         // Research process steps
  companyAnalysis?: {            // Company analysis results
    url: string;
    title: string;
    description: string;
    summary: string;
    industry?: string;
    keyProducts: string[];
    targetAudience?: string;
  };
  blogAnalysis?: {               // Blog analysis results
    blogUrl?: string;
    found: boolean;
    recentPosts: BlogPost[];
    themes: string[];
    contentStyle?: string;
    postingFrequency?: string;
  };
  aiTrends?: AITrend[];          // AI trend data
  generatedIdeas?: ContentIdea[]; // Generated content ideas
  uniqueIdeas?: ContentIdea[];   // Unique ideas after deduplication
  googleDocUrl?: string;         // Generated Google Doc URL
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}
```

---

### Collection: `users`

Stores user profile and authentication data.

```typescript
interface User {
  id: string;                    // User ID (matches Firebase Auth UID)
  email: string;                 // Email address
  displayName: string;           // Full name
  role: string;                  // Job title or role
  department: string;            // Department name
  createdAt?: Date;
  updatedAt?: Date;
}
```

**⚠️ Important**: The user document ID **MUST** match the Firebase Authentication UID exactly.

---

## User Guide

### Getting Started

#### 1. Login

1. Navigate to the application URL
2. Click "Login" button
3. Enter your email and password
4. If successful, you'll be redirected to the CRM page

**Troubleshooting Login Issues:**
- See `claude.md` section: "Authentication System"
- Ensure user exists in both Firebase Auth AND Firestore
- UIDs must match exactly

---

#### 2. CRM Dashboard (`/crm`)

The CRM is the main feature of the application.

**Board View:**
- Drag and drop leads between pipeline stages
- Click on a lead card to view/edit details
- Use the search bar to filter leads
- Filter by status using the dropdown

**Table View:**
- Toggle to table view using the view switcher
- Sort by clicking column headers
- Edit column names by clicking the edit icon
- Select columns to display in settings

**Adding a Lead:**
1. Click "+ New Lead" button
2. Fill in required fields:
   - Name
   - Email
   - Company
   - Phone (optional)
3. Select pipeline status
4. Add custom field values
5. Click "Create Lead"

**Editing a Lead:**
1. Click the edit icon on any lead card
2. Modify fields
3. Click "Save" to update

**Deleting a Lead:**
1. Open lead edit dialog
2. Click "Delete" button
3. Confirm deletion

---

#### 3. Importing Leads from CSV

**Format Your CSV:**
```csv
Name,Email,Company,Phone
John Doe,john@example.com,Example Corp,555-0100
Jane Smith,jane@example.com,Test Inc,555-0200
```

**Import Process:**
1. Click "Import CSV" button
2. Select your CSV file
3. Map CSV columns to lead fields
   - Required: Name, Email, Company
   - Optional: Phone, custom fields
4. Enable "Auto-create custom fields" to create fields for unmapped columns
5. Configure duplicate detection (optional):
   - Choose which fields to check (email, name, company, phone)
   - Duplicates will be skipped
6. Click "Import"
7. Review import results:
   - ✓ Created
   - ⊘ Skipped (duplicates)
   - ✗ Failed (errors)
   - + Custom fields created

---

#### 4. Blog Qualification

**Purpose**: Identify companies with active blogs suitable for guest posting.

**How to Qualify a Blog:**
1. Open any lead in the CRM
2. Click "Qualify Blog" button
3. If website URL not in lead, enter it when prompted
4. Wait 10-15 seconds for analysis
5. View results:
   - **Green button** = Qualified ✓
   - **Red button** = Not Qualified ✗
6. Click the button again to see detailed qualification report

**Qualification Criteria:**
- Active blog (recent posts)
- Multiple authors (not single-author blog)
- Developer/B2B SaaS focused content
- Covers AI-related topics
- Authors are employees (not freelancers)

**Results Include:**
- Blog post count
- Last post date
- Number of authors
- Author names
- Content summary
- RSS feed status
- Analysis method used (RSS vs AI)

**Re-qualification:**
- Qualified leads won't be re-analyzed
- Results are cached in the database
- Click the status button to view cached results instantly

---

#### 5. Custom Fields

**Creating Custom Fields:**
1. Go to CRM Settings
2. Click "Manage Custom Fields"
3. Click "+ Add Field"
4. Configure:
   - Field name (internal identifier)
   - Display label (shown to users)
   - Field type (text, number, select, etc.)
   - Options (for select/radio/checkbox)
   - Required (yes/no)
   - Visibility settings:
     - Show in table view
     - Show in card view
5. Click "Save"

**Field Types:**
- **Text**: Short text input
- **Textarea**: Multi-line text
- **Number**: Numeric input
- **Select**: Dropdown (single choice)
- **Radio**: Radio buttons (single choice)
- **Checkbox**: Multiple selections
- **Date**: Date picker
- **URL**: URL input with validation

**Editing Field Labels:**
- In table view, click the edit icon next to any custom field column header
- Enter new label and save
- Label updates immediately

---

#### 6. Pipeline Management

**Current Stages:**
- New Lead
- Contacted
- Qualified
- Proposal
- Negotiation
- Won
- Lost

**Moving Leads:**
- **Board View**: Drag and drop leads between columns
- **Table View**: Click on a lead and change status in edit dialog

**⚠️ Note**: UI for adding/removing/editing pipeline stages is not yet implemented. Stages are currently hard-coded.

---

#### 7. Exporting Data

**Export Leads to CSV:**
1. Go to CRM page
2. Click "Export CSV" button
3. CSV file downloads with:
   - All lead fields
   - Custom field values
   - Formatted dates

**Export Format:**
- Only visible custom fields are exported
- Arrays (checkbox values) are joined with commas
- Dates are formatted to locale string

---

## API & Cloud Functions

### Deployed Functions

All functions are available at:
```
https://us-central1-marketing-app-cc237.cloudfunctions.net/{functionName}
```

---

#### `qualifyCompanyBlog`

Analyzes a company's blog to determine if it's suitable for guest posting.

**Type**: `onCall` (requires authentication)

**Input:**
```typescript
{
  companyName: string;   // Company name
  website: string;       // Website URL
  leadId: string;        // Lead document ID
}
```

**Output:**
```typescript
{
  companyName: string;
  website: string;
  hasActiveBlog: boolean;
  blogPostCount: number;
  lastBlogCreatedAt: string;
  hasMultipleAuthors: boolean;
  authorCount: number;
  authorNames: string;
  isDeveloperB2BSaas: boolean;
  authorsAreEmployees: "employees" | "freelancers" | "mixed" | "unknown";
  coversAiTopics: boolean;
  contentSummary: string;
  blogLinkUsed: string;
  rssFeedFound: boolean;
  analysisMethod: "RSS" | "AI" | "RSS + AI (authors)" | "None";
  qualified: boolean;
}
```

**Side Effects:**
- Updates lead document in Firestore with qualification results
- Sets `blogQualified`, `blogQualificationData`, `blogQualifiedAt`

**Usage:**
```typescript
import { qualifyCompanyBlog } from '../services/researchApi';

const result = await qualifyCompanyBlog({
  companyName: "Example Corp",
  website: "https://example.com",
  leadId: "lead_123"
});
```

---

#### `findWritingProgramCloud`

Discovers community writing programs and guest author opportunities.

**Type**: `onCall` (requires authentication)
**Status**: ⚠️ Implemented but not yet deployed to production

**Input:**
```typescript
{
  website: string;          // Website URL to search
  useAiFallback?: boolean;  // Enable AI fallback (default: true)
  concurrent?: number;      // Concurrent URL checks (default: 5)
  timeout?: number;         // Timeout per request in ms (default: 5000)
}
```

**Output:**
```typescript
{
  website: string;
  totalChecked: number;          // Total URLs checked
  validUrls: Array<{            // Found writing program URLs
    url: string;
    exists: boolean;
    status: number;
    finalUrl?: string;
  }>;
  patternsFound: string[];       // URL patterns found
  usedAiFallback: boolean;       // Whether AI was used
  aiSuggestions?: Array<{       // AI suggestions (if used)
    url: string;
    confidence: "high" | "medium" | "low";
    reasoning: string;
    verified: boolean;
    verificationError?: string;
  }>;
  aiReasoning?: string;          // AI's overall analysis
}
```

**Testing Locally:**
See `WRITING_PROGRAM_FINDER_SETUP.md` for emulator setup.

---

#### `triggerResearchFlow`

Orchestrates the complete research process for a company.

**Type**: `onCall` (requires authentication)

**Input:**
```typescript
{
  companyUrl: string;  // Company website URL
}
```

**Output:**
```typescript
{
  success: boolean;
  sessionId: string;    // Research session ID
  message: string;
}
```

**Process:**
1. Creates research session in Firestore
2. Analyzes company website
3. Discovers and analyzes blog
4. Fetches AI trends
5. Generates content ideas
6. Creates Google Doc with results
7. Updates session status in real-time

**Monitoring:**
Use `subscribeToSession(sessionId)` to monitor progress in real-time.

---

#### `healthCheck`

Simple health check for monitoring.

**Type**: `onCall`

**Output:**
```typescript
{
  status: "healthy";
  timestamp: string;
  message: "Marketing Agent Functions are running";
}
```

---

#### `dailyWebflowSync`

Scheduled function to sync content to Webflow.

**Type**: `pubsub` (runs on schedule)
**Schedule**: Daily (configured in Firebase)

---

#### `scheduledMarketingReport`

Scheduled function to generate marketing reports.

**Type**: `pubsub` (runs on schedule)
**Schedule**: Configurable

---

### API Configuration

**Required Environment Variables:**

```bash
# OpenAI API Key
firebase functions:config:set openai.key="sk-proj-..."

# Apollo.io API Key (for lead enrichment)
# Set in frontend .env.local:
REACT_APP_APOLLO_API_KEY="..."

# Firebase config (frontend .env.local)
REACT_APP_FIREBASE_API_KEY="..."
REACT_APP_USE_FUNCTIONS_EMULATOR="true"  # For local development
```

---

## Development Setup

### Prerequisites

- Node.js 18.x or 20.x
- npm 9.x or later
- Firebase CLI: `npm install -g firebase-tools`
- Firebase account with Blaze plan (for Cloud Functions)
- OpenAI API key
- Apollo.io API key (optional, for enrichment)

---

### Initial Setup

#### 1. Clone Repository

```bash
git clone <repository-url>
cd Marketing-agent
```

#### 2. Install Dependencies

```bash
# Frontend
cd frontend
npm install

# Backend
cd ../functions
npm install
```

#### 3. Firebase Configuration

```bash
# Login to Firebase
firebase login

# Select project
firebase use marketing-app-cc237
```

#### 4. Environment Variables

**Frontend** (`frontend/.env.local`):
```bash
# Firebase Configuration
REACT_APP_FIREBASE_API_KEY=AIzaSyApdeRoMJwmyd3dk5OhD_tfFPOv4GqsxXo

# Apollo.io API Configuration
REACT_APP_APOLLO_API_KEY=your_apollo_key_here

# Enable Functions emulator only (Auth & Firestore use production)
REACT_APP_USE_FUNCTIONS_EMULATOR=true
```

**Backend** (`functions/.runtimeconfig.json`):
```json
{
  "openai": {
    "key": "sk-proj-your-openai-key-here"
  }
}
```

**⚠️ Note**: `.runtimeconfig.json` is for local development only and is gitignored.

---

### Running Locally

#### Option 1: Functions Emulator (Recommended)

**Terminal 1 - Functions:**
```bash
cd functions
npm run serve
# Emulator runs at http://localhost:5001
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm start
# React app runs at http://localhost:3000
```

**What happens:**
- Auth & Firestore use production Firebase
- Cloud Functions use local emulator
- No cloud deployment needed for testing

#### Option 2: All Production

Remove or comment out in `frontend/.env.local`:
```bash
# REACT_APP_USE_FUNCTIONS_EMULATOR=true
```

Restart frontend. Everything uses production Firebase.

---

### Building for Production

#### Frontend

```bash
cd frontend
npm run build
# Creates optimized build in frontend/build/
```

#### Backend

```bash
cd functions
npm run build
# Compiles TypeScript to functions/lib/
```

---

## Deployment

### Frontend (DigitalOcean)

**Settings:**
- **Source Directory**: `frontend`
- **Build Command**: `npm run build`
- **Output Directory**: `build`
- **Build Resources**: Professional (4GB RAM)

**Environment Variables** (set in DigitalOcean):
```
REACT_APP_FIREBASE_API_KEY=...
REACT_APP_FIREBASE_AUTH_DOMAIN=marketing-app-cc237.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=marketing-app-cc237
REACT_APP_FIREBASE_STORAGE_BUCKET=marketing-app-cc237.firebasestorage.app
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=967626109033
REACT_APP_FIREBASE_APP_ID=1:967626109033:web:9eab40f10ec512f1bc72f8
```

**Deployment:**
- Push to `main` branch
- DigitalOcean auto-deploys

---

### Backend (Firebase Functions)

```bash
# Deploy all functions
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:qualifyCompanyBlog

# Deploy hosting (if using Firebase Hosting)
firebase deploy --only hosting
```

**First-time deployment:**
```bash
# Set OpenAI API key in production
firebase functions:config:set openai.key="sk-proj-..."

# Deploy
firebase deploy --only functions
```

---

### Database (Firestore)

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

**⚠️ Security**: Current rules allow all operations for development. Update before production!

---

## Roadmap & Future Features

### 🚧 In Progress

#### 1. Writing Program Finder UI Integration
- **Status**: Backend complete, UI not integrated
- **Tasks**:
  - [ ] Add "Find Writing Programs" button to lead cards
  - [ ] Create results dialog component
  - [ ] Save results to lead document
  - [ ] Add filtering for leads with writing programs
  - [ ] Batch processing UI

---

### 📋 Planned Features

#### 2. Analytics Dashboard
- **Priority**: High
- **Tasks**:
  - [ ] Lead conversion funnel chart
  - [ ] Pipeline stage distribution
  - [ ] Time-based trends (new leads over time)
  - [ ] Blog qualification statistics
  - [ ] Export reports to PDF/Excel
  - [ ] Custom date range selection

#### 3. Companies Database
- **Priority**: Medium
- **Tasks**:
  - [ ] Dedicated companies page
  - [ ] Company profiles with research history
  - [ ] Bulk research operations
  - [ ] Company tagging and categorization
  - [ ] Integration with leads

#### 4. Pipeline Editor
- **Priority**: Medium
- **Tasks**:
  - [ ] Add new pipeline stages
  - [ ] Remove/archive stages
  - [ ] Edit stage colors
  - [ ] Reorder stages (drag & drop)
  - [ ] Stage-specific automation rules

#### 5. Custom Field Enhancements
- **Priority**: Low
- **Tasks**:
  - [ ] Conditional field visibility
  - [ ] Field dependencies
  - [ ] Formula fields (calculated values)
  - [ ] Multi-select improvements
  - [ ] File upload field type

#### 6. Task Management
- **Priority**: Medium
- **Tasks**:
  - [ ] Create tasks linked to leads
  - [ ] Task assignment
  - [ ] Due dates and reminders
  - [ ] Task completion tracking
  - [ ] Calendar view

#### 7. Email Integration
- **Priority**: High
- **Tasks**:
  - [ ] Send emails from within CRM
  - [ ] Email templates
  - [ ] Track email opens/clicks
  - [ ] Email sequence automation
  - [ ] Gmail/Outlook integration

#### 8. Automation & Workflows
- **Priority**: High
- **Tasks**:
  - [ ] Stage transition triggers
  - [ ] Auto-assignment rules
  - [ ] Email notifications
  - [ ] Slack notifications
  - [ ] Webhook integrations

#### 9. Content Ideas UI
- **Priority**: Medium
- **Tasks**:
  - [ ] Display generated ideas in UI
  - [ ] Filter and search ideas
  - [ ] Save favorites
  - [ ] Export to doc/spreadsheet
  - [ ] Connect to research sessions

#### 10. Advanced Search
- **Priority**: Medium
- **Tasks**:
  - [ ] Saved searches
  - [ ] Advanced filter builder
  - [ ] Boolean logic (AND/OR/NOT)
  - [ ] Custom field filtering
  - [ ] Search across all fields

#### 11. User Management
- **Priority**: High (for production)
- **Tasks**:
  - [ ] User roles and permissions
  - [ ] Team management
  - [ ] Audit logs
  - [ ] Activity tracking
  - [ ] SSO integration

#### 12. Mobile App
- **Priority**: Low
- **Tasks**:
  - [ ] React Native mobile app
  - [ ] Responsive mobile web
  - [ ] Push notifications
  - [ ] Offline support

---

### 🎯 Quick Wins (Easy Implementations)

1. **Lead Notes**: Add notes field to leads
2. **Lead Tags**: Add tagging system for categorization
3. **Activity Log**: Track lead interactions and changes
4. **Bulk Delete**: Select and delete multiple leads
5. **Keyboard Shortcuts**: Add hotkeys for common actions
6. **Dark Mode**: Theme toggle
7. **Export Filters**: Remember last used filters
8. **Lead Duplicates**: Detect and merge duplicate leads

---

## Troubleshooting

### Common Issues

#### 1. "JavaScript heap out of memory" during build

**Cause**: Not enough memory allocated for build process

**Solution**:
```json
// frontend/package.json
{
  "scripts": {
    "build": "NODE_OPTIONS=--max_old_space_size=4096 react-scripts build"
  }
}
```

Also update DigitalOcean build resources to Professional (4GB RAM).

---

#### 2. "User profile not found in database"

**Cause**: User exists in Firebase Auth but not in Firestore

**Solution**:
1. Go to Firebase Console → Authentication → Users
2. Copy the user's UID
3. Go to Firestore → `users` collection
4. Create document with ID = UID
5. Add fields:
   ```json
   {
     "email": "user@domain.com",
     "displayName": "Full Name",
     "role": "Manager",
     "department": "Marketing"
   }
   ```

---

#### 3. CORS Error when calling Cloud Functions

**Cause**: Frontend trying to call production functions instead of emulator

**Solution**:
1. Check `frontend/.env.local` has:
   ```
   REACT_APP_USE_FUNCTIONS_EMULATOR=true
   ```
2. Start emulator:
   ```bash
   cd functions
   npm run serve
   ```
3. Restart frontend

---

#### 4. "OpenAI API key not configured"

**For Local Development:**
```bash
# Create or edit functions/.runtimeconfig.json
{
  "openai": {
    "key": "sk-proj-your-key-here"
  }
}
```

**For Production:**
```bash
firebase functions:config:set openai.key="sk-proj-your-key-here"
firebase deploy --only functions
```

---

#### 5. Functions emulator not loading functions

**Symptoms**: "Failed to load function definition from source"

**Causes & Solutions**:

**A. TypeScript compilation errors**
```bash
cd functions
npm run build
# Fix any errors shown
```

**B. Missing environment variables**
- Check `.runtimeconfig.json` exists and has valid JSON
- Restart emulator after config changes

**C. Import errors**
```bash
# Check all imports resolve correctly
npm run build
```

---

#### 6. CSV Import fails with "undefined" error

**Cause**: Trying to save `undefined` to Firestore (not allowed)

**Solution**: Code already handles this with conditional spread operators. If you see this error:
1. Check the CSV file is well-formed
2. Ensure all required fields (name, email, company) are mapped
3. Check for special characters in field names

---

#### 7. Drag & Drop not working

**Causes**:
- Browser issue: Try different browser
- z-index conflicts: Check CSS
- State not updating: Check console for errors

**Solution**:
- Clear browser cache
- Check browser console for errors
- Verify @dnd-kit is installed: `npm list @dnd-kit/core`

---

#### 8. Blog Qualification stuck on "Analyzing..."

**Causes**:
- OpenAI API rate limit
- Website blocking scraping
- Network timeout

**Solutions**:
- Wait and retry
- Check OpenAI API key is valid
- Check function logs in Firebase Console
- Try with a different website

---

### Getting Help

1. **Check Logs**:
   - Frontend: Browser console
   - Backend: Firebase Console → Functions → Logs
   - Emulator: Terminal output

2. **Documentation**:
   - This file (DOCUMENTATION.md)
   - `claude.md` - Technical implementation details
   - `WRITING_PROGRAM_FINDER_SETUP.md` - Writing program finder guide
   - `functions/src/utils/BLOG_QUALIFIER_README.md` - Blog qualifier guide

3. **Code Examples**:
   - `functions/src/examples/` - Usage examples
   - Test files in `functions/src/scripts/`

---

## Appendix

### Useful Commands

```bash
# Firebase
firebase login
firebase projects:list
firebase use marketing-app-cc237
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase functions:log

# Frontend
cd frontend
npm start                    # Development server
npm run build               # Production build
npm test                    # Run tests

# Backend
cd functions
npm run serve               # Start emulator
npm run build               # Compile TypeScript
npm run deploy              # Deploy to Firebase
node lib/examples/testWritingProgramFinder.js  # Test locally

# Git
git status
git add .
git commit -m "message"
git push origin main
```

---

### File Locations

**Configuration:**
- Firebase: `firebase.json`
- Firestore Rules: `firestore.rules`
- Firestore Indexes: `firestore.indexes.json`
- Frontend Env: `frontend/.env.local` (gitignored)
- Functions Env: `functions/.runtimeconfig.json` (gitignored)

**Documentation:**
- Main Docs: `DOCUMENTATION.md` (this file)
- Technical Guide: `claude.md`
- Writing Program Finder: `WRITING_PROGRAM_FINDER_SETUP.md`
- Blog Qualifier: `functions/src/utils/BLOG_QUALIFIER_README.md`
- Blog Qualification Feature: `frontend/src/features/crm/BLOG_QUALIFICATION_FEATURE.md`

**Database:**
- Collections: See "Database Schema" section
- Security Rules: `firestore.rules`
- Indexes: `firestore.indexes.json`

---

### Contributing

When adding new features:

1. **Update Types**: Add TypeScript interfaces in appropriate `types/` directories
2. **Update Documentation**: Update this file and relevant READMEs
3. **Add Tests**: Create example/test files in `functions/src/examples/`
4. **Security Rules**: Update `firestore.rules` for new collections
5. **Indexes**: Update `firestore.indexes.json` if needed
6. **Environment Variables**: Document any new API keys or configs

---

### Version History

**v1.0.0** (October 19, 2025)
- Initial comprehensive documentation
- CRM system fully documented
- Blog qualification documented
- Writing program finder documented
- Database schema documented
- User guide completed
- Roadmap defined

---

**End of Documentation**

For questions or issues, check the troubleshooting section or review the technical guide in `claude.md`.
