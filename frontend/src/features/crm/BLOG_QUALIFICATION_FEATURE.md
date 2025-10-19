# Blog Qualification Feature

## Overview

The Blog Qualification feature allows you to analyze company blogs directly from lead cards in the CRM kanban board. It uses AI and RSS feed analysis to determine if a company meets specific qualification criteria.

## How It Works

### Qualification Criteria

A company is **qualified** if it meets ALL three criteria:

1. ✅ **Active Blog**: 1+ blog posts in the last 30 days
2. ✅ **Multiple Authors**: 2+ unique authors contributing
3. ✅ **Developer-first B2B SaaS**: Company builds tools/platforms for developers

### User Flow

1. **Open a lead card** on the kanban board
2. **Click "Qualify Blog"** button at the bottom of the card
3. **Enter the company website** URL (e.g., https://example.com)
4. **Click "Qualify"** to start the analysis
5. **View results** showing:
   - Qualification status (✅ Qualified or ❌ Not Qualified)
   - Number of recent blog posts
   - Author count and names
   - Whether the company is developer-focused
   - Content topics covered
   - Additional metadata

## Features

### Intelligent Analysis

- **RSS Feed Discovery**: Automatically finds and parses RSS feeds (30+ common patterns)
- **AI Fallback**: Uses OpenAI GPT-4 when RSS feed is not available
- **Hybrid Mode**: Combines RSS and AI for complete analysis

### Rich Results Display

The qualification dialog shows:

- **Overall Status**: Clear ✅/❌ indicators for each criterion
- **Blog Metrics**:
  - Post count in last 30 days
  - Last post date
  - Author names
- **Company Classification**:
  - Developer B2B SaaS detection
  - Author type (employees vs freelancers)
  - AI topic coverage
- **Content Summary**: Bullet points of main blog topics
- **Analysis Method**: How the data was collected (RSS, AI, or hybrid)

### Loading States

- Shows spinner while analyzing
- Disables button during processing
- Clear error messages if something fails

## Technical Implementation

### Backend

- **Cloud Function**: `qualifyCompanyBlog` (functions/src/blogQualifier/qualifyBlog.ts)
- **Service**: Blog qualification logic (functions/src/utils/blogQualifierService.ts)
- **Dependencies**:
  - OpenAI API for AI analysis
  - RSS Parser for feed analysis
  - Cheerio for web scraping

### Frontend

- **Component**: LeadCard.tsx (updated)
- **Service**: researchApi.ts (added qualifyCompanyBlog function)
- **UI Components**:
  - Button on lead card
  - Dialog for website input
  - Results display with detailed breakdown

## Configuration

### Required: OpenAI API Key

The feature requires an OpenAI API key to be configured in Firebase Functions:

```bash
# Set the OpenAI API key
firebase functions:config:set openai.key="sk-your-api-key-here"

# Or use environment variable locally
export OPENAI_API_KEY="sk-your-api-key-here"
```

### Optional: Website Custom Field

If you have a custom field named `website` or `url` in your CRM, the dialog will automatically prefill it.

To add a website custom field:

1. Go to CRM Settings
2. Add a new custom field:
   - Name: `website`
   - Type: `url`
   - Show in card: Optional

## Usage Examples

### Example 1: Qualified Company

```
Company: Vercel
Website: https://vercel.com

Result: ✅ QUALIFIED
- Active blog: 15 posts in last 30 days
- Multiple authors: 8 unique authors
- Developer-first B2B SaaS: Yes

Authors: Lee Robinson, Guillermo Rauch, Malte Ubl, ...
Last Post: 2025-10-15
Content Topics:
• Next.js framework updates
• Edge computing and serverless
• Frontend performance optimization
```

### Example 2: Not Qualified

```
Company: Generic Corp
Website: https://genericcorp.com

Result: ❌ NOT QUALIFIED (1/3 criteria met)
- Active blog: 0 posts in last 30 days ❌
- Multiple authors: 1 author ❌
- Developer-first B2B SaaS: No ❌
```

## Error Handling

The feature handles various error scenarios:

- **No Website Entered**: Shows validation error
- **Invalid URL**: Backend validates URL format
- **Network Errors**: Shows user-friendly error message
- **API Failures**: Falls back gracefully, shows error details
- **No RSS Feed Found**: Automatically tries AI analysis
- **No Blog Found**: Returns "not qualified" with explanation

## Performance

- **RSS Analysis**: ~5 seconds (fast, free)
- **AI Analysis**: ~10-15 seconds (slower, uses OpenAI API)
- **Cost**: ~$0.01-0.02 per qualification (only if AI is used)

## Future Enhancements

Potential improvements:

1. **Caching**: Store qualification results to avoid re-analyzing
2. **Batch Qualification**: Qualify multiple leads at once
3. **Auto-Tagging**: Automatically tag/categorize qualified leads
4. **Scheduled Updates**: Re-qualify leads periodically
5. **Custom Criteria**: Allow users to configure qualification rules
6. **Export Results**: Download qualification data as CSV

## Troubleshooting

### "OpenAI API key not configured"

**Solution**: Set the OpenAI API key in Firebase Functions config:

```bash
firebase functions:config:set openai.key="sk-your-key"
firebase deploy --only functions
```

### "Failed to qualify blog"

**Causes**:
- Invalid website URL
- Website blocks automated requests
- Network timeout
- OpenAI API rate limit

**Solution**:
- Verify the URL is correct
- Try again in a few moments
- Check Firebase Functions logs for details

### Results seem inaccurate

**Why**:
- AI makes educated guesses based on available content
- RSS feeds might not show all posts
- Blog structure varies widely

**Improvement**:
- Provide more specific blog URL if main website doesn't work
- Check the analysis method used (RSS is more accurate)

## Related Files

- `functions/src/blogQualifier/qualifyBlog.ts` - Cloud function endpoint
- `functions/src/utils/blogQualifierService.ts` - Core qualification logic
- `functions/src/utils/BLOG_QUALIFIER_README.md` - Backend documentation
- `frontend/src/features/crm/components/LeadCard.tsx` - UI component
- `frontend/src/services/researchApi.ts` - Frontend API service
- `functions/src/types/index.ts` - TypeScript interfaces

## Support

For issues or questions:
1. Check Firebase Functions logs: `firebase functions:log`
2. Check browser console for frontend errors
3. Verify OpenAI API key is set correctly
4. Test with a known company first (e.g., Vercel, Stripe)
