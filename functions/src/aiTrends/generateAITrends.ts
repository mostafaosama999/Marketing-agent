/**
 * Generate AI Trends Cloud Function
 * Analyzes newsletter emails to identify AI/ML trends for LinkedIn leadership posts
 */

import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {HttpsError} from "firebase-functions/v1/auth";
import OpenAI from "openai";
import {AITrendsRequest, AITrendsResponse, AITrend, EmailData} from "./types";
import {calculateCost, logApiCost} from "../utils/costTracker";

const DEFAULT_PROMPT = `You are an AI trends analyst helping a LinkedIn thought leader create content about AI and leadership.

Analyze the following newsletter emails and identify the top AI and machine learning trends that would be suitable for creating LinkedIn posts about leadership, innovation, and strategic thinking.

For each trend:
1. Provide a clear, concise title
2. Write a 2-3 sentence description
3. Categorize it (models, techniques, applications, tools, research, industry)
4. Assign a relevance score (0-100) for leadership content
5. List 2-3 key points that leaders should understand
6. Suggest a leadership angle (how leaders can apply or think about this trend)

Focus on trends that:
- Are current and emerging (not outdated)
- Have practical implications for business leaders
- Can be explained to a non-technical executive audience
- Connect to themes like innovation, strategy, team building, or decision-making

Return the analysis as JSON with this structure:
{
  "trends": [
    {
      "title": "string",
      "description": "string",
      "category": "models" | "techniques" | "applications" | "tools" | "research" | "industry",
      "relevanceScore": number,
      "keyPoints": ["string", "string", "string"],
      "sources": ["string"],
      "leadershipAngle": "string"
    }
  ]
}

Limit to the top 5-10 most relevant trends.`;

/**
 * Generate AI trends analysis from newsletter emails
 */
export const generateAITrends = functions.https.onCall(
  async (
    data: AITrendsRequest,
    context
  ): Promise<AITrendsResponse> => {
    // Authentication check
    if (!context.auth) {
      throw new HttpsError(
        "unauthenticated",
        "User must be authenticated to generate AI trends"
      );
    }

    const userId = context.auth.uid;
    const emailCount = data.emailCount || 50;
    // Only extract customPrompt if it's actually provided (not undefined)
    const customPrompt = data.customPrompt !== undefined ? data.customPrompt : null;

    try {
      // 1. Fetch recent emails from Firestore
      const db = admin.firestore();
      const emailsRef = db
        .collection("newsletters")
        .doc("emails")
        .collection("items")
        .orderBy("receivedAt", "desc")
        .limit(emailCount);

      const emailsSnapshot = await emailsRef.get();

      if (emailsSnapshot.empty) {
        throw new HttpsError(
          "failed-precondition",
          "No emails found. Please sync emails first."
        );
      }

      const emails: EmailData[] = emailsSnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          subject: data.subject || "",
          body: data.body || "",
          from: data.from || {email: "", name: ""},
          receivedAt: data.receivedAt?.toDate() || new Date(),
        };
      });

      console.log(`Fetched ${emails.length} emails for analysis`);

      // 2. Prepare email content for analysis
      const emailContent = emails
        .map((email, index) => {
          return `
Email ${index + 1}:
Subject: ${email.subject}
From: ${email.from.name} (${email.from.email})
Date: ${email.receivedAt.toLocaleDateString()}
Content: ${email.body.substring(0, 1000)}...
---`;
        })
        .join("\n\n");

      // 3. Initialize OpenAI
      const openaiApiKey = functions.config().openai?.key || process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new HttpsError("failed-precondition", "OpenAI API key not configured");
      }

      const openai = new OpenAI({apiKey: openaiApiKey});

      // 4. Build the prompt
      const systemPrompt = customPrompt || DEFAULT_PROMPT;
      const userPrompt = `${emailContent}\n\nBased on the above ${emails.length} newsletter emails, identify and analyze the top AI trends suitable for LinkedIn leadership posts.`;

      console.log("Calling OpenAI API for AI trends analysis...");

      // 5. Call OpenAI API
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {role: "system", content: systemPrompt},
          {role: "user", content: userPrompt},
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: {type: "json_object"},
      });

      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        throw new HttpsError("internal", "Empty response from OpenAI");
      }

      // 6. Parse response
      let parsedResponse: { trends: AITrend[] };
      try {
        // Remove markdown code blocks if present
        const cleanedResponse = responseContent
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        parsedResponse = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error("Error parsing OpenAI response:", parseError);
        console.error("Raw response:", responseContent);
        throw new HttpsError("internal", "Failed to parse AI trends response");
      }

      // 7. Add IDs to trends
      const trendsWithIds: AITrend[] = parsedResponse.trends.map((trend, index) => ({
        ...trend,
        id: `trend_${Date.now()}_${index}`,
      }));

      // 8. Calculate costs
      const costInfo = calculateCost(
        {
          inputTokens: completion.usage?.prompt_tokens || 0,
          outputTokens: completion.usage?.completion_tokens || 0,
          totalTokens: completion.usage?.total_tokens || 0,
        },
        "gpt-4-turbo-preview"
      );

      // 9. Log API cost (using existing service type for now)
      await logApiCost(userId, "linkedin-analytics-extraction", costInfo, {
        operationDetails: {
          emailCount,
          trendsFound: trendsWithIds.length,
          model: "gpt-4-turbo-preview",
          operation: "ai-trends-analysis",
        },
      });

      // 10. Save session to Firestore
      const sessionId = `session_${Date.now()}`;

      // Build session object without undefined values (Firestore rejects them)
      const session: Record<string, any> = {
        id: sessionId,
        userId,
        trends: trendsWithIds,
        generatedAt: admin.firestore.Timestamp.now(),
        emailCount: emails.length,
        totalCost: costInfo.totalCost,
        model: "gpt-4-turbo-preview",
      };

      // Only add customPrompt if it's not null/undefined
      if (customPrompt !== null && customPrompt !== undefined) {
        session.customPrompt = customPrompt;
      }

      await db
        .collection("aiTrends")
        .doc(userId)
        .collection("sessions")
        .doc(sessionId)
        .set(session);

      console.log(`✅ AI Trends session saved: ${sessionId}, found ${trendsWithIds.length} trends`);

      // 11. Return response
      return {
        success: true,
        session: {
          ...session,
          generatedAt: session.generatedAt.toDate(),
        },
        message: `Successfully analyzed ${emails.length} emails and identified ${trendsWithIds.length} AI trends`,
        costInfo: {
          promptTokens: completion.usage?.prompt_tokens || 0,
          completionTokens: completion.usage?.completion_tokens || 0,
          totalCost: costInfo.totalCost,
        },
      };
    } catch (error) {
      console.error("Error generating AI trends:", error);

      if (error instanceof HttpsError) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new HttpsError("internal", `Failed to generate AI trends: ${errorMessage}`);
    }
  }
);
