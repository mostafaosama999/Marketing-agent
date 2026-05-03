import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {COST_CAP_USD, COST_WARN_USD} from "./config";
import {NikolaState} from "./types";

const STATE_DOC = "nikolaState/singleton";

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

/**
 * Reads nikolaState. Auto-rolls over MTD on month change.
 * Creates the doc on first call.
 */
export async function getState(): Promise<NikolaState> {
  const ref = admin.firestore().doc(STATE_DOC);
  const snap = await ref.get();
  const now = admin.firestore.Timestamp.now();
  if (!snap.exists) {
    const fresh: NikolaState = {
      mtdCostUsd: 0,
      mtdMonth: currentMonth(),
      paused: false,
      updatedAt: now,
    };
    await ref.set(fresh);
    return fresh;
  }
  const state = snap.data() as NikolaState;
  if (state.mtdMonth !== currentMonth()) {
    const rolled: NikolaState = {
      ...state,
      mtdCostUsd: 0,
      mtdMonth: currentMonth(),
      updatedAt: now,
    };
    await ref.set(rolled, {merge: true});
    return rolled;
  }
  return state;
}

/**
 * Throws if MTD cost is at/over the hard cap. Call this BEFORE every runSkill.
 * Returns void for happy path.
 */
export async function assertCostBudget(): Promise<void> {
  const state = await getState();
  if (state.paused && state.pausedReason === "cost_cap") {
    throw new functions.https.HttpsError(
      "resource-exhausted",
      `Nikola is paused due to cost cap ($${COST_CAP_USD}/mo). Run /nikola resume to override.`
    );
  }
  if (state.mtdCostUsd >= COST_CAP_USD) {
    // Set paused state so subsequent calls fail fast without reading cost again
    await admin.firestore().doc(STATE_DOC).set(
      {paused: true, pausedReason: "cost_cap", updatedAt: admin.firestore.Timestamp.now()},
      {merge: true}
    );
    throw new functions.https.HttpsError(
      "resource-exhausted",
      `Cost cap reached: $${state.mtdCostUsd.toFixed(2)} / $${COST_CAP_USD} this month. ` +
        `Halted. /nikola resume to override.`
    );
  }
}

/**
 * Atomically increments mtdCostUsd. Returns the new total.
 * Also auto-pauses + returns "warning" / "halted" reasons for the caller to surface.
 */
export async function recordSkillCost(deltaUsd: number): Promise<{
  newTotal: number;
  warning: boolean;
  halted: boolean;
}> {
  const ref = admin.firestore().doc(STATE_DOC);
  let halted = false;
  let warning = false;
  let newTotal = 0;
  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const month = currentMonth();
    let prev = 0;
    let prevMonth = month;
    if (snap.exists) {
      const data = snap.data() as NikolaState;
      prev = data.mtdMonth === month ? data.mtdCostUsd : 0;
      prevMonth = data.mtdMonth;
    }
    newTotal = prev + deltaUsd;
    warning = newTotal >= COST_WARN_USD;
    halted = newTotal >= COST_CAP_USD;
    const update: Partial<NikolaState> = {
      mtdCostUsd: newTotal,
      mtdMonth: month,
      updatedAt: admin.firestore.Timestamp.now(),
    };
    if (halted) {
      update.paused = true;
      update.pausedReason = "cost_cap";
    }
    if (prevMonth !== month) update.mtdMonth = month;
    tx.set(ref, update, {merge: true});
  });
  return {newTotal, warning, halted};
}

/**
 * Touches lastDecisionAt. Called whenever a 1/2/3/✅/❌/💬 reaction is processed.
 */
export async function touchLastDecision(): Promise<void> {
  await admin.firestore().doc(STATE_DOC).set(
    {lastDecisionAt: admin.firestore.Timestamp.now(), updatedAt: admin.firestore.Timestamp.now()},
    {merge: true}
  );
}

/** Touches lastBatchAt. Called by morningBatch. */
export async function touchLastBatch(): Promise<void> {
  await admin.firestore().doc(STATE_DOC).set(
    {lastBatchAt: admin.firestore.Timestamp.now(), updatedAt: admin.firestore.Timestamp.now()},
    {merge: true}
  );
}

/** Clears any paused flag. Backing /nikola resume. */
export async function clearPause(): Promise<void> {
  await admin.firestore().doc(STATE_DOC).set(
    {
      paused: false,
      pausedReason: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.Timestamp.now(),
    },
    {merge: true}
  );
}
