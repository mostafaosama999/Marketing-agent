import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";
import {NIKOLA_BUNDLE_DIR} from "./config";
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

function readSkillBody(skill: SkillName): string {
  if (skillBodyCache.has(skill)) return skillBodyCache.get(skill)!;
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
