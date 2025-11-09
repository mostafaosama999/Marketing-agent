import * as functions from "firebase-functions";
import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import {WritingProgramAnalysisResult} from "../types";
import {extractTokenUsage, calculateCost, CostInfo} from "../utils/costTracker";
import {logApiCost} from "../utils/costTracker";

// Lazy-initialize OpenAI
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: functions.config().openai?.key || process.env.OPENAI_API_KEY || "",
    });
  }
  return openaiInstance;
}

/**
 * Scrape writing program page content
 */
async function scrapeWritingProgramPage(url: string): Promise<{
  content: string;
  headings: string[];
  lists: string[];
  pageTitle: string;
}> {
  try {
    const response = await axios.get(url, {
      timeout: 15000,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });

    const $ = cheerio.load(response.data);

    // Remove unwanted elements
    $("script, style, nav, header, footer").remove();

    // Extract page title
    const pageTitle = $("title").text().trim() || $("h1").first().text().trim();

    // Extract headings
    const headings: string[] = [];
    $("h1, h2, h3, h4").each((_, element) => {
      const heading = $(element).text().trim();
      if (heading) {
        headings.push(heading);
      }
    });

    // Extract lists (often contain requirements)
    const lists: string[] = [];
    $("ul, ol").each((_, element) => {
      const listItems: string[] = [];
      $(element).find("li").each((_, li) => {
        const item = $(li).text().trim();
        if (item) {
          listItems.push(item);
        }
      });
      if (listItems.length > 0) {
        lists.push(listItems.join("\n"));
      }
    });

    // Extract main content
    let content = $("body").text().trim();
    // Clean and limit content
    content = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join(" ")
      .substring(0, 16000); // Limit to 16k chars for AI (increased for better context)

    return {
      content,
      headings: headings.slice(0, 30),
      lists: lists.slice(0, 10),
      pageTitle,
    };
  } catch (error) {
    console.error(`Failed to scrape writing program page:`, error);
    throw new Error(`Failed to fetch program page: ${error}`);
  }
}

/**
 * Use AI to analyze writing program details
 */
async function analyzeWithAI(
  url: string,
  pageData: {
    content: string;
    headings: string[];
    lists: string[];
    pageTitle: string;
  }
): Promise<{
  analysis: any;
  costInfo: CostInfo | null;
}> {
  try {
    const prompt = `
Analyze the following writing/contributor/guest author program page and extract detailed information.

Program URL: ${url}
Page Title: ${pageData.pageTitle}

Headings found on the page:
${pageData.headings.join("\n")}

Lists/Requirements found:
${pageData.lists.join("\n\n")}

Page content:
${pageData.content}

Based on this information, extract the following details about the writing program:

1. **Status**: Is the program currently open or closed for submissions?
2. **Open Dates**: If there are specific dates when submissions open/close
3. **Payment**: CRITICAL - Look very carefully for payment information in ALL sections:
   - Check hero sections, highlighted text, headings, and lists
   - Payment amounts can be formatted as: "$200", "$200 USD", "200 dollars", "€200", "£200"
   - Examples: "$200 USD, paid in local gift cards" → paymentAmount="$200 USD", paymentMethod="gift cards"
   - Examples: "Contributors will be awarded with $200 USD" → paymentAmount="$200 USD", paymentMethod="direct payment"
   - If you see ANY dollar amount, extract it even if it's in plain text
   - IMPORTANT: If no exact amount found, extract ANY compensation language you find:
     - "compensated at a competitive rate" → paymentDetails
     - "payment upon publication" → paymentDetails
     - "exact amount to be specified" → paymentDetails
     - "paid for contributions" → paymentDetails
   - Always capture the original text snippet (max ~200 chars) where payment info was found as proof
4. **Requirement Classification**: Classify what's required into these categories (select all that apply):
   - "Idea" - Just need an idea/pitch
   - "Case study" - Need a case study or project writeup
   - "Keyword analysis" - Need keyword research
   - "Outline" - Need article outline before full submission
   - "Free article" - Need full article upfront with no guarantee of payment
   - "Questionnaire" - Need to fill out questionnaire
   - "Email" - Need to email for permission
   - "Introduction" - Need introduction section
   - "Pitch" - Need to pitch idea first
   - "Join Slack/Discord" - Need to join community first
   - "Zoom Call" - Need video call interview
   - "Apply for Jobs" - Need to apply formally
   - "Article Summary" - Need summary/abstract
5. **Requirements**: List all specific requirements (technical topics, word count, style, format, etc.)
6. **Submission Guidelines**: Detailed how-to-submit instructions, format requirements, process
7. **Contact**: Email or contact method for submissions
8. **Response Time**: How long does it take to hear back?
9. **Publication Date**: When was this writing program published or created?
   - Look for text like "Published on [date]", "Last updated [date]", "Posted [date]"
   - Check meta tags, timestamps, or date indicators near the program announcement
   - Common formats: "July 20, 2021", "2021-07-20", "20 Jul 2021", etc.
   - Extract the original date string exactly as found on the page
   - Note where you found it (e.g., "article header", "meta tag", "hero section")
10. **Overall Details**: A comprehensive summary of the entire program

Return your response as a JSON object with this structure:
{
  "isOpen": true | false | null,
  "openDates": {
    "openFrom": "date or period",
    "closedFrom": "date or period"
  } | null,
  "paymentAmount": "$XXX" | "$XXX USD" | "€XXX" | null,
  "paymentMethod": "gift cards" | "direct payment" | "PayPal" | "Stripe" | "check" | null,
  "paymentDetails": "any compensation text if no exact amount" | null,
  "paymentSourceSnippet": "original text where payment info found (max ~200 chars)" | null,
  "historicalPayment": "$XXX (previously)" | null,
  "requirements": ["requirement 1", "requirement 2", ...],
  "requirementTypes": ["Idea", "Case study", ...],
  "submissionGuidelines": "how to submit...",
  "contactEmail": "email@example.com" | null,
  "responseTime": "X weeks" | null,
  "publishedDate": "date string as found on page" | null,
  "publishedDateSource": "where the date was found (e.g., 'article header', 'meta tag')" | null,
  "programDetails": "comprehensive summary of the entire program including all important details",
  "reasoning": "your analysis and confidence level"
}

IMPORTANT:
- Be extra thorough when looking for payment amounts - they are often highlighted or in hero sections
- Extract ALL payment-related text you find, even if it seems unclear
- For requirement types, analyze what writers need to provide and match to categories
- If information is not found, use null
- Only return valid JSON
`;

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert at analyzing writing program pages and extracting detailed information about submission requirements, payment, and guidelines. You carefully read program documentation to identify key details that writers need to know. Return only valid JSON.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.2, // Lower temperature for more focused, accurate results
      max_tokens: 2000, // Increased for more detailed requirement classification
    });

    // Track API cost
    let costInfo: CostInfo | null = null;
    const tokenUsage = extractTokenUsage(completion);
    if (tokenUsage) {
      costInfo = calculateCost(tokenUsage, "gpt-4");
      console.log(`💰 OpenAI cost: $${costInfo.totalCost.toFixed(4)} (${tokenUsage.totalTokens} tokens)`);
    }

    const responseText = completion.choices[0]?.message?.content;
    if (!responseText) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON response
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
      const analysis = JSON.parse(jsonStr);

      return {
        analysis,
        costInfo,
      };
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      console.error("AI response was:", responseText);
      throw new Error("Failed to parse AI analysis");
    }
  } catch (error) {
    console.error("AI analysis error:", error);
    throw error;
  }
}

/**
 * Cloud function to analyze a specific writing program URL in detail
 */
export const analyzeWritingProgramDetailsCloud = functions
  .runWith({
    timeoutSeconds: 300, // 5 minutes
    memory: "512MB",
  })
  .https.onCall(
    async (data, context): Promise<WritingProgramAnalysisResult> => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to analyze writing programs"
      );
    }

    // Validate input
    const {programUrl, leadId, companyId} = data;

    if (!programUrl || typeof programUrl !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Program URL is required and must be a string"
      );
    }

    try {
      console.log(`Analyzing writing program details for: ${programUrl}`);

      // 1. Scrape the program page
      const pageData = await scrapeWritingProgramPage(programUrl);
      console.log(`✓ Scraped page: ${pageData.pageTitle}`);

      // 2. Analyze with AI
      const {analysis, costInfo} = await analyzeWithAI(programUrl, pageData);
      console.log(`✓ AI analysis complete`);

      // 3. Regex fallback for payment if AI missed it
      let paymentAmount = analysis.paymentAmount || null;
      let paymentMethod = analysis.paymentMethod || null;
      let paymentDetails = analysis.paymentDetails || null;
      let paymentSourceSnippet = analysis.paymentSourceSnippet || null;

      if (!paymentAmount) {
        // Try to extract payment with regex as fallback
        const paymentRegex = /\$\s*(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)\s*(USD|usd|dollars?)?/i;
        const match = pageData.content.match(paymentRegex);
        if (match) {
          paymentAmount = match[2] ? `$${match[1]} ${match[2].toUpperCase()}` : `$${match[1]}`;
          console.log(`📊 Regex fallback found payment: ${paymentAmount}`);

          // Extract surrounding context as snippet
          const contextStart = Math.max(0, (match.index || 0) - 100);
          const contextEnd = Math.min(pageData.content.length, (match.index || 0) + 200);
          paymentSourceSnippet = pageData.content.substring(contextStart, contextEnd).trim();

          // Try to detect payment method from snippet
          const lowerSnippet = paymentSourceSnippet.toLowerCase();
          if (lowerSnippet.includes("gift card")) paymentMethod = "gift cards";
          else if (lowerSnippet.includes("paypal")) paymentMethod = "PayPal";
          else if (lowerSnippet.includes("direct deposit") || lowerSnippet.includes("bank transfer")) paymentMethod = "direct payment";
        } else {
          // No exact amount found, look for any compensation language
          const compensationRegex = /(compensate|payment|paid|pay|remuneration|compensation).{0,100}(competitive|upon publication|to be specified|per (article|post|contribution))/i;
          const compMatch = pageData.content.match(compensationRegex);
          if (compMatch) {
            const snippetStart = Math.max(0, (compMatch.index || 0) - 50);
            const snippetEnd = Math.min(pageData.content.length, (compMatch.index || 0) + 200);
            const fullSnippet = pageData.content.substring(snippetStart, snippetEnd).trim();
            paymentDetails = fullSnippet.length > 150 ? fullSnippet.substring(0, 150) + "..." : fullSnippet;
            console.log(`💡 Found compensation details (no exact amount): ${paymentDetails}`);
          }
        }
      }

      // 4. Build result with new nested payment structure
      const result: WritingProgramAnalysisResult = {
        programUrl,
        hasProgram: true, // If we got here, program exists
        isOpen: analysis.isOpen !== undefined ? analysis.isOpen : null,
        openDates: analysis.openDates || null,
        payment: {
          amount: paymentAmount,
          method: paymentMethod,
          details: paymentDetails,
          sourceSnippet: paymentSourceSnippet,
          historical: analysis.historicalPayment || null,
        },
        requirements: analysis.requirements || [],
        requirementTypes: analysis.requirementTypes || [],
        submissionGuidelines: analysis.submissionGuidelines || null,
        contactEmail: analysis.contactEmail || null,
        responseTime: analysis.responseTime || null,
        publishedDate: analysis.publishedDate || null,
        publishedDateSource: analysis.publishedDateSource || null,
        programDetails: analysis.programDetails || "",
        aiReasoning: analysis.reasoning || "Analysis completed",
        costInfo: costInfo || undefined,
      };

      // Log API cost if available
      if (costInfo && context.auth) {
        await logApiCost(
          context.auth.uid,
          "writing-program-analyzer",
          costInfo,
          {
            leadId,
            website: programUrl,
            operationDetails: {
              companyId,
              hasRequirements: (result.requirements?.length || 0) > 0,
              hasPayment: !!result.payment.amount,
              isOpen: result.isOpen,
            },
          }
        );
      }

      console.log(`✓ Analysis complete for ${programUrl}`);
      return result;
    } catch (error: any) {
      console.error("Error analyzing writing program details:", error);

      // Check if it's a timeout error
      if (error.code === "ETIMEDOUT" || error.code === "ESOCKETTIMEDOUT" ||
          error.message?.includes("timeout") || error.message?.includes("timed out")) {
        throw new functions.https.HttpsError(
          "deadline-exceeded",
          "Writing program analysis took too long to complete. The program page may be very large. Please try again."
        );
      }

      // Check if it's a network error
      if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED" ||
          error.message?.includes("socket hang up") || error.message?.includes("network")) {
        throw new functions.https.HttpsError(
          "unavailable",
          "Unable to reach the writing program page. The site may be down or blocking our requests. Please verify the URL and try again."
        );
      }

      // Generic error with helpful message
      throw new functions.https.HttpsError(
        "unknown",
        error.message || "Failed to analyze writing program. Please try again or contact support."
      );
    }
  }
);
