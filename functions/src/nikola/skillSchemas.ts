import {SkillName} from "./types";

/**
 * JSON Schemas for OpenAI structured outputs (response_format.json_schema).
 * One per skill. The model is forced to emit JSON conforming to this shape;
 * we never parse markdown variants ourselves.
 *
 * `strict: true` requires every field declared in `properties` to also be in
 * `required`. We keep schemas tight and use `nullable` on optional fields by
 * adding null to the type union.
 */

type SchemaWrapper = {
  name: string;
  strict: true;
  schema: Record<string, unknown>;
};

const variantSchema = {
  type: "object",
  properties: {
    name: {type: "string", description: "Variant label, e.g. 'Question Lead', 'Direct', 'Provocative'"},
    body: {type: "string", description: "Final message text, ready for paste / send"},
  },
  required: ["name", "body"],
  additionalProperties: false,
};

const rightContactSchema = {
  type: "object",
  properties: {
    name: {type: "string"},
    linkedinUrl: {type: ["string", "null"]},
    title: {type: ["string", "null"]},
    email: {type: ["string", "null"]},
  },
  required: ["name", "linkedinUrl", "title", "email"],
  additionalProperties: false,
};

const icpScoreSchema = {
  type: "object",
  properties: {
    mustHave: {type: "integer"},
    bonus: {type: "integer"},
    tier: {type: "string", enum: ["hot", "warm", "cold", "skip"]},
  },
  required: ["mustHave", "bonus", "tier"],
  additionalProperties: false,
};

const cwpFlagSchema = {
  type: "object",
  properties: {
    detected: {type: "boolean"},
    programs: {type: ["array", "null"], items: {type: "string"}},
  },
  required: ["detected", "programs"],
  additionalProperties: false,
};

export const SKILL_SCHEMAS: Record<SkillName, SchemaWrapper> = {
  "generate-outreach": {
    name: "generate_outreach_output",
    strict: true,
    schema: {
      type: "object",
      properties: {
        variants: {
          type: "array",
          minItems: 1,
          maxItems: 3,
          items: variantSchema,
          description: "1-3 send-ready outreach variants. LinkedIn DM bodies (no greetings beyond 'Hi <name>').",
        },
        rightContact: rightContactSchema,
        icpScore: icpScoreSchema,
        contentIdea: {type: "string", description: "Bottom-of-funnel content idea (one line)"},
        cwpFlag: cwpFlagSchema,
        researchSummary: {
          type: "string",
          description: "1-3 sentence summary of WHY these variants are right for this lead",
        },
      },
      required: [
        "variants",
        "rightContact",
        "icpScore",
        "contentIdea",
        "cwpFlag",
        "researchSummary",
      ],
      additionalProperties: false,
    },
  },

  "sales": {
    name: "sales_output",
    strict: true,
    schema: {
      type: "object",
      properties: {
        classification: {
          type: "string",
          enum: ["positive", "objection", "rejection", "silence", "warm", "asking", "dead"],
        },
        recommendedMode: {
          type: "string",
          enum: [
            "reply",
            "diagnose",
            "escalate",
            "prep-call",
            "post-call",
            "spec",
            "reengage",
            "trial-close",
            "stage",
            "none",
          ],
        },
        reason: {type: "string"},
        variants: {
          type: "array",
          minItems: 1,
          maxItems: 3,
          items: variantSchema,
          description: "1-3 send-ready response variants for the recommended mode",
        },
        suggestedNextTouchAfterDays: {type: ["integer", "null"]},
      },
      required: [
        "classification",
        "recommendedMode",
        "reason",
        "variants",
        "suggestedNextTouchAfterDays",
      ],
      additionalProperties: false,
    },
  },

  "lead-generation": {
    name: "lead_generation_output",
    strict: true,
    schema: {
      type: "object",
      properties: {
        focusArea: {type: "string"},
        leads: {
          type: "array",
          maxItems: 30,
          items: {
            type: "object",
            properties: {
              companyName: {type: "string"},
              website: {type: "string"},
              icpTier: {type: "string", enum: ["hot", "warm", "cold", "skip"]},
              employeeCount: {type: ["integer", "null"]},
              fundingSignal: {type: ["string", "null"]},
              hookForOutreach: {type: "string"},
              suggestedContactTitle: {type: "string"},
              source: {type: "string", description: "Where this was discovered (URL or signal)"},
              dedupeStatus: {type: "string", enum: ["new", "duplicate-of-existing"]},
              /* W7 — richer per-lead detail so the Slack output reads like
                 a Claude Skill report instead of a one-liner. */
              whyGoodFit: {
                type: "string",
                description:
                  "2-4 sentence narrative on why this company fits CodeContent's ICP — what they do, their content investment level, who their developer audience is. Concrete, not generic.",
              },
              whyMaybeNotFit: {
                type: ["string", "null"],
                description:
                  "Honest counterpoint: what could make this a bad fit (wrong stage, too small, no blog, internal-tools focus). Null only if there's truly nothing concerning.",
              },
              topContentGap: {
                type: ["string", "null"],
                description:
                  "Specific content gap CodeContent could fill — e.g. 'no integration tutorials for their new V2 SDK', 'sparse blog despite recent funding'. Cite a URL or recent product event.",
              },
              signalsObserved: {
                type: "array",
                items: {type: "string"},
                description:
                  "Concrete signals seen during research: funding round + amount, hiring posts, product launches, Twitter/blog cadence. Each item should reference where you saw it.",
              },
              recentBlogPostUrl: {
                type: ["string", "null"],
                description: "URL of the most recent blog post seen during research, or null if no blog or scraping failed.",
              },
            },
            required: [
              "companyName",
              "website",
              "icpTier",
              "employeeCount",
              "fundingSignal",
              "hookForOutreach",
              "suggestedContactTitle",
              "source",
              "dedupeStatus",
              "whyGoodFit",
              "whyMaybeNotFit",
              "topContentGap",
              "signalsObserved",
              "recentBlogPostUrl",
            ],
            additionalProperties: false,
          },
        },
        /**
         * Companies the model surfaced in search results but could NOT fully
         * qualify (typically because page scraping failed). Surfacing these
         * in Slack lets Mostafa see what was actually discovered even when
         * the strict `leads` schema would otherwise hide them.
         */
        discoveredButUnqualified: {
          type: "array",
          maxItems: 20,
          description:
            "Companies surfaced in search but not fully qualified (e.g. couldn't scrape their site). Always populate when scrapes fail; leave empty when all results were qualified.",
          items: {
            type: "object",
            properties: {
              companyName: {type: "string"},
              website: {type: ["string", "null"]},
              reason: {
                type: "string",
                description: "Why this couldn't be qualified — e.g. \"scrape failed\", \"insufficient signal\", \"out of scope\".",
              },
              source: {
                type: "string",
                description: "Where the name was discovered (search query or URL).",
              },
            },
            required: ["companyName", "website", "reason", "source"],
            additionalProperties: false,
          },
        },
        summary: {type: "string"},
      },
      required: ["focusArea", "leads", "discoveredButUnqualified", "summary"],
      additionalProperties: false,
    },
  },

  "humanize": {
    name: "humanize_output",
    strict: true,
    schema: {
      type: "object",
      properties: {
        humanizedBody: {type: "string"},
        changeSummary: {type: "string"},
      },
      required: ["humanizedBody", "changeSummary"],
      additionalProperties: false,
    },
  },

  "cwp-hunt": {
    name: "cwp_hunt_output",
    strict: true,
    schema: {
      type: "object",
      properties: {
        focusArea: {type: "string"},
        programs: {
          type: "array",
          maxItems: 30,
          items: {
            type: "object",
            properties: {
              programName: {type: "string"},
              companyName: {type: "string"},
              url: {type: "string"},
              status: {type: "string", enum: ["open", "closed", "unknown"]},
              paymentAmount: {type: ["string", "null"]},
              fitScore: {type: "integer", minimum: 0, maximum: 100},
              evidence: {type: "string"},
            },
            required: [
              "programName",
              "companyName",
              "url",
              "status",
              "paymentAmount",
              "fitScore",
              "evidence",
            ],
            additionalProperties: false,
          },
        },
        summary: {type: "string"},
      },
      required: ["focusArea", "programs", "summary"],
      additionalProperties: false,
    },
  },

  "cwp-apply": {
    name: "cwp_apply_output",
    strict: true,
    schema: {
      type: "object",
      properties: {
        programName: {type: "string"},
        viability: {
          type: "object",
          properties: {
            competitorDetected: {type: "boolean"},
            paymentFloorMet: {type: "boolean"},
            domainFit: {type: "boolean"},
            fresh: {type: "boolean"},
            submissionMechanismKnown: {type: "boolean"},
          },
          required: [
            "competitorDetected",
            "paymentFloorMet",
            "domainFit",
            "fresh",
            "submissionMechanismKnown",
          ],
          additionalProperties: false,
        },
        applicationBody: {type: "string"},
        topicPitches: {type: "array", items: {type: "string"}, maxItems: 5},
        followUpEmail: {type: "string"},
      },
      required: [
        "programName",
        "viability",
        "applicationBody",
        "topicPitches",
        "followUpEmail",
      ],
      additionalProperties: false,
    },
  },

  "gig-hunt": {
    name: "gig_hunt_output",
    strict: true,
    schema: {
      type: "object",
      properties: {
        focusArea: {type: "string"},
        gigs: {
          type: "array",
          maxItems: 30,
          items: {
            type: "object",
            properties: {
              title: {type: "string"},
              companyName: {type: "string"},
              url: {type: "string"},
              kind: {type: "string", enum: ["per-piece", "hourly", "retainer"]},
              ratePer: {type: ["string", "null"]},
              fitScore: {type: "integer", minimum: 0, maximum: 100},
              isEmployment: {type: "boolean"},
              evidence: {type: "string"},
            },
            required: [
              "title",
              "companyName",
              "url",
              "kind",
              "ratePer",
              "fitScore",
              "isEmployment",
              "evidence",
            ],
            additionalProperties: false,
          },
        },
        summary: {type: "string"},
      },
      required: ["focusArea", "gigs", "summary"],
      additionalProperties: false,
    },
  },

  "learn": {
    name: "learn_output",
    strict: true,
    schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["Outreach", "ICP", "Objections", "CWP", "Accounts", "Tooling", "General"],
        },
        insight: {type: "string"},
        evidence: {type: ["string", "null"]},
      },
      required: ["category", "insight", "evidence"],
      additionalProperties: false,
    },
  },

  /* W2: read-only analyst — answers analytical questions about the pipeline. */
  "analyst": {
    name: "analyst_output",
    strict: true,
    schema: {
      type: "object",
      properties: {
        answer: {
          type: "string",
          description:
            "Slack-formatted markdown answer. Lead with the one-line headline number/answer; details after. Cite collections used.",
        },
        keyMetrics: {
          type: ["array", "null"],
          description:
            "Optional structured numbers surfaced in the answer (used to render a card).",
          items: {
            type: "object",
            properties: {
              name: {type: "string"},
              value: {type: ["string", "number"]},
              hint: {type: ["string", "null"]},
            },
            required: ["name", "value", "hint"],
            additionalProperties: false,
          },
        },
        sourcesQueried: {
          type: ["array", "null"],
          description: "Firestore collections this answer used (e.g. ['leads', 'nikolaWorkQueue']).",
          items: {type: "string"},
        },
        confidence: {type: "string", enum: ["high", "medium", "low"]},
        caveats: {
          type: ["string", "null"],
          description: "Any caveat the user should know — e.g. 'reply timestamps backfilled approximately'.",
        },
      },
      required: ["answer", "keyMetrics", "sourcesQueried", "confidence", "caveats"],
      additionalProperties: false,
    },
  },

  /* W3: multi-step planner — emits the step list. */
  "planner": {
    name: "planner_output",
    strict: true,
    schema: {
      type: "object",
      properties: {
        steps: {
          type: "array",
          minItems: 1,
          maxItems: 8,
          items: {
            type: "object",
            properties: {
              skill: {
                type: "string",
                enum: [
                  "try",
                  "enrich",
                  "find-leads",
                  "find-companies",
                  "analytical-query",
                ],
                description: "Subaction this step dispatches to. Must be a real Nikola handler.",
              },
              args: {
                type: "string",
                description: "Args string passed to the handler (focus area, leadId, query text, etc).",
              },
              description: {
                type: "string",
                description: "One-line human-readable description of what this step will do.",
              },
              requiresConfirmation: {
                type: "boolean",
                description:
                  "Set true for any step that hits a paid API (Apollo enrich, Firecrawl heavy) or costs >$0.05.",
              },
            },
            required: ["skill", "args", "description", "requiresConfirmation"],
            additionalProperties: false,
          },
        },
        estimatedCostUsd: {type: "number"},
        estimatedDurationSec: {type: "number"},
        rationale: {
          type: "string",
          description: "Why this step list. Surfaced to the user in the start-of-job preview.",
        },
        requiresSplit: {
          type: "boolean",
          description:
            "True if estimatedDurationSec > 480 — caller will queue trailing steps as a fresh work doc.",
        },
      },
      required: [
        "steps",
        "estimatedCostUsd",
        "estimatedDurationSec",
        "rationale",
        "requiresSplit",
      ],
      additionalProperties: false,
    },
  },
};
