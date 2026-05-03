/**
 * Parses freeform `/nikola try <anything>` input into a structured intent.
 *
 * Possible inputs:
 *   - leadId (a Firestore doc id, ~20 chars alphanumeric)
 *   - https://linkedin.com/in/<handle>
 *   - https://<company>.com
 *   - "Acme Corp" (company name)
 *   - "John Doe at Acme" (person + company)
 *   - "Find me a Series B database company that's hiring devrel" (research request)
 *
 * Returns JSON: { kind: "leadId" | "linkedin" | "url" | "company" | "person" | "research", value, hint? }
 */
export const TRY_PARSER_PROMPT = `Classify the user input into one of:
- "leadId" — looks like a Firestore document id (20 char alphanumeric, no spaces)
- "linkedin" — a linkedin.com/in/<handle> URL
- "url" — any other URL (company website, blog, docs)
- "company" — a bare company name
- "person" — a person + company ("John at Acme", "Jane Doe — Vercel")
- "research" — a freeform description / question (researches and creates a lead)

Output JSON: { "kind": "...", "value": "<canonical extraction>", "hint"?: "<extra context>" }

Examples:
"abc123def456ghi789" → { "kind": "leadId", "value": "abc123def456ghi789" }
"https://linkedin.com/in/jane-doe" → { "kind": "linkedin", "value": "https://linkedin.com/in/jane-doe" }
"https://vercel.com" → { "kind": "url", "value": "https://vercel.com" }
"Vercel" → { "kind": "company", "value": "Vercel" }
"Jane Doe at Vercel" → { "kind": "person", "value": "Jane Doe", "hint": "Vercel" }
"find me a Series B AI infrastructure company" → { "kind": "research", "value": "Series B AI infrastructure company" }
`;
