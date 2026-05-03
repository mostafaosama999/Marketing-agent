/**
 * Tool registry — assembles per-skill OpenAI function-calling definitions
 * and provides a single dispatcher (executeTool) used by skillRunner.
 */
import {SkillName, ToolCallContext} from "../types";
import {webSearch} from "./webSearchTool";
import {firecrawlScrape, firecrawlSearch} from "./firecrawlTool";
import {firestoreQuery} from "./firestoreQueryTool";
import {readLead, readCompany, updateLeadOutreach, appendTimeline} from "./leadOpsTool";
import {readContext} from "./readContextTool";
import {apolloLookup} from "./apolloLookupTool";

export type ToolName =
  | "web_search"
  | "firecrawl_scrape"
  | "firecrawl_search"
  | "firestore_query"
  | "read_lead"
  | "read_company"
  | "update_lead_outreach"
  | "append_timeline"
  | "read_context"
  | "apollo_lookup";

/* OpenAI Chat Completions function-calling schema for each tool */
const DEFINITIONS: Record<ToolName, {
  type: "function";
  function: {name: string; description: string; parameters: Record<string, unknown>};
}> = {
  web_search: {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the public web for a topic. Returns a list of results (title, url, description). " +
        "Use to discover URLs to research. Follow up with firecrawl_scrape to read a specific page.",
      parameters: {
        type: "object",
        properties: {
          query: {type: "string", description: "Search query"},
          limit: {type: "integer", minimum: 1, maximum: 10, default: 5},
        },
        required: ["query"],
      },
    },
  },
  firecrawl_scrape: {
    type: "function",
    function: {
      name: "firecrawl_scrape",
      description:
        "Scrape a single URL and return clean markdown. Handles JS-rendered pages and most anti-bot protection. " +
        "Use for company sites, blogs, docs, pricing pages. Output is the markdown body of the page.",
      parameters: {
        type: "object",
        properties: {
          url: {type: "string", description: "Absolute URL to scrape"},
          onlyMainContent: {type: "boolean", default: true},
        },
        required: ["url"],
      },
    },
  },
  firecrawl_search: {
    type: "function",
    function: {
      name: "firecrawl_search",
      description:
        "Search the web AND scrape the top results in one call. More expensive than web_search; " +
        "use only when you know you need full markdown content for ranking results.",
      parameters: {
        type: "object",
        properties: {
          query: {type: "string"},
          limit: {type: "integer", minimum: 1, maximum: 10, default: 3},
        },
        required: ["query"],
      },
    },
  },
  firestore_query: {
    type: "function",
    function: {
      name: "firestore_query",
      description:
        "Read or count documents from a Nikola/CRM collection. Use for read-only analytics " +
        "queries (counts, time-bounded filters, pipeline snapshots) and for dedup checks. " +
        "Allowed collections: leads, companies, entities, fieldDefinitions, nikolaDiscovery, " +
        "nikolaContext, nikolaWorkQueue, nikolaDrafts, nikolaSkillRuns, nikolaRoutingDecisions, " +
        "nikolaPendingClarifications, nikolaMemory, nikolaMemoryCandidates, nikolaState, " +
        "nikolaPatches, nikolaThreads. " +
        "Equality filters via whereEquals, range filters via whereRange (single field per query, " +
        "ISO-8601 strings auto-coerce to Timestamps). Pass countOnly:true for 'how many' " +
        "questions — far cheaper than fetching docs. Max 50 docs per non-count call.",
      parameters: {
        type: "object",
        properties: {
          collection: {type: "string"},
          whereEquals: {
            type: "array",
            description: "Equality filters, AND-combined.",
            items: {
              type: "object",
              properties: {
                field: {type: "string"},
                value: {type: "string", description: "Compared value (string-coerce numbers/bools client-side)"},
              },
              required: ["field", "value"],
            },
          },
          whereRange: {
            type: "array",
            description:
              "Range filters with op + value. ISO-8601 timestamp strings (e.g. '2026-04-01T00:00:00Z') " +
              "auto-coerce to Firestore Timestamps. Firestore allows range filters on a SINGLE field per query.",
            items: {
              type: "object",
              properties: {
                field: {type: "string"},
                op: {type: "string", enum: [">", ">=", "<", "<="]},
                value: {type: ["string", "number"]},
              },
              required: ["field", "op", "value"],
            },
          },
          countOnly: {
            type: "boolean",
            description: "Return only the count via Firestore count() aggregation. Cheaper than fetching docs.",
            default: false,
          },
          limit: {type: "integer", minimum: 1, maximum: 50, default: 10},
          fields: {type: "array", items: {type: "string"}, description: "Field paths to return (supports dotted paths like outreach.linkedIn.status)"},
        },
        required: ["collection"],
      },
    },
  },
  read_lead: {
    type: "function",
    function: {
      name: "read_lead",
      description: "Fetch a single lead document by ID, including outreach state and timeline summary.",
      parameters: {
        type: "object",
        properties: {leadId: {type: "string"}},
        required: ["leadId"],
      },
    },
  },
  read_company: {
    type: "function",
    function: {
      name: "read_company",
      description: "Fetch a single company document by ID, including blog/writing-program analysis and Apollo enrichment.",
      parameters: {
        type: "object",
        properties: {companyId: {type: "string"}},
        required: ["companyId"],
      },
    },
  },
  update_lead_outreach: {
    type: "function",
    function: {
      name: "update_lead_outreach",
      description:
        "Mutate a lead's outreach status (linkedIn or email). Restricted; only use when a confirmed delivery action requires it. " +
        "Channel must be 'linkedIn' or 'email'. Status must be one of: not_sent, sent, opened, replied, refused, no_response.",
      parameters: {
        type: "object",
        properties: {
          leadId: {type: "string"},
          channel: {type: "string", enum: ["linkedIn", "email"]},
          status: {
            type: "string",
            enum: ["not_sent", "sent", "opened", "replied", "refused", "no_response"],
          },
          note: {type: "string", description: "Optional context recorded to timeline"},
        },
        required: ["leadId", "channel", "status"],
      },
    },
  },
  append_timeline: {
    type: "function",
    function: {
      name: "append_timeline",
      description:
        "Append an entry to a lead's timeline subcollection. Use to record meaningful state transitions or research findings.",
      parameters: {
        type: "object",
        properties: {
          leadId: {type: "string"},
          type: {type: "string"},
          payload: {type: "object"},
        },
        required: ["leadId", "type", "payload"],
      },
    },
  },
  read_context: {
    type: "function",
    function: {
      name: "read_context",
      description:
        "Read previously-synced context (Notion AI Context page + BDR reports/companies snapshots). " +
        "Use the topic slug (company name lowercased + dashes, focus area, etc).",
      parameters: {
        type: "object",
        properties: {
          topic: {type: "string"},
          source: {type: "string", enum: ["notion", "report", "context-file"]},
        },
        required: ["topic"],
      },
    },
  },
  apollo_lookup: {
    type: "function",
    function: {
      name: "apollo_lookup",
      description:
        "Read-only access to existing Apollo enrichment on a lead OR company. " +
        "NEVER triggers a live Apollo API call (no credit spend). Returns null if not yet enriched.",
      parameters: {
        type: "object",
        properties: {
          leadId: {type: "string"},
          companyId: {type: "string"},
        },
      },
    },
  },
};

/**
 * Per-skill tool list. The model is given exactly the tools it needs.
 */
export const TOOLS_FOR_SKILL: Record<SkillName, ToolName[]> = {
  "generate-outreach": [
    "web_search",
    "firecrawl_scrape",
    "firestore_query",
    "read_lead",
    "read_company",
    "read_context",
    "apollo_lookup",
  ],
  "sales": [
    "web_search",
    "firecrawl_scrape",
    "firestore_query",
    "read_lead",
    "read_company",
    "read_context",
    "apollo_lookup",
    "update_lead_outreach",
    "append_timeline",
  ],
  "lead-generation": [
    "web_search",
    "firecrawl_scrape",
    "firestore_query",
    "read_context",
  ],
  "humanize": [],
  "cwp-hunt": ["web_search", "firecrawl_scrape", "read_context"],
  "cwp-apply": ["web_search", "firecrawl_scrape", "read_context"],
  "gig-hunt": ["web_search", "firecrawl_scrape", "read_context"],
  "learn": [],
  // Analyst is read-only by design. NEVER add web_search, firecrawl, Apollo, or
  // any mutating tool here — the analytical-query path must not perform actions.
  "analyst": [
    "firestore_query",
    "read_lead",
    "read_company",
  ],
  // Planner is a single-call skill — emits the step plan, no tools.
  "planner": [],
};

export function toolDefsForSkill(skill: SkillName) {
  return TOOLS_FOR_SKILL[skill].map((n) => DEFINITIONS[n]);
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>,
  _ctx: ToolCallContext
): Promise<unknown> {
  switch (name) {
    case "web_search":
      return webSearch(args as never);
    case "firecrawl_scrape":
      return firecrawlScrape(args as never);
    case "firecrawl_search":
      return firecrawlSearch(args as never);
    case "firestore_query":
      return firestoreQuery(args as never);
    case "read_lead":
      return readLead(args as never);
    case "read_company":
      return readCompany(args as never);
    case "update_lead_outreach":
      return updateLeadOutreach(args as never);
    case "append_timeline":
      return appendTimeline(args as never);
    case "read_context":
      return readContext(args as never);
    case "apollo_lookup":
      return apolloLookup(args as never);
    default:
      return {error: `Unknown tool: ${name}`};
  }
}
