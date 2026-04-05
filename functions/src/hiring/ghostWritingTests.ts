import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {sendHiringSlackMessage} from "../utils/slackUtils";

const GHOST_AFTER_DAYS = 4;

/**
 * Scheduled function that runs daily at 8 AM UTC.
 * Moves applicants stuck in `test_task` status for more than 4 days
 * to `not_responded` (ghosted).
 *
 * The 4-day window is measured from `updatedAt` (the time the applicant
 * was moved into test_task status).
 */
export const ghostStaleWritingTests = functions.pubsub
  .schedule("0 8 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    const db = admin.firestore();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - GHOST_AFTER_DAYS);

    const snapshot = await db
      .collection("applicants")
      .where("status", "==", "test_task")
      .where("updatedAt", "<=", cutoff)
      .get();

    if (snapshot.empty) {
      functions.logger.info("No stale writing tests found");
      return;
    }

    const batch = db.batch();
    const now = new Date();
    const ghostedNames: string[] = [];

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        status: "not_responded",
        updatedAt: now,
      });
      const data = doc.data();
      ghostedNames.push(data.name || data.email || doc.id);
    });

    await batch.commit();

    const message = [
      `👻 *${snapshot.size} candidate(s) ghosted* (no writing test response after ${GHOST_AFTER_DAYS} days)`,
      "",
      ...ghostedNames.map((name) => `• ${name}`),
      "",
      "Status changed: `test_task` → `not_responded`",
    ].join("\n");

    try {
      await sendHiringSlackMessage(message);
    } catch (err) {
      functions.logger.warn("Failed to send Slack notification for ghosted candidates:", err);
    }

    functions.logger.info(
      `Moved ${snapshot.size} applicant(s) from test_task to not_responded (ghosted after ${GHOST_AFTER_DAYS} days)`
    );
  });
