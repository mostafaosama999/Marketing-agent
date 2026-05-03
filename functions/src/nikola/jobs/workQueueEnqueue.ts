import * as admin from "firebase-admin";
import {
  NikolaSlashPayloadSnapshot,
  NikolaWorkKind,
  NikolaWorkSource,
} from "../types";

/**
 * Writes a doc to nikolaWorkQueue. The Firestore onCreate trigger
 * (workQueueProcessor) will then run the work in its own execution context
 * — Firebase 1st-gen HTTP functions kill async work after the response, so
 * we have to hand off via Firestore.
 *
 * Returns the work doc id so the caller can include it in any ack message.
 */
export interface EnqueueArgs {
  kind: NikolaWorkKind;
  args: string;
  source: NikolaWorkSource;
  payload?: NikolaSlashPayloadSnapshot;
  mentionTs?: string;
  /** Multi-step resume: child doc points to the parent that holds plan state. */
  parentWorkId?: string;
}

export async function enqueueWork(input: EnqueueArgs): Promise<string> {
  const ref = admin.firestore().collection("nikolaWorkQueue").doc();
  const now = admin.firestore.Timestamp.now();
  // Build doc without undefined fields — Firestore rejects them by default.
  const doc: Record<string, unknown> = {
    id: ref.id,
    kind: input.kind,
    args: input.args || "",
    source: input.source,
    status: "pending",
    createdAt: now,
  };
  if (input.payload) doc.payload = input.payload;
  if (input.mentionTs) doc.mentionTs = input.mentionTs;
  if (input.parentWorkId) doc.parentWorkId = input.parentWorkId;
  await ref.set(doc);
  return ref.id;
}
