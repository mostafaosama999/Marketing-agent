/**
 * Blog Audit Agent - ReAct Loop
 *
 * True agentic pipeline using OpenAI function calling.
 * The agent iteratively reasons → acts → observes until it has
 * enough data to produce a competitive blog audit.
 *
 * Budget safeguards: max 15 iterations, $3 cost cap.
 */

import OpenAI from "openai";
import {
  CompanyContext,
  AgentFinalOutput,
  BlogAuditResponse,
  BlogAuditCostInfo,
} from "./types";
import {browseBlog, browseBlogToolDefinition} from "./tools/browseBlog";
import {scrapePage, scrapePageToolDefinition} from "./tools/scrapePage";
import {BLOG_AUDIT_SYSTEM_PROMPT, buildUserPrompt} from "./prompts/agentSystemPrompt";
import {extractTokenUsage, calculateCost, CostInfo} from "../utils/costTracker";

const MAX_ITERATIONS = 15;
const MAX_COST_DOLLARS = 3.0;
const MODEL = "gpt-4-turbo";

const TOOLS: OpenAI.ChatCompletionTool[] = [
  browseBlogToolDefinition,
  scrapePageToolDefinition,
];

/**
 * Execute a tool call from the agent
 */
async function executeTool(
  name: string,
  args: Record<string, any>
): Promise<string> {
  try {
    switch (name) {
    case "browse_blog": {
      const result = await browseBlog(args.url);
      return JSON.stringify(result);
    }
    case "scrape_page": {
      const result = await scrapePage(args.url);
      return JSON.stringify(result);
    }
    default:
      return JSON.stringify({error: `Unknown tool: ${name}`});
    }
  } catch (error: any) {
    return JSON.stringify({error: error.message || "Tool execution failed"});
  }
}

/**
 * Clean JSON from agent response (strip markdown fences if present)
 */
function cleanJsonResponse(content: string): string {
  return content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

/**
 * Parse the agent's final output
 */
function parseFinalOutput(content: string): AgentFinalOutput {
  const cleaned = cleanJsonResponse(content);
  const parsed = JSON.parse(cleaned);

  // Validate required fields
  if (!parsed.offerParagraph || typeof parsed.offerParagraph !== "string") {
    throw new Error("Missing or invalid offerParagraph in agent output");
  }
  if (!parsed.internalJustification || typeof parsed.internalJustification !== "string") {
    throw new Error("Missing or invalid internalJustification in agent output");
  }
  if (!parsed.companyBlogSnapshot) {
    throw new Error("Missing companyBlogSnapshot in agent output");
  }

  return {
    offerParagraph: parsed.offerParagraph,
    internalJustification: parsed.internalJustification,
    companyBlogSnapshot: {
      blogUrl: parsed.companyBlogSnapshot.blogUrl || "",
      postsPerMonth: parsed.companyBlogSnapshot.postsPerMonth || 0,
      recentTopics: parsed.companyBlogSnapshot.recentTopics || [],
      contentTypes: parsed.companyBlogSnapshot.contentTypes || [],
      recentPosts: (parsed.companyBlogSnapshot.recentPosts || []).map((p: any) => ({
        title: p.title || "",
        date: p.date || "",
        url: p.url || undefined,
      })),
    },
    competitorSnapshots: (parsed.competitorSnapshots || []).map((c: any) => ({
      companyName: c.companyName || "",
      blogUrl: c.blogUrl || "",
      postsPerMonth: c.postsPerMonth || 0,
      recentTopics: c.recentTopics || [],
      notableStrengths: c.notableStrengths || "",
    })),
  };
}

/**
 * Run the Blog Audit ReAct Agent
 *
 * Returns a full BlogAuditResponse with offer paragraph,
 * internal justification, snapshots, and cost tracking.
 */
export async function runBlogAuditAgent(
  openai: OpenAI,
  context: CompanyContext
): Promise<BlogAuditResponse> {
  console.log(`[BlogAudit] Starting agent for: ${context.companyName}`);

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    {role: "system", content: BLOG_AUDIT_SYSTEM_PROMPT},
    {role: "user", content: buildUserPrompt(context)},
  ];

  const iterationCosts: number[] = [];
  let totalCost = 0;
  let totalTokens = 0;
  let toolCallsCount = 0;

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    console.log(`[BlogAudit] Iteration ${iteration + 1}/${MAX_ITERATIONS}`);

    // Budget check
    if (totalCost >= MAX_COST_DOLLARS) {
      console.warn(`[BlogAudit] Budget exceeded ($${totalCost.toFixed(4)} >= $${MAX_COST_DOLLARS}). Forcing completion.`);
      break;
    }

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages,
      tools: TOOLS,
      tool_choice: "auto",
      temperature: 0.3,
      max_tokens: 4000,
    });

    // Track cost for this iteration
    const tokens = extractTokenUsage(completion);
    const iterCost: CostInfo = tokens
      ? calculateCost(tokens, MODEL)
      : {totalCost: 0, inputCost: 0, outputCost: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, model: MODEL};

    iterationCosts.push(iterCost.totalCost);
    totalCost += iterCost.totalCost;
    totalTokens += iterCost.totalTokens;

    const choice = completion.choices[0];
    if (!choice) {
      throw new Error("No response from OpenAI");
    }

    const message = choice.message;

    // Add assistant message to conversation
    messages.push(message);

    // Check if agent wants to call tools
    if (message.tool_calls && message.tool_calls.length > 0) {
      console.log(`[BlogAudit] Agent requesting ${message.tool_calls.length} tool call(s)`);

      for (const toolCall of message.tool_calls) {
        const fnName = toolCall.function.name;
        let fnArgs: Record<string, any>;

        try {
          fnArgs = JSON.parse(toolCall.function.arguments);
        } catch {
          fnArgs = {};
        }

        console.log(`[BlogAudit] Executing tool: ${fnName}(${JSON.stringify(fnArgs)})`);
        toolCallsCount++;

        const result = await executeTool(fnName, fnArgs);

        // Add tool result to conversation
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: result,
        });
      }

      continue; // Next iteration - let agent process tool results
    }

    // No tool calls - agent produced final answer
    if (choice.finish_reason === "stop" && message.content) {
      console.log(`[BlogAudit] Agent produced final answer at iteration ${iteration + 1}`);

      try {
        const output = parseFinalOutput(message.content);

        const costInfo: BlogAuditCostInfo = {
          totalCost,
          totalTokens,
          iterationCosts,
        };

        return {
          success: true,
          offerParagraph: output.offerParagraph,
          internalJustification: output.internalJustification,
          companyBlogSnapshot: output.companyBlogSnapshot,
          competitorSnapshots: output.competitorSnapshots,
          competitorsAnalyzed: output.competitorSnapshots.length,
          agentIterations: iteration + 1,
          toolCallsCount,
          costInfo,
          generatedAt: new Date().toISOString(),
          model: MODEL,
        };
      } catch (parseError: any) {
        console.error(`[BlogAudit] Failed to parse agent output: ${parseError.message}`);

        // If we still have iterations left, ask agent to fix its output
        if (iteration < MAX_ITERATIONS - 1) {
          messages.push({
            role: "user",
            content: `Your response could not be parsed as valid JSON. Error: ${parseError.message}. Please respond with ONLY a valid JSON object matching the required format, with no markdown code fences.`,
          });
          continue;
        }

        throw new Error(`Agent output parsing failed: ${parseError.message}`);
      }
    }
  }

  // Max iterations reached without final answer
  console.warn(`[BlogAudit] Max iterations (${MAX_ITERATIONS}) reached`);

  return {
    success: false,
    offerParagraph: "",
    internalJustification: "Agent reached maximum iterations without producing a final output.",
    companyBlogSnapshot: {
      blogUrl: context.website,
      postsPerMonth: 0,
      recentTopics: [],
      contentTypes: [],
      recentPosts: [],
    },
    competitorSnapshots: [],
    competitorsAnalyzed: 0,
    agentIterations: MAX_ITERATIONS,
    toolCallsCount,
    costInfo: {
      totalCost,
      totalTokens,
      iterationCosts,
    },
    generatedAt: new Date().toISOString(),
    model: MODEL,
  };
}
