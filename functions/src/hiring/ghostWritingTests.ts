import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {sendHiringSlackMessage} from "../utils/slackUtils";

const DEADLINE_DAYS = 7;

// Statuses that should be ghosted if the 7-day deadline passes
const GHOSTABLE_STATUSES = ["test_task", "responded", "feedback"];

/**
 * Scheduled function that runs daily at 8 AM UTC.
 * Moves applicants in writing-test-related statuses (test_task, responded, feedback)
 * whose 7-day deadline has passed to `not_responded` (ghosted).
 *
 * The deadline is 7 days from whichever is available:
 *   - outreach.email.draftCreatedAt (when the test email was sent)
 *   - updatedAt (fallback)
 */
export const ghostStaleWritingTests = functions.pubsub
  .schedule("0 8 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    const db = admin.firestore();
    const now = new Date();

    // Query all writing-test-related applicants
    const snapshot = await db
      .collection("applicants")
      .where("status", "in", GHOSTABLE_STATUSES)
      .get();

    if (snapshot.empty) {
      functions.logger.info("No applicants in writing test statuses");
      return;
    }

    const batch = db.batch();
    const ghostedNames: string[] = [];

    snapshot.docs.forEach((doc) => {
      const data = doc.data();

      // Determine deadline base: email sent date or updatedAt
      const draftCreatedAt = data.outreach?.email?.draftCreatedAt?.toDate?.()
        || (data.outreach?.email?.draftCreatedAt
          ? new Date(data.outreach.email.draftCreatedAt)
          : null);
      const updatedAt = data.updatedAt?.toDate?.()
        || (data.updatedAt ? new Date(data.updatedAt) : null);

      const deadlineBase = draftCreatedAt || updatedAt;
      if (!deadlineBase) return;

      const deadline = new Date(deadlineBase.getTime() + DEADLINE_DAYS * 24 * 60 * 60 * 1000);

      if (now > deadline) {
        batch.update(doc.ref, {
          status: "not_responded",
          updatedAt: now,
        });
        ghostedNames.push(data.name || data.email || doc.id);
      }
    });

    if (ghostedNames.length === 0) {
      functions.logger.info("No overdue writing tests found");
      return;
    }

    await batch.commit();

    const message = [
      `👻 *${ghostedNames.length} candidate(s) ghosted* (writing test deadline exceeded ${DEADLINE_DAYS} days)`,
      "",
      ...ghostedNames.map((name) => `• ${name}`),
      "",
      "Status changed: → `not_responded`",
    ].join("\n");

    try {
      await sendHiringSlackMessage(message);
    } catch (err) {
      functions.logger.warn("Failed to send Slack notification for ghosted candidates:", err);
    }

    functions.logger.info(
      `Moved ${ghostedNames.length} applicant(s) from test_task to not_responded (deadline exceeded ${DEADLINE_DAYS} days)`
    );
  });
