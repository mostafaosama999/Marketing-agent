/**
 * skillRunner — invokes a BDR skill via OpenAI Chat Completions with
 * structured outputs (json_schema) + function-calling for tool use.
 *
 * NOTE on Responses API: the implementation plan called for the Responses API.
 * We use Chat Completions instead because the OpenAI Node SDK Responses surface
 * is still evolving (v4.85+). Chat Completions delivers the same guarantees:
 *   - Structured outputs via response_format: {type:'json_schema', strict:true}
 *   - Function calling via tools[] + tool_choice:'auto'
 *   - Same model lineup (gpt-5, gpt-4.1-mini)
 *
 * Tool-use loop: max 25 iterations, hard 510s wall (Cloud Functions cap is 540).
 * Cost is computed from usage tokens × PRICING_PER_1M and recorded atomically
 * to nikolaState.mtdCostUsd via costGate.recordSkillCost.
 */
import * as admin from "firebase-admin";
import OpenAI from "openai";
import {v4 as uuidv4} from "uuid";

import {
  MODEL_FOR_SKILL,
  PRICING_PER_1M,
  SKILL_MAX_OUTPUT_TOKENS,
  SKILL_MAX_TOOL_ITERATIONS,
  SKILL_WALL_MS,
  openaiApiKey,
} from "./config";
import {assertCostBudget, recordSkillCost} from "./costGate";
import {buildSystemPrompt} from "./skillLoader";
import {SKILL_SCHEMAS} from "./skillSchemas";
import {executeTool, toolDefsForSkill} from "./tools";
import {SkillContext, SkillName, SkillResult, ToolCallContext} from "./types";

let _openai: OpenAI | null = null;
function client(): OpenAI {
  if (!_openai) _openai = new OpenAI({apiKey: openaiApiKey()});
  return _openai;
}

function userMessageFor(skill: SkillName, ctx: SkillContext): string {
  const parts: string[] = [];
  if (ctx.lead) {
    parts.push(`Lead: ${JSON.stringify(safeLead(ctx.lead), null, 2)}`);
  }
  if (ctx.company) {
    parts.push(`Company: ${JSON.stringify(safeCompany(ctx.company), null, 2)}`);
  }
  if (ctx.prospectInput) {
    parts.push(`Prospect input: ${ctx.prospectInput}`);
  }
  if (ctx.reply) {
    parts.push(`Reply received: ${ctx.reply}`);
  }
  if (ctx.mode) {
    parts.push(`Mode: ${ctx.mode}`);
  }
  if (ctx.focusArea) {
    parts.push(`Focus area: ${ctx.focusArea}`);
  }
  parts.push(`Run: ${skill}`);
  return parts.join("\n\n");
}

function safeLead(lead: SkillContext["lead"]) {
  if (!lead) return null;
  // Strip Firestore Timestamps (model doesn't need them) and large fields
  const {createdAt: _c, updatedAt: _u, ...rest} = lead;
  return rest;
}
function safeCompany(company: SkillContext["company"]) {
  return company || null;
}

function computeCostUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICING_PER_1M[model];
  if (!p) return 0;
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}

export async function runSkill(
  skill: SkillName,
  ctx: SkillContext
): Promise<SkillResult> {
  await assertCostBudget();

  const startedAt = Date.now();
  const wallDeadline = startedAt + SKILL_WALL_MS;
  const runId = uuidv4();
  const model = MODEL_FOR_SKILL[skill];
  const systemPrompt = await buildSystemPrompt(skill, ctx);
  const userPrompt = userMessageFor(skill, ctx);
  const tools = toolDefsForSkill(skill);
  const schema = SKILL_SCHEMAS[skill];

  const messages: Array<OpenAI.Chat.Completions.ChatCompletionMessageParam> = [
    {role: "system", content: systemPrompt},
    {role: "user", content: userPrompt},
  ];

  const toolCtx: ToolCallContext = {ctx, db: admin.firestore(), runId};
  let inputTokens = 0;
  let outputTokens = 0;
  let toolCallsUsed = 0;
  let iterations = 0;
  let parsed: Record<string, unknown> | null = null;
  let lastError: string | undefined;

  try {
    while (iterations < SKILL_MAX_TOOL_ITERATIONS) {
      if (Date.now() > wallDeadline) {
        throw new Error("Skill runner wall timeout");
      }
      iterations++;
      const completion = await client().chat.completions.create({
        model,
        messages,
        tools: tools.length > 0 ? (tools as never) : undefined,
        tool_choice: tools.length > 0 ? "auto" : undefined,
        response_format: {
          type: "json_schema",
          json_schema: schema,
        },
        max_completion_tokens: SKILL_MAX_OUTPUT_TOKENS,
      });

      inputTokens += completion.usage?.prompt_tokens || 0;
      outputTokens += completion.usage?.completion_tokens || 0;
      const choice = completion.choices[0];
      const msg = choice.message;

      if (msg.tool_calls && msg.tool_calls.length > 0) {
        // Append assistant message verbatim then execute each tool call
        messages.push(msg as OpenAI.Chat.Completions.ChatCompletionMessageParam);
        for (const toolCall of msg.tool_calls) {
          if (toolCall.type !== "function") continue;
          toolCallsUsed++;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(toolCall.function.arguments || "{}");
          } catch {
            args = {};
          }
          const result = await executeTool(toolCall.function.name, args, toolCtx);
          messages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: JSON.stringify(result).slice(0, 30_000),
          });
        }
        continue;
      }

      // Final response — content is a JSON string conforming to the schema
      const raw = msg.content || "{}";
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        lastError = `Failed to parse structured output as JSON: ${(e as Error).message}`;
        // Re-prompt once to retry parsing
        messages.push(msg as OpenAI.Chat.Completions.ChatCompletionMessageParam);
        messages.push({
          role: "user",
          content: "Your last response was not valid JSON. Please re-emit the same content as valid JSON conforming to the schema.",
        });
        continue;
      }
      break;
    }
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
  }

  const durationMs = Date.now() - startedAt;
  const costUsd = computeCostUsd(model, inputTokens, outputTokens);

  // Always record skill run + cost (even on failure)
  await admin.firestore().collection("nikolaSkillRuns").doc(runId).set({
    skill,
    ctx: {
      leadId: ctx.lead?.id,
      companyId: ctx.company?.id,
      mode: ctx.mode,
    },
    model,
    inputTokens,
    outputTokens,
    toolCallsUsed,
    durationMs,
    costUsd,
    error: lastError,
    createdAt: admin.firestore.Timestamp.now(),
  });
  await recordSkillCost(costUsd);

  if (!parsed) {
    throw new Error(
      `Skill ${skill} did not produce structured output. ` +
        `Iterations: ${iterations}/${SKILL_MAX_TOOL_ITERATIONS}. ` +
        `Tool calls: ${toolCallsUsed}. Last error: ${lastError || "(none)"}`
    );
  }

  return {
    body: typeof parsed.humanizedBody === "string"
      ? (parsed.humanizedBody as string)
      : typeof parsed.summary === "string"
        ? (parsed.summary as string)
        : undefined,
    variants: Array.isArray(parsed.variants) ? (parsed.variants as never) : undefined,
    rightContact: (parsed.rightContact as never) || undefined,
    icpScore: (parsed.icpScore as never) || undefined,
    contentIdea: (parsed.contentIdea as string) || undefined,
    cwpFlag: (parsed.cwpFlag as never) || undefined,
    metadata: parsed,
    toolCallsUsed,
    costUsd,
    inputTokens,
    outputTokens,
    model,
    durationMs,
  };
}
