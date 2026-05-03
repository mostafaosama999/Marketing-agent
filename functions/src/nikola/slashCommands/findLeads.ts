import * as admin from "firebase-admin";
import {runSkill} from "../skillRunner";
import {postNotice} from "../slack/postDraft";
import {LeadDoc, NikolaDiscovery} from "../types";

/**
 * /nikola find-leads [focus]
 * Runs the lead-generation skill, persists discovered leads to `leads` collection
 * (with status='new_lead', outreach.linkedIn.status='not_sent'), records a
 * nikolaDiscovery doc, and posts a summary in #bdr.
 */
export async function handleFindLeads(args: string): Promise<void> {
  const focus = args.trim() || "";
  let result;
  try {
    result = await runSkill("lead-generation", {focusArea: focus});
  } catch (e) {
    await postNotice(`❌ Discovery failed: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }

  const items = (result.metadata?.leads as Array<Record<string, unknown>>) || [];
  const summary = (result.metadata?.summary as string) || "(no summary)";

  // Persist new leads (deduped against existing by name)
  let created = 0;
  let dupes = 0;
  for (const item of items) {
    const companyName = (item.companyName as string) || "";
    if (!companyName) continue;
    if (item.dedupeStatus === "duplicate-of-existing") {
      dupes++;
      continue;
    }
    const existing = await admin
      .firestore()
      .collection("leads")
      .where("company", "==", companyName)
      .limit(1)
      .get();
    if (!existing.empty) {
      dupes++;
      continue;
    }
    const ref = admin.firestore().collection("leads").doc();
    const now = admin.firestore.Timestamp.now();
    const lead: LeadDoc = {
      id: ref.id,
      company: companyName,
      status: ((item.icpTier as string) === "skip" ? "lost" : "new_lead") as LeadDoc["status"],
      outreach: {
        linkedIn: {status: "not_sent"},
        email: {status: "not_sent"},
      },
      customFields: {
        source: "nikola/find-leads",
        focusArea: focus,
        icpTier: item.icpTier,
        hookForOutreach: item.hookForOutreach,
        suggestedContactTitle: item.suggestedContactTitle,
        website: item.website,
        fundingSignal: item.fundingSignal,
      },
      createdAt: now,
      updatedAt: now,
    };
    await ref.set(lead);
    created++;
  }

  // Persist discovery run
  const discoveryRef = admin.firestore().collection("nikolaDiscovery").doc();
  const discovery: NikolaDiscovery = {
    id: discoveryRef.id,
    source: "lead-generation",
    focusArea: focus,
    items,
    runDate: admin.firestore.Timestamp.now(),
    triggeredBy: "mostafa",
    costUsd: result.costUsd,
  };
  await discoveryRef.set(discovery);

  await postNotice(
    `🌱 Discovery (${focus || "any"}): ${items.length} candidates, ${created} created, ${dupes} dedupes. Cost $${result.costUsd.toFixed(3)}.\n${summary}`
  );
}
