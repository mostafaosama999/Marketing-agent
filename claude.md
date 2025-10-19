# Marketing Agent - Technical Documentation

This document covers the tricky implementation details, common pitfalls, and solutions for the Marketing CRM application.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication System](#authentication-system)
3. [Custom Fields System](#custom-fields-system)
4. [CSV Import/Export](#csv-importexport)
5. [Drag and Drop Implementation](#drag-and-drop-implementation)
6. [Deployment Configuration](#deployment-configuration)
7. [Common Errors and Solutions](#common-errors-and-solutions)

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
