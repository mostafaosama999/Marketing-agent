import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";

/**
 * OpenAI API Pricing (as of 2025)
 * GPT-4 Turbo: $10/1M input tokens, $30/1M output tokens
 * GPT-4o-mini: $0.15/1M input tokens, $0.60/1M output tokens
 * DALL-E 3: $0.040 per image (standard 1024x1024), $0.080 per image (HD 1024x1024)
 */
const MODEL_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4-turbo-preview": {
    input: 0.01 / 1000, // $0.01 per 1K tokens = $10 per 1M tokens
    output: 0.03 / 1000, // $0.03 per 1K tokens = $30 per 1M tokens
  },
  "gpt-4-turbo": {
    input: 0.01 / 1000,
    output: 0.03 / 1000,
  },
  "gpt-4": {
    input: 0.03 / 1000,
    output: 0.06 / 1000,
  },
  "gpt-4o-mini": {
    input: 0.00015 / 1000, // $0.15 per 1M tokens
    output: 0.0006 / 1000, // $0.60 per 1M tokens
  },
};

/**
 * DALL-E 3 Pricing (flat rate per image, not token-based)
 */
export const DALLE_PRICING = {
  "dall-e-3": {
    standard: 0.040, // $0.040 per 1024x1024 standard quality image
    hd: 0.080,       // $0.080 per 1024x1024 HD quality image
  },
};

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CostInfo {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;
  outputCost: number;
  totalCost: number;
  model: string;
}

export type ServiceType =
  | "blog-qualification"
  | "writing-program-finder"
  | "writing-program-analyzer"
  | "genai-blog-idea"
  | "competitor-search"
  | "linkedin-post-generation"
  | "linkedin-analytics-extraction"
  | "competitor-posts-extraction"
  | "linkedin-post-from-trend"
  | "linkedin-meme-image";

export interface ApiCostRecord {
  userId: string;
  leadId?: string;
  service: ServiceType;
  model: string;
  timestamp: FieldValue;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  metadata: {
    companyName?: string;
    website?: string;
    operationDetails?: Record<string, any>;
  };
}

/**
 * Calculate cost from token usage
 */
export function calculateCost(
  tokenUsage: TokenUsage,
  model: string
): CostInfo {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["gpt-4-turbo-preview"];

  const inputCost = tokenUsage.inputTokens * pricing.input;
  const outputCost = tokenUsage.outputTokens * pricing.output;
  const totalCost = inputCost + outputCost;

  return {
    inputTokens: tokenUsage.inputTokens,
    outputTokens: tokenUsage.outputTokens,
    totalTokens: tokenUsage.totalTokens,
    inputCost,
    outputCost,
    totalCost,
    model,
  };
}

/**
 * Map service names to categories for users.apiUsage.ai.breakdown
 */
const SERVICE_TO_CATEGORY: Record<string, string> = {
  "blog-qualification": "blogAnalysis",
  "writing-program-finder": "writingProgram",
  "writing-program-analyzer": "writingProgram",
  "genai-blog-idea": "ideaGeneration",
  "competitor-search": "competitorAnalysis",
  "linkedin-post-generation": "contentGeneration",
  "linkedin-analytics-extraction": "linkedInAnalytics",
  "competitor-posts-extraction": "competitorAnalysis",
  "linkedin-post-from-trend": "contentGeneration",
  "linkedin-meme-image": "contentGeneration",
};

/**
 * Log API cost to Firestore
 * Updates BOTH apiCosts collection (detailed records) AND users.apiUsage (dashboard aggregates)
 */
export async function logApiCost(
  userId: string,
  service: ServiceType,
  costInfo: CostInfo,
  metadata: {
    leadId?: string;
    companyName?: string;
    website?: string;
    operationDetails?: Record<string, any>;
  }
): Promise<void> {
  try {
    const db = admin.firestore();

    // Create cost record - only include defined values (Firestore rejects undefined)
    const costRecord: any = {
      userId,
      service,
      model: costInfo.model,
      timestamp: FieldValue.serverTimestamp(),
      inputTokens: costInfo.inputTokens,
      outputTokens: costInfo.outputTokens,
      totalCost: costInfo.totalCost,
      metadata: {},
    };

    // Only add optional fields if they're defined
    if (metadata.leadId !== undefined) {
      costRecord.leadId = metadata.leadId;
    }
    if (metadata.companyName !== undefined) {
      costRecord.metadata.companyName = metadata.companyName;
    }
    if (metadata.website !== undefined) {
      costRecord.metadata.website = metadata.website;
    }
    if (metadata.operationDetails !== undefined) {
      costRecord.metadata.operationDetails = metadata.operationDetails;
    }

    // Save to apiCosts collection (detailed audit trail)
    await db.collection("apiCosts").add(costRecord);

    console.log(
      `Logged API cost: $${costInfo.totalCost.toFixed(4)} for ${service} (user: ${userId})`
    );

    // Update user's aggregated API usage stats (for dashboard)
    const userRef = db.collection("users").doc(userId);
    const category = SERVICE_TO_CATEGORY[service] || "other";

    await userRef.update({
      "apiUsage.ai.totalCost": FieldValue.increment(costInfo.totalCost),
      "apiUsage.ai.totalTokens": FieldValue.increment(costInfo.totalTokens),
      "apiUsage.ai.totalCalls": FieldValue.increment(1),
      "apiUsage.ai.lastUpdated": FieldValue.serverTimestamp(),
      [`apiUsage.ai.breakdown.${category}.cost`]: FieldValue.increment(costInfo.totalCost),
      [`apiUsage.ai.breakdown.${category}.tokens`]: FieldValue.increment(costInfo.totalTokens),
      [`apiUsage.ai.breakdown.${category}.calls`]: FieldValue.increment(1),
    });

    console.log(
      `Updated user ${userId} API usage: +$${costInfo.totalCost.toFixed(4)} (${costInfo.totalTokens} tokens, ${category})`
    );

    // Update lead's total API costs if leadId provided
    if (metadata.leadId) {
      const leadRef = db.collection("leads").doc(metadata.leadId);
      await leadRef.update({
        totalApiCosts: FieldValue.increment(costInfo.totalCost),
        lastApiCostUpdate: FieldValue.serverTimestamp(),
      });

      console.log(
        `Updated lead ${metadata.leadId} total API costs (+$${costInfo.totalCost.toFixed(4)})`
      );
    }
  } catch (error) {
    console.error("Error logging API cost:", error);
    // Don't throw - cost tracking shouldn't break the main operation
  }
}

/**
 * Extract token usage from OpenAI response
 */
export function extractTokenUsage(response: any): TokenUsage | null {
  try {
    if (response.usage) {
      return {
        inputTokens: response.usage.prompt_tokens || 0,
        outputTokens: response.usage.completion_tokens || 0,
        totalTokens: response.usage.total_tokens || 0,
      };
    }
    return null;
  } catch (error) {
    console.error("Error extracting token usage:", error);
    return null;
  }
}

/**
 * Format cost for display
 */
export function formatCost(cost: number): string {
  if (cost < 0.01) {
    return `$${(cost * 100).toFixed(2)}¢`;
  }
  return `$${cost.toFixed(4)}`;
}

/**
 * Get user's total API costs
 */
export async function getUserTotalCosts(userId: string): Promise<number> {
  try {
    const db = admin.firestore();
    const snapshot = await db
      .collection("apiCosts")
      .where("userId", "==", userId)
      .get();

    let total = 0;
    snapshot.forEach((doc) => {
      const data = doc.data();
      total += data.totalCost || 0;
    });

    return total;
  } catch (error) {
    console.error("Error getting user total costs:", error);
    return 0;
  }
}

/**
 * Get lead's total API costs
 */
export async function getLeadTotalCosts(leadId: string): Promise<number> {
  try {
    const db = admin.firestore();
    const leadDoc = await db.collection("leads").doc(leadId).get();

    if (leadDoc.exists) {
      const data = leadDoc.data();
      return data?.totalApiCosts || 0;
    }

    return 0;
  } catch (error) {
    console.error("Error getting lead total costs:", error);
    return 0;
  }
}
