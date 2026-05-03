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
