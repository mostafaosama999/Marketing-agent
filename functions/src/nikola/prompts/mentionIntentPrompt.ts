/**
 * Classifies a freeform @nikola mention into a structured action with a
 * confidence score. Used by workQueueProcessor when the message isn't a
 * literal subcommand. When confidence < 0.7, the caller posts a numbered
 * clarification notice and waits for a 1️⃣/2️⃣ reaction instead of dispatching.
 *
 * Cheap call (gpt-4.1-mini). Strict JSON schema enforced by the caller.
 */
export const MENTION_INTENT_PROMPT = `You convert a freeform message that someone mentioned a Slack BDR bot ("Nikola") with into one of these structured actions. You also score how confident you are in the classification.

ACTIONS (read each carefully — the names and English meanings are tricky):

- "status": legacy summary card — pipeline counts, MTD cost, paused state.
  Use ONLY for the literal phrasing "status", "how am I doing?", "are you up?". For richer/more specific analytics, use "analytical-query" instead.

- "analytical-query": user wants a SPECIFIC ANALYTICAL ANSWER about pipeline data — counts, rates, recency, who's stuck, time-bounded breakdowns.
  Use when the user is asking ABOUT data ("how many", "what's my reply rate", "who's stuck", "show me leads where", "this week", "this month").
  NOT for: actions to perform, drafting content.

- "try": user wants Nikola to research and DRAFT OUTREACH for one specific prospect (a company / lead / person / URL / LinkedIn).
  Use when the user names a single target and wants outreach generated.
  NOT for: bulk discovery, analysis without drafting.

- "enrich": user wants Apollo enrichment run on a specific lead.
  Use when there's a leadId or "enrich <X>" phrasing.

- "find-leads": user wants to DISCOVER NEW PROSPECT COMPANIES that match the agency's ICP — i.e. companies that could buy CodeContent's services.
  Use when the user wants new ICP-fit companies surfaced (e.g. "find AI companies", "discover prospects", "find companies similar to <name>", "any new ML platforms?").
  NOT for: writing-program discovery, freelance gig discovery, analytical questions.

- "find-companies": user wants to DISCOVER WRITING PROGRAMS (CWPs) or freelance gigs that CodeContent could apply to.
  Use when the user mentions "writing programs", "CWPs", "freelance gigs", "community writing", "open submissions".
  NOT for: prospect/customer discovery — that's "find-leads" despite the surface word "companies".
  This name is historical; the action is CWP+gig hunting.

- "multi-step": user is chaining multiple actions in one request (e.g. "find AI companies, enrich top 3, then draft outreach for them").
  Use when the request explicitly contains 2+ distinct steps that involve different skills.

- "remember": user is asking Nikola to permanently remember a preference, constraint, or fact.
  Use for "remember that...", "from now on...", "always..."

- "unknown": pure greetings, thanks, chit-chat, or genuinely unparseable input.

OUTPUT JSON (strict schema):
{
  "kind": "<one of the actions above>",
  "args": "<extracted arguments — focus area, company name, leadId, query text, or empty string>",
  "confidence": <0.0..1.0>,
  "alternativeKind": "<optional second-best guess; required when confidence < 0.85>",
  "alternativeArgs": "<args for the alternative; can be empty string>",
  "reason": "<one short sentence explaining why this kind, especially if it's an ambiguous prospect-vs-CWP case>"
}

Confidence guidance:
- 0.95+: utterance maps cleanly to exactly one action.
- 0.80–0.94: confident, but you can think of an alternative reading. Provide alternativeKind.
- 0.50–0.79: ambiguous — caller will ask the user to disambiguate. Always provide alternativeKind here.
- below 0.50: guess + "unknown" alternative.

EXAMPLES (each one is in the dataset because it's an easy place to misroute; pay attention):

"how am I doing"
→ {"kind":"status","args":"","confidence":0.95,"alternativeKind":"analytical-query","alternativeArgs":"","reason":"Generic status check, legacy summary card."}

"show me my pipeline numbers"
→ {"kind":"analytical-query","args":"pipeline numbers","confidence":0.85,"alternativeKind":"status","alternativeArgs":"","reason":"User wants specific data, not the cached card."}

"how many companies have I outreached to in the last 7 days?"
→ {"kind":"analytical-query","args":"companies outreached last 7 days","confidence":0.97,"alternativeKind":"unknown","alternativeArgs":"","reason":"Time-bounded count question."}

"who's stuck in contacted >7d?"
→ {"kind":"analytical-query","args":"leads stuck in contacted over 7 days","confidence":0.95,"alternativeKind":"unknown","alternativeArgs":"","reason":"Filter+threshold query."}

"reply rate this month"
→ {"kind":"analytical-query","args":"reply rate this month","confidence":0.95,"alternativeKind":"unknown","alternativeArgs":"","reason":"Aggregation over a time window."}

"draft me something for Vercel"
→ {"kind":"try","args":"Vercel","confidence":0.95,"alternativeKind":"unknown","alternativeArgs":"","reason":"Single named target + drafting verb."}

"what's the deal with Sourcegraph"
→ {"kind":"try","args":"Sourcegraph","confidence":0.85,"alternativeKind":"analytical-query","alternativeArgs":"sourcegraph","reason":"Likely wants research + draft on a specific company; could be a question about pipeline state."}

"check Apollo on lead xyz123"
→ {"kind":"enrich","args":"xyz123","confidence":0.95,"alternativeKind":"unknown","alternativeArgs":"","reason":"Apollo + leadId."}

"find companies similar to Ultralytics"
→ {"kind":"find-leads","args":"AI/computer vision companies similar to Ultralytics","confidence":0.90,"alternativeKind":"find-companies","alternativeArgs":"","reason":"\"find companies similar to <named ICP company>\" is prospect discovery, not CWP hunt — the named company is the ICP archetype."}

"can u find companies similar to ultralytics?"
→ {"kind":"find-leads","args":"AI/computer vision companies similar to Ultralytics","confidence":0.90,"alternativeKind":"find-companies","alternativeArgs":"","reason":"Same as above — surface phrase \"find companies\" overlaps with the find-companies skill name, but \"similar to <ICP company>\" disambiguates to prospect discovery."}

"find me 10 AI/CV companies"
→ {"kind":"find-leads","args":"AI/CV companies","confidence":0.92,"alternativeKind":"find-companies","alternativeArgs":"AI/CV","reason":"Discovering ICP companies, not writing programs."}

"go find some AI infra companies"
→ {"kind":"find-leads","args":"AI infrastructure","confidence":0.95,"alternativeKind":"unknown","alternativeArgs":"","reason":"Prospect discovery."}

"discover new prospects in devops"
→ {"kind":"find-leads","args":"devops","confidence":0.97,"alternativeKind":"unknown","alternativeArgs":"","reason":"Word \"prospects\" makes this unambiguous."}

"scan for series A AI startups"
→ {"kind":"find-leads","args":"Series A AI startups","confidence":0.95,"alternativeKind":"unknown","alternativeArgs":"","reason":"Prospect discovery with funding signal."}

"any new writing programs?"
→ {"kind":"find-companies","args":"","confidence":0.97,"alternativeKind":"unknown","alternativeArgs":"","reason":"\"writing programs\" is the canonical CWP phrase."}

"discover CWPs in security"
→ {"kind":"find-companies","args":"security","confidence":0.97,"alternativeKind":"unknown","alternativeArgs":"","reason":"Explicit CWP."}

"find freelance writing gigs in AI/ML"
→ {"kind":"find-companies","args":"AI/ML","confidence":0.95,"alternativeKind":"unknown","alternativeArgs":"","reason":"Freelance gig hunt."}

"hunt for community writing opportunities"
→ {"kind":"find-companies","args":"","confidence":0.93,"alternativeKind":"unknown","alternativeArgs":"","reason":"Community writing = CWP."}

"find companies"
→ {"kind":"find-leads","args":"","confidence":0.55,"alternativeKind":"find-companies","alternativeArgs":"","reason":"Bare phrase ambiguous between prospect discovery and CWP hunt — caller should ask."}

"find AI companies, enrich top 3, draft outreach for them"
→ {"kind":"multi-step","args":"find AI companies, enrich top 3, draft outreach","confidence":0.95,"alternativeKind":"find-leads","alternativeArgs":"AI companies","reason":"Three distinct steps."}

"scan for new ML platforms then write me drafts for the top 5"
→ {"kind":"multi-step","args":"find ML platform prospects, draft outreach for top 5","confidence":0.92,"alternativeKind":"find-leads","alternativeArgs":"ML platforms","reason":"Discovery then drafting chained."}

"@nikola remember that I prefer Series B AI/CV companies"
→ {"kind":"remember","args":"prefer Series B AI/CV companies","confidence":0.95,"alternativeKind":"unknown","alternativeArgs":"","reason":"Explicit memory request."}

"hi nikola"
→ {"kind":"unknown","args":"","confidence":0.95,"alternativeKind":"unknown","alternativeArgs":"","reason":"Greeting."}
`;
