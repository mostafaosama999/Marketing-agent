import * as admin from "firebase-admin";

/**
 * Generic Firestore read tool exposed to the model. Restricted to safe
 * read-only operations on a small allow-list of collections.
 *
 * W2: extended with range filters (whereRange), count aggregation
 * (countOnly: true), and access to nikolaWorkQueue / nikolaDrafts /
 * nikolaSkillRuns / nikolaRoutingDecisions / nikolaPendingClarifications /
 * nikolaMemory / nikolaMemoryCandidates so the analyst skill can answer
 * pipeline questions.
 *
 * Anything mutating goes through leadOpsTool with explicit shape.
 */

/**
 * Allowed collections for the `firestore_query` tool.
 *
 * NOTE: `companies` is intentionally excluded. The CRM stores company-level
 * data in `entities`, not `companies` (the latter is empty / vestigial).
 * Lead.companyId values are FKs into `entities`. Always query `entities`.
 */
const ALLOWED_COLLECTIONS = new Set([
  "leads",
  "entities",
  "fieldDefinitions",
  "nikolaDiscovery",
  "nikolaContext",
  // W2 additions — read-only access to Nikola operational state.
  "nikolaWorkQueue",
  "nikolaDrafts",
  "nikolaSkillRuns",
  "nikolaRoutingDecisions",
  "nikolaPendingClarifications",
  "nikolaMemory",
  "nikolaMemoryCandidates",
  "nikolaState",
  "nikolaPatches",
  "nikolaThreads",
]);

export type RangeOp = ">" | ">=" | "<" | "<=";

export interface FirestoreQueryArgs {
  collection: string;
  /** Equality filters as {field, value} objects — AND-combined. */
  whereEquals?: Array<{field: string; value: string | number | boolean}>;
  /**
   * Range filters with op + ISO-8601 timestamp or numeric value. Firestore
   * limits range filters to a single field per query — caller is responsible
   * for keeping ranges all on the same field.
   */
  whereRange?: Array<{field: string; op: RangeOp; value: string | number}>;
  /**
   * If true, return only the count via Firestore's count() aggregation —
   * cheaper and faster than fetching docs. Mutually exclusive with `fields`.
   */
  countOnly?: boolean;
  /** Limit (default 10, max 50). Ignored when countOnly is true. */
  limit?: number;
  /** Field paths to return; if omitted, returns all */
  fields?: string[];
}

export type FirestoreQueryResult =
  | {
      collection: string;
      mode: "docs";
      count: number;
      docs: Array<{id: string} & Record<string, unknown>>;
      error?: string;
    }
  | {
      collection: string;
      mode: "count";
      count: number;
      error?: string;
    }
  | {
      collection: string;
      mode: "error";
      count: 0;
      docs: never[];
      error: string;
    };

function coerceRangeValue(v: string | number): string | number | admin.firestore.Timestamp {
  if (typeof v === "number") return v;
  // ISO-8601 timestamp → Firestore Timestamp. Anything else passes through as a string.
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?$/.test(v)) {
    const ms = Date.parse(v);
    if (!Number.isNaN(ms)) {
      return admin.firestore.Timestamp.fromMillis(ms);
    }
  }
  return v;
}

export async function firestoreQuery(args: FirestoreQueryArgs): Promise<FirestoreQueryResult> {
  if (!ALLOWED_COLLECTIONS.has(args.collection)) {
    return {
      collection: args.collection,
      mode: "error",
      count: 0,
      docs: [],
      error: `Collection not allowed. Allowed: ${[...ALLOWED_COLLECTIONS].join(", ")}`,
    };
  }
  let q: admin.firestore.Query = admin.firestore().collection(args.collection);
  for (const filter of args.whereEquals || []) {
    if (filter && typeof filter === "object" && "field" in filter) {
      q = q.where(filter.field, "==", filter.value);
    }
  }
  for (const filter of args.whereRange || []) {
    if (filter && typeof filter === "object" && "field" in filter && "op" in filter) {
      q = q.where(filter.field, filter.op, coerceRangeValue(filter.value));
    }
  }

  try {
    if (args.countOnly) {
      const agg = await q.count().get();
      return {
        collection: args.collection,
        mode: "count",
        count: agg.data().count,
      };
    }
    const limit = Math.min(Math.max(args.limit || 10, 1), 50);
    const snap = await q.limit(limit).get();
    const docs: Array<{id: string} & Record<string, unknown>> = [];
    snap.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      const filtered: Record<string, unknown> = {};
      if (args.fields && args.fields.length > 0) {
        for (const f of args.fields) {
          // Support dotted field paths like "outreach.linkedIn.status"
          const parts = f.split(".");
          let cursor: unknown = data;
          for (const p of parts) {
            if (cursor && typeof cursor === "object" && p in (cursor as Record<string, unknown>)) {
              cursor = (cursor as Record<string, unknown>)[p];
            } else {
              cursor = undefined;
              break;
            }
          }
          if (cursor !== undefined) filtered[f] = cursor;
        }
      } else {
        Object.assign(filtered, data);
      }
      docs.push({id: d.id, ...filtered});
    });
    return {collection: args.collection, mode: "docs", count: docs.length, docs};
  } catch (e) {
    return {
      collection: args.collection,
      mode: "error",
      count: 0,
      docs: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
