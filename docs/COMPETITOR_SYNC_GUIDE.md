# Competitor Content Sync Feature - Implementation Guide

## Overview

The Competitor Content Sync feature allows you to track and analyze LinkedIn posts from your competitors. This feature has been integrated into the **Inbound Generation** page and uses AI (GPT-4) to extract comprehensive post data from LinkedIn profile feeds.

---

## Features

### 1. **Competitor Management**
- ✅ Add unlimited competitors
- ✅ Store competitor LinkedIn URLs and notes
- ✅ Edit and soft-delete competitors
- ✅ Duplicate detection (by name or LinkedIn URL)

### 2. **Content Sync**
- ✅ Copy/paste LinkedIn profile feed HTML
- ✅ AI-powered extraction using GPT-4
- ✅ Extracts comprehensive post data:
  - Post content (full text)
  - Engagement metrics (likes, comments, shares, impressions)
  - Hashtags and mentions
  - Post type (text, image, video, carousel, article, poll, document)
  - Media information
  - Posted date

### 3. **Content View & Analytics**
- ✅ Tabbed view by competitor
- ✅ Metrics dashboard (total posts, engagement, avg engagement rate, impressions)
- ✅ Sortable table with expandable post details
- ✅ Real-time updates via Firestore subscriptions

---

## File Structure

### **TypeScript Interfaces**
```
agency-app/src/types/competitor.ts
```
- `Competitor` - Competitor profile
- `CompetitorPost` - Individual post data
- `CompetitorPostsData` - Extraction result
- `CompetitorSyncMetadata` - Sync status tracking
- `CompetitorMetrics` - Aggregated analytics

### **Services**
```
agency-app/src/services/api/competitorService.ts
```
- `addCompetitor()` - Create new competitor
- `updateCompetitor()` - Update competitor details
- `deleteCompetitor()` - Soft-delete competitor
- `getCompetitors()` - Fetch all active competitors
- `subscribeToCompetitors()` - Real-time competitor updates
- `checkDuplicateCompetitor()` - Prevent duplicates

```
agency-app/src/services/api/competitorPostsService.ts
```
- `extractCompetitorPosts()` - Call Cloud Function to extract posts
- `getCompetitorPosts()` - Fetch posts for a competitor
- `subscribeToCompetitorPosts()` - Real-time post updates
- `getCompetitorMetrics()` - Calculate analytics
- `compareCompetitors()` - Compare multiple competitors
- `deleteCompetitorPosts()` - Clean up posts

### **Components**
```
agency-app/src/components/features/competitors/CompetitorManagementDialog.tsx
```
- Add/edit/delete competitors
- LinkedIn URL validation
- Duplicate detection

```
agency-app/src/components/features/competitors/CompetitorSyncDialog.tsx
```
- Select competitor from dropdown
- Paste LinkedIn feed content
- Trigger AI extraction
- Show sync status and history

```
agency-app/src/components/features/competitors/CompetitorContentView.tsx
```
- Metrics cards (posts, engagement, impressions)
- Tabbed view by competitor
- Expandable post table
- Hashtags and mentions display

### **Cloud Functions**
```
functions/src/competitors/extractCompetitorPosts.ts
```
- GPT-4 extraction using JSON mode
- Parses pasted LinkedIn HTML
- Saves to Firestore in batches
- Updates sync metadata

### **Pages**
```
agency-app/src/pages/analytics/InboundGeneration.tsx
```
- Integrated Gmail sync + Competitor sync
- Speed dial for quick actions
- Two sections: Newsletter Emails & Competitor Content

---

## Firestore Schema

### **Collection: `competitors`**
```typescript
{
  id: string;
  name: string;
  linkedInUrl: string;
  profileUrl?: string;
  notes?: string;
  addedAt: Timestamp;
  addedBy: string;
  active: boolean;
}
```

### **Collection: `competitorPosts/{userId}/competitors/{competitorId}/posts/{postId}`**
```typescript
{
  id: string;
  competitorId: string;
  competitorName: string;
  content: string;
  likes: number;
  comments: number;
  shares: number;
  impressions?: number;
  postedDate: string; // "2w", "3d", etc.
  hashtags: string[];
  mentions: string[];
  postType: 'text' | 'image' | 'video' | 'carousel' | 'article' | 'poll' | 'document';
  mediaInfo?: {
    type: 'image' | 'video' | 'carousel' | 'document';
    count?: number;
    hasAlt?: boolean;
    description?: string;
  };
  extractedAt: Timestamp;
  extractedBy: string;
}
```

### **Collection: `competitorSyncMetadata/{userId}/competitors/{competitorId}`**
```typescript
{
  competitorId: string;
  lastSync: Timestamp | null;
  lastSyncSuccess: boolean;
  postCount: number;
  lastSyncBy?: string;
  lastSyncErrors?: string[];
}
```

---

## Security Rules

```javascript
// Competitors Collection - All authenticated users can manage
match /competitors/{competitorId} {
  allow read, create, update, delete: if isAuthenticated();
}

// Competitor Posts - Users can read their own, only Cloud Functions write
match /competitorPosts/{userId}/competitors/{competitorId}/posts/{postId} {
  allow read: if isAuthenticated() && request.auth.uid == userId;
  allow write: if false; // Only cloud functions
}

// Sync Metadata - Users can read their own, only Cloud Functions write
match /competitorSyncMetadata/{userId}/competitors/{competitorId} {
  allow read: if isAuthenticated() && request.auth.uid == userId;
  allow write: if false; // Only cloud functions
}
```

---

## Usage Instructions

### **Step 1: Add Competitors**
1. Navigate to **Inbound Generation** page
2. Click **"Manage Competitors"** button
3. Click **"Add Competitor"**
4. Fill in:
   - Competitor Name (e.g., "Sebastian Raschka")
   - LinkedIn URL (e.g., "https://www.linkedin.com/in/sebastianraschka/")
   - Optional: Profile URL, Notes
5. Click **"Save"**

### **Step 2: Sync Competitor Posts**
1. Click **"Sync Competitor Posts"** button
2. Select a competitor from dropdown
3. Open competitor's LinkedIn profile in new tab
4. Scroll through their posts (more scrolling = more posts captured)
5. Select all content (Cmd/Ctrl + A)
6. Copy (Cmd/Ctrl + C)
7. Click **"Paste from Clipboard"** or paste manually
8. Click **"Extract Posts"**
9. Wait for AI extraction (~30-120 seconds)

### **Step 3: View & Analyze**
- Posts automatically appear in the **Competitor Content View**
- Switch between competitors using tabs
- View metrics: total posts, engagement, avg rate, impressions
- Expand posts to see full content, hashtags, mentions, media info

---

## AI Extraction Details

### **GPT-4 Extraction Prompt**
The Cloud Function uses GPT-4 with JSON mode to extract:
- All visible posts from pasted content
- Full post text
- Engagement metrics (likes, comments, shares, impressions)
- Hashtags (without # symbol)
- Mentions (without @ symbol)
- Post type classification
- Media metadata

### **Extraction Parameters**
- Model: `gpt-4-turbo-preview`
- Temperature: `0` (deterministic)
- Response format: `json_object`
- Timeout: 120 seconds
- Memory: 512 MiB

---

## Cost Tracking

### **OpenAI Costs**
Each extraction call uses GPT-4 and costs approximately:
- Small batch (10 posts): ~$0.05-0.10
- Medium batch (20 posts): ~$0.10-0.20
- Large batch (50+ posts): ~$0.20-0.50

Costs vary based on:
- Amount of content pasted
- Number of posts in feed
- Detail level of posts

### **Future Enhancement**
Consider integrating with existing `userCostTracking` collection to track competitor sync costs per user.

---

## Next Steps (Future Enhancements)

### **1. AI Post Generation Integration**
Create a Cloud Function that:
- Reads all competitor posts + Gmail newsletter emails
- Uses GPT-4 to generate LinkedIn post ideas
- Considers:
  - Trending topics from competitors
  - Your newsletter content themes
  - Best performing competitor post styles
  - Your brand voice

### **2. Scheduled Auto-Sync**
Add a scheduled Cloud Function to:
- Auto-sync competitor posts daily/weekly
- Send notifications when new posts detected
- Track posting frequency trends

### **3. Advanced Analytics**
- Engagement trend charts over time
- Hashtag frequency analysis
- Post type performance comparison
- Best time to post analysis
- Competitor benchmark comparison

### **4. Export Features**
- CSV export of all competitor posts
- PDF reports with analytics
- Share insights with team

---

## Troubleshooting

### **No posts extracted**
- ✅ Ensure you pasted the FULL LinkedIn feed page (not just a single post)
- ✅ Scroll through more posts before copying (LinkedIn lazy-loads)
- ✅ Check that pasted content is >100 characters

### **Extraction failed**
- ✅ Verify OpenAI API key is configured in Cloud Function environment
- ✅ Check Cloud Function logs in Firebase Console
- ✅ Ensure sufficient OpenAI credits

### **Competitor not appearing**
- ✅ Check that competitor is marked as `active: true`
- ✅ Verify Firestore security rules allow read access
- ✅ Refresh page or check browser console for errors

### **Real-time updates not working**
- ✅ Ensure Firestore subscriptions are active
- ✅ Check network connectivity
- ✅ Verify user is authenticated

---

## Deployment Checklist

### **Before deploying to production:**

1. **Deploy Cloud Function**
   ```bash
   cd functions
   npm run deploy
   # OR deploy specific function:
   firebase deploy --only functions:extractCompetitorPosts
   ```

2. **Deploy Firestore Rules**
   ```bash
   firebase deploy --only firestore:rules
   ```

3. **Verify Environment Variables**
   - Ensure `OPENAI_API_KEY` is set in Cloud Functions

4. **Test Workflow**
   - Add test competitor
   - Sync test posts
   - Verify data in Firestore
   - Check extraction accuracy

5. **Monitor Costs**
   - Set up budget alerts in OpenAI dashboard
   - Monitor Cloud Function execution logs
   - Track Firestore read/write operations

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Inbound Generation Page                   │
│                                                              │
│  ┌─────────────────────┐     ┌──────────────────────────┐  │
│  │  Gmail Sync Section │     │ Competitor Sync Section  │  │
│  │  (Existing)         │     │  (NEW)                   │  │
│  └─────────────────────┘     └──────────────────────────┘  │
│                                         │                    │
│                              ┌──────────┴──────────┐         │
│                              │                     │         │
│                    ┌─────────▼─────────┐  ┌───────▼──────┐ │
│                    │  Manage Dialog    │  │  Sync Dialog │ │
│                    │  (Add/Edit/Delete)│  │  (Paste/Sync)│ │
│                    └─────────┬─────────┘  └───────┬──────┘ │
└──────────────────────────────┼────────────────────┼─────────┘
                               │                     │
                     ┌─────────▼─────────┐  ┌────────▼────────┐
                     │ competitorService │  │ Cloud Function  │
                     │  (CRUD ops)       │  │ extractPosts    │
                     └─────────┬─────────┘  └────────┬────────┘
                               │                      │
                               │         ┌────────────▼─────┐
                               │         │  OpenAI GPT-4    │
                               │         │  (Extract Data)  │
                               │         └────────────┬─────┘
                     ┌─────────▼──────────────────────▼─────┐
                     │           Firestore                  │
                     │  • competitors                       │
                     │  • competitorPosts/{user}/...        │
                     │  • competitorSyncMetadata/{user}/... │
                     └──────────────────────────────────────┘
```

---

## Summary

You now have a fully functional competitor content tracking system that:
- ✅ Manages unlimited competitors
- ✅ Syncs LinkedIn posts via AI extraction
- ✅ Displays comprehensive analytics
- ✅ Provides real-time updates
- ✅ Integrates seamlessly with existing Gmail sync

The next phase would be to build the AI post generation feature that uses this competitor data + newsletter emails to suggest LinkedIn post ideas!

---

**Questions or Issues?**
Check the Cloud Function logs, Firestore data, and browser console for debugging.
