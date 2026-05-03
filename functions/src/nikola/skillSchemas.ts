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
            ],
            additionalProperties: false,
          },
        },
        summary: {type: "string"},
      },
      required: ["focusArea", "leads", "summary"],
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
};
