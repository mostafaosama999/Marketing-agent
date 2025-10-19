import * as admin from "firebase-admin";

/**
 * OpenAI API Pricing (as of 2025)
 * GPT-4 Turbo: $10/1M input tokens, $30/1M output tokens
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

export interface ApiCostRecord {
  userId: string;
  leadId?: string;
  service: "blog-qualification" | "writing-program-finder" | "idea-generation";
  model: string;
  timestamp: admin.firestore.FieldValue;
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
 * Log API cost to Firestore
 */
export async function logApiCost(
  userId: string,
  service: "blog-qualification" | "writing-program-finder" | "idea-generation",
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
    const FieldValue = admin.firestore.FieldValue;

    // Create cost record
    const costRecord: ApiCostRecord = {
      userId,
      leadId: metadata.leadId,
      service,
      model: costInfo.model,
      timestamp: FieldValue.serverTimestamp(),
      inputTokens: costInfo.inputTokens,
      outputTokens: costInfo.outputTokens,
      totalCost: costInfo.totalCost,
      metadata: {
        companyName: metadata.companyName,
        website: metadata.website,
        operationDetails: metadata.operationDetails,
      },
    };

    // Save to apiCosts collection
    await db.collection("apiCosts").add(costRecord);

    console.log(
      `Logged API cost: $${costInfo.totalCost.toFixed(4)} for ${service} (user: ${userId})`
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
