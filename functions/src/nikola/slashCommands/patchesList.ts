import * as admin from "firebase-admin";
import {SlashResponse} from "../slack/slashHandler";
import {NikolaPatch} from "../types";

export async function handlePatchesList(): Promise<SlashResponse> {
  const snap = await admin
    .firestore()
    .collection("nikolaPatches")
    .where("active", "==", true)
    .get();
  if (snap.empty) {
    return {response_type: "ephemeral", text: "No active patches."};
  }
  const patches = snap.docs.map((d) => ({id: d.id, ...(d.data() as Omit<NikolaPatch, "id">)}));
  patches.sort((a, b) => a.skillName.localeCompare(b.skillName));
  const lines = patches.map((p) => `• \`${p.id}\` · *${p.skillName}* — ${p.rule}`);
  return {
    response_type: "ephemeral",
    text: `*Active patches (${patches.length})*\n${lines.join("\n")}`,
  };
}
