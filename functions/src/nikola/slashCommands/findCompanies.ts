import * as admin from "firebase-admin";
import {runSkill} from "../skillRunner";
import {postNotice} from "../slack/postDraft";
import {NikolaDiscovery, SkillName} from "../types";

/**
 * /nikola find-companies [focus]
 * Runs cwp-hunt + gig-hunt in parallel. Persists each as a nikolaDiscovery doc.
 * Posts a summary highlighting top items by fitScore.
 */
export async function handleFindCompanies(args: string): Promise<void> {
  const focus = args.trim() || "";
  const results = await Promise.allSettled([
    runWith("cwp-hunt", focus),
    runWith("gig-hunt", focus),
  ]);

  const lines: string[] = [`🌱 *find-companies (${focus || "any"})*`];
  let totalCost = 0;
  for (const r of results) {
    if (r.status === "rejected") {
      lines.push(`• ❌ failed: ${(r.reason as Error).message}`);
      continue;
    }
    lines.push(r.value.line);
    totalCost += r.value.costUsd;
  }
  lines.push(`Total cost: $${totalCost.toFixed(3)}`);
  await postNotice(lines.join("\n"));
}

async function runWith(skill: SkillName, focus: string): Promise<{line: string; costUsd: number}> {
  const result = await runSkill(skill, {focusArea: focus});
  const itemsKey = skill === "cwp-hunt" ? "programs" : "gigs";
  const items = (result.metadata?.[itemsKey] as Array<Record<string, unknown>>) || [];
  const summary = (result.metadata?.summary as string) || "";

  // Persist
  const ref = admin.firestore().collection("nikolaDiscovery").doc();
  const discovery: NikolaDiscovery = {
    id: ref.id,
    source: skill as NikolaDiscovery["source"],
    focusArea: focus,
    items,
    runDate: admin.firestore.Timestamp.now(),
    triggeredBy: "mostafa",
    costUsd: result.costUsd,
  };
  await ref.set(discovery);

  // Top items by fitScore
  const top = items
    .filter((x) => typeof x.fitScore === "number")
    .sort((a, b) => (b.fitScore as number) - (a.fitScore as number))
    .slice(0, 3)
    .map((x) => `  - ${x.companyName || x.title} (${x.fitScore})`);

  const line = `*${skill}*: ${items.length} found · cost $${result.costUsd.toFixed(3)}\n${top.join("\n")}\n_${summary}_`;
  return {line, costUsd: result.costUsd};
}
