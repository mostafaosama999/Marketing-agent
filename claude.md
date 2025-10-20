# Marketing Agent - Technical Documentation

This document covers the tricky implementation details, common pitfalls, and solutions for the Marketing CRM application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication System](#authentication-system)
3. [Companies and Leads Relationship](#companies-and-leads-relationship)
4. [Custom Fields System](#custom-fields-system)
5. [CSV Import/Export](#csv-importexport)
6. [Drag and Drop Implementation](#drag-and-drop-implementation)
7. [Deployment Configuration](#deployment-configuration)
8. [Common Errors and Solutions](#common-errors-and-solutions)

---

## Architecture Overview

### Project Structure

```
/
├── firebase.json              # Firebase configuration
├── firestore.rules            # Firestore security rules
├── firestore.indexes.json     # Firestore indexes
├── frontend/                  # React application (deploy this to DigitalOcean)
│   ├── src/
│   │   ├── app/              # App-wide configurations
│   │   ├── components/       # Shared components
│   │   ├── contexts/         # React Context providers
│   │   ├── features/         # Feature modules (CRM, analytics, etc.)
│   │   ├── pages/            # Top-level pages
│   │   └── services/         # Business logic and Firebase integration
│   ├── public/               # Static assets
│   └── package.json          # Frontend dependencies
└── functions/                 # Firebase Cloud Functions (backend)
```

### Technology Stack

- **Frontend**: React 19, TypeScript, Material-UI v7
- **State Management**: React Context API
- **Backend**: Firebase (Authentication, Firestore)
- **Build Tool**: react-scripts (Create React App)
- **Drag & Drop**: @dnd-kit
- **CSV Parsing**: PapaParse
- **Deployment**: DigitalOcean App Platform

---

## Authentication System

### Overview

The app uses **Firebase Authentication** for user login combined with **Firestore** for user profile storage. This dual-storage approach allows role-based access control.

### Implementation Details

#### Key Files

- `src/services/authService.ts` - Firebase Auth integration
- `src/contexts/AuthContext.tsx` - Global auth state management
- `src/components/auth/LoginDialog.tsx` - Login UI
- `src/components/auth/ProtectedRoute.tsx` - Route protection

#### Critical Requirements

**1. UID Matching Requirement**

The UID from Firebase Authentication **MUST** exactly match the document ID in Firestore:

```
Firebase Auth User UID: "abc123xyz"
                        ↓
Firestore Document: users/abc123xyz
```

**Why this matters**: The app fetches user profiles using `getUserProfile(uid)` which queries Firestore at `users/{uid}`. If the document ID doesn't match, login will fail.

**2. Dual Storage Setup**

Every user must exist in TWO places:

1. **Firebase Authentication Console**
   - Navigate to: Firebase Console → Authentication → Users
   - Add user with email and password
   - Copy the generated UID

2. **Firestore Database**
   - Navigate to: Firebase Console → Firestore Database
   - Create document at: `users/{paste-uid-here}`
   - Required fields:
     ```javascript
     {
       email: "user@domain.com",
       displayName: "User Name",
       role: "Manager",
       department: "Marketing"
     }
     ```

### Setup Steps

#### Step 1: Enable Email/Password Authentication

1. Open Firebase Console
2. Go to Authentication → Sign-in method
3. Enable "Email/Password" provider
4. Click Save

#### Step 2: Create a User

**In Firebase Authentication:**
1. Go to Authentication → Users tab
2. Click "Add user"
3. Enter email and password
4. Click "Add user"
5. **COPY THE UID** from the created user row

**In Firestore:**
1. Go to Firestore Database
2. Click "Start collection" or navigate to existing `users` collection
3. Document ID: **Paste the UID you copied**
4. Add fields:
   - `email` (string): The user's email
   - `displayName` (string): Full name
   - `role` (string): Job title
   - `department` (string): Department name
5. Click Save

### Authentication Flow

```
User enters credentials
         ↓
LoginDialog.tsx calls authContext.signIn()
         ↓
AuthContext calls signInWithEmail() [authService.ts]
         ↓
Firebase Auth validates credentials and returns UID
         ↓
getUserProfile(uid) fetches from Firestore users/{uid}
         ↓
Profile exists? → Set user state → User logged in
Profile missing? → Sign out + error → Login fails
```

### Common Pitfalls

**❌ Error: "User profile not found in database"**

**Cause**: User exists in Firebase Auth but not in Firestore

**Solution**: Create the matching Firestore document at `users/{uid}` with all required fields

---

**❌ Error: "400 Bad Request" from Firebase Auth API**

**Cause**: Email/Password authentication provider not enabled

**Solution**: Enable it in Firebase Console → Authentication → Sign-in method

---

**❌ Error: "Invalid email or password" (but credentials are correct)**

**Causes**:
1. User doesn't exist in Firebase Authentication
2. Password is incorrect
3. User account is disabled

**Solution**: Verify user exists in Firebase Console → Authentication → Users

---

## Companies and Leads Relationship

### Overview

The CRM uses a one-to-many relationship between Companies and Leads. Each company can have multiple leads, and leads are linked to companies through both a `companyId` (reference) and `companyName` (denormalized for performance).

### Data Model

**Companies Collection** (`companies`):
```javascript
{
  id: string,              // Auto-generated document ID
  name: string,            // Required, unique (case-insensitive)
  website?: string,
  industry?: string,
  description?: string,
  customFields?: Record<string, any>,
  createdAt: Date,
  updatedAt: Date,
  blogQualified?: boolean,
  blogQualificationData?: object,
  hasGeneratedIdeas?: boolean,
  // ... other fields
}
```

**Leads Collection** (`leads`):
```javascript
{
  id: string,              // Auto-generated document ID
  name: string,            // Required
  email: string,           // Required
  phone?: string,
  company: string,         // Legacy field - company name
  companyId: string,       // Reference to Company document
  companyName: string,     // Denormalized company name
  status: string,
  customFields?: Record<string, any>,
  createdAt: Date,
  updatedAt: Date,
  // ... other fields
}
```

### Key Features

#### 1. Auto-Create Companies

**Location**: `src/services/crmService.ts:89-108`, `src/services/companiesService.ts:189-210`

When creating or updating a lead with a company name that doesn't exist, the system automatically creates the company record:

```typescript
export async function createLead(leadData: LeadFormData): Promise<string> {
  // Get or create the company
  const company = await getOrCreateCompany(leadData.company);

  const leadsRef = collection(db, LEADS_COLLECTION);
  const docRef = await addDoc(leadsRef, {
    ...leadData,
    companyId: company.id,       // Store reference
    companyName: company.name,   // Denormalized for performance
    customFields: leadData.customFields || {},
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}
```

**How it works**:
1. User types company name in lead form (with Autocomplete)
2. System checks if company exists (case-insensitive)
3. If exists: Use existing company
4. If new: Create company automatically
5. Link lead to company via `companyId` and `companyName`

#### 2. Cascading Deletion

**Location**: `src/services/companiesService.ts:175-197`

When a company is deleted, **all associated leads are automatically deleted** to maintain referential integrity:

```typescript
export async function deleteCompany(companyId: string): Promise<void> {
  try {
    // First, find all leads associated with this company
    const leadsRef = collection(db, 'leads');
    const leadsQuery = query(leadsRef, where('companyId', '==', companyId));
    const leadsSnapshot = await getDocs(leadsQuery);

    // Delete all associated leads
    const deletePromises = leadsSnapshot.docs.map((leadDoc) =>
      deleteDoc(doc(db, 'leads', leadDoc.id))
    );
    await Promise.all(deletePromises);

    console.log(`Deleted ${leadsSnapshot.size} leads associated with company ${companyId}`);

    // Then delete the company
    const companyRef = doc(db, COMPANIES_COLLECTION, companyId);
    await deleteDoc(companyRef);
  } catch (error) {
    console.error('Error deleting company:', error);
    throw error;
  }
}
```

**Important Notes**:
- Cascading deletion happens for both single and bulk company deletion
- Users are warned in confirmation dialogs that leads will also be deleted
- Deletion is permanent and cannot be undone
- Batch operations use `Promise.all()` for optimal performance

**Location of warnings**: `src/features/crm/pages/CompaniesManagementPage.tsx:119`, `130`

#### 3. Reverse Auto-Delete (Lead to Company)

**Location**: `src/services/crmService.ts:177-208`

When a lead is deleted, the system checks if it's the last lead for that company. If so, the company is automatically deleted:

```typescript
export async function deleteLead(leadId: string): Promise<void> {
  try {
    // Get the lead first to find its companyId
    const leadRef = doc(db, LEADS_COLLECTION, leadId);
    const leadDoc = await getDoc(leadRef);

    if (!leadDoc.exists()) {
      console.warn('Lead not found:', leadId);
      return;
    }

    const leadData = leadDoc.data();
    const companyId = leadData.companyId;

    // Delete the lead
    await deleteDoc(leadRef);

    // If lead had a company, check if we should delete the company too
    if (companyId) {
      const remainingLeads = await countLeadsForCompany(companyId);

      if (remainingLeads === 0) {
        // This was the last lead for this company, delete the company
        await deleteCompany(companyId);
        console.log('Company auto-deleted (no remaining leads):', companyId);
      }
    }
  } catch (error) {
    console.error('Error deleting lead:', error);
    throw error;
  }
}
```

**Why this matters**: Prevents orphaned companies with no associated leads, keeping the database clean.

### Duplicate Prevention

**Companies**: Unique by name (case-insensitive)
- Check happens in `findCompanyByName()` before creation
- Users cannot create companies with duplicate names

**Leads**: Unique by name + company combination
- Configurable in CRM settings
- Can be disabled or adjusted based on business needs

### Common Patterns

**Creating a lead with new company**:
```typescript
const leadData = {
  name: "John Doe",
  email: "john@example.com",
  company: "New Company Inc" // Company doesn't exist yet
};

// System automatically:
// 1. Creates "New Company Inc" in companies collection
// 2. Links lead to new company via companyId
// 3. Stores denormalized companyName for performance
await createLead(leadData);
```

**Updating lead's company**:
```typescript
const updatedData = {
  company: "Different Company" // Changing to another company
};

// System automatically:
// 1. Gets or creates "Different Company"
// 2. Updates lead's companyId and companyName
// 3. Checks if old company should be deleted (if no remaining leads)
await updateLead(leadId, updatedData);
```

**Deleting a company**:
```typescript
// Deletes company AND all its leads
await deleteCompany(companyId);

// Example: Company has 5 leads
// Result: 1 company deleted + 5 leads deleted = 6 deletions total
```

### Best Practices

1. **Always use `getOrCreateCompany()`**: Don't manually create companies when creating/updating leads
2. **Use cascading deletion**: Let the system handle lead cleanup when deleting companies
3. **Warn users**: Always inform users about cascading operations in confirmation dialogs
4. **Denormalize company name**: Store both `companyId` (reference) and `companyName` (denormalized) for performance

---

## Custom Fields System

### Overview

The CRM supports dynamic custom fields that can be created, edited, and deleted. Fields have types (text, number, email, date, etc.) and can be shown/hidden in different views.

### Architecture

#### Key Files

- `src/app/types/customField.ts` - Type definitions
- `src/services/crmService.ts` - CRUD operations for custom fields
- `src/features/crm/components/CustomFieldsDialog.tsx` - UI for managing fields
- `src/services/typeDetectionService.ts` - Auto-detection of field types

#### Field Types

```typescript
type CustomFieldType =
  | 'text'      // Short text input
  | 'textarea'  // Multi-line text
  | 'number'    // Numeric input
  | 'email'     // Email validation
  | 'phone'     // Phone number
  | 'url'       // URL validation
  | 'date'      // Date picker
  | 'select'    // Dropdown (single choice)
  | 'radio'     // Radio buttons
  | 'checkbox'; // Multiple checkboxes
```

### Critical Implementation Details

#### 1. Firestore Undefined Values Bug

**Problem**: Firestore rejects documents with `undefined` field values.

**Error Message**:
```
FirebaseError: Function setDoc() called with invalid data.
Unsupported field value: undefined
```

**Cause**: Setting `options: undefined` for field types that don't need options.

**Solution**: Use conditional spread operator to only include `options` when needed:

```typescript
// ❌ WRONG - This will fail for text fields
const newField = {
  name: fieldName,
  type: 'text',
  options: undefined  // Firestore rejects this!
};

// ✅ CORRECT - Only include options for select/radio/checkbox
const newField = {
  name: fieldName,
  type: detectedType,
  ...(detectedType === 'select' || detectedType === 'radio' || detectedType === 'checkbox'
    ? { options: [] }
    : {}  // Don't include options field at all
  )
};
```

**Location**: `src/services/importService.ts:115-120`

#### 2. Options Field Input Bug

**Problem**: Users couldn't type commas in the Options text field.

**Original buggy code**:
```typescript
// ❌ This splits and rejoins on every keystroke!
<TextField
  value={field.options?.join(', ') || ''}
  onChange={(e) => {
    // Splits "test," into ["test"] immediately,
    // preventing typing the second comma
    updateField({
      options: e.target.value.split(',').map(s => s.trim())
    });
  }}
/>
```

**Solution**: Use separate state for raw text input:

```typescript
// ✅ Store raw text separately
const [optionsText, setOptionsText] = useState(field.options?.join(', ') || '');

<TextField
  value={optionsText}
  onChange={(e) => setOptionsText(e.target.value)}  // Just store the text
/>

// Only parse when saving:
const handleSave = () => {
  const options = optionsText.split(',').map(s => s.trim()).filter(Boolean);
  saveField({ ...field, options });
};
```

**Location**: `src/features/crm/components/CustomFieldsDialog.tsx:45-78`

#### 3. Editable Column Headers

**Implementation**: Click-to-edit functionality for custom field column names in the table view.

**Key details**:
- Shows edit icon on hover
- Opens Material UI Dialog (not inline editing)
- Updates both the label and Firestore in real-time
- Uses `EditableHeader` component

**Location**: `src/features/crm/components/TableView.tsx:45-98`

```typescript
const EditableHeader: React.FC<EditableHeaderProps> = ({ field, onSave }) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [label, setLabel] = useState(field.label);

  const handleSave = async () => {
    if (label.trim() && label !== field.label) {
      await onSave(field.id, { label: label.trim() });
    }
    setDialogOpen(false);
  };

  return (
    <>
      <Box
        onClick={() => setDialogOpen(true)}
        sx={{ cursor: 'pointer', '&:hover .edit-icon': { opacity: 1 } }}
      >
        <span>{field.label}</span>
        <EditOutlinedIcon className="edit-icon" />
      </Box>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        {/* Dialog content */}
      </Dialog>
    </>
  );
};
```

### Type Detection System

**Purpose**: Auto-detect field types when importing CSV with unmapped columns.

**Location**: `src/services/typeDetectionService.ts`

**Algorithm**:

```typescript
export function detectFieldType(values: string[]): CustomFieldType {
  const sampleValues = values.filter(v => v && v.trim() !== '').slice(0, 10);

  // Check numbers first (most specific)
  const allNumbers = sampleValues.every(v => !isNaN(parseFloat(v.trim())));
  if (allNumbers) return 'number';

  // Check dates
  const allDates = sampleValues.every(v => !isNaN(new Date(v.trim()).getTime()));
  if (allDates) return 'date';

  // Check URLs
  const urlPattern = /^https?:\/\//i;
  const allUrls = sampleValues.every(v => urlPattern.test(v.trim()));
  if (allUrls) return 'url';

  // Check text length
  const hasLongText = sampleValues.some(v => v.length > 100);
  if (hasLongText) return 'textarea';

  // Default to text
  return 'text';
}
```

**Key decisions**:
- Only samples first 10 non-empty values for performance
- Checks in order of specificity (number → date → URL → textarea → text)
- Conservative approach: defaults to 'text' when uncertain

---

## CSV Import/Export

### Overview

Users can import leads from CSV files with intelligent field mapping and duplicate detection. Unmapped columns can be automatically converted to custom fields.

### Architecture

#### Key Files

- `src/services/importService.ts` - Import logic and duplicate detection
- `src/services/exportService.ts` - CSV export
- `src/features/crm/components/FieldMappingDialog.tsx` - Map CSV columns to fields
- `src/services/typeDetectionService.ts` - Auto-detect field types for new columns

### Import Flow

```
User uploads CSV
         ↓
Parse CSV with PapaParse
         ↓
Show FieldMappingDialog
         ↓
User maps columns OR enables auto-create
         ↓
For unmapped columns with auto-create:
  - Detect field type from sample values
  - Create custom field in Firestore
  - Map CSV column to new custom field
         ↓
Import each row:
  - Check for duplicates
  - Skip if duplicate found
  - Create lead if unique
         ↓
Show ImportResult with stats
```

### Critical Implementation Details

#### 1. Duplicate Detection

**Purpose**: Prevent importing the same CSV multiple times.

**Configuration**: Located in CRM settings (`src/features/crm/hooks/useCRMSettings.ts`)

```typescript
interface DuplicateDetectionConfig {
  enabled: boolean;
  keys: ('name' | 'email' | 'company' | 'phone')[];
}
```

**Algorithm** (`src/services/deduplicationService.ts:18-45`):

```typescript
export function findDuplicates(
  newLead: Partial<Lead>,
  existingLeads: Lead[],
  config: DuplicateDetectionConfig
): Lead[] {
  if (!config.enabled || config.keys.length === 0) {
    return [];
  }

  return existingLeads.filter(existing => {
    // Check if ALL configured keys match
    return config.keys.every(key => {
      const newValue = newLead[key]?.toLowerCase().trim();
      const existingValue = existing[key]?.toLowerCase().trim();

      if (!newValue || !existingValue) return false;
      return newValue === existingValue;
    });
  });
}
```

**Tricky parts**:
- Case-insensitive comparison (`.toLowerCase()`)
- Whitespace trimming (`.trim()`)
- ALL keys must match (`.every()`)
- Empty values don't count as matches

**Integration in import** (`src/services/importService.ts:156-161`):

```typescript
const duplicates = findDuplicates(leadData, existingLeads, config);
if (duplicates.length > 0) {
  result.skipped++;
  result.errors.push(
    `Row ${i + 2}: Skipped - duplicate of existing lead "${duplicates[0].name}"`
  );
  continue;  // Skip this row
}
```

#### 2. Auto-Create Custom Fields

**Feature**: Automatically create custom fields for unmapped CSV columns.

**Location**: `src/services/importService.ts:100-133`

**Implementation**:

```typescript
if (autoCreateCustomFields) {
  // Find columns that weren't mapped
  const unmappedColumns = mappings.filter(
    m => !m.leadField || m.leadField === ''
  );

  for (const mapping of unmappedColumns) {
    // Get sample values from CSV
    const sampleValues = csvData
      .map(row => row[mapping.csvField])
      .filter(v => v && v.trim() !== '');

    // Detect field type
    const detectedType = detectFieldType(sampleValues);

    // Generate field name (snake_case from label)
    const fieldName = generateFieldName(mapping.csvField);

    // Create the field
    const newField: Omit<CustomField, 'id'> = {
      name: fieldName,
      label: mapping.csvField,
      type: detectedType,
      required: false,
      visible: true,
      showInTable: true,
      showInCard: true,
      order: 999,
      // ⚠️ CRITICAL: Only include options for select/radio/checkbox
      ...(detectedType === 'select' || detectedType === 'radio' || detectedType === 'checkbox'
        ? { options: [] }
        : {}
      )
    };

    const fieldId = await createCustomField(newField);

    // Update mapping to use new custom field
    mapping.leadField = `custom_${fieldName}`;
    result.customFieldsCreated++;
  }
}
```

**Tricky parts**:
1. Must avoid `undefined` in Firestore (see conditional spread)
2. Generate unique field names from CSV headers
3. Field name format: `custom_{snake_case}`
4. Update mapping after field creation so import can use it

#### 3. CSV Export Format

**Location**: `src/services/exportService.ts`

**Key details**:
- Exports only visible custom fields
- Formats dates to locale string
- Handles arrays (joins with commas)
- Uses PapaParse for CSV generation

```typescript
export function exportLeadsToCSV(
  leads: Lead[],
  customFields: CustomField[],
  filename: string = 'leads.csv'
): void {
  const visibleCustomFields = customFields.filter(f => f.visible);

  const csvData = leads.map(lead => {
    const row: any = {
      Name: lead.name,
      Email: lead.email,
      Company: lead.company,
      Phone: lead.phone || '',
      Status: lead.status,
      'Created At': lead.createdAt.toLocaleDateString(),
    };

    // Add custom fields
    visibleCustomFields.forEach(field => {
      const value = lead.customFields?.[field.name];
      row[field.label] = formatCustomFieldForCSV(field, value);
    });

    return row;
  });

  const csv = Papa.unparse(csvData);

  // Trigger download
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.click();
}
```

### Import Result Interface

```typescript
interface ImportResult {
  total: number;           // Total rows in CSV
  successful: number;      // Successfully created
  failed: number;          // Failed due to errors
  skipped: number;         // Skipped due to duplicates
  customFieldsCreated: number;  // Auto-created fields
  errors: string[];        // Error messages with row numbers
}
```

**Display example**:
```
Import complete!
✓ 45 leads created
⊘ 5 duplicates skipped
✗ 2 rows failed
+ 3 custom fields created
```

---

## Drag and Drop Implementation

### Overview

Drag and drop is used in two places:
1. **Table View**: Reorder leads by dragging rows
2. **Kanban Board**: Move leads between status columns

### Library

`@dnd-kit` - Modern, accessible drag and drop for React

### Table View Implementation

**Location**: `src/features/crm/components/TableView.tsx`

**Key components**:

1. **DndContext** - Wraps the entire table
2. **SortableContext** - Defines sortable items (lead IDs)
3. **SortableRow** - Individual draggable row

**Implementation**:

```typescript
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable row component
const SortableRow: React.FC<SortableRowProps> = ({ lead, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style}>
      <TableCell>
        {/* Drag handle */}
        <IconButton {...attributes} {...listeners}>
          <DragIndicatorIcon />
        </IconButton>
      </TableCell>
      {children}
    </TableRow>
  );
};

// Main component
<DndContext
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext
    items={sortedLeads.map(l => l.id)}
    strategy={verticalListSortingStrategy}
  >
    {sortedLeads.map(lead => (
      <SortableRow key={lead.id} lead={lead}>
        {/* Row cells */}
      </SortableRow>
    ))}
  </SortableContext>
</DndContext>
```

**Tricky parts**:
- Must disable drag when selecting (checkbox click)
- Drag handle prevents accidental drags
- Transform must use `CSS.Transform.toString()`
- Opacity feedback for dragging state

### Kanban Board Implementation

**Location**: `src/features/crm/components/BoardView.tsx`

**Key components**:

1. **DndContext** - Manages drag state
2. **DroppableColumn** - Drop zone for each status column
3. **Draggable Card** - Individual lead cards

**Critical difference from table**: Needs droppable zones for columns!

**Implementation**:

```typescript
import { useDroppable } from '@dnd-kit/core';

// Droppable column component
const DroppableColumn: React.FC<{ id: string; children: React.ReactNode }> = ({
  id,
  children
}) => {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <Box
      ref={setNodeRef}
      sx={{
        minHeight: 100,
        backgroundColor: isOver ? 'action.hover' : 'transparent',
      }}
    >
      {children}
    </Box>
  );
};

// Usage
<DndContext onDragEnd={handleDragEnd}>
  {statuses.map(status => (
    <DroppableColumn key={status} id={status}>
      {leadsInStatus.map(lead => (
        <DraggableCard lead={lead} />
      ))}
    </DroppableColumn>
  ))}
</DndContext>

// Handle drop
const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;

  if (!over) return;

  const leadId = active.id as string;
  const newStatus = over.id as LeadStatus;

  // Update lead status
  await updateLead(leadId, { status: newStatus });
};
```

**Common mistake**: Forgetting to add droppable zones

```typescript
// ❌ WRONG - No droppable zones
<DndContext onDragEnd={handleDragEnd}>
  {statuses.map(status => (
    <Box>  {/* Not droppable! */}
      {leadsInStatus.map(lead => <DraggableCard lead={lead} />)}
    </Box>
  ))}
</DndContext>

// ✅ CORRECT - Droppable zones defined
<DndContext onDragEnd={handleDragEnd}>
  {statuses.map(status => (
    <DroppableColumn id={status}>  {/* Uses useDroppable */}
      {leadsInStatus.map(lead => <DraggableCard lead={lead} />)}
    </DroppableColumn>
  ))}
</DndContext>
```

---

## Deployment Configuration

### Project Structure

The repository contains both frontend and backend:

```
/
├── frontend/        ← React app (deploy to DigitalOcean)
│   └── package.json (1460 packages)
└── functions/       ← Firebase Functions (NOT deployed to DigitalOcean)
    └── package.json (1000+ packages)
```

### DigitalOcean App Platform Configuration

**Settings**:

| Setting | Value |
|---------|-------|
| Source Directory | `frontend` |
| Build Command | `npm run build` |
| Output Directory | `build` |
| Build Resources | Professional (4GB RAM) |

**Environment Variables** (all required):
- `REACT_APP_FIREBASE_API_KEY`
- `REACT_APP_FIREBASE_AUTH_DOMAIN`
- `REACT_APP_FIREBASE_PROJECT_ID`
- `REACT_APP_FIREBASE_STORAGE_BUCKET`
- `REACT_APP_FIREBASE_MESSAGING_SENDER_ID`
- `REACT_APP_FIREBASE_APP_ID`

### Build Memory Optimization

**Location**: `frontend/package.json`

```json
{
  "scripts": {
    "build": "NODE_OPTIONS=--max_old_space_size=4096 react-scripts build"
  }
}
```

**Why 4GB?** React-scripts needs significant memory for:
- TypeScript compilation
- Webpack bundling
- Minification
- Source map generation (disabled in production)

**Location**: `frontend/.env.production`

```bash
# Disable source maps (saves 50-70% memory)
GENERATE_SOURCEMAP=false

# Continue on TypeScript errors
TSC_COMPILE_ON_ERROR=true

# Disable ESLint during build
DISABLE_ESLINT_PLUGIN=true

# Prevent inlining large images
IMAGE_INLINE_SIZE_LIMIT=0

# Don't inline runtime chunk
INLINE_RUNTIME_CHUNK=false
```

### Firebase Configuration

**Location**: `firebase.json` (root directory)

```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "runtime": "nodejs20"
    }
  ],
  "hosting": {
    "public": "frontend/build",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

**Deployment commands**:

```bash
# Deploy only functions
firebase deploy --only functions

# Deploy only hosting
firebase deploy --only hosting

# Deploy everything
firebase deploy
```

---

## Custom Idea Generator Implementation

### Overview

The Custom Idea Generator is a production-ready feature that allows users to generate personalized content ideas using OpenAI GPT-4 with custom prompts and lead-specific context.

### Architecture

**Subcollection Pattern**:
```
leads/{leadId}/ideas/{ideaId}
```

**Why subcollections?**
- Scalable: Each lead can have unlimited ideas
- Organized: Ideas grouped by lead automatically
- Query-efficient: Fast retrieval of lead-specific ideas
- Security: Easy to implement granular access control

### Data Flow

```
User clicks "Generate Ideas"
         ↓
Frontend displays prompt dialog
         ↓
User enters custom prompt
         ↓
Call generateCustomIdeasCloud({ leadId, prompt })
         ↓
Backend fetches lead data for context
         ↓
Construct OpenAI prompt with:
  - User's custom prompt
  - Company name
  - Industry
  - Website
  - Existing custom fields
         ↓
Call OpenAI GPT-4 API
         ↓
Parse structured response (5-10 ideas)
         ↓
For each idea:
  - Create document in leads/{leadId}/ideas/
  - Set status = "pending"
  - Store cost info
         ↓
Track API cost in apiCosts collection
         ↓
Update lead's totalApiCosts
         ↓
Return ideas to frontend
```

### Cloud Functions Implementation

**File**: `functions/src/ideaGenerator/generateIdeas.ts`

#### generateCustomIdeasCloud

```typescript
export const generateCustomIdeasCloud = onCall(async (request) => {
  const { leadId, prompt } = request.data;
  const userId = request.auth!.uid;

  // 1. Fetch lead data
  const leadDoc = await admin.firestore()
    .collection('leads')
    .doc(leadId)
    .get();

  if (!leadDoc.exists) {
    throw new HttpsError('not-found', 'Lead not found');
  }

  const lead = leadDoc.data();

  // 2. Build context-aware prompt
  const systemPrompt = `You are a content strategist generating ideas for ${lead.companyName}.
  Industry: ${lead.industry || 'Unknown'}
  Website: ${lead.website || 'N/A'}

  Generate 5-10 high-quality, specific content ideas based on: ${prompt}

  Format each idea as a JSON object with:
  - title: Short, catchy title
  - content: Detailed description (2-3 sentences)`;

  // 3. Call OpenAI
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 2000
  });

  const ideas = parseIdeas(completion.choices[0].message.content);

  // 4. Save ideas to subcollection
  const ideasRef = admin.firestore()
    .collection('leads')
    .doc(leadId)
    .collection('ideas');

  const savedIdeas = [];
  for (const idea of ideas) {
    const ideaDoc = await ideasRef.add({
      content: idea.content,
      title: idea.title,
      status: 'pending',
      prompt: prompt,
      costInfo: {
        model: 'gpt-4-turbo',
        inputTokens: completion.usage.prompt_tokens,
        outputTokens: completion.usage.completion_tokens,
        totalCost: calculateCost(completion.usage)
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    savedIdeas.push({ id: ideaDoc.id, ...idea });
  }

  // 5. Track API cost
  const totalCost = calculateCost(completion.usage);
  await trackApiCost({
    userId,
    leadId,
    service: 'idea-generation',
    model: 'gpt-4-turbo',
    inputTokens: completion.usage.prompt_tokens,
    outputTokens: completion.usage.completion_tokens,
    metadata: {
      companyName: lead.companyName,
      website: lead.website,
      prompt: prompt
    }
  });

  // 6. Update lead
  await leadDoc.ref.update({
    hasGeneratedIdeas: true,
    lastIdeaGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
    totalApiCosts: admin.firestore.FieldValue.increment(totalCost)
  });

  return {
    success: true,
    ideaCount: savedIdeas.length,
    totalCost,
    ideas: savedIdeas
  };
});
```

#### getLeadIdeas

```typescript
export const getLeadIdeas = onCall(async (request) => {
  const { leadId, status } = request.data;

  let query = admin.firestore()
    .collection('leads')
    .doc(leadId)
    .collection('ideas');

  if (status) {
    query = query.where('status', '==', status);
  }

  const snapshot = await query
    .orderBy('createdAt', 'desc')
    .get();

  const ideas = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return { ideas };
});
```

#### updateIdeaStatus

```typescript
export const updateIdeaStatus = onCall(async (request) => {
  const { leadId, ideaId, status } = request.data;

  const ideaRef = admin.firestore()
    .collection('leads')
    .doc(leadId)
    .collection('ideas')
    .doc(ideaId);

  const updateData: any = {
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (status === 'attached') {
    updateData.attachedAt = admin.firestore.FieldValue.serverTimestamp();
  }

  await ideaRef.update(updateData);

  return { success: true, message: 'Status updated' };
});
```

### Frontend Integration

**Service**: `frontend/src/services/researchApi.ts`

```typescript
import { getFunctions, httpsCallable } from 'firebase/functions';

export const generateCustomIdeas = async (data: {
  leadId: string;
  prompt: string;
}) => {
  const functions = getFunctions();
  const callable = httpsCallable(functions, 'generateCustomIdeasCloud');
  const result = await callable(data);
  return result.data;
};

export const getLeadIdeas = async (leadId: string, status?: string) => {
  const functions = getFunctions();
  const callable = httpsCallable(functions, 'getLeadIdeas');
  const result = await callable({ leadId, status });
  return result.data;
};

export const updateIdeaStatus = async (
  leadId: string,
  ideaId: string,
  status: string
) => {
  const functions = getFunctions();
  const callable = httpsCallable(functions, 'updateIdeaStatus');
  const result = await callable({ leadId, ideaId, status });
  return result.data;
};
```

### Status Workflow

**pending** → **approved** → **attached**

**Implementation**:
```typescript
// UI component for idea management
const IdeaCard = ({ idea, onStatusChange }) => {
  const handleApprove = async () => {
    await updateIdeaStatus(leadId, idea.id, 'approved');
    onStatusChange();
  };

  const handleAttach = async () => {
    await updateIdeaStatus(leadId, idea.id, 'attached');
    onStatusChange();
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6">{idea.title}</Typography>
        <Typography>{idea.content}</Typography>
        <Chip label={idea.status} color={getStatusColor(idea.status)} />
      </CardContent>
      <CardActions>
        {idea.status === 'pending' && (
          <Button onClick={handleApprove}>Approve</Button>
        )}
        {idea.status === 'approved' && (
          <Button onClick={handleAttach}>Attach to Content</Button>
        )}
      </CardActions>
    </Card>
  );
};
```

### Critical Implementation Details

**1. Subcollection Queries**

```typescript
// ❌ WRONG - Cannot query across all leads' ideas
const allIdeas = await admin.firestore()
  .collectionGroup('ideas')
  .where('status', '==', 'pending')
  .get();
// This requires a collection group index!

// ✅ CORRECT - Query ideas for specific lead
const leadIdeas = await admin.firestore()
  .collection('leads')
  .doc(leadId)
  .collection('ideas')
  .where('status', '==', 'pending')
  .get();
```

**2. Cost Tracking Integration**

Every idea generation MUST track costs:
```typescript
await trackApiCost({
  userId: context.auth!.uid,
  leadId: data.leadId,
  service: 'idea-generation',
  model: 'gpt-4-turbo',
  inputTokens: usage.prompt_tokens,
  outputTokens: usage.completion_tokens,
  metadata: { prompt: data.prompt }
});
```

**3. Atomic Updates**

Update lead's cost totals atomically:
```typescript
// ✅ CORRECT - Use FieldValue.increment
await leadRef.update({
  totalApiCosts: admin.firestore.FieldValue.increment(cost)
});

// ❌ WRONG - Race condition
const lead = await leadRef.get();
const newTotal = (lead.data().totalApiCosts || 0) + cost;
await leadRef.update({ totalApiCosts: newTotal });
```

---

## API Cost Tracking System

### Overview

Comprehensive system for tracking all OpenAI API usage with real-time cost calculation and aggregation at both lead and user levels.

### Architecture

**Collections**:
1. `apiCosts` - Individual API call records
2. `leads` - Aggregated costs per lead
3. `users` - (Future) Aggregated costs per user

### Cost Calculation

**Pricing Table** (`functions/src/utils/costTracker.ts`):

```typescript
const PRICING = {
  'gpt-4-turbo': {
    input: 10.00 / 1_000_000,   // $10 per 1M tokens
    output: 30.00 / 1_000_000   // $30 per 1M tokens
  },
  'gpt-4': {
    input: 30.00 / 1_000_000,   // $30 per 1M tokens
    output: 60.00 / 1_000_000   // $60 per 1M tokens
  }
};

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = PRICING[model];
  if (!pricing) throw new Error(`Unknown model: ${model}`);

  const inputCost = inputTokens * pricing.input;
  const outputCost = outputTokens * pricing.output;

  return inputCost + outputCost;
}
```

### Implementation

**File**: `functions/src/utils/costTracker.ts`

```typescript
export async function trackApiCost(data: {
  userId: string;
  leadId?: string;
  service: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  metadata?: any;
}): Promise<string> {
  const totalCost = calculateCost(
    data.model,
    data.inputTokens,
    data.outputTokens
  );

  // 1. Create cost record
  const costRef = await admin.firestore().collection('apiCosts').add({
    userId: data.userId,
    leadId: data.leadId || null,
    service: data.service,
    model: data.model,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
    inputTokens: data.inputTokens,
    outputTokens: data.outputTokens,
    totalCost,
    metadata: data.metadata || {}
  });

  // 2. Update lead's total costs (if leadId provided)
  if (data.leadId) {
    const leadRef = admin.firestore().collection('leads').doc(data.leadId);
    await leadRef.update({
      totalApiCosts: admin.firestore.FieldValue.increment(totalCost),
      lastApiCostUpdate: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  console.log(`Cost tracked: $${totalCost.toFixed(4)} for ${data.service}`);

  return costRef.id;
}

export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${cost.toFixed(4)}`;
  }
  return `$${cost.toFixed(2)}`;
}
```

### Integration Pattern

**Every AI-powered function** follows this pattern:

```typescript
export const someAiFunction = onCall(async (request) => {
  const { leadId, ...params } = request.data;

  // 1. Call OpenAI
  const completion = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [...],
  });

  // 2. Process response
  const result = processResponse(completion);

  // 3. Track cost (CRITICAL - Do not skip!)
  await trackApiCost({
    userId: request.auth!.uid,
    leadId: leadId,
    service: 'service-name',
    model: 'gpt-4-turbo',
    inputTokens: completion.usage.prompt_tokens,
    outputTokens: completion.usage.completion_tokens,
    metadata: {
      // Service-specific metadata
    }
  });

  // 4. Return result with cost info
  const cost = calculateCost(
    'gpt-4-turbo',
    completion.usage.prompt_tokens,
    completion.usage.completion_tokens
  );

  return {
    ...result,
    costInfo: {
      model: 'gpt-4-turbo',
      inputTokens: completion.usage.prompt_tokens,
      outputTokens: completion.usage.completion_tokens,
      totalCost: cost
    }
  };
});
```

### Frontend Display

**Lead Card Cost Display**:

```typescript
const LeadCard = ({ lead }) => {
  const formattedCost = lead.totalApiCosts
    ? `$${lead.totalApiCosts.toFixed(2)}`
    : '$0.00';

  return (
    <Card>
      {/* ... other content ... */}
      <Typography variant="caption">
        API Costs: {formattedCost}
      </Typography>
    </Card>
  );
};
```

### Querying Cost Data

**User-level costs**:
```typescript
const getUserCosts = async (userId: string) => {
  const snapshot = await admin.firestore()
    .collection('apiCosts')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .get();

  const total = snapshot.docs.reduce(
    (sum, doc) => sum + doc.data().totalCost,
    0
  );

  return { records: snapshot.docs, total };
};
```

**Service-level analytics**:
```typescript
const getServiceCosts = async (service: string, startDate: Date) => {
  const snapshot = await admin.firestore()
    .collection('apiCosts')
    .where('service', '==', service)
    .where('timestamp', '>=', startDate)
    .get();

  return snapshot.docs.map(doc => doc.data());
};
```

---

## Apollo Title Presets

### Overview

localStorage-based system for saving and quickly loading frequently-used job title searches in Apollo.io person search.

### Storage Schema

**localStorage Key**: `apollo_title_presets`

**Data Structure**:
```typescript
interface ApolloTitlePreset {
  id: string;              // UUID (e.g., "preset-123-abc")
  name: string;            // User-defined name (e.g., "Engineering Leaders")
  titles: string[];        // Array of job titles
  createdAt: string;       // ISO 8601 timestamp
  lastUsedAt?: string;     // Last usage timestamp
}

// Stored as JSON array
type PresetStorage = ApolloTitlePreset[];
```

### Implementation

**File**: `frontend/src/app/types/apolloPresets.ts`

```typescript
const STORAGE_KEY = 'apollo_title_presets';

export function savePreset(preset: Omit<ApolloTitlePreset, 'id' | 'createdAt'>): string {
  const presets = getPresets();
  const newPreset: ApolloTitlePreset = {
    ...preset,
    id: `preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString()
  };

  presets.push(newPreset);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));

  return newPreset.id;
}

export function loadPreset(id: string): ApolloTitlePreset | null {
  const presets = getPresets();
  const preset = presets.find(p => p.id === id);

  if (preset) {
    // Update lastUsedAt
    preset.lastUsedAt = new Date().toISOString();
    updatePreset(id, preset);
  }

  return preset || null;
}

export function getPresets(): ApolloTitlePreset[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function updatePreset(id: string, updates: Partial<ApolloTitlePreset>): boolean {
  const presets = getPresets();
  const index = presets.findIndex(p => p.id === id);

  if (index === -1) return false;

  presets[index] = { ...presets[index], ...updates };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));

  return true;
}

export function deletePreset(id: string): boolean {
  const presets = getPresets();
  const filtered = presets.filter(p => p.id !== id);

  if (filtered.length === presets.length) return false;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  return true;
}
```

### UI Integration

**Component**: `frontend/src/features/crm/components/TitleSelectionDialog.tsx`

```typescript
const TitleSelectionDialog = ({ open, onClose, onSelect }) => {
  const [presets, setPresets] = useState<ApolloTitlePreset[]>([]);
  const [newPresetName, setNewPresetName] = useState('');
  const [selectedTitles, setSelectedTitles] = useState<string[]>([]);

  useEffect(() => {
    setPresets(getPresets());
  }, [open]);

  const handleSavePreset = () => {
    if (!newPresetName || selectedTitles.length === 0) return;

    savePreset({
      name: newPresetName,
      titles: selectedTitles
    });

    setPresets(getPresets());
    setNewPresetName('');
  };

  const handleLoadPreset = (preset: ApolloTitlePreset) => {
    setSelectedTitles(preset.titles);
    onSelect(preset.titles);
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Title Presets</DialogTitle>
      <DialogContent>
        {/* Preset list */}
        <List>
          {presets.map(preset => (
            <ListItem key={preset.id}>
              <ListItemText
                primary={preset.name}
                secondary={`${preset.titles.length} titles`}
              />
              <ListItemSecondaryAction>
                <IconButton onClick={() => handleLoadPreset(preset)}>
                  <LoadIcon />
                </IconButton>
                <IconButton onClick={() => {
                  deletePreset(preset.id);
                  setPresets(getPresets());
                }}>
                  <DeleteIcon />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>

        {/* Create new preset */}
        <TextField
          label="Preset Name"
          value={newPresetName}
          onChange={(e) => setNewPresetName(e.target.value)}
        />
        <Button onClick={handleSavePreset}>Save Current Selection</Button>
      </DialogContent>
    </Dialog>
  );
};
```

### Best Practices

**1. Always update lastUsedAt**:
```typescript
// Track usage for analytics
const preset = loadPreset(id);
// loadPreset automatically updates lastUsedAt
```

**2. Validate before saving**:
```typescript
// Check for duplicate names
const presets = getPresets();
const exists = presets.some(p => p.name === newPresetName);
if (exists) {
  alert('Preset name already exists');
  return;
}
```

**3. localStorage limits**:
```typescript
// localStorage typically has 5-10MB limit
// Monitor storage usage
const checkStorageSize = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  const sizeInBytes = new Blob([data || '']).size;
  const sizeInKB = sizeInBytes / 1024;

  if (sizeInKB > 100) {
    console.warn('Preset storage exceeds 100KB');
  }
};
```

---

## CRACO Build Configuration

### Overview

CRACO (Create React App Configuration Override) is used to customize the build process without ejecting from Create React App.

### Why CRACO?

**Problems with default CRA**:
- Cannot disable TypeScript checking during build
- Cannot remove ForkTsCheckerWebpackPlugin
- Cannot customize Webpack config
- Memory issues with large TypeScript projects

**CRACO solves**:
- Direct Webpack configuration access
- Plugin removal/addition
- Loader customization
- Memory optimization

### Configuration

**File**: `frontend/craco.config.js`

```javascript
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // 1. Remove ForkTsCheckerWebpackPlugin (saves ~500MB memory)
      webpackConfig.plugins = webpackConfig.plugins.filter(
        plugin => plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin'
      );

      // 2. Disable source maps in production
      if (process.env.NODE_ENV === 'production') {
        webpackConfig.devtool = false;
      }

      // 3. Optimize Terser (minification)
      const TerserPlugin = webpackConfig.optimization.minimizer.find(
        plugin => plugin.constructor.name === 'TerserPlugin'
      );

      if (TerserPlugin) {
        TerserPlugin.options.parallel = 2; // Limit parallelism
      }

      // 4. Disable performance hints
      webpackConfig.performance = {
        hints: false
      };

      return webpackConfig;
    }
  },

  // Disable TypeScript type checking during build
  typescript: {
    enableTypeChecking: false
  },

  // Disable ESLint during build
  eslint: {
    enable: false
  }
};
```

### Memory Optimization Strategy

**1. Node.js Heap Size**:
```json
// package.json
{
  "scripts": {
    "build": "node --max_old_space_size=4096 node_modules/.bin/craco build"
  }
}
```

**2. Environment Variables** (`.env.production`):
```bash
# Disable source maps (saves 50-70% memory)
GENERATE_SOURCEMAP=false

# Continue on TypeScript errors
TSC_COMPILE_ON_ERROR=true

# Disable ESLint
DISABLE_ESLINT_PLUGIN=true

# Don't inline large images
IMAGE_INLINE_SIZE_LIMIT=0

# Don't inline runtime chunk
INLINE_RUNTIME_CHUNK=false
```

**3. Terser Configuration**:
```javascript
// Limit parallelism to reduce memory spikes
terserOptions: {
  parallel: 2,  // Max 2 workers (default is CPU count)
  cache: false  // Disable cache to save memory
}
```

### Build Process

**Memory Usage Timeline**:
```
0s:  Start build                    (500MB)
10s: TypeScript compilation         (1.2GB)  ← Disabled with CRACO
20s: Webpack bundling               (1.8GB)
30s: Minification (Terser)          (2.5GB)  ← Limited parallelism
40s: Source map generation          (3.5GB)  ← Disabled
45s: Build complete                 (500MB)
```

**With optimizations**:
```
0s:  Start build                    (500MB)
10s: Webpack bundling               (1.2GB)
20s: Minification (2 workers)       (2.0GB)
25s: Build complete                 (500MB)
```

### Common Issues

**1. CRACO not found**:
```bash
# Install CRACO
npm install @craco/craco --save-dev
```

**2. Build still runs out of memory**:
```bash
# Increase heap size further
node --max_old_space_size=6144 node_modules/.bin/craco build
```

**3. TypeScript errors ignored**:
```typescript
// This is intentional for build performance
// Run type checking separately:
npx tsc --noEmit
```

---

## Common Errors and Solutions

### Build Errors

#### 1. "JavaScript heap out of memory"

**Error**:
```
FATAL ERROR: Ineffective mark-compacts near heap limit
Allocation failed - JavaScript heap out of memory
```

**Cause**: Not enough memory allocated for build process

**Solution**: Increase memory in `package.json`:
```json
{
  "scripts": {
    "build": "NODE_OPTIONS=--max_old_space_size=4096 react-scripts build"
  }
}
```

Also update DigitalOcean build resources to **Professional (4GB RAM)**.

---

#### 2. "Maximum call stack size exceeded" (dotenv-expand)

**Error**:
```
RangeError: Maximum call stack size exceeded
at /node_modules/dotenv-expand/lib/main.js:11:49
```

**Cause**: Circular reference in `.env.production` file:

```bash
# ❌ WRONG - Causes infinite loop
REACT_APP_FIREBASE_API_KEY=${REACT_APP_FIREBASE_API_KEY}
```

**Solution**: Remove self-referential environment variables:

```bash
# ✅ CORRECT - Let DigitalOcean inject these
# Firebase Configuration
# These values are provided by DigitalOcean environment variables
```

---

### Firestore Errors

#### 1. "Unsupported field value: undefined"

**Error**:
```
FirebaseError: Function setDoc() called with invalid data.
Unsupported field value: undefined
```

**Cause**: Trying to save `undefined` values to Firestore

**Solution**: Use conditional spread operator:

```typescript
// ❌ WRONG
const data = {
  name: leadName,
  email: leadEmail,
  customField: undefined  // Not allowed!
};

// ✅ CORRECT - Option 1: Filter out undefined
const data = {
  name: leadName,
  email: leadEmail,
  ...(customValue !== undefined ? { customField: customValue } : {})
};

// ✅ CORRECT - Option 2: Use null instead
const data = {
  name: leadName,
  email: leadEmail,
  customField: customValue ?? null
};
```

---

#### 2. "Missing or insufficient permissions"

**Error**:
```
FirebaseError: Missing or insufficient permissions
```

**Cause**: Firestore security rules blocking the operation

**Solution**: Check `firestore.rules`:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write leads
    match /leads/{leadId} {
      allow read, write: if request.auth != null;
    }

    // Allow authenticated users to read/write custom fields
    match /customFields/{fieldId} {
      allow read, write: if request.auth != null;
    }

    // Allow users to read their own profile
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

---

### Authentication Errors

#### 1. "User profile not found in database"

**Cause**: User exists in Firebase Auth but not in Firestore

**Solution**: Create Firestore document at `users/{uid}` with required fields:

```typescript
{
  email: "user@domain.com",
  displayName: "Full Name",
  role: "Manager",
  department: "Marketing"
}
```

**Verification**:
```typescript
// Check UID matches
Firebase Auth UID:     "abc123xyz"
Firestore Doc ID:      "abc123xyz"  ← Must match exactly!
```

---

#### 2. "400 Bad Request" on login

**Cause**: Email/Password authentication not enabled in Firebase Console

**Solution**:
1. Open Firebase Console
2. Go to Authentication → Sign-in method
3. Click on "Email/Password"
4. Enable the provider
5. Save changes

---

### Import/Export Errors

#### 1. CSV import creates duplicates

**Cause**: Duplicate detection not enabled or misconfigured

**Solution**: Enable duplicate detection in CRM settings:

```typescript
const config = {
  duplicateDetection: {
    enabled: true,
    keys: ['email', 'name']  // Match on email AND name
  }
};
```

**Location**: Settings page → CRM Settings → Duplicate Detection

---

#### 2. Auto-created custom fields have wrong type

**Cause**: Type detection algorithm guessed incorrectly

**Solution**: Improve sample data or manually create the field before import:

```typescript
// Type detection uses first 10 non-empty values
// Ensure CSV has good sample data in first rows

// Example: If column should be 'number' but has headers:
Row 1: "Revenue"      ← Detected as 'text' because of this
Row 2: "100000"
Row 3: "250000"

// Fix: Remove header row or map to existing field
```

---

### Runtime Errors

#### 1. "Cannot read property 'map' of undefined"

**Common in**:
```typescript
// ❌ Crashes if customFields is undefined
{customFields.map(field => ...)}
```

**Solution**: Optional chaining and default values:

```typescript
// ✅ Safe
{customFields?.map(field => ...) ?? []}

// ✅ Also safe
{(customFields || []).map(field => ...)}
```

---

#### 2. "Warning: Each child in a list should have a unique key prop"

**Cause**: Missing or duplicate keys in rendered lists

**Solution**: Use unique IDs, not array index:

```typescript
// ❌ WRONG - Index not stable
{leads.map((lead, index) => (
  <LeadCard key={index} lead={lead} />
))}

// ✅ CORRECT - Use unique ID
{leads.map(lead => (
  <LeadCard key={lead.id} lead={lead} />
))}
```

---

## Best Practices

### 1. Firestore Operations

**Always handle undefined values:**
```typescript
const leadData = {
  name: formData.name,
  email: formData.email,
  // Only include optional fields if they have values
  ...(formData.phone ? { phone: formData.phone } : {}),
  ...(formData.notes ? { notes: formData.notes } : {})
};
```

**Use transactions for critical updates:**
```typescript
await runTransaction(db, async (transaction) => {
  const leadRef = doc(db, 'leads', leadId);
  const leadDoc = await transaction.get(leadRef);

  if (!leadDoc.exists()) {
    throw new Error('Lead not found');
  }

  transaction.update(leadRef, { status: 'closed' });
});
```

### 2. State Management

**Use Context for global state:**
- ✅ Authentication state
- ✅ User preferences
- ✅ Theme settings

**Use local state for UI:**
- ✅ Dialog open/closed
- ✅ Form inputs
- ✅ Temporary selections

### 3. Error Handling

**Always catch errors in async operations:**
```typescript
const handleSave = async () => {
  try {
    await saveLead(leadData);
    showSuccessMessage('Lead saved!');
  } catch (error) {
    console.error('Save failed:', error);
    showErrorMessage('Failed to save lead');
  }
};
```

### 4. Performance

**Optimize Firestore queries:**
```typescript
// ❌ Fetches all leads, filters in code
const allLeads = await getLeads();
const activeLeads = allLeads.filter(l => l.status === 'active');

// ✅ Filter in Firestore
const q = query(
  collection(db, 'leads'),
  where('status', '==', 'active')
);
const activeLeads = await getDocs(q);
```

**Use pagination for large lists:**
```typescript
const LEADS_PER_PAGE = 50;

const q = query(
  collection(db, 'leads'),
  orderBy('createdAt', 'desc'),
  limit(LEADS_PER_PAGE)
);
```

---

## Development Workflow

### Local Development

```bash
cd frontend
npm start
# App runs on http://localhost:3000
```

**Note**: Uses `.env.local` for Firebase credentials (not committed to git)

### Building for Production

```bash
cd frontend
npm run build
# Creates optimized build in frontend/build/
```

### Deploying to DigitalOcean

1. Commit changes to git
2. Push to GitHub
3. DigitalOcean auto-deploys from `main` branch
4. Monitor build logs in DigitalOcean dashboard

### Deploying Firebase Functions

```bash
firebase deploy --only functions
```

---

## Troubleshooting Checklist

### Login not working?

- [ ] Email/Password provider enabled in Firebase Console?
- [ ] User exists in Firebase Authentication?
- [ ] Firestore document exists at `users/{uid}`?
- [ ] UID matches between Auth and Firestore?
- [ ] Firestore document has all required fields?

### Build failing?

- [ ] Memory allocation at least 4GB?
- [ ] `.env.production` has no circular references?
- [ ] Source directory set to `frontend`?
- [ ] All build optimizations enabled?

### Custom fields not working?

- [ ] Field type appropriate for data?
- [ ] No `undefined` values being saved?
- [ ] Options provided for select/radio/checkbox?
- [ ] Field visible in settings?

### CSV import failing?

- [ ] CSV file well-formed (no unclosed quotes)?
- [ ] Field mapping correct?
- [ ] Duplicate detection configured properly?
- [ ] Required fields (name, email) mapped?

---

## Glossary

**Lead**: A potential customer or contact in the CRM system

**Custom Field**: User-defined field that can be added to leads

**Duplicate Detection**: System to prevent importing the same lead multiple times

**Field Mapping**: Process of mapping CSV columns to lead fields during import

**Type Detection**: Automatic detection of field type based on sample values

**UID**: Unique Identifier for a user in Firebase Authentication

**Firestore**: Google's NoSQL cloud database

**React Context**: React's built-in state management solution

---

*Last updated: October 19, 2025*
