# Marketing CRM - UI Documentation

**Version:** 1.0
**Last Updated:** October 21, 2025
**Platform:** Marketing Agency CRM Platform

---

## Table of Contents

1. [Introduction & Overview](#introduction--overview)
2. [CRM Pipeline - Board View](#crm-pipeline---board-view)
3. [CRM Pipeline - Table View](#crm-pipeline---table-view)
4. [Lead Management](#lead-management)
5. [CSV Import System](#csv-import-system)
6. [Filtering & Search](#filtering--search)
7. [Apollo.io Integration](#apolloio-integration)
8. [Core User Journeys](#core-user-journeys)
9. [Component Reference](#component-reference)
10. [Best Practices & Tips](#best-practices--tips)
11. [Troubleshooting](#troubleshooting)

---

## Introduction & Overview

The Marketing CRM is a modern, pipeline-based customer relationship management system designed for marketing agencies and teams. Built with React, TypeScript, and Material-UI, it provides an intuitive interface for managing leads, tracking progress through sales stages, and enriching contact data using Apollo.io's API.

### Key Features

- **Visual Pipeline Management**: Kanban-style board with drag-and-drop functionality
- **Dual View Modes**: Switch between Board (visual) and Table (spreadsheet) views
- **Apollo.io Integration**: One-click email enrichment and people search
- **Bulk CSV Import**: Import hundreds of leads with intelligent field mapping
- **Advanced Filtering**: Multi-dimensional filtering by status, company, owner, and custom fields
- **Real-time Updates**: Firebase-powered real-time synchronization across all users
- **Activity Tracking**: Complete timeline of lead status changes and interactions

### Application Structure

```
/crm
├── Board View (default)      - Visual kanban pipeline
├── Table View                - Spreadsheet-style grid
├── Lead Dialog               - Add/edit individual leads
├── CSV Import                - Bulk lead import workflow
└── Filter Panel              - Advanced filtering controls
```

---

## CRM Pipeline - Board View

![Screenshot: Board View](./screenshots/board-view.png)

### Overview

The Board View provides a visual, kanban-style representation of your lead pipeline. Leads are organized into columns representing different stages of your sales process, allowing you to see the complete picture at a glance and move leads through stages with simple drag-and-drop.

**Component:** `CRMBoard.tsx`
**Location:** `/crm` (default view)

### Pipeline Stages

The default pipeline consists of 6 stages, each with a distinct visual identity:

| Stage | Icon | Color | Purpose |
|-------|------|-------|---------|
| **New Lead** | 📋 | Gray | Freshly added leads, not yet qualified |
| **Qualified** | 🎯 | Orange | Leads that meet your qualification criteria |
| **Contacted** | 📞 | Blue | Leads you've reached out to |
| **Follow up** | 🔄 | Purple | Leads requiring additional touchpoints |
| **Won** | ✅ | Green | Successfully converted leads |
| **Lost** | ❌ | Gray/Pink | Leads that didn't convert |

### Visual Elements

Each **Lead Card** displays:
- Lead name (bold)
- Company name (with icon)
- Email address (with icon, if available)
- Phone number (with icon, if available)
- Time in current state (e.g., "2 days")
- Custom fields (if configured)

### Key Interactions

#### 1. Adding a New Lead
Click the **floating action button** (+ icon) in the bottom-right corner to open the Lead Dialog.

```typescript
// Triggered by FAB click
<Fab
  color="primary"
  onClick={() => {
    setDialogMode('create');
    setOpenDialog(true);
  }}
>
  <AddIcon />
</Fab>
```

#### 2. Drag-and-Drop Between Stages

**User Action:** Click and hold a lead card, drag to a different column, release.

**What Happens:**
- Visual feedback during drag (card becomes slightly transparent)
- Drop zones highlight when hovering
- Lead status updates immediately
- Activity timeline records the status change
- Real-time sync to all connected users

**Code Example:**
```typescript
// Drag start
const handleDragStart = (lead: Lead) => {
  setDraggedLead(lead);
};

// Drop on new column
const handleDrop = async (newStatus: LeadStatus) => {
  if (draggedLead) {
    await updateLeadStatus(draggedLead.id, newStatus);
    setDraggedLead(null);
  }
};
```

#### 3. Viewing Lead Details
Click anywhere on a lead card to open the **Lead Dialog** in edit mode, showing:
- **Details Tab**: All lead information with edit capability
- **Activity Tab**: Complete timeline of status changes

### Column Headers

Each column header shows:
- Stage icon and name
- Count of leads in that stage
- Total count badge

### Responsive Behavior

- **Desktop**: All 6 columns visible side-by-side with horizontal scrolling
- **Tablet**: 3-4 columns visible, scroll to see more
- **Mobile**: 1-2 columns visible, optimized for vertical scrolling

---

## CRM Pipeline - Table View

![Screenshot: Table View](./screenshots/table-view.png)

### Overview

The Table View provides a spreadsheet-style interface for managing leads, ideal for users who prefer a dense, data-centric view or need to compare many leads at once.

**Component:** `CRMLeadsTable.tsx`
**Toggle:** Click "Table" button in the view toggle (top-right)

### Table Columns

| Column | Description | Sortable | Filterable |
|--------|-------------|----------|------------|
| Name | Lead's full name | ✓ | ✓ (search) |
| Email | Contact email | ✓ | ✓ (search) |
| Phone | Contact phone | ✓ | - |
| Company | Organization name | ✓ | ✓ (dropdown) |
| Status | Current pipeline stage | ✓ | ✓ (dropdown) |
| Time in State | Days in current status | ✓ | - |
| Actions | Edit/Delete buttons | - | - |

### Key Features

#### 1. Sorting
Click any column header to sort ascending/descending. Active sort column shows an arrow indicator.

#### 2. Inline Actions
Each row has an **Actions** column with:
- **Edit** icon: Opens Lead Dialog in edit mode
- **Delete** icon: Confirms and removes the lead

#### 3. Bulk Selection
- Checkbox column for selecting multiple leads
- Bulk actions toolbar appears when leads are selected
- Actions: Change status, delete, export

### When to Use Table View

**Best for:**
- Reviewing large numbers of leads
- Comparing lead data side-by-side
- Quick data entry/editing
- Exporting lead data

**Board View is better for:**
- Visual pipeline management
- Drag-and-drop stage changes
- Getting a "big picture" view
- Presenting to stakeholders

### Switching Views

```typescript
<ViewToggle
  view={currentView}
  onViewChange={(view) => setCurrentView(view)}
/>
```

The view preference is saved locally and persists across sessions.

---

## Lead Management

### Lead Dialog

![Screenshot: Lead Dialog](./screenshots/lead-dialog.png)

The Lead Dialog is the primary interface for creating and editing individual leads. It features two modes and includes powerful Apollo.io integration.

**Component:** `LeadDialog.tsx`
**Modes:** Create, Edit

### Form Fields

#### Required Fields (marked with *)
- **Name*** - Full name of the lead
- **Company*** - Organization name (auto-creates company if doesn't exist)

#### Optional Fields
- **Email** - Contact email address
- **Phone** - Contact phone number
- **Status*** - Pipeline stage (default: "New Lead")

### Apollo Email Enrichment

One of the most powerful features of the Lead Dialog is the integrated Apollo.io email enrichment.

#### When It Appears
The **"Get email from Apollo.io"** button appears when:
- Email field is empty
- Name AND Company fields are filled
- Not currently loading

![Screenshot: Apollo Button](./screenshots/apollo-button.png)

#### How It Works

**User Flow:**
1. Enter lead's Name and Company
2. Leave Email blank
3. Click "Get email from Apollo.io (costs 1 credit)"
4. Wait for enrichment (typically 2-3 seconds)
5. Email and phone auto-populate if found

**Technical Flow:**
```typescript
const handleFetchEmail = async () => {
  // Parse name
  const nameParts = formData.name.trim().split(' ');
  const firstName = nameParts[0];
  const lastName = nameParts.slice(1).join(' ');

  // Call Apollo API
  const result = await fetchEmail({
    firstName,
    lastName,
    companyName: formData.company,
  }, process.env.REACT_APP_APOLLO_API_KEY);

  // Update form if match found
  if (result.matched && result.email) {
    setFormData(prev => ({
      ...prev,
      email: result.email,
      phone: result.phone || prev.phone
    }));
  }
};
```

#### Success/Error Feedback

**Success:**
```
✓ Email found: john.doe@example.com (1 credit used)
```

**Error Scenarios:**
- ❌ "No email found for this person"
- ❌ "Rate limit exceeded. Please try again later."
- ❌ "Invalid Apollo API key"
- ❌ "Name and Company are required to fetch email"

### Edit Mode Features

When editing an existing lead, the dialog includes two tabs:

#### Details Tab
- All standard fields (editable)
- **Time in Current State** display
  - Shows how long the lead has been in its current status
  - Example: "5 days in Contacted"
- **Cumulative State Durations** display
  - Shows total time spent in each stage
  - Helps identify bottlenecks

#### Activity Tab
- Complete timeline of status changes
- Each change shows:
  - Previous status → New status
  - Date and time of change
  - User who made the change (if available)
  - Notes (if provided)

![Screenshot: Activity Timeline](./screenshots/activity-timeline.png)

### Validation Rules

| Field | Rule | Message |
|-------|------|---------|
| Name | Required, min 1 char | Implicit (submit disabled) |
| Company | Required, min 1 char | Implicit (submit disabled) |
| Email | Optional, valid email format | "Invalid email format" |
| Phone | Optional, any format accepted | - |

### Save Behavior

**Create Mode:**
- New lead created with status "New Lead" (default) or selected status
- Appears immediately in appropriate column/table row
- Activity timeline initialized with "Created" entry

**Edit Mode:**
- Changes saved immediately
- If status changed, activity timeline updated
- Real-time sync to all users viewing the board

---

## CSV Import System

![Screenshot: CSV Import Flow](./screenshots/csv-import-flow.png)

The CSV Import system enables bulk lead imports with intelligent field mapping and validation.

**Components:**
- `CSVUploadDialog.tsx` (Step 1)
- `CSVFieldMappingDialog.tsx` (Step 2)

### Step 1: File Upload

#### Supported Formats
- CSV (.csv)
- Comma-separated values
- UTF-8 encoding recommended
- Headers required in first row

#### Upload Methods
1. **Drag and Drop**: Drag CSV file into the dashed upload zone
2. **File Browser**: Click "Browse files" to select from computer

#### File Validation
- Maximum file size: 10MB
- Checks for valid CSV structure
- Previews first 5 rows
- Shows total row count

```typescript
// Upload button
<Button
  variant="contained"
  startIcon={<UploadFileIcon />}
  onClick={() => setOpenCSVDialog(true)}
>
  Import CSV
</Button>
```

### Step 2: Field Mapping

![Screenshot: Field Mapping](./screenshots/field-mapping.png)

#### Layout

The field mapping interface uses a **horizontal, left-to-right layout**:

```
┌────────────────────────────────────────────────────────┐
│  CSV Column: Company name            [Dropdown ▼]      │
│  Sample values: Acme Inc, TechCorp                     │
└────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────┐
│  CSV Column: Contact Email           [Dropdown ▼]      │
│  Sample values: john@acme.com, jane@techcorp.com       │
└────────────────────────────────────────────────────────┘
```

**Left Side (60%):** CSV column name + sample values
**Right Side (40%):** Dropdown to select CRM field mapping

#### Auto-Detection

The system automatically detects common field names:

| CSV Header (case-insensitive) | Auto-Maps To |
|-------------------------------|--------------|
| name, lead name, full name | Name |
| email, email address | Email |
| company, company name, organization | Company |
| phone, phone number, telephone | Phone |
| status, stage, pipeline stage | Status |

All other columns default to "Skip this field"

#### Mapping Options

Each CSV column can be mapped to:
- **Lead Name (Required)** - Must map exactly one column
- **Email** - Optional
- **Company (Required)** - Must map exactly one column
- **Phone** - Optional
- **Pipeline Stage** - Optional
- **Skip this field** - Ignores this column (unless auto-create enabled)

#### Custom Field Auto-Creation

**Checkbox:** "Auto-create custom fields for unmapped columns"

When **enabled** (default):
- Unmapped columns (set to "Skip") become custom fields
- Custom field name = CSV column name
- Values stored in lead.customFields object
- Visible on lead cards if configured

When **disabled**:
- Only mapped fields are imported
- Unmapped columns are completely ignored

#### Default Pipeline Stage

**Dropdown:** Select which stage imported leads start in

Options:
- New Lead (default)
- Qualified
- Contacted
- Follow up
- Won
- Lost

### Import Process

#### Validation

Before import begins:
- **Required**: At least one column mapped to "Name"
- **Required**: At least one column mapped to "Company"
- Error displayed if validation fails

#### Progress Indicator

During import:
- Progress bar shows completion percentage
- Text: "Processing X of Y rows"
- Circular spinner
- Cannot be cancelled once started

```
Importing leads...
Processing 45 of 150 rows
[████████████████░░░░░░░░░░] 30%
```

#### Duplicate Detection

Duplicates are detected by **email address**:
- If email matches existing lead → Skip (counted as duplicate)
- If email blank or no match → Import

### Import Results

![Screenshot: Import Results](./screenshots/import-results.png)

#### Success Summary

```
✓ Import Complete

✓ 145 leads imported successfully
ℹ 12 custom fields created
⚠ 5 duplicates skipped
❌ 3 failed
```

#### Result Breakdown

| Icon | Type | Description |
|------|------|-------------|
| ✓ | Success | Leads successfully imported |
| ℹ | Info | Custom fields created |
| ⚠ | Warning | Duplicates skipped (email exists) |
| ❌ | Error | Rows that failed validation |

#### Error Details

If errors occurred, an expandable section shows:
- First 10 errors
- Format: "Row 5: Missing required field 'Company'"
- Link to "Download error report" if more than 10 errors

---

## Filtering & Search

![Screenshot: Filter Panel](./screenshots/filter-panel.png)

The filtering system provides multi-dimensional lead filtering with real-time updates.

**Component:** `CollapsibleFilterBar.tsx`
**Location:** Top of CRM Board/Table

### Filter Types

#### 1. Search Filter
**Type:** Text input
**Searches:** Name, Email, Company (case-insensitive)
**Behavior:** Real-time as you type (300ms debounce)

```typescript
<TextField
  placeholder="Search leads..."
  value={searchText}
  onChange={(e) => setSearchText(e.target.value)}
  InputProps={{
    startAdornment: <SearchIcon />
  }}
/>
```

#### 2. Status Filter
**Type:** Multi-select dropdown
**Options:** All pipeline stages
**Behavior:** Shows leads matching ANY selected status

```
Filter by Status  ▼
☐ New Lead
☑ Qualified
☑ Contacted
☐ Follow up
☐ Won
☐ Lost
```

#### 3. Company Filter
**Type:** Autocomplete dropdown
**Options:** All companies with leads
**Behavior:** Shows leads from selected companies only

#### 4. Owner Filter
**Type:** Multi-select dropdown
**Options:** All team members
**Behavior:** Shows leads assigned to selected users

#### 5. Month Filter
**Type:** Month/Year picker
**Filters by:** Lead creation date
**Behavior:** Shows leads created in selected month

#### 6. Dynamic Field Filters
**Type:** Auto-generated based on custom fields
**Example:** If custom field "Industry", shows "Filter by Industry"

### Active Filters Display

When filters are applied, they appear as **chips** below the filter panel:

```
Active Filters:  [Status: Qualified ×]  [Company: Acme Inc ×]  [Clear All]
```

Click **×** on a chip to remove that filter
Click **Clear All** to reset all filters

### Filter Behavior

**Combination:** Filters are combined with AND logic
- Status OR Status OR Status (within status filter)
- AND Company
- AND Owner
- AND Month
- AND Search text

**Example:**
```
Status: [Qualified OR Contacted]
AND Company: Acme Inc
AND Search: "john"

Results: Leads that are (Qualified OR Contacted)
         AND at Acme Inc
         AND have "john" in name/email
```

### Filter Persistence

- Filters persist when switching between Board/Table views
- Filters reset when navigating away from CRM
- Search text clears when you click the clear button

### Performance

- Filters are applied client-side for <500 leads
- Server-side filtering for 500+ leads
- Debounced search prevents excessive filtering

---

## Apollo.io Integration

![Screenshot: Apollo Integration](./screenshots/apollo-integration.png)

Apollo.io integration provides powerful contact enrichment and lead discovery capabilities.

**Service:** `apolloService.ts`
**Documentation:** `src/services/api/apolloService.ts`

### Overview

Apollo.io is a B2B contact database with 250M+ contacts. The integration provides two main features:

1. **Email Enrichment** - Find email addresses for known contacts
2. **People Search** - Discover new leads by job title and company

### Email Enrichment (fetchEmail)

#### Purpose
Automatically find and populate email addresses (and phone numbers) for leads when you only have their name and company.

#### Cost
**1 Apollo credit** per successful match

#### How It Works

**Matching Strategy:**
1. **Primary**: LinkedIn URL (most accurate, ~95% match rate)
2. **Fallback**: First Name + Last Name + Company Name (~70% match rate)

**API Endpoint:** `POST https://api.apollo.io/api/v1/people/match`

#### Integration Points

**1. Lead Dialog** (during manual creation)
- Appears when email field is empty
- Requires Name + Company filled
- Button text: "Get email from Apollo.io (costs 1 credit)"

**2. Programmatic Usage**
```typescript
import { apolloService } from './services/api/apolloService';

const result = await apolloService.fetchEmail({
  firstName: 'John',
  lastName: 'Doe',
  companyName: 'Acme Inc',
  linkedinUrl: 'https://linkedin.com/in/johndoe' // optional
}, process.env.REACT_APP_APOLLO_API_KEY!);

if (result.matched) {
  console.log(result.email);      // john.doe@acme.com
  console.log(result.phone);      // +1-555-0123
  console.log(result.title);      // VP of Marketing
  console.log(result.linkedinUrl); // https://linkedin.com/in/johndoe
}
```

#### Response Data

**On Success:**
```typescript
{
  email: "john.doe@acme.com",
  phone: "+1-555-0123",
  linkedinUrl: "https://linkedin.com/in/johndoe",
  title: "VP of Marketing",
  companyName: "Acme Inc",
  companyWebsite: "https://acme.com",
  matched: true,
  costInfo: {
    credits: 1,
    model: "apollo-people-match",
    timestamp: Date
  }
}
```

**On Failure:**
```typescript
{
  email: null,
  phone: null,
  linkedinUrl: null,
  title: null,
  companyName: null,
  companyWebsite: null,
  matched: false,
  error: "No match found for the provided information"
}
```

#### Error Handling

| Error | Status | Message |
|-------|--------|---------|
| Rate limit | 429 | "Rate limit exceeded. Please try again later." |
| Invalid API key | 401/403 | "Invalid Apollo API key. Please check your REACT_APP_APOLLO_API_KEY." |
| No match | 200 | "No match found for the provided information" |
| Network error | - | "Apollo API error: [details]" |

### People Search (searchPeople)

#### Purpose
Bulk lead discovery by searching for people by job title, company, location, and other criteria.

#### Cost
Credits vary based on results (typically 1 credit per contact with revealed email)

#### Use Cases
- Find all CMOs at Fortune 500 companies
- Discover Developer Advocates in the SF Bay Area
- Build targeted outreach lists by job title and company

#### How It Works

**API Endpoint:** `POST https://api.apollo.io/api/v1/mixed_people/search`

**Search Parameters:**
- `companyName` - Filter by organization
- `jobTitles` - Array of job titles to match
- `locations` - Geographic locations
- `seniorities` - Seniority levels (e.g., "director", "vp", "c_suite")
- `keywords` - Keyword search
- `page`, `pageSize` - Pagination (max 100 per page)

#### Example Usage

```typescript
const results = await apolloService.searchPeople({
  companyName: 'Acme Inc',
  jobTitles: ['CMO', 'VP Marketing', 'Director of Marketing'],
  page: 1,
  pageSize: 25
}, apiKey);

if (results.success) {
  console.log(`Found ${results.people.length} marketing leaders`);

  results.people.forEach(person => {
    console.log(`${person.name} - ${person.title}`);
    console.log(`Email: ${person.email}`);
    console.log(`Phone: ${person.phone}`);
  });

  // Pagination info
  console.log(`Page ${results.pagination.currentPage} of ${results.pagination.totalPages}`);
  console.log(`${results.pagination.totalResults} total results`);
}
```

#### Response Data

```typescript
{
  people: [
    {
      id: "abc123",
      firstName: "Jane",
      lastName: "Smith",
      name: "Jane Smith",
      email: "jane.smith@acme.com",
      phone: "+1-555-0456",
      linkedinUrl: "https://linkedin.com/in/janesmith",
      title: "VP of Marketing",
      companyName: "Acme Inc",
      companyWebsite: "https://acme.com",
      photoUrl: "https://...",
      city: "San Francisco",
      state: "CA",
      country: "US"
    },
    // ... more results
  ],
  pagination: {
    currentPage: 1,
    pageSize: 25,
    totalResults: 150,
    totalPages: 6
  },
  success: true,
  costInfo: {
    credits: 25,  // Estimated
    model: "apollo-people-search",
    timestamp: Date
  }
}
```

### Environment Setup

#### Required Environment Variable

```bash
# .env file
REACT_APP_APOLLO_API_KEY="your-apollo-api-key-here"
```

#### Getting an API Key

1. Sign up at https://app.apollo.io
2. Navigate to Settings → Integrations → API
3. Copy your API key
4. Add to `.env` file (never commit to Git!)

### Best Practices

**Email Enrichment:**
- Use when you have name + company but missing email
- Prefer LinkedIn URL when available (higher accuracy)
- Check credit balance before bulk operations

**People Search:**
- Use specific job titles for better results
- Combine with company name for targeted searches
- Implement pagination for large result sets
- Check for duplicates before importing results

**Cost Management:**
- Monitor credit usage in Apollo dashboard
- Email enrichment: 1 credit per match
- People search: ~1 credit per email revealed
- Set up alerts for low credit balance

---

## Core User Journeys

### Journey 1: Manual Lead Creation with Email Enrichment

**Goal:** Add a new lead and enrich their contact information using Apollo.io

**Steps:**

1. **Open Lead Dialog**
   - Click the floating "+" button (bottom-right)
   - Or click "Add Lead" button in toolbar
   - Dialog opens in Create mode

2. **Enter Basic Information**
   ```
   Name: John Smith ✓ (required)
   Company: TechCorp Industries ✓ (required)
   Email: [leave blank]
   Phone: [leave blank]
   ```

3. **Fetch Email from Apollo**
   - "Get email from Apollo.io" button appears
   - Click button
   - Wait 2-3 seconds for API call

4. **Review Enriched Data**
   ```
   ✓ Email found: john.smith@techcorp.com (1 credit used)

   Name: John Smith
   Email: john.smith@techcorp.com ← Auto-filled
   Phone: +1-555-0789 ← Auto-filled
   Company: TechCorp Industries
   ```

5. **Select Pipeline Stage** (optional)
   - Default: "New Lead"
   - Change if lead should start elsewhere

6. **Save Lead**
   - Click "Create" button
   - Lead appears immediately in selected stage column
   - Success message: "Lead created successfully"

**Outcome:**
- New lead created with verified email
- Time in state starts tracking
- Activity timeline initialized
- 1 Apollo credit used

---

### Journey 2: Bulk CSV Import

**Goal:** Import 150 leads from a CSV file

**Steps:**

1. **Prepare CSV File**
   ```csv
   Full Name,Company,Email,Phone Number,Title
   John Doe,Acme Inc,john@acme.com,555-0123,VP Sales
   Jane Smith,TechCorp,,555-0456,CMO
   ...
   ```

   **Best Practices:**
   - Include header row
   - Use UTF-8 encoding
   - Name + Company are minimum required

2. **Open Import Dialog**
   - Click "Import CSV" button in toolbar
   - CSV Upload Dialog opens

3. **Upload File**
   - **Option A**: Drag CSV file into upload zone
   - **Option B**: Click "Browse files" and select file
   - File validates
   - Preview shows first 5 rows
   - Count shows: "150 rows detected"

4. **Review Preview**
   ```
   Preview (first 5 rows):

   Full Name        Company      Email             Phone
   John Doe         Acme Inc     john@acme.com     555-0123
   Jane Smith       TechCorp                       555-0456
   ...
   ```

   - Check data looks correct
   - Verify headers detected properly
   - Click "Next" to continue

5. **Map CSV Fields**

   Field Mapping Dialog opens with horizontal layout:

   ```
   CSV Column: Full Name          [Lead Name (Required) ▼]
   Sample: John Doe, Jane Smith

   CSV Column: Company            [Company (Required) ▼]
   Sample: Acme Inc, TechCorp

   CSV Column: Email              [Email ▼]
   Sample: john@acme.com, (blank)

   CSV Column: Phone Number       [Phone ▼]
   Sample: 555-0123, 555-0456

   CSV Column: Title              [Skip this field ▼]
   Sample: VP Sales, CMO
   ```

   **Auto-Detection:** "Full Name" and "Company" already mapped correctly

   **Manual Adjustments:**
   - "Phone Number" → Change to "Phone"
   - "Title" → Leave as "Skip" (will become custom field)

6. **Configure Import Settings**

   ```
   Default Pipeline Stage: [New Lead ▼]
   ☑ Auto-create custom fields for unmapped columns
   ```

   - "Title" will become a custom field (auto-create enabled)
   - All leads will start in "New Lead" stage

7. **Validate & Import**

   - Click "Import 150 Leads" button
   - Validation checks: ✓ Name mapped, ✓ Company mapped
   - Import begins

   ```
   Importing leads...
   Processing 75 of 150 rows
   [████████████████░░░░░░░░░░] 50%
   ```

8. **Review Results**

   ```
   ✓ Import Complete

   ✓ 145 leads imported successfully
   ℹ 1 custom field created ("Title")
   ⚠ 3 duplicates skipped
   ❌ 2 failed
   ```

   **Duplicates:**
   - 3 emails matched existing leads
   - Skipped to prevent duplicates

   **Failures:**
   - Row 47: Missing required field "Company"
   - Row 89: Invalid email format

9. **Return to Board**
   - Click "Done"
   - Board refreshes
   - "New Lead" column now shows 145 new cards
   - Custom field "Title" visible on cards

**Outcome:**
- 145 new leads in pipeline
- 1 new custom field created
- 3 duplicates prevented
- 2 errors to fix in source CSV
- Total time: ~2 minutes

---

### Journey 3: Managing Leads Through the Pipeline

**Goal:** Progress a qualified lead through the pipeline to Won

**Steps:**

1. **Filter to Qualified Leads**
   - Open filter panel
   - Select "Status: Qualified"
   - 12 qualified leads appear

2. **Select Lead to Contact**
   - Identify: "Sarah Johnson - DataFlow Systems"
   - Click card to view details
   - Email: sarah.j@dataflow.com
   - Phone: +1-555-0234
   - Time in Qualified: 5 days

3. **Make Initial Contact**
   - Call Sarah (external to CRM)
   - Conversation goes well, schedule follow-up

4. **Update Status to Contacted**
   - **Option A**: Drag card from "Qualified" to "Contacted" column
   - **Option B**: Open lead → Change Status dropdown → Save
   - Card moves to Contacted column
   - Activity timeline updated:
     ```
     [Qualified] → [Contacted]
     Oct 21, 2025, 2:30 PM
     Changed by: You
     ```

5. **Wait for Follow-up**
   - 3 days pass
   - Review Contacted column
   - Sarah's card shows "Time in state: 3 days"

6. **Follow-up Call**
   - Second call scheduled (external)
   - Sarah requests proposal
   - Need another touchpoint

7. **Move to Follow Up**
   - Drag Sarah's card to "Follow up" column
   - Add note in Activity tab: "Sent proposal, waiting for review"
   - Set reminder for 7 days

8. **Proposal Accepted**
   - Sarah accepts proposal
   - Deal is closed!

9. **Move to Won**
   - Drag card to "Won" column
   - Success! 🎉
   - Activity timeline shows complete journey:
     ```
     [Created] → New Lead (7 days ago)
     [New Lead] → Qualified (5 days ago)
     [Qualified] → Contacted (3 days ago)
     [Contacted] → Follow up (2 hours ago)
     [Follow up] → Won (just now)
     ```

**Outcome:**
- Lead successfully converted
- Complete activity history preserved
- Total sales cycle: 7 days
- Time tracking per stage available for analysis

---

### Journey 4: Using Filters to Find Specific Leads

**Goal:** Find all leads at "Acme Inc" that are currently being contacted

**Steps:**

1. **Open CRM Board**
   - Navigate to /crm
   - All leads visible (200+ leads)

2. **Apply Company Filter**
   - Click "Filter" button in toolbar
   - Filter panel expands
   - Select "Company" dropdown
   - Type "Acme" in search
   - Select "Acme Inc"
   - Board updates to show only Acme Inc leads (15 leads)

3. **Apply Status Filter**
   - In same filter panel
   - Select "Status" dropdown
   - Check "Contacted"
   - Check "Follow up" (for leads in active conversation)
   - Board updates to show 6 leads

4. **Review Active Filters**
   ```
   Active Filters:
   [Company: Acme Inc ×]  [Status: Contacted, Follow up ×]  [Clear All]
   ```

5. **Switch to Table View**
   - Click "Table" button in view toggle
   - Same 6 leads shown in table format
   - Easier to compare details side-by-side

6. **Sort by Time in State**
   - Click "Time in State" column header
   - Sorts descending (longest first)
   - Identify: "Mike Chen" has been in Contacted for 14 days
   - May need immediate follow-up!

7. **Take Action**
   - Click edit icon on Mike's row
   - Review activity history
   - Add note: "Priority follow-up needed"
   - Assign to team member for immediate outreach

8. **Clear Filters**
   - Click "Clear All" in active filters bar
   - Or click × on individual filter chips
   - Board returns to showing all leads

**Outcome:**
- Quickly identified leads requiring attention
- Found potential at-risk opportunity (14 days in Contacted)
- Assigned for follow-up action
- Prevented lead from going cold

---

## Component Reference

### Quick Component Directory

| Component | Purpose | Location | Props |
|-----------|---------|----------|-------|
| **CRMBoard** | Main pipeline board view | `/crm` | - |
| **CRMLeadsTable** | Table view of leads | `/crm?view=table` | `leads`, `onEdit`, `onDelete` |
| **LeadDialog** | Create/edit lead modal | Modal overlay | `mode`, `lead?`, `open`, `onClose`, `onSave` |
| **LeadCard** | Individual lead card in board | Board columns | `lead`, `onDragStart`, `onDragEnd`, `onClick` |
| **LeadColumn** | Pipeline stage column | Board view | `stage`, `leads`, `onDrop` |
| **ViewToggle** | Switch Board/Table | Top toolbar | `view`, `onViewChange` |
| **CSVUploadDialog** | CSV file upload (Step 1) | Modal | `open`, `onClose`, `onNext` |
| **CSVFieldMappingDialog** | CSV field mapping (Step 2) | Modal | `open`, `data`, `headers`, `onClose`, `onBack` |
| **CollapsibleFilterBar** | Main filter panel | Top of CRM | `filters`, `onFilterChange` |
| **StatusFilter** | Filter by pipeline stage | Filter panel | `selectedStatuses`, `onChange` |
| **CompanyFilter** | Filter by company | Filter panel | `selectedCompanies`, `onChange` |
| **LeadOwnerFilter** | Filter by assigned user | Filter panel | `selectedOwners`, `onChange` |
| **MonthFilter** | Filter by creation month | Filter panel | `selectedMonth`, `onChange` |
| **SearchFilter** | Text search | Filter panel | `searchText`, `onChange` |
| **ActiveFiltersBar** | Display active filter chips | Below filters | `filters`, `onRemoveFilter`, `onClearAll` |

### Service Functions

| Service | Function | Purpose | Cost |
|---------|----------|---------|------|
| **apolloService** | `fetchEmail()` | Enrich single contact email | 1 credit |
| **apolloService** | `enrichEmail()` | Advanced enrichment with full data | 1 credit |
| **apolloService** | `searchPeople()` | Bulk lead discovery | Variable |
| **leadsService** | `subscribeToLeads()` | Real-time lead subscription | - |
| **leadsService** | `createLead()` | Create new lead | - |
| **leadsService** | `updateLeadStatus()` | Change lead stage | - |
| **leadsService** | `deleteLead()` | Remove lead | - |
| **csvImportService** | `importLeadsFromCSV()` | Bulk CSV import | - |

---

## Best Practices & Tips

### Email Enrichment

**When to Use Apollo:**
- ✅ Have name and company, missing email
- ✅ LinkedIn URL available (highest accuracy)
- ✅ B2B contacts (Apollo's strength)
- ✅ Decision-makers at known companies

**When to Skip:**
- ❌ Very small companies (<10 employees)
- ❌ Generic names (John Smith at Google)
- ❌ B2C contacts (not in Apollo database)
- ❌ Low credit balance (conserve for high-value leads)

**Best Practice:**
```typescript
// Enrich manually-entered leads later in bulk
const leadsNeedingEmail = leads.filter(l => !l.email && l.name && l.company);

for (const lead of leadsNeedingEmail) {
  const result = await apolloService.fetchEmail({...});
  if (result.matched) {
    await updateLead(lead.id, { email: result.email });
  }
  await delay(1000); // Rate limiting: 1 request/second
}
```

### CSV Import

**CSV Formatting Tips:**

**Good CSV:**
```csv
Name,Company,Email,Phone
John Doe,Acme Inc,john@acme.com,555-0123
Jane Smith,TechCorp,jane@techcorp.com,555-0456
```

**Common Issues:**
```csv
# ❌ No headers
John Doe,Acme Inc,john@acme.com

# ❌ Inconsistent columns
John Doe,Acme Inc
Jane Smith,TechCorp,jane@techcorp.com,555-0456

# ❌ Special characters unescaped
John "The Pro" Doe,Acme Inc  # Use: "John ""The Pro"" Doe"
```

**Best Practices:**
- Always include header row
- Use UTF-8 encoding
- Quote fields with commas: `"Doe, John"`
- Name and Company minimum required
- Validate data before upload
- Keep files under 10MB (split if larger)

### Filtering Strategies

**Common Filter Combinations:**

**Find Stale Leads:**
```
Status: Contacted
+ Time in State: Sort descending
→ Identify leads stuck in Contacted for too long
```

**Monthly Performance:**
```
Month: October 2025
+ Status: Won
→ See all deals closed this month
```

**Team Member Review:**
```
Owner: [Your Name]
+ Status: Follow up
→ Your personal follow-up queue
```

**Company-Specific Campaigns:**
```
Company: [Target Company]
+ Status: New Lead OR Qualified
→ All active opportunities at specific account
```

### Board vs Table View

**Use Board When:**
- Managing daily workflow (drag-drop is fast)
- Presenting pipeline to stakeholders
- Visualizing stage distribution
- Getting "big picture" view

**Use Table When:**
- Comparing many leads side-by-side
- Bulk editing/status changes
- Exporting data
- Searching for specific information
- You prefer spreadsheet interfaces

**Pro Tip:**
```typescript
// Keyboard shortcut to toggle views
if (event.key === 'v' && event.metaKey) {
  toggleView();
}
```

### Lead Naming Conventions

**Recommended Format:**
```
First Last         ✓ Good (clean, professional)
FirstName LastName ✓ Acceptable
JOHN DOE           ✗ Avoid (hard to read)
john doe           ✗ Avoid (looks unprofessional)
J. Doe             ✗ Avoid (incomplete)
```

**Company Names:**
```
Acme Inc           ✓ Good (official name)
Acme               ✓ Acceptable (if unambiguous)
acme inc           ✗ Avoid (inconsistent with others)
ACME INC           ✗ Avoid (all caps)
```

**Why It Matters:**
- Consistent naming improves searchability
- Professional appearance in exports/reports
- Better Apollo match rates with proper capitalization

---

## Troubleshooting

### Apollo API Issues

#### "Invalid Apollo API key"

**Symptoms:**
- Error message in Lead Dialog
- Email enrichment fails immediately
- Status: 401 or 403

**Solutions:**
1. Check `.env` file has `REACT_APP_APOLLO_API_KEY`
2. Verify API key is correct (no extra spaces)
3. Restart development server after changing `.env`
4. Check API key is active in Apollo dashboard
5. Verify API key has sufficient permissions

```bash
# Check environment variable is loaded
console.log(process.env.REACT_APP_APOLLO_API_KEY);
// Should show: "your-api-key-here"
// If undefined, .env not loaded correctly
```

#### "Rate limit exceeded"

**Symptoms:**
- Error after multiple rapid API calls
- Status: 429

**Solutions:**
1. Wait 1 minute before retrying
2. Implement delay between bulk operations:
   ```typescript
   await delay(1000); // 1 second between calls
   ```
3. Check Apollo dashboard for rate limit info
4. Upgrade Apollo plan if hitting limits frequently

#### "No email found"

**Symptoms:**
- API returns success but matched: false
- No error, just no results

**Common Causes:**
1. **Contact not in Apollo database** (most common)
   - Apollo has 250M contacts, not everyone
   - Try alternative data sources
2. **Name/Company mismatch**
   - "Bob" vs "Robert"
   - "Acme Inc" vs "Acme Corporation"
   - Try variations
3. **Very new company/role**
   - Apollo data updated monthly
   - Recently hired people may not appear
4. **Incorrect company name**
   - Verify company name is exact match
   - Check company's official website

**Solutions:**
- Try with LinkedIn URL if available (90%+ accuracy)
- Manually search Apollo.io to verify contact exists
- Use alternative data sources (Hunter.io, RocketReach)
- Fall back to manual research (LinkedIn, company website)

### CSV Import Problems

#### "No header row detected"

**Cause:** CSV file missing headers or has data in first row

**Solution:**
1. Open CSV in text editor
2. Ensure first row contains column names:
   ```csv
   Name,Company,Email     ← Must have this
   John Doe,Acme Inc,john@acme.com
   ```
3. If data in row 1, insert new row above with headers

#### "Please map the Name field (required)"

**Cause:** No CSV column mapped to "Lead Name"

**Solution:**
1. In Field Mapping dialog, find column with person names
2. Change dropdown from "Skip" to "Lead Name (Required)"
3. Try importing again

#### "Please map the Company field (required)"

**Cause:** No CSV column mapped to "Company"

**Solution:**
1. Find column with company/organization names
2. Map to "Company (Required)"
3. If no company column exists, you cannot import (required field)

#### Import shows "X failed"

**Check Error Details:**
- Scroll to error section in results
- Common errors:
  - "Row 45: Missing required field 'Name'" - Blank name cell
  - "Row 67: Missing required field 'Company'" - Blank company cell
  - "Row 89: Invalid email format" - Email like "notanemail"

**Solutions:**
1. Fix issues in source CSV file
2. Re-import only failed rows
3. Or manually create failed leads

### Drag-and-Drop Issues

#### Lead card won't drag

**Possible Causes:**
1. **Browser compatibility** - Use Chrome/Firefox/Safari (not IE)
2. **Touch device** - Drag-drop doesn't work on mobile (use table view)
3. **Permission issue** - User may not have edit rights

**Solutions:**
- Use Edit button instead of drag-drop
- Switch to Table view for status changes
- Check user permissions

#### Card drags but doesn't drop

**Cause:** JavaScript error or network issue

**Solutions:**
1. Check browser console for errors
2. Refresh page
3. Check internet connection (Firebase sync required)
4. Try using status dropdown in edit dialog instead

### Filter Not Working

#### Filters applied but no results

**Causes:**
1. **Too restrictive** - AND logic means all filters must match
2. **No leads match criteria** - Legitimate empty result

**Solutions:**
- Click "Clear All" filters
- Apply filters one at a time to see which is too restrictive
- Verify leads exist that should match (check without filters)

#### Search not finding known lead

**Causes:**
1. **Typo** in search term
2. **Search delay** - Wait for 300ms debounce
3. **Case sensitivity** (rare - should be case-insensitive)

**Solutions:**
- Try partial name: "john" instead of "john doe"
- Search by email or company instead
- Check spelling
- Clear search and try again

### General Issues

#### Changes not syncing to other users

**Cause:** Firebase real-time sync issue

**Solutions:**
1. Check internet connection
2. Check Firebase connection status
3. Refresh page
4. Check Firebase rules allow read/write

#### Page loading slowly

**Causes:**
1. **Many leads** (500+) - Client-side filtering slow
2. **Many custom fields** - More data to render
3. **Slow internet** - Firebase data transfer

**Solutions:**
- Use server-side filtering (automatic for 500+ leads)
- Reduce number of custom fields shown on cards
- Use Table view (lighter rendering)
- Implement pagination (future enhancement)

---

## Appendix: Screenshots Reference

The following screenshots should be captured for the complete documentation:

1. **board-view.png** - Full CRM board with all 6 stages and sample leads
2. **table-view.png** - Table view showing lead grid
3. **lead-dialog.png** - Lead dialog in create mode with Apollo button
4. **apollo-button.png** - Close-up of "Get email from Apollo.io" button
5. **activity-timeline.png** - Activity tab showing status change history
6. **csv-import-flow.png** - Both upload and mapping dialogs side-by-side
7. **field-mapping.png** - Field mapping dialog with horizontal layout
8. **import-results.png** - Import results summary with success/errors
9. **filter-panel.png** - Expanded filter panel with all filter types
10. **apollo-integration.png** - Apollo enrichment success message
11. **active-filters.png** - Active filter chips display
12. **drag-drop.png** - Lead being dragged between columns

---

**End of Documentation**

For questions or issues not covered here, please contact the development team or file an issue in the project repository.

**Last Updated:** October 21, 2025
**Version:** 1.0
**Maintainer:** Marketing CRM Team
