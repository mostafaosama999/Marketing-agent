import * as admin from "firebase-admin";
import {NikolaContextDoc} from "../types";

/**
 * Read nightly-synced context (Notion AI Context page + reports/companies snapshots).
 * The model can pull richer history than what skillLoader auto-attached.
 */

export interface ReadContextArgs {
  topic: string;
  /** Filter by source if known. */
  source?: "notion" | "report" | "context-file";
}

export async function readContext(args: ReadContextArgs): Promise<{
  topic: string;
  docs: Array<{source: string; topic: string; body: string; sourceUrl?: string}>;
  error?: string;
}> {
  try {
    let q: admin.firestore.Query = admin
      .firestore()
      .collection("nikolaContext")
      .where("topic", "==", args.topic);
    if (args.source) q = q.where("source", "==", args.source);
    const snap = await q.limit(5).get();
    const docs = snap.docs.map((d) => {
      const data = d.data() as NikolaContextDoc;
      return {
        source: data.source,
        topic: data.topic,
        body: data.body,
        sourceUrl: data.sourceUrl,
      };
    });
    return {topic: args.topic, docs};
  } catch (e) {
    return {
      topic: args.topic,
      docs: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
