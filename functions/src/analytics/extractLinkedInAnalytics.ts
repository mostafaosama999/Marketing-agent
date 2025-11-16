// functions/src/analytics/extractLinkedInAnalytics.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import OpenAI from "openai";
import { extractTokenUsage, calculateCost, logApiCost, CostInfo } from "../utils/costTracker";

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
export const extractLinkedInAnalytics = functions
  .runWith({
    timeoutSeconds: 60,
    memory: "512MB",
  })
  .https.onCall(async (data: { pastedContent: string }, context) => {
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
        "Pasted content is too short. Please paste the LinkedIn analytics page content."
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

      // Get OpenAI API key
      const openaiApiKey = functions.config().openai?.key || process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "OpenAI API key not configured"
        );
      }

      // Initialize OpenAI client
      const openai = new OpenAI({ apiKey: openaiApiKey });

      // Call OpenAI API for extraction
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        temperature: 0, // Deterministic for data extraction
        messages: [
          {
            role: "system",
            content: EXTRACTION_PROMPT
          },
          {
            role: "user",
            content: `Extract LinkedIn post analytics from this content:\n\n${pastedContent}`
          }
        ],
      });

      // Parse OpenAI's response
      const responseText = completion.choices[0]?.message?.content || "";
      console.log("OpenAI response:", responseText);

      // Extract token usage and calculate cost
      const tokenUsage = extractTokenUsage(completion);
      let costInfo: CostInfo | null = null;
      if (tokenUsage) {
        costInfo = calculateCost(tokenUsage, "gpt-4o-mini");
        console.log(`💰 OpenAI cost: $${costInfo.totalCost.toFixed(4)} (${tokenUsage.totalTokens} tokens)`);
      }

      // Parse JSON response
      let extractedData: ExtractionResult;
      try {
        extractedData = JSON.parse(responseText);
      } catch (parseError) {
        console.error("Failed to parse OpenAI response:", responseText);
        throw new functions.https.HttpsError(
          "internal",
          "Failed to parse extracted data. Please try again or contact support."
        );
      }

      // Validate extracted data
      if (!extractedData.posts || !Array.isArray(extractedData.posts)) {
        console.error("Invalid extracted data structure:", extractedData);
        throw new functions.https.HttpsError(
          "internal",
          "Extracted data has invalid structure. Please try again."
        );
      }

      // Calculate totals
      const totalImpressions = extractedData.posts.reduce(
        (sum, post) => sum + (post.impressions || 0),
        0
      );
      const totalEngagement = extractedData.posts.reduce(
        (sum, post) => sum + (post.likes || 0) + (post.comments || 0) + (post.shares || 0),
        0
      );

      // Save to Firestore
      const analyticsRef = admin.firestore()
        .collection("linkedinAnalytics")
        .doc(userId);

      await analyticsRef.set({
        period: extractedData.period || "Past 28 days",
        posts: extractedData.posts,
        totalImpressions,
        totalEngagement,
        postCount: extractedData.posts.length,
        extractedAt: admin.firestore.FieldValue.serverTimestamp(),
        extractedBy: userId,
      });

      console.log(`✅ Extracted ${extractedData.posts.length} posts for user ${userId}`);
      console.log(`Total impressions: ${totalImpressions}, Total engagement: ${totalEngagement}`);

      // Log API cost
      if (costInfo) {
        await logApiCost(
          userId,
          "linkedin-analytics-extraction",
          costInfo,
          {
            operationDetails: {
              period: extractedData.period,
              postCount: extractedData.posts.length,
              totalImpressions,
              totalEngagement,
            }
          }
        );
      }

      return {
        success: true,
        postCount: extractedData.posts.length,
        totalImpressions,
        totalEngagement,
        period: extractedData.period,
        costInfo: costInfo || undefined,
      };
    } catch (error: any) {
      console.error("Failed to extract LinkedIn analytics:", error);

      // Re-throw HttpsErrors as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Wrap other errors
      throw new functions.https.HttpsError(
        "internal",
        `Failed to extract analytics: ${error.message || "Unknown error"}`
      );
    }
  });
