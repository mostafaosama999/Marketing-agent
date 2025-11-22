// functions/src/linkedinGeneration/generatePostIdeasRAG.ts

/**
 * RAG-Enhanced Post Ideas Generation
 *
 * Uses semantic retrieval from Qdrant to find relevant newsletter content
 * instead of brute-force analysis of all newsletters.
 *
 * Key improvements:
 * 1. Semantic retrieval of most relevant newsletter chunks
 * 2. Trend-to-idea affinity mapping
 * 3. Source citations for credibility
 * 4. Full competitor context preserved for post generation
 */

import * as functions from 'firebase-functions';
import {getFirestore, Timestamp} from 'firebase-admin/firestore';
import OpenAI from 'openai';
import {
  GeneratePostIdeasRequest,
  GeneratePostIdeasResponse,
  PostIdeasSession,
  PostIdea,
  AnalyticsInsights,
  AnalyticsAnalysisResponse,
  CompetitorInsightsResponse,
  TrendWithSource,
} from './postIdeasTypes';
import {
  extractTokenUsage,
  calculateCost,
  logApiCost,
} from '../utils/costTracker';
import {
  getAnalyticsAnalysisPrompt,
  getCompetitorInsightsPrompt,
  getRAGNewsletterTrendsPrompt,
  getRAGPostIdeasPrompt,
} from '../prompts/postIdeasPrompt';
import {
  retrieveRelevantNewsletters,
  getIndexingStats,
} from '../rag';

/**
 * Clean JSON response from OpenAI (remove markdown code blocks)
 */
function cleanJsonResponse(content: string): string {
  return content
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
}

/**
 * RAG-Enhanced Post Ideas Generation
 * Uses semantic retrieval instead of brute-force newsletter analysis
 */
export const generatePostIdeasRAG = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '1GB', // More memory for RAG operations
  })
  .https.onCall(
    async (
      data: GeneratePostIdeasRequest,
      context
    ): Promise<GeneratePostIdeasResponse> => {
      // 1. Authentication check
      if (!context.auth) {
        throw new functions.https.HttpsError(
          'unauthenticated',
          'User must be authenticated'
        );
      }

      const userId = context.auth.uid;
      const db = getFirestore();

      try {
        console.log(`🚀 [RAG] Starting post ideas generation for user: ${userId}`);

        // ==========================================
        // STAGE 0: Check RAG Readiness
        // ==========================================

        console.log('🔍 Stage 0: Checking RAG index status...');

        let ragStats;
        try {
          ragStats = await getIndexingStats(userId);
          console.log(`✓ RAG Stats: ${ragStats.indexedNewsletters}/${ragStats.totalNewsletters} newsletters indexed, ${ragStats.totalChunks} chunks`);

          if (ragStats.indexedNewsletters === 0) {
            console.log('⚠️ No newsletters indexed. Falling back to legacy mode or indexing required.');
            throw new functions.https.HttpsError(
              'failed-precondition',
              'No newsletters indexed for RAG. Please run the indexing function first.'
            );
          }
        } catch (error) {
          console.log('⚠️ Could not check RAG stats, proceeding with retrieval attempt');
        }

        // ==========================================
        // STAGE 1: Fetch Settings & Non-RAG Data
        // ==========================================

        console.log('⚙️ Stage 1: Fetching settings and data sources...');

        const settingsDoc = await db
          .collection('settings')
          .doc('app-settings')
          .get();

        const settings = settingsDoc.exists ? settingsDoc.data() : {};
        const customPrompts = settings?.postIdeasPrompts || {};

        // 1.1 Fetch LinkedIn Analytics
        const linkedInAnalyticsDoc = await db
          .collection('linkedinAnalytics')
          .doc(userId)
          .get();

        if (!linkedInAnalyticsDoc.exists) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'No LinkedIn analytics data found. Please sync your LinkedIn analytics first.'
          );
        }

        const analyticsData = linkedInAnalyticsDoc.data()!;
        const linkedInPosts = analyticsData.posts || [];

        if (linkedInPosts.length === 0) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'No LinkedIn posts found in analytics. Please sync your LinkedIn analytics.'
          );
        }

        console.log(`✓ Found ${linkedInPosts.length} LinkedIn posts`);

        // 1.2 Fetch All Competitor Posts
        const competitorPostsSnapshot = await db
          .collection('competitorPosts')
          .get();

        const competitorPosts = competitorPostsSnapshot.docs.map((doc) =>
          doc.data()
        );

        if (competitorPosts.length === 0) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'No competitor posts found. Please sync competitor posts first.'
          );
        }

        console.log(`✓ Found ${competitorPosts.length} competitor posts`);

        // ==========================================
        // STAGE 2: RAG - Retrieve Relevant Newsletters
        // ==========================================

        console.log('📰 Stage 2: [RAG] Retrieving relevant newsletter content...');

        // Use semantic search to find relevant newsletter chunks
        // Search for AI-related content with multiple topic queries
        const retrievalResult = await retrieveRelevantNewsletters(
          'AI trends, machine learning, artificial intelligence, LLM, GPT, automation, business innovation',
          userId,
          15, // Get top 15 chunks
          0.3 // Minimum relevance score
        );

        console.log(`✓ [RAG] Retrieved ${retrievalResult.totalChunks} relevant newsletter chunks`);

        if (retrievalResult.totalChunks === 0) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'No relevant newsletter content found. Please ensure newsletters are indexed.'
          );
        }

        // ==========================================
        // STAGE 3: Initialize OpenAI
        // ==========================================

        const openaiApiKey =
          functions.config().openai?.key || process.env.OPENAI_API_KEY || '';

        if (!openaiApiKey) {
          throw new functions.https.HttpsError(
            'internal',
            'OpenAI API key not configured'
          );
        }

        const openai = new OpenAI({apiKey: openaiApiKey});

        let totalCost = 0;
        const costs = {
          analyticsAnalysis: 0,
          newsletterAnalysis: 0,
          competitorAnalysis: 0,
          ideaGeneration: 0,
        };

        // ==========================================
        // STAGE 4: Analyze LinkedIn Analytics
        // ==========================================

        console.log('🔍 Stage 3: Analyzing LinkedIn analytics...');

        const analyticsPrompt = customPrompts.analyticsAnalysis
          ? customPrompts.analyticsAnalysis
          : getAnalyticsAnalysisPrompt(linkedInPosts);

        const analyticsCompletion = await openai.chat.completions.create({
          model: 'gpt-4-turbo',
          response_format: {type: 'json_object'},
          temperature: 0.3,
          messages: [
            {
              role: 'system',
              content: 'You are an expert LinkedIn content analyst.',
            },
            {role: 'user', content: analyticsPrompt},
          ],
        });

        const analyticsContent =
          analyticsCompletion.choices[0]?.message?.content;
        if (!analyticsContent) {
          throw new functions.https.HttpsError(
            'internal',
            'Failed to analyze LinkedIn analytics'
          );
        }

        const analyticsResponse: AnalyticsAnalysisResponse = JSON.parse(
          cleanJsonResponse(analyticsContent)
        );

        // Calculate cost
        const analyticsTokens = extractTokenUsage(analyticsCompletion);
        if (analyticsTokens) {
          const analyticsCostInfo = calculateCost(
            analyticsTokens,
            'gpt-4-turbo'
          );
          costs.analyticsAnalysis = analyticsCostInfo.totalCost;
          totalCost += costs.analyticsAnalysis;
          console.log(
            `💰 Analytics analysis cost: $${costs.analyticsAnalysis.toFixed(4)}`
          );
        }

        // Calculate additional metrics
        const totalImpressions = linkedInPosts.reduce(
          (sum: number, post: any) => sum + (post.impressions || 0),
          0
        );
        const totalEngagement = linkedInPosts.reduce(
          (sum: number, post: any) =>
            sum + (post.likes || 0) + (post.comments || 0) + (post.shares || 0),
          0
        );

        const analyticsInsights: AnalyticsInsights = {
          totalPosts: linkedInPosts.length,
          topTopics: analyticsResponse.topTopics,
          bestWordCountRange: analyticsResponse.bestWordCountRange,
          toneStyle: analyticsResponse.toneStyle,
          structurePatterns: analyticsResponse.structurePatterns,
          topHashtags: analyticsResponse.topHashtags,
          avgImpressions: Math.round(totalImpressions / linkedInPosts.length),
          avgEngagementRate:
            totalImpressions > 0
              ? Math.round((totalEngagement / totalImpressions) * 100 * 100) /
                100
              : 0,
        };

        console.log('✓ LinkedIn analytics analyzed');

        // ==========================================
        // STAGE 5: [RAG] Extract Trends from Retrieved Content
        // ==========================================

        console.log('📰 Stage 4: [RAG] Extracting trends from retrieved content...');

        const ragNewsletterPrompt = getRAGNewsletterTrendsPrompt(
          retrievalResult.chunks.map(c => ({
            text: c.text,
            subject: c.subject,
            from: c.from,
            date: c.date,
            relevanceScore: c.relevanceScore,
          }))
        );

        const newsletterCompletion = await openai.chat.completions.create({
          model: 'gpt-4-turbo',
          response_format: {type: 'json_object'},
          temperature: 0.5,
          messages: [
            {
              role: 'system',
              content: 'You are an AI trends analyst with expertise in extracting insights from newsletter content.',
            },
            {role: 'user', content: ragNewsletterPrompt},
          ],
        });

        const newsletterContent =
          newsletterCompletion.choices[0]?.message?.content;
        if (!newsletterContent) {
          throw new functions.https.HttpsError(
            'internal',
            'Failed to analyze newsletter trends'
          );
        }

        const newsletterResponse: { trends: TrendWithSource[] } = JSON.parse(
          cleanJsonResponse(newsletterContent)
        );

        // Calculate cost
        const newsletterTokens = extractTokenUsage(newsletterCompletion);
        if (newsletterTokens) {
          const newsletterCostInfo = calculateCost(
            newsletterTokens,
            'gpt-4-turbo'
          );
          costs.newsletterAnalysis = newsletterCostInfo.totalCost;
          totalCost += costs.newsletterAnalysis;
          console.log(
            `💰 [RAG] Newsletter analysis cost: $${costs.newsletterAnalysis.toFixed(4)}`
          );
        }

        console.log(
          `✓ [RAG] Identified ${newsletterResponse.trends.length} AI trends with sources`
        );

        // ==========================================
        // STAGE 6: Analyze Competitor Posts
        // ==========================================

        console.log('🏢 Stage 5: Analyzing competitor posts...');

        const competitorPrompt = customPrompts.competitorInsights
          ? customPrompts.competitorInsights
          : getCompetitorInsightsPrompt(competitorPosts);

        const competitorCompletion = await openai.chat.completions.create({
          model: 'gpt-4-turbo',
          response_format: {type: 'json_object'},
          temperature: 0.3,
          messages: [
            {
              role: 'system',
              content: 'You are a LinkedIn content landscape analyst.',
            },
            {role: 'user', content: competitorPrompt},
          ],
        });

        const competitorContent =
          competitorCompletion.choices[0]?.message?.content;
        if (!competitorContent) {
          throw new functions.https.HttpsError(
            'internal',
            'Failed to analyze competitor posts'
          );
        }

        const competitorResponse: CompetitorInsightsResponse = JSON.parse(
          cleanJsonResponse(competitorContent)
        );

        // Calculate cost
        const competitorTokens = extractTokenUsage(competitorCompletion);
        if (competitorTokens) {
          const competitorCostInfo = calculateCost(
            competitorTokens,
            'gpt-4-turbo'
          );
          costs.competitorAnalysis = competitorCostInfo.totalCost;
          totalCost += costs.competitorAnalysis;
          console.log(
            `💰 Competitor analysis cost: $${costs.competitorAnalysis.toFixed(4)}`
          );
        }

        console.log('✓ Competitor landscape analyzed');

        // ==========================================
        // STAGE 7: [RAG] Generate 5 Post Ideas with Trend Affinity
        // ==========================================

        console.log('💡 Stage 6: [RAG] Generating 5 post ideas with trend affinity...');

        const ideasPrompt = getRAGPostIdeasPrompt(
          analyticsInsights,
          newsletterResponse.trends.map(t => ({
            trend: t.trend,
            sourceSubject: t.sourceSubject,
            sourceFrom: t.sourceFrom,
            relevantSnippet: t.relevantSnippet,
          })),
          competitorResponse
        );

        const ideasCompletion = await openai.chat.completions.create({
          model: 'gpt-4-turbo',
          response_format: {type: 'json_object'},
          temperature: 0.7,
          max_tokens: 3000,
          messages: [
            {
              role: 'system',
              content:
                'You are an expert LinkedIn content strategist and AI trends analyst.',
            },
            {role: 'user', content: ideasPrompt},
          ],
        });

        const ideasContent = ideasCompletion.choices[0]?.message?.content;
        if (!ideasContent) {
          throw new functions.https.HttpsError(
            'internal',
            'Failed to generate post ideas'
          );
        }

        const ideasResponse = JSON.parse(cleanJsonResponse(ideasContent));

        if (!ideasResponse.ideas || ideasResponse.ideas.length === 0) {
          throw new functions.https.HttpsError(
            'internal',
            'No post ideas were generated'
          );
        }

        // Add IDs to ideas and preserve trend affinity
        const ideas: PostIdea[] = ideasResponse.ideas.map((idea: any, idx: number) => ({
          id: `idea${idx + 1}`,
          hook: idea.hook,
          postStyle: idea.postStyle,
          topicAndAngle: idea.topicAndAngle,
          whyThisWorks: idea.whyThisWorks,
          targetAudience: idea.targetAudience,
          estimatedWordCount: idea.estimatedWordCount,
          primaryTrendIndex: idea.primaryTrendIndex ?? 0,
          relatedTrendIndices: idea.relatedTrendIndices ?? [],
        }));

        // Calculate cost
        const ideasTokens = extractTokenUsage(ideasCompletion);
        if (ideasTokens) {
          const ideasCostInfo = calculateCost(ideasTokens, 'gpt-4-turbo');
          costs.ideaGeneration = ideasCostInfo.totalCost;
          totalCost += costs.ideaGeneration;
          console.log(
            `💰 [RAG] Idea generation cost: $${costs.ideaGeneration.toFixed(4)}`
          );
        }

        console.log(`✓ [RAG] Generated ${ideas.length} post ideas with trend affinity`);

        // ==========================================
        // STAGE 8: Save to Firestore
        // ==========================================

        console.log('💾 Stage 7: Saving to Firestore...');

        const sessionId = db
          .collection('linkedInPostIdeas')
          .doc(userId)
          .collection('sessions')
          .doc().id;

        // Convert trends to simple strings for legacy compatibility
        const legacyTrends = newsletterResponse.trends.map(t => t.trend);

        const session: PostIdeasSession = {
          id: sessionId,
          userId,
          createdAt: Timestamp.now(),
          ideas,
          analyticsInsights,
          aiTrends: legacyTrends, // Legacy format
          aiTrendsWithSources: newsletterResponse.trends, // RAG-enhanced format
          competitorInsights: competitorResponse.insights,
          competitorOverusedTopics: competitorResponse.overusedTopics,
          competitorContentGaps: competitorResponse.contentGaps,
          dataSourceCounts: {
            linkedInPosts: linkedInPosts.length,
            newsletterEmails: retrievalResult.totalChunks, // Number of chunks used
            competitorPosts: competitorPosts.length,
          },
          totalCost,
          costs,
          ragEnabled: true,
          retrievedChunksCount: retrievalResult.totalChunks,
        };

        await db
          .collection('linkedInPostIdeas')
          .doc(userId)
          .collection('sessions')
          .doc(sessionId)
          .set(session);

        // Log costs
        if (ideasTokens) {
          const ideasCostInfo = calculateCost(ideasTokens, 'gpt-4-turbo');
          await logApiCost(userId, 'linkedin-post-ideas-rag', ideasCostInfo, {
            operationDetails: {
              sessionId,
              stage: 'post_ideas_generation_rag',
              ideasCount: ideas.length,
              dataSourceCounts: session.dataSourceCounts,
              ragEnabled: true,
              retrievedChunks: retrievalResult.totalChunks,
            },
          });
        }

        console.log(
          `✅ [RAG] Post ideas session created: ${sessionId} (Total cost: $${totalCost.toFixed(4)})`
        );

        return {
          success: true,
          sessionId,
          message: `Successfully generated ${ideas.length} post ideas using RAG`,
          dataSourceCounts: session.dataSourceCounts,
        };
      } catch (error) {
        console.error('❌ [RAG] Error generating post ideas:', error);

        if (error instanceof functions.https.HttpsError) {
          throw error;
        }

        throw new functions.https.HttpsError(
          'internal',
          `Failed to generate post ideas: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
  );
