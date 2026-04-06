import * as functions from "firebase-functions/v1";
import * as admin from "firebase-admin";
import {readFromTab} from "../utils/sheetsUtils";
import {normalizeLinkedInUrl} from "../utils/linkedInNormalize";

const db = admin.firestore();
const APPLICANTS_COLLECTION = "applicants";
const HIRING_SHEET_ID = "1rs-yLkcHUcL9hNBNAdtOxlkiORlqDAuvLG6kqtFOtlY";
const OUTREACH_TAB = "Outreach";

/**
 * Parse the Outreach sheet into a set of normalized LinkedIn URLs and emails.
 * Dynamically finds column indices from the header row.
 */
async function loadRecruiterSheet(): Promise<{
  linkedInUrls: Set<string>;
  emails: Set<string>;
  rowCount: number;
}> {
  const {values} = await readFromTab(HIRING_SHEET_ID, OUTREACH_TAB);

  if (!values || values.length < 2) {
    return {linkedInUrls: new Set(), emails: new Set(), rowCount: 0};
  }

  // Find column indices from header row
  const header = values[0].map((h: string) => (h || "").toLowerCase().trim());
  const linkedInCol = header.findIndex(
    (h: string) => h.includes("linkedin")
  );
  const emailCol = header.findIndex(
    (h: string) => h.includes("email")
  );

  if (linkedInCol === -1) {
    throw new Error("Could not find LinkedIn column in Outreach sheet header");
  }

  const linkedInUrls = new Set<string>();
  const emails = new Set<string>();
  const dataRows = values.slice(1);

  for (const row of dataRows) {
    const rawLinkedIn = (row[linkedInCol] || "").trim();
    if (rawLinkedIn) {
      const normalized = normalizeLinkedInUrl(rawLinkedIn);
      if (normalized) linkedInUrls.add(normalized);
    }

    if (emailCol !== -1) {
      const rawEmail = (row[emailCol] || "").trim().toLowerCase();
      if (rawEmail) emails.add(rawEmail);
    }
  }

  return {linkedInUrls, emails, rowCount: dataRows.length};
}

/**
 * Core matching logic: check all applicants against recruiter sheet data.
 * Returns stats about what was matched.
 */
async function matchAndFlag(): Promise<{
  matched: number;
  alreadyFlagged: number;
  total: number;
  sheetRows: number;
}> {
  const {linkedInUrls, emails, rowCount} = await loadRecruiterSheet();

  functions.logger.info("Recruiter sheet loaded", {
    linkedInUrls: linkedInUrls.size,
    emails: emails.size,
    sheetRows: rowCount,
  });

  const snapshot = await db.collection(APPLICANTS_COLLECTION).get();
  let matched = 0;
  let alreadyFlagged = 0;
  let batch = db.batch();
  let batchCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();

    // Skip already flagged
    if (data.recruiterSourced === true) {
      alreadyFlagged++;
      continue;
    }

    // Primary match: LinkedIn URL
    const applicantLinkedIn = normalizeLinkedInUrl(data.linkedInUrl || "");
    let isMatch = applicantLinkedIn !== "" && linkedInUrls.has(applicantLinkedIn);

    // Secondary match: email
    if (!isMatch && data.email) {
      const applicantEmail = data.email.trim().toLowerCase();
      isMatch = applicantEmail !== "" && emails.has(applicantEmail);
    }

    if (isMatch) {
      batch.update(doc.ref, {recruiterSourced: true});
      matched++;
      batchCount++;

      // Firestore batches limited to 500 — commit and create new batch
      if (batchCount >= 450) {
        await batch.commit();
        batch = db.batch();
        batchCount = 0;
      }
    }
  }

  if (batchCount > 0) {
    await batch.commit();
  }

  // Persist the outreach sheet count so the frontend can show the real top-of-funnel
  await db.doc("hiringConfig/default").set(
    {recruiterOutreachCount: rowCount},
    {merge: true}
  );

  return {matched, alreadyFlagged, total: snapshot.size, sheetRows: rowCount};
}

/**
 * One-time callable function to backfill recruiterSourced on existing applicants.
 */
export const backfillRecruiterAttributionCloud = functions
  .region("us-central1")
  .runWith({timeoutSeconds: 120, memory: "256MB"})
  .https.onCall(async (_data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError("unauthenticated", "Auth required");
    }

    const result = await matchAndFlag();
    functions.logger.info("Recruiter attribution backfill complete", result);
    return result;
  });

/**
 * Scheduled function: sync recruiter attribution every 6 hours.
 */
export const syncRecruiterAttributionScheduled = functions
  .pubsub.schedule("0 */6 * * *")
  .timeZone("UTC")
  .onRun(async () => {
    const result = await matchAndFlag();
    functions.logger.info("Recruiter attribution sync complete", result);

    if (result.matched > 0) {
      functions.logger.info(
        `Newly attributed ${result.matched} applicant(s) to recruiter`
      );
    }
  });
