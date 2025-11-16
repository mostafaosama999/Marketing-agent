import * as functions from "firebase-functions";
import OpenAI from "openai";
import {logApiCost, calculateCost} from "../utils/costTracker";

/**
 * Find Competitors Cloud Function
 * Uses OpenAI to identify 5 competitors in the content writing/creation space
 * that match the company's profile and ICP criteria
 */

export interface FindCompetitorsRequest {
  companyId: string;
  companyName: string;
  website?: string;
  description?: string;
  industry?: string;
}

export interface Competitor {
  name: string;
  website: string;
  description: string;
  companySize: string;
  whyCompetitor: string;
}

export interface FindCompetitorsResponse {
  competitors: Competitor[];
  companyName: string;
  analysisComplete: boolean;
  costInfo?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
    model: string;
  };
}

/**
 * Build the system and user prompts for competitor analysis
 */
function buildCompetitorPrompt(
  companyName: string,
  website: string,
  description: string,
  industry: string
): { systemPrompt: string; userPrompt: string } {
  const systemPrompt = `You are a competitive intelligence analyst specializing in B2B SaaS and technology markets.

Your expertise includes:
- Identifying companies with similar business models and target markets
- Understanding competitive positioning and market overlap
- Analyzing company profiles to find direct and indirect competitors
- Evaluating product/service similarity and go-to-market strategies

Focus on companies that:
✅ Serve similar customer segments and market niches
✅ Are of similar size/stage (prefer 50-1000 employees, but be flexible based on context)
✅ Offer similar products, services, or solve similar customer problems
✅ Target similar markets (B2B, enterprise, SMB, developers, etc.)
✅ Are active, for-profit companies with established business models

Exclude companies that:
❌ Are open source foundations (unless they compete commercially)
❌ Are very large enterprises (>5000 employees) unless highly relevant
❌ Operate in completely different industries or markets
❌ Are defunct or no longer operating
❌ Are freelance marketplaces or job platforms (unless that's the target company's model)

Provide factual, research-based insights about competitive overlap.`;

  const userPrompt = `Analyze the following company and identify 5 direct competitors:

**Company to Analyze:**
- Name: ${companyName}
- Website: ${website || "Not provided"}
- Description: ${description || "Not provided"}
- Industry: ${industry || "Not provided"}

**Your Task:**
Find 5 competitors that:
1. Serve similar customers or market segments
2. Offer similar products/services or solve similar problems
3. Are of similar company size and business model
4. Have clear competitive overlap with the target company

Base your analysis on the company's actual business model, target market, and product/service offering as described above. Let the company context guide your search naturally.

For each competitor, provide:
1. **name**: Company name
2. **website**: Full website URL
3. **description**: 2-3 sentence description of what they do
4. **companySize**: Estimate (e.g., "50-100 employees", "100-250 employees", "500-1000 employees")
5. **whyCompetitor**: Clear explanation of why this is a competitor (overlap in target market, product category, business model, or customer segment)

Return ONLY a JSON object in this exact format:
{
  "competitors": [
    {
      "name": "Company Name",
      "website": "https://example.com",
      "description": "Brief description of the company and their services",
      "companySize": "50-100 employees",
      "whyCompetitor": "Clear explanation of competitive overlap"
    }
  ]
}

IMPORTANT:
- Return ONLY the JSON object, no additional text or markdown
- Find exactly 5 competitors
- Ensure all competitors are real, active companies
- Base competitive overlap on the company's actual industry and business model
- Prioritize companies with similar size, stage, and target market`;

  return {systemPrompt, userPrompt};
}

/**
 * Cloud Function: Find Competitors V2
 */
export const findCompetitorsV2 = functions
  .runWith({
    timeoutSeconds: 120,
    memory: "512MB",
  })
  .https.onCall(
    async (
      data: FindCompetitorsRequest,
      context
    ): Promise<FindCompetitorsResponse> => {
      console.log("=== findCompetitorsV2 Function Invoked ===");
      console.log("Timestamp:", new Date().toISOString());
      console.log("Authentication present:", !!context.auth);
      console.log("User ID:", context.auth?.uid || "NONE");
      console.log("Request data:", JSON.stringify(data, null, 2));

      // Verify authentication
      if (!context.auth) {
        console.error("AUTHENTICATION FAILED - No auth context");
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated to find competitors"
        );
      }

      console.log("Authentication verified for user:", context.auth.uid);

      // Validate input
      const {companyId, companyName, website, description, industry} = data;
      console.log("Validating input parameters...");

      if (!companyId || typeof companyId !== "string") {
        console.error("VALIDATION FAILED - Invalid company ID:", companyId);
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Company ID is required and must be a string"
        );
      }

      if (!companyName || typeof companyName !== "string") {
        console.error("VALIDATION FAILED - Invalid company name:", companyName);
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Company name is required and must be a string"
        );
      }

      console.log("Input validation passed");

      // Get OpenAI API key from environment config
      console.log("Retrieving OpenAI API key from config...");
      const openaiApiKey =
      functions.config().openai?.key || process.env.OPENAI_API_KEY;

      if (!openaiApiKey) {
        console.error("OPENAI API KEY NOT FOUND - Check firebase config");
        console.error("functions.config().openai:", functions.config().openai);
        console.error("process.env.OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "SET" : "NOT SET");
        throw new functions.https.HttpsError(
          "failed-precondition",
          "OpenAI API key not configured"
        );
      }

      console.log("OpenAI API key found, length:", openaiApiKey.length);

      try {
        console.log(`Finding competitors for company: ${companyName} (${companyId})`);
        console.log(`User: ${context.auth.uid}`);
        console.log("Additional context - Website:", website || "N/A");
        console.log("Additional context - Industry:", industry || "N/A");
        console.log("Additional context - Description:", description ? description.substring(0, 100) + "..." : "N/A");

      console.log("Initializing OpenAI client...");
      const openai = new OpenAI({apiKey: openaiApiKey});
      console.log("OpenAI client initialized successfully");

      // Build the prompts
      console.log("Building competitor analysis prompts...");
      const {systemPrompt, userPrompt} = buildCompetitorPrompt(
        companyName,
        website || "",
        description || "",
        industry || ""
      );
      console.log("Prompts built - System prompt length:", systemPrompt.length);
      console.log("Prompts built - User prompt length:", userPrompt.length);

      console.log("Calling OpenAI API (gpt-4-turbo-preview)...");

      // Call OpenAI
      const startTime = Date.now();
      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {role: "system", content: systemPrompt},
          {role: "user", content: userPrompt},
        ],
        temperature: 0.7,
        max_tokens: 3000,
      });
      const endTime = Date.now();
      console.log(`OpenAI API call completed in ${endTime - startTime}ms`);

      const responseContent = completion.choices[0]?.message?.content;

      if (!responseContent) {
        console.error("OPENAI RESPONSE EMPTY - No content in completion");
        console.error("Completion object:", JSON.stringify(completion, null, 2));
        throw new Error("Empty response from OpenAI");
      }

      console.log("Received response from OpenAI");
      console.log("Response length:", responseContent.length);
      console.log("Response preview:", responseContent.substring(0, 200));
      console.log("Parsing JSON response...");

      // Parse the JSON response
      let parsedResponse: { competitors: Competitor[] };
      try {
        // Remove markdown code blocks if present
        const cleanedResponse = responseContent
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        console.log("Cleaned response preview:", cleanedResponse.substring(0, 200));
        parsedResponse = JSON.parse(cleanedResponse);
        console.log("JSON parsing successful");
      } catch (parseError) {
        console.error("JSON PARSING FAILED:", parseError);
        console.error("Parse error details:", (parseError as Error).message);
        console.error("Raw response (first 500 chars):", responseContent.substring(0, 500));
        console.error("Raw response (last 200 chars):", responseContent.substring(Math.max(0, responseContent.length - 200)));
        throw new Error("Invalid JSON response from OpenAI");
      }

      // Validate response structure
      console.log("Validating response structure...");
      if (!parsedResponse.competitors || !Array.isArray(parsedResponse.competitors)) {
        console.error("VALIDATION FAILED - Missing or invalid 'competitors' array");
        console.error("Parsed response keys:", Object.keys(parsedResponse));
        throw new Error("Response missing 'competitors' array");
      }

      console.log(`Successfully found ${parsedResponse.competitors.length} competitors`);
      console.log("Competitor names:", parsedResponse.competitors.map((c) => c.name).join(", "));

      // Calculate cost
      const usage = completion.usage;
      const costInfo = usage ?
        calculateCost(
          {
            inputTokens: usage.prompt_tokens,
            outputTokens: usage.completion_tokens,
            totalTokens: usage.total_tokens,
          },
          "gpt-4-turbo-preview"
        ) :
        {
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          inputCost: 0,
          outputCost: 0,
          totalCost: 0,
          model: "gpt-4-turbo-preview",
        };

      console.log(`Cost: $${costInfo.totalCost.toFixed(4)} (${costInfo.totalTokens} tokens)`);

      // Log API cost
      console.log("Logging API cost to Firestore...");
      await logApiCost(
        context.auth.uid,
        "competitor-search",
        costInfo,
        {
          companyName,
          website: website || "",
          operationDetails: {
            companyId,
            competitorsFound: parsedResponse.competitors.length,
          },
        }
      );
      console.log("API cost logged successfully");

      // Return the response (no Firestore updates - just finding competitors for now)
      console.log("Preparing response object...");
      const response = {
        competitors: parsedResponse.competitors,
        companyName,
        analysisComplete: true,
        costInfo,
      };
      console.log("=== findCompetitors Function Completed Successfully ===");
      console.log("Total execution time:", Date.now() - startTime, "ms");
      return response;
    } catch (error: any) {
      console.error("=== ERROR in findCompetitors ===");
      console.error("Error type:", error.constructor.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      console.error("Error details:", JSON.stringify(error, null, 2));

      // Provide more specific error messages
      if (error.message?.includes("API key")) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "OpenAI API key is invalid or not configured"
        );
      }

      if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
        throw new functions.https.HttpsError(
          "resource-exhausted",
          "OpenAI API rate limit reached. Please try again later."
        );
      }

      throw new functions.https.HttpsError(
        "internal",
        `Failed to find competitors: ${error.message || "Unknown error"}`
      );
    }
  }
);
