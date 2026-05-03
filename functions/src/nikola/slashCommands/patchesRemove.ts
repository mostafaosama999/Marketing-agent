import * as admin from "firebase-admin";
import {SlashResponse} from "../slack/slashHandler";

/** Soft-delete a patch. */
export async function handlePatchesRemove(args: string): Promise<SlashResponse> {
  const id = args.trim();
  if (!id) {
    return {response_type: "ephemeral", text: "Usage: `/nikola patches remove <id>`"};
  }
  const ref = admin.firestore().collection("nikolaPatches").doc(id);
  const snap = await ref.get();
  if (!snap.exists) {
    return {response_type: "ephemeral", text: `Patch \`${id}\` not found.`};
  }
  await ref.set(
    {active: false, removedAt: admin.firestore.Timestamp.now()},
    {merge: true}
  );
  return {response_type: "ephemeral", text: `🗑️ Patch \`${id}\` removed.`};
}
