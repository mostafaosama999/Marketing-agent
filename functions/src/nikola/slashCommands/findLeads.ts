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
export async function handleFindLeads(args: string, threadTs?: string): Promise<void> {
  const focus = args.trim() || "";
  let result;
  try {
    result = await runSkill("lead-generation", {focusArea: focus});
  } catch (e) {
    await postNotice(`❌ Discovery failed: ${e instanceof Error ? e.message : String(e)}`, threadTs);
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
    // Pull industry from the discovery item if present, else look up on
    // entities (customFields.company_type — no top-level industry field).
    const industryFromItem = (item.industry as string) || (item.industryName as string) || undefined;
    const companyIndustry =
      industryFromItem || (await lookupCompanyIndustry(companyName));
    const lead: LeadDoc = {
      id: ref.id,
      company: companyName,
      companyIndustry,
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

  // When the model returns 0 candidates and its summary mentions provider
  // failures, append an explicit, actionable note. The tool layer already
  // returns directive errors ("BOTH SEARCH PROVIDERS FAILED. Firecrawl: ...
  // Apify-fallback: ..."), but the model often paraphrases those into vague
  // phrases like "insufficient API credits" — Mostafa shouldn't have to dig
  // through logs to know which provider to top up.
  const summaryLower = summary.toLowerCase();
  const looksLikeProviderFailure =
    summaryLower.includes("insufficient credit") ||
    summaryLower.includes("api credit") ||
    summaryLower.includes("both search providers") ||
    summaryLower.includes("web search") && summaryLower.includes("fail");
  const note =
    items.length === 0 && looksLikeProviderFailure
      ? "\n\n⚠️ *Web search providers are out of credit.* Top up Firecrawl at " +
        "<https://firecrawl.dev/account|firecrawl.dev/account> or Apify at " +
        "<https://apify.com/account/billing|apify.com/account/billing> — they " +
        "fall back to each other, so restoring either one will get this working."
      : "";
  await postNotice(
    `🌱 Discovery (${focus || "any"}): ${items.length} candidates, ${created} created, ${dupes} dedupes. Cost $${result.costUsd.toFixed(3)}.\n${summary}${note}`,
    threadTs
  );
}

/**
 * Look up industry on the matching `entities` doc. Industry on entities lives
 * at `customFields.company_type` (e.g. "Data science", "SaaS"); there is no
 * top-level `industry` field. Returns undefined if no entity matches.
 */
async function lookupCompanyIndustry(companyName: string): Promise<string | undefined> {
  if (!companyName) return undefined;
  try {
    const snap = await admin
      .firestore()
      .collection("entities")
      .where("name", "==", companyName)
      .limit(1)
      .get();
    if (snap.empty) return undefined;
    const data = snap.docs[0].data() as {customFields?: {company_type?: string}};
    return data.customFields?.company_type || undefined;
  } catch {
    return undefined;
  }
}
