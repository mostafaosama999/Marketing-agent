import * as admin from "firebase-admin";
import {
  FOLLOW_UP_AFTER_DAYS,
  MAX_BATCH,
  WARM_STUCK_AFTER_DAYS,
} from "../config";
import {LeadDoc, SalesMode, SkillName} from "../types";

/**
 * Returns up to MAX_BATCH leads to draft for today's morning batch.
 *
 * Priority order:
 *   1. Replied — needs sales reply (highest priority; one-shot per day)
 *   2. Warm-stuck — sales reengage
 *   3. Follow-up due — sales reengage
 *   4. Cold qualified — generate-outreach
 *
 * Tiebreaker within bucket: apolloEnriched.employeeCount descending.
 */
export interface DueLead {
  lead: LeadDoc;
  skill: SkillName;
  mode?: SalesMode;
  reason: string;
  priority: number; // lower = higher priority
}

const DAY_MS = 24 * 60 * 60 * 1000;

export async function dueLeadsQuery(): Promise<DueLead[]> {
  const db = admin.firestore();
  const out: DueLead[] = [];
  const seen = new Set<string>();

  /* 1) Replied */
  const repliedSnap = await db
    .collection("leads")
    .where("outreach.linkedIn.status", "==", "replied")
    .limit(MAX_BATCH)
    .get();
  for (const d of repliedSnap.docs) {
    if (seen.has(d.id)) continue;
    const lead: LeadDoc = {id: d.id, ...(d.data() as Omit<LeadDoc, "id">)};
    if (lead.archived) continue;
    out.push({lead, skill: "sales", mode: "reply", reason: "Replied", priority: 1});
    seen.add(d.id);
    if (out.length >= MAX_BATCH) return cap(out);
  }

  /* 2) Warm-stuck */
  const warmStuckCutoff = admin.firestore.Timestamp.fromMillis(
    Date.now() - WARM_STUCK_AFTER_DAYS * DAY_MS
  );
  for (const status of ["contacted", "follow_up"]) {
    const snap = await db
      .collection("leads")
      .where("status", "==", status)
      .where("updatedAt", "<", warmStuckCutoff)
      .limit(MAX_BATCH)
      .get();
    for (const d of snap.docs) {
      if (seen.has(d.id)) continue;
      const lead: LeadDoc = {id: d.id, ...(d.data() as Omit<LeadDoc, "id">)};
      if (lead.archived) continue;
      if (lead.outreach?.linkedIn?.status === "replied") continue;
      out.push({lead, skill: "sales", mode: "reengage", reason: `Warm-stuck (${status})`, priority: 2});
      seen.add(d.id);
      if (out.length >= MAX_BATCH) return cap(out);
    }
  }

  /* 3) Follow-up due */
  const followUpCutoff = admin.firestore.Timestamp.fromMillis(
    Date.now() - FOLLOW_UP_AFTER_DAYS * DAY_MS
  );
  const followUpSnap = await db
    .collection("leads")
    .where("outreach.linkedIn.status", "==", "sent")
    .where("outreach.linkedIn.sentAt", "<", followUpCutoff)
    .limit(MAX_BATCH)
    .get();
  for (const d of followUpSnap.docs) {
    if (seen.has(d.id)) continue;
    const lead: LeadDoc = {id: d.id, ...(d.data() as Omit<LeadDoc, "id">)};
    if (lead.archived) continue;
    out.push({lead, skill: "sales", mode: "reengage", reason: "Sent >7d, no reply", priority: 3});
    seen.add(d.id);
    if (out.length >= MAX_BATCH) return cap(out);
  }

  /* 4) Cold qualified */
  for (const status of ["new_lead", "qualified"]) {
    const snap = await db
      .collection("leads")
      .where("status", "==", status)
      .limit(MAX_BATCH * 3) // overscan because we'll filter for not_sent
      .get();
    for (const d of snap.docs) {
      if (seen.has(d.id)) continue;
      const lead: LeadDoc = {id: d.id, ...(d.data() as Omit<LeadDoc, "id">)};
      if (lead.archived) continue;
      const liStatus = lead.outreach?.linkedIn?.status;
      if (liStatus && liStatus !== "not_sent") continue;
      out.push({lead, skill: "generate-outreach", reason: "Cold qualified", priority: 4});
      seen.add(d.id);
      if (out.length >= MAX_BATCH) return cap(out);
    }
  }

  return cap(out);
}

function cap(items: DueLead[]): DueLead[] {
  return items
    .sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      const ae = (a.lead.apolloEnriched?.employeeCount as number) || 0;
      const be = (b.lead.apolloEnriched?.employeeCount as number) || 0;
      return be - ae;
    })
    .slice(0, MAX_BATCH);
}
