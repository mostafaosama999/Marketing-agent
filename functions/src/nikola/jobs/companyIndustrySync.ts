/**
 * onUpdate trigger on the `entities` collection. When an entity's
 * `customFields.company_type` field changes, propagate it to all linked
 * `leads` (lead.companyIndustry).
 *
 * Why: the analyst skill answers questions like "industries by reply rate"
 * via a single query against `leads.companyIndustry`. Without this trigger,
 * industry edits in the CRM UI would leave leads with stale denormalized
 * values until the next backfill.
 *
 * NOTE on collection name:
 *   - The CRM stores company-level data in `entities`, not `companies`
 *     (the latter is empty / vestigial). The lead-side FK is still called
 *     `companyId` for CRM-side semantic consistency, but it points at
 *     `entities/{id}`.
 *
 * NOTE on the industry field:
 *   - There is no top-level `industry` field on `entities`. The closest
 *     analog is `customFields.company_type` (e.g. "Data science", "SaaS").
 *     This trigger watches that path.
 *
 * Single user, low-frequency edits — no batching/throttling needed.
 */
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

interface EntityDocShape {
  name?: string;
  customFields?: {
    company_type?: string;
    [key: string]: unknown;
  };
}

export const nikolaCompanyIndustrySync = functions
  .runWith({memory: "256MB", timeoutSeconds: 120})
  .firestore.document("entities/{entityId}")
  .onUpdate(async (change, context) => {
    const before = change.before.data() as EntityDocShape | undefined;
    const after = change.after.data() as EntityDocShape | undefined;
    const beforeIndustry = before?.customFields?.company_type;
    const afterIndustry = after?.customFields?.company_type;
    if (beforeIndustry === afterIndustry) return null;

    const entityId = context.params.entityId;

    // Find all leads linked to this entity by companyId (FK) OR by company name.
    // Use both because some legacy paths only set the name.
    const byId = admin
      .firestore()
      .collection("leads")
      .where("companyId", "==", entityId)
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
    // realistic entity → leads fanout in this single-tenant CRM.
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
      entityId,
      beforeIndustry,
      afterIndustry,
      leadsUpdated: leadIds.size,
    });
    return null;
  });
