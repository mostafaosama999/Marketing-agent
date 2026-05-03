/**
 * onUpdate trigger on nikolaWorkQueue that fires the post-session memory
 * extractor when a work doc transitions from `processing` → `completed`.
 *
 * This is intentionally separate from the workQueueProcessor so the extract
 * call doesn't block the dispatch path's response time, and so a slow LLM
 * extraction can't time out the original work doc's run.
 */
import * as functions from "firebase-functions";
import {maybeExtractMemoryCandidates} from "../memory/extract";
import {NikolaWork} from "../types";

export const nikolaMemoryExtractor = functions
  .runWith({memory: "256MB", timeoutSeconds: 60})
  .firestore.document("nikolaWorkQueue/{workId}")
  .onUpdate(async (change) => {
    const before = change.before.data() as NikolaWork | undefined;
    const after = change.after.data() as NikolaWork | undefined;
    if (!before || !after) return null;

    // Only act on the pending → completed (or processing → completed) edge.
    if (before.status === "completed" || after.status !== "completed") return null;
    if (after.error) return null;

    try {
      await maybeExtractMemoryCandidates(after);
    } catch (e) {
      functions.logger.warn("memoryExtractor failed", {
        workId: after.id,
        error: e instanceof Error ? e.message : String(e),
      });
    }
    return null;
  });
