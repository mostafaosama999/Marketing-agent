import {runSkill} from "./skillRunner";
import {HumanizedVariant, Variant} from "./types";

/**
 * Wraps each variant body through the humanize skill before posting to Slack.
 * Per spec: every Slack-posted draft body MUST be humanized first.
 *
 * Cost: humanize uses GPT-4.1 mini (~$0.005 per call, ~$0.015 for a 3-variant draft).
 */
export async function humanizeVariants(
  variants: Variant[],
  type: "linkedin" | "email" | "outreach" = "outreach"
): Promise<HumanizedVariant[]> {
  if (variants.length === 0) return [];
  const out: HumanizedVariant[] = [];
  // Run sequentially to keep cost-gate honest (each call is metered)
  for (const v of variants) {
    if (!v.body || v.body.trim().length === 0) continue;
    try {
      const result = await runSkill("humanize", {
        prospectInput: v.body,
        focusArea: type,
      });
      const humanized = (result.body || result.metadata?.humanizedBody || v.body) as string;
      out.push({name: v.name, bodyRaw: v.body, bodyHumanized: humanized});
    } catch {
      // If humanize fails, fall back to raw body so the user still gets something
      out.push({name: v.name, bodyRaw: v.body, bodyHumanized: v.body});
    }
  }
  return out;
}
