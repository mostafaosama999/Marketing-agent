import {getGoogleDocsAPI} from "./auth";
import {
  ResearchSession,
  CompanyAnalysis,
  BlogAnalysis,
  ContentIdea,
  AITrend,
} from "../types";

/**
 * Update existing research document with new content
 */
export async function updateResearchDocument(session: ResearchSession): Promise<string> {
  const TARGET_DOC_ID = "1eRnk_2LNtKkAhkyOls6TRMlEAHth8szPVPkjvreP8K4";

  try {
    const docs = await getGoogleDocsAPI();

    // First, clear all content from the document (except the title)
    const doc = await docs.documents.get({
      documentId: TARGET_DOC_ID,
    });

    if (doc.data.body && doc.data.body.content) {
      const endIndex = doc.data.body.content[doc.data.body.content.length - 1].endIndex! - 1;

      // Delete all content except the first character (keeps the document structure)
      if (endIndex > 1) {
        await docs.documents.batchUpdate({
          documentId: TARGET_DOC_ID,
          requestBody: {
            requests: [{
              deleteContentRange: {
                range: {
                  startIndex: 1,
                  endIndex: endIndex,
                },
              },
            }],
          },
        });
      }
    }

    // Now insert new content
    const requests = buildDocumentContent(session);

    if (requests.length > 0) {
      await docs.documents.batchUpdate({
        documentId: TARGET_DOC_ID,
        requestBody: {
          requests,
        },
      });
    }

    return `https://docs.google.com/document/d/${TARGET_DOC_ID}/edit`;
  } catch (error) {
    console.error("Error updating Google Doc:", error);
    throw new Error("Failed to update Google Doc");
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