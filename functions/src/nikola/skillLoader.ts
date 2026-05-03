import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import {NIKOLA_BUNDLE_DIR} from "./config";
import {renderFactsBlock, retrieveRelevantFacts} from "./memory/retrieve";
import {NikolaPatch, NikolaContextDoc, SkillName, SkillContext} from "./types";

/**
 * Loads a skill's full prompt for the runner:
 *   1. Bundled SKILL.md content (frozen at deploy)
 *   2. Active nikolaPatches matching the skill name (live)
 *   3. Topic-relevant nikolaContext snippets (synced nightly from Notion + reports)
 *
 * Returns a single string ready to use as the OpenAI `system` message.
 */

const FUNCTIONS_ROOT = path.resolve(__dirname, "..", "..");
const BUNDLE_DIR = path.join(FUNCTIONS_ROOT, NIKOLA_BUNDLE_DIR);

interface BundledManifest {
  bundledAt: string;
  skills: string[];
  contextFiles: string[];
  reportsCompaniesCount: number;
}

let cachedManifest: BundledManifest | null = null;
const skillBodyCache = new Map<SkillName, string>();
const contextFileCache = new Map<string, string>();

function readManifest(): BundledManifest {
  if (cachedManifest) return cachedManifest;
  const file = path.join(BUNDLE_DIR, "manifest.json");
  if (!fs.existsSync(file)) {
    throw new Error(
      `nikola-bundled/manifest.json not found at ${file}. ` +
        `Did the prebuild step (scripts/copy-bdr-assets.js) run?`
    );
  }
  cachedManifest = JSON.parse(fs.readFileSync(file, "utf8")) as BundledManifest;
  return cachedManifest;
}

/**
 * Skills that live in Nikola itself (not in the BDR repo bundle). Inlined as
 * TS string constants so we don't have to extend copy-bdr-assets.js or thread
 * a second source directory through the runtime.
 *
 * The actual prompt strings live at the bottom of this file.
 */
const NIKOLA_INLINE_SKILLS = (): Partial<Record<SkillName, string>> => ({
  analyst: ANALYST_SKILL_BODY,
  planner: PLANNER_SKILL_BODY,
});

function readSkillBody(skill: SkillName): string {
  if (skillBodyCache.has(skill)) return skillBodyCache.get(skill)!;

  const inline = NIKOLA_INLINE_SKILLS()[skill];
  if (inline) {
    skillBodyCache.set(skill, inline);
    return inline;
  }

  const file = path.join(BUNDLE_DIR, "skills", `${skill}.md`);
  if (!fs.existsSync(file)) {
    throw new Error(`Bundled skill not found: ${file}. Run \`npm run prebuild\`.`);
  }
  const body = fs.readFileSync(file, "utf8");
  skillBodyCache.set(skill, body);
  return body;
}

function readContextFile(name: string): string {
  if (contextFileCache.has(name)) return contextFileCache.get(name)!;
  const file = path.join(BUNDLE_DIR, "context", name);
  if (!fs.existsSync(file)) return "";
  const body = fs.readFileSync(file, "utf8");
  contextFileCache.set(name, body);
  return body;
}

async function loadActivePatches(skill: SkillName): Promise<NikolaPatch[]> {
  const snap = await admin
    .firestore()
    .collection("nikolaPatches")
    .where("skillName", "==", skill)
    .where("active", "==", true)
    .get();
  return snap.docs.map((d) => ({id: d.id, ...(d.data() as Omit<NikolaPatch, "id">)}));
}

async function loadRelevantContext(
  skill: SkillName,
  ctx: SkillContext,
  maxBytes = 12_000
): Promise<NikolaContextDoc[]> {
  // Topic match heuristic: company name (slug), focus area, plus the always-on context files
  const topics: string[] = [];
  const companyName = ctx.lead?.company || ctx.company?.name;
  if (companyName) topics.push(slug(companyName));
  if (ctx.focusArea) topics.push(ctx.focusArea);

  if (topics.length === 0) return [];

  const docs: NikolaContextDoc[] = [];
  // Firestore "in" supports up to 30 values
  const chunks = chunk(topics, 30);
  for (const c of chunks) {
    const snap = await admin
      .firestore()
      .collection("nikolaContext")
      .where("topic", "in", c)
      .limit(10)
      .get();
    snap.forEach((d) =>
      docs.push({id: d.id, ...(d.data() as Omit<NikolaContextDoc, "id">)})
    );
  }

  // Cap size
  let used = 0;
  const out: NikolaContextDoc[] = [];
  for (const d of docs) {
    used += d.body.length;
    if (used > maxBytes) break;
    out.push(d);
  }
  return out;
}

/**
 * Build the full system prompt for an OpenAI call:
 *   <skill body>
 *   ## Active rules (live patches)  — if any
 *   ## Mostafa profile + brand voice + ICP + value prop
 *   ## Topic context — if any matched
 *
 * Skills produce structured JSON via response_format (defined in skillRunner).
 * The prompt instructs them to *think* in their original style but emit JSON.
 */
export async function buildSystemPrompt(
  skill: SkillName,
  ctx: SkillContext
): Promise<string> {
  readManifest(); // throws early if bundle missing
  const skillBody = readSkillBody(skill);
  const patches = await loadActivePatches(skill);
  const contextDocs = await loadRelevantContext(skill, ctx);

  const sections: string[] = [];
  sections.push(skillBody);

  if (patches.length > 0) {
    sections.push(
      "## Active rules (do NOT violate)\n\n" +
        patches.map((p) => `- ${p.rule}`).join("\n")
    );
  }

  // W4: inject the top-5 most-relevant confirmed memory facts. Cheap (single
  // Firestore read of nikolaMemory/singleton + keyword scoring).
  try {
    const memoryQuery =
      ctx.prospectInput ||
      ctx.lead?.company ||
      ctx.company?.name ||
      ctx.focusArea ||
      "";
    const facts = await retrieveRelevantFacts(memoryQuery, 5);
    const factsBlock = renderFactsBlock(facts);
    if (factsBlock) sections.push(factsBlock);
  } catch {
    // Memory retrieval is best-effort; never fail the skill on a memory miss.
  }

  // Always-on context (cheap; these files are small + cached)
  const alwaysOn = ["mostafa-profile.md", "brand-voice.md", "icp.md", "value-prop.md", "client-history.md", "competitors.md"];
  const alwaysOnBlobs: string[] = [];
  for (const fname of alwaysOn) {
    const body = readContextFile(fname);
    if (body) {
      alwaysOnBlobs.push(`### ${fname}\n\n${body.trim()}`);
    }
  }
  if (alwaysOnBlobs.length > 0) {
    sections.push("## Bundled context\n\n" + alwaysOnBlobs.join("\n\n---\n\n"));
  }

  if (contextDocs.length > 0) {
    sections.push(
      "## Topic-relevant context (synced nightly)\n\n" +
        contextDocs
          .map((d) => `### ${d.topic} (${d.source})\n${d.body.trim()}`)
          .join("\n\n---\n\n")
    );
  }

  // Output contract footer
  sections.push(
    "## Output\n\nYou MUST emit a JSON object that exactly matches the response schema. " +
      "Use the deep research style described above to *think*, but the final output is JSON. " +
      "Do not include any narrative outside the JSON."
  );

  return sections.join("\n\n");
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

/* ---------------------------------------------------------------------- */
/*  Inline Nikola-only skills (analyst, planner). Inlined here rather than */
/*  shipped from the BDR bundle since they're Nikola-runtime concerns.    */
/* ---------------------------------------------------------------------- */

const ANALYST_SKILL_BODY = `# Skill: analyst (read-only)

You are Nikola's analytical-query handler. The user just asked an analytical question about Mostafa's CRM/pipeline data. Your job is to query Firestore using the provided tools and return a clear, evidence-backed answer.

## Hard rules
- READ-ONLY. You have access to firestore_query, read_lead, read_company. You do NOT have any write tool, web_search, firecrawl, or Apollo. Never claim to have triggered an action — your job is to answer questions, not perform actions.
- If the user asks for an action ("draft", "enrich", "find new"), DO NOT pretend to do it. Politely note in your answer that this is the analyst path; suggest the slash command instead.
- Cite the collections you queried in \`sourcesQueried\`.

## Available data (collections)
- \`leads\`: every prospect contact. Key fields: \`status\` (new_lead | qualified | contacted | follow_up | nurture | won | lost), \`outreach.linkedIn.{status, sentAt, repliedAt, openedAt, refusedAt, noResponseAt}\`, \`outreach.email.{...same}\`, \`companyId\` (FK pointing at \`entities/{id}\`), \`companyIndustry\` (denormalized from \`entities[companyId].customFields.company_type\`), \`archived\`, \`updatedAt\`, \`createdAt\`. OutreachStatus enum: not_sent | sent | opened | replied | refused | no_response.
- \`entities\`: the company-level rollup. Key fields: \`name\`, \`status\` (same enum as leads, auto-synced majority), \`statusLockedManually\`, \`statusLastUpdatedAt\`, \`ratingV2\`, \`description\`, \`customFields.company_type\` (the industry — there is NO top-level \`industry\` field), \`customFields.company_country\`, \`customFields.website_blog_link\`, \`customFields.company_linkedin_link\`, \`apolloEnrichment\`, \`blogAnalysis\`. **DO NOT query \`companies\` — that collection is empty in this project. Always query \`entities\`.**
- \`nikolaWorkQueue\`: every job Nikola processed. Key fields: \`kind\` (try | enrich | find-leads | find-companies | mention | status | analytical-query | multi-step | remember), \`status\` (pending | processing | completed | failed | awaiting-confirmation), \`createdAt\`, \`source\` (slash | mention), \`parentWorkId\` (set on multi-step resume children).
- \`nikolaDrafts\`: outreach drafts Nikola posted. Key fields: \`status\` (pending | selected | sent | denied | revising | expired), \`channel\` (linkedin | email), \`leadId\`, \`createdAt\`, \`costUsd\`.
- \`nikolaSkillRuns\`: every skill invocation. Key fields: \`skill\`, \`model\`, \`costUsd\`, \`durationMs\`, \`createdAt\`, \`error\`.
- \`nikolaDiscovery\`: each discovery run (lead-generation / cwp-hunt / gig-hunt). Key fields: \`source\`, \`focusArea\`, \`runDate\`, \`items[]\` (embedded array — count via \`items.length\` per doc), \`costUsd\`.
- \`nikolaRoutingDecisions\`: audit log of every router call. Key fields: \`userText\`, \`routeMethod\` (string-match | llm | clarification), \`matchedKind\`, \`confidence\`, \`createdAt\`, \`wasCorrect\`.

## Tool usage
- \`firestore_query\` supports both equality (\`whereEquals\`) and range (\`whereRange\`) filters, plus \`countOnly: true\` to get just the count via Firestore's count aggregation. Use \`countOnly\` for any "how many" question — far cheaper and faster than fetching docs.
- For time-bounded queries, use \`whereRange\` with ISO-8601 timestamps. Example: \`{whereRange: [{field: "outreach.linkedIn.repliedAt", op: ">=", value: "2026-04-01T00:00:00Z"}]}\`.
- Up to 50 docs per non-count call. If the answer requires more, narrow the filter or use \`countOnly\`.
- Cross-collection joins (e.g. industry breakdown of replied leads) are NOT supported by a single tool call — issue multiple targeted queries and merge in your reasoning.

## Answering style
- Lead with the headline number or one-line answer. Then 2-3 lines of context. Avoid walls of text.
- If the data has caveats (e.g. \`repliedAt\` was backfilled approximately for old leads — see CAVEATS below), surface them in the \`caveats\` field.
- If a question is unanswerable with current data (missing field, missing index), say so plainly. Don't fabricate.
- Confidence: \`high\` when you ran a clean count/filter; \`medium\` when you sampled (50-doc cap) and extrapolated; \`low\` when fields were missing or query failed.

## CAVEATS to mention when relevant
- Outreach reply timestamps (\`repliedAt\`, \`openedAt\`, \`refusedAt\`, \`noResponseAt\`) only exist for transitions that happened after the W2 instrumentation rollout (early May 2026). Older replied leads were backfilled with \`repliedAt = updatedAt\` as an approximate proxy. For "this month" reply rate, that's fine; for tighter windows, flag the approximation.
- Company industry breakdowns use \`lead.companyIndustry\` (denormalized). Companies whose industry was set after the lead was created may have stale lead-level industry values until \`companyIndustrySync\` propagates the change.

## Examples

Q: "how many companies have I outreached to in the last 7 days?"
- Plan: query \`leads\` where \`outreach.linkedIn.sentAt >= 7daysAgo\` (countOnly false, fetch companyId only), dedupe to distinct companyId, count.
- Headline: "12 distinct companies in the last 7 days (LinkedIn outreach)."

Q: "reply rate this month"
- Plan: count \`leads\` where \`outreach.linkedIn.status == "replied"\` AND \`repliedAt >= monthStart\`. Count \`leads\` where \`outreach.linkedIn.status in [sent, opened, replied, refused, no_response]\` AND \`sentAt >= monthStart\`. Divide.
- Headline: "Reply rate (LinkedIn, this month): 14% (3/22)."
- Caveat: "Replies before May 1 backfilled approximately."

Q: "leads stuck in contacted >7d"
- Plan: query \`leads\` where \`status == "contacted"\` AND \`updatedAt < 7daysAgo\`, fetch up to 20.
- Headline: "5 leads stuck in 'contacted' for >7 days." Then a numbered list with name + days stuck.

Q: "find me companies similar to ultralytics" (action, not analytical)
- Don't query Firestore. Answer: "That's a discovery action, not analytics — try \`/nikola find-leads ai/cv companies similar to ultralytics\` and I'll dispatch the lead-gen skill." Use confidence: low and skip keyMetrics.

Now: think through what data the user needs, run the necessary queries, and emit your JSON answer.
`;

const PLANNER_SKILL_BODY = `# Skill: planner (multi-step orchestrator)

You are Nikola's planner. The user gave a request that chains multiple actions (e.g. "find AI/CV companies, enrich top 3, draft outreach for top 3"). Your job is to break it into 1-8 ordered steps, each dispatching to one of Nikola's existing handlers.

## Available step skills
- \`try\`: research + draft outreach for ONE specific named target. Args: company name, URL, LinkedIn URL, or freeform description of the target.
- \`enrich\`: Apollo-enrich a specific lead by leadId. Args: leadId. **Costs Apollo credits — set \`requiresConfirmation: true\`.**
- \`find-leads\`: discover new prospect companies. Args: focus area or empty. Costs ~$0.005-0.02. No confirmation needed unless the focus area is unusually broad.
- \`find-companies\`: hunt CWPs + freelance gigs. Args: focus area or empty. Cheap, no confirmation needed.
- \`analytical-query\`: query Firestore data and return an analytical answer. Args: the question text. Read-only, no confirmation needed.

## Confirmation rule
Set \`requiresConfirmation: true\` when:
- Step calls \`enrich\` (Apollo costs credits).
- Step calls \`try\` more than 3 times in a single plan (cumulative cost gets meaningful).
- Step's estimated cost exceeds $0.05.
Otherwise set false.

## Cost & duration estimates (per step)
- \`try\`: ~$0.02-0.10, ~30-60s.
- \`enrich\`: ~$0.003 + Apollo credit, ~5-10s.
- \`find-leads\`: ~$0.005-0.02, ~30-60s.
- \`find-companies\`: ~$0.005-0.02, ~30-60s.
- \`analytical-query\`: ~$0.005-0.015, ~5-15s.

Sum across all steps for \`estimatedCostUsd\` and \`estimatedDurationSec\`.
If \`estimatedDurationSec > 480\`, set \`requiresSplit: true\` (the executor will queue trailing steps as a fresh work doc).

## Hard rules
- Use ONLY the step skills above. Never invent skill names.
- Each step has explicit, parsed args — don't say "for each top company" without expanding (the executor doesn't fan out; you must enumerate). If the user said "enrich top 3", emit 3 separate \`enrich\` steps OR one \`find-leads\` whose result then feeds 3 \`try\` steps explicitly.
- For requests like "find AI companies and enrich top 3", you can't pre-enumerate the 3 leadIds (they don't exist yet). Instead, emit a single \`find-leads\` step with args including the post-condition ("AI/CV companies, then I'll separately enrich the top 3 by ICP score") and let the user kick off the next phase via reactions. The current planner does NOT support data-flow between steps; document this in \`rationale\`.
- Order steps strictly: discovery before enrichment before drafting.

## Examples

User: "find AI/CV companies, enrich top 3, draft outreach for top 3"
Plan:
\`\`\`
{
  "steps": [
    { "skill": "find-leads", "args": "AI/computer vision companies", "description": "Discover ~10 AI/CV ICP-fit companies and write them as leads.", "requiresConfirmation": false }
  ],
  "estimatedCostUsd": 0.015,
  "estimatedDurationSec": 60,
  "rationale": "Phase 1 only. After Mostafa reviews the surfaced leads, he can /nikola enrich <leadId> and /nikola try <leadId> for the top 3. Inter-step data flow not supported by current executor.",
  "requiresSplit": false
}
\`\`\`

User: "research vercel, replicate, and modal"
Plan:
\`\`\`
{
  "steps": [
    { "skill": "try", "args": "Vercel", "description": "Research Vercel + draft outreach.", "requiresConfirmation": false },
    { "skill": "try", "args": "Replicate", "description": "Research Replicate + draft outreach.", "requiresConfirmation": false },
    { "skill": "try", "args": "Modal", "description": "Research Modal + draft outreach.", "requiresConfirmation": true }
  ],
  "estimatedCostUsd": 0.18,
  "estimatedDurationSec": 150,
  "rationale": "Three independent research+draft calls. Confirmation set on the third because cumulative cost crosses $0.05.",
  "requiresSplit": false
}
\`\`\`

User: "what's my pipeline state and then find me 5 new ai companies"
Plan:
\`\`\`
{
  "steps": [
    { "skill": "analytical-query", "args": "show me my pipeline state and key metrics", "description": "Pipeline snapshot first.", "requiresConfirmation": false },
    { "skill": "find-leads", "args": "AI companies", "description": "Then surface 5 new AI prospects.", "requiresConfirmation": false }
  ],
  "estimatedCostUsd": 0.02,
  "estimatedDurationSec": 75,
  "rationale": "Read pipeline first so the discovery focus is informed.",
  "requiresSplit": false
}
\`\`\`

Now: read the user's request, plan the steps, and emit JSON matching the schema.
`;

