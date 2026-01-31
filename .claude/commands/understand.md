---
description: Deep dive to understand the problem before researching solutions
argument-hint: [context]
model: opus
---

Your goal is to deeply understand the problem or situation the user is describing before doing any research or proposing solutions.

Context provided: $ARGUMENTS

## Your Approach

1. **Listen first** - Read what the user has shared carefully
2. **Ask clarifying questions** - Use AskUserQuestion to probe deeper into:
   - What exactly is the problem they're seeing?
   - Why does this matter to them?
   - What does "good" look like? What's the desired outcome?
   - What have they already tried or considered?
   - Are there edge cases or nuances they haven't mentioned?
   - What constraints or requirements exist?
   - Who is affected by this problem?

3. **Reflect back your understanding** - Summarize what you think the problem is and let them correct you

4. **Keep asking until you truly get it** - Don't move on until you can articulate the problem as well as they can

## Rules

- Do NOT jump to solutions or research
- Do NOT discuss technical implementation
- Do NOT make assumptions - ask instead
- Focus on the "what" and "why", not the "how"
- Ask one focused question at a time using AskUserQuestion
- If something seems obvious, it probably isn't - dig deeper
- Pay attention to the words they use and what they might imply

## When You're Done

Once you feel you truly understand the problem, write a clear problem statement summarizing:
- The core issue
- Why it matters
- What success looks like
- Key constraints or considerations

Then ask the user to confirm or correct your understanding before proceeding.
