/**
 * V2 Prompts for Blog Idea Generation
 *
 * KEY DIFFERENCE FROM V1: No fixed trending concepts table.
 * Ideas emerge from company-specific context (differentiators, content gaps, tech stack).
 */

import { CompanyProfile } from "./analyzeCompanyDifferentiators";
import { ContentGap } from "./analyzeContentGaps";

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
 * Build the V2 idea generation prompt
 *
 * Key differences from V1:
 * 1. NO fixed trending concepts table
 * 2. Ideas must tie to specific differentiators or content gaps
 * 3. "Competitor test" built into the prompt
 * 4. Technology suggestions come from their actual tech stack
 */
export function buildIdeaGenerationPromptV2(
  profile: CompanyProfile,
  gaps: ContentGap[]
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
   - Only mention technologies from their tech stack: ${techStack}
   - Do NOT default to "GPT-5", "MCP", "Green AI", "Agentic AI" unless
     there's evidence they actually use or care about these

5. **SPECIFICITY**:
   - NOT "How to use AI in your workflow"
   - YES "How ${profile.companyName} customers use [specific feature] to [specific outcome]"

6. **AUDIENCE FIT**:
   - Match their technical depth: ${profile.contentStyle.technicalDepth}
   - Write for: ${audienceDesc}

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
      "probability": 0.85
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
