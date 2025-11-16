// functions/src/linkedinGeneration/generateLinkedInPostAsync.ts

import * as functions from 'firebase-functions';
import {getFirestore, Timestamp, FieldValue} from 'firebase-admin/firestore';
import OpenAI from 'openai';
import {
  GenerateLinkedInPostRequest,
  GenerateLinkedInPostResponse,
  LinkedInGenerationJob,
  PostGenerationResponse,
  CompetitorSummary,
} from './types';
import {
  extractTokenUsage,
  calculateCost,
  logApiCost,
  CostInfo,
  DALLE_PRICING,
} from '../utils/costTracker';
import {
  getCompetitorSummaryPrompt,
  getLinkedInPostPrompt,
  getDalleImagePrompt,
} from '../prompts/linkedinPostFromTrend';
import {AITrend} from '../aiTrends/types';

/**
 * Calculate engagement rate for a competitor post
 */
function calculateEngagementRate(post: any): number {
  const likes = post.likes || 0;
  const comments = post.comments || 0;
  const shares = post.shares || 0;
  const impressions = post.impressions || likes * 10; // Estimate if not available

  // Weighted engagement: comments worth 2x, shares worth 3x
  const engagement = likes + comments * 2 + shares * 3;
  return impressions > 0 ? engagement / impressions : 0;
}

/**
 * Update job progress in Firestore
 */
async function updateJobProgress(
  db: FirebaseFirestore.Firestore,
  userId: string,
  jobId: string,
  updates: Partial<LinkedInGenerationJob>
): Promise<void> {
  const jobRef = db.collection('linkedInGenerationJobs').doc(userId).collection('jobs').doc(jobId);
  await jobRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Main Cloud Function: Generate LinkedIn Post Asynchronously
 * This function creates a job and processes it in the background
 */
export const generateLinkedInPostAsync = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes max
    memory: '512MB',
  })
  .https.onCall(
    async (
      data: GenerateLinkedInPostRequest,
      context
    ): Promise<GenerateLinkedInPostResponse> => {
      // 1. Authentication check
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated'
        );
      }

      const userId = context.auth.uid;
      const {aiTrendId} = data;

      // 2. Validate input
      if (!aiTrendId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'aiTrendId is required'
        );
      }

      const db = getFirestore();

      try {
        // 3. Create job document immediately (status: pending)
        const jobRef = db
          .collection('linkedInGenerationJobs')
          .doc(userId)
          .collection('jobs')
          .doc();
        const jobId = jobRef.id;

        const initialJob: LinkedInGenerationJob = {
          id: jobId,
          userId,
          status: 'pending',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
          aiTrendId,
          aiTrendTitle: '', // Will be filled during processing
          progress: {
            stage: 'fetching_data',
            percentage: 0,
            message: 'Initializing...',
          },
          totalCost: 0,
          costs: {
            postGeneration: 0,
            imageGeneration: 0,
          },
        };

        await jobRef.set(initialJob);

        // 4. Start async processing (don't await - run in background)
        processLinkedInGeneration(userId, jobId, aiTrendId).catch((error) => {
          console.error(`Job ${jobId} failed:`, error);
          // Update job status to failed
          updateJobProgress(db, userId, jobId, {
            status: 'failed',
            error: error.message || 'Unknown error occurred',
            progress: {
              stage: 'completed',
              percentage: 100,
              message: 'Generation failed',
            },
          });
        });

        // 5. Return job ID immediately
        return {
          success: true,
          jobId,
          message: 'LinkedIn post generation started. Check job status for progress.',
        };
      } catch (error) {
        console.error('Error creating job:', error);
        throw new functions.https.HttpsError(
          'internal',
          `Failed to create generation job: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );

/**
 * Background processing function
 * This runs independently after the Cloud Function returns
 */
async function processLinkedInGeneration(
  userId: string,
  jobId: string,
  aiTrendId: string
): Promise<void> {
  const db = getFirestore();
  const openaiApiKey = functions.config().openai?.key || process.env.OPENAI_API_KEY || '';

  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({apiKey: openaiApiKey});

  try {
    // STAGE 1: Fetch data (0-20%)
    await updateJobProgress(db, userId, jobId, {
      status: 'processing',
      progress: {
        stage: 'fetching_data',
        percentage: 5,
        message: 'Fetching AI trend and competitor posts...',
      },
    });

    // Fetch AI Trend
    const trendSessionsSnapshot = await db
      .collection('aiTrends')
      .doc(userId)
      .collection('sessions')
      .orderBy('generatedAt', 'desc')
      .limit(10)
      .get();

    let aiTrend: AITrend | null = null;
    for (const sessionDoc of trendSessionsSnapshot.docs) {
      const session = sessionDoc.data();
      const foundTrend = session.trends?.find((t: AITrend) => t.id === aiTrendId);
      if (foundTrend) {
        aiTrend = foundTrend;
        break;
      }
    }

    if (!aiTrend) {
      throw new Error(`AI Trend with ID ${aiTrendId} not found`);
    }

    await updateJobProgress(db, userId, jobId, {
      aiTrendTitle: aiTrend.title,
      progress: {
        stage: 'fetching_data',
        percentage: 10,
        message: 'Fetching top competitor posts...',
      },
    });

    // Fetch all competitor posts
    const competitorPostsSnapshot = await db.collection('competitorPosts').get();

    const allPosts = competitorPostsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Calculate engagement rates and sort
    const postsWithEngagement = allPosts.map((post) => ({
      ...post,
      engagementRate: calculateEngagementRate(post),
    }));

    postsWithEngagement.sort((a, b) => b.engagementRate - a.engagementRate);

    // Take top 10 posts
    const topPosts = postsWithEngagement.slice(0, 10);

    console.log(`Found ${allPosts.length} competitor posts, using top ${topPosts.length}`);

    await updateJobProgress(db, userId, jobId, {
      progress: {
        stage: 'fetching_data',
        percentage: 20,
        message: `Analyzing ${topPosts.length} top-performing posts...`,
      },
    });

    // STAGE 2: Analyze competitor posts (20-40%)
    let competitorSummary: CompetitorSummary | null = null;
    let summaryCost = 0;

    if (topPosts.length > 0) {
      await updateJobProgress(db, userId, jobId, {
        progress: {
          stage: 'analyzing_competitors',
          percentage: 25,
          message: 'Summarizing competitor insights...',
        },
      });

      const summaryPrompt = getCompetitorSummaryPrompt(topPosts);

      const summaryCompletion = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        response_format: {type: 'json_object'},
        temperature: 0.3,
        messages: [
          {role: 'system', content: 'You are an expert LinkedIn content analyst.'},
          {role: 'user', content: summaryPrompt},
        ],
      });

      const summaryContent = summaryCompletion.choices[0]?.message?.content;
      if (summaryContent) {
        // Remove markdown code blocks if present
        const cleanedContent = summaryContent
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        competitorSummary = JSON.parse(cleanedContent);
      }

      // Calculate summary cost
      const summaryTokenUsage = extractTokenUsage(summaryCompletion);
      if (summaryTokenUsage) {
        const summaryCostInfo = calculateCost(summaryTokenUsage, 'gpt-4-turbo');
        summaryCost = summaryCostInfo.totalCost;
        console.log(`Competitor summary cost: $${summaryCost.toFixed(4)}`);
      }

      await updateJobProgress(db, userId, jobId, {
        progress: {
          stage: 'analyzing_competitors',
          percentage: 40,
          message: 'Competitor insights analyzed',
        },
      });
    } else {
      console.log('No competitor posts available, skipping summary');
      await updateJobProgress(db, userId, jobId, {
        progress: {
          stage: 'analyzing_competitors',
          percentage: 40,
          message: 'No competitor data available, using AI trend only',
        },
      });
    }

    // STAGE 3: Generate LinkedIn Post (40-70%)
    await updateJobProgress(db, userId, jobId, {
      progress: {
        stage: 'generating_post',
        percentage: 45,
        message: 'Generating LinkedIn post...',
      },
    });

    const postPrompt = getLinkedInPostPrompt(aiTrend, competitorSummary || {});

    const postCompletion = await openai.chat.completions.create({
      model: 'gpt-4-turbo',
      response_format: {type: 'json_object'},
      temperature: 0.7,
      max_tokens: 2000,
      messages: [
        {
          role: 'system',
          content:
            'You are an expert LinkedIn content creator specializing in thought leadership posts for CEOs and business leaders.',
        },
        {role: 'user', content: postPrompt},
      ],
    });

    const postContent = postCompletion.choices[0]?.message?.content;
    if (!postContent) {
      throw new Error('Failed to generate LinkedIn post');
    }

    // Parse post response
    const cleanedPostContent = postContent
      .replace(/```json\n?/g, '')
      .replace(/```\n?/g, '')
      .trim();
    const postData: PostGenerationResponse = JSON.parse(cleanedPostContent);

    // Calculate word count
    const wordCount = postData.content.split(/\s+/).length;

    // Calculate post generation cost
    const postTokenUsage = extractTokenUsage(postCompletion);
    let postCost = 0;
    let postCostInfo: CostInfo | null = null;
    if (postTokenUsage) {
      postCostInfo = calculateCost(postTokenUsage, 'gpt-4-turbo');
      postCost = postCostInfo.totalCost;
      console.log(`Post generation cost: $${postCost.toFixed(4)}`);
    }

    await updateJobProgress(db, userId, jobId, {
      progress: {
        stage: 'generating_post',
        percentage: 70,
        message: 'LinkedIn post generated successfully',
      },
    });

    // STAGE 4: Generate Meme Image with DALL-E 3 (70-95%)
    await updateJobProgress(db, userId, jobId, {
      progress: {
        stage: 'generating_image',
        percentage: 75,
        message: 'Generating meme image...',
      },
    });

    const imagePrompt = getDalleImagePrompt(aiTrend);
    console.log('DALL-E Prompt:', imagePrompt);

    let imageUrl: string | undefined;
    let imageCost = 0;

    try {
      const imageResponse = await openai.images.generate({
        model: 'dall-e-3',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard', // Use 'hd' for higher quality at $0.080
      });

      if (imageResponse.data && imageResponse.data.length > 0) {
        imageUrl = imageResponse.data[0]?.url;
        imageCost = DALLE_PRICING['dall-e-3'].standard;
        console.log(`Image generated: ${imageUrl}, cost: $${imageCost.toFixed(4)}`);
      }

      await updateJobProgress(db, userId, jobId, {
        progress: {
          stage: 'generating_image',
          percentage: 95,
          message: 'Meme image generated',
        },
      });
    } catch (error) {
      console.error('DALL-E image generation failed:', error);
      // Continue without image
      await updateJobProgress(db, userId, jobId, {
        progress: {
          stage: 'generating_image',
          percentage: 95,
          message: 'Image generation failed, continuing with text post',
        },
      });
    }

    // STAGE 5: Save results and log costs (95-100%)
    const totalCost = summaryCost + postCost + imageCost;

    await updateJobProgress(db, userId, jobId, {
      status: 'completed',
      result: {
        post: {
          content: postData.content,
          wordCount,
          hashtags: postData.hashtags,
        },
        imageUrl,
        imagePrompt,
      },
      totalCost,
      costs: {
        postGeneration: summaryCost + postCost,
        imageGeneration: imageCost,
      },
      progress: {
        stage: 'completed',
        percentage: 100,
        message: 'LinkedIn post generated successfully!',
      },
    });

    // Log costs to apiCosts collection
    if (postCostInfo) {
      await logApiCost(userId, 'linkedin-post-from-trend', postCostInfo, {
        operationDetails: {
          aiTrendId,
          aiTrendTitle: aiTrend.title,
          jobId,
          competitorPostsAnalyzed: topPosts.length,
        },
      });
    }

    // Log image generation cost separately (not token-based)
    if (imageUrl) {
      const imageCostInfo: CostInfo = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        inputCost: 0,
        outputCost: imageCost,
        totalCost: imageCost,
        model: 'dall-e-3',
      };

      await logApiCost(userId, 'linkedin-meme-image', imageCostInfo, {
        operationDetails: {
          aiTrendId,
          jobId,
          imageUrl,
        },
      });
    }

    console.log(
      `✅ Job ${jobId} completed successfully. Total cost: $${totalCost.toFixed(4)}`
    );
  } catch (error) {
    console.error(`❌ Job ${jobId} processing error:`, error);
    throw error; // Will be caught by the error handler in the caller
  }
}
