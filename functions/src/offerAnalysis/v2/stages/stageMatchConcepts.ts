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
const CONCEPT_MATCHING_PROMPT = `You are evaluating which AI concepts could be relevant to this company for blog content.

Your job is to find genuine connections between trending AI concepts and this company's product/audience.
Be thoughtful but not overly strict — most B2B tech companies can create valuable content about
AI trends if the connection is framed well.

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
MATCHING CRITERIA
================================================================================

For each concept, evaluate:

1. RELEVANCE (Does this concept relate to what they do or their domain?)
   - Score 0-30 if completely unrelated
   - Score 31-50 if loose connection exists
   - Score 51-70 if there's a reasonable connection that could make a good article
   - Score 71-90 if there's a clear, strong connection
   - Score 91-100 if it's core to their product/mission

2. PRODUCT INTEGRATION (Could their product be part of a tutorial about this?)
   - Can they build content showing their product alongside this concept?
   - "How to use [their product] for [this concept]" — does it make sense?

3. AUDIENCE INTEREST (Would their audience care?)
   - Is their target audience likely to benefit from understanding this concept?
   - Would a blog about this attract or engage their customers?

Return at least 2-3 concepts with the best fit, even if scores are moderate (50-70).
Only exclude concepts that are truly irrelevant (score < 50).

================================================================================
OUTPUT FORMAT (JSON ONLY)
================================================================================

{
  "matchedConcepts": [
    {
      "conceptName": "Name of the matched concept",
      "fitScore": 50-100,
      "fitReason": "Why this concept fits this company (1-2 sentences)",
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
          "You are a content strategy evaluator who finds genuine connections between trending AI concepts and companies. You aim to find at least 2-3 good matches for any tech company, being creative about how concepts could apply.",
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
    .filter((m) => m.fitScore >= 50)
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
    console.log(`[V2 Stage 1.5] No concepts matched with score >= 50`);
  }

  return {
    matchedConcepts,
    totalConceptsEvaluated: concepts.length,
    matchingCost: costInfo.totalCost,
  };
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
