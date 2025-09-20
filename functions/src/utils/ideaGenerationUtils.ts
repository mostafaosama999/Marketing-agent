import OpenAI from "openai";
import * as functions from "firebase-functions";
import {
  IdeaGenerationRequest,
  IdeaGenerationResponse,
  ContentIdea,
  CompanyAnalysis,
  AITrend,
} from "../types";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: functions.config().openai?.api_key || process.env.OPENAI_API_KEY,
});

/**
 * Generate content ideas using OpenAI GPT
 */
async function generateContentIdeas(
  request: IdeaGenerationRequest
): Promise<IdeaGenerationResponse> {
  const {companyAnalysis, blogThemes, aiTrends, existingTitles} = request;

  // Prepare prompt for OpenAI
  const prompt = buildIdeaGenerationPrompt(
    companyAnalysis,
    blogThemes,
    aiTrends,
    existingTitles
  );

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a content marketing expert who specializes in creating
          unique, engaging content ideas for technology companies. Generate ideas
          that are specific, actionable, and tied to the company's products/services.

          Return your response as a valid JSON array of content ideas. Each idea should have:
          - id: unique identifier (string)
          - title: compelling title (string)
          - angle: unique perspective or approach (string)
          - format: content type like "tutorial", "guide", "case-study", "whitepaper" (string)
          - targetAudience: primary audience (string)
          - productTieIn: how it connects to company products (string)
          - keywords: array of relevant SEO keywords (array of strings)
          - difficulty: "beginner", "intermediate", or "advanced" (string)
          - estimatedLength: like "1500 words" or "10 min read" (string)`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    });

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error("No response from OpenAI");
    }

    // Parse the JSON response
    let generatedIdeas: ContentIdea[];
    try {
      // Clean the response to extract JSON
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      generatedIdeas = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", parseError);
      // Fallback to mock ideas if parsing fails
      generatedIdeas = generateFallbackIdeas(companyAnalysis);
    }

    // Process and filter ideas
    const processedIdeas = processGeneratedIdeas(generatedIdeas, existingTitles);
    const uniqueIdeas = removeDuplicateIdeas(processedIdeas, existingTitles);

    return {
      ideas: processedIdeas,
      totalGenerated: processedIdeas.length,
      uniqueCount: uniqueIdeas.length,
      duplicatesRemoved: processedIdeas.length - uniqueIdeas.length,
    };
  } catch (error) {
    console.error("OpenAI API error:", error);
    // Fallback to mock ideas
    const fallbackIdeas = generateFallbackIdeas(companyAnalysis);
    return {
      ideas: fallbackIdeas,
      totalGenerated: fallbackIdeas.length,
      uniqueCount: fallbackIdeas.length,
      duplicatesRemoved: 0,
    };
  }
}

/**
 * Build prompt for OpenAI idea generation
 */
function buildIdeaGenerationPrompt(
  company: CompanyAnalysis,
  blogThemes: string[],
  aiTrends: AITrend[],
  existingTitles: string[]
): string {
  return `
Generate 15-20 unique content marketing ideas for ${company.title}.

Company Information:
- Industry: ${company.industry || "Technology"}
- Products/Services: ${company.keyProducts.join(", ")}
- Target Audience: ${company.targetAudience || "Business professionals"}
- Description: ${company.summary}

${blogThemes.length > 0 ? `
Current Blog Themes: ${blogThemes.slice(0, 10).join(", ")}
` : ""}

${aiTrends.length > 0 ? `
Current AI Trends to Consider:
${aiTrends.slice(0, 5).map((trend) => `- ${trend.topic}: ${trend.description}`).join("\n")}
` : ""}

${existingTitles.length > 0 ? `
Avoid topics similar to these existing titles:
${existingTitles.slice(0, 10).map((title) => `- ${title}`).join("\n")}
` : ""}

Requirements:
1. Each idea must be unique and specific to this company
2. Include clear product tie-ins
3. Focus on practical, actionable content
4. Mix different content formats (tutorials, guides, case studies, etc.)
5. Target different skill levels (beginner to advanced)
6. Include SEO-friendly keywords
7. Make titles compelling and specific

Generate ideas that would genuinely help the company's target audience while showcasing their expertise and products.

Return as a JSON array with the exact structure specified in the system message.
`;
}

/**
 * Process and validate generated ideas
 */
function processGeneratedIdeas(
  ideas: any[],
  existingTitles: string[]
): ContentIdea[] {
  return ideas
    .filter((idea) => idea && idea.title && idea.angle)
    .map((idea, index) => ({
      id: idea.id || `generated-${Date.now()}-${index}`,
      title: String(idea.title).trim(),
      angle: String(idea.angle).trim(),
      format: idea.format || "article",
      targetAudience: idea.targetAudience || "Business professionals",
      productTieIn: idea.productTieIn || "General product integration",
      keywords: Array.isArray(idea.keywords) ? idea.keywords : [],
      difficulty: ["beginner", "intermediate", "advanced"].includes(idea.difficulty) ?
        idea.difficulty : "intermediate",
      estimatedLength: idea.estimatedLength || "1200 words",
    }))
    .slice(0, 20); // Limit to 20 ideas
}

/**
 * Remove duplicate ideas based on title similarity
 */
function removeDuplicateIdeas(
  ideas: ContentIdea[],
  existingTitles: string[]
): ContentIdea[] {
  const allTitles = [...existingTitles];
  const uniqueIdeas: ContentIdea[] = [];

  for (const idea of ideas) {
    const isDuplicate = allTitles.some((existingTitle) =>
      calculateSimilarity(idea.title.toLowerCase(), existingTitle.toLowerCase()) > 0.7
    );

    if (!isDuplicate) {
      uniqueIdeas.push(idea);
      allTitles.push(idea.title);
    } else {
      // Mark as duplicate
      uniqueIdeas.push({
        ...idea,
        isDuplicate: true,
        duplicateReason: "Similar to existing content",
      });
    }
  }

  return uniqueIdeas;
}

/**
 * Calculate similarity between two strings
 */
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = new Set(str1.split(/\s+/));
  const words2 = new Set(str2.split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

/**
 * Generate fallback ideas when OpenAI fails
 */
function generateFallbackIdeas(company: CompanyAnalysis): ContentIdea[] {
  const baseIdeas = [
    {
      title: `Getting Started with ${company.keyProducts[0] || "Our Platform"}`,
      angle: "Beginner-friendly introduction and setup guide",
      format: "tutorial",
      targetAudience: "New users",
      difficulty: "beginner" as const,
    },
    {
      title: `Advanced ${company.industry || "Technology"} Strategies for 2024`,
      angle: "Expert insights and forward-looking predictions",
      format: "guide",
      targetAudience: "Industry professionals",
      difficulty: "advanced" as const,
    },
    {
      title: `Case Study: How ${company.title} Helped [Client] Achieve Results`,
      angle: "Real-world success story and implementation details",
      format: "case-study",
      targetAudience: "Potential customers",
      difficulty: "intermediate" as const,
    },
    {
      title: `The Complete Guide to ${company.industry || "Technology"} Best Practices`,
      angle: "Comprehensive resource for industry standards",
      format: "whitepaper",
      targetAudience: "Business leaders",
      difficulty: "intermediate" as const,
    },
    {
      title: `Common ${company.industry || "Technology"} Mistakes and How to Avoid Them`,
      angle: "Problem-solving and prevention guide",
      format: "guide",
      targetAudience: "Practitioners",
      difficulty: "intermediate" as const,
    },
  ];

  return baseIdeas.map((idea, index) => ({
    id: `fallback-${Date.now()}-${index}`,
    title: idea.title,
    angle: idea.angle,
    format: idea.format,
    targetAudience: idea.targetAudience,
    productTieIn: `Integration with ${company.keyProducts[0] || "our products"}`,
    keywords: [
      company.industry?.toLowerCase() || "technology",
      company.keyProducts[0]?.toLowerCase() || "platform",
      "guide",
      "best practices",
    ],
    difficulty: idea.difficulty,
    estimatedLength: "1500 words",
  }));
}

/**
 * Generate content ideas for a company
 */
export async function generateIdeasForCompany(request: IdeaGenerationRequest): Promise<IdeaGenerationResponse> {
  console.log(`Generating ideas for: ${request.companyAnalysis.title}`);

  return await generateContentIdeas(request);
}