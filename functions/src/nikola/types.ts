import * as admin from "firebase-admin";

export type SkillName =
  | "generate-outreach"
  | "sales"
  | "lead-generation"
  | "humanize"
  | "cwp-hunt"
  | "cwp-apply"
  | "gig-hunt"
  | "learn"
  | "analyst"
  | "planner";

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
      openedAt?: admin.firestore.Timestamp;
      repliedAt?: admin.firestore.Timestamp;
      refusedAt?: admin.firestore.Timestamp;
      noResponseAt?: admin.firestore.Timestamp;
      profileUrl?: string;
      [key: string]: unknown;
    };
    email?: {
      status?: OutreachStatus;
      sentAt?: admin.firestore.Timestamp;
      openedAt?: admin.firestore.Timestamp;
      repliedAt?: admin.firestore.Timestamp;
      refusedAt?: admin.firestore.Timestamp;
      noResponseAt?: admin.firestore.Timestamp;
      recipientEmail?: string;
      draftId?: string;
      draftUrl?: string;
      originalSubject?: string;
      [key: string]: unknown;
    };
  };
  /**
   * Denormalized from entities/{companyId}.customFields.company_type — see
   * companyIndustrySync. (lead.companyId is an FK into the `entities`
   * collection; there is no separate `companies` collection in this project.
   * The "industry" semantic lives at customFields.company_type.)
   */
  companyIndustry?: string;
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
  | "status"
  | "analytical-query"
  | "multi-step"
  | "remember";

export type NikolaWorkSource = "slash" | "mention";

export type NikolaWorkStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  /**
   * Multi-step plan paused at a confirmation gate. The executor returned
   * after posting a confirmation block; the parent doc is the source of
   * truth for plan/cursor/skippedSteps. A reaction spawns a child work doc
   * with parentWorkId that resumes the executor.
   *
   * Distinct from "completed" so the analyst's pipeline-state queries
   * don't undercount in-flight multi-step plans.
   */
  | "awaiting-confirmation";

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

export interface MultiStepPlanStep {
  skill: "try" | "enrich" | "find-leads" | "find-companies" | "analytical-query";
  args: string;
  description: string;
  requiresConfirmation: boolean;
}

export interface MultiStepPlan {
  steps: MultiStepPlanStep[];
  estimatedCostUsd: number;
  estimatedDurationSec: number;
  rationale: string;
  requiresSplit: boolean;
}

export interface MultiStepResult {
  stepIndex: number;
  skill: string;
  status: "completed" | "failed" | "skipped";
  outputSummary?: string;
  costUsd: number;
  completedAt: admin.firestore.Timestamp;
  error?: string;
}

/**
 * Confirmation gate: when an executor hits a `requiresConfirmation: true`
 * step, it posts a confirmation block and persists this on the parent work
 * doc, then exits. A reaction (✅ / ❌ / 💬) triggers a *child* work doc with
 * `parentWorkId` so the executor can resume from `nextCursor`.
 */
export interface MultiStepConfirmationContext {
  stepIndex: number;
  slackMessageTs: string;
  awaitedSince: admin.firestore.Timestamp;
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

  /* Multi-step orchestration state (kind === "multi-step"). Set by the
   * executor as it runs; survives across processor boundaries when the
   * executor pauses at a confirmation gate. */
  plan?: MultiStepPlan;
  stepResults?: MultiStepResult[];
  cursor?: number;                        // index of the next step to run
  confirmationContext?: MultiStepConfirmationContext;
  /** Set on a child "resume" work doc that picks up where the parent paused. */
  parentWorkId?: string;
  /** Slack ts of the in-place updating progress message. Reused across phases. */
  progressMessageTs?: string;
  /** When ❌-skip is reacted, advance past the gated step. */
  skippedSteps?: number[];
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

/** A confirmed memory fact. Lives on `nikolaMemory/singleton.facts[]`. */
export interface NikolaMemoryFact {
  id: string;
  text: string;
  keywords: string[];
  addedAt: admin.firestore.Timestamp;
  sourceWorkId: string;
  confirmedBy: "mostafa";
  accessCount: number;
  lastAccessedAt?: admin.firestore.Timestamp;
}

export interface NikolaMemoryDoc {
  facts: NikolaMemoryFact[];
  updatedAt: admin.firestore.Timestamp;
}

/**
 * An extracted candidate awaiting Mostafa's Remember/Skip confirmation.
 * Lives in its own collection so we can auto-purge stale candidates after
 * 7 days without disturbing confirmed facts.
 */
export interface NikolaMemoryCandidate {
  id: string;
  text: string;
  sourceWorkId: string;
  /** Slack ts of the confirmation block message — used by reactionFlow lookup. */
  slackMessageTs: string;
  status: "pending" | "confirmed" | "rejected" | "expired";
  expiresAt: admin.firestore.Timestamp;
  createdAt: admin.firestore.Timestamp;
  resolvedAt?: admin.firestore.Timestamp;
}

/** Audit log of every router decision. Powers replay + manual misroute review. */
export interface NikolaRoutingDecision {
  id: string;
  userText: string;                  // mention text after stripping bot prefix
  routeMethod: "string-match" | "llm" | "clarification";
  matchedKind: NikolaWorkKind | "status" | "noop" | "unknown";
  args: string;
  confidence?: number;               // 0..1, set when routeMethod === "llm"
  llmRaw?: string;                   // raw classifier output, for replay
  costUsd: number;
  wasCorrect?: boolean;              // populated later from reactions
  slackTs?: string;                  // Slack ts of the user message
  workId?: string;                   // resulting nikolaWorkQueue doc id, if any
  createdAt: admin.firestore.Timestamp;
}

/**
 * Holding doc for low-confidence classifier decisions. Posted as a numbered
 * notice in #bdr; user reacts 1️⃣/2️⃣ to pick a candidate skill, ❌ to cancel.
 * The reaction handler resolves this doc and enqueues the chosen work kind.
 */
export interface NikolaPendingClarification {
  id: string;
  userText: string;
  candidates: Array<{ kind: NikolaWorkKind | "status"; args: string; reason: string }>;
  slackMessageTs: string;            // ts of the clarification notice itself
  slackThreadTs?: string;            // mention's thread ts (where to reply)
  status: "pending" | "resolved" | "cancelled" | "expired";
  resolvedKind?: NikolaWorkKind | "status";
  routingDecisionId?: string;        // back-link to NikolaRoutingDecision
  createdAt: admin.firestore.Timestamp;
  resolvedAt?: admin.firestore.Timestamp;
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
