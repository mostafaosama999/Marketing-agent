import {LeadDoc, OutreachStatus, SkillName, SalesMode} from "./types";

/**
 * Picks which skill to run for a given lead in the morning batch.
 *
 * Cold (qualified, never sent) → generate-outreach
 * Replied → sales (mode: reply)
 * Sent + no_response > 7d → sales (mode: reengage)
 * Warm-stuck (in contacted/follow_up too long) → sales (mode: reengage)
 *
 * Returns null if the lead is not actionable (lost, won, archived, refused).
 */
export interface RoutingDecision {
  skill: SkillName;
  mode?: SalesMode;
  reason: string;
}

const FOLLOW_UP_AFTER_MS = 7 * 24 * 60 * 60 * 1000;

export function routeForLead(lead: LeadDoc): RoutingDecision | null {
  if (lead.archived) return null;
  if (lead.status === "won" || lead.status === "lost") return null;

  const liStatus: OutreachStatus | undefined = lead.outreach?.linkedIn?.status;
  const emailStatus: OutreachStatus | undefined = lead.outreach?.email?.status;

  // 1) Replied — needs sales reply
  if (liStatus === "replied" || emailStatus === "replied") {
    return {skill: "sales", mode: "reply", reason: "Prospect replied"};
  }

  // 2) Refused — drop (no draft)
  if (liStatus === "refused" || emailStatus === "refused") {
    return null;
  }

  // 3) Cold — never sent
  if ((liStatus ?? "not_sent") === "not_sent") {
    if (lead.status === "new_lead" || lead.status === "qualified") {
      return {skill: "generate-outreach", reason: "Cold lead, no prior touch"};
    }
  }

  // 4) Sent + stale → reengage
  const sentAtMs = lead.outreach?.linkedIn?.sentAt?.toMillis?.();
  if (
    liStatus === "sent" &&
    sentAtMs &&
    Date.now() - sentAtMs > FOLLOW_UP_AFTER_MS
  ) {
    return {skill: "sales", mode: "reengage", reason: "Sent >7d ago, no response"};
  }

  // 5) Warm-stuck (contacted/follow_up too long handled by dueLeadsQuery + sales)
  if (lead.status === "contacted" || lead.status === "follow_up") {
    return {skill: "sales", mode: "reengage", reason: "Warm-stuck"};
  }

  return null;
}
