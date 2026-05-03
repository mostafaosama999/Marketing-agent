import * as admin from "firebase-admin";
import * as crypto from "crypto";
import * as fs from "fs";
import * as path from "path";
import {Client as NotionClient} from "@notionhq/client";
import * as functions from "firebase-functions";
import {NIKOLA_BUNDLE_DIR, NOTION_AI_CONTEXT_PAGE_ID, notionApiKey} from "../config";
import {NikolaContextDoc, NikolaContextSource} from "../types";

/**
 * Nightly sync — pulls Notion AI Context page + reads bundled reports/companies
 * and bundled context files from the deploy filesystem, writes them all into
 * nikolaContext keyed by topic.
 *
 * Skipped if a doc with the same hash already exists.
 */

const FUNCTIONS_ROOT = path.resolve(__dirname, "..", "..", "..");
const BUNDLE_DIR = path.join(FUNCTIONS_ROOT, NIKOLA_BUNDLE_DIR);

export async function runContextSync(): Promise<void> {
  let total = 0;
  total += await syncNotion();
  total += await syncBundledReports();
  total += await syncBundledContextFiles();
  functions.logger.info(`Nikola context sync done: ${total} docs upserted`);
}

async function syncNotion(): Promise<number> {
  let key: string;
  try {
    key = notionApiKey();
  } catch {
    functions.logger.warn("Notion API key not configured; skipping Notion sync");
    return 0;
  }
  const notion = new NotionClient({auth: key});
  let pageBlocks;
  try {
    // Get page metadata (title) + all blocks (recursively for plain text)
    pageBlocks = await notion.blocks.children.list({
      block_id: NOTION_AI_CONTEXT_PAGE_ID,
      page_size: 100,
    });
  } catch (e) {
    functions.logger.error("Notion fetch failed", {
      error: e instanceof Error ? e.message : String(e),
    });
    return 0;
  }

  const text = blocksToMarkdown(pageBlocks.results as never[]);
  return upsertContext({
    source: "notion",
    topic: "ai-context",
    body: text,
    sourceUrl: `https://notion.so/${NOTION_AI_CONTEXT_PAGE_ID.replace(/-/g, "")}`,
  });
}

async function syncBundledReports(): Promise<number> {
  const dir = path.join(BUNDLE_DIR, "reports-companies");
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  let n = 0;
  for (const f of files) {
    const body = fs.readFileSync(path.join(dir, f), "utf8");
    const topic = path.basename(f, ".md");
    n += await upsertContext({
      source: "report",
      topic,
      body,
      sourceUrl: `bundled:reports-companies/${f}`,
    });
  }
  return n;
}

async function syncBundledContextFiles(): Promise<number> {
  const dir = path.join(BUNDLE_DIR, "context");
  if (!fs.existsSync(dir)) return 0;
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".md"));
  let n = 0;
  for (const f of files) {
    const body = fs.readFileSync(path.join(dir, f), "utf8");
    const topic = path.basename(f, ".md");
    n += await upsertContext({
      source: "context-file",
      topic,
      body,
      sourceUrl: `bundled:context/${f}`,
    });
  }
  return n;
}

async function upsertContext(input: {
  source: NikolaContextSource;
  topic: string;
  body: string;
  sourceUrl: string;
}): Promise<number> {
  const hash = crypto.createHash("sha256").update(input.body).digest("hex").slice(0, 16);
  const id = `${input.source}__${input.topic}`;
  const ref = admin.firestore().collection("nikolaContext").doc(id);
  const existing = await ref.get();
  if (existing.exists) {
    const data = existing.data() as NikolaContextDoc;
    if (data.hash === hash) return 0; // unchanged
  }
  await ref.set({
    source: input.source,
    topic: input.topic,
    body: input.body,
    syncedAt: admin.firestore.Timestamp.now(),
    sourceUrl: input.sourceUrl,
    hash,
  });
  return 1;
}

/** Naive Notion blocks → markdown. Handles paragraphs, headings, bullets, code, dividers. */
function blocksToMarkdown(blocks: Array<Record<string, unknown>>): string {
  const out: string[] = [];
  for (const b of blocks) {
    const type = b.type as string;
    const inner = b[type] as Record<string, unknown> | undefined;
    if (!inner) continue;
    const richText = (inner.rich_text as Array<{plain_text?: string}> | undefined) || [];
    const text = richText.map((r) => r.plain_text || "").join("");
    switch (type) {
      case "paragraph":
        if (text) out.push(text);
        break;
      case "heading_1":
        out.push(`# ${text}`);
        break;
      case "heading_2":
        out.push(`## ${text}`);
        break;
      case "heading_3":
        out.push(`### ${text}`);
        break;
      case "bulleted_list_item":
        out.push(`- ${text}`);
        break;
      case "numbered_list_item":
        out.push(`1. ${text}`);
        break;
      case "code":
        out.push("```\n" + text + "\n```");
        break;
      case "divider":
        out.push("---");
        break;
      case "quote":
        out.push(`> ${text}`);
        break;
      default:
        if (text) out.push(text);
    }
  }
  return out.join("\n\n");
}
