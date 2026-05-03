import * as admin from "firebase-admin";
import {
  NikolaSlashPayloadSnapshot,
  NikolaWork,
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
}

export async function enqueueWork(input: EnqueueArgs): Promise<string> {
  const ref = admin.firestore().collection("nikolaWorkQueue").doc();
  const now = admin.firestore.Timestamp.now();
  const doc: NikolaWork = {
    id: ref.id,
    kind: input.kind,
    args: input.args || "",
    source: input.source,
    payload: input.payload,
    mentionTs: input.mentionTs,
    status: "pending",
    createdAt: now,
  };
  await ref.set(doc);
  return ref.id;
}
