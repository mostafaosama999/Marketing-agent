/**
 * V2 Stage 2: Analyze Content Gaps
 *
 * Identifies topics the company SHOULD write about but hasn't.
 * Uses their differentiators, tech stack, and audience to find opportunities.
 *
 * Output: List of content gap opportunities with rationale
 */

import OpenAI from "openai";
import {
  extractTokenUsage,
  calculateCost,
  CostInfo,
} from "../../utils/costTracker";
import { CompanyProfile } from "./analyzeCompanyDifferentiators";

/**
 * A content gap opportunity
 */
export interface ContentGap {
  topic: string;
  gapType: "tech_stack" | "audience" | "differentiation" | "funnel" | "trending";
  whyItMatters: string;
  whyTheyrePositioned: string;
  howItDiffersFromCompetitors: string;
  suggestedAngle: string;
  priorityScore: number; // 0-100, how important is this gap?
}

/**
 * Response from Stage 2 analysis
 */
export interface ContentGapAnalysisResult {
  success: boolean;
  gaps: ContentGap[];
  costInfo: CostInfo;
  analyzedAt: string;
}

/**
 * Build the prompt for content gap analysis
 */
function buildContentGapPrompt(
  profile: CompanyProfile,
  blogContentSummary?: string
): string {
  const differentiators = profile.uniqueDifferentiators
    .map((d, i) => `${i + 1}. ${d.claim} (Evidence: ${d.evidence})`)
    .join("\n");

  const techStack = profile.techStack.join(", ") || "Unknown";
  const topicsTheyLike = profile.contentStyle.topicsTheyLike.join(", ") || "Unknown";
  const topicsToAvoid = profile.contentStyle.topicsToAvoid.join(", ") || "None specified";
  const formatPreferences = profile.contentStyle.formatPreferences.join(", ") || "Unknown";

  return `You are identifying CONTENT GAPS for ${profile.companyName}.

A content gap is a topic they SHOULD write about but HAVEN'T.

================================================================================
COMPANY PROFILE
================================================================================

COMPANY: ${profile.companyName}
ONE-LINER: ${profile.oneLinerDescription}
TYPE: ${profile.companyType}

THEIR DIFFERENTIATORS:
${differentiators}

TARGET AUDIENCE:
- Primary: ${profile.targetAudience.primary}
- Secondary: ${profile.targetAudience.secondary}
- Sophistication: ${profile.targetAudience.sophisticationLevel}
- Job Titles: ${profile.targetAudience.jobTitles.join(", ")}
- Industries: ${profile.targetAudience.industries.join(", ")}

TECH STACK: ${techStack}

CONTENT STYLE:
- Tone: ${profile.contentStyle.tone}
- Technical Depth: ${profile.contentStyle.technicalDepth}
- Format Preferences: ${formatPreferences}
- Topics They Like: ${topicsTheyLike}
- Topics to Avoid: ${topicsToAvoid}

GROWTH SIGNALS:
- Stage: ${profile.growthSignals.stage}
- Funding: ${profile.growthSignals.fundingStage}
- Team Size: ${profile.growthSignals.teamSize}
- Likely Priorities: ${profile.growthSignals.likelyPriorities.join(", ")}

${blogContentSummary ? `THEIR CURRENT BLOG THEMES:\n${blogContentSummary}` : ""}

================================================================================
YOUR TASK: Identify Content Gaps
================================================================================

Find 5-8 content opportunities they're missing. For each gap type:

1. **TECH STACK GAPS**: Topics related to their technologies they haven't covered
   - Example: They use Redis but never wrote about caching strategies
   - Look at their tech stack and find unexplored angles

2. **AUDIENCE GAPS**: Topics their audience searches for but they don't address
   - Consider what their target job titles would search for
   - What problems do their customers face that they could solve with content?

3. **DIFFERENTIATION GAPS**: Topics that would highlight their unique strengths
   - What content would showcase their differentiators?
   - How can they demonstrate their unique value through education?

4. **FUNNEL GAPS**: Missing content for awareness/consideration/decision stages
   - Do they have thought leadership (awareness)?
   - Do they have comparison guides (consideration)?
   - Do they have implementation guides (decision)?

5. **TRENDING GAPS**: Emerging topics relevant to their space they should cover
   - What's new in their industry they could write about?
   - Only suggest if genuinely relevant to their differentiators

================================================================================
IMPORTANT RULES
================================================================================

1. Each gap must be SPECIFIC - not "write about AI" but "write about [specific use case]"
2. Each gap must be something ONLY ${profile.companyName} could write credibly
3. Avoid generic topics that any company could cover
4. Tie each gap back to their differentiators or audience
5. Do NOT suggest topics in their "topicsToAvoid" list
6. Match their technical depth: ${profile.contentStyle.technicalDepth}

================================================================================
OUTPUT FORMAT (JSON ONLY)
================================================================================

{
  "gaps": [
    {
      "topic": "Specific topic title (not a full article title, just the topic)",
      "gapType": "tech_stack | audience | differentiation | funnel | trending",
      "whyItMatters": "Why this topic matters to their business and audience",
      "whyTheyrePositioned": "Why ${profile.companyName} is uniquely positioned to write about this",
      "howItDiffersFromCompetitors": "How their take would be different from what competitors might write",
      "suggestedAngle": "The specific angle they should take on this topic",
      "priorityScore": 85
    }
  ]
}

RESPOND WITH ONLY THE JSON OBJECT - no markdown, no code blocks, just valid JSON.`;
}

/**
 * Clean JSON response from OpenAI
 */
function cleanJsonResponse(content: string): string {
  return content
    .replace(/```json\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();
}

/**
 * Analyze content gaps for a company
 */
export async function analyzeContentGaps(
  openai: OpenAI,
  profile: CompanyProfile,
  blogContentSummary?: string
): Promise<ContentGapAnalysisResult> {
  const prompt = buildContentGapPrompt(profile, blogContentSummary);

  console.log(`[V2 Stage 2] Analyzing content gaps for: ${profile.companyName}`);

  const completion = await openai.chat.completions.create({
    model: "gpt-4-turbo",
    response_format: { type: "json_object" },
    temperature: 0.5, // Moderate creativity for gap discovery
    max_tokens: 2500,
    messages: [
      {
        role: "system",
        content:
          "You are a content strategist who identifies valuable content opportunities. You focus on gaps that would genuinely help a company establish thought leadership and attract their target audience.",
      },
      { role: "user", content: prompt },
    ],
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error("Failed to get response from OpenAI");
  }

  const result: { gaps: ContentGap[] } = JSON.parse(cleanJsonResponse(content));

  // Filter to only high-priority gaps (score >= 60)
  const filteredGaps = result.gaps.filter((gap) => gap.priorityScore >= 60);

  // Calculate cost
  const tokens = extractTokenUsage(completion);
  let costInfo: CostInfo = {
    totalCost: 0,
    inputCost: 0,
    outputCost: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    model: "gpt-4-turbo",
  };

  if (tokens) {
    costInfo = calculateCost(tokens, "gpt-4-turbo");
  }

  console.log(
    `[V2 Stage 2] Complete: Found ${filteredGaps.length} content gaps (filtered from ${result.gaps.length})`
  );

  return {
    success: true,
    gaps: filteredGaps,
    costInfo,
    analyzedAt: new Date().toISOString(),
  };
}
