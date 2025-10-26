// src/data/prompts.ts
// Mirrored prompt definitions from /functions/src/prompts/
// This allows the frontend to display prompt metadata without accessing backend code

export interface PromptMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  tags: string[];
  variables?: string[];
  systemPrompt?: string;
  userPrompt: string;
}

export const AI_PROMPTS: PromptMetadata[] = [
  // LinkedIn Post Generation
  {
    id: 'linkedin-condensed-insights',
    name: 'LinkedIn Post - Condensed Insights',
    description: 'Generates 2 LinkedIn posts from technical articles using the condensed insights with value hooks technique',
    version: '1.0.0',
    author: 'Marketing Team',
    category: 'LinkedIn Posts',
    tags: ['linkedin', 'content-generation', 'technical-writing'],
    variables: ['content'],
    systemPrompt: `You are a senior content marketing expert specializing in technical content for LinkedIn. You excel at creating engaging, data-driven posts that resonate with technical professionals. You always follow instructions precisely and create content that is ready for immediate publication.

When asked to create 2 different LinkedIn posts, respond with a JSON object containing exactly this structure:
{
  "post1": {
    "content": "full linkedin post content including hashtags",
    "hashtags": ["array", "of", "hashtags", "used"]
  },
  "post2": {
    "content": "second version of linkedin post content including hashtags",
    "hashtags": ["array", "of", "hashtags", "used"]
  }
}

Each post must be 180-220 words, include specific data points from the article, use emojis naturally, have 4-6 numbered takeaways, end with an engagement question, and include 4-6 niche hashtags.`,
    userPrompt: `{{content}}

The above is a long technical article. Summarize it for a LinkedIn post using the "condensed insights with value hooks" technique.

Write a compelling, data-driven hook as the very first sentence.
The hook must grab attention instantly, convey authority, and clearly connect to the post's technical topic.
Avoid generic claims — back it with a specific, credible stat, benchmark, or impact figure.
Keep it short, punchy, and easy to scan (max 15 words).
The hook should make the reader want to learn "how" or "why" the statement is true.
Example:
For a cloud cost optimization topic:
"Cloud waste isn't just inefficiency—it's 30% of your monthly bill gone. ☁️💸"

The total length should be around 180–220 words and must be at least 180 words.

Write in a professional but energetic tone — confident, authoritative, and technically competent.

Preserve as many relevant technical details, figures, and real-world examples from the article as possible. Avoid generic filler or vague claims.

Incorporate emojis naturally for visual breaks and scannability.

Structure the post as a clear, numbered list of 4–6 key takeaways, each offering a tangible insight, data point, or specific example.

End with a brief, subtle engagement question related to the topic (e.g., "What's your team's biggest challenge with scaling LLMs?") rather than a strong prompt to comment.

Add 4–6 highly relevant, niche hashtags at the end (avoid broad hashtags like #AI or #Technology).

The final post must be fully ready for copy-paste into LinkedIn.
I want you to create 2 different linkedin posts I can choose from`,
  },

  // Blog Quality Analysis
  {
    id: 'blog-quality-analysis',
    name: 'Blog Quality Analysis',
    description: 'Comprehensive blog content analysis including technical depth, AI-written detection, and quality rating',
    version: '1.0.0',
    author: 'Research Team',
    category: 'Blog Analysis',
    tags: ['blog-analysis', 'content-quality', 'ai-detection'],
    variables: ['website', 'blogPostsCount', 'totalCodeBlocks', 'totalDiagrams', 'blogUrl', 'blogContent'],
    userPrompt: `You are an expert content analyst evaluating B2B SaaS blog quality for partnership opportunities.

COMPANY: {{website}}
ANALYSIS TYPE: {{blogPostsCount}} > 0 ? Detailed analysis of {{blogPostsCount}} actual blog posts : "Blog index page analysis"
DETECTED: {{totalCodeBlocks}} total code blocks, {{totalDiagrams}} total images/diagrams
{{blogUrl && blogContent ? 'Blog URL: {{blogUrl}}\\nContent (first 12000 chars):\\n{{blogContent}}' : ''}}

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
  "content_quality_reasoning": "REQUIRED: Min 150 chars. Must include: (1) Specific topics mentioned (2) Code languages if any (3) Quoted phrases showing quality level (4) Why you chose this rating.",

  "is_ai_written": boolean (REQUIRED),
  "ai_written_confidence": "low"|"medium"|"high" (REQUIRED),
  "ai_written_evidence": "REQUIRED: Min 100 chars. If AI: List specific patterns found with quotes. If human: Explain why (specific examples, personality, real data).",

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

RESPOND WITH ONLY THE JSON OBJECT - no markdown, no explanation, just valid JSON.`,
  },
];

export const PROMPT_CATEGORIES = [
  'LinkedIn Posts',
  'Blog Analysis',
  'Writing Program Finder',
  'Writing Program Analyzer',
  'Idea Generation',
];

export function getPromptsByCategory(category: string): PromptMetadata[] {
  return AI_PROMPTS.filter(prompt => prompt.category === category);
}

export function getPromptById(id: string): PromptMetadata | undefined {
  return AI_PROMPTS.find(prompt => prompt.id === id);
}
