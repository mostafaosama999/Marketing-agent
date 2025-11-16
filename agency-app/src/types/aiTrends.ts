/**
 * AI Trends Analysis Types
 * Used for analyzing newsletter emails to identify AI/ML trends for LinkedIn posts
 */

export interface AITrend {
  id: string;
  title: string;
  description: string;
  category: 'models' | 'techniques' | 'applications' | 'tools' | 'research' | 'industry';
  relevanceScore: number; // 0-100
  keyPoints?: string[];
  sources?: string[]; // Email subjects/senders that mentioned this trend
  leadershipAngle?: string; // Suggested leadership perspective
}

export interface AITrendsSession {
  id: string;
  userId: string;
  trends: AITrend[];
  generatedAt: Date;
  emailCount: number;
  customPrompt?: string;
  totalCost: number;
  model: string; // e.g., "gpt-4-turbo-preview"
}

export interface AITrendsRequest {
  emailCount?: number; // Default: 50
  customPrompt?: string; // Override default prompt
}

export interface AITrendsResponse {
  success: boolean;
  session: AITrendsSession;
  message: string;
  costInfo: {
    promptTokens: number;
    completionTokens: number;
    totalCost: number;
  };
}

export interface AITrendsSettings {
  customPrompt?: string;
  defaultEmailCount?: number; // Default: 50
}

// Default prompt for AI trends analysis
export const DEFAULT_AI_TRENDS_PROMPT = `You are an AI trends analyst helping a LinkedIn thought leader create content about AI and leadership.

Analyze the following newsletter emails and identify the top AI and machine learning trends that would be suitable for creating LinkedIn posts about leadership, innovation, and strategic thinking.

For each trend:
1. Provide a clear, concise title
2. Write a 2-3 sentence description
3. Categorize it (models, techniques, applications, tools, research, industry)
4. Assign a relevance score (0-100) for leadership content
5. List 2-3 key points that leaders should understand
6. Suggest a leadership angle (how leaders can apply or think about this trend)

Focus on trends that:
- Are current and emerging (not outdated)
- Have practical implications for business leaders
- Can be explained to a non-technical executive audience
- Connect to themes like innovation, strategy, team building, or decision-making

Return the analysis as JSON with this structure:
{
  "trends": [
    {
      "title": "string",
      "description": "string",
      "category": "models" | "techniques" | "applications" | "tools" | "research" | "industry",
      "relevanceScore": number,
      "keyPoints": ["string", "string", "string"],
      "sources": ["string"],
      "leadershipAngle": "string"
    }
  ]
}

Limit to the top 5-10 most relevant trends.`;
