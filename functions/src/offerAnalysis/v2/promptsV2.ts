/**
 * V2 Prompts for Blog Idea Generation
 *
 * KEY DIFFERENCE FROM V1: No fixed trending concepts table.
 * Ideas emerge from company-specific context (differentiators, content gaps, tech stack).
 *
 * ENHANCEMENT: When matched AI concepts are provided, generates bottom-of-funnel
 * tutorials that combine company products with trending AI concepts.
 */

import { CompanyProfile } from "./analyzeCompanyDifferentiators";
import { ContentGap } from "./analyzeContentGaps";
import { AIConcept, MatchedConcept } from "../../services/aiConcepts/types";

/**
 * V2 Blog Idea structure with additional fields for personalization tracking
 */
export interface BlogIdeaV2 {
  title: string;
  whyOnlyTheyCanWriteThis: string;
  specificEvidence: string;
  targetGap: string;
  audienceFit: string;
  whatReaderLearns: string[];
  keyStackTools: string[];
  angleToAvoidDuplication: string;
  // V2 additions
  differentiatorUsed?: string;
  contentGapFilled?: string;
  probability?: number; // For verbalized sampling
  // AI Concept additions (V2 enhancement)
  aiConcept?: string; // Which AI concept this relates to (if any)
  isConceptTutorial?: boolean; // Is this a bottom-of-funnel AI tutorial?
  conceptFitScore?: number; // How well the concept fits (from matching)
}

/**
 * Buzzwords to forbid in generated ideas
 */
export const BUZZWORD_BLACKLIST = [
  "cutting-edge",
  "revolutionary",
  "game-changing",
  "leverage",
  "synergy",
  "paradigm",
  "paradigm shift",
  "unlock potential",
  "unlock the power",
  "seamless",
  "robust",
  "world-class",
  "best-in-class",
  "take it to the next level",
  "disruptive",
  "next-generation",
  "state-of-the-art",
  "industry-leading",
  "groundbreaking",
  "innovative solution",
  "transformative",
  "empower",
  "supercharge",
  "turbocharge",
  "streamline",
  "optimize your workflow",
  "holistic approach",
];

/**
 * Build the AI concept opportunities section for the prompt.
 *
 * 3-tier injection strategy — NEVER returns empty:
 * - Tier 1: Matched concepts (best case, personalized)
 * - Tier 2: No matches, but raw concepts available → inject as "trending opportunities"
 * - Tier 3: Both failed → should not happen with never-expire cache, but returns empty as last resort
 */
function buildAIConceptSection(
  companyName: string,
  matchedConcepts?: MatchedConcept[],
  allConcepts?: AIConcept[]
): string {
  // Tier 1: Matched concepts — personalized, highest quality
  if (matchedConcepts && matchedConcepts.length > 0) {
    const conceptsFormatted = matchedConcepts
      .slice(0, 4)
      .map(
        (mc, i) =>
          `${i + 1}. **${mc.concept.name}** (Fit Score: ${mc.fitScore}%)
   Why Hot: ${mc.concept.whyHot}
   Why It Fits ${companyName}: ${mc.fitReason}
   Product Integration: ${mc.productIntegration}
   Suggested Tutorial Angle: "${mc.tutorialAngle}"`
      )
      .join("\n\n");

    return `================================================================================
AI CONCEPT OPPORTUNITIES (Matched to ${companyName})
================================================================================

These trending AI concepts have been identified as GENUINELY relevant to ${companyName}.
Use them to create BOTTOM-OF-FUNNEL TUTORIALS that show how to use ${companyName}'s product
WITH these AI concepts.

${conceptsFormatted}

INSTRUCTIONS FOR AI CONCEPT IDEAS:
- For at least 2-3 of your 5 ideas, create tutorials combining ${companyName} + these concepts
- Format: "How to [achieve outcome] with ${companyName} using [AI Concept]"
- These should be PRACTICAL, implementation-focused tutorials
- The remaining ideas can be regular personalized content
- For each AI concept idea, set "isConceptTutorial": true and "aiConcept": "[concept name]"

`;
  }

  // Tier 2: No matched concepts, but raw concepts available from Stage 0
  if (allConcepts && allConcepts.length > 0) {
    const topConcepts = allConcepts.slice(0, 5);
    const conceptsFormatted = topConcepts
      .map(
        (c, i) =>
          `${i + 1}. **${c.name}** (${c.category}, ${c.hypeLevel})
   ${c.description}
   Why Hot Now: ${c.whyHot}
   Common Use Cases: ${c.useCases.join(", ")}`
      )
      .join("\n\n");

    return `================================================================================
TRENDING AI CONCEPTS (Find creative connections to ${companyName})
================================================================================

These are currently trending AI concepts in the industry. No specific matches to
${companyName} were identified, but YOU should find creative and practical ways to
connect ${companyName}'s product with these trends.

${conceptsFormatted}

INSTRUCTIONS FOR TRENDING AI IDEAS:
- For at least 2-3 of your 5 ideas, find creative ways to connect ${companyName}'s product with these trends
- Think: "How could ${companyName}'s customers benefit from [trend]?"
- Format: "How to [achieve outcome with ${companyName}] using [AI Concept]"
- Be creative but PRACTICAL — the connection must feel natural, not forced
- The remaining ideas can be regular personalized content
- For each AI concept idea, set "isConceptTutorial": true and "aiConcept": "[concept name]"

`;
  }

  // Tier 3: No concepts at all (should rarely happen with never-expire cache)
  return "";
}

/**
 * Build the V2 idea generation prompt
 *
 * Key differences from V1:
 * 1. NO fixed trending concepts table
 * 2. Ideas must tie to specific differentiators or content gaps
 * 3. "Competitor test" built into the prompt
 * 4. Technology suggestions come from their actual tech stack
 *
 * ENHANCEMENT: When matchedConcepts are provided, includes them as
 * opportunities for bottom-of-funnel tutorials.
 */
export function buildIdeaGenerationPromptV2(
  profile: CompanyProfile,
  gaps: ContentGap[],
  matchedConcepts?: MatchedConcept[],
  allConcepts?: AIConcept[]
): string {
  // Format differentiators
  const differentiators = profile.uniqueDifferentiators
    .map(
      (d, i) =>
        `${i + 1}. ${d.claim}\n   Evidence: ${d.evidence}\n   Category: ${d.category}`
    )
    .join("\n\n");

  // Format content gaps
  const contentGaps = gaps
    .slice(0, 5) // Top 5 gaps
    .map(
      (g, i) =>
        `${i + 1}. ${g.topic} (${g.gapType})\n   Why it matters: ${g.whyItMatters}\n   Suggested angle: ${g.suggestedAngle}`
    )
    .join("\n\n");

  // Format tech stack
  const techStack = profile.techStack.join(", ") || "No specific technologies identified";

  // Format audience
  const audienceDesc = `${profile.targetAudience.primary} (${profile.targetAudience.sophisticationLevel} level)`;

  return `You are generating HIGHLY PERSONALIZED blog ideas for ${profile.companyName}.

================================================================================
COMPANY CONTEXT
================================================================================

COMPANY: ${profile.companyName}
WHAT THEY DO: ${profile.oneLinerDescription}
TYPE: ${profile.companyType}

THEIR UNIQUE DIFFERENTIATORS (use these!):
${differentiators}

CONTENT GAPS TO FILL (opportunities!):
${contentGaps}

TARGET AUDIENCE: ${audienceDesc}
- Job Titles: ${profile.targetAudience.jobTitles.join(", ")}
- Industries: ${profile.targetAudience.industries.join(", ")}

THEIR TECH STACK (mention these, not random technologies):
${techStack}

CONTENT STYLE:
- Tone: ${profile.contentStyle.tone}
- Technical Depth: ${profile.contentStyle.technicalDepth}
- Format Preferences: ${profile.contentStyle.formatPreferences.join(", ")}

================================================================================
CRITICAL RULES
================================================================================

1. **EVERY idea MUST reference a specific differentiator OR fill a content gap**
   - If an idea doesn't tie to the company context above, DON'T include it

2. **THE COMPETITOR TEST**: For each idea, ask yourself:
   "Would this exact idea work for ${profile.companyName}'s competitor?"
   If YES → The idea is too generic. REJECT it.
   If NO → Good! The idea is specific to this company.

3. **NO BUZZWORDS**: The following words/phrases are FORBIDDEN:
   cutting-edge, revolutionary, game-changing, leverage, synergy, paradigm,
   unlock potential, seamless, robust, world-class, best-in-class,
   take it to the next level, disruptive, next-generation, state-of-the-art,
   industry-leading, groundbreaking, innovative solution, transformative,
   empower, supercharge, turbocharge, streamline, holistic

4. **TECHNOLOGY CONSTRAINTS**:
   - Prefer technologies from their tech stack: ${techStack}
   - You MUST also incorporate trending AI concepts from the section below
   - Create practical tutorials that combine the company's product with current AI trends

5. **SPECIFICITY**:
   - NOT "How to use AI in your workflow"
   - YES "How ${profile.companyName} customers use [specific feature] to [specific outcome]"

6. **AUDIENCE FIT**:
   - Match their technical depth: ${profile.contentStyle.technicalDepth}
   - Write for: ${audienceDesc}

${buildAIConceptSection(profile.companyName, matchedConcepts, allConcepts)}
================================================================================
GENERATE 5 IDEAS
================================================================================

For each idea, use VERBALIZED SAMPLING: Generate 5 ideas with probability scores.
Higher probability = better fit for this specific company.

{
  "ideas": [
    {
      "title": "Specific article title that includes company context",
      "whyOnlyTheyCanWriteThis": "What makes this uniquely theirs? Reference specific differentiator or gap.",
      "specificEvidence": "What company data supports this idea being a good fit?",
      "targetGap": "Which content gap does this fill? (or 'differentiator showcase')",
      "audienceFit": "How does this serve their specific audience?",
      "whatReaderLearns": [
        "Specific learning outcome 1",
        "Specific learning outcome 2",
        "Specific learning outcome 3",
        "Specific learning outcome 4"
      ],
      "keyStackTools": ["Tools from their tech stack or their product"],
      "angleToAvoidDuplication": "How this differs from what competitors might write",
      "differentiatorUsed": "Which differentiator this showcases (if any)",
      "contentGapFilled": "Which content gap this fills (if any)",
      "probability": 0.85,
      "aiConcept": "Name of the AI concept this idea uses (null if not an AI concept idea)",
      "isConceptTutorial": false
    }
  ]
}

IDEAS WITH PROBABILITY < 0.5 ARE TOO GENERIC - don't include them.

RESPOND WITH ONLY THE JSON OBJECT - no markdown, no code blocks, just valid JSON.`;
}

/**
 * System prompt for V2 idea generation
 */
export const IDEA_GENERATION_SYSTEM_PROMPT_V2 = `You are an expert B2B content strategist who creates highly personalized blog ideas.

Your core principle: EVERY idea must be something only THIS SPECIFIC COMPANY could credibly write.

You never use generic marketing buzzwords. You never suggest topics that could apply to any company.
Instead, you deeply analyze the company's unique differentiators, content gaps, and audience to create ideas that are tailor-made for them.

When evaluating each idea, you apply the "competitor test": Would this idea make sense for a competing company?
If yes, the idea is too generic and you reject it.

You assign probability scores honestly - high scores (>0.7) only for ideas that truly fit the company's unique context.`;
