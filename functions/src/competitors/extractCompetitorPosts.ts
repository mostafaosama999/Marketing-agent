import * as functions from 'firebase-functions';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import OpenAI from 'openai';
import { extractTokenUsage, calculateCost, logApiCost, CostInfo } from '../utils/costTracker';

interface CompetitorPostExtraction {
  content: string;
  likes: number;
  comments: number;
  shares: number;
  impressions?: number;
  postedDate: string;
  hashtags: string[];
  mentions: string[];
  postType: 'text' | 'image' | 'video' | 'carousel' | 'article' | 'poll' | 'document';
  mediaInfo?: {
    type: 'image' | 'video' | 'carousel' | 'document';
    count?: number;
    hasAlt?: boolean;
    description?: string;
  };
}

interface ExtractedData {
  competitorName: string;
  competitorLinkedInUrl?: string;
  posts: CompetitorPostExtraction[];
  totalPosts: number;
}

const EXTRACTION_PROMPT = `You are a data extraction assistant. Extract the competitor profile information and ALL their LinkedIn posts from the provided LinkedIn profile feed page content.

First, extract the competitor's profile information:
1. **competitorName**: The full name of the person/profile (from the profile header)
2. **competitorLinkedInUrl**: The LinkedIn profile URL if visible (optional)

Then, for each post, extract:
1. **content**: The full text of the post
2. **likes**: Number of likes (reactions)
3. **comments**: Number of comments
4. **shares**: Number of shares (reposts)
5. **impressions**: Number of impressions/views if visible (optional)
6. **postedDate**: Relative date like "2w", "3d", "1mo" (exactly as shown)
7. **hashtags**: Array of hashtags used (without # symbol)
8. **mentions**: Array of @mentions (just the name/handle)
9. **postType**: Classify as one of: text, image, video, carousel, article, poll, document
10. **mediaInfo**: If media present, describe:
    - type: image, video, carousel, or document
    - count: number of items (for carousel)
    - hasAlt: whether alt text is present
    - description: brief description of the media

Important extraction rules:
- Extract ALL posts visible in the content
- If engagement metrics are not visible, use 0
- Hashtags should NOT include the # symbol
- Mentions should NOT include the @ symbol
- For postedDate, use the exact format shown (e.g., "2w", "3d", "1mo", "2h")
- Be thorough and extract every post you can find

Return the data in this JSON format:
{
  "competitorName": "Full Name From Profile",
  "competitorLinkedInUrl": "https://www.linkedin.com/in/username/",
  "posts": [
    {
      "content": "Post text here...",
      "likes": 123,
      "comments": 45,
      "shares": 6,
      "impressions": 1500,
      "postedDate": "2w",
      "hashtags": ["AI", "MachineLearning"],
      "mentions": ["JohnDoe"],
      "postType": "image",
      "mediaInfo": {
        "type": "image",
        "count": 1,
        "hasAlt": true,
        "description": "Diagram showing model architecture"
      }
    }
  ],
  "totalPosts": 1
}`;

export const extractCompetitorPosts = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "512MB",
  })
  .https.onCall(async (data, context) => {
    // Check authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { pastedContent, userId } = data;

    // Validate inputs
    if (!pastedContent || !userId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'pastedContent and userId are required'
      );
    }

    if (pastedContent.length < 100) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Pasted content is too short. Please paste the full LinkedIn profile feed page.'
      );
    }

    let competitorId: string | null = null;

    try {
      const db = getFirestore();

      // Initialize OpenAI (same pattern as other functions)
      const openaiApiKey = functions.config().openai?.key || process.env.OPENAI_API_KEY || "";
      if (!openaiApiKey) {
        throw new functions.https.HttpsError('internal', 'OpenAI API key not configured');
      }

      const openai = new OpenAI({ apiKey: openaiApiKey });

      // Extract posts using OpenAI GPT-4
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        response_format: { type: 'json_object' },
        temperature: 0,
        messages: [
          { role: 'system', content: EXTRACTION_PROMPT },
          {
            role: 'user',
            content: `Extract all posts from this LinkedIn profile feed:\n\n${pastedContent}`,
          },
        ],
      });

      const extractedContent = completion.choices[0]?.message?.content;
      if (!extractedContent) {
        throw new functions.https.HttpsError('internal', 'Failed to extract posts from content');
      }

      // Extract token usage and calculate cost
      const tokenUsage = extractTokenUsage(completion);
      let costInfo: CostInfo | null = null;
      if (tokenUsage) {
        costInfo = calculateCost(tokenUsage, 'gpt-4-turbo-preview');
        console.log(`💰 OpenAI cost: $${costInfo.totalCost.toFixed(4)} (${tokenUsage.totalTokens} tokens)`);
      }

      const extractedData: ExtractedData = JSON.parse(extractedContent);

      if (!extractedData.posts || !Array.isArray(extractedData.posts)) {
        throw new functions.https.HttpsError('internal', 'Invalid extraction result format');
      }

      if (!extractedData.competitorName) {
        throw new functions.https.HttpsError('internal', 'Could not extract competitor name from content');
      }

      // Auto-create or find competitor profile
      const competitorName = extractedData.competitorName;
      const linkedInUrl = extractedData.competitorLinkedInUrl || '';

      // Check if competitor already exists by name
      const competitorsQuery = await db
        .collection('competitors')
        .where('active', '==', true)
        .get();

      for (const doc of competitorsQuery.docs) {
        const data = doc.data();
        if (data.name.toLowerCase() === competitorName.toLowerCase()) {
          competitorId = doc.id;
          break;
        }
      }

      // Create new competitor if doesn't exist
      if (!competitorId) {
        const competitorRef = await db.collection('competitors').add({
          name: competitorName,
          linkedInUrl: linkedInUrl,
          profileUrl: linkedInUrl,
          notes: 'Auto-created from LinkedIn sync',
          addedAt: Timestamp.now(),
          addedBy: userId,
          active: true,
        });

        competitorId = competitorRef.id;

        // Update with its own ID
        await competitorRef.update({ id: competitorId });
      }

      // Safety check
      if (!competitorId) {
        throw new functions.https.HttpsError('internal', 'Failed to create or find competitor');
      }

      // Type assertion - competitorId is guaranteed to be string after the check above
      const validCompetitorId: string = competitorId;

      // Prepare posts for Firestore
      const now = Timestamp.now();
      const postsWithMetadata = extractedData.posts.map((post, index) => ({
        id: `${validCompetitorId}_${now.toMillis()}_${index}`,
        competitorId: validCompetitorId,
        competitorName,
        ...post,
        extractedAt: now,
        extractedBy: userId,
      }));

      // Save to Firestore in batch
      const batch = db.batch();

      // Save each post to the competitor's posts subcollection
      postsWithMetadata.forEach((post) => {
        const postRef = db
          .collection('competitorPosts')
          .doc(userId)
          .collection('competitors')
          .doc(validCompetitorId)
          .collection('posts')
          .doc(post.id);

        batch.set(postRef, post);
      });

      // Update sync metadata
      const metadataRef = db
        .collection('competitorSyncMetadata')
        .doc(userId)
        .collection('competitors')
        .doc(validCompetitorId);

      batch.set(
        metadataRef,
        {
          competitorId: validCompetitorId,
          lastSync: now,
          lastSyncSuccess: true,
          postCount: postsWithMetadata.length,
          lastSyncBy: userId,
          lastSyncErrors: [],
        },
        { merge: true }
      );

      // Commit batch
      await batch.commit();

      // Log API cost
      if (costInfo) {
        await logApiCost(
          userId,
          'competitor-posts-extraction',
          costInfo,
          {
            operationDetails: {
              competitorId: validCompetitorId,
              competitorName,
              postsExtracted: postsWithMetadata.length,
            }
          }
        );
      }

      // Return extracted data
      return {
        competitorId: validCompetitorId,
        competitorName,
        posts: postsWithMetadata,
        totalPosts: postsWithMetadata.length,
        extractedAt: now,
        extractedBy: userId,
        costInfo: costInfo || undefined,
      };
    } catch (error: any) {
      console.error('Error extracting competitor posts:', error);

      // Update sync metadata with error (only if we have a competitor ID)
      if (competitorId) {
        try {
          const db = getFirestore();
          await db
            .collection('competitorSyncMetadata')
            .doc(userId)
            .collection('competitors')
            .doc(competitorId)
            .set(
              {
                competitorId,
                lastSync: Timestamp.now(),
                lastSyncSuccess: false,
                lastSyncBy: userId,
                lastSyncErrors: [error.message || 'Unknown error'],
              },
              { merge: true }
            );
        } catch (metadataError) {
          console.error('Error updating sync metadata:', metadataError);
        }
      }

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError('internal', `Failed to extract competitor posts: ${error.message}`);
    }
  });
