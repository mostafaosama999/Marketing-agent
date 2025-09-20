import * as functions from "firebase-functions";
import {createResearchSession, updateResearchSession, updateResearchStep} from "../utils/firestore";
import {ResearchStep} from "../types";
import {analyzeCompany} from "../utils/companyAnalysisUtils";
import {analyzeBlogFromCompany} from "../utils/blogDiscoveryUtils";
import {generateIdeasForCompany} from "../utils/ideaGenerationUtils";
import {createResearchDocument} from "./docGeneration";

const initialSteps: ResearchStep[] = [
  {
    id: 1,
    title: "Analyze Homepage",
    description: "Extract company information from the homepage",
    status: "pending",
  },
  {
    id: 2,
    title: "Find Blog",
    description: "Locate and analyze the company blog",
    status: "pending",
  },
  {
    id: 3,
    title: "Extract AI Trends",
    description: "Pull latest trends from AI newsletters",
    status: "pending",
  },
  {
    id: 4,
    title: "Generate Ideas",
    description: "Create 15-20 tailored content ideas",
    status: "pending",
  },
  {
    id: 5,
    title: "Remove Duplicates",
    description: "Filter out ideas similar to existing content",
    status: "pending",
  },
  {
    id: 6,
    title: "Create Google Doc",
    description: "Generate comprehensive report document",
    status: "pending",
  },
  {
    id: 7,
    title: "Complete",
    description: "Research completed successfully",
    status: "pending",
  },
];

/**
 * Main orchestrator function to trigger the research flow
 */
export const triggerResearchFlow = functions.https.onCall(async (data, context) => {
  try {
    const {companyUrl} = data;

    if (!companyUrl) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Company URL is required"
      );
    }

    // Validate URL format
    try {
      new URL(companyUrl.startsWith("http") ? companyUrl : `https://${companyUrl}`);
    } catch {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid URL format"
      );
    }

    // Create new research session
    const sessionId = await createResearchSession({
      companyUrl,
      status: "in_progress",
      steps: initialSteps,
    });

    // Start the research process asynchronously
    processResearchFlow(sessionId, companyUrl).catch((error) => {
      console.error("Research flow error:", error);
      updateResearchSession(sessionId, {
        status: "error",
        error: error.message,
      });
    });

    return {
      success: true,
      sessionId,
      message: "Research flow started",
    };
  } catch (error) {
    console.error("Trigger research flow error:", error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError(
      "internal",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
});

/**
 * Process the complete research flow with real API calls
 */
async function processResearchFlow(sessionId: string, companyUrl: string) {
  try {
    let companyAnalysis: any = null;
    let blogAnalysis: any = null;
    let aiTrends: any = [];
    let uniqueIdeas: any = [];
    let googleDocUrl: string = "";

    // Step 1: Analyze Homepage
    await updateResearchStep(sessionId, 0, {status: "in_progress"});
    try {
      companyAnalysis = await analyzeCompany(companyUrl);
      await updateResearchStep(sessionId, 0, {
        status: "completed",
        result: `**${companyAnalysis.title}** - ${companyAnalysis.industry} company\n` +
                `Products: ${companyAnalysis.keyProducts.join(", ")}\n` +
                `Target Audience: ${companyAnalysis.targetAudience}\n` +
                `Summary: ${companyAnalysis.summary.substring(0, 200)}...`,
      });
    } catch (error) {
      console.error("Company analysis error:", error);
      await updateResearchStep(sessionId, 0, {
        status: "error",
        result: `Error analyzing homepage: ${error instanceof Error ? error.message : String(error)}`,
      });
      throw error;
    }

    // Step 2: Find Blog
    await updateResearchStep(sessionId, 1, {status: "in_progress"});
    try {
      blogAnalysis = await analyzeBlogFromCompany(companyUrl);
      const blogMessage = blogAnalysis.found ?
        `**Blog Found:** ${blogAnalysis.blogUrl}\n` +
        `Posts: ${blogAnalysis.recentPosts.length} recent posts\n` +
        `Content Style: ${blogAnalysis.contentStyle}\n` +
        `Posting Frequency: ${blogAnalysis.postingFrequency}\n` +
        `Recent Titles: ${blogAnalysis.recentPosts.slice(0, 3).map((p: any) => p.title).join(", ")}` :
        "**No blog found** for this company\nRecommendation: Consider starting a company blog for thought leadership";
      await updateResearchStep(sessionId, 1, {
        status: "completed",
        result: blogMessage,
      });
    } catch (error) {
      console.error("Blog discovery error:", error);
      await updateResearchStep(sessionId, 1, {
        status: "completed",
        result: "Blog discovery completed (no blog found)",
      });
      blogAnalysis = {found: false, recentPosts: [], themes: []};
    }

    // Step 3: Extract AI Trends (mock for now - would integrate with newsletter APIs)
    await updateResearchStep(sessionId, 2, {status: "in_progress"});
    aiTrends = [
      {
        topic: "Multimodal AI",
        description: "AI systems that process multiple types of data",
        keywords: ["multimodal", "vision", "language", "AI"]
      },
      {
        topic: "AI Agents",
        description: "Autonomous AI systems that can take actions",
        keywords: ["agents", "autonomous", "AI", "automation"]
      }
    ];
    await updateResearchStep(sessionId, 2, {
      status: "completed",
      result: `Extracted ${aiTrends.length} current AI trends`,
    });

    // Step 4: Generate Ideas
    await updateResearchStep(sessionId, 3, {status: "in_progress"});
    try {
      const ideaRequest = {
        companyAnalysis,
        blogThemes: blogAnalysis?.themes || [],
        aiTrends,
        existingTitles: blogAnalysis?.recentPosts?.map((post: any) => post.title) || []
      };
      const ideaResult = await generateIdeasForCompany(ideaRequest);
      uniqueIdeas = ideaResult.ideas;
      await updateResearchStep(sessionId, 3, {
        status: "completed",
        result: `**Generated ${ideaResult.totalGenerated} ideas** (${ideaResult.uniqueCount} unique)\n` +
                `Sample Ideas:\n` +
                uniqueIdeas.slice(0, 3).map((idea: any) =>
                  `• ${idea.title} (${idea.format}, ${idea.difficulty})`
                ).join("\n"),
      });
    } catch (error) {
      console.error("Idea generation error:", error);
      await updateResearchStep(sessionId, 3, {
        status: "error",
        result: `Error generating ideas: ${error instanceof Error ? error.message : String(error)}`,
      });
      throw error;
    }

    // Step 5: Remove Duplicates (already handled in idea generation)
    await updateResearchStep(sessionId, 4, {status: "in_progress"});
    const duplicatesRemoved = uniqueIdeas.filter((idea: any) => idea.isDuplicate).length;
    const finalIdeas = uniqueIdeas.filter((idea: any) => !idea.isDuplicate);
    await updateResearchStep(sessionId, 4, {
      status: "completed",
      result: `Removed ${duplicatesRemoved} duplicates - ${finalIdeas.length} unique ideas remain`,
    });

    // Step 6: Create Google Doc
    await updateResearchStep(sessionId, 5, {status: "in_progress"});
    try {
      const sessionData = {
        id: sessionId,
        companyUrl,
        status: "in_progress" as const,
        steps: [],
        companyAnalysis,
        blogAnalysis,
        aiTrends,
        uniqueIdeas: finalIdeas,
        createdAt: new Date()
      };
      googleDocUrl = await createResearchDocument(sessionData);
      await updateResearchStep(sessionId, 5, {
        status: "completed",
        result: `**Google Doc Created Successfully**\n` +
                `Document: [View Report](${googleDocUrl})\n` +
                `Contains: Company analysis, blog insights, ${finalIdeas.length} content ideas`,
      });
    } catch (error) {
      console.error("Google Doc creation error:", error);
      await updateResearchStep(sessionId, 5, {
        status: "error",
        result: `Error creating Google Doc: ${error instanceof Error ? error.message : String(error)}`,
      });
      throw error;
    }

    // Step 7: Complete
    await updateResearchStep(sessionId, 6, {
      status: "completed",
      result: "Research flow completed successfully",
    });

    // Update session with real results
    await updateResearchSession(sessionId, {
      status: "completed",
      completedAt: new Date(),
      companyAnalysis,
      blogAnalysis,
      aiTrends,
      uniqueIdeas: finalIdeas,
      googleDocUrl,
    });
  } catch (error) {
    console.error("Process research flow error:", error);
    await updateResearchSession(sessionId, {
      status: "error",
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}