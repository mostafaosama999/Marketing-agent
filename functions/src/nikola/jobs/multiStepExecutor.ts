/**
 * Multi-step executor.
 *
 * Runs a planner-generated step list serially, persisting per-step results
 * and updating an in-place Slack progress message. When a step is marked
 * `requiresConfirmation: true`, the executor posts a Block-style confirmation
 * notice with ✅/❌/💬 reactions and EXITS — Firebase 1st-gen functions can't
 * keep async waiters alive, so the resume happens via a child work doc
 * spawned by reactionFlow when Mostafa reacts.
 *
 * State is canonical on the original "parent" work doc:
 *   - plan, stepResults, cursor, skippedSteps, progressMessageTs
 *   - confirmationContext (set when paused, cleared when resumed)
 * A child work doc carries `parentWorkId` and (re)dispatches the executor.
 */
import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import {WebClient} from "@slack/web-api";
import {bdrChannelId, NIKOLA_BOT_EMOJI, NIKOLA_BOT_NAME, slackBotToken} from "../config";
import {handleEnrich} from "../slashCommands/enrich";
import {handleFindCompanies} from "../slashCommands/findCompanies";
import {handleFindLeads} from "../slashCommands/findLeads";
import {handleTry} from "../slashCommands/try";
import {runSkill} from "../skillRunner";
import {renderMultiStepFinal, renderMultiStepProgress} from "../slack/messageBlocks";
import {postNotice} from "../slack/postDraft";
import {
  MultiStepConfirmationContext,
  MultiStepPlan,
  MultiStepPlanStep,
  MultiStepResult,
  NikolaWork,
} from "../types";

let _slack: WebClient | null = null;
function slack(): WebClient {
  if (!_slack) _slack = new WebClient(slackBotToken());
  return _slack;
}

interface RunState {
  parentRef: FirebaseFirestore.DocumentReference;
  parentWork: NikolaWork;
  plan: MultiStepPlan;
  stepResults: MultiStepResult[];
  cursor: number;
  skippedSteps: Set<number>;
  progressMessageTs?: string;
  threadTs?: string;
}

/** Entry point — dispatched from workQueueProcessor.routeAndRun for kind="multi-step". */
export async function executeMultiStep(work: NikolaWork): Promise<void> {
  // Resolve parent state — either this is a fresh request or a resume.
  const state = await resolveRunState(work);

  // If no plan yet, run the planner and persist.
  if (!state.plan || state.plan.steps.length === 0) {
    const planned = await runPlanner(state.parentWork.args);
    state.plan = planned;
    await state.parentRef.set(
      {plan: planned, cursor: 0, stepResults: []},
      {merge: true}
    );
    // Post the plan preview as the progress placeholder.
    state.progressMessageTs = await postProgressPlaceholder(planned, state.threadTs);
    if (state.progressMessageTs) {
      await state.parentRef.set({progressMessageTs: state.progressMessageTs}, {merge: true});
    }
  }

  // Loop steps from cursor.
  while (state.cursor < state.plan.steps.length) {
    const step = state.plan.steps[state.cursor];

    // Confirmation gate — pause + exit. Resume happens via reaction.
    if (step.requiresConfirmation && !state.skippedSteps.has(state.cursor)) {
      await pauseForConfirmation(state, step);
      return;
    }

    // Run the step.
    const result = state.skippedSteps.has(state.cursor)
      ? await skipStep(state.cursor, step)
      : await runStep(state.cursor, step, state.threadTs);

    state.stepResults.push(result);
    state.cursor++;
    await state.parentRef.set(
      {stepResults: state.stepResults, cursor: state.cursor},
      {merge: true}
    );
    await updateProgressMessage(state);
  }

  // All steps done — post summary.
  await postFinalSummary(state);
}

async function resolveRunState(work: NikolaWork): Promise<RunState> {
  // If this is a child resume doc, load the parent.
  if (work.parentWorkId) {
    const parentRef = admin.firestore().collection("nikolaWorkQueue").doc(work.parentWorkId);
    const snap = await parentRef.get();
    if (!snap.exists) {
      throw new Error(`Parent work ${work.parentWorkId} missing — cannot resume.`);
    }
    const parent = snap.data() as NikolaWork;
    return {
      parentRef,
      parentWork: parent,
      plan: (parent.plan as MultiStepPlan) || {
        steps: [],
        estimatedCostUsd: 0,
        estimatedDurationSec: 0,
        rationale: "",
        requiresSplit: false,
      },
      stepResults: parent.stepResults || [],
      cursor: parent.cursor || 0,
      skippedSteps: new Set(parent.skippedSteps || []),
      progressMessageTs: parent.progressMessageTs,
      threadTs: parent.mentionTs || work.mentionTs,
    };
  }

  // Fresh — this work doc is its own parent.
  const ref = admin.firestore().collection("nikolaWorkQueue").doc(work.id);
  return {
    parentRef: ref,
    parentWork: work,
    plan: (work.plan as MultiStepPlan) || {
      steps: [],
      estimatedCostUsd: 0,
      estimatedDurationSec: 0,
      rationale: "",
      requiresSplit: false,
    },
    stepResults: work.stepResults || [],
    cursor: work.cursor || 0,
    skippedSteps: new Set(work.skippedSteps || []),
    progressMessageTs: work.progressMessageTs,
    threadTs: work.mentionTs,
  };
}

async function runPlanner(userQuery: string): Promise<MultiStepPlan> {
  const result = await runSkill("planner", {prospectInput: userQuery});
  const meta = result.metadata as unknown as MultiStepPlan;
  if (!meta || !Array.isArray(meta.steps) || meta.steps.length === 0) {
    throw new Error("Planner returned no steps.");
  }
  return meta;
}

async function postProgressPlaceholder(
  plan: MultiStepPlan,
  threadTs?: string
): Promise<string | undefined> {
  const {text, blocks} = renderMultiStepProgress({
    steps: plan.steps,
    cursor: 0,
    stepResults: [],
    skippedSteps: new Set(),
    estimatedCostUsd: plan.estimatedCostUsd,
    estimatedDurationSec: plan.estimatedDurationSec,
    rationale: plan.rationale,
    state: "running",
  });
  try {
    const post = await slack().chat.postMessage({
      channel: bdrChannelId(),
      text,
      blocks: blocks as never,
      username: NIKOLA_BOT_NAME,
      icon_emoji: NIKOLA_BOT_EMOJI,
      thread_ts: threadTs,
    });
    return post.ts;
  } catch (e) {
    functions.logger.error("postProgressPlaceholder failed", {error: (e as Error).message});
    return undefined;
  }
}

async function updateProgressMessage(state: RunState, runtimeState?: "running" | "paused"): Promise<void> {
  if (!state.progressMessageTs || !state.plan) return;
  const {text, blocks} = renderMultiStepProgress({
    steps: state.plan.steps,
    cursor: state.cursor,
    stepResults: state.stepResults,
    skippedSteps: state.skippedSteps,
    estimatedCostUsd: state.plan.estimatedCostUsd,
    estimatedDurationSec: state.plan.estimatedDurationSec,
    rationale: state.plan.rationale,
    state: runtimeState || (state.cursor >= state.plan.steps.length ? "complete" : "running"),
  });
  try {
    await slack().chat.update({
      channel: bdrChannelId(),
      ts: state.progressMessageTs,
      text,
      blocks: blocks as never,
    });
  } catch (e) {
    functions.logger.warn("progress message update failed", {error: (e as Error).message});
  }
}

async function postFinalSummary(state: RunState): Promise<void> {
  const totalCost = state.stepResults.reduce((sum, r) => sum + r.costUsd, 0);
  const succeeded = state.stepResults.filter((r) => r.status === "completed").length;
  const failed = state.stepResults.filter((r) => r.status === "failed").length;
  const skipped = state.stepResults.filter((r) => r.status === "skipped").length;
  // Update the in-place progress card to "complete" state for visual closure.
  await updateProgressMessage(state);
  // Then post a separate final summary card with totals.
  const {text, blocks} = renderMultiStepFinal({
    succeeded,
    failed,
    skipped,
    totalCostUsd: totalCost,
  });
  try {
    await slack().chat.postMessage({
      channel: bdrChannelId(),
      text,
      blocks: blocks as never,
      username: NIKOLA_BOT_NAME,
      icon_emoji: NIKOLA_BOT_EMOJI,
      thread_ts: state.threadTs,
    });
  } catch (e) {
    functions.logger.warn("multi-step final summary post failed", {error: (e as Error).message});
  }
  // Parent status moves from "awaiting-confirmation" / "processing" to
  // "completed" now that the entire plan has been worked through. The
  // child resume doc's own status is handled by the processor's finally.
  await state.parentRef.set(
    {
      status: "completed",
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
    },
    {merge: true}
  );
}

async function pauseForConfirmation(state: RunState, step: MultiStepPlanStep): Promise<void> {
  const stepNum = state.cursor + 1;
  // Reflect "paused" state on the in-place progress card first.
  await updateProgressMessage(state, "paused");

  const text = `⏸️ Step ${stepNum}/${state.plan.steps.length} needs your OK — ${step.description}`;
  const blocks = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          `⏸️ *Step ${stepNum}/${state.plan.steps.length} needs your OK*\n` +
          `*${step.description}*`,
      },
    },
    {
      type: "section",
      fields: [
        {type: "mrkdwn", text: `*Skill*\n\`${step.skill}\``},
        {type: "mrkdwn", text: `*Args*\n${step.args || "_(none)_"}`},
      ],
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text:
            "🔒 _Gated because this step hits a paid API or crosses the cost threshold._\n" +
            "✅ run · ❌ skip · 💬 cancel the rest of the plan",
        },
      ],
    },
  ];
  let confirmationTs: string | undefined;
  try {
    const post = await slack().chat.postMessage({
      channel: bdrChannelId(),
      text,
      blocks: blocks as never,
      username: NIKOLA_BOT_NAME,
      icon_emoji: NIKOLA_BOT_EMOJI,
      thread_ts: state.threadTs,
    });
    confirmationTs = post.ts;
    if (confirmationTs) {
      for (const emoji of ["white_check_mark", "x", "speech_balloon"]) {
        try {
          await slack().reactions.add({
            channel: bdrChannelId(),
            name: emoji,
            timestamp: confirmationTs,
          });
        } catch {
          // already_reacted on retry — non-fatal
        }
      }
    }
  } catch (e) {
    functions.logger.error("pauseForConfirmation post failed", {error: (e as Error).message});
  }
  if (!confirmationTs) {
    // Couldn't post the confirmation — surface the failure rather than silently stalling.
    await postNotice(
      `❌ Couldn't post the step ${stepNum} confirmation block. ` +
        `Run \`/nikola ${step.skill} ${step.args}\` manually if you want to proceed.`,
      state.threadTs
    );
    return;
  }
  const ctx: MultiStepConfirmationContext = {
    stepIndex: state.cursor,
    slackMessageTs: confirmationTs,
    awaitedSince: admin.firestore.Timestamp.now(),
  };
  // Set status="awaiting-confirmation" on the parent so analytical queries
  // ("how many jobs are pending?") see the in-flight plan correctly. The
  // processor's finally block detects this and skips its own status flip.
  await state.parentRef.set(
    {
      confirmationContext: ctx,
      status: "awaiting-confirmation",
    },
    {merge: true}
  );
}

async function runStep(
  index: number,
  step: MultiStepPlanStep,
  threadTs?: string
): Promise<MultiStepResult> {
  const startedAt = Date.now();
  try {
    let outputSummary = "";
    switch (step.skill) {
      case "try":
        await handleTry(step.args, undefined, threadTs);
        outputSummary = "outreach drafted (see thread)";
        break;
      case "enrich":
        await handleEnrich(step.args, threadTs);
        outputSummary = "Apollo enrichment surfaced (see thread)";
        break;
      case "find-leads":
        await handleFindLeads(step.args, threadTs);
        outputSummary = "discovery posted (see thread)";
        break;
      case "find-companies":
        await handleFindCompanies(step.args, threadTs);
        outputSummary = "CWP/gig hunt posted (see thread)";
        break;
      case "analytical-query": {
        const r = await runSkill("analyst", {prospectInput: step.args});
        const meta = r.metadata as {answer?: string};
        outputSummary = meta.answer ? meta.answer.slice(0, 200) : "answer posted";
        await postNotice(meta.answer || "_(no answer)_", threadTs);
        break;
      }
      default:
        throw new Error(`Unsupported step skill: ${step.skill}`);
    }
    return {
      stepIndex: index,
      skill: step.skill,
      status: "completed",
      outputSummary,
      // Per-step cost is tracked inside each handler via runSkill -> nikolaSkillRuns.
      // We don't double-count here; the executor's own cost is just the planner call.
      costUsd: 0,
      completedAt: admin.firestore.Timestamp.now(),
    };
  } catch (e) {
    functions.logger.error("multi-step runStep failed", {
      stepIndex: index,
      skill: step.skill,
      error: e instanceof Error ? e.message : String(e),
    });
    return {
      stepIndex: index,
      skill: step.skill,
      status: "failed",
      costUsd: 0,
      completedAt: admin.firestore.Timestamp.now(),
      error: e instanceof Error ? e.message : String(e),
    };
  } finally {
    void startedAt; // duration tracked in nikolaSkillRuns by runSkill
  }
}

async function skipStep(
  index: number,
  step: MultiStepPlanStep
): Promise<MultiStepResult> {
  return {
    stepIndex: index,
    skill: step.skill,
    status: "skipped",
    outputSummary: "skipped by user",
    costUsd: 0,
    completedAt: admin.firestore.Timestamp.now(),
  };
}
