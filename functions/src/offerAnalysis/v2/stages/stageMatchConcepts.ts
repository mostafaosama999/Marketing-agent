/**
 * V2 Stage 1.5: Match AI Concepts to Company
 *
 * This is the KEY innovation that prevents V1's "same concepts for everyone" problem.
 * Uses LLM to intelligently match trending AI concepts to company capabilities.
 *
 * IMPORTANT: Matching is STRICT. Most concepts won't match most companies.
 * This ensures ideas are genuinely relevant, not forced.
 */

import OpenAI from "openai";
import {
  AIConcept,
  MatchedConcept,
  ConceptMatchingResult,
} from "../../../services/aiConcepts/types";
import { CompanyProfile } from "../analyzeCompanyDifferentiators";
import {
  extractTokenUsage,
  calculateCost,
  CostInfo,
} from "../../../utils/costTracker";

/**
 * Prompt for matching AI concepts to company
 */
const CONCEPT_MATCHING_PROMPT = `You are evaluating which AI concepts are GENUINELY relevant to this company.

Your job is to be STRICT. Most concepts will NOT fit most companies. That's okay.

================================================================================
COMPANY PROFILE
================================================================================

Company: {companyName}
What they do: {oneLinerDescription}
Tech Stack: {techStack}
Target Audience: {targetAudience}
Key Differentiators:
{differentiators}

Content Style: {contentStyle}

================================================================================
AI CONCEPTS TO EVALUATE
================================================================================

{concepts}

================================================================================
MATCHING CRITERIA (Be STRICT!)
================================================================================

For each concept, evaluate:

1. RELEVANCE (Does this concept relate to what they do?)
   - Score 0-30 if they're in a completely different domain
   - Score 31-60 if there's loose connection
   - Score 61-80 if there's clear connection
   - Score 81-100 if it's core to their product/mission

2. PRODUCT INTEGRATION (Could their product use this?)
   - Can they build a tutorial showing their product WITH this concept?
   - "How to use [their product] for [this concept]" - does it make sense?

3. AUDIENCE INTEREST (Would their audience care?)
   - Is their target audience likely to search for this concept?
   - Would a blog about this attract their customers?

REJECTION SIGNALS (If any apply, fitScore should be < 70):
- The concept is unrelated to their industry
- Their product can't meaningfully integrate with the concept
- Their audience wouldn't search for or care about this topic
- The match feels forced or artificial

ONLY return concepts with fitScore >= 70.
It is VALID to return an empty array if no concepts match well.

================================================================================
OUTPUT FORMAT (JSON ONLY)
================================================================================

{
  "matchedConcepts": [
    {
      "conceptName": "Name of the matched concept",
      "fitScore": 75-100,
      "fitReason": "Why this concept genuinely fits this company (1-2 sentences)",
      "productIntegration": "How their product could be used with this concept",
      "tutorialAngle": "Suggested tutorial title: 'How to [outcome] with [Company Product] using [Concept]'"
    }
  ]
}

RESPOND WITH ONLY THE JSON OBJECT - no markdown, no code blocks, just valid JSON.`;

/**
 * Format concepts for the prompt
 */
function formatConcepts(concepts: AIConcept[]): string {
  return concepts
    .map(
      (c, i) =>
        `${i + 1}. ${c.name} (${c.category}, ${c.hypeLevel})
   ${c.description}
   Why Hot: ${c.whyHot}
   Keywords: ${c.keywords.join(", ")}`
    )
    .join("\n\n");
}

/**
 * Format differentiators for the prompt
 */
function formatDifferentiators(profile: CompanyProfile): string {
  return profile.uniqueDifferentiators
    .map((d) => `- ${d.claim} (${d.category})`)
    .join("\n");
}

/**
 * Match AI concepts to a company profile
 */
export async function matchConceptsToCompany(
  openai: OpenAI,
  concepts: AIConcept[],
  profile: CompanyProfile
): Promise<ConceptMatchingResult> {
  // Build the prompt with company and concept data
  const prompt = CONCEPT_MATCHING_PROMPT
    .replace("{companyName}", profile.companyName)
    .replace("{oneLinerDescription}", profile.oneLinerDescription)
    .replace("{techStack}", profile.techStack.join(", ") || "Not specified")
    .replace(
      "{targetAudience}",
      `${profile.targetAudience.primary} (${profile.targetAudience.sophisticationLevel})`
    )
    .replace("{differentiators}", formatDifferentiators(profile))
    .replace(
      "{contentStyle}",
      `${profile.contentStyle.tone}, ${profile.contentStyle.technicalDepth} technical depth`
    )
    .replace("{concepts}", formatConcepts(concepts));

  console.log(
    `[V2 Stage 1.5] Matching ${concepts.length} concepts to ${profile.companyName}...`
  );

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo", // Need good reasoning for matching
    response_format: { type: "json_object" },
    temperature: 0.3, // Low for consistent matching
    max_tokens: 2000,
    messages: [
      {
        role: "system",
        content:
          "You are a strict content strategy evaluator. You only recommend AI concepts that genuinely fit a company. You never force matches.",
      },
      { role: "user", content: prompt },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Failed to match concepts to company");
  }

  // Parse response
  interface RawMatch {
    conceptName: string;
    fitScore: number;
    fitReason: string;
    productIntegration: string;
    tutorialAngle: string;
  }

  const result: { matchedConcepts: RawMatch[] } = JSON.parse(
    content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()
  );

  // Map back to full concept objects and filter by score
  const matchedConcepts: MatchedConcept[] = result.matchedConcepts
    .filter((m) => m.fitScore >= 70)
    .map((m) => {
      // Find the original concept
      const concept = concepts.find(
        (c) => c.name.toLowerCase() === m.conceptName.toLowerCase()
      );

      if (!concept) {
        console.warn(`[V2 Stage 1.5] Concept not found: ${m.conceptName}`);
        return null;
      }

      return {
        concept,
        fitScore: m.fitScore,
        fitReason: m.fitReason,
        productIntegration: m.productIntegration,
        tutorialAngle: m.tutorialAngle,
      };
    })
    .filter((m): m is MatchedConcept => m !== null);

  // Sort by fit score descending
  matchedConcepts.sort((a, b) => b.fitScore - a.fitScore);

  // Calculate cost
  const tokens = extractTokenUsage(completion);
  const costInfo: CostInfo = tokens
    ? calculateCost(tokens, "gpt-4-turbo")
    : {
        totalCost: 0,
        inputCost: 0,
        outputCost: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        model: "gpt-4-turbo",
      };

  console.log(
    `[V2 Stage 1.5] Matched ${matchedConcepts.length}/${concepts.length} concepts ` +
      `(cost: $${costInfo.totalCost.toFixed(4)})`
  );

  if (matchedConcepts.length > 0) {
    console.log(
      `[V2 Stage 1.5] Top matches: ${matchedConcepts
        .slice(0, 3)
        .map((m) => `${m.concept.name} (${m.fitScore}%)`)
        .join(", ")}`
    );
  } else {
    console.log(`[V2 Stage 1.5] No concepts matched with score >= 70`);
  }

  return {
    matchedConcepts,
    totalConceptsEvaluated: concepts.length,
    matchingCost: costInfo.totalCost,
  };
}

/**
 * Quick check if any concepts might match (without full LLM call)
 * Uses keyword overlap as a heuristic
 */
export function prefilterConcepts(
  concepts: AIConcept[],
  profile: CompanyProfile
): AIConcept[] {
  const companyKeywords = new Set([
    ...profile.techStack.map((t) => t.toLowerCase()),
    ...(profile.companyType?.toLowerCase().split(" ") || []),
    ...profile.uniqueDifferentiators.flatMap((d) =>
      d.claim.toLowerCase().split(" ")
    ),
  ]);

  // Filter to concepts with at least some keyword overlap
  return concepts.filter((concept) => {
    const conceptKeywords = concept.keywords.map((k) => k.toLowerCase());
    const overlap = conceptKeywords.some((k) => {
      // Check if any company keyword contains this concept keyword (or vice versa)
      for (const companyKeyword of companyKeywords) {
        if (companyKeyword.includes(k) || k.includes(companyKeyword)) {
          return true;
        }
      }
      return false;
    });
    return overlap;
  });
}

/**
 * Get the top N matched concepts for idea generation
 */
export function getTopMatchedConcepts(
  matchedConcepts: MatchedConcept[],
  n: number = 3
): MatchedConcept[] {
  return matchedConcepts.slice(0, n);
}
