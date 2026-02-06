/**
 * Send Slack notification after all offer idea versions (V1, V2, V3) complete
 */

import * as functions from "firebase-functions";
import {sendSlackMessage} from "../utils/slackUtils";

export const sendOfferSlackNotificationCloud = functions
  .runWith({
    timeoutSeconds: 30,
    memory: "256MB",
  })
  .https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated"
      );
    }

    const {companyName, v1Count, v2Count, v3Count, totalCost} = data;

    if (!companyName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "companyName is required"
      );
    }

    const parts = [
      `🔔 New offers generated for *${companyName}*`,
      `• V1: ${v1Count ?? 0} ideas`,
      `• V2: ${v2Count ?? 0} ideas`,
      `• V3: ${v3Count ?? 0} ideas`,
    ];

    if (totalCost != null && totalCost > 0) {
      parts.push(`💰 Total cost: $${Number(totalCost).toFixed(4)}`);
    }

    parts.push("CEO approval required.");

    try {
      await sendSlackMessage(parts.join("\n"));
      return {success: true};
    } catch (error: any) {
      console.warn("[Slack] Notification failed:", error.message);
      // Don't fail the function if Slack is down
      return {success: false, error: error.message};
    }
  });
