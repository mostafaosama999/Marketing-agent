import * as admin from "firebase-admin";
import {IDLE_PAUSE_DAYS} from "./config";
import {getState} from "./costGate";

/**
 * Returns true if the morning batch should be paused due to user inactivity.
 * Side effect: when triggered, sets nikolaState.paused=true with pausedReason='idle'.
 *
 * Triggers only when:
 *   - lastDecisionAt is more than IDLE_PAUSE_DAYS ago
 *   - AND there are open `pending` drafts (otherwise there's nothing to wait on)
 */
export async function shouldPauseForIdle(): Promise<boolean> {
  const state = await getState();
  if (state.paused) return true;
  if (!state.lastDecisionAt) return false;

  const cutoffMs = IDLE_PAUSE_DAYS * 24 * 60 * 60 * 1000;
  const ageMs = Date.now() - state.lastDecisionAt.toMillis();
  if (ageMs <= cutoffMs) return false;

  // Check for open pending drafts; if none, no reason to pause
  const pending = await admin
    .firestore()
    .collection("nikolaDrafts")
    .where("status", "==", "pending")
    .limit(1)
    .get();
  if (pending.empty) return false;

  await admin
    .firestore()
    .doc("nikolaState/singleton")
    .set(
      {
        paused: true,
        pausedReason: "idle",
        updatedAt: admin.firestore.Timestamp.now(),
      },
      {merge: true}
    );
  return true;
}
