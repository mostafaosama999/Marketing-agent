import * as admin from "firebase-admin";

/**
 * Generic Firestore read tool exposed to the model. Restricted to safe
 * read-only operations on a small allow-list of collections.
 *
 * Anything mutating goes through leadOpsTool with explicit shape.
 */

const ALLOWED_COLLECTIONS = new Set([
  "leads",
  "companies",
  "entities",
  "fieldDefinitions",
  "nikolaDiscovery",
  "nikolaContext",
]);

export interface FirestoreQueryArgs {
  collection: string;
  /** Optional simple equality filters: [["field", "value"], ...] */
  whereEquals?: Array<[string, string | number | boolean]>;
  /** Limit (default 10, max 50) */
  limit?: number;
  /** Field paths to return; if omitted, returns all */
  fields?: string[];
}

export async function firestoreQuery(args: FirestoreQueryArgs): Promise<{
  collection: string;
  count: number;
  docs: Array<{id: string} & Record<string, unknown>>;
  error?: string;
}> {
  if (!ALLOWED_COLLECTIONS.has(args.collection)) {
    return {
      collection: args.collection,
      count: 0,
      docs: [],
      error: `Collection not allowed. Allowed: ${[...ALLOWED_COLLECTIONS].join(", ")}`,
    };
  }
  const limit = Math.min(Math.max(args.limit || 10, 1), 50);
  let q: admin.firestore.Query = admin.firestore().collection(args.collection);
  for (const [field, val] of args.whereEquals || []) {
    q = q.where(field, "==", val);
  }
  q = q.limit(limit);
  try {
    const snap = await q.get();
    const docs: Array<{id: string} & Record<string, unknown>> = [];
    snap.forEach((d) => {
      const data = d.data() as Record<string, unknown>;
      const filtered: Record<string, unknown> = {};
      if (args.fields && args.fields.length > 0) {
        for (const f of args.fields) {
          if (f in data) filtered[f] = data[f];
        }
      } else {
        Object.assign(filtered, data);
      }
      docs.push({id: d.id, ...filtered});
    });
    return {collection: args.collection, count: docs.length, docs};
  } catch (e) {
    return {
      collection: args.collection,
      count: 0,
      docs: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
