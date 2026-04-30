import * as admin from "firebase-admin";
import {sendHiringSlackMessage} from "../utils/slackUtils";

const APPLIED_NOTIFICATION_THRESHOLD = 5;
const COUNTER_DOC_PATH = "hiringConfig/notificationState";
const HIRING_BOARD_URL = "https://marketing-app-0149.ondigitalocean.app/hiring";

interface PendingEntry {
  id: string;
  name: string;
  queuedAt: admin.firestore.Timestamp;
}

interface NotificationState {
  pending: PendingEntry[];
  lastNotifiedAt: admin.firestore.Timestamp | null;
  totalNotifiedBatches: number;
}

/**
 * Records an applicant that just landed in `status='applied'` (i.e., survived
 * AI screening). Once the queue reaches APPLIED_NOTIFICATION_THRESHOLD, posts
 * a single Slack message to the hiring channel listing the batch and clears
 * the queue.
 *
 * Safe to call from inside `scoreApplicantOnCreate` — Slack/transaction errors
 * are swallowed so the scoring trigger never fails because of notifications.
 */
export async function recordAppliedApplicant(
  applicantId: string,
  applicantName: string
): Promise<void> {
  const db = admin.firestore();
  const ref = db.doc(COUNTER_DOC_PATH);

  let batchToNotify: PendingEntry[] | null = null;

  try {
    await db.runTransaction(async (tx) => {
      const snap = await tx.get(ref);
      const existing = (snap.exists ? snap.data() : null) as NotificationState | null;

      const pending: PendingEntry[] = existing?.pending ?? [];

      // De-dupe in case the trigger somehow fires twice for the same doc
      // (cold-start retries, manual re-runs).
      if (pending.some((p) => p.id === applicantId)) {
        return;
      }

      pending.push({
        id: applicantId,
        name: applicantName,
        queuedAt: admin.firestore.Timestamp.now(),
      });

      if (pending.length >= APPLIED_NOTIFICATION_THRESHOLD) {
        batchToNotify = pending;
        tx.set(ref, {
          pending: [],
          lastNotifiedAt: admin.firestore.FieldValue.serverTimestamp(),
          totalNotifiedBatches: admin.firestore.FieldValue.increment(1),
        }, {merge: true});
      } else {
        tx.set(ref, {
          pending,
          totalNotifiedBatches: existing?.totalNotifiedBatches ?? 0,
          lastNotifiedAt: existing?.lastNotifiedAt ?? null,
        }, {merge: true});
      }
    });
  } catch (err: any) {
    console.error(
      `[notifyAppliedThreshold] transaction failed for ${applicantId}:`,
      err?.message || err
    );
    return;
  }

  if (!batchToNotify) {
    console.log(
      `[notifyAppliedThreshold] queued ${applicantId} for review batch (threshold ${APPLIED_NOTIFICATION_THRESHOLD})`
    );
    return;
  }

  const lines = [
    `🎯 *${APPLIED_NOTIFICATION_THRESHOLD} new applicants ready for review* (passed AI screening)`,
    "",
    ...(batchToNotify as PendingEntry[]).map((p) => `• ${p.name}`),
    "",
    `Open the hiring board → ${HIRING_BOARD_URL}`,
  ];

  try {
    await sendHiringSlackMessage(lines.join("\n"));
    console.log(
      `[notifyAppliedThreshold] fired hiring batch notification for ${(batchToNotify as PendingEntry[]).length} applicants`
    );
  } catch (err: any) {
    console.error(
      "[notifyAppliedThreshold] Slack send failed (batch already cleared):",
      err?.message || err
    );
  }
}
