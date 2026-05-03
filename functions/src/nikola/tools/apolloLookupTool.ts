import * as admin from "firebase-admin";

/**
 * Read-only Apollo lookup — never spends Apollo credits. Surfaces the
 * existing apolloEnriched payload from a lead OR the apolloEnrichment from
 * a company. Triggering live Apollo enrichment is gated to /nikola enrich.
 */

export interface ApolloLookupArgs {
  leadId?: string;
  companyId?: string;
}

export async function apolloLookup(args: ApolloLookupArgs): Promise<{
  source: "lead" | "company" | "none";
  data?: Record<string, unknown>;
  error?: string;
}> {
  try {
    if (args.leadId) {
      const snap = await admin.firestore().collection("leads").doc(args.leadId).get();
      if (!snap.exists) return {source: "none", error: `Lead ${args.leadId} not found`};
      const data = (snap.data() as {apolloEnriched?: Record<string, unknown>}).apolloEnriched;
      return {source: "lead", data};
    }
    if (args.companyId) {
      const snap = await admin
        .firestore()
        .collection("companies")
        .doc(args.companyId)
        .get();
      if (!snap.exists)
        return {source: "none", error: `Company ${args.companyId} not found`};
      const data = (snap.data() as {apolloEnrichment?: Record<string, unknown>})
        .apolloEnrichment;
      return {source: "company", data};
    }
    return {source: "none", error: "Provide leadId or companyId"};
  } catch (e) {
    return {source: "none", error: e instanceof Error ? e.message : String(e)};
  }
}
