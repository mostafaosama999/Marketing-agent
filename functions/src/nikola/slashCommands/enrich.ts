import * as admin from "firebase-admin";
import {postNotice} from "../slack/postDraft";

/**
 * /nikola enrich <leadId>
 *
 * Triggers Apollo enrichment for a lead. Wraps Marketing-agent's existing
 * enrichOrganizationCloud / searchPeopleCloud flow.
 *
 * NOTE: enrichOrganizationCloud is an onCall function expecting Firebase Auth.
 * From Nikola we call the underlying logic directly via admin SDK.
 *
 * v1 implementation: surfaces the existing apolloEnriched on the lead's
 * company; if not yet enriched, posts a message asking the user to run
 * the existing CRM UI's enrichment for now (real Apollo call wiring is
 * deferred to v1.1 to keep blast radius small).
 */
export async function handleEnrich(args: string, threadTs?: string): Promise<void> {
  const leadId = args.trim();
  if (!leadId) {
    await postNotice("Usage: `/nikola enrich <leadId>`", threadTs);
    return;
  }
  const snap = await admin.firestore().collection("leads").doc(leadId).get();
  if (!snap.exists) {
    await postNotice(`Lead ${leadId} not found.`, threadTs);
    return;
  }
  const lead = snap.data() as Record<string, unknown>;
  const enriched = lead.apolloEnriched as Record<string, unknown> | undefined;
  if (enriched && Object.keys(enriched).length > 0) {
    await postNotice(
      `Lead ${leadId} already has Apollo data. ` +
        `Snapshot: employees ${(enriched.employeeCount as number) || "?"}, industries ${
          ((enriched.industries as string[] | undefined) || []).join(", ") || "?"
        }.`,
      threadTs
    );
    return;
  }

  // For v1 we do NOT auto-call Apollo from here (saves credits).
  // The Marketing-agent UI's existing enrichOrganization callable handles the spend.
  await postNotice(
    `Lead ${leadId} is not yet enriched. ` +
      `Open the lead in the CRM UI to trigger Apollo enrichment ` +
      `(or call \`enrichOrganizationCloud\` directly with \`{leadId}\`).`,
    threadTs
  );
}
