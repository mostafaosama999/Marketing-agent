import * as admin from "firebase-admin";

export type SkillName =
  | "generate-outreach"
  | "sales"
  | "lead-generation"
  | "humanize"
  | "cwp-hunt"
  | "cwp-apply"
  | "gig-hunt"
  | "learn";

export type LeadStatus =
  | "new_lead"
  | "qualified"
  | "contacted"
  | "follow_up"
  | "nurture"
  | "won"
  | "lost";

export type OutreachStatus =
  | "not_sent"
  | "sent"
  | "opened"
  | "replied"
  | "refused"
  | "no_response";

export type IcpTier = "hot" | "warm" | "cold" | "skip";

export type SalesMode =
  | "reply"
  | "diagnose"
  | "escalate"
  | "prep-call"
  | "post-call"
  | "spec"
  | "reengage"
  | "trial-close"
  | "stage";

export interface Variant {
  name: string;
  body: string;
}

export interface HumanizedVariant {
  name: string;
  bodyRaw: string;
  bodyHumanized: string;
}

export interface RightContact {
  name: string;
  linkedinUrl?: string;
  title?: string;
  email?: string;
}

export interface IcpScore {
  mustHave: number;
  bonus: number;
  tier: IcpTier;
}

export interface CwpFlag {
  detected: boolean;
  programs?: string[];
}

export interface SkillContext {
  lead?: LeadDoc;
  company?: CompanyDoc;
  prospectInput?: string;
  reply?: string;
  mode?: SalesMode;
  focusArea?: string;
  callerSlackTs?: string;
  callerSlackChannel?: string;
}

export interface SkillResult {
  body?: string;
  variants?: Variant[];
  rightContact?: RightContact;
  icpScore?: IcpScore;
  contentIdea?: string;
  cwpFlag?: CwpFlag;
  metadata: Record<string, unknown>;
  toolCallsUsed: number;
  costUsd: number;
  inputTokens: number;
  outputTokens: number;
  model: string;
  durationMs: number;
}

export interface LeadDoc {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  company?: string;
  companyId?: string;
  status?: LeadStatus;
  archived?: boolean;
  customFields?: Record<string, unknown>;
  apolloEnriched?: Record<string, unknown>;
  outreach?: {
    linkedIn?: {
      status?: OutreachStatus;
      sentAt?: admin.firestore.Timestamp;
      profileUrl?: string;
      [key: string]: unknown;
    };
    email?: {
      status?: OutreachStatus;
      sentAt?: admin.firestore.Timestamp;
      recipientEmail?: string;
      draftId?: string;
      draftUrl?: string;
      originalSubject?: string;
      [key: string]: unknown;
    };
  };
  totalApiCosts?: number;
  createdAt?: admin.firestore.Timestamp;
  updatedAt?: admin.firestore.Timestamp;
}

export interface CompanyDoc {
  id: string;
  name?: string;
  website?: string;
  industry?: string;
  description?: string;
  status?: LeadStatus;
  customFields?: Record<string, unknown>;
  apolloEnrichment?: {
    employeeCount?: number;
    employeeRange?: string;
    funding?: unknown;
    technologies?: string[];
    industries?: string[];
    [key: string]: unknown;
  };
  blogAnalysis?: Record<string, unknown>;
  writingProgramAnalysis?: Record<string, unknown>;
  offer?: { blogIdea?: string };
}

export type DraftStatus =
  | "pending"
  | "selected"
  | "sent"
  | "denied"
  | "revising"
  | "expired";

export interface NikolaDraft {
  id: string;
  leadId: string;
  companyId?: string;
  skillUsed: SkillName;
  channel: "linkedin" | "email";
  variants: HumanizedVariant[];
  selectedVariant?: 1 | 2 | 3;
  metadata: {
    profileUrl?: string;
    emailAddress?: string;
    subject?: string;
    icpScore?: IcpScore;
    rightContact?: RightContact;
    cwpFlag?: CwpFlag;
    contentIdea?: string;
    [key: string]: unknown;
  };
  slackMessageTs: string;
  slackChannelId: string;
  status: DraftStatus;
  statusHistory: Array<{
    status: DraftStatus;
    at: admin.firestore.Timestamp;
    by: string;
    note?: string;
  }>;
  decidedAt?: admin.firestore.Timestamp;
  decisionNote?: string;
  costUsd: number;
  toolCallsUsed: number;
  createdAt: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

export interface NikolaPatch {
  id: string;
  skillName: SkillName;
  rule: string;
  active: boolean;
  addedAt: admin.firestore.Timestamp;
  addedBy: "mostafa";
  removedAt?: admin.firestore.Timestamp;
}

export interface NikolaThread {
  slackThreadTs: string;
  leadId: string;
  channelId: string;
  draftIds: string[];
  createdAt: admin.firestore.Timestamp;
}

export type NikolaContextSource = "notion" | "report" | "context-file";

export interface NikolaContextDoc {
  id: string;
  source: NikolaContextSource;
  topic: string;
  body: string;
  syncedAt: admin.firestore.Timestamp;
  sourceUrl?: string;
  hash: string;
}

export interface NikolaSkillRun {
  id: string;
  skill: SkillName;
  ctx: {
    leadId?: string;
    companyId?: string;
    mode?: string;
  };
  model: string;
  inputTokens: number;
  outputTokens: number;
  toolCallsUsed: number;
  durationMs: number;
  costUsd: number;
  error?: string;
  createdAt: admin.firestore.Timestamp;
}

export type NikolaPauseReason = "cost_cap" | "idle" | "manual";

export interface NikolaState {
  mtdCostUsd: number;
  mtdMonth: string;
  paused: boolean;
  pausedReason?: NikolaPauseReason;
  lastBatchAt?: admin.firestore.Timestamp;
  lastDecisionAt?: admin.firestore.Timestamp;
  updatedAt: admin.firestore.Timestamp;
}

/* ----------------------------------- Async work queue (v1.1) */

export type NikolaWorkKind =
  | "try"
  | "enrich"
  | "find-leads"
  | "find-companies"
  | "mention"
  | "status";

export type NikolaWorkSource = "slash" | "mention";

export type NikolaWorkStatus = "pending" | "processing" | "completed" | "failed";

/** Minimal SlashPayload — duplicated here from slashHandler to avoid circular import. */
export interface NikolaSlashPayloadSnapshot {
  user_id: string;
  user_name?: string;
  channel_id: string;
  command: string;
  text: string;
  response_url: string;
  trigger_id?: string;
}

export interface NikolaWork {
  id: string;
  kind: NikolaWorkKind;
  args: string;
  source: NikolaWorkSource;
  payload?: NikolaSlashPayloadSnapshot;   // present when source = 'slash'
  mentionTs?: string;                     // present when source = 'mention' — used as thread_ts
  status: NikolaWorkStatus;
  error?: string;
  createdAt: admin.firestore.Timestamp;
  startedAt?: admin.firestore.Timestamp;
  completedAt?: admin.firestore.Timestamp;
}

export interface NikolaDiscovery {
  id: string;
  source: "lead-generation" | "cwp-hunt" | "gig-hunt";
  focusArea: string;
  items: unknown[];
  runDate: admin.firestore.Timestamp;
  triggeredBy: "mostafa" | "system";
  costUsd: number;
}

/**
 * Input passed to every tool implementation. Carries the skill context plus
 * shared services (db, openai client) so tools don't have to construct them.
 */
export interface ToolCallContext {
  ctx: SkillContext;
  db: admin.firestore.Firestore;
  /** Used for cost accounting on tool-internal LLM calls if any. */
  runId: string;
}

/**
 * Shape returned by parseSlackPayload — same for events + slash.
 * Used by the user/channel gates.
 */
export interface SlackGateInfo {
  userId?: string;
  channelId?: string;
  teamId?: string;
}

export type Reaction = "1" | "2" | "3" | "✅" | "❌" | "💬" | "other";
