// src/prompts/linkedinPosts.ts
// AI prompts for generating LinkedIn posts from technical articles

import { PromptTemplate, createPrompt } from './types';

/**
 * Variables for the condensed insights LinkedIn post prompt
 */
export interface CondensedInsightsVariables {
  content: string;
}

/**
 * System prompt for LinkedIn post generation
 */
export const LINKEDIN_POST_SYSTEM_PROMPT = `You are a senior content marketing expert specializing in technical content for LinkedIn. You excel at creating engaging, data-driven posts that resonate with technical professionals. You always follow instructions precisely and create content that is ready for immediate publication.

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

Each post must be 180-220 words, include specific data points from the article, use emojis naturally, have 4-6 numbered takeaways, end with an engagement question, and include 4-6 niche hashtags.`;

/**
 * LinkedIn post generation using "condensed insights with value hooks" technique
 * Creates 2 different post variations from a technical article
 */
export const LINKEDIN_POST_CONDENSED_INSIGHTS: PromptTemplate<CondensedInsightsVariables> = ({ content }) => {
  return `${content}

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
I want you to create 2 different linkedin posts I can choose from`;
};

/**
 * Wrapped version with metadata for versioning/tracking
 */
export const condensedInsightsPrompt = createPrompt<CondensedInsightsVariables>(
  LINKEDIN_POST_CONDENSED_INSIGHTS,
  {
    name: 'LinkedIn Post - Condensed Insights',
    description: 'Generates 2 LinkedIn posts from technical articles using the condensed insights with value hooks technique',
    version: '1.0.0',
    author: 'Marketing Team',
    tags: ['linkedin', 'content-generation', 'technical-writing'],
  }
);
