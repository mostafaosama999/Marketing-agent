// functions/src/linkedinGeneration/generatePostFromIdea.ts

import * as functions from 'firebase-functions';
import {getFirestore, Timestamp, FieldValue} from 'firebase-admin/firestore';
import OpenAI from 'openai';
import {
  GeneratePostFromIdeaRequest,
  GeneratePostFromIdeaResponse,
  PostIdeasSession,
} from './postIdeasTypes';
import {LinkedInGenerationJob} from './types';
import {
  extractTokenUsage,
  calculateCost,
  logApiCost,
  CostInfo,
  DALLE_PRICING,
} from '../utils/costTracker';
import {
  getFullPostPrompt,
  getMemeImagePrompt,
} from '../prompts/postIdeasPrompt';

/**
 * Clean JSON response from OpenAI
 */
function cleanJsonResponse(content: string): string {
  return content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
}

/**
 * Update job progress in Firestore
 */
async function updateJobProgress(
  db: FirebaseFirestore.Firestore,
  userId: string,
  jobId: string,
  updates: any
): Promise<void> {
  const jobRef = db
    .collection('linkedInGenerationJobs')
    .doc(userId)
    .collection('jobs')
    .doc(jobId);
  await jobRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Generate Full LinkedIn Post from Selected Idea
 * Creates complete post + meme image based on user's selected idea
 */
export const generatePostFromIdea = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '512MB',
  })
  .https.onCall(
    async (
      data: GeneratePostFromIdeaRequest,
      context
    ): Promise<GeneratePostFromIdeaResponse> => {
      // 1. Authentication check
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated'
        );
      }

      const userId = context.auth.uid;
      const {sessionId, ideaId} = data;

      // 2. Validate input
      if (!sessionId || !ideaId) {
        throw new functions.https.HttpsError(
          'invalid-argument',
          'sessionId and ideaId are required'
        );
      }

      const db = getFirestore();

      try {
        console.log(
          `🚀 Starting post generation from idea: ${ideaId} (session: ${sessionId})`
        );

        // 3. Create job document immediately
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
          aiTrendId: sessionId, // Store session ID here
          aiTrendTitle: '', // Will be filled during processing
          progress: {
            stage: 'fetching_data',
            percentage: 0,
            message: 'Loading selected idea...',
          },
          totalCost: 0,
          costs: {
            postGeneration: 0,
            imageGeneration: 0,
          },
        };

        await jobRef.set(initialJob);

        // 4. Start async processing
        processPostGeneration(userId, jobId, sessionId, ideaId).catch(
          async (error) => {
            console.error(`Job ${jobId} failed:`, error);
            await updateJobProgress(db, userId, jobId, {
              status: 'failed',
              error: error.message || 'Unknown error occurred',
              progress: {
                stage: 'completed',
                percentage: 100,
                message: 'Generation failed',
              },
            });
          }
        );

        // 5. Return job ID immediately
        return {
          success: true,
          jobId,
          message: 'Post generation started. Check job status for progress.',
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
 */
async function processPostGeneration(
  userId: string,
  jobId: string,
  sessionId: string,
  ideaId: string
): Promise<void> {
  const db = getFirestore();
  const openaiApiKey =
    functions.config().openai?.key || process.env.OPENAI_API_KEY || '';

  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const openai = new OpenAI({apiKey: openaiApiKey});

  // Fetch settings for custom prompts
  const settingsDoc = await db
    .collection('settings')
    .doc('app-settings')
    .get();

  const settings = settingsDoc.exists ? settingsDoc.data() : {};
  const customPrompts = settings?.postIdeasPrompts || {};
  const customDallePrompt = settings?.dalleImageStylePrompt;

  try {
    // STAGE 1: Fetch session and idea (0-20%)
    await updateJobProgress(db, userId, jobId, {
      status: 'processing',
      progress: {
        stage: 'fetching_data',
        percentage: 10,
        message: 'Loading post idea and analytics...',
      },
    });

    const sessionDoc = await db
      .collection('linkedInPostIdeas')
      .doc(userId)
      .collection('sessions')
      .doc(sessionId)
      .get();

    if (!sessionDoc.exists) {
      throw new Error(`Session ${sessionId} not found`);
    }

    const session = sessionDoc.data() as PostIdeasSession;
    const selectedIdea = session.ideas.find((idea) => idea.id === ideaId);

    if (!selectedIdea) {
      throw new Error(`Idea ${ideaId} not found in session ${sessionId}`);
    }

    // Pick the first AI trend for context (could be enhanced to pick most relevant)
    const selectedTrend = session.aiTrends[0] || 'Current AI trends';

    await updateJobProgress(db, userId, jobId, {
      aiTrendTitle: selectedIdea.hook,
      progress: {
        stage: 'fetching_data',
        percentage: 20,
        message: `Loaded idea: "${selectedIdea.hook.substring(0, 50)}..."`,
      },
    });

    console.log(`✓ Loaded idea: ${selectedIdea.hook}`);

    // STAGE 2: Generate full post (20-60%)
    await updateJobProgress(db, userId, jobId, {
      progress: {
        stage: 'generating_post',
        percentage: 25,
        message: 'Writing LinkedIn post...',
      },
    });

    // Use custom prompt or default
    const postPrompt = customPrompts.fullPostGeneration
      ? customPrompts.fullPostGeneration
      : getFullPostPrompt(
          selectedIdea,
          session.analyticsInsights,
          selectedTrend
        );

    let postData;
    let wordCount = 0;
    let attempts = 0;
    const maxAttempts = 2;
    const minWordCount = 130; // Minimum acceptable word count
    let lastCompletion;
    let totalPostCost = 0;

    // Retry loop for word count validation
    while (attempts < maxAttempts) {
      attempts++;

      const postCompletion = await openai.chat.completions.create({
        model: 'gpt-4-turbo',
        response_format: {type: 'json_object'},
        temperature: 0.5, // Lower temperature for better instruction adherence
        max_tokens: 2000,
        messages: [
          {
            role: 'system',
            content:
              'You are an expert LinkedIn content creator specializing in thought leadership posts for CEOs and business leaders. You write detailed, substantive posts that are ALWAYS 140-220 words long with depth and insights.',
          },
          {
            role: 'user',
            content:
              attempts === 1
                ? postPrompt
                : `${postPrompt}\n\nIMPORTANT: Your previous attempt was only ${wordCount} words. You MUST write at least ${minWordCount} words. Add more depth, examples, insights, and strategic implications. Be thorough and substantive.`,
          },
        ],
      });

      lastCompletion = postCompletion;

      // Track cost for each attempt
      const attemptTokens = extractTokenUsage(postCompletion);
      if (attemptTokens) {
        const attemptCost = calculateCost(attemptTokens, 'gpt-4-turbo');
        totalPostCost += attemptCost.totalCost;
      }

      const postContent = postCompletion.choices[0]?.message?.content;
      if (!postContent) {
        throw new Error('Failed to generate LinkedIn post');
      }

      postData = JSON.parse(cleanJsonResponse(postContent));
      wordCount = postData.content.split(/\s+/).length;

      console.log(
        `✍️  Post generation attempt ${attempts}: ${wordCount} words`
      );

      // Check if word count meets minimum
      if (wordCount >= minWordCount) {
        console.log(`✓ Word count acceptable: ${wordCount} words`);
        break;
      }

      if (attempts < maxAttempts) {
        console.log(
          `⚠️  Post too short (${wordCount} words < ${minWordCount}), retrying...`
        );
      } else {
        console.log(
          `⚠️  Final attempt still short (${wordCount} words), proceeding anyway`
        );
      }
    }

    // Use total cost from all attempts
    const postCost = totalPostCost;
    console.log(
      `💰 Post generation cost (${attempts} attempt${attempts > 1 ? 's' : ''}): $${postCost.toFixed(4)}`
    );

    // Calculate post cost info for logging (use last completion for token details)
    const postTokens = extractTokenUsage(lastCompletion);
    let postCostInfo: CostInfo | null = null;
    if (postTokens) {
      postCostInfo = calculateCost(postTokens, 'gpt-4-turbo');
      // Use total cost instead of last attempt cost
      postCostInfo.totalCost = totalPostCost;
    }

    await updateJobProgress(db, userId, jobId, {
      progress: {
        stage: 'generating_post',
        percentage: 60,
        message: `Post written (${wordCount} words)`,
      },
    });

    console.log(`✓ Generated post: ${wordCount} words`);

    // STAGE 3: Generate meme image (60-95%)
    await updateJobProgress(db, userId, jobId, {
      progress: {
        stage: 'generating_image',
        percentage: 65,
        message: 'Creating meme image...',
      },
    });

    // Use custom DALL-E prompt or default
    const imagePrompt = customDallePrompt || getMemeImagePrompt(selectedIdea);
    console.log('🎨 DALL-E Prompt:', imagePrompt);

    let imageUrl: string | undefined;
    let imageCost = 0;

    try {
      const imageResponse = await openai.images.generate({
        model: 'dall-e-3',
        prompt: imagePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      });

      if (imageResponse.data && imageResponse.data.length > 0) {
        imageUrl = imageResponse.data[0]?.url;
        imageCost = DALLE_PRICING['dall-e-3'].standard;
        console.log(
          `✓ Image generated: ${imageUrl}, cost: $${imageCost.toFixed(4)}`
        );
      }

      await updateJobProgress(db, userId, jobId, {
        progress: {
          stage: 'generating_image',
          percentage: 95,
          message: 'Meme image created',
        },
      });
    } catch (error) {
      console.error('DALL-E image generation failed:', error);
      await updateJobProgress(db, userId, jobId, {
        progress: {
          stage: 'generating_image',
          percentage: 95,
          message: 'Image generation failed, continuing with text post',
        },
      });
    }

    // STAGE 4: Save results (95-100%)
    const totalCost = postCost + imageCost;

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
        postGeneration: postCost,
        imageGeneration: imageCost,
      },
      progress: {
        stage: 'completed',
        percentage: 100,
        message: 'LinkedIn post generated successfully!',
      },
    });

    // Log costs
    if (postCostInfo) {
      await logApiCost(userId, 'linkedin-post-from-trend', postCostInfo, {
        operationDetails: {
          sessionId,
          ideaId,
          ideaHook: selectedIdea.hook,
          jobId,
          wordCount,
        },
      });
    }

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
          sessionId,
          ideaId,
          jobId,
          imageUrl,
        },
      });
    }

    console.log(
      `✅ Job ${jobId} completed. Total cost: $${totalCost.toFixed(4)}`
    );
  } catch (error) {
    console.error(`❌ Job ${jobId} processing error:`, error);
    throw error;
  }
}
