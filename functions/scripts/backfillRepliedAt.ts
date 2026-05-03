// One-shot backfill: stamp outreach.<channel>.repliedAt / openedAt /
// refusedAt / noResponseAt for leads whose status reflects one of those
// transitions but predates the W2 instrumentation rollout.
//
// Strategy: for each affected channel+status, where the corresponding
// timestamp field is missing, set it to lead.updatedAt as a best-available
// proxy. Logs per-row what was filled so the approximation is visible.
//
// Safe to re-run — only touches leads where the timestamp field is absent.
//
// Run: cd functions && npx tsx scripts/backfillRepliedAt.ts
//
// Project: marketing-app-cc237 (Marketing-agent's Firebase project — NOT
// the sibling Agent repo's ai-adv-5e502).

import * as admin from "firebase-admin";

admin.initializeApp({projectId: "marketing-app-cc237"});

const db = admin.firestore();

type Channel = "linkedIn" | "email";
type StatusToField = Record<string, string>;

// Maps a status value to the timestamp field that should be stamped.
// Mirrors TIMESTAMP_FIELD_FOR_STATUS in nikola/tools/leadOpsTool.ts.
const STATUS_FIELD: StatusToField = {
  // sent → sentAt is already populated for everyone (existing instrumentation).
  // Skip it here.
  opened: "openedAt",
  replied: "repliedAt",
  refused: "refusedAt",
  no_response: "noResponseAt",
};

const CHANNELS: Channel[] = ["linkedIn", "email"];

interface UpdateLog {
  leadId: string;
  channel: Channel;
  status: string;
  timestampField: string;
  proxySource: "updatedAt" | "createdAt" | "now";
}

async function main() {
  let totalUpdated = 0;
  const samples: UpdateLog[] = [];

  for (const channel of CHANNELS) {
    for (const [status, tsField] of Object.entries(STATUS_FIELD)) {
      const path = `outreach.${channel}.${tsField}`;
      const statusPath = `outreach.${channel}.status`;
      const snap = await db.collection("leads").where(statusPath, "==", status).get();

      if (snap.empty) continue;

      let batch = db.batch();
      let pending = 0;
      for (const doc of snap.docs) {
        const data = doc.data() as Record<string, unknown>;
        const outreach = (data.outreach as Record<string, Record<string, unknown>>) || {};
        const channelObj = outreach[channel] || {};
        if (channelObj[tsField]) continue; // already populated, skip

        const proxy =
          (data.updatedAt as admin.firestore.Timestamp | undefined) ||
          (data.createdAt as admin.firestore.Timestamp | undefined) ||
          admin.firestore.Timestamp.now();
        const proxySource: UpdateLog["proxySource"] = data.updatedAt
          ? "updatedAt"
          : data.createdAt
            ? "createdAt"
            : "now";

        batch.set(
          doc.ref,
          {outreach: {[channel]: {[tsField]: proxy}}},
          {merge: true}
        );
        pending++;
        totalUpdated++;
        if (samples.length < 20) {
          samples.push({
            leadId: doc.id,
            channel,
            status,
            timestampField: tsField,
            proxySource,
          });
        }
        if (pending >= 400) {
          await batch.commit();
          batch = db.batch();
          pending = 0;
        }
      }
      if (pending > 0) await batch.commit();
      console.log(`  ${channel}.${status} → ${path}: scanned ${snap.size}, updated.`);
    }
  }

  console.log(`\nTotal rows updated: ${totalUpdated}`);
  if (samples.length > 0) {
    console.log("\nSample (first 20):");
    for (const s of samples) {
      console.log(`  ${s.leadId}  ${s.channel}.${s.status} ← ${s.timestampField} (proxy: ${s.proxySource})`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
