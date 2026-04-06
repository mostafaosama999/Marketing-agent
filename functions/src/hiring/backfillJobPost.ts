import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";

const db = admin.firestore();
const APPLICANTS_COLLECTION = "applicants";

// Cutoff: April 3, 2026 00:00 UTC
const CUTOFF_DATE = new Date("2026-04-03T00:00:00Z");

/**
 * One-time callable function to backfill jobPost on existing applicants.
 * Before April 3, 2026 → "20-30k", April 3+ → "30-40k"
 */
export const backfillJobPostCloud = functions
  .region("us-central1")
  .runWith({timeoutSeconds: 120, memory: "256MB"})
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const snapshot = await db.collection(APPLICANTS_COLLECTION).get();
    let updated = 0;
    let skipped = 0;
    const batch = db.batch();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.jobPost) {
        skipped++;
        continue;
      }

      let submittedAt: Date | null = null;
      if (data.submittedAt?.toDate) {
        submittedAt = data.submittedAt.toDate();
      } else if (data.createdAt?.toDate) {
        submittedAt = data.createdAt.toDate();
      }

      const jobPost = submittedAt && submittedAt >= CUTOFF_DATE ? "30-40k" : "20-30k";
      batch.update(doc.ref, {jobPost});
      updated++;

      // Firestore batches limited to 500
      if (updated % 450 === 0) {
        await batch.commit();
      }
    }

    await batch.commit();

    functions.logger.info("Backfill complete", {updated, skipped});
    return {updated, skipped, total: snapshot.size};
  });
