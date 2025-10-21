# Data Models Documentation

This document provides a comprehensive overview of all data models, interfaces, and types used in the Agency Management Platform.

---

## Core Business Models

### 1. Task System (Subcollection Architecture)
**Description**: Modular task system with main document + 3 subcollections for better organization and performance

#### Main Task Document
**Collection**: `tasks`
**Description**: Core task information for listing, filtering, and basic operations

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | ✅ | Unique task identifier |
| title | string | ✅ | Task title/name |
| description | string | ✅ | Detailed task description |
| clientName | string | ✅ | Name of the associated client |
| writerName | string | ✅ | Assigned writer's name |
| status | TaskStatus | ✅ | Current task status (todo, in_progress, etc.) |
| priority | TaskPriority | ✅ | Task priority level (low, medium, high) |
| type | 'blog' \| 'tutorial' | ✅ | Type of content to create |
| dueDate | string | ✅ | Task deadline (ISO string) |
| createdAt | any | ✅ | Task creation timestamp |
| updatedAt | any | ✅ | Last update timestamp |
| assignedTo | string | ❌ | Assigned team member ID |
| reviewedBy | string | ❌ | Reviewer's ID |
| articleIdeaId | string | ❌ | Link to originating article idea |
| aiReviewCompleted | boolean | ❌ | Simple flag for quick filtering |

#### TaskContent Subcollection
**Collection**: `tasks/{taskId}/content`
**Description**: Content creation, submissions, and review data

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | ✅ | Same as parent task ID |
| taskId | string | ✅ | Reference to parent task |
| content | string | ❌ | Rich HTML content |
| wordCount | number | ❌ | Calculated word count |
| finalArticleSubmissionGoogleDocsLink | string | ❌ | Google Docs submission link |
| targetKeywords | string[] | ❌ | SEO keywords to target |
| category | string | ❌ | Content category |
| labels | string[] | ❌ | Task labels/tags |
| estimatedWordCount | number | ❌ | Target word count |
| aiReview | AIReview | ❌ | AI review results |
| reviewNotes | string | ❌ | Human review notes |
| completedAt | string | ❌ | Task completion timestamp |
| createdAt | any | ✅ | Creation timestamp |
| updatedAt | any | ✅ | Last update timestamp |

#### TaskFinancials Subcollection
**Collection**: `tasks/{taskId}/financials`
**Description**: Financial tracking, compensation, and time logging

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | ✅ | Same as parent task ID |
| taskId | string | ✅ | Reference to parent task |
| estimatedRevenue | number | ❌ | Expected revenue from task |
| actualRevenue | number | ❌ | Actual revenue earned |
| assigneeHours | number | ❌ | Hours spent by assignee |
| reviewerHours | number | ❌ | Hours spent by reviewer |
| totalCost | number | ❌ | Total task cost |
| costBreakdown | object | ❌ | Detailed cost breakdown |
| createdAt | any | ✅ | Creation timestamp |
| updatedAt | any | ✅ | Last update timestamp |

#### TaskTimeline Subcollection
**Collection**: `tasks/{taskId}/timeline`
**Description**: State transitions, audit trail, and workflow history

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | ✅ | Same as parent task ID |
| taskId | string | ✅ | Reference to parent task |
| stateHistory | object | ✅ | Timestamps for each status transition |
| statusChanges | TaskStatusChange[] | ❌ | Detailed change log array |
| createdAt | any | ✅ | Creation timestamp |
| updatedAt | any | ✅ | Last update timestamp |

#### TaskStatusChange
**Description**: Individual status change record for detailed audit trail

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | ✅ | Change record identifier |
| fromStatus | TaskStatus \| null | ✅ | Previous status (null for creation) |
| toStatus | TaskStatus | ✅ | New status |
| changedBy | string | ✅ | User ID who made the change |
| changedAt | string | ✅ | ISO timestamp of change |
| notes | string | ❌ | Optional notes about the change |
| automaticChange | boolean | ❌ | Whether it was a system change |

#### TaskWithSubcollections
**Description**: Complete task interface when all subcollection data is needed

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| ...Task | Task | ✅ | All main task fields |
| content | TaskContent | ❌ | Content subcollection data |
| financials | TaskFinancials | ❌ | Financial subcollection data |
| timeline | TaskTimeline | ❌ | Timeline subcollection data |

#### Cost Breakdown Object (within TaskFinancials)
- `assigneeCost`: number - Cost for assignee work
- `reviewerCost`: number - Cost for reviewer work
- `assigneeRate`: number | string - Hourly rate or "Fixed"
- `reviewerRate`: number | string - Hourly rate or "Fixed"

#### State History Object (within TaskTimeline)
Tracks when tasks transition between states:
- `todo`: ISO timestamp
- `in_progress`: ISO timestamp
- `internal_review`: ISO timestamp
- `client_review`: ISO timestamp
- `done`: ISO timestamp
- `invoiced`: ISO timestamp
- `paid`: ISO timestamp

---

### 2. Client
**Description**: Business client information and configuration

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | ✅ | Unique client identifier |
| name | string | ✅ | Client company name |
| industry | string | ✅ | Business industry/sector |
| contactEmail | string | ✅ | Primary contact email |
| contactPhone | string | ✅ | Primary contact phone |
| address | string | ✅ | Business address |
| website | string | ✅ | Company website URL |
| status | string | ✅ | Client status (active, inactive) |
| contractValue | number | ✅ | Total contract value |
| monthlyRevenue | number | ✅ | Expected monthly revenue |
| startDate | string | ✅ | Contract start date |
| notes | string | ✅ | Additional client notes |
| guidelines | ClientGuidelines | ❌ | Content creation guidelines |
| compensation | ClientCompensation | ❌ | Payment rates for different content types |

---

### 3. User & Authentication
**Description**: User accounts and authentication system

#### User
| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | ✅ | Unique user identifier |
| email | string | ✅ | User email address |
| displayName | string | ❌ | User's display name |

#### UserProfile
| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| uid | string | ✅ | Firebase user ID |
| email | string | ✅ | User email address |
| role | UserRole | ✅ | User role/permission level |
| displayName | string | ❌ | User's display name |
| department | string | ❌ | User's department |
| phoneNumber | string | ❌ | Contact phone number |
| specialties | string[] | ❌ | User's skill specialties |
| joinDate | string | ❌ | Account creation date |
| performance | UserPerformance | ❌ | Performance metrics |

#### UserPerformance
| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| averageScore | number | ✅ | Average quality score |
| tasksCompleted | number | ✅ | Total completed tasks |
| onTimeDelivery | number | ✅ | On-time delivery percentage |

---

## Supporting Models

### 4. Article Ideas
**Description**: Content planning and idea management

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | ✅ | Unique idea identifier |
| clientId | string | ✅ | Associated client ID |
| title | string | ✅ | Article title/topic |
| description | string | ✅ | Detailed description |
| targetMonth | string | ✅ | Target publication month |
| status | 'idea' \| 'assigned' \| 'in_progress' \| 'completed' | ✅ | Idea status |
| priority | 'low' \| 'medium' \| 'high' | ✅ | Priority level |
| type | 'blog' \| 'tutorial' | ✅ | Content type |
| estimatedWordCount | number | ✅ | Target word count |
| targetKeywords | string[] | ✅ | SEO keywords |
| category | string | ✅ | Content category |
| createdAt | any | ✅ | Creation timestamp |
| assignedTo | string | ❌ | Assigned writer |
| taskId | string | ❌ | Created task ID |

---

### 5. Client Guidelines System

#### ClientGuidelines
**Description**: Content creation guidelines and brand standards

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| sections | GuidelineSection[] | ❌ | Structured guideline sections |
| brandVoice | string | ❌ | Legacy: Brand voice description |
| targetAudience | string | ❌ | Legacy: Target audience info |
| contentStyle | string | ❌ | Legacy: Content style guide |
| keyMessages | string[] | ❌ | Legacy: Key messaging points |
| avoidTopics | string[] | ❌ | Legacy: Topics to avoid |
| preferredFormats | string[] | ❌ | Legacy: Preferred content formats |
| seoKeywords | string[] | ❌ | Legacy: SEO keywords |
| competitorAnalysis | string | ❌ | Legacy: Competitor info |
| content | string | ❌ | Legacy: Single content field |
| updatedAt | string | ❌ | Last update timestamp |

#### GuidelineSection
| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | ✅ | Section identifier |
| title | string | ✅ | Section title |
| content | string | ✅ | Section content |
| order | number | ✅ | Display order |
| type | 'freeform' \| 'checklist' | ✅ | Content type |
| checklistItems | ChecklistItem[] | ❌ | Checklist items if applicable |

#### ChecklistItem
| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | ✅ | Item identifier |
| text | string | ✅ | Checklist item text |
| order | number | ✅ | Display order |

#### ClientCompensation
| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| blogRate | number | ❌ | Payment rate for blog posts |
| tutorialRate | number | ❌ | Payment rate for tutorials |
| caseStudyRate | number | ❌ | Payment rate for case studies |
| whitepaperRate | number | ❌ | Payment rate for whitepapers |
| socialMediaRate | number | ❌ | Payment rate for social media |
| emailRate | number | ❌ | Payment rate for email content |
| landingPageRate | number | ❌ | Payment rate for landing pages |
| otherRate | number | ❌ | Payment rate for other content |

---

### 6. Alert Rules System
**Description**: Automated monitoring and notification system

#### BaseAlertRule
Base interface for all alert rules:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | ✅ | Rule identifier |
| name | string | ✅ | Rule display name |
| description | string | ✅ | Rule description |
| enabled | boolean | ✅ | Whether rule is active |
| type | AlertRuleType | ✅ | Type of alert rule |
| slackChannel | string | ✅ | Slack notification channel |
| createdAt | string | ✅ | Creation timestamp |
| updatedAt | string | ✅ | Last update timestamp |

#### TaskBasedAlertRule
Monitors task status and transitions:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| type | 'task-based' | ✅ | Rule type identifier |
| conditions.statuses | TaskStatus[] | ✅ | Task statuses to monitor |
| conditions.daysInState | number | ✅ | Days threshold for alerts |
| conditions.clientName | string | ❌ | Filter by specific client |
| conditions.taskType | 'blog' \| 'tutorial' | ❌ | Filter by task type |

#### WriterBasedAlertRule
Monitors writer workload and activity:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| type | 'writer-based' | ✅ | Rule type identifier |
| conditions.alertType | 'no-tasks-assigned' \| 'overloaded' \| 'inactive' | ✅ | Alert trigger type |
| conditions.thresholdDays | number | ❌ | Days threshold for inactive writers |
| conditions.maxTasks | number | ❌ | Max tasks for overload detection |
| conditions.writerName | string | ❌ | Filter by specific writer |

#### ClientBasedAlertRule
Monitors client activity:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| type | 'client-based' | ✅ | Rule type identifier |
| conditions.alertType | 'no-recent-tasks' \| 'no-new-tasks' | ✅ | Alert trigger type |
| conditions.thresholdDays | number | ✅ | Days without activity threshold |
| conditions.clientName | string | ❌ | Filter by specific client |

#### SystemBasedAlertRule
Monitors overall system health:

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| type | 'system-based' | ✅ | Rule type identifier |
| conditions.alertType | 'no-active-work' \| 'low-activity' \| 'no-new-tasks-created' \| 'all-tasks-stuck' | ✅ | Alert trigger type |
| conditions.thresholdValue | number | ❌ | Threshold for low-activity alerts |
| conditions.thresholdDays | number | ❌ | Days threshold for various checks |
| conditions.statuses | TaskStatus[] | ❌ | Statuses to check for stuck tasks |

---

### 7. AI Review System

#### AIReview
**Description**: AI-powered content quality assessment

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| overallScore | number | ✅ | Overall quality score (0-100) |
| categories | object | ✅ | Category-specific scores |
| feedback | string | ✅ | General feedback text |
| suggestions | string[] | ✅ | Improvement suggestions |

---

### 8. Team Management

#### TeamMember
**Description**: Team member information and compensation

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| id | string | ✅ | Member identifier |
| email | string | ✅ | Contact email |
| displayName | string | ✅ | Display name |
| role | string | ✅ | Team role |
| compensation | CompensationStructure | ❌ | Payment structure |

#### CompensationStructure
| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| type | 'hourly' \| 'fixed' | ✅ | Compensation type |
| hourlyRate | number | ❌ | Hourly payment rate |
| blogRate | number | ❌ | Fixed rate for blogs |
| tutorialRate | number | ❌ | Fixed rate for tutorials |

---

### 9. Analytics & Trends

#### TrendDataPoint
**Description**: Time-series data point for analytics

| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| date | string | ✅ | Data point date |
| [clientName] | number \| string | ❌ | Dynamic client-specific metrics |

#### ClientMetrics
| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| revenue | number | ✅ | Revenue metric |
| profit | number | ✅ | Profit metric |
| articles | number | ✅ | Article count metric |

#### ProcessedTrendData
| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| data | TrendDataPoint[] | ✅ | Array of data points |
| clients | string[] | ✅ | Client names in dataset |
| dateRange | object | ✅ | Start and end dates |

#### TrendsFilterState
| Field Name | Type | Required | Description |
|------------|------|----------|-------------|
| timeRange | TimeRange | ✅ | Selected time range |
| customStartDate | Date | ❌ | Custom start date |
| customEndDate | Date | ❌ | Custom end date |
| selectedClients | string[] | ✅ | Filtered clients |
| selectedMetrics | MetricType[] | ✅ | Selected metrics to display |

---

## Type Definitions & Enums

### Status & Priority Types
```typescript
// Task statuses (workflow states)
type TaskStatus = 'todo' | 'in_progress' | 'internal_review' | 'client_review' | 'done' | 'invoiced' | 'paid'

// Task priority levels
type TaskPriority = 'low' | 'medium' | 'high'

// User roles and permissions
type UserRole = 'admin' | 'manager' | 'writer' | 'viewer' | 'CEO' | 'Manager' | 'Writer'

// Alert rule categories
type AlertRuleType = 'task-based' | 'writer-based' | 'client-based' | 'system-based'
```

### Analytics Types
```typescript
// Time range options for analytics
type TimeRange = '7d' | '30d' | '3m' | '6m' | '1y' | 'custom'

// Metric types for trend analysis
type MetricType = 'revenue' | 'profit' | 'articles'
```

### Union Types
```typescript
// Combined alert rule type (union of all alert rule interfaces)
type AlertRule = TaskBasedAlertRule | WriterBasedAlertRule | ClientBasedAlertRule | SystemBasedAlertRule

// User type alias for backward compatibility
type AuthUser = User
```

---

## Database Collections Structure

### Firestore Collections
Based on the Firebase integration, the following collections exist:

1. **tasks** - Task documents
2. **clients** - Client documents
3. **users** - User profile documents
4. **alertRules** - Alert rule configurations
5. **documentAnalysisRequests** - AI analysis requests

### Key Relationships
- Tasks reference clients by `clientName` field
- Tasks reference users by `assignedTo` and `reviewedBy` fields
- Alert rules can filter by client names and writer names
- Article ideas link to tasks via `taskId` field
- Guidelines are embedded within client documents

---

*Last updated: Generated automatically from TypeScript interfaces*