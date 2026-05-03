import * as admin from "firebase-admin";
import {touchLastDecision} from "../costGate";
import {bdrChannelId} from "../config";
import {DraftStatus, NikolaDraft} from "../types";
import {postNotice} from "./postDraft";

interface ReactionEvent {
  user: string;
  reaction: string;            // Slack reaction name (no colons), e.g. "white_check_mark"
  item: {type: "message"; channel: string; ts: string};
  event_ts: string;
}

const PICK_MAP: Record<string, 1 | 2 | 3> = {
  one: 1,
  two: 2,
  three: 3,
};

const SENT = "white_check_mark";
const DENY = "x";
const REVISE = "speech_balloon";

export async function handleReaction(event: ReactionEvent): Promise<void> {
  if (event.item.channel !== bdrChannelId()) return;
  // Find the draft by message ts
  const snap = await admin
    .firestore()
    .collection("nikolaDrafts")
    .where("slackMessageTs", "==", event.item.ts)
    .where("slackChannelId", "==", event.item.channel)
    .limit(1)
    .get();
  if (snap.empty) return;
  const ref = snap.docs[0].ref;
  const draft = snap.docs[0].data() as NikolaDraft;

  const r = event.reaction;
  if (PICK_MAP[r]) {
    await onPick(ref, draft, PICK_MAP[r]);
  } else if (r === SENT) {
    await onSent(ref, draft);
  } else if (r === DENY) {
    await onDeny(ref, draft);
  } else if (r === REVISE) {
    await onRevise(ref, draft);
  } else {
    return; // unknown reaction
  }
  await touchLastDecision();
}

async function appendStatus(
  ref: FirebaseFirestore.DocumentReference,
  status: DraftStatus,
  note?: string
): Promise<void> {
  const now = admin.firestore.Timestamp.now();
  await ref.set(
    {
      status,
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status,
        at: now,
        by: "mostafa",
        note: note || null,
      }),
      decidedAt: status === "sent" || status === "denied" ? now : undefined,
      updatedAt: now,
    },
    {merge: true}
  );
}

async function onPick(
  ref: FirebaseFirestore.DocumentReference,
  draft: NikolaDraft,
  picked: 1 | 2 | 3
): Promise<void> {
  if (picked > draft.variants.length) return;
  await ref.set(
    {
      selectedVariant: picked,
      status: "selected" as DraftStatus,
      statusHistory: admin.firestore.FieldValue.arrayUnion({
        status: "selected",
        at: admin.firestore.Timestamp.now(),
        by: "mostafa",
        note: `Picked variant ${picked}`,
      }),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {merge: true}
  );
  // Reply in thread acknowledging selection — no message edit (cleaner audit log)
  await postNotice(`🎯 Selected Variant ${picked}. React ✅ once sent.`, draft.slackMessageTs);
}

async function onSent(ref: FirebaseFirestore.DocumentReference, draft: NikolaDraft): Promise<void> {
  // Require selectedVariant if variants > 1
  if (draft.variants.length > 1 && !draft.selectedVariant) {
    await postNotice(
      `⚠️ Pick a variant first (1️⃣/2️⃣/3️⃣) before marking sent.`,
      draft.slackMessageTs
    );
    return;
  }
  await appendStatus(ref, "sent" as DraftStatus, `Marked sent by Mostafa`);

  // Update lead's outreach state — nested convention used by Marketing-agent's createDraft.ts
  if (draft.leadId) {
    const channelKey = draft.channel === "linkedin" ? "linkedIn" : "email";
    await admin
      .firestore()
      .collection("leads")
      .doc(draft.leadId)
      .set(
        {
          outreach: {
            [channelKey]: {
              status: "sent",
              sentAt: admin.firestore.FieldValue.serverTimestamp(),
              nikolaDraftId: ref.id,
            },
          },
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true}
      );
    // Append timeline
    await admin
      .firestore()
      .collection("leads")
      .doc(draft.leadId)
      .collection("timeline")
      .add({
        type: "outreach_sent",
        channel: draft.channel,
        nikolaDraftId: ref.id,
        variant: draft.selectedVariant || 1,
        at: admin.firestore.FieldValue.serverTimestamp(),
        by: "nikola",
      });
  }

  await postNotice(":rocket: Tracked. Outreach marked sent.", draft.slackMessageTs);
}

async function onDeny(ref: FirebaseFirestore.DocumentReference, draft: NikolaDraft): Promise<void> {
  await appendStatus(ref, "denied" as DraftStatus, "Skipped by Mostafa");
  await postNotice("⛔ Skipped. Reply in thread within 5min if you want me to learn why.", draft.slackMessageTs);
}

async function onRevise(ref: FirebaseFirestore.DocumentReference, draft: NikolaDraft): Promise<void> {
  await appendStatus(ref, "revising" as DraftStatus, "Awaiting revision direction");
  await postNotice(
    "✏️ What should I change? Reply in this thread and I'll redraft.",
    draft.slackMessageTs
  );
}
