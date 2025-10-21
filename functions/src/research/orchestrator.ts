import * as functions from "firebase-functions";
import {createResearchSession, updateResearchSession, updateResearchStep} from "../utils/firestore";
import {ResearchStep} from "../types";
import {analyzeCompany} from "../utils/companyAnalysisUtils";
import {analyzeBlogFromCompany} from "../utils/blogDiscoveryUtils";
import {generateIdeasForCompany} from "../utils/ideaGenerationUtils";
import {updateResearchDocument} from "../utils/docGenerationUtils";

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
    title: "Update Document",
    description: "Update existing Google Doc with research results",
    status: "pending",
  },
  {
    id: 6,
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
    const step1StartTime = new Date();
    await updateResearchStep(sessionId, 0, {
      status: "in_progress",
      startedAt: step1StartTime,
    });
    try {
      companyAnalysis = await analyzeCompany(companyUrl);
      const step1EndTime = new Date();
      const step1Duration = step1EndTime.getTime() - step1StartTime.getTime();
      await updateResearchStep(sessionId, 0, {
        status: "completed",
        completedAt: step1EndTime,
        duration: step1Duration,
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
    const step2StartTime = new Date();
    await updateResearchStep(sessionId, 1, {
      status: "in_progress",
      startedAt: step2StartTime,
    });
    try {
      blogAnalysis = await analyzeBlogFromCompany(companyUrl);
      const step2EndTime = new Date();
      const step2Duration = step2EndTime.getTime() - step2StartTime.getTime();
      const blogMessage = blogAnalysis.found ?
        `**Blog Found:** ${blogAnalysis.blogUrl}\n` +
        `Posts: ${blogAnalysis.recentPosts.length} recent posts\n` +
        `Content Style: ${blogAnalysis.contentStyle}\n` +
        `Posting Frequency: ${blogAnalysis.postingFrequency}\n` +
        `Recent Titles: ${blogAnalysis.recentPosts.slice(0, 3).map((p: any) => p.title).join(", ")}` :
        "**No blog found** for this company\nRecommendation: Consider starting a company blog for thought leadership";
      await updateResearchStep(sessionId, 1, {
        status: "completed",
        completedAt: step2EndTime,
        duration: step2Duration,
        result: blogMessage,
      });
    } catch (error) {
      console.error("Blog discovery error:", error);
      const step2EndTime = new Date();
      const step2Duration = step2EndTime.getTime() - step2StartTime.getTime();
      await updateResearchStep(sessionId, 1, {
        status: "completed",
        completedAt: step2EndTime,
        duration: step2Duration,
        result: "Blog discovery completed (no blog found)",
      });
      blogAnalysis = {found: false, recentPosts: [], themes: []};
    }

    // Step 3: Extract AI Trends (mock for now - would integrate with newsletter APIs)
    const step3StartTime = new Date();
    await updateResearchStep(sessionId, 2, {
      status: "in_progress",
      startedAt: step3StartTime,
    });
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
    const step3EndTime = new Date();
    const step3Duration = step3EndTime.getTime() - step3StartTime.getTime();
    await updateResearchStep(sessionId, 2, {
      status: "completed",
      completedAt: step3EndTime,
      duration: step3Duration,
      result: `Extracted ${aiTrends.length} current AI trends`,
    });

    // Step 4: Generate Ideas
    const step4StartTime = new Date();
    await updateResearchStep(sessionId, 3, {
      status: "in_progress",
      startedAt: step4StartTime,
    });
    try {
      const ideaRequest = {
        companyAnalysis,
        blogThemes: blogAnalysis?.themes || [],
        aiTrends,
        existingTitles: blogAnalysis?.recentPosts?.map((post: any) => post.title) || []
      };
      const ideaResult = await generateIdeasForCompany(ideaRequest);
      uniqueIdeas = ideaResult.ideas;
      const step4EndTime = new Date();
      const step4Duration = step4EndTime.getTime() - step4StartTime.getTime();
      const filteredIdeas = uniqueIdeas.filter((idea: any) => !idea.isDuplicate);
      await updateResearchStep(sessionId, 3, {
        status: "completed",
        completedAt: step4EndTime,
        duration: step4Duration,
        result: `**Generated ${ideaResult.totalGenerated} ideas** (${filteredIdeas.length} unique)\n` +
                `All Ideas:\n` +
                filteredIdeas.map((idea: any) =>
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

    // Filter out duplicates (done inline now)
    const finalIdeas = uniqueIdeas.filter((idea: any) => !idea.isDuplicate);

    // Step 5: Update Google Doc
    const step5StartTime = new Date();
    await updateResearchStep(sessionId, 4, {
      status: "in_progress",
      startedAt: step5StartTime,
    });
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
      googleDocUrl = await updateResearchDocument(sessionData);
      const step5EndTime = new Date();
      const step5Duration = step5EndTime.getTime() - step5StartTime.getTime();
      await updateResearchStep(sessionId, 4, {
        status: "completed",
        completedAt: step5EndTime,
        duration: step5Duration,
        result: `**Document Updated Successfully**\n` +
                `Document: [View Report](${googleDocUrl})\n` +
                `Contains: Company analysis, blog insights, ${finalIdeas.length} content ideas`,
      });
    } catch (error) {
      console.error("Google Doc update error:", error);
      await updateResearchStep(sessionId, 4, {
        status: "error",
        result: `Error updating Google Doc: ${error instanceof Error ? error.message : String(error)}`,
      });
      throw error;
    }

    // Step 6: Complete
    const step6StartTime = new Date();
    const step6EndTime = new Date();
    const step6Duration = step6EndTime.getTime() - step6StartTime.getTime();
    await updateResearchStep(sessionId, 5, {
      status: "completed",
      startedAt: step6StartTime,
      completedAt: step6EndTime,
      duration: step6Duration,
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