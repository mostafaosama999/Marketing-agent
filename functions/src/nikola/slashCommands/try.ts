import * as admin from "firebase-admin";
import OpenAI from "openai";
import {MODELS, openaiApiKey} from "../config";
import {humanizeVariants} from "../humanizeWrap";
import {TRY_PARSER_PROMPT} from "../prompts/tryParserPrompt";
import {routeForLead} from "../routeSkill";
import {runSkill} from "../skillRunner";
import {postDraft, postNotice} from "../slack/postDraft";
import {SlashPayload} from "../slack/slashHandler";
import {LeadDoc} from "../types";
import {normaliseVariants} from "../variantParser";

let _ai: OpenAI | null = null;
function ai(): OpenAI {
  if (!_ai) _ai = new OpenAI({apiKey: openaiApiKey()});
  return _ai;
}

/**
 * /nikola try <anything>
 * Anything = leadId | LinkedIn URL | website URL | company name | "Person at Company" | freeform research request
 *
 * Resolves into a lead, then routes + drafts + posts.
 *
 * `threadTs` (optional): when called from a mention or thread context, results
 * are posted in that Slack thread instead of #bdr root.
 */
export async function handleTry(
  args: string,
  _payload?: SlashPayload,
  threadTs?: string
): Promise<void> {
  if (!args.trim()) {
    await postNotice("Usage: `/nikola try <leadId | name | URL | LinkedIn | freeform>`", threadTs);
    return;
  }

  const parsed = await parseInput(args);
  let lead: LeadDoc | null = null;

  switch (parsed.kind) {
    case "leadId":
      lead = await loadLead(parsed.value);
      break;
    case "linkedin":
    case "url":
    case "company":
    case "person":
      lead = await findOrCreateLead(parsed);
      break;
    case "research":
      // No specific target — kick off lead-generation with the description as focus
      await postNotice(`🔎 Researching: ${parsed.value}. Will surface candidates as new leads.`, threadTs);
      try {
        await runSkill("lead-generation", {focusArea: parsed.value});
        await postNotice("✅ Discovery complete — check `leads` collection or `/nikola status`.", threadTs);
      } catch (e) {
        await postNotice(`❌ Discovery failed: ${e instanceof Error ? e.message : String(e)}`, threadTs);
      }
      return;
  }

  if (!lead) {
    await postNotice(`Couldn't resolve "${args}" to a lead.`, threadTs);
    return;
  }

  // Route + draft
  const route = routeForLead(lead);
  if (!route) {
    await postNotice(
      `Lead "${lead.name || lead.company}" isn't actionable (status=${lead.status}, archived=${lead.archived}).`,
      threadTs
    );
    return;
  }
  let result;
  try {
    result = await runSkill(route.skill, {lead, mode: route.mode});
  } catch (e) {
    await postNotice(`❌ ${route.skill} failed: ${e instanceof Error ? e.message : String(e)}`, threadTs);
    return;
  }
  const variants = normaliseVariants(result.variants);
  if (variants.length === 0) {
    await postNotice(
      `No variants produced for ${lead.name || lead.company}. Reason: ${(result.metadata?.reason as string) || "unknown"}`,
      threadTs
    );
    return;
  }
  const humanized = await humanizeVariants(variants, "linkedin");
  await postDraft({
    lead,
    variants: humanized,
    skillUsed: route.skill,
    skillResult: result,
    channel: "linkedin",
    index: 1,
    total: 1,
    threadTs,
  });
}

interface ParsedInput {
  kind: "leadId" | "linkedin" | "url" | "company" | "person" | "research";
  value: string;
  hint?: string;
}

async function parseInput(input: string): Promise<ParsedInput> {
  // Cheap regex pre-checks
  if (/^[a-zA-Z0-9]{18,28}$/.test(input.trim())) {
    return {kind: "leadId", value: input.trim()};
  }
  if (/linkedin\.com\/in\//i.test(input)) {
    return {kind: "linkedin", value: input.trim()};
  }
  if (/^https?:\/\//i.test(input.trim())) {
    return {kind: "url", value: input.trim()};
  }
  // For ambiguous text, ask the LLM (cheap GPT-4.1 mini call)
  try {
    const completion = await ai().chat.completions.create({
      model: MODELS.fast,
      messages: [
        {role: "system", content: TRY_PARSER_PROMPT},
        {role: "user", content: input},
      ],
      response_format: {type: "json_object"},
      max_completion_tokens: 200,
    });
    const raw = completion.choices[0].message.content || "{}";
    const parsed = JSON.parse(raw) as ParsedInput;
    if (parsed.kind && parsed.value) return parsed;
  } catch {
    // fallthrough to default
  }
  // Default to "company"
  return {kind: "company", value: input.trim()};
}

async function loadLead(leadId: string): Promise<LeadDoc | null> {
  const snap = await admin.firestore().collection("leads").doc(leadId).get();
  if (!snap.exists) return null;
  return {id: snap.id, ...(snap.data() as Omit<LeadDoc, "id">)};
}

async function findOrCreateLead(parsed: ParsedInput): Promise<LeadDoc | null> {
  // Try to find by company / name / linkedin first
  if (parsed.kind === "linkedin") {
    const snap = await admin
      .firestore()
      .collection("leads")
      .where("outreach.linkedIn.profileUrl", "==", parsed.value)
      .limit(1)
      .get();
    if (!snap.empty) {
      return {id: snap.docs[0].id, ...(snap.docs[0].data() as Omit<LeadDoc, "id">)};
    }
  }
  if (parsed.kind === "company" || parsed.kind === "url") {
    const company = parsed.kind === "company" ? parsed.value : domainFrom(parsed.value);
    const snap = await admin
      .firestore()
      .collection("leads")
      .where("company", "==", company)
      .limit(1)
      .get();
    if (!snap.empty) {
      return {id: snap.docs[0].id, ...(snap.docs[0].data() as Omit<LeadDoc, "id">)};
    }
  }

  // Create a fresh lead skeleton
  const ref = admin.firestore().collection("leads").doc();
  const now = admin.firestore.Timestamp.now();
  const companyName =
    parsed.kind === "company"
      ? parsed.value
      : parsed.kind === "url"
        ? domainFrom(parsed.value)
        : parsed.kind === "person"
          ? parsed.hint
          : undefined;
  const skeleton: LeadDoc = {
    id: ref.id,
    name: parsed.kind === "person" ? parsed.value : undefined,
    company: companyName,
    companyIndustry: companyName ? await lookupCompanyIndustry(companyName) : undefined,
    status: "new_lead",
    outreach: {
      linkedIn: {
        status: "not_sent",
        profileUrl: parsed.kind === "linkedin" ? parsed.value : undefined,
      },
      email: {status: "not_sent"},
    },
    customFields: {createdBy: "nikola", source: "/nikola try"},
    createdAt: now,
    updatedAt: now,
  };
  await ref.set(skeleton);
  return skeleton;
}

/**
 * Look up the industry on the matching `entities` doc, if one exists.
 * Industry source = customFields.company_type (no top-level industry field).
 * Returns undefined otherwise.
 */
async function lookupCompanyIndustry(companyName: string): Promise<string | undefined> {
  try {
    const snap = await admin
      .firestore()
      .collection("entities")
      .where("name", "==", companyName)
      .limit(1)
      .get();
    if (snap.empty) return undefined;
    const data = snap.docs[0].data() as {customFields?: {company_type?: string}};
    return data.customFields?.company_type || undefined;
  } catch {
    return undefined;
  }
}

function domainFrom(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
