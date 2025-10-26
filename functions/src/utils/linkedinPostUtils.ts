import OpenAI from "openai";
import * as functions from "firebase-functions";
import { ExtractedContent } from "./contentExtractionUtils";
import { LINKEDIN_POST_CONDENSED_INSIGHTS, LINKEDIN_POST_SYSTEM_PROMPT } from "../prompts";

export interface LinkedInPost {
  content: string;
  wordCount: number;
  hashtags: string[];
}

export interface LinkedInPostGeneration {
  url: string;
  title: string;
  post1: LinkedInPost;
  post2: LinkedInPost;
  generatedAt: string;
}

// Lazy-initialize OpenAI (only when needed, not at import time)
let openaiInstance: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openaiInstance) {
    openaiInstance = new OpenAI({
      apiKey: functions.config().openai?.key || process.env.OPENAI_API_KEY || "",
    });
  }
  return openaiInstance;
}

/**
 * Generate LinkedIn posts from extracted content using the specified prompt
 */
export async function generateLinkedInPosts(extractedContent: ExtractedContent): Promise<LinkedInPostGeneration> {
  try {
    console.log(`🤖 Generating LinkedIn posts for: ${extractedContent.title}`);
    console.log(`📝 Content length: ${extractedContent.content.length} characters, ${extractedContent.wordCount} words`);

    // Build prompt using centralized template
    const prompt = LINKEDIN_POST_CONDENSED_INSIGHTS({
      content: extractedContent.content,
    });

    // Make the OpenAI API call
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: LINKEDIN_POST_SYSTEM_PROMPT
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error("No response from OpenAI API");
    }

    console.log(`✅ OpenAI response received (${response.length} characters)`);

    // Parse the JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(response);
    } catch (parseError) {
      console.error("❌ Failed to parse OpenAI response as JSON:", response);
      throw new Error(`Failed to parse OpenAI response: ${parseError}`);
    }

    // Validate the response structure
    if (!parsedResponse.post1 || !parsedResponse.post2) {
      throw new Error("Invalid response structure from OpenAI - missing post1 or post2");
    }

    // Extract hashtags from content if not provided separately
    const extractHashtags = (content: string): string[] => {
      const hashtagRegex = /#[\w\d]+/g;
      const matches = content.match(hashtagRegex);
      return matches ? matches.map(tag => tag.substring(1)) : [];
    };

    // Add the blog URL to the end of each post content
    const addUrlToContent = (content: string): string => {
      return content.trim() + `\n\nRead more: ${extractedContent.url}`;
    };

    // Create the result object
    const result: LinkedInPostGeneration = {
      url: extractedContent.url,
      title: extractedContent.title,
      post1: {
        content: addUrlToContent(parsedResponse.post1.content || ""),
        wordCount: addUrlToContent(parsedResponse.post1.content || "").split(/\s+/).length,
        hashtags: parsedResponse.post1.hashtags || extractHashtags(parsedResponse.post1.content || ""),
      },
      post2: {
        content: addUrlToContent(parsedResponse.post2.content || ""),
        wordCount: addUrlToContent(parsedResponse.post2.content || "").split(/\s+/).length,
        hashtags: parsedResponse.post2.hashtags || extractHashtags(parsedResponse.post2.content || ""),
      },
      generatedAt: new Date().toISOString(),
    };

    // Validate post lengths
    if (result.post1.wordCount < 150 || result.post2.wordCount < 150) {
      console.warn(`⚠️ Generated posts may be too short: Post1=${result.post1.wordCount} words, Post2=${result.post2.wordCount} words`);
    }

    console.log(`✅ LinkedIn posts generated successfully:`, {
      post1WordCount: result.post1.wordCount,
      post2WordCount: result.post2.wordCount,
      post1Hashtags: result.post1.hashtags.length,
      post2Hashtags: result.post2.hashtags.length,
    });

    return result;

  } catch (error) {
    console.error(`❌ Error generating LinkedIn posts for ${extractedContent.url}:`, error);
    throw new Error(`Failed to generate LinkedIn posts: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Generate LinkedIn posts with retry logic
 */
export async function generateLinkedInPostsWithRetry(
  extractedContent: ExtractedContent,
  maxRetries: number = 2
): Promise<LinkedInPostGeneration> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Attempt ${attempt}/${maxRetries} to generate LinkedIn posts`);
      return await generateLinkedInPosts(extractedContent);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`❌ Attempt ${attempt} failed:`, lastError.message);

      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        console.log(`⏱️ Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error("Failed to generate LinkedIn posts after all retries");
}

/**
 * Validate LinkedIn post content
 */
export function validateLinkedInPost(post: LinkedInPost): { isValid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check word count
  if (post.wordCount < 150) {
    issues.push(`Post too short: ${post.wordCount} words (minimum 150)`);
  }
  if (post.wordCount > 250) {
    issues.push(`Post too long: ${post.wordCount} words (maximum 250)`);
  }

  // Check for hashtags
  if (!post.hashtags || post.hashtags.length < 3) {
    issues.push(`Too few hashtags: ${post.hashtags?.length || 0} (minimum 3)`);
  }
  if (post.hashtags && post.hashtags.length > 8) {
    issues.push(`Too many hashtags: ${post.hashtags.length} (maximum 8)`);
  }

  // Check for emojis
  const emojiRegex = /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u;
  if (!emojiRegex.test(post.content)) {
    issues.push("No emojis found in post content");
  }

  // Check for numbered list
  const numberedListRegex = /\d+\./;
  if (!numberedListRegex.test(post.content)) {
    issues.push("No numbered list found in post");
  }

  // Check for question mark (engagement question)
  if (!post.content.includes("?")) {
    issues.push("No engagement question found");
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}