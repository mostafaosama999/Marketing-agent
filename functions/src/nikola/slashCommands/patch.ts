import * as admin from "firebase-admin";
import {SlashResponse} from "../slack/slashHandler";
import {NikolaPatch, SkillName} from "../types";

const VALID_SKILLS: SkillName[] = [
  "generate-outreach",
  "sales",
  "lead-generation",
  "humanize",
  "cwp-hunt",
  "cwp-apply",
  "gig-hunt",
  "learn",
];

/**
 * /nikola patch <skill>: <rule>
 *
 * Permanent rule appended to the skill's system prompt on every future run.
 * Soft-delete via /nikola patches remove <id>.
 */
export async function handlePatch(args: string): Promise<SlashResponse> {
  const m = args.match(/^([a-zA-Z\-]+)\s*:\s*(.+)$/);
  if (!m) {
    return {
      response_type: "ephemeral",
      text: "Usage: `/nikola patch <skill>: <rule>`. Example: `/nikola patch generate-outreach: never use the word leverage`",
    };
  }
  const skill = m[1].trim() as SkillName;
  const rule = m[2].trim();
  if (!VALID_SKILLS.includes(skill)) {
    return {
      response_type: "ephemeral",
      text: `Unknown skill \`${skill}\`. Valid: ${VALID_SKILLS.join(", ")}`,
    };
  }
  if (rule.length < 5) {
    return {response_type: "ephemeral", text: "Rule too short."};
  }
  const ref = admin.firestore().collection("nikolaPatches").doc();
  const now = admin.firestore.Timestamp.now();
  const patch: NikolaPatch = {
    id: ref.id,
    skillName: skill,
    rule,
    active: true,
    addedAt: now,
    addedBy: "mostafa",
  };
  await ref.set(patch);
  return {
    response_type: "ephemeral",
    text: `✅ Patch added to \`${skill}\` (id \`${ref.id}\`). Active on next run.`,
  };
}
