import * as functions from "firebase-functions";
import OpenAI from "openai";
import {logApiCost, calculateCost, extractTokenUsage} from "../utils/costTracker";

interface ParsedApplicant {
  name: string;
  email: string;
  phone: string;
  linkedInUrl: string;
  education: string;
  age: string;
  sex: string;
  availability: string;
  bio: string;
  formAnswers: Record<string, string>;
}

export const parseApplicantProfileCloud = functions
  .runWith({timeoutSeconds: 60, memory: "256MB"})
  .https.onCall(
    async (data: {rawText: string}, context): Promise<{parsed: ParsedApplicant; costInfo?: any}> => {
      if (!context.auth) {
        throw new functions.https.HttpsError("unauthenticated", "Authentication required");
      }

      const {rawText} = data;
      if (!rawText || rawText.trim().length < 20) {
        throw new functions.https.HttpsError("invalid-argument", "Please paste a candidate profile with enough information");
      }

      const openaiApiKey = functions.config().openai?.key || process.env.OPENAI_API_KEY;
      if (!openaiApiKey) {
        throw new functions.https.HttpsError("failed-precondition", "OpenAI API key not configured");
      }

      try {
        const openai = new OpenAI({apiKey: openaiApiKey});

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You extract structured candidate information from raw pasted text (typically from job boards like Wuzzuf, LinkedIn, or similar). Return a JSON object with these fields:

- name: Full name of the candidate
- email: Email address (if found)
- phone: Phone number(s), comma-separated if multiple
- linkedInUrl: LinkedIn profile URL (if found)
- education: University or educational institution name only (e.g. "Cairo University", "Ain Shams University")
- age: Age as a string (just the number, e.g. "27")
- sex: "Male" or "Female" (infer from name/pronouns if not explicit, leave empty if unsure)
- availability: Job type preference (e.g. "Full Time, Part Time", "Remote", "Full Time")
- bio: A concise 2-3 sentence summary of their experience, skills, and current role. Focus on what's relevant for a technical content writing position.
- formAnswers: An object mapping screening question labels to their answers. Extract any Q&A pairs you find. Use the question text as the key and the answer as the value.

Return ONLY valid JSON. If a field is not found, use an empty string "". Never make up information that isn't in the text.`,
            },
            {
              role: "user",
              content: rawText.substring(0, 8000), // Limit input size
            },
          ],
          temperature: 0.1,
          max_tokens: 1500,
          response_format: {type: "json_object"},
        });

        const tokenUsage = extractTokenUsage(completion);
        let costInfo;
        if (tokenUsage) {
          costInfo = calculateCost(tokenUsage, "gpt-4o-mini");
          await logApiCost(context.auth.uid, "applicant-profile-parse" as any, costInfo, {
            operationDetails: {textLength: rawText.length},
          });
        }

        const content = completion.choices[0]?.message?.content;
        if (!content) {
          throw new functions.https.HttpsError("internal", "No response from AI");
        }

        const parsed: ParsedApplicant = JSON.parse(content);

        return {parsed, costInfo};
      } catch (error: any) {
        if (error instanceof functions.https.HttpsError) throw error;
        console.error("Error parsing applicant profile:", error);
        throw new functions.https.HttpsError("internal", error.message || "Failed to parse profile");
      }
    }
  );
