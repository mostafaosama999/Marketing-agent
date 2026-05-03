import * as admin from "firebase-admin";
import {COST_CAP_USD} from "../config";
import {getState} from "../costGate";
import {renderStatus} from "../slack/messageBlocks";
import {SlashResponse} from "../slack/slashHandler";
import {LeadStatus} from "../types";

const STAGES: LeadStatus[] = [
  "new_lead",
  "qualified",
  "contacted",
  "follow_up",
  "nurture",
  "won",
  "lost",
];

/**
 * Computes the status payload. Parallelises 11 Firestore count queries so the
 * total time fits Slack's 3s slash timeout even on a cold start.
 */
export async function buildStatusPayload(): Promise<{text: string; blocks: unknown[]}> {
  const db = admin.firestore();

  const [state, ...rest] = await Promise.all([
    getState(),
    // Pipeline counts (one query per stage)
    ...STAGES.map((s) =>
      db
        .collection("leads")
        .where("status", "==", s)
        .count()
        .get()
        .then((snap) => snap.data().count)
        .catch(() => 0)
    ),
    // Open drafts (pending or selected)
    db
      .collection("nikolaDrafts")
      .where("status", "in", ["pending", "selected"])
      .count()
      .get()
      .then((snap) => snap.data().count)
      .catch(() => 0),
    // Pending revisions
    db
      .collection("nikolaDrafts")
      .where("status", "==", "revising")
      .count()
      .get()
      .then((snap) => snap.data().count)
      .catch(() => 0),
    // Active patches
    db
      .collection("nikolaPatches")
      .where("active", "==", true)
      .count()
      .get()
      .then((snap) => snap.data().count)
      .catch(() => 0),
  ]);

  const stageCounts = rest.slice(0, STAGES.length) as number[];
  const [openDrafts, pendingRevisions, activePatches] = rest.slice(STAGES.length) as number[];

  const counts: Record<string, number> = {};
  STAGES.forEach((s, i) => (counts[s] = stageCounts[i]));

  const lastBatchAt = state.lastBatchAt?.toDate().toISOString() || undefined;

  return renderStatus({
    pipelineCounts: counts,
    openDrafts,
    pendingRevisions,
    mtdCostUsd: state.mtdCostUsd,
    costCap: COST_CAP_USD,
    paused: state.paused,
    pausedReason: state.pausedReason,
    lastBatchAt,
    activePatchCount: activePatches,
  });
}

/** Synchronous slash handler — returns the full status within Slack's 3s window. */
export async function handleStatus(): Promise<SlashResponse> {
  const {text, blocks} = await buildStatusPayload();
  return {response_type: "ephemeral", text, blocks};
}
