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

const EXTRACTION_PROMPT = `Extract competitor LinkedIn posts from the provided content.

Extract profile info:
- competitorName: Full name from profile header
- competitorLinkedInUrl: Profile URL (optional)

For each post extract:
- content: Full post text
- likes, comments, shares: Engagement metrics (use 0 if not shown)
- impressions: View count (optional)
- postedDate: Relative date (e.g., "2w", "3d", "1mo")
- hashtags: Array without # symbol
- mentions: Array without @ symbol
- postType: text|image|video|carousel|article|poll|document
- mediaInfo: {type, count, hasAlt, description} if media present

Extract ALL posts. Return valid JSON only:
{
  "competitorName": "Name",
  "competitorLinkedInUrl": "URL",
  "posts": [{...}],
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

      // Extract posts using OpenAI GPT-4o-mini
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
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
        costInfo = calculateCost(tokenUsage, 'gpt-4o-mini');
        console.log(`💰 OpenAI cost: $${costInfo.totalCost.toFixed(4)} (${tokenUsage.totalTokens} tokens)`);
      }

      const extractedData: ExtractedData = JSON.parse(extractedContent);

      if (!extractedData.posts || !Array.isArray(extractedData.posts)) {
        throw new functions.https.HttpsError('internal', 'Invalid extraction result format');
      }

      if (!extractedData.competitorName) {
        throw new functions.https.HttpsError('internal', 'Could not extract competitor name from content');
      }

      // Extract competitor info (no DB calls yet - deferred for speed)
      const competitorName = extractedData.competitorName;
      const linkedInUrl = extractedData.competitorLinkedInUrl || '';
      const now = Timestamp.now();

      // Check if competitor already exists by name (AFTER OpenAI call for speed)
      const competitorsQuery = await db
        .collection('competitors')
        .where('active', '==', true)
        .get();

      let needsCompetitorCreation = true;
      for (const doc of competitorsQuery.docs) {
        const data = doc.data();
        if (data.name.toLowerCase() === competitorName.toLowerCase()) {
          competitorId = doc.id;
          needsCompetitorCreation = false;
          break;
        }
      }

      // Pre-generate competitor ID if needed (use .set() in batch instead of .add()+.update())
      if (needsCompetitorCreation) {
        const competitorRef = db.collection('competitors').doc();
        competitorId = competitorRef.id;
      }

      // Safety check
      if (!competitorId) {
        throw new functions.https.HttpsError('internal', 'Failed to create or find competitor');
      }

      // Type assertion
      const validCompetitorId: string = competitorId;

      // Prepare posts for Firestore
      const postsWithMetadata = extractedData.posts.map((post, index) => ({
        id: `${validCompetitorId}_${now.toMillis()}_${index}`,
        competitorId: validCompetitorId,
        competitorName,
        ...post,
        extractedAt: now,
        extractedBy: userId,
      }));

      // Single batch for ALL writes (competitor + posts + metadata)
      const batch = db.batch();

      // Create competitor in batch if needed
      if (needsCompetitorCreation) {
        const competitorRef = db.collection('competitors').doc(validCompetitorId);
        batch.set(competitorRef, {
          id: validCompetitorId,
          name: competitorName,
          linkedInUrl: linkedInUrl,
          profileUrl: linkedInUrl,
          notes: 'Auto-created from LinkedIn sync',
          addedAt: now,
          addedBy: userId,
          active: true,
        });
      }

      // Save each post to the flattened competitorPosts collection
      postsWithMetadata.forEach((post) => {
        const postRef = db.collection('competitorPosts').doc(post.id);
        batch.set(postRef, post);
      });

      // Update sync metadata
      const metadataRef = db
        .collection('competitorSyncMetadata')
        .doc(`${userId}_${validCompetitorId}`);

      batch.set(
        metadataRef,
        {
          userId,
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
            .doc(`${userId}_${competitorId}`)
            .set(
              {
                userId,
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
