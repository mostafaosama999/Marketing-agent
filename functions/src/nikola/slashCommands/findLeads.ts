import * as admin from "firebase-admin";
import {runSkill} from "../skillRunner";
import {DiscoveryItem, renderDiscovery} from "../slack/messageBlocks";
import {postBlocks, postNotice} from "../slack/postDraft";
import {LeadDoc, NikolaDiscovery} from "../types";

/**
 * /nikola find-leads [focus]
 * Runs the lead-generation skill, persists discovered leads to `leads` collection
 * (with status='new_lead', outreach.linkedIn.status='not_sent'), records a
 * nikolaDiscovery doc, and posts a summary in #bdr.
 */
export async function handleFindLeads(args: string, threadTs?: string): Promise<void> {
  const focus = enrichFocusArea(args.trim() || "");
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
        // W7 — richer per-lead detail (preserved for the CRM frontend +
        // future generate-outreach runs that already have research baked in).
        whyGoodFit: item.whyGoodFit,
        whyMaybeNotFit: item.whyMaybeNotFit,
        topContentGap: item.topContentGap,
        signalsObserved: item.signalsObserved,
        recentBlogPostUrl: item.recentBlogPostUrl,
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

  // Pull the unqualified-discovery list (added in W6 schema). The model
  // populates this when it found candidates in search but couldn't fully
  // qualify them — surfaces names instead of hiding them in a paragraph.
  const discoveredButUnqualified =
    (result.metadata?.discoveredButUnqualified as Array<{
      companyName: string;
      website?: string | null;
      reason: string;
      source: string;
    }>) || [];

  // Build the rich Slack output. The renderer handles provider-failure
  // detection, detailed per-lead cards (w/ ICP rationale, hook, signals,
  // content gap), summary, and footer.
  const renderItems: DiscoveryItem[] = [
    ...items.map(
      (it) =>
        ({
          companyName: it.companyName as string | undefined,
          website: it.website as string | undefined,
          icpTier: it.icpTier as string | undefined,
          hookForOutreach: it.hookForOutreach as string | undefined,
          fundingSignal: it.fundingSignal as string | undefined,
          suggestedContactTitle: it.suggestedContactTitle as string | undefined,
          whyGoodFit: it.whyGoodFit as string | undefined,
          whyMaybeNotFit: (it.whyMaybeNotFit as string | null) ?? null,
          topContentGap: (it.topContentGap as string | null) ?? null,
          signalsObserved: (it.signalsObserved as string[] | undefined) || [],
          recentBlogPostUrl: (it.recentBlogPostUrl as string | null) ?? null,
        } as DiscoveryItem)
    ),
    // Append unqualified discoveries as additional rows so Mostafa sees them.
    ...discoveredButUnqualified.map(
      (d) =>
        ({
          companyName: d.companyName,
          website: d.website || undefined,
          icpTier: "unqualified",
          hookForOutreach: d.reason,
          whyGoodFit: `Surfaced via search (${d.source}) but not fully qualified.`,
          whyMaybeNotFit: d.reason,
        } as DiscoveryItem)
    ),
  ];

  const {text, blocks} = renderDiscovery({
    focus,
    items: renderItems,
    created,
    dupes,
    costUsd: result.costUsd,
    summary,
  });
  await postBlocks(text, blocks, threadTs);
}

/**
 * Pre-process the user-supplied focus before handing it to the lead-generation
 * skill. Specifically: when the user writes "similar to X" (or "like X" /
 * "matching X"), rewrite the focus so the model treats X as a *reference
 * archetype* — research X first to extract its domain/stage/audience signals
 * and find OTHERS with those traits, not X itself.
 *
 * Without this rewrite, gpt-4.1-mini reads "find companies similar to
 * Ultralytics" as "find companies named Ultralytics" and returns the very
 * company the user asked to find peers of (which then dedups against the
 * CRM, producing zero new leads).
 */
function enrichFocusArea(raw: string): string {
  if (!raw) return raw;

  // Match "similar to <Name>", "like <Name>", "matching <Name>". Capture the
  // name (allowing 1-3 words) up to the next punctuation or end of string.
  const re = /\b(?:similar to|like|matching)\s+([A-Z][\w.&-]*(?:\s+[A-Z][\w.&-]*){0,2})\b/i;
  const m = raw.match(re);
  if (!m) return raw;

  const archetype = m[1].trim();
  return (
    `${raw}\n\n` +
    `IMPORTANT: "${archetype}" is the ICP archetype, NOT a company to return. ` +
    `Research ${archetype} first (its product category, stage, employee size, ` +
    `developer audience, content cadence) and use those signals to find OTHER ` +
    `companies that share those traits. Explicitly EXCLUDE ${archetype} and any ` +
    `subsidiary/parent of ${archetype} from your output. Aim for 5-10 distinct ` +
    `peer companies that compete with or address the same audience as ${archetype}.`
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
