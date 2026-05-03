import * as admin from "firebase-admin";
import {runSkill} from "../skillRunner";
import {HuntSubResult, renderHunt} from "../slack/messageBlocks";
import {postBlocks} from "../slack/postDraft";
import {NikolaDiscovery, SkillName} from "../types";

/**
 * /nikola find-companies [focus]
 * Runs cwp-hunt + gig-hunt in parallel. Persists each as a nikolaDiscovery doc.
 * Posts a Block Kit-formatted summary with per-source breakdown + top items.
 */
export async function handleFindCompanies(args: string, threadTs?: string): Promise<void> {
  const focus = args.trim() || "";
  const settled = await Promise.allSettled([
    runWith("cwp-hunt", focus),
    runWith("gig-hunt", focus),
  ]);

  const subResults: HuntSubResult[] = settled.map((r, i) => {
    const skillName = i === 0 ? "cwp-hunt" : "gig-hunt";
    if (r.status === "rejected") {
      return {
        skillName,
        itemCount: 0,
        costUsd: 0,
        topItems: [],
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      };
    }
    return r.value;
  });

  const totalCost = subResults.reduce((sum, r) => sum + r.costUsd, 0);
  const {text, blocks} = renderHunt({focus, results: subResults, totalCostUsd: totalCost});
  await postBlocks(text, blocks, threadTs);
}

async function runWith(skill: SkillName, focus: string): Promise<HuntSubResult> {
  const result = await runSkill(skill, {focusArea: focus});
  const itemsKey = skill === "cwp-hunt" ? "programs" : "gigs";
  const items = (result.metadata?.[itemsKey] as Array<Record<string, unknown>>) || [];
  const summary = (result.metadata?.summary as string) || "";

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

  const topItems = items
    .filter((x) => typeof x.fitScore === "number")
    .sort((a, b) => (b.fitScore as number) - (a.fitScore as number))
    .slice(0, 3)
    .map((x) => ({
      companyName: x.companyName as string | undefined,
      title: x.title as string | undefined,
      fitScore: x.fitScore as number | undefined,
    }));

  return {
    skillName: skill,
    itemCount: items.length,
    costUsd: result.costUsd,
    topItems,
    summary,
  };
}
