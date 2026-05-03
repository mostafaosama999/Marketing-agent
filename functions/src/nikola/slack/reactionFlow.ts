import * as admin from "firebase-admin";
import {touchLastDecision} from "../costGate";
import {bdrChannelId} from "../config";
import {enqueueWork} from "../jobs/workQueueEnqueue";
import {confirmCandidate, rejectCandidate} from "../memory/extract";
import {
  DraftStatus,
  NikolaDraft,
  NikolaMemoryCandidate,
  NikolaPendingClarification,
  NikolaWorkKind,
} from "../types";
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

  // Check if this reaction is on a pending clarification notice first.
  // Clarifications are not drafts, so the draft lookup below would miss.
  const wasClarification = await tryHandleClarification(event);
  if (wasClarification) {
    await touchLastDecision();
    return;
  }

  // Or a multi-step confirmation gate.
  const wasMultiStep = await tryHandleMultiStepConfirmation(event);
  if (wasMultiStep) {
    await touchLastDecision();
    return;
  }

  // Or a memory candidate (Remember/Skip on a "💭 Want me to remember this?" message).
  const wasMemoryCandidate = await tryHandleMemoryCandidate(event);
  if (wasMemoryCandidate) {
    await touchLastDecision();
    return;
  }

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

/**
 * If the reacted-to message is a NikolaPendingClarification notice, resolve
 * it: 1️⃣ → enqueue work for the first candidate, 2️⃣ → second candidate,
 * ❌ → cancel. Updates the back-linked NikolaRoutingDecision so the audit row
 * reflects what was actually run. Returns true if the reaction was handled.
 */
async function tryHandleClarification(event: ReactionEvent): Promise<boolean> {
  const snap = await admin
    .firestore()
    .collection("nikolaPendingClarifications")
    .where("slackMessageTs", "==", event.item.ts)
    .limit(1)
    .get();
  if (snap.empty) return false;

  const ref = snap.docs[0].ref;
  const clarification = snap.docs[0].data() as NikolaPendingClarification;
  if (clarification.status !== "pending") return true; // already resolved/cancelled — swallow the reaction

  const r = event.reaction;
  let pickIndex: number | null = null;
  let cancel = false;
  if (r === "one") pickIndex = 0;
  else if (r === "two") pickIndex = 1;
  else if (r === DENY) cancel = true;
  else return false; // unrelated reaction (e.g. someone added 👍) — let other handlers see it

  const now = admin.firestore.Timestamp.now();
  if (cancel) {
    await ref.set(
      {status: "cancelled", resolvedAt: now} as Partial<NikolaPendingClarification>,
      {merge: true}
    );
    if (clarification.routingDecisionId) {
      await admin
        .firestore()
        .collection("nikolaRoutingDecisions")
        .doc(clarification.routingDecisionId)
        .set({matchedKind: "noop", wasCorrect: false}, {merge: true});
    }
    await postNotice("⛔ Got it — cancelled. Try rephrasing if you want me to take another shot.", clarification.slackThreadTs);
    return true;
  }

  if (pickIndex === null || pickIndex >= clarification.candidates.length) {
    return false;
  }
  const picked = clarification.candidates[pickIndex];

  await ref.set(
    {
      status: "resolved",
      resolvedKind: picked.kind,
      resolvedAt: now,
    } as Partial<NikolaPendingClarification>,
    {merge: true}
  );

  if (clarification.routingDecisionId) {
    await admin
      .firestore()
      .collection("nikolaRoutingDecisions")
      .doc(clarification.routingDecisionId)
      .set({matchedKind: picked.kind, wasCorrect: true}, {merge: true});
  }

  // Enqueue the picked kind as fresh work — keeps the existing dispatch path
  // honest (idempotency, cost gate, error handling all unchanged).
  await enqueueWork({
    kind: picked.kind as NikolaWorkKind,
    args: picked.args,
    source: "mention",
    mentionTs: clarification.slackThreadTs,
  });

  return true;
}

/**
 * Multi-step confirmation gate. The executor parked a confirmation block at
 * `confirmationContext.slackMessageTs` on the parent work doc. When Mostafa
 * reacts:
 *   ✅ → approve this step → spawn a child "multi-step" work doc with
 *        parentWorkId set; the executor resumes from cursor.
 *   ❌ → skip this step → mark cursor as skipped, spawn child to continue.
 *   💬 → cancel the rest of the plan → mark parent done.
 *
 * Returns true if the reacted message was a multi-step confirmation block.
 */
async function tryHandleMultiStepConfirmation(event: ReactionEvent): Promise<boolean> {
  const snap = await admin
    .firestore()
    .collection("nikolaWorkQueue")
    .where("kind", "==", "multi-step")
    .where("confirmationContext.slackMessageTs", "==", event.item.ts)
    .limit(1)
    .get();
  if (snap.empty) return false;

  const parentRef = snap.docs[0].ref;
  const parent = snap.docs[0].data() as {
    confirmationContext?: {stepIndex: number; slackMessageTs: string};
    skippedSteps?: number[];
    mentionTs?: string;
  };
  if (!parent.confirmationContext) return true; // already resolved

  const r = event.reaction;
  const SENT_REACTION = "white_check_mark";
  const DENY_REACTION = "x";
  const CANCEL_REACTION = "speech_balloon";

  if (r !== SENT_REACTION && r !== DENY_REACTION && r !== CANCEL_REACTION) {
    return false; // some other reaction — leave it for downstream handlers
  }

  const stepIndex = parent.confirmationContext.stepIndex;
  const skippedSteps = new Set(parent.skippedSteps || []);

  if (r === CANCEL_REACTION) {
    await parentRef.set(
      {
        confirmationContext: admin.firestore.FieldValue.delete(),
        cancelledAt: admin.firestore.Timestamp.now(),
        cancelledAtStep: stepIndex,
        // Parent moves out of "awaiting-confirmation" — analytical queries
        // shouldn't keep counting this as in-flight.
        status: "completed",
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      {merge: true}
    );
    await postNotice(
      `🚫 Plan cancelled at step ${stepIndex + 1}. Anything done so far stays; nothing further runs.`,
      parent.mentionTs
    );
    return true;
  }

  if (r === DENY_REACTION) {
    skippedSteps.add(stepIndex);
  }

  // Clear the confirmation gate and spawn a child work doc to resume.
  // The child carries `parentWorkId` from the start so the onCreate-triggered
  // executor sees the parent reference without a race.
  await parentRef.set(
    {
      confirmationContext: admin.firestore.FieldValue.delete(),
      skippedSteps: [...skippedSteps],
    },
    {merge: true}
  );
  await enqueueWork({
    kind: "multi-step",
    args: "",            // child carries no fresh args; state lives on parent
    source: "mention",
    mentionTs: parent.mentionTs,
    parentWorkId: parentRef.id,
  });

  return true;
}

/**
 * Memory candidate confirm/reject. ✅ → confirm + persist fact.
 * ❌ → reject. Other reactions are ignored on candidate messages.
 */
async function tryHandleMemoryCandidate(event: ReactionEvent): Promise<boolean> {
  const snap = await admin
    .firestore()
    .collection("nikolaMemoryCandidates")
    .where("slackMessageTs", "==", event.item.ts)
    .limit(1)
    .get();
  if (snap.empty) return false;
  const cand = snap.docs[0].data() as NikolaMemoryCandidate;
  if (cand.status !== "pending") return true; // already resolved — swallow

  const r = event.reaction;
  if (r === SENT) {
    await confirmCandidate(cand.id);
    // Acknowledge in the same thread the candidate message was posted in,
    // not the channel root. event.item.ts is the candidate message; it's
    // either threaded under the user's mention or top-level. Look it up.
    const threadTs = await resolveThreadTsForMessage(event.item.channel, event.item.ts);
    await postNotice(`💾 Saved: _${cand.text}_`, threadTs);
    return true;
  }
  if (r === DENY) {
    await rejectCandidate(cand.id);
    return true;
  }
  return false;
}

/**
 * For a posted message ts, resolve which thread to reply in. We stored the
 * mention's thread_ts on the parent work doc as `mentionTs`, but the memory
 * candidate doc only has the candidate's own slackMessageTs. Look up the
 * sourceWorkId → mentionTs to thread the ack correctly.
 */
async function resolveThreadTsForMessage(
  _channel: string,
  messageTs: string
): Promise<string | undefined> {
  try {
    const candSnap = await admin
      .firestore()
      .collection("nikolaMemoryCandidates")
      .where("slackMessageTs", "==", messageTs)
      .limit(1)
      .get();
    if (candSnap.empty) return undefined;
    const cand = candSnap.docs[0].data() as NikolaMemoryCandidate;
    const workSnap = await admin
      .firestore()
      .collection("nikolaWorkQueue")
      .doc(cand.sourceWorkId)
      .get();
    if (!workSnap.exists) return undefined;
    const work = workSnap.data() as {mentionTs?: string};
    return work.mentionTs;
  } catch {
    return undefined;
  }
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
