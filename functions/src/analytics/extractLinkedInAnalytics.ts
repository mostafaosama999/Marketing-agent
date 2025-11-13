// functions/src/analytics/extractLinkedInAnalytics.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: functions.config().anthropic?.api_key,
});

interface ExtractedPost {
  content: string;
  impressions: number;
  likes: number;
  comments: number;
  shares: number;
  postedDate: string;
}

interface ExtractionResult {
  period: string;
  posts: ExtractedPost[];
  totalImpressions: number;
  totalEngagement: number;
}

const EXTRACTION_PROMPT = `You are a data extraction assistant. Extract LinkedIn post analytics from the provided text.

The text contains LinkedIn posts with their performance metrics. For each post, extract:
- content: First 100-150 characters of the post text (the actual content, not metadata)
- impressions: The number shown next to "Impressions" (e.g., "1,178 Impressions" = 1178)
- likes: Number of likes/reactions
- comments: Number of comments
- shares: Number of shares (if mentioned, otherwise 0)
- postedDate: Relative date string (e.g., "2w" for 2 weeks, "3d" for 3 days, "1d" for 1 day, "14h" for 14 hours)

Important:
- Extract ONLY posts that have impression data
- Ignore navigation elements, headers, and UI text
- Convert formatted numbers (e.g., "1,178" to 1178)
- Return ONLY valid JSON, no additional text or markdown

Return a JSON object with this exact structure:
{
  "period": "Past 7 days",
  "posts": [
    {
      "content": "Post preview text here...",
      "impressions": 1178,
      "likes": 185,
      "comments": 59,
      "shares": 0,
      "postedDate": "2w"
    }
  ]
}`;

/**
 * Cloud Function to extract LinkedIn analytics from pasted page content
 */
export const extractLinkedInAnalytics = functions.https.onCall(
  async (data: { pastedContent: string }, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to extract LinkedIn analytics"
      );
    }

    const userId = context.auth.uid;
    const { pastedContent } = data;

    // Validate input
    if (!pastedContent || pastedContent.trim().length < 100) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Pasted content is too short or empty. Please paste the full LinkedIn analytics page."
      );
    }

    if (pastedContent.length > 100000) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Pasted content is too long. Please paste only the analytics section."
      );
    }

    try {
      console.log(`Extracting LinkedIn analytics for user ${userId}`);
      console.log(`Content length: ${pastedContent.length} characters`);

      // Call Claude API for extraction
      const message = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        temperature: 0, // Deterministic for data extraction
        messages: [
          {
            role: "user",
            content: `${EXTRACTION_PROMPT}\n\nText to extract from:\n\n${pastedContent}`,
          },
        ],
      });

      // Parse Claude's response
      const responseText = message.content[0].type === "text"
        ? message.content[0].text
        : "";

      console.log("Claude response:", responseText);

      // Extract JSON from response (handle potential markdown code blocks)
      let extractedData: ExtractionResult;
      try {
        // Remove markdown code blocks if present
        const jsonMatch = responseText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
        const jsonText = jsonMatch ? jsonMatch[1] : responseText;

        extractedData = JSON.parse(jsonText.trim());
      } catch (parseError) {
        console.error("Failed to parse Claude response:", responseText);
        throw new functions.https.HttpsError(
          "internal",
          "Failed to parse extracted data. Please try again or contact support."
        );
      }

      // Validate extracted data
      if (!extractedData.posts || !Array.isArray(extractedData.posts)) {
        throw new functions.https.HttpsError(
          "internal",
          "No posts found in extracted data. Please ensure you copied the full analytics page."
        );
      }

      if (extractedData.posts.length === 0) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "No posts with impression data found. Please paste content from LinkedIn's 'Top performing posts' section."
        );
      }

      // Calculate aggregates
      const totalImpressions = extractedData.posts.reduce(
        (sum, post) => sum + (post.impressions || 0),
        0
      );
      const totalEngagement = extractedData.posts.reduce(
        (sum, post) => sum + (post.likes || 0) + (post.comments || 0) + (post.shares || 0),
        0
      );

      extractedData.totalImpressions = totalImpressions;
      extractedData.totalEngagement = totalEngagement;

      // Save to Firestore
      const db = admin.firestore();
      const batch = db.batch();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const extractedAt = new Date();

      // Save individual posts
      const postsRef = db.collection("linkedinAnalytics")
        .doc(userId)
        .collection("posts");

      for (const post of extractedData.posts) {
        const postRef = postsRef.doc(); // Auto-generate ID
        batch.set(postRef, {
          ...post,
          extractedAt: timestamp,
          period: extractedData.period || "Past 7 days",
        });
      }

      // Save aggregate data
      const aggregateRef = db.collection("linkedinAnalytics")
        .doc(userId)
        .collection("aggregates")
        .doc(extractedAt.toISOString().split('T')[0]); // Date-based ID (YYYY-MM-DD)

      batch.set(aggregateRef, {
        totalImpressions,
        totalEngagement,
        postCount: extractedData.posts.length,
        topPost: extractedData.posts[0] || null, // First post (highest impressions)
        period: extractedData.period || "Past 7 days",
        updatedAt: timestamp,
        extractedAt: timestamp,
      });

      // Update user's last sync timestamp
      const userMetaRef = db.collection("linkedinAnalytics").doc(userId);
      batch.set(
        userMetaRef,
        {
          lastSyncAt: timestamp,
          lastSyncPostCount: extractedData.posts.length,
          lastSyncImpressions: totalImpressions,
        },
        { merge: true }
      );

      await batch.commit();

      console.log(`Successfully extracted ${extractedData.posts.length} posts for user ${userId}`);

      // Track API cost
      const inputTokens = message.usage.input_tokens;
      const outputTokens = message.usage.output_tokens;
      const estimatedCost = (inputTokens * 0.003 / 1000) + (outputTokens * 0.015 / 1000);

      await db.collection("userCostTracking").doc(userId).set(
        {
          totalCosts: {
            anthropic: admin.firestore.FieldValue.increment(estimatedCost),
            total: admin.firestore.FieldValue.increment(estimatedCost),
          },
          costsByMonth: {
            [new Date().toISOString().substring(0, 7)]: {
              anthropic: admin.firestore.FieldValue.increment(estimatedCost),
            },
          },
        },
        { merge: true }
      );

      return {
        success: true,
        data: {
          postsExtracted: extractedData.posts.length,
          totalImpressions,
          totalEngagement,
          period: extractedData.period,
          topPost: extractedData.posts[0]?.content?.substring(0, 50) + "...",
        },
        cost: estimatedCost,
      };

    } catch (error: any) {
      console.error("Error extracting LinkedIn analytics:", error);

      // Re-throw HttpsError as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Wrap other errors
      throw new functions.https.HttpsError(
        "internal",
        `Failed to extract analytics: ${error.message || "Unknown error"}`
      );
    }
  }
);
