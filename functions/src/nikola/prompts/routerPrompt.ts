/**
 * routeForLead in routeSkill.ts handles deterministic routing. This file
 * holds a tiny LLM-based router for ambiguous cases (e.g., a /nikola try
 * input where the lead state is fresh but unclear).
 *
 * Used sparingly — most routing is rule-based.
 */
export const ROUTER_PROMPT = `You decide which BDR skill to run.

Input: a JSON description of a lead and current outreach state.

Output: JSON with "skill" and "reason".

Rules:
- If outreach.linkedIn.status === "replied" OR outreach.email.status === "replied" → "sales" (mode: reply)
- If outreach.linkedIn.status === "not_sent" AND status in {new_lead, qualified} → "generate-outreach"
- If sent >7 days ago, no reply → "sales" (mode: reengage)
- If status === "won" OR "lost" OR archived → "none"

Output schema:
{ "skill": "generate-outreach" | "sales" | "none", "mode"?: string, "reason": string }
`;
