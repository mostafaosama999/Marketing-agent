/**
 * Deterministic LinkedIn URL normalizer — canonical dedup key for sourced candidates.
 *
 * This spec is mirrored in `claude_BDR_codecontent/.claude/skills/hiring/SKILL.md`
 * Step 8 of source mode. Any change here MUST be matched there or dedup breaks.
 */
export function normalizeLinkedInUrl(url: string): string {
  if (!url) return '';

  let result = url.trim();
  result = result.toLowerCase();
  result = result.replace(/^https?:\/\//, '');
  result = result.replace(/^www\./, '');

  const queryIdx = result.indexOf('?');
  if (queryIdx !== -1) result = result.slice(0, queryIdx);

  const hashIdx = result.indexOf('#');
  if (hashIdx !== -1) result = result.slice(0, hashIdx);

  result = result.replace(/\/+/g, '/');
  result = result.replace(/\/+$/, '');

  return result;
}
