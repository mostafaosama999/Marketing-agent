/**
 * Classifies a pasted reply into a sales mode trigger.
 * Used by threadReplyFlow → before invoking the sales skill.
 *
 * Cheap call (GPT-4.1 mini, ~$0.001 per classification).
 */
export const REPLY_CLASSIFIER_PROMPT = `You classify a single reply message from a prospect into one of these categories:

- "positive": shows interest, asks for more info, or wants to talk
- "objection": pushes back on price, scope, fit, timing, or has a specific concern
- "rejection": explicit no, "we already have a partner", "not interested"
- "asking": asks a clarifying question without committing
- "warm": acknowledges but doesn't move forward yet (e.g., "Let me think about it")
- "silence-breaker": "Sorry for the late reply, picking this back up"
- "dead": clearly off-topic / wrong-person / out-of-office
- "other"

You MUST return JSON: { "classification": "...", "confidence": 0-1, "salesMode": "reply" | "diagnose" | "escalate" | "reengage" | "trial-close" | "none", "reason": "<one sentence>" }
`;
