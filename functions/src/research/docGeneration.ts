import * as functions from "firebase-functions";
import {getGoogleDocsAPI, getGoogleDriveAPI} from "../utils/auth";
import {
  ResearchSession,
  CompanyAnalysis,
  BlogAnalysis,
  ContentIdea,
  AITrend,
} from "../types";

/**
 * Create Google Doc with research results
 */
export const createGoogleDoc = functions.https.onCall(async (data, context) => {
  try {
    const sessionData: ResearchSession = data;

    if (!sessionData.companyAnalysis) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Company analysis is required"
      );
    }

    console.log(`Creating Google Doc for: ${sessionData.companyAnalysis.title}`);

    // Create the Google Doc
    const documentUrl = await createResearchDocument(sessionData);

    return {
      success: true,
      documentUrl,
      message: "Google Doc created successfully",
    };
  } catch (error) {
    console.error("Doc generation error:", error);
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
 * Create comprehensive research document
 */
async function createResearchDocument(session: ResearchSession): Promise<string> {
  try {
    const docs = await getGoogleDocsAPI();
    const drive = await getGoogleDriveAPI();

    // Create document title
    const title = `Content Research: ${session.companyAnalysis?.title || "Company"} - ${new Date().toLocaleDateString()}`;

    // Create the document
    const createResponse = await docs.documents.create({
      requestBody: {
        title,
      },
    });

    const documentId = createResponse.data.documentId;
    if (!documentId) {
      throw new Error("Failed to create document");
    }

    // Build document content
    const requests = buildDocumentContent(session);

    // Apply formatting and content
    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId,
        requestBody: {
          requests,
        },
      });
    }

    // Make document publicly readable
    await drive.permissions.create({
      fileId: documentId,
      requestBody: {
        role: "reader",
        type: "anyone",
      },
    });

    return `https://docs.google.com/document/d/${documentId}/edit`;
  } catch (error) {
    console.error("Error creating Google Doc:", error);
    throw new Error("Failed to create Google Doc");
  }
}

/**
 * Build document content using Google Docs API requests
 */
function buildDocumentContent(session: ResearchSession): any[] {
  const requests: any[] = [];
  let index = 1; // Start after title

  // Add header
  requests.push({
    insertText: {
      location: {index},
      text: `Content Marketing Research Report\n\n`,
    },
  });
  index += `Content Marketing Research Report\n\n`.length;

  // Format header
  requests.push({
    updateTextStyle: {
      range: {
        startIndex: 1,
        endIndex: index - 2,
      },
      textStyle: {
        bold: true,
        fontSize: {magnitude: 18, unit: "PT"},
      },
      fields: "bold,fontSize",
    },
  });

  // Add company overview
  if (session.companyAnalysis) {
    const companySection = buildCompanySection(session.companyAnalysis);
    requests.push({
      insertText: {
        location: {index},
        text: companySection,
      },
    });
    index += companySection.length;
  }

  // Add blog analysis
  if (session.blogAnalysis) {
    const blogSection = buildBlogSection(session.blogAnalysis);
    requests.push({
      insertText: {
        location: {index},
        text: blogSection,
      },
    });
    index += blogSection.length;
  }

  // Add AI trends
  if (session.aiTrends && session.aiTrends.length > 0) {
    const trendsSection = buildTrendsSection(session.aiTrends);
    requests.push({
      insertText: {
        location: {index},
        text: trendsSection,
      },
    });
    index += trendsSection.length;
  }

  // Add content ideas
  if (session.uniqueIdeas && session.uniqueIdeas.length > 0) {
    const ideasSection = buildIdeasSection(session.uniqueIdeas);
    requests.push({
      insertText: {
        location: {index},
        text: ideasSection,
      },
    });
    index += ideasSection.length;
  }

  // Add footer
  const footer = `\n\n---\nGenerated on ${new Date().toLocaleDateString()} by Marketing Operations Pipeline\n`;
  requests.push({
    insertText: {
      location: {index},
      text: footer,
    },
  });

  return requests;
}

/**
 * Build company overview section
 */
function buildCompanySection(company: CompanyAnalysis): string {
  return `## Company Overview

**Company:** ${company.title}
**Website:** ${company.url}
**Industry:** ${company.industry || "Not specified"}

**Description:**
${company.summary}

**Key Products/Services:**
${company.keyProducts.map((product) => `• ${product}`).join("\n")}

**Target Audience:** ${company.targetAudience || "Not specified"}

`;
}

/**
 * Build blog analysis section
 */
function buildBlogSection(blog: BlogAnalysis): string {
  if (!blog.found) {
    return `## Blog Analysis

**Status:** No blog found for this company.

**Recommendation:** Consider starting a company blog to share insights and establish thought leadership.

`;
  }

  let section = `## Blog Analysis

**Blog URL:** ${blog.blogUrl || "Not specified"}
**Content Style:** ${blog.contentStyle || "Mixed content"}
**Posting Frequency:** ${blog.postingFrequency || "Irregular"}

**Content Themes:**
${blog.themes.map((theme) => `• ${theme}`).join("\n")}

`;

  if (blog.recentPosts.length > 0) {
    section += `**Recent Posts:**\n`;
    blog.recentPosts.slice(0, 10).forEach((post) => {
      section += `• ${post.title}`;
      if (post.publishedDate) {
        section += ` (${post.publishedDate.toLocaleDateString()})`;
      }
      section += "\n";
    });
    section += "\n";
  }

  return section;
}

/**
 * Build AI trends section
 */
function buildTrendsSection(trends: AITrend[]): string {
  let section = `## Current AI Trends

`;

  trends.slice(0, 10).forEach((trend, index) => {
    section += `**${index + 1}. ${trend.topic}**\n`;
    if (trend.description) {
      section += `${trend.description}\n`;
    }
    section += `Keywords: ${trend.keywords.join(", ")}\n\n`;
  });

  return section;
}

/**
 * Build content ideas section
 */
function buildIdeasSection(ideas: ContentIdea[]): string {
  let section = `## Content Ideas (${ideas.length} unique ideas)

`;

  ideas.forEach((idea, index) => {
    section += `### ${index + 1}. ${idea.title}

**Angle:** ${idea.angle}
**Format:** ${idea.format}
**Target Audience:** ${idea.targetAudience}
**Difficulty:** ${idea.difficulty}
**Estimated Length:** ${idea.estimatedLength || "1200 words"}

**Product Tie-in:** ${idea.productTieIn}

**Keywords:** ${idea.keywords.join(", ")}

---

`;
  });

  return section;
}

/**
 * Generate document template for testing
 */
export function generateDocumentTemplate(session: ResearchSession): string {
  let content = `# Content Marketing Research Report

Generated on ${new Date().toLocaleDateString()}

`;

  content += buildCompanySection(session.companyAnalysis!);

  if (session.blogAnalysis) {
    content += buildBlogSection(session.blogAnalysis);
  }

  if (session.aiTrends && session.aiTrends.length > 0) {
    content += buildTrendsSection(session.aiTrends);
  }

  if (session.uniqueIdeas && session.uniqueIdeas.length > 0) {
    content += buildIdeasSection(session.uniqueIdeas);
  }

  content += `
## Next Steps

1. Review and prioritize the content ideas based on your marketing goals
2. Create a content calendar incorporating these ideas
3. Assign topics to your content team
4. Track performance metrics for each piece of content
5. Iterate and refine your content strategy based on results

---
*Generated by Marketing Operations Pipeline*
`;

  return content;
}