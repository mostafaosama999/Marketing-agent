// functions/src/prompts/linkedinPostFromTrend.ts

import {AITrend} from '../aiTrends/types';

export function getCompetitorSummaryPrompt(competitorPosts: any[]): string {
  const postsData = competitorPosts
    .map(
      (post, idx) => `
Post ${idx + 1}:
- Content: ${post.content.substring(0, 300)}${post.content.length > 300 ? '...' : ''}
- Engagement: ${post.likes} likes, ${post.comments} comments, ${post.shares} shares
- Hashtags: ${post.hashtags.join(', ')}
- Type: ${post.postType}
`
    )
    .join('\n');

  return `Analyze these top-performing LinkedIn posts from competitors and extract key insights:

${postsData}

Provide a concise analysis (max 200 words) covering:
1. Common themes and topics that resonate
2. Engagement patterns (what drives likes/comments)
3. Tone and style preferences
4. Hashtag strategies

Return a JSON object with this structure:
{
  "commonThemes": ["theme1", "theme2", ...],
  "engagementPatterns": ["pattern1", "pattern2", ...],
  "toneAndStyle": "description of tone",
  "hashtagStrategy": ["#hashtag1", "#hashtag2", ...]
}`;
}

export function getLinkedInPostPrompt(
  trend: AITrend,
  competitorSummary: any
): string {
  return `Create a professional LinkedIn post for a CEO/leadership audience that combines AI trend insights with proven competitor engagement strategies.

AI TREND CONTEXT:
- Title: ${trend.title}
- Description: ${trend.description}
- Category: ${trend.category}
- Leadership Angle: ${trend.leadershipAngle || 'Strategic implications for business leaders'}
- Key Points: ${trend.keyPoints?.join('; ') || 'N/A'}

COMPETITOR INSIGHTS:
- Common Themes: ${competitorSummary.commonThemes?.join(', ') || 'N/A'}
- Engagement Patterns: ${competitorSummary.engagementPatterns?.join(', ') || 'N/A'}
- Tone: ${competitorSummary.toneAndStyle || 'Professional and engaging'}
- Hashtag Strategy: ${competitorSummary.hashtagStrategy?.join(', ') || 'N/A'}

CRITICAL REQUIREMENTS (IN ORDER OF PRIORITY):

1. **WORD COUNT - ABSOLUTE REQUIREMENT**:
   - Your post MUST be 180-220 words
   - This is NON-NEGOTIABLE. Posts shorter than 170 words will be rejected.
   - Allocate words strategically:
     * Hook/Opening: 25-35 words (attention-grabbing, compelling start)
     * Context/Explanation: 70-90 words (detailed explanation of AI trend, why it matters, specific examples)
     * Leadership Insight: 50-70 words (strategic implications, business impact, actionable perspectives)
     * Call-to-Action: 25-35 words (thought-provoking question or clear takeaway)
   - Write with SUBSTANCE and DEPTH. Provide specific insights, examples, or frameworks.
   - DO NOT write brief, superficial posts. Add details, context, and strategic thinking.

2. **Tone & Voice**:
   - Professional yet engaging, thought-leadership style
   - Match competitor tone: ${competitorSummary.toneAndStyle || 'Professional and engaging'}
   - Avoid buzzwords and overhype
   - Focus on actionable insights

3. **Structure & Formatting**:
   - Use line breaks for readability
   - Incorporate insights from competitor patterns: ${competitorSummary.engagementPatterns?.join(', ') || 'N/A'}

4. **Hashtags**: Include 3-5 relevant hashtags at the end, similar to: ${competitorSummary.hashtagStrategy?.join(', ') || '#AI #Leadership #Innovation'}

Return a JSON object with this exact structure:
{
  "content": "The full LinkedIn post text with line breaks",
  "hashtags": ["hashtag1", "hashtag2", "hashtag3", "hashtag4", "hashtag5"]
}

IMPORTANT: Return ONLY the JSON object, no markdown formatting or code blocks.`;
}

export function getDalleImagePrompt(trend: AITrend): string {
  const categoryStyles: Record<string, string> = {
    models: 'neural network, AI architecture visualization',
    techniques: 'abstract workflow, process diagram',
    applications: 'real-world use case, business integration',
    tools: 'modern tech interface, clean dashboard',
    research: 'scientific discovery, innovation concept',
    industry: 'market landscape, business transformation',
  };

  const styleHint = categoryStyles[trend.category] || 'tech innovation concept';

  // Extract a short catchy phrase from the title (max 6 words)
  const titleWords = trend.title.split(' ');
  const shortPhrase = titleWords.slice(0, Math.min(6, titleWords.length)).join(' ');

  return `Create a professional, minimalist LinkedIn meme-style image about: "${trend.title}".

Visual Style:
- Clean, modern, professional business/tech aesthetic
- Gradient background (subtle purple/blue tones preferred)
- ${styleHint}
- No human faces or specific people
- Abstract, conceptual representation
- High contrast, easy to read

Text Overlay:
- Include the text: "${shortPhrase}"
- Bold, sans-serif font
- White or light text on darker background
- Centered or positioned for visual balance

Mood: Thought-provoking, professional, innovative, forward-thinking

Format: Landscape orientation (1200x630px ideal for LinkedIn)`;
}
