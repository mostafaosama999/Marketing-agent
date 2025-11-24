# RAG System Architecture

Retrieval-Augmented Generation (RAG) for LinkedIn Post Generation.

## Overview

The RAG system enhances LinkedIn post generation by semantically retrieving relevant content from indexed data sources instead of brute-force analyzing all content.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           DATA SOURCES                                   │
├─────────────────┬─────────────────┬─────────────────┬───────────────────┤
│   Newsletters   │ LinkedIn Posts  │ Competitor Posts│   User Emails     │
│   ✅ Indexed    │   ⬜ Phase 2    │   ⬜ Phase 3    │   ⬜ Phase 4      │
└────────┬────────┴────────┬────────┴────────┬────────┴─────────┬─────────┘
         │                 │                 │                  │
         ▼                 ▼                 ▼                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         INDEXING PIPELINE                                │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │  Chunk   │───▶│  Embed   │───▶│  Upsert  │───▶│  Qdrant Cloud    │   │
│  │  Text    │    │ (OpenAI) │    │  Vectors │    │  Vector Database │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         RETRIEVAL PIPELINE                               │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────────┐   │
│  │  Query   │───▶│  Embed   │───▶│  Search  │───▶│  Top-K Chunks    │   │
│  │  Topics  │    │  Query   │    │  Qdrant  │    │  + Relevance %   │   │
│  └──────────┘    └──────────┘    └──────────┘    └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         GENERATION PIPELINE                              │
│  ┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐   │
│  │ Retrieved Context │───▶│  GPT-4 Prompt   │───▶│  Post Ideas with │   │
│  │ + Analytics Data  │    │  with Citations  │    │  Source Citations│   │
│  └──────────────────┘    └──────────────────┘    └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. Qdrant Client (`qdrantClient.ts`)

Vector database connection and operations.

```typescript
// Collections for different content types
COLLECTIONS = {
  NEWSLETTERS: 'newsletters',      // ✅ Active
  EMAILS: 'emails',                // Future: voice/tone modeling
  LINKEDIN_POSTS: 'linkedin_posts', // Future: performance patterns
  COMPETITOR_POSTS: 'competitor_posts', // Future: competitive analysis
}

// Vector dimensions (OpenAI text-embedding-3-small)
EMBEDDING_DIMENSION = 1536
```

**Configuration:**
```bash
firebase functions:config:set qdrant.url="https://xxx.cloud.qdrant.io:6333" qdrant.api_key="xxx"
```

### 2. Embeddings (`embeddings.ts`)

OpenAI embedding generation with chunking.

- **Model**: `text-embedding-3-small` (1536 dimensions)
- **Cost**: $0.02 per 1M tokens
- **Max chunk size**: 8000 tokens (~32K chars)
- **Chunking strategy**: Paragraph → Sentence boundaries

**Key Functions:**
- `embedText(text)` - Single text embedding
- `embedTexts(texts[])` - Batch embeddings (up to 100 at a time)
- `chunkText(text)` - Smart text chunking
- `prepareNewsletterForEmbedding()` - Newsletter preprocessing

### 3. Newsletter Indexer (`newsletterIndexer.ts`)

Indexes newsletters from Firestore into Qdrant.

**Firestore Path:** `newsletters/emails/items/{emailId}`

**Process:**
1. Fetch unindexed newsletters
2. Prepare content (subject + body + from)
3. Chunk into semantic units
4. Generate embeddings
5. Upsert to Qdrant with metadata
6. Mark as indexed in Firestore

**Payload Structure:**
```typescript
{
  emailId: string,
  chunkIndex: number,
  text: string,
  subject: string,
  from: { name, email },
  date: string (ISO),
  userId: string,
  sourceType: 'newsletter'
}
```

### 4. Newsletter Retrieval (`newsletterRetrieval.ts`)

Semantic search over indexed content.

**Key Functions:**
- `retrieveRelevantNewsletters(query, userId, limit, minScore)`
- `retrieveForMultipleTopics(queries[], userId)`
- `retrieveWithRecencyBoost(query, userId, recencyDays)`
- `formatContextForPrompt(result)` - LLM-ready formatting
- `getTrendingTopicsFromNewsletters()` - Topic discovery

**Retrieval Result:**
```typescript
{
  chunks: [{
    text: string,
    subject: string,
    from: string,
    date: string,
    relevanceScore: number, // 0-1
    emailId: string
  }],
  groupedBySource: NewsletterContext[],
  totalChunks: number,
  query: string
}
```

### 5. RAG Functions (`ragFunctions.ts`)

Firebase Cloud Functions for RAG operations.

| Function | Description |
|----------|-------------|
| `indexNewsletters` | Index all unindexed newsletters |
| `indexSingleNewsletter` | Index one newsletter by ID |
| `getRAGStatus` | Get indexing stats (total, indexed, chunks) |

### 6. RAG-Enhanced Generation

**Post Ideas (`generatePostIdeasRAG.ts`):**
1. Retrieve trending topics from newsletters
2. Combine with LinkedIn analytics + competitor insights
3. Generate 5 ideas with source citations
4. Each idea includes: topic, angle, hook, relevance score

**Full Post (`generatePostFromIdeaRAG.ts`):**
1. Retrieve content relevant to selected idea
2. Include all 5 trend contexts (not just selected)
3. Generate post with citations
4. Track costs per operation

---

## Current State (MVP)

### What's Working
- ✅ Newsletter indexing (86 newsletters → 91 chunks)
- ✅ Semantic search with relevance scoring
- ✅ RAG toggle in UI
- ✅ Source citations in generated content
- ✅ Cost tracking per operation
- ✅ Recency boost for recent content

### Statistics
- **Indexed**: 86 newsletters
- **Chunks**: 91 (avg ~1 chunk per newsletter)
- **Vector DB**: Qdrant Cloud
- **Embedding Model**: text-embedding-3-small

---

## What's Next (Roadmap)

### Phase 2: LinkedIn Analytics Integration
Index user's LinkedIn post performance data:
- Top performing posts
- Engagement patterns
- Best posting times
- Content themes that resonate

**Benefits:** Learn what works for this specific user

### Phase 3: Competitor Posts Indexing
Index competitor LinkedIn posts:
- Content themes
- Engagement metrics
- Posting frequency
- Successful hooks/formats

**Benefits:** Competitive intelligence, identify gaps

### Phase 4: User Email Indexing (Voice/Tone)
Index user's sent emails:
- Writing style patterns
- Common phrases
- Tone characteristics
- Industry terminology

**Benefits:** Generate posts matching user's voice

### Phase 5: Multi-Source Fusion
Combine all sources with weighted retrieval:
```
Final Score = (newsletter_relevance * 0.3) +
              (analytics_relevance * 0.3) +
              (competitor_relevance * 0.2) +
              (voice_match * 0.2)
```

**Benefits:** Holistic context for best results

### Phase 6: Incremental Indexing
Auto-index new content:
- Firestore triggers on new newsletters
- Scheduled sync for LinkedIn data
- Real-time competitor monitoring

**Benefits:** Always up-to-date index

---

## Configuration

### Required Firebase Config

```bash
# Qdrant Vector Database
firebase functions:config:set qdrant.url="YOUR_QDRANT_URL"
firebase functions:config:set qdrant.api_key="YOUR_QDRANT_API_KEY"

# OpenAI (already configured for other functions)
firebase functions:config:set openai.key="YOUR_OPENAI_KEY"
```

### Qdrant Cloud Setup

1. Create account at [cloud.qdrant.io](https://cloud.qdrant.io)
2. Create a cluster (free tier: 1GB)
3. Get cluster URL and API key
4. Set Firebase config as above

---

## API Reference

### Frontend Service (`postIdeasService.ts`)

```typescript
// Check RAG system status
const status = await getRAGStatus();
// { isReady: true, stats: { totalNewsletters: 86, indexedNewsletters: 86, totalChunks: 91 } }

// Index all newsletters
const result = await indexNewslettersForRAG();
// { success: true, stats: { totalNewsletters: 86, indexedNewsletters: 86, totalChunks: 91 } }

// Generate ideas with RAG
const ideas = await generatePostIdeasRAG();
// Returns ideas with source citations

// Generate full post with RAG
const post = await generatePostFromIdeaRAG(sessionId, ideaId);
// Returns post with embedded citations
```

### Cloud Functions

```typescript
// Index newsletters
POST /indexNewsletters
// No params, indexes all unindexed newsletters

// Get status
POST /getRAGStatus
// Returns { isReady, stats, message }

// Generate ideas (RAG)
POST /generatePostIdeasRAG
// Uses semantic search for context

// Generate post (RAG)
POST /generatePostFromIdeaRAG
// Body: { sessionId, ideaId }
```

---

## Cost Breakdown

| Operation | Model | Cost |
|-----------|-------|------|
| Embedding | text-embedding-3-small | $0.02/1M tokens |
| Trend Analysis | GPT-4 | ~$0.03/call |
| Idea Generation | GPT-4 | ~$0.05/call |
| Post Generation | GPT-4 | ~$0.08/call |

**Typical RAG Generation:** ~$0.15-0.25 total

---

## File Structure

```
functions/src/rag/
├── README.md                 # This file
├── index.ts                  # Exports
├── qdrantClient.ts          # Vector DB client
├── embeddings.ts            # OpenAI embeddings
├── newsletterIndexer.ts     # Newsletter indexing
├── newsletterRetrieval.ts   # Semantic search
└── ragFunctions.ts          # Cloud functions

functions/src/linkedinGeneration/
├── generatePostIdeasRAG.ts  # RAG idea generation
└── generatePostFromIdeaRAG.ts # RAG post generation

functions/src/prompts/
└── postIdeasPrompt.ts       # RAG-enhanced prompts
```

---

## Troubleshooting

### "OPENAI_API_KEY not found"
The embeddings service uses Firebase config:
```bash
firebase functions:config:set openai.key="sk-xxx"
firebase deploy --only functions:indexNewsletters
```

### "Qdrant connection failed"
Check Qdrant config:
```bash
firebase functions:config:get
# Should show qdrant.url and qdrant.api_key
```

### "No chunks returned"
- Check minimum relevance score (default 0.3)
- Verify newsletters are indexed (`getRAGStatus`)
- Try broader search queries

### "Slow indexing"
- Batch size is 10 newsletters at a time
- 86 newsletters takes ~30-60 seconds
- Consider indexing incrementally for large datasets
