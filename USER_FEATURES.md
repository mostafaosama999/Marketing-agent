# Marketing Agent CRM - Feature Guide

A comprehensive guide to everything you can do in the Marketing Agent CRM.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Lead Management](#lead-management)
4. [Company Management](#company-management)
5. [Smart Enrichment & AI Analysis](#smart-enrichment--ai-analysis)
6. [Filtering & Search](#filtering--search)
7. [Bulk Operations](#bulk-operations)
8. [Archive System](#archive-system)
9. [Analytics & Monitoring](#analytics--monitoring)
10. [Content Generation](#content-generation)
11. [Team Management](#team-management)
12. [Settings & Customization](#settings--customization)

---

## Overview

Marketing Agent CRM is a complete lead and company management platform designed for marketing agencies and B2B teams. It helps you:

- Track leads through your sales pipeline
- Manage company profiles and relationships
- Enrich contacts and companies with verified data
- Analyze blogs and discover writing programs
- Generate AI-powered content for outreach
- Monitor team performance and analytics

---

## Getting Started

### Logging In

Sign in with your email and password to access the platform. Your access level depends on your assigned role.

### User Roles

| Role | What You Can Do |
|------|-----------------|
| **Writer** | Access your own tasks only |
| **Marketing Analyst** | View and edit leads & companies |
| **Manager** | Full CRM access, team management |
| **CEO** | Everything, plus user management |

### Navigation

Your navigation menu adapts to your role:

- **Leads** - Main CRM pipeline (homepage)
- **Companies** - Company database
- **Analytics** - Performance dashboards
- **Monitoring** - KPIs and cost tracking
- **Team** - Team member management
- **Inbound Analytics** - LinkedIn performance
- **Inbound Generation** - AI content tools (Beta)
- **Settings** - Preferences and templates

---

## Lead Management

### The Pipeline

Leads flow through 6 main stages:

1. **New Lead** - Just added to the system
2. **Qualified** - Meets your criteria
3. **Contacted** - Initial outreach made
4. **Follow Up** - Ongoing conversation
5. **Nurture** - Long-term prospect
6. **Won / Lost** - Final outcome

Additional statuses: Previous Client, Existing Client

### Two Ways to View Your Leads

**Board View (Kanban)**
- See all leads organized by status in columns
- Drag and drop leads between stages
- Visual at-a-glance pipeline overview

**Table View**
- Spreadsheet-style list with sortable columns
- Multi-select for bulk actions
- Inline editing for quick updates

Toggle between views with the switch in the top-right corner.

### Adding a Lead

Click the purple **+** button (bottom-right) to add a new lead:
- Name, email, phone
- Company (auto-links or creates new company)
- Initial status
- Custom fields

### Lead Details

Click any lead to see full details:

- **Details Tab** - Basic info and custom fields
- **Outreach Tab** - LinkedIn and email tracking
- **Offer Tab** - Personalized pitch preview
- **Activity Tab** - Complete history of status changes

### Outreach Tracking

Track your outreach progress for each lead:

**LinkedIn Status:**
- Not Sent → Sent → Opened → Replied / Refused / No Response

**Email Status:**
- Same progression as LinkedIn

### Time in Stage

Leads show color-coded duration indicators:
- 🟢 Green: 0-3 days (fresh)
- 🟠 Orange: 4-7 days (needs attention)
- 🔴 Red: 8+ days (overdue)

### Custom Fields

Add any custom information to leads:
- **Text** - Free-form text
- **Number** - Numeric values
- **Date** - Date picker
- **Dropdown** - Select from predefined options

Dropdown fields show as clickable chips for quick inline editing.

---

## Company Management

### Company Profiles

Each company includes:
- Name, website, industry
- Description and notes
- Custom fields
- Rating system
- Associated leads

### Company Details Page

- **Details** - Basic info, custom fields, rating
- **Leads** - All leads from this company
- **Writing Program** - Detected writing program info
- **Blog** - Blog analysis results
- **Apollo** - Enrichment data
- **Offer** - Blog ideas and pitches

### Company Status

Companies automatically inherit their status from associated leads:
- Status reflects the majority status of linked leads
- Visual badge shows current status

**Manual Override:**
- Click the status badge to manually set status
- Lock icon appears when manually set
- Unlock to return to automatic calculation

### Two Company Views

1. **All Companies** - Standard company list
2. **Writing Programs** - Focus on companies with detected writing programs

---

## Smart Enrichment & AI Analysis

### Apollo.io Integration

**Lead Enrichment:**
- Find verified email addresses
- Get LinkedIn profile URLs
- Discover job titles and phone numbers
- Confirm name spelling before enriching

**Company Enrichment:**
- Employee count and company size
- Funding information
- Technology stack
- Industry classification
- Social media URLs and logo

### Blog Analysis

Analyze any company's blog to assess content quality:

**What You Learn:**
- Last active post date
- Posting frequency (monthly average)
- Writer types (employees vs freelancers)
- Content quality rating (low/medium/high)
- Technical indicators (code examples, AI-written)
- Developer B2B SaaS fit score

**How to Use:**
1. Open company details
2. Go to Blog tab
3. Click "Analyze Blog"
4. Select or enter blog URL

### Writing Program Detection

Find companies that pay for guest content:

**Step 1: Find Writing Program**
- AI searches for "write for us" pages
- Detects application forms and guidelines

**Step 2: Analyze Program**
- Payment amount and method
- Content requirements
- Submission guidelines
- Contact information
- Open/closed dates

### Lead Discovery

Find new contacts at any company:
1. Open company details
2. Click "Discover Leads"
3. Apollo searches for relevant contacts
4. Add selected contacts as leads

### Competitor Discovery

Research competitor companies:
- Find similar companies in your niche
- Sync competitor content
- View competitor blog posts

---

## Filtering & Search

### Quick Filters

Always visible at the top:
- **Search** - Find by name, email, company, phone
- **Status** - Filter by pipeline stage
- **Company** - Filter by company name
- **Lead Owner** - Filter by assigned owner
- **Month** - Filter by activity month

### Advanced Filters

Build complex filter rules:

**Available Operators:**
- Equals / Not equals
- Contains / Starts with / Ends with
- Greater than / Less than
- Before / After (dates)
- Between (date ranges)
- Is true / Is false

**Combine Rules:**
- Add multiple conditions
- Filter on any field including custom fields

### Filter Presets

Save time with reusable filters:

- **Save Preset** - Store current filter setup
- **Load Preset** - Apply saved filters instantly
- **Set Default** - Auto-apply on login
- **Delete Preset** - Remove unused presets

### Table Customization

**Show/Hide Columns:**
- Click column menu icon
- Toggle columns on/off
- Changes persist across sessions

**Reorder Columns:**
- Drag columns to rearrange
- Reset to default grouping anytime

---

## Bulk Operations

### Selecting Multiple Items

In table view:
- Check individual items
- Use "Select All" for current page
- Selection count shows in toolbar

### Available Bulk Actions

**For Leads:**
- **Change Status** - Move all selected to new stage
- **Edit Fields** - Update custom fields across selection
- **Export CSV** - Download selected as spreadsheet
- **Archive** - Soft-delete with optional reason
- **Delete** - Permanently remove (with confirmation)

**For Companies:**
- **Edit Fields** - Bulk update company fields
- **Export CSV** - Download company data
- **Archive** - With option to cascade to leads
- **Delete** - Permanent removal

### CSV Import

Import leads and companies from spreadsheets:

**Step 1: Upload**
- Drag and drop CSV file
- Or click to browse

**Step 2: Map Fields**
- Match CSV columns to CRM fields
- Unmapped columns become custom fields
- Columns with "dropdown" in name auto-detect as dropdown fields

**Step 3: Configure Dropdowns**
- Edit dropdown options before import
- Add, remove, or rename options

**Step 4: Handle Duplicates**
- **Skip** - Ignore duplicates
- **Update** - Merge with existing
- **Create New** - Always create new records

**Deduplication Criteria:**
- Email (primary)
- Name + Company
- Phone number

---

## Archive System

### Why Archive?

Archive leads or companies you don't want to delete but need out of your active view.

### Archiving Leads

- Click the archive button on any lead
- Optionally add a reason
- Lead moves to archived view
- Badge shows archived count

### Archiving Companies

- Archive from company actions menu
- Option to cascade: archive all associated leads too
- Archived companies hidden from main view

### Viewing Archived Items

- Click the "Archived" badge
- Opens modal with all archived items
- Search and filter within archived

### Restoring Items

- Click "Unarchive" on any archived item
- Returns to active CRM
- All data preserved

---

## Analytics & Monitoring

### Lead Analytics

Visual dashboards showing:

- **Lead Count by Status** - Bar chart of pipeline distribution
- **Lead Creation Trends** - Line chart over time
- **Status Distribution** - How leads are spread
- **Outreach Metrics** - LinkedIn/email sent, opened, replied rates

**Time Range Options:** 7 days, 14 days, 30 days, All time

### Company Analytics

- Total company count
- Companies by status breakdown
- Industry distribution
- Archived companies count
- Filter by status

### Project Monitoring

KPI dashboard for managers:

**Activity Metrics:**
- Recent lead activity
- Leads in nurture stage
- Missing data alerts

**Cost Monitoring:**
- AI API costs (OpenAI)
- Apollo credit usage
- Total API calls
- Per-user breakdown (CEO sees all users)

**Company Insights:**
- Companies with multiple leads
- Engagement rankings

---

## Content Generation

### Inbound Analytics

Track your LinkedIn performance:

- **Post Impressions** - How many views
- **Engagement Metrics** - Likes, comments, shares
- **Post Breakdown** - Performance per post
- **Timeline Chart** - Trends over time

Sync LinkedIn data manually when needed.

### AI Content Generation (Beta)

**Gmail Integration:**
1. Connect your Gmail account
2. Sync newsletter emails
3. Configure how many emails and days to include

**AI Trends Analysis:**
- Analyze newsletters for AI/ML trends
- View trend history
- Customize analysis with prompts

**LinkedIn Post Generation:**

1. **Generate Ideas** - AI creates 5 strategic post ideas based on:
   - Your LinkedIn analytics
   - Newsletter content
   - Competitor posts

2. **Write Full Post** - Expand any idea into complete post

3. **Generate Image** - DALL-E creates custom image for post

**Competitor Content:**
- Import competitor posts
- Browse competitor content
- Use for inspiration in content strategy

---

## Team Management

### Team Overview

Visual cards for each team member showing:
- Name and avatar
- Role and department
- Join date
- Specialties/tags

**KPI Summary Cards:**
- Sales Reps count
- Managers count
- Average conversion rate
- Total team size

### Managing Team Members

*CEO Only:*
- Add new team members
- Edit member details
- Remove team members
- View compensation structures

### Performance Tracking

Click any team member to see:
- Individual performance metrics
- Detailed activity breakdown
- Goal progress

---

## Settings & Customization

### Offer Template

Create your outreach template:

**Rich Text Editor:**
- Format text with bold, italic, links
- Structure with headers and lists

**Dynamic Variables:**
Insert placeholders that auto-fill:

| Category | Examples |
|----------|----------|
| Basic | Lead name, email, company |
| Outreach | LinkedIn URL, connection status |
| Dates | Today, this week, this month |
| Company | Industry, size, website |
| Blog Analysis | Rating, frequency, last post |
| Writing Program | Payment, requirements |

**Live Preview:** See how your template looks with sample data.

### AI Prompts

Customize all AI-powered features:

- **Content Generation** prompts
- **Blog Analysis** criteria
- **Writing Program** detection rules
- Save custom prompts or reset to defaults

### LinkedIn Post Settings

Configure AI post generation:

**Post Ideas System (5 prompts):**
1. Analytics Analysis
2. Newsletter Trends Extraction
3. Competitor Insights
4. Post Ideas Generation
5. Full Post Writing

**DALL-E Image Style:** Customize image generation prompt

### AI Trends Settings

- Default email count for analysis
- Custom analysis prompt

### Release Notes

Stay updated on new features and improvements.

---

## Tips & Best Practices

### For Best Results

1. **Keep data clean** - Use deduplication on imports
2. **Enrich strategically** - Save API costs by enriching qualified leads only
3. **Use presets** - Save time with saved filter combinations
4. **Archive, don't delete** - Keep historical data accessible
5. **Check time indicators** - Don't let leads go stale

### Keyboard Shortcuts

- Toggle between Board and Table view with the view switcher
- Use search for quick filtering
- Multi-select with checkboxes for bulk actions

### Getting Help

- Check release notes for new features
- Contact your administrator for role changes
- Report issues through proper channels

---

*Last updated: November 2024*
