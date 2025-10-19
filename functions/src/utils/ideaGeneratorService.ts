import OpenAI from "openai";
import {GeneratedIdea, CustomIdeaRequest, ApiCostInfo} from "../types";
import {calculateCost} from "./costTracker";

/**
 * Generate content collaboration ideas using OpenAI based on user's custom prompt
 */
export async function generateCustomIdeas(
  request: CustomIdeaRequest,
  apiKey: string
): Promise<{ ideas: GeneratedIdea[]; costInfo: ApiCostInfo }> {
  const openai = new OpenAI({apiKey});

  // Build context string from optional context data
  let contextString = "";
  if (request.context) {
    const {companyName, website, industry, blogUrl} = request.context;
    contextString = `
Company Context:
${companyName ? `- Company Name: ${companyName}` : ""}
${website ? `- Website: ${website}` : ""}
${industry ? `- Industry: ${industry}` : ""}
${blogUrl ? `- Blog URL: ${blogUrl}` : ""}
`.trim();
  }

  // System prompt to ensure structured JSON output
  const systemPrompt = `You are an expert content strategist specializing in content collaboration and partnership opportunities.

Your task is to generate 5-10 actionable content collaboration ideas based on the user's prompt and company context.

IMPORTANT: You must respond with ONLY a valid JSON array. No additional text, explanations, or markdown formatting.

Each idea should be an object with this exact structure:
{
  "title": "Brief title (5-10 words)",
  "content": "Detailed description of the idea (2-4 sentences explaining the concept, value proposition, and execution approach)"
}

Example response format:
[
  {
    "title": "Guest Post Series on AI Infrastructure",
    "content": "Propose a 3-part guest post series exploring AI infrastructure best practices. Each post would feature technical deep-dives with code examples, targeting their developer audience. This positions us as thought leaders while providing high-value content to their readers."
  },
  {
    "title": "Co-Hosted Webinar on MLOps",
    "content": "Partner on a live technical webinar covering MLOps implementation strategies. We provide the expertise and speakers, they provide the platform and audience. Include a Q&A session and follow-up blog post summarizing key takeaways."
  }
]`;

  // User prompt combines their custom prompt with context
  const userPrompt = `${contextString ? contextString + "\n\n" : ""}${request.prompt}`;

  console.log("Generating ideas with OpenAI...");
  console.log("User prompt:", userPrompt.substring(0, 200) + "...");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {role: "system", content: systemPrompt},
        {role: "user", content: userPrompt},
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: {type: "json_object"}, // Force JSON response
    });

    const responseContent = completion.choices[0]?.message?.content;

    if (!responseContent) {
      throw new Error("Empty response from OpenAI");
    }

    console.log("Raw OpenAI response:", responseContent.substring(0, 200) + "...");

    // Parse the JSON response
    let parsedResponse: any;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      console.error("Failed to parse OpenAI response as JSON:", parseError);
      throw new Error("Invalid JSON response from OpenAI");
    }

    // Handle different possible response structures
    let ideasArray: Array<{title?: string; content: string}> = [];

    if (Array.isArray(parsedResponse)) {
      ideasArray = parsedResponse;
    } else if (parsedResponse.ideas && Array.isArray(parsedResponse.ideas)) {
      ideasArray = parsedResponse.ideas;
    } else if (typeof parsedResponse === "object") {
      // If it's an object with numbered keys, extract values
      ideasArray = Object.values(parsedResponse);
    } else {
      throw new Error("Unexpected response structure from OpenAI");
    }

    if (ideasArray.length === 0) {
      throw new Error("No ideas generated");
    }

    // Convert to GeneratedIdea format
    const ideas: GeneratedIdea[] = ideasArray.map((idea, index) => ({
      id: `idea-${Date.now()}-${index}`, // Temporary ID, will be replaced by Firestore
      title: idea.title || `Idea ${index + 1}`,
      content: idea.content || JSON.stringify(idea),
      status: "pending" as const,
      createdAt: new Date(),
      prompt: request.prompt,
    }));

    console.log(`Successfully generated ${ideas.length} ideas`);

    // Extract cost information
    const usage = completion.usage;
    const costInfo: ApiCostInfo = usage ? calculateCost(
      {
        inputTokens: usage.prompt_tokens,
        outputTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
      },
      "gpt-4-turbo-preview"
    ) : {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: 0,
      model: "gpt-4-turbo-preview",
    };

    return {ideas, costInfo};
  } catch (error: any) {
    console.error("Error generating ideas with OpenAI:", error);
    throw new Error(`Failed to generate ideas: ${error.message}`);
  }
}
