/**
 * AI Concept Extraction Service
 *
 * Uses LLM to extract AI CONCEPTS (not news) from raw signals.
 * Key insight: We want concepts like "Agentic AI", "RAG", "MCP" -
 * not just news articles about these topics.
 */

import OpenAI from "openai";
import { RawSignal, AIConcept, ConceptExtractionResult } from "./types";
import { fetchAllSignals, deduplicateSignals } from "./fetchSignals";
import {
  extractTokenUsage,
  calculateCost,
  CostInfo,
} from "../../utils/costTracker";

/**
 * Prompt for extracting AI concepts from raw signals
 */
const CONCEPT_EXTRACTION_PROMPT = `You are an AI trends analyst. Analyze these recent AI news/papers and extract the TOP 10 distinct AI CONCEPTS that are currently hot or gaining traction.

IMPORTANT: Extract CONCEPTS, not news articles. Focus on:
- Paradigms (Agentic AI, Multimodal AI)
- Techniques (RAG, Fine-tuning, RLHF, Prompt Engineering)
- Protocols (MCP - Model Context Protocol, A2A)
- Architectures (Mixture of Experts, Transformers)
- Tools/Frameworks (LangChain, LlamaIndex, CrewAI)

NOT acceptable outputs:
- Specific company announcements ("OpenAI releases GPT-5")
- Product launches ("Claude 3.5 Sonnet")
- General news ("AI regulation in EU")

For each concept, provide:
1. name: Short memorable name (2-4 words max)
2. description: 1-2 sentence explanation of what it IS
3. whyHot: Why is this trending NOW? What's driving interest?
4. useCases: 3-4 practical applications
5. keywords: Technical terms associated with it (for matching to company tech stacks)
6. category: paradigm | technique | protocol | architecture | tool
7. hypeLevel: emerging | peak | maturing | declining

RULES:
- Focus on CONCEPTS that are actionable for B2B companies
- Avoid outdated concepts (check if signals suggest declining interest)
- Concepts should be specific enough to write tutorials about
- Each concept should be distinct (no duplicates like "AI Agents" and "Agentic AI")

RAW SIGNALS:
{signals}

Return ONLY valid JSON with this structure:
{
  "concepts": [
    {
      "name": "string",
      "description": "string",
      "whyHot": "string",
      "useCases": ["string", "string", "string"],
      "keywords": ["string", "string"],
      "category": "paradigm" | "technique" | "protocol" | "architecture" | "tool",
      "hypeLevel": "emerging" | "peak" | "maturing" | "declining"
    }
  ]
}`;

/**
 * Extract AI concepts from raw signals using LLM
 */
export async function extractConceptsFromSignals(
  openai: OpenAI,
  signals: RawSignal[]
): Promise<{ concepts: AIConcept[]; costInfo: CostInfo }> {
  // Format signals for the prompt
  const signalsText = signals
    .slice(0, 40) // Limit to avoid token overflow
    .map(
      (s, i) =>
        `${i + 1}. [${s.source}] ${s.title}\n   ${s.summary}`
    )
    .join("\n\n");

  const prompt = CONCEPT_EXTRACTION_PROMPT.replace("{signals}", signalsText);

  console.log(`[extractConcepts] Extracting concepts from ${signals.length} signals...`);

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Cheaper model is sufficient for extraction
    response_format: { type: "json_object" },
    temperature: 0.3, // Lower temperature for consistent extraction
    max_tokens: 3000,
    messages: [
      {
        role: "system",
        content:
          "You are an AI trends analyst. Extract distinct AI concepts from news signals. Output only valid JSON.",
      },
      { role: "user", content: prompt },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Failed to extract concepts from signals");
  }

  // Parse response
  const result: { concepts: Omit<AIConcept, "id" | "lastUpdated">[] } = JSON.parse(
    content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  );

  // Add IDs and timestamps
  const concepts: AIConcept[] = result.concepts.map((concept, index) => ({
    ...concept,
    id: `concept_${Date.now()}_${index}`,
    lastUpdated: new Date(),
  }));

  // Calculate cost
  const tokens = extractTokenUsage(completion);
  const costInfo: CostInfo = tokens
    ? calculateCost(tokens, "gpt-4o-mini")
    : {
        totalCost: 0,
        inputCost: 0,
        outputCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        model: "gpt-4o-mini",
      };

  console.log(
    `[extractConcepts] Extracted ${concepts.length} concepts, cost: $${costInfo.totalCost.toFixed(4)}`
  );

  return { concepts, costInfo };
}

/**
 * Fetch signals and extract concepts in one call
 */
export async function fetchAndExtractConcepts(
  openai: OpenAI
): Promise<ConceptExtractionResult> {
  // Step 1: Fetch raw signals from all sources
  const rawSignals = await fetchAllSignals();

  // Step 2: Deduplicate
  const dedupedSignals = deduplicateSignals(rawSignals);

  // Step 3: Extract concepts using LLM
  const { concepts, costInfo } = await extractConceptsFromSignals(
    openai,
    dedupedSignals
  );

  return {
    concepts,
    rawSignalCount: rawSignals.length,
    extractionCost: costInfo.totalCost,
    cached: false,
  };
}

/**
 * Get concepts by category
 */
export function filterConceptsByCategory(
  concepts: AIConcept[],
  categories: AIConcept["category"][]
): AIConcept[] {
  return concepts.filter((c) => categories.includes(c.category));
}

/**
 * Get concepts by hype level
 */
export function filterConceptsByHype(
  concepts: AIConcept[],
  levels: AIConcept["hypeLevel"][]
): AIConcept[] {
  return concepts.filter((c) => levels.includes(c.hypeLevel));
}

/**
 * Get top N concepts (already sorted by importance from LLM)
 */
export function getTopConcepts(concepts: AIConcept[], n: number = 10): AIConcept[] {
  // Prioritize peak and emerging over maturing/declining
  const priorityOrder: Record<AIConcept["hypeLevel"], number> = {
    peak: 0,
    emerging: 1,
    maturing: 2,
    declining: 3,
  };

  return [...concepts]
    .sort((a, b) => priorityOrder[a.hypeLevel] - priorityOrder[b.hypeLevel])
    .slice(0, n);
}
