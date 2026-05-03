import * as functions from "firebase-functions";
import {SkillName} from "./types";

/**
 * Centralised config. Reads from functions.config() (Marketing-agent's v1 convention).
 * Throws when called inside a Function execution if a required key is missing —
 * never throws at module import (so deploy/build doesn't break on a fresh checkout).
 */

const cfg = (): Record<string, Record<string, string | undefined>> =>
  (functions.config() as Record<string, Record<string, string | undefined>>) || {};

function required(group: string, key: string): string {
  const v = cfg()[group]?.[key];
  if (!v) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      `Missing required config: ${group}.${key}. ` +
        `Set with: firebase functions:config:set ${group}.${key}=...`
    );
  }
  return v;
}

function optional(group: string, key: string, fallback = ""): string {
  return cfg()[group]?.[key] ?? fallback;
}

/* ------------------------------------------------------------------ Slack */

// Nikola has its OWN bot token (separate Slack app from the existing
// "CodeContent Assistant"/Marketing Report Bot). Namespaced under `nikola.*`
// so we don't collide with `slack.bot_token` used by other functions.
export const slackBotToken = (): string => required("nikola", "bot_token");
export const slackSigningSecret = (): string => required("nikola", "signing_secret");
export const bdrChannelId = (): string => required("nikola", "bdr_channel_id");
export const mostafaSlackUserId = (): string => required("nikola", "mostafa_user_id");

/* ----------------------------------------------------------------- OpenAI */

export const openaiApiKey = (): string => required("openai", "api_key");

/* ---------------------------------------------------------------- Notion */

export const notionApiKey = (): string => required("notion", "api_key");
export const NOTION_AI_CONTEXT_PAGE_ID = "30ef99bc30f08148bfbecebb062ae16e";

/* -------------------------------------------------------------- Firecrawl */

export const firecrawlApiKey = (): string => required("firecrawl", "api_key");

/* ---------------------------------------------------------- Model routing */

export const MODELS = {
  reasoning: "gpt-5",         // generate-outreach, sales (deep multi-turn)
  fast: "gpt-4.1-mini",       // humanize, learn, lead-generation, cwp-*, gig-*, classifiers
} as const;

export const MODEL_FOR_SKILL: Record<SkillName, string> = {
  "generate-outreach": MODELS.reasoning,
  "sales": MODELS.reasoning,
  "lead-generation": MODELS.fast,
  "humanize": MODELS.fast,
  "cwp-hunt": MODELS.fast,
  "cwp-apply": MODELS.fast,
  "gig-hunt": MODELS.fast,
  "learn": MODELS.fast,
};

/**
 * USD per 1M tokens — used by skillRunner to compute per-call cost.
 * Conservative estimates as of 2026-05; refine when OpenAI changes pricing.
 */
export const PRICING_PER_1M: Record<string, {input: number; output: number}> = {
  "gpt-5": {input: 1.25, output: 10.0},
  "gpt-4.1-mini": {input: 0.15, output: 0.60},
};

/* ----------------------------------------------------------- Operational */

export const COST_CAP_USD = 15;
export const COST_WARN_USD = 12; // 80% of cap
export const MAX_BATCH = 5;
export const IDLE_PAUSE_DAYS = 3;

/** Cloud Functions hard wall is 540s; leave 30s headroom. */
export const SKILL_WALL_MS = 510_000;
export const SKILL_MAX_TOOL_ITERATIONS = 25;
export const SKILL_MAX_OUTPUT_TOKENS = 4096;

/** Gmail account type that owns Mostafa's reply inbox. */
export const NIKOLA_GMAIL_ACCOUNT_TYPE = "admin" as const;

/** Lead "due" thresholds used by dueLeadsQuery. */
export const FOLLOW_UP_AFTER_DAYS = 7;
export const WARM_STUCK_AFTER_DAYS = 14;

/** Slack reactions Nikola seeds and listens for. */
export const PICK_REACTIONS = ["one", "two", "three"] as const; // Slack names for 1️⃣ 2️⃣ 3️⃣
export const PICK_REACTION_TO_INDEX: Record<string, 1 | 2 | 3> = {
  "one": 1,
  "two": 2,
  "three": 3,
  "1️⃣": 1,
  "2️⃣": 2,
  "3️⃣": 3,
  // tone variants
  "white_check_mark_one": 1,
};
export const SENT_REACTION = "white_check_mark";
export const DENY_REACTION = "x";
export const REVISE_REACTION = "speech_balloon";

export const NIKOLA_BOT_NAME = "Nikola";
export const NIKOLA_BOT_EMOJI = ":robot_face:";

export const NIKOLA_BUNDLE_DIR = "nikola-bundled";

export {optional as optionalConfig, required as requiredConfig};
