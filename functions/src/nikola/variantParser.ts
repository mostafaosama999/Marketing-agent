import {Variant} from "./types";

/**
 * Variants come from OpenAI structured outputs as Variant[]. This module
 * normalises them: trims whitespace, caps to 3, ensures distinct names,
 * and provides a fallback when the model only returned a single body.
 */

const MAX_VARIANTS = 3;

const FALLBACK_NAMES = ["Direct", "Question Lead", "Provocative"];

export function normaliseVariants(input: Variant[] | undefined): Variant[] {
  if (!input || input.length === 0) return [];
  const cleaned = input
    .map((v, idx) => ({
      name: (v.name || FALLBACK_NAMES[idx] || `Variant ${idx + 1}`).trim(),
      body: (v.body || "").trim(),
    }))
    .filter((v) => v.body.length > 0);

  // Deduplicate by body (model sometimes emits near-duplicates)
  const seen = new Set<string>();
  const unique: Variant[] = [];
  for (const v of cleaned) {
    const key = v.body.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(v);
  }
  return unique.slice(0, MAX_VARIANTS);
}

/** Used when generate-outreach didn't return variants (e.g. cold-skill fallback). */
export function singleVariantFromBody(name: string, body: string): Variant[] {
  return body.trim() ? [{name, body: body.trim()}] : [];
}
