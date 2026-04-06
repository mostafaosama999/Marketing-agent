/**
 * Normalize a LinkedIn URL to a canonical form for matching.
 * Result: "linkedin.com/in/username" (no protocol, no www, no trailing slash, lowercase)
 */
export function normalizeLinkedInUrl(url: string): string {
  if (!url) return "";
  let s = url.trim().toLowerCase();
  // Strip protocol
  s = s.replace(/^https?:\/\//, "");
  // Strip www.
  s = s.replace(/^www\./, "");
  // Strip query params and hash
  s = s.replace(/[?#].*$/, "");
  // Strip trailing slashes
  s = s.replace(/\/+$/, "");
  return s;
}
