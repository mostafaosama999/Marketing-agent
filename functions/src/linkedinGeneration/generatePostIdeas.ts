// functions/src/linkedinGeneration/generatePostIdeas.ts

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
  NewsletterTrendsResponse,
  CompetitorInsightsResponse,
  PostIdeasGenerationResponse,
} from './postIdeasTypes';
import {
  extractTokenUsage,
  calculateCost,
  logApiCost,
} from '../utils/costTracker';
import {
  getAnalyticsAnalysisPrompt,
  getNewsletterTrendsPrompt,
  getCompetitorInsightsPrompt,
  getPostIdeasPrompt,
  DEFAULT_ANALYTICS_ANALYSIS_PROMPT,
  DEFAULT_NEWSLETTER_TRENDS_PROMPT,
  DEFAULT_COMPETITOR_INSIGHTS_PROMPT,
  DEFAULT_POST_IDEAS_PROMPT,
} from '../prompts/postIdeasPrompt';

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
 * Generate 5 LinkedIn Post Ideas
 * Analyzes LinkedIn analytics, newsletters, and competitor posts
 */
export const generatePostIdeas = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes
    memory: '512MB',
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
        console.log(`🚀 Starting post ideas generation for user: ${userId}`);

        // ==========================================
        // STAGE 0: Fetch Settings for Custom Prompts
        // ==========================================

        console.log('⚙️ Stage 0: Fetching settings...');
        const settingsDoc = await db
          .collection('settings')
          .doc('app-settings')
          .get();

        const settings = settingsDoc.exists ? settingsDoc.data() : {};
        const customPrompts = settings?.postIdeasPrompts || {};

        console.log('✓ Settings loaded');

        // ==========================================
        // STAGE 1: Fetch All 3 Data Sources
        // ==========================================

        console.log('📊 Stage 1: Fetching data sources...');

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

        // 1.2 Fetch Newsletter Emails (last 50)
        const emailsSnapshot = await db
          .collection('newsletters')
          .doc('emails')
          .collection('items')
          .orderBy('receivedAt', 'desc')
          .limit(50)
          .get();

        const newsletterEmails = emailsSnapshot.docs.map((doc) => doc.data());

        if (newsletterEmails.length === 0) {
          throw new functions.https.HttpsError(
            'failed-precondition',
            'No newsletter emails found. Please sync your Gmail first.'
          );
        }

        console.log(`✓ Found ${newsletterEmails.length} newsletter emails`);

        // 1.3 Fetch All Competitor Posts
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
        // STAGE 2: Initialize OpenAI
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
        // STAGE 3: Analyze LinkedIn Analytics
        // ==========================================

        console.log('🔍 Stage 2: Analyzing LinkedIn analytics...');

        // Use custom prompt or default
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
        // STAGE 4: Analyze Newsletter Trends
        // ==========================================

        console.log('📰 Stage 3: Analyzing newsletter trends...');

        // Use custom prompt or default
        const newsletterPrompt = customPrompts.newsletterTrends
          ? customPrompts.newsletterTrends
          : getNewsletterTrendsPrompt(newsletterEmails);

        const newsletterCompletion = await openai.chat.completions.create({
          model: 'gpt-4-turbo',
          response_format: {type: 'json_object'},
          temperature: 0.5,
          messages: [
            {
              role: 'system',
              content: 'You are an AI trends analyst.',
            },
            {role: 'user', content: newsletterPrompt},
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

        const newsletterResponse: NewsletterTrendsResponse = JSON.parse(
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
            `💰 Newsletter analysis cost: $${costs.newsletterAnalysis.toFixed(4)}`
          );
        }

        console.log(
          `✓ Identified ${newsletterResponse.trends.length} AI trends`
        );

        // ==========================================
        // STAGE 5: Analyze Competitor Posts
        // ==========================================

        console.log('🏢 Stage 4: Analyzing competitor posts...');

        // Use custom prompt or default
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
        // STAGE 6: Generate 5 Post Ideas
        // ==========================================

        console.log('💡 Stage 5: Generating 5 post ideas...');

        // Use custom prompt or default
        const ideasPrompt = customPrompts.ideasGeneration
          ? customPrompts.ideasGeneration
          : getPostIdeasPrompt(
              analyticsInsights,
              newsletterResponse.trends,
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

        const ideasResponse: PostIdeasGenerationResponse = JSON.parse(
          cleanJsonResponse(ideasContent)
        );

        if (!ideasResponse.ideas || ideasResponse.ideas.length === 0) {
          throw new functions.https.HttpsError(
            'internal',
            'No post ideas were generated'
          );
        }

        // Add IDs to ideas
        const ideas: PostIdea[] = ideasResponse.ideas.map((idea, idx) => ({
          id: `idea${idx + 1}`,
          hook: idea.hook,
          postStyle: idea.postStyle,
          topicAndAngle: idea.topicAndAngle,
          whyThisWorks: idea.whyThisWorks,
          targetAudience: idea.targetAudience,
          estimatedWordCount: idea.estimatedWordCount,
        }));

        // Calculate cost
        const ideasTokens = extractTokenUsage(ideasCompletion);
        if (ideasTokens) {
          const ideasCostInfo = calculateCost(ideasTokens, 'gpt-4-turbo');
          costs.ideaGeneration = ideasCostInfo.totalCost;
          totalCost += costs.ideaGeneration;
          console.log(
            `💰 Idea generation cost: $${costs.ideaGeneration.toFixed(4)}`
          );
        }

        console.log(`✓ Generated ${ideas.length} post ideas`);

        // ==========================================
        // STAGE 7: Save to Firestore
        // ==========================================

        console.log('💾 Stage 6: Saving to Firestore...');

        const sessionId = db
          .collection('linkedInPostIdeas')
          .doc(userId)
          .collection('sessions')
          .doc().id;

        const session: PostIdeasSession = {
          id: sessionId,
          userId,
          createdAt: Timestamp.now(),
          ideas,
          analyticsInsights,
          aiTrends: newsletterResponse.trends,
          competitorInsights: competitorResponse.insights,
          dataSourceCounts: {
            linkedInPosts: linkedInPosts.length,
            newsletterEmails: newsletterEmails.length,
            competitorPosts: competitorPosts.length,
          },
          totalCost,
          costs,
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
          await logApiCost(userId, 'linkedin-post-from-trend', ideasCostInfo, {
            operationDetails: {
              sessionId,
              stage: 'post_ideas_generation',
              ideasCount: ideas.length,
              dataSourceCounts: session.dataSourceCounts,
            },
          });
        }

        console.log(
          `✅ Post ideas session created: ${sessionId} (Total cost: $${totalCost.toFixed(4)})`
        );

        return {
          success: true,
          sessionId,
          message: `Successfully generated ${ideas.length} post ideas`,
          dataSourceCounts: session.dataSourceCounts,
        };
      } catch (error) {
        console.error('❌ Error generating post ideas:', error);

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
