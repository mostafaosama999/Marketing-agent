import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();
const APPLICANTS_COLLECTION = "applicants";

interface ApplicantInput {
  name: string;
  email: string;
  phone?: string;
  linkedInUrl?: string;
  bio?: string;
  formAnswers?: Record<string, string>;
  submittedAt?: string;
}

export const importApplicantsCloud = functions
  .runWith({timeoutSeconds: 120, memory: "512MB"})
  .https
  .onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "You must be logged in to import applicants"
      );
    }

    const applicants: ApplicantInput[] = data.applicants;
    if (!Array.isArray(applicants) || applicants.length === 0) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Must provide a non-empty array of applicants"
      );
    }

    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    // Get existing emails for dedup
    const existingSnapshot = await db.collection(APPLICANTS_COLLECTION).get();
    const existingEmails = new Set<string>();
    existingSnapshot.forEach((doc) => {
      const email = doc.data().email;
      if (email) existingEmails.add(email.toLowerCase());
    });

    // Process in batches of 500 (Firestore limit)
    const batch = db.batch();
    let batchCount = 0;

    for (const applicant of applicants) {
      try {
        if (!applicant.email || !applicant.name) {
          errors++;
          continue;
        }

        if (existingEmails.has(applicant.email.toLowerCase())) {
          duplicates++;
          continue;
        }

        const docRef = db.collection(APPLICANTS_COLLECTION).doc();
        batch.set(docRef, {
          name: applicant.name,
          email: applicant.email,
          phone: applicant.phone || "",
          linkedInUrl: applicant.linkedInUrl || "",
          bio: applicant.bio || "",
          status: "applied",
          score: null,
          notes: "",
          formAnswers: applicant.formAnswers || {},
          source: "csv_import",
          submittedAt: applicant.submittedAt
            ? new Date(applicant.submittedAt)
            : admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        existingEmails.add(applicant.email.toLowerCase());
        imported++;
        batchCount++;

        // Commit batch at 500
        if (batchCount >= 500) {
          await batch.commit();
          batchCount = 0;
        }
      } catch (err) {
        functions.logger.error("Error importing applicant", {
          email: applicant.email,
          error: err,
        });
        errors++;
      }
    }

    // Commit remaining
    if (batchCount > 0) {
      await batch.commit();
    }

    functions.logger.info("CSV import completed", {
      imported,
      duplicates,
      errors,
      userId: context.auth.uid,
    });

    return {success: true, imported, duplicates, errors};
  });
