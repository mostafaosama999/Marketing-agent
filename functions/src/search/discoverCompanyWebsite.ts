/**
 * OpenAI-powered Cloud Function for discovering company websites.
 * Used as a fallback when no website is found via field mapping or Apollo enrichment.
 * Uses gpt-4o-mini for extremely low cost (~$0.0001 per lookup).
 */

import * as functions from "firebase-functions";
import OpenAI from "openai";
import {
  extractTokenUsage,
  calculateCost,
  logApiCost,
} from "../utils/costTracker";

interface DiscoverWebsiteRequest {
  companyName: string;
}

interface DiscoverWebsiteResponse {
  website: string | null;
  source: "openai";
}

const MODEL = "gpt-4o-mini";

export const discoverCompanyWebsiteCloud = functions
  .runWith({timeoutSeconds: 30, memory: "256MB"})
  .https.onCall(
    async (
      data: DiscoverWebsiteRequest,
      context
    ): Promise<DiscoverWebsiteResponse> => {
      if (!context.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "You must be logged in to discover company websites"
        );
      }

      const {companyName} = data;

      if (
        !companyName ||
        typeof companyName !== "string" ||
        companyName.trim().length === 0
      ) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "companyName is required and must be a non-empty string"
        );
      }

      const openaiApiKey =
        functions.config().openai?.key || process.env.OPENAI_API_KEY;

      if (!openaiApiKey) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "OpenAI API key is not configured"
        );
      }

      const openai = new OpenAI({apiKey: openaiApiKey});
      const trimmedName = companyName.trim();

      try {
        const completion = await openai.chat.completions.create({
          model: MODEL,
          messages: [
            {
              role: "system",
              content:
                "You are a helpful assistant that finds company websites. " +
                "Return ONLY the URL (e.g. https://example.com) with no other text. " +
                "If you are not confident about the website, return exactly: UNKNOWN",
            },
            {
              role: "user",
              content:
                `What is the official website URL for the company "${trimmedName}"?`,
            },
          ],
          temperature: 0,
          max_tokens: 100,
        });

        const raw = completion.choices[0]?.message?.content?.trim() || "";

        // Track cost
        const tokenUsage = extractTokenUsage(completion);
        if (tokenUsage) {
          const costInfo = calculateCost(tokenUsage, MODEL);
          await logApiCost(context.auth.uid, "website-discovery", costInfo, {
            companyName: trimmedName,
          });
        }

        // Validate response looks like a URL
        if (!raw || raw === "UNKNOWN" || !raw.startsWith("http")) {
          functions.logger.info("No website found for company", {
            companyName: trimmedName,
            rawResponse: raw,
          });
          return {website: null, source: "openai"};
        }

        // Extract just the URL (in case the model added extra text)
        const urlMatch = raw.match(/https?:\/\/[^\s"',]+/);
        if (!urlMatch) {
          return {website: null, source: "openai"};
        }

        // Normalize to root domain
        try {
          const url = new URL(urlMatch[0]);
          const website = `${url.protocol}//${url.hostname}`;

          functions.logger.info("Discovered website via OpenAI", {
            companyName: trimmedName,
            website,
          });

          return {website, source: "openai"};
        } catch {
          return {website: null, source: "openai"};
        }
      } catch (error: any) {
        functions.logger.error("OpenAI website discovery failed", {
          companyName: trimmedName,
          error: error.message,
        });

        throw new functions.https.HttpsError(
          "internal",
          `Website discovery failed: ${error.message}`
        );
      }
    }
  );
