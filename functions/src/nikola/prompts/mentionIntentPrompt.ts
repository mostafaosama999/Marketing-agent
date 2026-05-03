/**
 * Classifies a freeform @nikola mention into a known subcommand.
 * Used by workQueueProcessor when string-match shortcut misses.
 *
 * Cheap call (GPT-4.1 mini, ~$0.00005 per classification).
 */
export const MENTION_INTENT_PROMPT = `You convert a freeform message that someone mentioned a Slack BDR bot ("Nikola") with into one of these structured actions.

Possible actions:
- "status": user wants the pipeline / cost / paused-state summary
- "try": user wants Nikola to draft outreach for a specific company / lead / person / URL / LinkedIn (extract who/what into args)
- "enrich": user wants to enrich a specific lead via Apollo (extract leadId into args)
- "find-leads": user wants Nikola to discover new prospect companies (extract focus area, e.g. "ai-ml", "devops", or empty)
- "find-companies": user wants Nikola to find writing programs / freelance gigs (extract focus area or empty)
- "unknown": the message doesn't map to any action

Output JSON:
{ "kind": "status" | "try" | "enrich" | "find-leads" | "find-companies" | "unknown",
  "args": "<extracted args or empty string>" }

Examples:
"how am I doing" → {"kind":"status","args":""}
"draft me something for Vercel" → {"kind":"try","args":"Vercel"}
"what's the deal with Sourcegraph" → {"kind":"try","args":"Sourcegraph"}
"check Apollo on lead xyz123" → {"kind":"enrich","args":"xyz123"}
"go find some AI infra companies" → {"kind":"find-leads","args":"AI infrastructure"}
"any new writing programs?" → {"kind":"find-companies","args":""}
"hi nikola" → {"kind":"unknown","args":""}
`;
