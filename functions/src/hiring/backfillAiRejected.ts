import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();
const APPLICANTS_COLLECTION = "applicants";

/**
 * One-shot callable to sweep existing AI-rejected applicants into the new
 * `ai_rejected` status. Only touches records that are BOTH:
 *   - aiScore.instantReject === true
 *   - status in ('applied', 'backlog')
 *
 * Explicitly SKIPS records already at status === 'rejected' so manual
 * rejections (with their rejectionStage / rejectionNote) are preserved.
 *
 * Run once after deploying the new frontend + scoreApplicantOnCreate.
 */
export const backfillAiRejectedCloud = functions
  .region("us-central1")
  .runWith({timeoutSeconds: 300, memory: "512MB"})
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const snapshot = await db
      .collection(APPLICANTS_COLLECTION)
      .where("aiScore.instantReject", "==", true)
      .get();

    let moved = 0;
    let skipped = 0;
    let batch = db.batch();
    let batchOps = 0;

    for (const doc of snapshot.docs) {
      const d = doc.data();
      if (d.status !== "applied" && d.status !== "backlog") {
        skipped++;
        continue;
      }
      batch.update(doc.ref, {
        status: "ai_rejected",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      moved++;
      batchOps++;
      if (batchOps >= 400) {
        await batch.commit();
        batch = db.batch();
        batchOps = 0;
      }
    }
    if (batchOps > 0) await batch.commit();

    console.log(`backfillAiRejected complete: moved=${moved}, skipped=${skipped}, scanned=${snapshot.size}`);
    return {moved, skipped, scanned: snapshot.size};
  });
