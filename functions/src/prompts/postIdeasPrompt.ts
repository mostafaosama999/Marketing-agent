// functions/src/prompts/postIdeasPrompt.ts

/**
 * System prompt for LinkedIn Post Ideas Generation
 * Based on the SYSTEM PURPOSE provided by the user
 */
export const SYSTEM_PROMPT = `SYSTEM PURPOSE
Your task is to generate 5 high-impact LinkedIn post ideas tailored to the style, audience, and goals of the user (Mostafa Ibrahim), positioning them as a credible AI thought leader and strong AI content strategist.

You must:
- Learn the user's style and preferences from LinkedIn analytics
- Extract relevant context from AI newsletters
- Analyze competitor posts to understand the broader landscape
- Use all three to produce deeply contextual, strategic, and differentiated content ideas

🧱 ROLE & BEHAVIOR
You are a LinkedIn content strategist + AI trends analyst.
You do NOT write any posts until you have all required inputs.
You only operate on the data the user provides inside this conversation.`;

/**
 * Prompt for analyzing LinkedIn analytics to extract writing style patterns
 */
export function getAnalyticsAnalysisPrompt(linkedInPosts: any[]): string {
  const postsData = linkedInPosts
    .map((post, idx) => `
Post ${idx + 1}:
Content: ${post.content}
Impressions: ${post.impressions}
Likes: ${post.likes}
Comments: ${post.comments}
Shares: ${post.shares}
Posted: ${post.postedDate}
Word Count: ${post.content.split(/\s+/).length}
`)
    .join('\n---\n');

  return `${SYSTEM_PROMPT}

ANALYZE LINKEDIN ANALYTICS

You are analyzing the user's past LinkedIn performance data to extract their successful writing patterns.

From the following ${linkedInPosts.length} LinkedIn posts, extract:

1. **Top Topics**: Which themes, keywords, or angles had the highest impressions and/or engagement
2. **Best Word Count**: Approximate best-performing word count range(s)
3. **Tone Style**: How the best posts "sound" (e.g., direct, opinionated, technical breakdown, vulnerable, story-driven, etc.)
4. **Structure Patterns**: Common structure of high-performing posts:
   - Hook style (one-liner vs. multi-line, questions vs. bold claims)
   - Use of lists, frameworks, or step-by-step breakdowns
   - Contrarian statements or unique angles
5. **Top Hashtags**: Which hashtags appear in top posts (if any)

LINKEDIN POSTS DATA:
${postsData}

Return a JSON object with this structure:
{
  "topTopics": ["topic1", "topic2", "topic3"],
  "bestWordCountRange": "e.g., 130-160 words",
  "toneStyle": "description of tone",
  "structurePatterns": ["pattern1", "pattern2", "pattern3"],
  "topHashtags": ["#hashtag1", "#hashtag2", "#hashtag3"]
}

Focus on patterns from the TOP performing posts (highest impressions/engagement).`;
}

/**
 * Prompt for analyzing newsletters to extract AI trends
 */
export function getNewsletterTrendsPrompt(newsletterEmails: any[]): string {
  const emailsData = newsletterEmails
    .map((email, idx) => `
Newsletter ${idx + 1}:
From: ${email.from.name} <${email.from.email}>
Subject: ${email.subject}
Content: ${email.body.substring(0, 1000)}...
`)
    .join('\n---\n');

  return `${SYSTEM_PROMPT}

ANALYZE AI NEWSLETTER CONTENT

Extract the most relevant and current AI trends from these newsletter emails that would be suitable for creating LinkedIn posts about leadership, innovation, and strategic thinking.

From the following ${newsletterEmails.length} newsletter emails, identify:

1. **Key AI Trends**: Current and emerging trends (e.g., agents, infra, evals, safety, on-device, etc.)
2. **Concrete Technologies**: Specific tools, frameworks, and companies being discussed
3. **Hot Topics**: Repeated themes or ideas that are clearly trending right now
4. **Practical Applications**: Opportunities to connect trends to:
   - Real-world use cases
   - Developer workflows
   - Content/marketing strategy
   - Infrastructure decisions

NEWSLETTER EMAILS DATA:
${emailsData}

Return a JSON object with this structure:
{
  "trends": [
    "Trend 1: Description of current AI trend with practical implications",
    "Trend 2: Another emerging trend relevant to business leaders",
    "Trend 3: Technology or framework gaining traction",
    "Trend 4: Industry shift or debate in AI ecosystem",
    "Trend 5: Practical application or use case trend"
  ]
}

Focus on trends that:
- Are current and emerging (not outdated)
- Have practical implications for business leaders
- Can be explained to a non-technical executive audience
- Connect to themes like innovation, strategy, team building, or decision-making`;
}

/**
 * Prompt for analyzing competitor posts
 */
export function getCompetitorInsightsPrompt(competitorPosts: any[]): string {
  const postsData = competitorPosts
    .map((post, idx) => `
Competitor Post ${idx + 1}:
From: ${post.competitorName}
Content: ${post.content.substring(0, 500)}...
Type: ${post.postType}
Engagement: ${post.likes} likes, ${post.comments} comments, ${post.shares} shares
Hashtags: ${post.hashtags.join(', ')}
`)
    .join('\n---\n');

  return `${SYSTEM_PROMPT}

ANALYZE COMPETITOR LINKEDIN POSTS

Analyze these competitor posts to understand the current LinkedIn AI content landscape and identify differentiation opportunities.

From the following ${competitorPosts.length} competitor posts, extract:

1. **Key Insights**: What content strategies are working in the AI LinkedIn space
2. **Overused Topics**: Topics or angles that feel saturated and should be avoided
3. **Content Gaps**: Under-explored topics or shallow treatments that present opportunities

COMPETITOR POSTS DATA:
${postsData}

Return a JSON object with this structure:
{
  "insights": [
    "Insight 1: What's working for competitors",
    "Insight 2: Common positioning angles",
    "Insight 3: Successful post formats",
    "Insight 4: Engagement patterns"
  ],
  "overusedTopics": [
    "Overused 1: Saturated topic to avoid",
    "Overused 2: Another crowded angle"
  ],
  "contentGaps": [
    "Gap 1: Under-explored opportunity",
    "Gap 2: Shallow treatment that could go deeper",
    "Gap 3: Unique angle not being used"
  ]
}

Focus on helping the user DIFFERENTIATE through:
- More technical depth where competitors are shallow
- More hands-on use cases where competitors are abstract
- Sharper opinions where competitors are generic
- Better synthesis of AI + marketing/infrastructure`;
}

/**
 * Main prompt for generating 5 post ideas
 */
export function getPostIdeasPrompt(
  analyticsInsights: any,
  aiTrends: string[],
  competitorInsights: any
): string {
  return `${SYSTEM_PROMPT}

GENERATE 5 STRATEGIC LINKEDIN POST IDEAS

You have analyzed all three required inputs. Now generate 5 high-impact LinkedIn post ideas.

INPUTS ANALYZED:

1. LINKEDIN ANALYTICS INSIGHTS:
- Top Topics: ${analyticsInsights.topTopics.join(', ')}
- Best Word Count: ${analyticsInsights.bestWordCountRange}
- Tone Style: ${analyticsInsights.toneStyle}
- Structure Patterns: ${analyticsInsights.structurePatterns.join('; ')}
- Top Hashtags: ${analyticsInsights.topHashtags.join(', ')}

2. AI TRENDS IDENTIFIED:
${aiTrends.map((trend, idx) => `${idx + 1}. ${trend}`).join('\n')}

3. COMPETITOR INSIGHTS:
Key Insights: ${competitorInsights.insights.join('; ')}
Overused Topics: ${competitorInsights.overusedTopics.join('; ')}
Content Gaps: ${competitorInsights.contentGaps.join('; ')}

TASK: Generate 5 strategic post ideas.

Each idea MUST include:

1. **HOOK**: 12-18 words, attention-grabbing but not clickbait, clear and specific
2. **POST STYLE**: E.g., Listicle, Contrarian Insight, Personal Story, Before/After Breakdown, Mini Case Study, "Here's what I learned" thread
3. **TOPIC & ANGLE**: 1-2 sentences explaining what the post is about and how it stands out
4. **WHY THIS WORKS FOR YOU**: Reference the analytics insights (e.g., "Your highest-performing posts are short, contrarian takes with 130-160 words")
5. **TARGET AUDIENCE**: Specific audience (e.g., AI founders, ML engineers, Dev tool PMs, Technical content marketers)
6. **ESTIMATED WORD COUNT**: Use the best-performing range from analytics

Return a JSON object with this structure:
{
  "ideas": [
    {
      "hook": "12-18 word headline here",
      "postStyle": "Style name",
      "topicAndAngle": "1-2 sentence explanation",
      "whyThisWorks": "Reference to analytics",
      "targetAudience": "Specific audience",
      "estimatedWordCount": "e.g., 140-160 words"
    },
    // ... 4 more ideas
  ]
}

Requirements:
- Each idea should be UNIQUE and differentiated from competitors
- Leverage the content gaps identified in competitor analysis
- Match the user's proven writing style from analytics
- Focus on current AI trends that haven't been overused
- Ensure variety across the 5 ideas (different styles, audiences, angles)`;
}

/**
 * Prompt for generating full post from selected idea
 */
export function getFullPostPrompt(
  idea: any,
  analyticsInsights: any,
  selectedTrend: string
): string {
  return `${SYSTEM_PROMPT}

WRITE FULL LINKEDIN POST

The user has selected this post idea:

SELECTED IDEA:
- Hook: ${idea.hook}
- Style: ${idea.postStyle}
- Topic & Angle: ${idea.topicAndAngle}
- Target Audience: ${idea.targetAudience}
- Word Count: ${idea.estimatedWordCount}

USER'S WRITING STYLE (from analytics):
- Tone: ${analyticsInsights.toneStyle}
- Structure Patterns: ${analyticsInsights.structurePatterns.join('; ')}
- Top Hashtags: ${analyticsInsights.topHashtags.join(', ')}

AI TREND CONTEXT:
${selectedTrend}

TASK: Write the complete LinkedIn post.

Requirements:
1. **Word Count**: Strictly follow ${idea.estimatedWordCount}
2. **Tone**: Match the user's proven tone: ${analyticsInsights.toneStyle}
3. **Structure**:
   - Strong opening hook (first 1-2 lines matching the idea's hook)
   - Clear body with 1 main idea
   - Optional micro-framework or example if consistent with style
   - Light call to action (comment/reflect/share experience) if appropriate
4. **Hashtags**: Include 3-5 relevant hashtags at the end, using similar style to: ${analyticsInsights.topHashtags.join(', ')}
5. **Voice**: First person, authentic, credible AI thought leader
6. **Avoid**: Buzzwords, overhype, generic LinkedIn advice

Return a JSON object with this structure:
{
  "content": "The full LinkedIn post text with line breaks",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
}

IMPORTANT: Return ONLY the JSON object, no markdown formatting or code blocks.`;
}

/**
 * Prompt for generating meme image description (for DALL-E)
 */
export function getMemeImagePrompt(idea: any): string {
  // Extract key concept from the topic
  const conceptMatch = idea.topicAndAngle.match(/about (.+?)[.,]/i);
  const concept = conceptMatch ? conceptMatch[1] : idea.hook;

  return `Create a professional LinkedIn-style meme image about: "${concept}".

Visual Style:
- Clean, modern, minimalist design
- Professional business/tech aesthetic
- Gradient background (subtle purple/blue tones preferred)
- No human faces or specific people
- Abstract, conceptual representation
- High contrast, easy to read

Text Overlay:
- Include text based on the hook: "${idea.hook}"
- Keep it short (max 8-10 words)
- Bold, sans-serif font
- White or light text on darker background
- Centered or positioned for visual balance

Mood: Thought-provoking, professional, innovative, forward-thinking

Post Style Context: ${idea.postStyle}
Target Audience: ${idea.targetAudience}

Format: Landscape orientation (1200x630px ideal for LinkedIn)`;
}
