import * as admin from "firebase-admin";
import {ResearchSession, ResearchStep} from "../types";

const db = admin.firestore();

/**
 * Create a new research session in Firestore
 */
export async function createResearchSession(
  sessionData: Partial<ResearchSession>
): Promise<string> {
  const sessionRef = db.collection("research_sessions").doc();
  const sessionId = sessionRef.id;

  const session: ResearchSession = {
    id: sessionId,
    companyUrl: sessionData.companyUrl || "",
    status: "pending",
    steps: sessionData.steps || [],
    createdAt: new Date(),
    ...sessionData,
  };

  await sessionRef.set(session);
  return sessionId;
}

/**
 * Update research session in Firestore
 */
export async function updateResearchSession(
  sessionId: string,
  updates: Partial<ResearchSession>
): Promise<void> {
  const sessionRef = db.collection("research_sessions").doc(sessionId);
  await sessionRef.update(updates);
}

/**
 * Update a specific step in the research session
 */
export async function updateResearchStep(
  sessionId: string,
  stepIndex: number,
  stepUpdates: Partial<ResearchStep>
): Promise<void> {
  const sessionRef = db.collection("research_sessions").doc(sessionId);
  const session = await sessionRef.get();

  if (!session.exists) {
    throw new Error(`Session ${sessionId} not found`);
  }

  const sessionData = session.data() as ResearchSession;
  const steps = [...sessionData.steps];
  steps[stepIndex] = {...steps[stepIndex], ...stepUpdates};

  await sessionRef.update({steps});
}

/**
 * Get research session by ID
 */
export async function getResearchSession(
  sessionId: string
): Promise<ResearchSession | null> {
  const sessionRef = db.collection("research_sessions").doc(sessionId);
  const session = await sessionRef.get();

  if (!session.exists) {
    return null;
  }

  return session.data() as ResearchSession;
}

/**
 * List recent research sessions
 */
export async function listRecentSessions(
  limit = 10
): Promise<ResearchSession[]> {
  const snapshot = await db
    .collection("research_sessions")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => doc.data() as ResearchSession);
}