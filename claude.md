# Marketing Agent - CRM Pipeline System

## UI Design Principles

**CRITICAL: Design Preservation Rules**

When modifying the CRM board or any kanban-style interface, you MUST preserve the existing design system:

### Color Scheme
- **Background Gradient**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)` (purple gradient)
- **Header Background**: `rgba(255, 255, 255, 0.95)` with `backdropFilter: blur(20px)` (frosted glass)
- **Column Cards**: `rgba(255, 255, 255, 0.95)` with backdrop blur, 280px width
- **Primary Action Color**: Purple gradient matching background

### Typography
- **Font Family**: `"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Title (H4)**: 700 weight, 28px, gradient text
- **Subtitle**: 400 weight, 15px, #64748b color
- **Body**: 500 weight, 14px

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Purple Gradient Background (#667eea → #764ba2)          │
│  ┌───────────────────────────────────────────────────┐  │
│  │ Frosted Glass Header (rgba(255,255,255,0.95))    │  │
│  │  Title (Gradient Text) | Filters Row →           │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌──────┬──────┬──────┬──────┬──────┬──────┐          │
│  │Col 1 │Col 2 │Col 3 │Col 4 │Col 5 │Col 6 │ ← Columns│
│  │280px │280px │280px │280px │280px │280px │          │
│  └──────┴──────┴──────┴──────┴──────┴──────┘          │
│                                    [+] FAB ← Bottom Right│
└─────────────────────────────────────────────────────────┘
```

### Column Structure
- **Width**: 280px (fixed)
- **Background**: `rgba(255, 255, 255, 0.95)` with `backdropFilter: blur(20px)`
- **Border**: `1px solid rgba(255, 255, 255, 0.2)`
- **Shadow**: `0 8px 32px rgba(0, 0, 0, 0.08)`
- **Border Radius**: 12px
- **Header**: Gradient background with icon + title + count badge
- **Content Area**: Gradient background specific to column type

### Card Styling
- **Background**: White
- **Border**: `1px solid #e2e8f0`
- **Border Radius**: 10px (2.5 * 4px)
- **Padding**: 12px (3 * 4px)
- **Priority Indicator**: 3px top border with gradient
- **Duration Badge**: Circular, top-right, color-coded
- **Hover Effect**: Shadow + translateY(-2px) + purple border

### Filters Row
- **ViewToggle** (Board/Table) with purple gradient selection
- **Divider**: 1px x 32px gray line
- **Filters**: LeadOwner, Company, Month
- **Filter Style**: Frosted glass background, purple accents

### FAB (Floating Action Button)
- **Position**: `position: fixed; bottom: 24px; right: 24px;`
- **Background**: Purple gradient
- **Hover**: Scale(1.05) + darker gradient

### State Duration Color Coding
- **0-3 days**: Green (#10b981)
- **4-7 days**: Orange (#f59e0b)
- **8+ days**: Red (#ef4444)

## CRM Pipeline Stages

### Lead Statuses (6 Default Stages)

1. **New Lead** (order: 0)
   - Status: `new_lead`
   - Icon: 📋
   - Color: Gray gradient
   - Description: Newly captured leads, not yet qualified

2. **Qualified** (order: 1)
   - Status: `qualified`
   - Icon: 🎯
   - Color: Orange gradient
   - Description: Leads that meet qualification criteria

3. **Contacted** (order: 2)
   - Status: `contacted`
   - Icon: 📞
   - Color: Blue gradient
   - Description: Initial contact has been made

4. **Follow up** (order: 3)
   - Status: `follow_up`
   - Icon: 🔄
   - Color: Purple gradient
   - Description: Leads in active follow-up process

5. **Won** (order: 4)
   - Status: `won`
   - Icon: ✅
   - Color: Green gradient
   - Description: Successfully converted leads

6. **Lost** (order: 5)
   - Status: `lost`
   - Icon: ❌
   - Color: Gray/Red gradient
   - Description: Leads that didn't convert

### State History Tracking

**Important**: State history is crucial with many downstream dependencies:

1. **Timeline Subcollection** (`leads/{leadId}/timeline/{leadId}`)
   - `stateHistory`: Object with timestamps for each status
   - `stateDurations`: Cumulative days spent in each status
   - `statusChanges`: Array of detailed change records

2. **Change Records** (LeadStatusChange)
   - `fromStatus`: Previous status (null for creation)
   - `toStatus`: New status
   - `changedBy`: User ID
   - `changedAt`: ISO timestamp
   - `notes`: Optional notes
   - `automaticChange`: Boolean flag

3. **Duration Tracking**
   - Supports re-entering states (cumulative time)
   - Tracks both current session and historical time
   - Updates on every status change

### Adding Leads to the Board

**Flow**:
1. Click FAB (+) button → LeadDialog opens
2. User fills form (name, email, phone, company)
3. Status defaults to "New Lead"
4. `createLead()` called
5. Lead saved to Firebase + Timeline initialized
6. Real-time subscription updates board
7. New lead appears in "New Lead" column

### Board Configuration

**Filters**:
- **Lead Owner Filter**: Filter by custom field `lead_owner`
- **Company Filter**: Filter by company name
- **Month Filter**: Filter by last update date (from state history)

**View Toggle**:
- Board view (kanban)
- Table view (sortable table)
- Preference saved to localStorage

**Real-Time Updates**:
- All changes immediately reflected via Firebase subscriptions
- Drag-and-drop updates status + state history
- Multiple users can collaborate simultaneously

### Firebase Collections

```
leads/
├── {leadId} (main document)
│   ├── id, name, email, phone, company
│   ├── status (LeadStatus)
│   ├── customFields (object)
│   ├── stateHistory (flattened from timeline)
│   ├── stateDurations (flattened from timeline)
│   └── timestamps
│
└── {leadId}/timeline/
    └── {leadId} (subcollection document)
        ├── stateHistory (object)
        ├── stateDurations (object)
        └── statusChanges (array)

companies/
└── {companyId}
    ├── name (unique, case-insensitive)
    ├── website, industry, description
    └── timestamps
```

### Custom Fields

Leads support dynamic custom fields stored in `customFields` object:
- `lead_owner`: Assigned sales person
- `priority`: Low/Medium/High/Urgent
- `deal_value`: Estimated deal value
- Any additional custom fields

### Key Features

1. **Drag-and-Drop**: Move leads between stages
2. **State Duration Indicators**: Color-coded badges on cards
3. **Activity Timeline**: Complete history in LeadDialog
4. **Filters**: Owner, Company, Month with real-time updates
5. **View Toggle**: Switch between Board and Table views
6. **Real-Time Sync**: Firebase subscriptions across all clients
7. **Company Auto-Creation**: Companies created automatically when leads are added
8. **Cumulative Time Tracking**: Tracks total time across multiple visits to same state

### Design Consistency Checklist

Before committing UI changes, verify:
- [ ] Purple gradient background (#667eea → #764ba2)
- [ ] Frosted glass header with backdrop blur
- [ ] 280px column width
- [ ] Glass-morphism column cards
- [ ] FAB bottom-right with purple gradient
- [ ] Filters row with ViewToggle + divider + filters
- [ ] Modern typography (Inter/SF Pro Display)
- [ ] Duration color coding (green → orange → red)
- [ ] Hover effects and transitions match existing
- [ ] Priority indicator (3px top border)

