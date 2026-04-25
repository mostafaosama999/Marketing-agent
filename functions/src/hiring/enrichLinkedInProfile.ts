import axios from "axios";

const APIFY_ACTOR = "harvestapi~linkedin-profile-scraper";
const APIFY_RUN_SYNC_URL = `https://api.apify.com/v2/acts/${APIFY_ACTOR}/run-sync-get-dataset-items`;
const PROFILE_MODE = "Profile details no email ($4 per 1k)";
const COST_PER_PROFILE_USD = 0.004;
const HTTP_TIMEOUT_MS = 120_000;

export type EnrichmentResult =
  | { status: "enriched"; data: Record<string, any>; costUsd: number }
  | { status: "skipped_no_url" }
  | { status: "skipped_invalid_url" }
  | { status: "skipped_no_token" }
  | { status: "failed"; error: string; costUsd: 0 };

// Mirrors agency-app/src/utils/normalizeLinkedInUrl.ts
function normalizeLinkedInUrl(url: string): string {
  if (!url) return "";
  let r = url.trim().toLowerCase();
  r = r.replace(/^https?:\/\//, "");
  r = r.replace(/^www\./, "");
  const q = r.indexOf("?");
  if (q !== -1) r = r.slice(0, q);
  const h = r.indexOf("#");
  if (h !== -1) r = r.slice(0, h);
  r = r.replace(/\/+/g, "/");
  r = r.replace(/\/+$/, "");
  return r;
}

function isLikelyLinkedInProfile(normalized: string): boolean {
  return /^linkedin\.com\/in\/[a-z0-9-_%]+/i.test(normalized);
}

export async function enrichLinkedInProfile(
  linkedInUrl: string,
  apifyToken: string | undefined
): Promise<EnrichmentResult> {
  if (!apifyToken) return {status: "skipped_no_token"};
  if (!linkedInUrl || !linkedInUrl.trim()) return {status: "skipped_no_url"};

  const normalized = normalizeLinkedInUrl(linkedInUrl);
  if (!isLikelyLinkedInProfile(normalized)) return {status: "skipped_invalid_url"};

  const fullUrl = `https://${normalized}`;

  try {
    const response = await axios.post(
      APIFY_RUN_SYNC_URL,
      {
        profileScraperMode: PROFILE_MODE,
        queries: [fullUrl],
      },
      {
        params: {token: apifyToken},
        timeout: HTTP_TIMEOUT_MS,
        headers: {"Content-Type": "application/json"},
        validateStatus: (s) => s < 500,
      }
    );

    if (response.status >= 400) {
      return {
        status: "failed",
        error: `Apify HTTP ${response.status}: ${JSON.stringify(response.data).slice(0, 300)}`,
        costUsd: 0,
      };
    }

    const items = Array.isArray(response.data) ? response.data : [];
    if (items.length === 0) {
      return {status: "failed", error: "Apify returned empty dataset", costUsd: 0};
    }

    const profile = items[0];
    if (!profile || typeof profile !== "object") {
      return {status: "failed", error: "Apify returned unexpected shape", costUsd: 0};
    }

    // Some scraper outputs include an "error" field on the item itself when the
    // URL was unreachable / private — surface those as failures rather than
    // letting the GPT prompt see a half-empty object.
    if (profile.error || profile.notFound === true) {
      return {
        status: "failed",
        error: typeof profile.error === "string" ? profile.error : "Profile not found",
        costUsd: 0,
      };
    }

    return {status: "enriched", data: profile, costUsd: COST_PER_PROFILE_USD};
  } catch (err: any) {
    const msg = err?.message || String(err);
    return {status: "failed", error: msg.slice(0, 500), costUsd: 0};
  }
}

// Build a compact prompt block from the raw Apify profile so we don't blow out
// GPT input tokens. Pulls only the fields the scoring rubric uses.
export function buildLinkedInProfileBlock(data: Record<string, any>): string {
  const parts: string[] = ["Verified LinkedIn Profile (from Apify):"];

  if (data.fullName || data.name) {
    parts.push(`- Name on profile: ${data.fullName || data.name}`);
  }
  if (data.headline) parts.push(`- Headline: ${String(data.headline).slice(0, 200)}`);

  const loc = data.location?.parsed || data.location;
  if (loc) {
    const city = loc.city || loc.locality || "";
    const country = loc.country || loc.countryName || "";
    const locStr = [city, country].filter(Boolean).join(", ");
    if (locStr) parts.push(`- Location: ${locStr}`);
  }

  if (typeof data.followers === "number") parts.push(`- Followers: ${data.followers}`);
  if (typeof data.connections === "number") parts.push(`- Connections: ${data.connections}`);

  if (data.about) parts.push(`- About: ${String(data.about).slice(0, 800)}`);

  const education = Array.isArray(data.education) ? data.education : [];
  if (education.length > 0) {
    parts.push("- Education:");
    for (const e of education.slice(0, 4)) {
      const school = e.schoolName || e.school || "";
      const degree = e.degree || "";
      const field = e.fieldOfStudy || e.field || "";
      const period = [e.startDate, e.endDate].filter(Boolean).join(" – ");
      parts.push(`  • ${[school, degree, field].filter(Boolean).join(", ")}${period ? ` (${period})` : ""}`);
    }
  }

  const experience = Array.isArray(data.experience) ? data.experience : [];
  if (experience.length > 0) {
    parts.push("- Experience (most recent first):");
    for (const x of experience.slice(0, 5)) {
      const title = x.title || x.position || "";
      const company = x.companyName || x.company || "";
      const duration = x.duration || [x.startDate, x.endDate || "Present"].filter(Boolean).join(" – ");
      const desc = (x.description || "").toString().slice(0, 250).replace(/\s+/g, " ");
      parts.push(`  • ${title}${company ? ` @ ${company}` : ""}${duration ? ` (${duration})` : ""}${desc ? ` — ${desc}` : ""}`);
    }
  }

  const langs = Array.isArray(data.languages) ? data.languages : [];
  if (langs.length > 0) {
    parts.push(
      `- Languages: ${langs
        .slice(0, 6)
        .map((l: any) => `${l.name || l.language || ""}${l.proficiency ? ` (${l.proficiency})` : ""}`)
        .filter(Boolean)
        .join("; ")}`
    );
  }

  const certs = Array.isArray(data.certifications) ? data.certifications : [];
  if (certs.length > 0) {
    parts.push(`- Certifications: ${certs.length} listed${certs.length <= 5 ? ` (${certs.map((c: any) => c.name || c.title || "").filter(Boolean).join("; ")})` : ""}`);
  }

  return parts.join("\n");
}
