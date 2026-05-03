import {HumanizedVariant, IcpScore, RightContact, CwpFlag} from "../types";

/**
 * Pure block builders for Slack rich messages. No I/O.
 */

export interface DraftBlocksInput {
  index: number;
  total: number;
  companyName?: string;
  leadName?: string;
  leadStatus?: string;
  icpScore?: IcpScore;
  rightContact?: RightContact;
  profileUrl?: string;
  emailAddress?: string;
  variants: HumanizedVariant[];
  cwpFlag?: CwpFlag;
  contentIdea?: string;
  channel: "linkedin" | "email";
}

const fallbackText = (input: DraftBlocksInput) =>
  `Nikola draft ${input.index}/${input.total} — ${input.companyName || "Unknown"}`;

/** Returns Slack chat.postMessage args (without channel). */
export function renderDraftMessage(input: DraftBlocksInput): {
  text: string;
  blocks: unknown[];
} {
  const headerBits: string[] = [];
  if (input.companyName) headerBits.push(`*${input.companyName}*`);
  if (input.leadStatus) headerBits.push(`(${input.leadStatus})`);
  if (input.icpScore) {
    headerBits.push(
      `· ICP ${input.icpScore.mustHave + input.icpScore.bonus} (${input.icpScore.tier})`
    );
  }

  const blocks: unknown[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${input.index}/${input.total}* — ${headerBits.join(" ")}`,
      },
    },
  ];

  // Right contact + link
  const contactBits: string[] = [];
  if (input.rightContact?.name) contactBits.push(input.rightContact.name);
  if (input.rightContact?.title) contactBits.push(`(${input.rightContact.title})`);
  if (input.profileUrl) contactBits.push(`<${input.profileUrl}|LinkedIn>`);
  if (input.emailAddress) contactBits.push(`📧 ${input.emailAddress}`);
  if (contactBits.length > 0) {
    blocks.push({
      type: "context",
      elements: [{type: "mrkdwn", text: contactBits.join(" · ")}],
    });
  }

  // CWP flag (if any)
  if (input.cwpFlag?.detected) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `🎯 *CWP opportunity:* ${(input.cwpFlag.programs || []).join(", ") || "detected"}`,
      },
    });
  }

  blocks.push({type: "divider"});

  // Variants stacked
  input.variants.forEach((v, i) => {
    const label = `*Variant ${String.fromCharCode(65 + i)} — ${v.name}*`;
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${label}\n\`\`\`${v.bodyHumanized}\`\`\``,
      },
    });
  });

  blocks.push({type: "divider"});

  // Footer / actions guide
  const pickHints =
    input.variants.length === 1
      ? "React ✅ to mark sent · ❌ skip · 💬 revise"
      : `${input.variants.map((_, i) => ["1️⃣", "2️⃣", "3️⃣"][i]).join(" / ")} to pick · ❌ skip · 💬 revise`;
  blocks.push({
    type: "context",
    elements: [{type: "mrkdwn", text: pickHints}],
  });

  if (input.contentIdea) {
    blocks.push({
      type: "context",
      elements: [{type: "mrkdwn", text: `💡 ${input.contentIdea}`}],
    });
  }

  return {text: fallbackText(input), blocks};
}

export function renderSelectionFooter(selected: 1 | 2 | 3): {text: string; blocks: unknown[]} {
  const text = `Selected: Variant ${selected}. React ✅ once sent.`;
  return {
    text,
    blocks: [
      {
        type: "context",
        elements: [{type: "mrkdwn", text: `🎯 ${text}`}],
      },
    ],
  };
}

export function renderEmptyBatch(): {text: string; blocks: unknown[]} {
  const text = "No leads due today. Use `/nikola find-leads` to discover or `/nikola try <anything>` to draft on demand.";
  return {
    text,
    blocks: [{type: "section", text: {type: "mrkdwn", text}}],
  };
}

export function renderStatus(input: {
  pipelineCounts: Record<string, number>;
  openDrafts: number;
  pendingRevisions: number;
  mtdCostUsd: number;
  costCap: number;
  paused: boolean;
  pausedReason?: string;
  lastBatchAt?: string;
  activePatchCount: number;
}): {text: string; blocks: unknown[]} {
  const lines = [
    `*Pipeline:* ${Object.entries(input.pipelineCounts).map(([k, v]) => `${k}: ${v}`).join(" · ") || "(empty)"}`,
    `*Open drafts:* ${input.openDrafts} · *Pending revisions:* ${input.pendingRevisions}`,
    `*MTD cost:* $${input.mtdCostUsd.toFixed(2)} / $${input.costCap}`,
    `*Active patches:* ${input.activePatchCount}`,
    `*Paused:* ${input.paused ? `yes (${input.pausedReason || "manual"})` : "no"}`,
    `*Last batch:* ${input.lastBatchAt || "never"}`,
  ];
  const text = lines.join("\n");
  return {
    text,
    blocks: [{type: "section", text: {type: "mrkdwn", text}}],
  };
}

/* --------------------------------------------------------------------- */
/* Shared building blocks — keep visual identity consistent across all   */
/* Nikola messages (discovery, hunt, analyst, multi-step, etc).          */
/* --------------------------------------------------------------------- */

const PROVIDER_FAILURE_TEXT =
  "⚠️ *Web search providers are out of credit.* " +
  "Top up Firecrawl at <https://firecrawl.dev/account|firecrawl.dev/account> " +
  "or Apify at <https://apify.com/account/billing|apify.com/account/billing> — " +
  "they fall back to each other, so restoring either one will get this working.";

/** Reusable warning block surfaced when both Firecrawl and Apify are out. */
export function providerFailureBlock(): unknown {
  return {
    type: "section",
    text: {type: "mrkdwn", text: PROVIDER_FAILURE_TEXT},
  };
}

/** Compact context line (gray small text under a section). */
function contextBlock(text: string): unknown {
  return {type: "context", elements: [{type: "mrkdwn", text}]};
}

/** Heuristic for the model's summary mentioning provider failure. */
export function summaryLooksLikeProviderFailure(summary: string): boolean {
  const s = summary.toLowerCase();
  return (
    s.includes("insufficient credit") ||
    s.includes("api credit") ||
    s.includes("both search providers") ||
    (s.includes("web search") && s.includes("fail"))
  );
}

/* --------------------------------------------------------------------- */
/* find-leads (Discovery) — replaces the wall-of-text postNotice.        */
/* --------------------------------------------------------------------- */

export interface DiscoveryItem {
  companyName?: string;
  website?: string;
  icpTier?: string;
  fundingSignal?: string;
  hookForOutreach?: string;
  suggestedContactTitle?: string;
  whyGoodFit?: string;
  whyMaybeNotFit?: string | null;
  topContentGap?: string | null;
  signalsObserved?: string[];
  recentBlogPostUrl?: string | null;
  [key: string]: unknown;
}

export function renderDiscovery(input: {
  focus: string;
  items: DiscoveryItem[];
  created: number;
  dupes: number;
  costUsd: number;
  summary: string;
  fallbackUsed?: "apify";
}): {text: string; blocks: unknown[]} {
  const focus = input.focus || "any focus";
  const fallbackText = `🌱 Discovery — ${focus}: ${input.items.length} found, ${input.created} new, ${input.dupes} dupes`;

  const blocks: unknown[] = [
    {
      type: "header",
      text: {type: "plain_text", text: "🌱 Lead discovery report", emoji: true},
    },
    {
      type: "section",
      fields: [
        {type: "mrkdwn", text: `*Focus*\n${focus}`},
        {type: "mrkdwn", text: `*Cost*\n$${input.costUsd.toFixed(3)}`},
        {type: "mrkdwn", text: `*Candidates*\n${input.items.length}`},
        {type: "mrkdwn", text: `*New leads*\n${input.created} created · ${input.dupes} deduped`},
      ],
    },
  ];

  // Per-lead detailed cards. Slack hard-limits to 50 blocks per message;
  // each lead uses 2-3 blocks so cap at 10 leads to stay safely under.
  const detailedItems = input.items.slice(0, 10);
  for (let i = 0; i < detailedItems.length; i++) {
    const item = detailedItems[i];
    blocks.push({type: "divider"});

    // Header row: name + tier + website link
    const headerBits: string[] = [`*${i + 1}. ${item.companyName || "(unnamed)"}*`];
    if (item.icpTier) {
      headerBits.push(`${tierEmoji(item.icpTier)} *${item.icpTier.toUpperCase()}*`);
    }
    if (item.website) {
      headerBits.push(`<${normalizeUrl(item.website)}|site>`);
    }
    if (item.recentBlogPostUrl) {
      headerBits.push(`<${item.recentBlogPostUrl}|recent post>`);
    }
    blocks.push({
      type: "section",
      text: {type: "mrkdwn", text: headerBits.join(" _·_ ")},
    });

    // Why fit / hook / content gap — the heart of the report
    const detailLines: string[] = [];
    if (item.whyGoodFit) {
      detailLines.push(`*Why fit:* ${truncateLine(item.whyGoodFit, 600)}`);
    }
    if (item.hookForOutreach) {
      detailLines.push(`*Hook:* ${truncateLine(item.hookForOutreach, 400)}`);
    }
    if (item.topContentGap) {
      detailLines.push(`*Content gap:* ${truncateLine(item.topContentGap, 400)}`);
    }
    if (item.whyMaybeNotFit) {
      detailLines.push(`*Caveat:* ${truncateLine(item.whyMaybeNotFit, 300)}`);
    }
    if (detailLines.length > 0) {
      blocks.push({
        type: "section",
        text: {type: "mrkdwn", text: detailLines.join("\n\n")},
      });
    }

    // Signals + suggested contact as a context line
    const ctxBits: string[] = [];
    if (item.fundingSignal) ctxBits.push(`💰 ${item.fundingSignal}`);
    if (item.signalsObserved && item.signalsObserved.length > 0) {
      ctxBits.push(`📡 ${item.signalsObserved.slice(0, 3).join(" · ")}`);
    }
    if (item.suggestedContactTitle) {
      ctxBits.push(`👤 reach out to: *${item.suggestedContactTitle}*`);
    }
    if (ctxBits.length > 0) {
      blocks.push(contextBlock(ctxBits.join("\n")));
    }
  }

  // If there are more than 10 candidates, note the truncation.
  if (input.items.length > detailedItems.length) {
    blocks.push(
      contextBlock(
        `_+${input.items.length - detailedItems.length} more candidates — see \`nikolaDiscovery\` collection or use \`/nikola find-leads\` with a tighter focus._`
      )
    );
  }

  // Model summary, if it says anything substantive.
  const summary = (input.summary || "").trim();
  if (summary && summary !== "(no summary)") {
    blocks.push({type: "divider"});
    blocks.push({
      type: "section",
      text: {type: "mrkdwn", text: `*Run summary*\n${summary}`},
    });
  }

  // Provider-failure warning block if applicable.
  if (input.items.length === 0 && summaryLooksLikeProviderFailure(summary)) {
    blocks.push({type: "divider"});
    blocks.push(providerFailureBlock());
  }

  // Footer line.
  const footerBits: string[] = [];
  if (input.fallbackUsed === "apify") {
    footerBits.push("🔁 served via Apify fallback");
  }
  if (footerBits.length > 0) {
    blocks.push(contextBlock(footerBits.join(" _·_ ")));
  }

  return {text: fallbackText, blocks};
}

/* --------------------------------------------------------------------- */
/* find-companies (CWP + gig hunt) — same visual rhythm as Discovery.    */
/* --------------------------------------------------------------------- */

export interface HuntSubResult {
  /** Skill name as title in the result row, e.g. "cwp-hunt". */
  skillName: string;
  itemCount: number;
  costUsd: number;
  topItems: Array<{companyName?: string; title?: string; fitScore?: number}>;
  summary?: string;
  /** When the sub-skill failed, surface the error string instead of items. */
  error?: string;
}

export function renderHunt(input: {
  focus: string;
  results: HuntSubResult[];
  totalCostUsd: number;
}): {text: string; blocks: unknown[]} {
  const focus = input.focus || "any focus";
  const totalFound = input.results.reduce((sum, r) => sum + r.itemCount, 0);
  const fallbackText = `🎯 Hunt — ${focus}: ${totalFound} found across ${input.results.length} sources`;

  const blocks: unknown[] = [
    {
      type: "header",
      text: {type: "plain_text", text: "🎯 Writing-program & gig hunt", emoji: true},
    },
    {
      type: "section",
      fields: [
        {type: "mrkdwn", text: `*Focus*\n${focus}`},
        {type: "mrkdwn", text: `*Total cost*\n$${input.totalCostUsd.toFixed(3)}`},
      ],
    },
    {type: "divider"},
  ];

  for (const r of input.results) {
    const headerLine = `*${r.skillName}* — ${r.itemCount} found _·_ $${r.costUsd.toFixed(3)}`;
    const topLines = r.topItems
      .slice(0, 3)
      .map((it, i) => {
        const name = it.companyName || it.title || "(unnamed)";
        const score = typeof it.fitScore === "number" ? ` _(${it.fitScore})_` : "";
        return `   ${i + 1}. ${name}${score}`;
      })
      .join("\n");
    const summaryLine = r.summary ? `\n_${truncateLine(r.summary, 240)}_` : "";
    const errorLine = r.error ? `\n❌ _${truncateLine(r.error, 240)}_` : "";
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `${headerLine}${topLines ? "\n" + topLines : ""}${summaryLine}${errorLine}`,
      },
    });
  }

  // Provider-failure warning block when every sub-skill returned 0 items
  // AND any of the summaries looks like a provider failure.
  const allEmpty = input.results.every((r) => r.itemCount === 0);
  const anyProviderFail = input.results.some(
    (r) => r.summary && summaryLooksLikeProviderFailure(r.summary)
  );
  if (allEmpty && anyProviderFail) {
    blocks.push({type: "divider"});
    blocks.push(providerFailureBlock());
  }

  return {text: fallbackText, blocks};
}

/* --------------------------------------------------------------------- */
/* analytical-query — answer with metrics card + sources + confidence.   */
/* --------------------------------------------------------------------- */

export function renderAnalystAnswer(input: {
  question: string;
  answer: string;
  keyMetrics?: Array<{name: string; value: string | number; hint?: string | null}>;
  sourcesQueried?: string[] | null;
  confidence?: "high" | "medium" | "low";
  caveats?: string | null;
  costUsd: number;
}): {text: string; blocks: unknown[]} {
  const fallbackText = `📊 ${truncateLine(input.answer, 200)}`;

  const blocks: unknown[] = [
    {
      type: "header",
      text: {type: "plain_text", text: "📊 Pipeline insight", emoji: true},
    },
    contextBlock(`_${truncateLine(input.question, 200)}_`),
  ];

  // Metrics card if present.
  if (input.keyMetrics && input.keyMetrics.length > 0) {
    const fields = input.keyMetrics.slice(0, 6).map((m) => ({
      type: "mrkdwn",
      text: `*${m.name}*\n${m.value}${m.hint ? ` _(${m.hint})_` : ""}`,
    }));
    blocks.push({type: "section", fields});
  }

  // Answer body.
  blocks.push({type: "divider"});
  blocks.push({
    type: "section",
    text: {type: "mrkdwn", text: input.answer},
  });

  // Caveat (if any).
  if (input.caveats) {
    blocks.push(contextBlock(`⚠️ ${input.caveats}`));
  }

  // Footer: sources + confidence + cost.
  const footerBits: string[] = [];
  if (input.sourcesQueried && input.sourcesQueried.length > 0) {
    footerBits.push(`sources: \`${input.sourcesQueried.join("`, `")}\``);
  }
  if (input.confidence) footerBits.push(`confidence: *${input.confidence}*`);
  footerBits.push(`cost: $${input.costUsd.toFixed(4)}`);
  blocks.push(contextBlock(footerBits.join(" _·_ ")));

  return {text: fallbackText, blocks};
}

/* --------------------------------------------------------------------- */
/* multi-step plan progress (in-place chat.update payload).              */
/* --------------------------------------------------------------------- */

export function renderMultiStepProgress(input: {
  steps: Array<{description: string; requiresConfirmation: boolean}>;
  cursor: number;
  stepResults: Array<{
    stepIndex: number;
    status: "completed" | "failed" | "skipped";
    costUsd: number;
  }>;
  skippedSteps: Set<number>;
  estimatedCostUsd: number;
  estimatedDurationSec: number;
  rationale: string;
  state: "pending" | "running" | "paused" | "complete";
}): {text: string; blocks: unknown[]} {
  const totalSteps = input.steps.length;
  const stateBadge =
    input.state === "complete"
      ? "🏁"
      : input.state === "paused"
        ? "⏸️"
        : input.state === "running"
          ? "⏳"
          : "🧭";
  const fallbackText = `${stateBadge} Multi-step plan — step ${input.cursor}/${totalSteps}`;

  const stepLines = input.steps
    .map((s, i) => {
      const result = input.stepResults.find((r) => r.stepIndex === i);
      const emoji =
        result?.status === "completed"
          ? "✅"
          : result?.status === "skipped"
            ? "⏭️"
            : result?.status === "failed"
              ? "❌"
              : input.skippedSteps.has(i)
                ? "⏭️"
                : i === input.cursor
                  ? input.state === "paused"
                    ? "⏸️"
                    : "⏳"
                  : "▫️";
      const cost =
        result && result.costUsd > 0 ? ` _($${result.costUsd.toFixed(3)})_` : "";
      const gate = s.requiresConfirmation ? " 🔒" : "";
      return `${emoji} *${i + 1}.* ${s.description}${gate}${cost}`;
    })
    .join("\n");

  const blocks: unknown[] = [
    {
      type: "header",
      text: {type: "plain_text", text: `${stateBadge} Multi-step plan`, emoji: true},
    },
    {
      type: "section",
      fields: [
        {type: "mrkdwn", text: `*Progress*\nstep ${input.cursor}/${totalSteps}`},
        {
          type: "mrkdwn",
          text: `*Estimate*\n~$${input.estimatedCostUsd.toFixed(3)} · ~${input.estimatedDurationSec}s`,
        },
      ],
    },
    {type: "divider"},
    {type: "section", text: {type: "mrkdwn", text: stepLines}},
  ];

  if (input.rationale) {
    blocks.push(contextBlock(`_${truncateLine(input.rationale, 240)}_`));
  }

  return {text: fallbackText, blocks};
}

export function renderMultiStepFinal(input: {
  succeeded: number;
  failed: number;
  skipped: number;
  totalCostUsd: number;
  cancelled?: boolean;
}): {text: string; blocks: unknown[]} {
  const fallbackText = input.cancelled
    ? "🚫 Multi-step plan cancelled"
    : `🏁 Multi-step plan complete — ${input.succeeded} done, ${input.skipped} skipped, ${input.failed} failed`;
  return {
    text: fallbackText,
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: input.cancelled ? "🚫 Plan cancelled" : "🏁 Plan complete",
          emoji: true,
        },
      },
      {
        type: "section",
        fields: [
          {type: "mrkdwn", text: `*Done*\n${input.succeeded}`},
          {type: "mrkdwn", text: `*Skipped*\n${input.skipped}`},
          {type: "mrkdwn", text: `*Failed*\n${input.failed}`},
          {type: "mrkdwn", text: `*Cost*\n$${input.totalCostUsd.toFixed(3)}`},
        ],
      },
    ],
  };
}

/* --------------------------------------------------------------------- */
/* Disambiguation + memory candidate prompts.                            */
/* --------------------------------------------------------------------- */

export function renderClarification(input: {
  userText: string;
  candidates: Array<{kind: string; reason: string; args: string}>;
}): {text: string; blocks: unknown[]} {
  const fallbackText = `🤔 Not sure: ${truncateLine(input.userText, 100)}`;
  const candidateLines = input.candidates.slice(0, 2).map((c, i) => {
    const emoji = i === 0 ? "1️⃣" : "2️⃣";
    const argsHint = c.args ? ` _(args: ${truncateLine(c.args, 80)})_` : "";
    return `${emoji}  *${c.kind}*${argsHint}\n      ${c.reason || "alternative"}`;
  });
  return {
    text: fallbackText,
    blocks: [
      {
        type: "header",
        text: {type: "plain_text", text: "🤔 Did you mean…", emoji: true},
      },
      contextBlock(`> ${truncateLine(input.userText.replace(/\n/g, " "), 200)}`),
      {type: "divider"},
      {type: "section", text: {type: "mrkdwn", text: candidateLines.join("\n\n")}},
      contextBlock("React to pick · ❌ to cancel"),
    ],
  };
}

export function renderMemoryCandidate(text: string): {text: string; blocks: unknown[]} {
  return {
    text: `💭 Remember: ${truncateLine(text, 100)}`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `💭 *Want me to remember this?*\n> ${truncateLine(text, 240)}`,
        },
      },
      contextBlock("✅ remember · ❌ skip"),
    ],
  };
}

/* --------------------------------------------------------------------- */
/* Tiny utilities used across builders.                                  */
/* --------------------------------------------------------------------- */

function tierEmoji(tier: string): string {
  switch (tier.toLowerCase()) {
    case "hot":
      return "🔥";
    case "warm":
      return "♨️";
    case "cold":
      return "❄️";
    case "skip":
      return "⏭️";
    default:
      return "•";
  }
}

function normalizeUrl(raw: string): string {
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

function truncateLine(s: string, max: number): string {
  if (!s) return "";
  const oneline = s.replace(/\s+/g, " ").trim();
  return oneline.length > max ? `${oneline.slice(0, max - 1)}…` : oneline;
}
