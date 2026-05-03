/**
 * onUpdate trigger on the `companies` collection. When a company's `industry`
 * field changes, propagate it to all linked `leads` (lead.companyIndustry).
 *
 * Why: the analyst skill answers questions like "industries by reply rate"
 * via a single query against `leads.companyIndustry`. Without this trigger,
 * industry edits in the CRM UI would leave leads with stale denormalized
 * values until the next backfill.
 *
 * Single user, low-frequency edits — no batching/throttling needed.
 */
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

interface CompanyDocShape {
  name?: string;
  industry?: string;
}

export const nikolaCompanyIndustrySync = functions
  .runWith({memory: "256MB", timeoutSeconds: 120})
  .firestore.document("companies/{companyId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as CompanyDocShape | undefined;
    const after = change.after.data() as CompanyDocShape | undefined;
    const beforeIndustry = before?.industry;
    const afterIndustry = after?.industry;
    if (beforeIndustry === afterIndustry) return null;

    const companyId = context.params.companyId;

    // Find all leads linked to this company by companyId OR by company name.
    // Use both because some legacy paths only set the name.
    const byId = admin
      .firestore()
      .collection("leads")
      .where("companyId", "==", companyId)
      .get();
    const byName = after?.name
      ? admin
          .firestore()
          .collection("leads")
          .where("company", "==", after.name)
          .get()
      : Promise.resolve(null);

    const [idSnap, nameSnap] = await Promise.all([byId, byName]);

    const leadIds = new Set<string>();
    idSnap.docs.forEach((d) => leadIds.add(d.id));
    if (nameSnap) nameSnap.docs.forEach((d) => leadIds.add(d.id));

    if (leadIds.size === 0) return null;

    // Batch update — Firestore allows 500 ops per batch, plenty for any
    // realistic company → leads fanout in this single-tenant CRM.
    const batch = admin.firestore().batch();
    for (const leadId of leadIds) {
      const ref = admin.firestore().collection("leads").doc(leadId);
      batch.set(
        ref,
        {
          companyIndustry: afterIndustry || admin.firestore.FieldValue.delete(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        {merge: true}
      );
    }
    await batch.commit();

    functions.logger.info("companyIndustrySync propagated", {
      companyId,
      beforeIndustry,
      afterIndustry,
      leadsUpdated: leadIds.size,
    });
    return null;
  });
