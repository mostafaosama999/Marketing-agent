import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {generateCustomIdeas} from "../utils/ideaGeneratorService";
import {CustomIdeaRequest, CustomIdeaResponse, GeneratedIdea} from "../types";
import {logApiCost} from "../utils/costTracker";

/**
 * Cloud function to generate custom content collaboration ideas
 * User provides their own prompt and receives 5-10 structured ideas
 */
export const generateCustomIdeasCloud = functions.https.onCall(
  async (data, context): Promise<CustomIdeaResponse> => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to generate ideas"
      );
    }

    // Validate input
    const {leadId, prompt, context: ideaContext} = data;

    if (!leadId || typeof leadId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Lead ID is required and must be a string"
      );
    }

    if (!prompt || typeof prompt !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Prompt is required and must be a string"
      );
    }

    if (prompt.length < 10) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Prompt must be at least 10 characters long"
      );
    }

    // Get OpenAI API key from environment config
    const openaiApiKey = functions.config().openai?.key || process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "OpenAI API key not configured. Run: firebase functions:config:set openai.key=YOUR_KEY"
      );
    }

    try {
      const request: CustomIdeaRequest = {
        leadId,
        prompt,
        context: ideaContext,
      };

      console.log(`Generating ideas for lead ${leadId}`);
      console.log(`Prompt: ${prompt.substring(0, 100)}...`);

      const {ideas, costInfo} = await generateCustomIdeas(request, openaiApiKey);

      console.log(`Generated ${ideas.length} ideas for lead ${leadId}`);

      // Create a session ID for this generation
      const sessionId = `session-${Date.now()}`;

      // Save all ideas to Firestore subcollection
      const db = admin.firestore();
      const ideasCollectionRef = db.collection("leads").doc(leadId).collection("ideas");

      // Batch write all ideas
      const batch = db.batch();

      ideas.forEach((idea) => {
        const ideaRef = ideasCollectionRef.doc(); // Auto-generate ID
        const ideaData: GeneratedIdea = {
          ...idea,
          id: ideaRef.id, // Use Firestore-generated ID
          sessionId,
        } as any; // Type assertion needed due to sessionId addition

        batch.set(ideaRef, {
          ...ideaData,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      await batch.commit();

      console.log(`Saved ${ideas.length} ideas to Firestore for lead ${leadId}`);

      // Log API cost
      if (costInfo && context.auth) {
        await logApiCost(
          context.auth.uid,
          "idea-generation",
          costInfo,
          {
            leadId,
            operationDetails: {
              sessionId,
              ideasGenerated: ideas.length,
              promptLength: prompt.length,
            },
          }
        );
      }

      // Update lead with metadata
      const leadRef = db.collection("leads").doc(leadId);
      await leadRef.update({
        hasGeneratedIdeas: true,
        lastIdeaGeneratedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        ideas,
        totalGenerated: ideas.length,
        costInfo,
        sessionId,
      };
    } catch (error: any) {
      console.error("Error generating ideas:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate ideas: ${error.message || "Unknown error"}`
      );
    }
  }
);

/**
 * Cloud function to fetch existing ideas for a lead
 */
export const getLeadIdeas = functions.https.onCall(
  async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to fetch ideas"
      );
    }

    const {leadId} = data;

    if (!leadId || typeof leadId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Lead ID is required and must be a string"
      );
    }

    try {
      const db = admin.firestore();
      const ideasSnapshot = await db
        .collection("leads")
        .doc(leadId)
        .collection("ideas")
        .orderBy("createdAt", "desc")
        .get();

      const ideas = ideasSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        ideas,
        total: ideas.length,
      };
    } catch (error: any) {
      console.error("Error fetching ideas:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to fetch ideas: ${error.message || "Unknown error"}`
      );
    }
  }
);

/**
 * Cloud function to update idea status (approve, attach, etc.)
 */
export const updateIdeaStatus = functions.https.onCall(
  async (data, context) => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to update ideas"
      );
    }

    const {leadId, ideaId, status} = data;

    if (!leadId || typeof leadId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Lead ID is required and must be a string"
      );
    }

    if (!ideaId || typeof ideaId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Idea ID is required and must be a string"
      );
    }

    if (!["pending", "approved", "attached"].includes(status)) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Status must be one of: pending, approved, attached"
      );
    }

    try {
      const db = admin.firestore();
      const ideaRef = db
        .collection("leads")
        .doc(leadId)
        .collection("ideas")
        .doc(ideaId);

      const updateData: any = {
        status,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (status === "attached") {
        updateData.attachedAt = admin.firestore.FieldValue.serverTimestamp();
      }

      await ideaRef.update(updateData);

      console.log(`Updated idea ${ideaId} status to ${status} for lead ${leadId}`);

      return {
        success: true,
        ideaId,
        status,
      };
    } catch (error: any) {
      console.error("Error updating idea status:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to update idea status: ${error.message || "Unknown error"}`
      );
    }
  }
);
