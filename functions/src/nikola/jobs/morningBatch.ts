import * as functions from "firebase-functions";
import {COST_CAP_USD, COST_WARN_USD} from "../config";
import {assertCostBudget, getState, touchLastBatch} from "../costGate";
import {humanizeVariants} from "../humanizeWrap";
import {shouldPauseForIdle} from "../idleGate";
import {runSkill} from "../skillRunner";
import {postDraft, postNotice} from "../slack/postDraft";
import {renderEmptyBatch} from "../slack/messageBlocks";
import {normaliseVariants} from "../variantParser";
import {dueLeadsQuery} from "./dueLeadsQuery";

/**
 * Morning batch: cost gate → idle gate → query → draft loop.
 * Fully wrapped in try/catch — must never crash hard since it's scheduled.
 */
export async function runMorningBatch(): Promise<void> {
  // Cost gate
  try {
    await assertCostBudget();
  } catch (e) {
    functions.logger.warn("Morning batch halted: cost cap reached");
    await postNotice(
      `🚧 Morning batch halted — cost cap ($${COST_CAP_USD}/mo) reached. /nikola resume to override.`
    );
    return;
  }

  // Idle gate
  if (await shouldPauseForIdle()) {
    await postNotice(
      `:zzz: Paused — no decisions in ${require("../config").IDLE_PAUSE_DAYS}d. /nikola resume to continue.`
    );
    return;
  }

  // Pre-batch warning if mid cost cap
  const stateBefore = await getState();
  if (stateBefore.mtdCostUsd >= COST_WARN_USD) {
    await postNotice(
      `:warning: MTD cost $${stateBefore.mtdCostUsd.toFixed(2)} of $${COST_CAP_USD}. Trimming as needed.`
    );
  }

  const due = await dueLeadsQuery();
  if (due.length === 0) {
    const {text} = renderEmptyBatch();
    await postNotice(text);
    await touchLastBatch();
    return;
  }

  for (let i = 0; i < due.length; i++) {
    const item = due[i];
    try {
      await assertCostBudget(); // re-check between drafts so we halt mid-batch if needed
      const result = await runSkill(item.skill, {lead: item.lead, mode: item.mode});
      const variants = normaliseVariants(result.variants);
      if (variants.length === 0) {
        await postNotice(
          `Lead ${item.lead.company || item.lead.name}: skill returned no variants. Skipping.`
        );
        continue;
      }
      const humanized = await humanizeVariants(variants, "linkedin");
      await postDraft({
        lead: item.lead,
        variants: humanized,
        skillUsed: item.skill,
        skillResult: result,
        channel: "linkedin",
        index: i + 1,
        total: due.length,
      });
    } catch (e) {
      functions.logger.error("Morning batch lead failed", {
        leadId: item.lead.id,
        error: e instanceof Error ? e.message : String(e),
      });
      await postNotice(
        `❌ Failed on ${item.lead.company || item.lead.name}: ${e instanceof Error ? e.message : String(e)}`
      );
      if (e instanceof Error && /resource-exhausted|cost cap/i.test(e.message)) {
        // Cost cap reached mid-batch; stop the loop
        await postNotice(`Halting batch (${i + 1}/${due.length} done) — cap reached.`);
        break;
      }
    }
  }

  await touchLastBatch();
}
