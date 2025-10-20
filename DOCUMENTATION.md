# Marketing Agent - Complete Documentation

**Last Updated:** January 2025
**Version:** 2.0.0
**Firebase Project:** marketing-app-cc237

---

## 🆕 Recent Updates (v2.0.0)

### NEW Features Added

1. **Custom Idea Generator** ✅
   - User-defined prompts for personalized content ideas
   - Subcollection storage: `leads/{leadId}/ideas/{ideaId}`
   - Status workflow: pending → approved → attached
   - Full API cost tracking integration
   - Cloud Functions: `generateCustomIdeasCloud`, `getLeadIdeas`, `updateIdeaStatus`

2. **API Cost Tracking System** ✅
   - Real-time OpenAI usage tracking
   - Per-lead and per-user cost accumulation
   - Cost analytics in `apiCosts` collection
   - Automatic token counting and cost calculation
   - Integrated across all AI-powered functions

3. **Apollo Title Presets** ✅
   - Save frequently-used job title searches
   - localStorage-based preset management
   - Quick-load saved configurations
   - `TitleSelectionDialog` component for UI

4. **Enhanced Webflow Sync Pipeline** ✅
   - Content extraction from URLs
   - AI-generated LinkedIn posts
   - Google Docs integration
   - Automated blog post creation
   - 5-step automation workflow

### Updated Features

- **Blog Qualification**: Migrated to company-level (with backward compatibility)
- **CRM Components**: Expanded to 25 components with 5 custom hooks
- **Build System**: CRACO configuration for memory optimization
- **Technology Stack**: Updated to React 19.1.1, Material-UI v7.3.2

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
- **Framework**: React 19.1.1 + TypeScript 4.9.5
- **UI Library**: Material-UI v7.3.2
- **State Management**: React Context API
- **Drag & Drop**: @dnd-kit v6.3.1
- **CSV Handling**: PapaParse v5.5.3
- **Date Handling**: date-fns v4.1.0
- **Build Tool**: CRACO v7.1.0 (Create React App wrapper)
- **Routing**: React Router DOM v7.9.1
- **Deployment**: DigitalOcean App Platform

### Backend
- **Runtime**: Node.js 20
- **Framework**: Firebase Cloud Functions v5.0.0
- **Language**: TypeScript 4.9
- **Admin SDK**: firebase-admin v12.1.0
- **AI**: OpenAI v4.38.2 (GPT-4 / GPT-4 Turbo)
- **Web Scraping**: Cheerio v1.0.0, Axios v1.6.8
- **RSS Parsing**: rss-parser v3.13.0
- **HTTP**: cors v2.8.5

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

### ✅ 4. Custom Idea Generator 🆕

**Status**: Production Ready

#### How It Works:
1. User navigates to a lead or company
2. Clicks "Generate Ideas" button
3. Enters custom prompt (e.g., "Generate blog post ideas about AI automation for SaaS")
4. System uses OpenAI GPT-4 with lead context (company name, industry, etc.)
5. Generates 5-10 structured content ideas
6. Ideas saved to subcollection: `leads/{leadId}/ideas/{ideaId}`
7. Each idea has status workflow: `pending` → `approved` → `attached`
8. API costs tracked and accumulated on lead record

#### Features:
- **Custom Prompts**: User-defined prompts for personalized ideas
- **Contextual Generation**: Uses lead/company information for relevance
- **Structured Output**: Title, full description, and metadata
- **Status Workflow**:
  - `pending`: Initial state after generation
  - `approved`: Reviewed and approved by user
  - `attached`: Idea assigned to a specific blog post/content piece
- **Cost Tracking**: Full transparency on OpenAI API costs
- **Subcollection Storage**: Ideas organized per lead for easy access
- **Batch Operations**: Generate multiple idea sets for comparison

#### Cloud Functions:
- **`generateCustomIdeasCloud`**
  - Input: `leadId`, `prompt` (user-defined)
  - Output: Array of ideas with cost info
  - Saves to `leads/{leadId}/ideas/` subcollection

- **`getLeadIdeas`**
  - Input: `leadId`
  - Output: Array of all ideas for that lead
  - Supports filtering by status

- **`updateIdeaStatus`**
  - Input: `leadId`, `ideaId`, `status`
  - Output: Success confirmation
  - Updates idea status and timestamps

#### Data Model:
```typescript
interface Idea {
  id: string;                 // Auto-generated
  content: string;            // Full idea description
  title?: string;             // Optional title
  status: "pending" | "approved" | "attached";
  prompt: string;             // User prompt used
  costInfo: {                 // Cost tracking
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalCost: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
  attachedAt?: Timestamp;     // When attached to content
}
```

#### Files:
- Frontend: Integration in CRM components
- Backend: `functions/src/ideaGenerator/generateIdeas.ts`
- Types: `functions/src/types/ideas.ts`
- Cost Tracking: `functions/src/utils/costTracker.ts`

#### Usage Example:
```typescript
// Generate ideas
const result = await generateCustomIdeas({
  leadId: "lead_123",
  prompt: "Generate 5 technical blog post ideas about machine learning for developers"
});
// Result: { ideas: [...], totalCost: 0.0042, ideaCount: 5 }

// Fetch ideas
const ideas = await getLeadIdeas({ leadId: "lead_123" });

// Update status
await updateIdeaStatus({
  leadId: "lead_123",
  ideaId: "idea_456",
  status: "approved"
});
```

---

### ✅ 5. Company Research System

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

### ✅ 10. API Cost Tracking System 🆕

**Status**: Production Ready

#### Overview
Comprehensive OpenAI API usage tracking system that monitors all AI-powered operations, tracks costs in real-time, and provides transparency into API spending at both lead and user levels.

#### Features:
- **Automatic Tracking**: Every OpenAI API call automatically logged
- **Token Counting**: Accurate input/output token measurement
- **Cost Calculation**: Real-time cost calculation based on model pricing
- **Lead-Level Aggregation**: Total API costs accumulated per lead
- **User-Level Aggregation**: Total costs tracked per user
- **Cost Analytics**: Detailed breakdowns in `apiCosts` collection
- **Model Tracking**: Track which models (GPT-4, GPT-4 Turbo) are used

#### Pricing Models:
| Model | Input Cost | Output Cost |
|-------|------------|-------------|
| GPT-4 Turbo | $10.00 per 1M tokens | $30.00 per 1M tokens |
| GPT-4 | $30.00 per 1M tokens | $60.00 per 1M tokens |

#### Integration:
Automatically integrated into:
- Blog Qualification (`qualifyCompanyBlog`)
- Custom Idea Generator (`generateCustomIdeasCloud`)
- Writing Program Finder (`findWritingProgramCloud`)
- Company Research (`triggerResearchFlow`)
- LinkedIn Post Generation (`dailyWebflowSync`)

#### Data Model:
```typescript
// apiCosts collection
interface ApiCostRecord {
  userId: string;              // User who triggered the operation
  leadId?: string;             // Lead associated (if applicable)
  service: string;             // "blog-qualification" | "idea-generation" | etc.
  model: string;               // "gpt-4-turbo" | "gpt-4"
  timestamp: Timestamp;        // When the call was made
  inputTokens: number;         // Input token count
  outputTokens: number;        // Output token count
  totalCost: number;           // Cost in USD
  metadata: {                  // Additional context
    companyName?: string;
    website?: string;
    operationDetails: any;
  };
}

// Lead cost tracking fields
interface Lead {
  // ... other fields
  totalApiCosts: number;       // Accumulated costs for this lead
  lastApiCostUpdate: Timestamp; // Last cost update time
  hasGeneratedIdeas: boolean;  // Whether ideas were generated
  lastIdeaGeneratedAt: Timestamp; // Last idea generation time
}
```

#### Usage:
```typescript
import { trackApiCost } from '../utils/costTracker';

// Automatic tracking in cloud functions
const result = await trackApiCost({
  userId: context.auth!.uid,
  leadId: data.leadId,
  service: "blog-qualification",
  model: "gpt-4-turbo",
  inputTokens: completion.usage.prompt_tokens,
  outputTokens: completion.usage.completion_tokens,
  metadata: {
    companyName: data.companyName,
    website: data.website
  }
});

// Result includes:
// - Firestore document ID in apiCosts collection
// - Updated lead's totalApiCosts
// - Formatted cost display (e.g., "$0.0042")
```

#### Cost Display:
- Lead cards show total API costs: `"API Costs: $1.23"`
- Cost breakdowns available in analytics
- Export costs with CSV data
- Real-time cost updates during operations

#### Files:
- Cost Tracker: `functions/src/utils/costTracker.ts`
- Types: `functions/src/types/costs.ts`
- Integration: All AI-powered cloud functions

---

### ✅ 11. Apollo Title Presets 🆕

**Status**: Production Ready (Beta)

#### Overview
Save and quickly load frequently-used job title searches for Apollo.io person search, improving efficiency when prospecting for specific roles.

#### Features:
- **Create Presets**: Save combinations of job titles with custom names
- **Quick Load**: One-click loading of saved presets
- **localStorage Storage**: Client-side storage (no server needed)
- **Preset Management**: Edit, delete, and organize presets
- **Multi-Title Support**: Save searches with multiple title variations
- **Search Integration**: Seamlessly integrated into Apollo search flow

#### UI Components:
- **TitleSelectionDialog**: Modal for managing presets
  - Create new preset
  - Load existing preset
  - Edit preset names
  - Delete unwanted presets
- **Preset Dropdown**: Quick access menu in Apollo search
- **Preset Indicator**: Show when using a preset vs custom search

#### Data Model:
```typescript
interface ApolloTitlePreset {
  id: string;              // UUID
  name: string;            // Preset name (e.g., "Engineering Managers")
  titles: string[];        // Array of job titles
  createdAt: string;       // ISO timestamp
  lastUsedAt?: string;     // Last usage timestamp
}
```

#### Storage:
- **Location**: localStorage key: `apollo_title_presets`
- **Format**: JSON array of preset objects
- **Persistence**: Survives browser restarts
- **Portability**: Export/import via JSON

#### Usage Example:
```typescript
import { savePreset, loadPreset, getPresets } from '../types/apolloPresets';

// Save a preset
savePreset({
  name: "C-Suite Executives",
  titles: ["CEO", "CTO", "CFO", "COO", "CMO"]
});

// Load a preset
const preset = loadPreset("preset-id-123");
// Returns: { id, name, titles, createdAt, lastUsedAt }

// Get all presets
const allPresets = getPresets();
// Returns: Array of all saved presets
```

#### Files:
- Types & Utils: `frontend/src/app/types/apolloPresets.ts`
- UI Component: `frontend/src/features/crm/components/TitleSelectionDialog.tsx`
- Service: `frontend/src/services/apolloService.ts`

---

### ✅ 12. Additional Features

#### Apollo.io Integration
- **Status**: Implemented
- **Service**: `frontend/src/services/apolloService.ts`
- Lead enrichment with company data
- Email, phone, and LinkedIn URL lookup
- Person search with title filtering
- Title preset management (NEW!)
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

  // Blog Qualification (Migrated to company-level, kept for compatibility)
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

  // API Cost Tracking (NEW!)
  totalApiCosts?: number;        // Total accumulated API costs for this lead
  lastApiCostUpdate?: Date;      // Last time costs were updated
  hasGeneratedIdeas?: boolean;   // Whether custom ideas were generated
  lastIdeaGeneratedAt?: Date;    // Last idea generation timestamp
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

### Subcollection: `leads/{leadId}/ideas` 🆕

Stores generated content ideas for each lead.

```typescript
interface Idea {
  id: string;                    // Document ID (auto-generated)
  content: string;               // Full idea description
  title?: string;                // Optional title for the idea
  status: "pending" | "approved" | "attached"; // Idea workflow status
  prompt: string;                // User prompt that generated this idea
  costInfo: {                    // API cost tracking for this idea
    model: string;               // Model used (e.g., "gpt-4-turbo")
    inputTokens: number;         // Input token count
    outputTokens: number;        // Output token count
    totalCost: number;           // Cost in USD
  };
  createdAt: Timestamp;          // When idea was generated
  updatedAt: Timestamp;          // Last update time
  attachedAt?: Timestamp;        // When idea was attached to content
}
```

**Status Workflow:**
1. `pending` - Initial state after generation
2. `approved` - Reviewed and approved by user
3. `attached` - Idea has been used/assigned to content

**Indexes Needed:**
- `status` (for filtering by workflow state)
- `createdAt` (for sorting by generation time)

---

### Collection: `apiCosts` 🆕

Stores all OpenAI API usage records for cost tracking and analytics.

```typescript
interface ApiCostRecord {
  id: string;                    // Document ID (auto-generated)
  userId: string;                // User who triggered the operation
  leadId?: string;               // Associated lead (optional)
  companyId?: string;            // Associated company (optional)
  service: string;               // Service name
                                 // "blog-qualification" | "idea-generation" |
                                 // "writing-program-finder" | "company-research"
  model: string;                 // OpenAI model used
                                 // "gpt-4-turbo" | "gpt-4"
  timestamp: Timestamp;          // When the API call was made
  inputTokens: number;           // Input token count
  outputTokens: number;          // Output token count
  totalCost: number;             // Total cost in USD
  metadata: {                    // Additional context
    companyName?: string;        // Company name
    website?: string;            // Website URL
    operationDetails?: any;      // Service-specific details
  };
}
```

**Indexes Needed:**
- `userId` (for user-level cost queries)
- `leadId` (for lead-level cost queries)
- `timestamp` (for time-based analytics)
- Composite: `userId + timestamp` (for user cost history)
- Composite: `service + timestamp` (for service-level analytics)

---

### Collection: `companies` (Updated Schema) 🆕

Companies now include cost tracking and idea generation fields:

```typescript
interface Company {
  id: string;                    // Document ID
  name: string;                  // Company name (unique, case-insensitive)
  website?: string;              // Company website
  industry?: string;             // Industry classification
  description?: string;          // Company description
  customFields?: Record<string, any>; // Dynamic custom fields
  createdAt: Timestamp;
  updatedAt: Timestamp;

  // Blog Qualification (Migrated from lead-level)
  blogQualified?: boolean;
  blogQualificationData?: BlogQualificationData;
  blogQualifiedAt?: Timestamp;

  // API Cost Tracking (NEW!)
  totalApiCosts?: number;        // Total accumulated API costs
  lastApiCostUpdate?: Timestamp; // Last cost update time
  hasGeneratedIdeas?: boolean;   // Whether ideas were generated
  lastIdeaGeneratedAt?: Timestamp; // Last idea generation time
}
```

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

#### `generateCustomIdeasCloud` 🆕

Generates custom content ideas based on user-defined prompts with lead context.

**Type**: `onCall` (requires authentication)

**Input:**
```typescript
{
  leadId: string;      // Lead document ID
  prompt: string;      // User-defined prompt (e.g., "Generate blog ideas about AI")
}
```

**Output:**
```typescript
{
  success: boolean;
  ideaCount: number;       // Number of ideas generated (typically 5-10)
  totalCost: number;       // API cost in USD
  ideas: Array<{
    id: string;            // Idea document ID
    content: string;       // Full idea description
    title?: string;        // Optional title
    status: "pending";     // Initial status
  }>;
}
```

**Side Effects:**
- Creates documents in `leads/{leadId}/ideas/` subcollection
- Updates lead's `hasGeneratedIdeas` and `totalApiCosts`
- Logs cost to `apiCosts` collection

**Usage:**
```typescript
const result = await generateCustomIdeas({
  leadId: "lead_123",
  prompt: "Generate 5 blog post ideas about machine learning for developers"
});
```

---

#### `getLeadIdeas` 🆕

Fetches all generated ideas for a specific lead.

**Type**: `onCall` (requires authentication)

**Input:**
```typescript
{
  leadId: string;          // Lead document ID
  status?: string;         // Optional filter by status
}
```

**Output:**
```typescript
{
  ideas: Array<{
    id: string;
    content: string;
    title?: string;
    status: "pending" | "approved" | "attached";
    prompt: string;
    costInfo: ApiCostInfo;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    attachedAt?: Timestamp;
  }>;
}
```

**Usage:**
```typescript
// Get all ideas
const allIdeas = await getLeadIdeas({ leadId: "lead_123" });

// Get only approved ideas
const approved = await getLeadIdeas({
  leadId: "lead_123",
  status: "approved"
});
```

---

#### `updateIdeaStatus` 🆕

Updates the status of a generated idea.

**Type**: `onCall` (requires authentication)

**Input:**
```typescript
{
  leadId: string;      // Lead document ID
  ideaId: string;      // Idea document ID
  status: "pending" | "approved" | "attached";
}
```

**Output:**
```typescript
{
  success: boolean;
  message: string;
}
```

**Side Effects:**
- Updates idea's `status` and `updatedAt` fields
- Sets `attachedAt` timestamp if status is "attached"

**Usage:**
```typescript
await updateIdeaStatus({
  leadId: "lead_123",
  ideaId: "idea_456",
  status: "approved"
});
```

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

#### `dailyWebflowSync` (Enhanced Pipeline 🆕)

Scheduled function to sync content to Webflow with enhanced automation.

**Type**: `pubsub` (runs on schedule)
**Schedule**: Daily at 9:00 AM UTC
**Timeout**: 9 minutes (540 seconds)
**Memory**: 2GB

**Enhanced 5-Step Pipeline:**
1. **Read URLs**: Fetch URL list from Google Sheet
2. **Extract Content**: Scrape full page content from each URL
3. **Generate LinkedIn Posts**: AI-generated LinkedIn content for each article
4. **Update Google Doc**: Document results and generated posts
5. **Create Webflow Items**: Publish to Webflow blog collection

**Features:**
- Automatic content extraction
- AI-powered LinkedIn post generation
- Duplicate detection (by URL)
- Error handling and retry logic
- Google Docs integration for reports

**Configuration** (Firebase Functions config):
```bash
webflow.api_token=your_token_here
webflow.site_id=your_site_id
webflow.blog_collection_id=your_collection_id
```

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

**Build Configuration:**

The project uses **CRACO** (Create React App Configuration Override) for memory optimization and build performance.

**Key Optimizations:**
- **TypeScript Checking**: Disabled during build (saves memory)
- **ESLint**: Disabled during build
- **Source Maps**: Disabled in production (`GENERATE_SOURCEMAP=false`)
- **Memory Allocation**: 4GB heap (`NODE_OPTIONS=--max_old_space_size=4096`)
- **Terser Parallelism**: Limited to 2 workers
- **ForkTsCheckerWebpackPlugin**: Removed

**Configuration Files:**
- `frontend/craco.config.js` - CRACO configuration
- `frontend/.env.production` - Production environment variables
- `frontend/package.json` - Build scripts

**Build Command:**
```bash
cd frontend
npm run build
# Creates optimized build in frontend/build/
```

**Build Script** (from package.json):
```json
{
  "scripts": {
    "build": "node --max_old_space_size=4096 node_modules/.bin/craco build"
  }
}
```

**Production Environment Variables** (.env.production):
```bash
GENERATE_SOURCEMAP=false
TSC_COMPILE_ON_ERROR=true
DISABLE_ESLINT_PLUGIN=true
SKIP_PREFLIGHT_CHECK=true
IMAGE_INLINE_SIZE_LIMIT=0
INLINE_RUNTIME_CHUNK=false
```

**Why These Optimizations?**
- React 19 + Material-UI v7 + TypeScript requires significant memory
- DigitalOcean build environment has 4GB RAM limit
- Source maps can consume 50-70% of build memory
- These optimizations ensure reliable builds on DigitalOcean

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
