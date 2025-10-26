// src/prompts/blogAnalysis.ts
// AI prompts for analyzing and qualifying company blogs

import { PromptTemplate, createPrompt } from './types';

/**
 * Variables for blog content quality analysis
 */
export interface BlogQualityAnalysisVariables {
  website: string;
  blogPostsCount: number;
  totalCodeBlocks: number;
  totalDiagrams: number;
  blogUrl?: string;
  blogContent?: string;
}

/**
 * Comprehensive blog content quality analysis prompt
 * Evaluates technical depth, AI-written detection, content quality, and more
 */
export const BLOG_QUALITY_ANALYSIS: PromptTemplate<BlogQualityAnalysisVariables> = ({
  website,
  blogPostsCount,
  totalCodeBlocks,
  totalDiagrams,
  blogUrl,
  blogContent,
}) => {
  const contentSection = (blogUrl && blogContent)
    ? `\nBlog URL: ${blogUrl}\nContent (first 12000 chars):\n${blogContent.substring(0, 12000)}\n`
    : '';

  return `You are an expert content analyst evaluating B2B SaaS blog quality for partnership opportunities.

COMPANY: ${website}
ANALYSIS TYPE: ${blogPostsCount > 0 ? `Detailed analysis of ${blogPostsCount} actual blog posts` : "Blog index page analysis"}
${blogPostsCount > 0 ? `DETECTED: ${totalCodeBlocks} total code blocks, ${totalDiagrams} total images/diagrams` : ""}
${contentSection}

⚠️ CRITICAL REQUIREMENTS ⚠️
1. NEVER return empty strings ("") for reasoning/evidence/summary fields
2. ALL reasoning fields MUST be at least 100 characters long with SPECIFIC examples
3. If you cannot determine something, say "Unable to determine" with explanation - NOT empty string
4. Quote actual phrases from the content to support your analysis
5. Be HARSH but FAIR in your ratings - don't inflate scores

YOUR TASK:
Perform a rigorous content quality analysis. We need to distinguish between:
- HIGH-quality: Deep technical content that experienced developers value
- LOW-quality: Generic marketing fluff or AI-generated surface-level content

ANALYSIS CRITERIA:

1. TECHNICAL DEPTH
   - Are there code examples? (actual implementations, not just snippets)
   - What technical concepts are covered? (algorithms, architecture, protocols?)
   - Does it explain HOW things work internally, not just WHAT they are?
   - Target audience: beginners vs. experienced developers?
   - Product internals and implementation details shown?

2. AI-GENERATED CONTENT DETECTION (Be thorough - this is critical!)
   🚨 STRONG AI-writing indicators (if 3+ present, likely AI-written):
   - Generic intros: "In today's fast-paced world", "In the ever-evolving landscape", "In recent years"
   - Repetitive sentence structures: Every paragraph starts same way
   - Overly polished without personality: No humor, no opinions, no "I" or "we"
   - Lack of specifics: No real metrics, dates, company names, or concrete examples
   - Surface-level only: Explains WHAT but never HOW or WHY at technical level
   - Listicles without depth: "5 ways to...", "10 tips for..." with 2-3 sentences each
   - Generic conclusions: "In conclusion...", "As we've seen...", restate intro without adding value
   - Buzzword density: Every sentence has "innovative", "seamless", "cutting-edge", "robust"
   - No code examples despite technical topic
   - No controversy or strong opinions (AI plays it safe)

   🎯 Human-written indicators:
   - Specific war stories: "When we tried X at Company Y, Z happened"
   - Strong opinions: "X is terrible because...", "Everyone says Y but they're wrong"
   - Actual code with comments explaining decisions
   - Real metrics/data: "We reduced latency from 500ms to 50ms"
   - Personality/humor: Jokes, sarcasm, colloquialisms
   - Multiple authors with different writing styles

3. CONTENT TYPE & FUNNEL STAGE
   - Top-of-funnel: "What is X?" content, generic tutorials, listicles
   - Middle-funnel: Use cases, comparisons, best practices with some depth
   - Bottom-funnel: Deep dives, architecture, product internals, advanced concepts

4. CODE & DIAGRAMS
   - Count actual code blocks with real implementations
   - What languages/frameworks? (Python, Go, JavaScript, etc.)
   - Are there system diagrams, architecture diagrams, data flows?
   - Technical illustrations showing how things work?

5. EVIDENCE & EXAMPLES
   - Quote specific passages that demonstrate quality (or lack of it)
   - Identify real technical topics mentioned
   - Note any AI-writing red flags found

RESPONSE FORMAT (JSON ONLY - MUST be valid JSON):
{
  "active_blog": boolean,
  "post_count": number,
  "multiple_authors": boolean,
  "author_count": number,
  "authors": ["Name 1", "Name 2"],
  "last_post_date": "YYYY-MM-DD" or null,
  "is_developer_b2b_saas": boolean,
  "authors_are_employees": "employees"|"freelancers"|"mixed"|"unknown",
  "covers_ai_topics": boolean,
  "content_summary": "REQUIRED: Bullet list of 3-5 main topics covered. Min 50 chars. Use • Topic format.",

  "content_quality_rating": "low"|"medium"|"high" (REQUIRED - pick one),
  "content_quality_reasoning": "REQUIRED: Min 150 chars. Must include: (1) Specific topics mentioned (2) Code languages if any (3) Quoted phrases showing quality level (4) Why you chose this rating. Example: 'Posts cover data ingestion architecture with Python examples. Quote: \\"We implemented CDC using Debezium...\\" Shows intermediate depth but lacks advanced system design.'",

  "is_ai_written": boolean (REQUIRED),
  "ai_written_confidence": "low"|"medium"|"high" (REQUIRED),
  "ai_written_evidence": "REQUIRED: Min 100 chars. If AI: List specific patterns found with quotes. If human: Explain why (specific examples, personality, real data). Example: 'Generic intro detected: \\"In today\\'s digital landscape\\". No specific metrics or war stories. Repetitive structure across posts.' OR 'Human indicators: Real metrics (\\"500ms → 50ms\\"), specific company examples (Stripe, AWS), author personality.'",

  "has_code_examples": boolean,
  "code_examples_count": number (count actual code blocks with >3 lines),
  "code_languages": ["Python", "JavaScript", "Go"] (extract from code blocks, empty [] if none),

  "has_diagrams": boolean,
  "diagrams_count": number,

  "technical_depth": "beginner"|"intermediate"|"advanced" (REQUIRED),
  "funnel_stage": "top"|"middle"|"bottom" (REQUIRED),

  "example_quotes": ["Quote 1 showing quality/issues", "Quote 2", "Quote 3"] (REQUIRED: Provide 2-3 actual quotes from content)
}

RATING GUIDELINES (Be HARSH but FAIR):

HIGH (⭐⭐⭐⭐):
- 3+ code examples per post with real implementations
- Architecture/system diagrams present
- Advanced technical concepts (distributed systems, algorithms, protocols)
- Real product implementation details and internals
- Targets experienced developers
- NOT AI-generated
- Bottom-of-funnel content
Example topics: "Implementing Raft consensus in Go", "Our database query optimizer internals"

MEDIUM (⭐⭐⭐):
- 1-2 code examples per post
- Solid technical explanations with some depth
- Practical but not deeply advanced
- May mix some marketing with technical content
- Intermediate developers can learn from it
Example topics: "Building a REST API with error handling", "Deploying with Docker best practices"

LOW (⭐⭐):
- No or minimal code examples
- Generic marketing language
- Surface-level "What is X?" content
- AI-generated patterns detected (generic intros, repetitive structure)
- Top-of-funnel only
- Could be written by someone with no deep expertise
Example topics: "5 Benefits of Cloud Computing", "Why You Need Event-Driven Architecture"

⚠️ BEFORE SUBMITTING YOUR RESPONSE, VERIFY:
✓ content_quality_reasoning is at least 150 characters with specific examples
✓ ai_written_evidence is at least 100 characters with specific examples
✓ content_summary is at least 50 characters
✓ example_quotes has 2-3 actual quotes from the content
✓ NO empty strings ("") in any field
✓ All REQUIRED fields are filled

RESPOND WITH ONLY THE JSON OBJECT - no markdown, no explanation, just valid JSON.`;
};

/**
 * Wrapped version with metadata
 */
export const blogQualityAnalysisPrompt = createPrompt<BlogQualityAnalysisVariables>(
  BLOG_QUALITY_ANALYSIS,
  {
    name: 'Blog Quality Analysis',
    description: 'Comprehensive blog content analysis including technical depth, AI-written detection, and quality rating',
    version: '1.0.0',
    author: 'Research Team',
    tags: ['blog-analysis', 'content-quality', 'ai-detection'],
  }
);
