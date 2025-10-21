# Blog Qualifier Service

A TypeScript service that analyzes company blogs to determine if they meet specific qualification criteria using RSS feeds and OpenAI for intelligent analysis.

## Features

### Qualification Criteria

The service checks if companies meet ALL of these criteria:

1. **Active Blog**: 1+ blog posts published in the last 30 days
2. **Multiple Authors**: 2+ unique authors contributing to the blog
3. **Developer-first B2B SaaS**: Company builds tools/platforms for developers

### Analysis Methods

1. **RSS Feed Discovery** (Primary)
   - Searches 30+ common RSS feed paths
   - Platform-specific patterns (Medium, WordPress, Substack, etc.)
   - Parses HTML to find RSS links
   - Analyzes blog pages for feed URLs

2. **AI Analysis** (Fallback)
   - Uses OpenAI GPT-4 when RSS feed not found
   - Scrapes and analyzes blog page content
   - Extracts author information, post frequency, and topics
   - Identifies company type and content themes

### Data Collected

For each company, the service provides:

- **Blog Activity**
  - Number of posts in last 30 days
  - Last post publication date
  - Blog URL used for analysis

- **Author Information**
  - Number of unique authors
  - List of author names
  - Whether authors are employees, freelancers, or mixed

- **Company Classification**
  - Is it a developer-first B2B SaaS company?
  - Does the blog cover AI/ML topics?
  - Content summary with main themes

- **Technical Details**
  - RSS feed URL (if found)
  - Analysis method used (RSS, AI, or hybrid)

## Installation

The required packages are already installed in the functions directory:

- `axios` - HTTP requests
- `cheerio` - HTML parsing
- `rss-parser` - RSS feed parsing
- `openai` - OpenAI API integration

## Usage

### Basic Usage - Single Company

```typescript
import {qualifyCompany} from "./utils/blogQualifierService";
import {CompanyInput} from "./types";

const company: CompanyInput = {
  name: "Example Inc",
  website: "https://example.com",
  description: "Optional description",
};

const openaiApiKey = process.env.OPENAI_API_KEY || "sk-...";

const result = await qualifyCompany(company, openaiApiKey);

console.log(`Qualified: ${result.qualified}`);
console.log(`Posts: ${result.blogPostCount}`);
console.log(`Authors: ${result.authorCount}`);
```

### Batch Processing - Multiple Companies

```typescript
import {qualifyCompanies} from "./utils/blogQualifierService";

const companies: CompanyInput[] = [
  {name: "Company A", website: "https://companya.com"},
  {name: "Company B", website: "https://companyb.com"},
  {name: "Company C", website: "https://companyc.com"},
];

const openaiApiKey = process.env.OPENAI_API_KEY!;

// Third parameter is delay between companies in milliseconds (default: 2000ms)
const results = await qualifyCompanies(companies, openaiApiKey, 2000);

// Filter qualified companies
const qualified = results.filter(r => r.qualified);
console.log(`Qualified: ${qualified.length}/${results.length}`);
```

### Testing

Run the test script:

```bash
# Set your OpenAI API key
export OPENAI_API_KEY=sk-your-api-key-here

# Build TypeScript
cd functions
npm run build

# Run test script
node lib/scripts/testBlogQualifier.js
```

### In a Cloud Function

```typescript
import * as functions from "firebase-functions";
import {qualifyCompany} from "./utils/blogQualifierService";

export const qualifyCompanyBlog = functions.https.onCall(async (data, context) => {
  // Verify authentication
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
  }

  const {companyName, website} = data;

  if (!companyName || !website) {
    throw new functions.https.HttpsError("invalid-argument", "Missing required fields");
  }

  // Get OpenAI API key from environment
  const openaiApiKey = functions.config().openai?.key;
  if (!openaiApiKey) {
    throw new functions.https.HttpsError("failed-precondition", "OpenAI API key not configured");
  }

  const company = {name: companyName, website};
  const result = await qualifyCompany(company, openaiApiKey);

  return result;
});
```

## Result Interface

```typescript
interface BlogQualificationResult {
  // Company Info
  companyName: string;
  website: string;

  // Qualification Criteria
  hasActiveBlog: boolean;          // 1+ posts in last 30 days
  hasMultipleAuthors: boolean;     // 2+ unique authors
  isDeveloperB2BSaas: boolean;     // Developer-first B2B SaaS

  // Blog Metrics
  blogPostCount: number;           // Posts in last 30 days
  lastBlogCreatedAt: string;       // ISO date of last post
  blogLinkUsed: string;            // Blog or RSS URL used

  // Author Information
  authorCount: number;             // Number of unique authors
  authorNames: string;             // Comma-separated author names
  authorsAreEmployees: "employees" | "freelancers" | "mixed" | "unknown";

  // Content Analysis
  coversAiTopics: boolean;         // Blog discusses AI/ML topics
  contentSummary: string;          // Bullet points of main topics

  // Technical Details
  rssFeedFound: boolean;           // Whether RSS feed was found
  analysisMethod: "RSS" | "AI" | "RSS + AI (authors)" | "None";

  // Final Result
  qualified: boolean;              // Meets ALL 3 criteria
}
```

## How It Works

### 1. RSS Feed Discovery Process

```
Try platform-specific patterns (Medium, WordPress, etc.)
  ↓
Try 20+ common RSS paths (/feed, /rss, /blog/feed, etc.)
  ↓
Parse HTML for <link type="application/rss+xml">
  ↓
Search blog pages (/blog, /news, etc.) for RSS links
  ↓
If found → Parse feed and analyze posts
  ↓
If not found → Fall back to AI analysis
```

### 2. Author Detection

**From RSS Feed:**
- Extracts `author`, `creator`, or `dc:creator` fields
- Filters out "Unknown", "Admin", etc.
- Counts unique authors

**From AI Analysis:**
- Analyzes blog page content
- Identifies author bylines
- Determines if authors are employees or freelancers

### 3. Developer B2B SaaS Detection

AI analyzes content for:
- APIs, SDKs, developer tools
- Infrastructure platforms
- Technical documentation
- Developer-focused language

### 4. AI Topics Detection

Checks for mentions of:
- LLMs, RAG, AI agents
- Machine learning, transformers
- GPT, Claude, embeddings
- Vector databases, neural networks

## Examples

See the following files for detailed examples:

- `src/examples/blogQualifierExample.ts` - Usage examples
- `src/scripts/testBlogQualifier.ts` - Test script

## Configuration

### OpenAI Settings

The service uses these OpenAI settings:

```typescript
{
  model: "gpt-4-turbo-preview",
  temperature: 0.3,  // Lower temperature for more consistent results
}
```

### Rate Limiting

When processing multiple companies, add delays to avoid rate limits:

```typescript
// Wait 2 seconds between companies (default)
await qualifyCompanies(companies, apiKey, 2000);

// Increase delay if you hit rate limits
await qualifyCompanies(companies, apiKey, 5000);
```

### Timeouts

- Website scraping: 10 seconds
- RSS feed requests: 5-10 seconds
- OpenAI API: Default timeout

## Error Handling

The service handles errors gracefully:

- **Network errors**: Returns default values, attempts AI fallback
- **Invalid URLs**: Logs error and continues
- **API errors**: Logs error, returns empty analysis
- **Parsing errors**: Falls back to alternative methods

## Performance Considerations

- **Single company**: ~5-15 seconds (depending on method)
- **RSS analysis**: ~5 seconds (faster)
- **AI analysis**: ~10-15 seconds (slower but more comprehensive)
- **Batch processing**: Add delays to avoid rate limits

## Cost Estimates

OpenAI API costs (GPT-4 Turbo):

- **RSS successful**: $0.00 (no AI calls)
- **AI fallback**: ~$0.01-0.02 per company
- **Batch of 100 companies**: ~$1-2 if all use AI

Optimization: RSS feed discovery is attempted first to minimize AI API costs.

## Troubleshooting

### "No RSS feed found"
- Normal - the service will automatically try AI analysis
- Not all blogs have RSS feeds

### "Could not find or scrape blog page"
- Website may block automated requests
- No blog page exists at common paths
- Try providing explicit blog URL

### "Failed to parse AI response"
- Rare - AI didn't return valid JSON
- Service returns default values
- Check OpenAI API status

### "OPENAI_API_KEY not set"
- Set environment variable
- Or pass key directly to functions

## Future Enhancements

Potential improvements:

1. **Caching**: Cache RSS feed URLs and results
2. **Parallel processing**: Analyze multiple companies simultaneously
3. **Custom criteria**: Allow configurable qualification rules
4. **Webhook support**: Notify when qualified companies found
5. **Database integration**: Store results in Firestore

## Related Files

- `src/types/index.ts` - Type definitions
- `src/utils/blogQualifierService.ts` - Main service implementation
- `src/examples/blogQualifierExample.ts` - Usage examples
- `src/scripts/testBlogQualifier.ts` - Test script

## License

Part of the Marketing Agent project.
