/**
 * Company Offer Analysis Prompts
 *
 * Three-stage prompt system:
 * 1. Website/Company Analysis - Categorizes company type and extracts basic info
 * 2a. GenAI Blog Ideas - For "Generative AI" companies
 * 2b. Non-GenAI Blog Ideas - For all other company types
 */

/**
 * Stage 1: Analyze company website to categorize and extract key information
 * Returns: Company type, summary, business model, LinkedIn/blog URLs
 */
export function getWebsiteAnalysisPrompt(
  companyName: string,
  website: string,
  websiteContent?: string
): string {
  return `You are analyzing a company to categorize it and extract key information for B2B outreach.

COMPANY: ${companyName}
WEBSITE: ${website}
${websiteContent ? `CONTENT: ${websiteContent.substring(0, 12000)}` : ''}

================================================================================
SECTION 1: COMPANY CATEGORIZATION
================================================================================

Analyze the company and answer these questions:

1. **Company Type Classification**
   Classify the company into EXACTLY ONE of these 5 categories:

   - **Generative AI**: Company that trains LLMs or provides tools/infrastructure to help with LLM training (e.g., training platforms, fine-tuning services, data preparation for AI training, model optimization tools)

   - **AI tool**: Company that provides AI-powered tools to be incorporated into businesses for specific tasks (e.g., AI chatbots, AI writing assistants, AI image generators, AI code assistants, AI-powered analytics)

   - **Data science**: Company that provides data science related services NOT focused on AI/LLM training (e.g., cloud computing, data warehousing, business intelligence, traditional ML, data engineering, analytics platforms)

   - **Service provider**: Company that offers manual/human services, not primarily AI-based (e.g., consulting firms, marketing agencies, design studios, development shops that don't specialize in AI)

   - **Content maker**: Someone/company whose main business is publishing content (e.g., publishers, media companies, authors, educational content creators, online course creators)

2. **LLM Training Capability**
   Does this company provide tools that can be used to train or improve LLMs?
   - YES: They offer tools for fine-tuning, RLHF, data labeling for AI, model training infrastructure, etc.
   - NO: They don't directly support LLM training

3. **AI Reliance**
   Does this company rely on AI in delivering its core service?
   - YES: AI is central to their product/service
   - NO: AI is not central or not used

4. **Business Model**
   - B2B: Sells primarily to businesses
   - B2C: Sells primarily to consumers
   - Both: Serves both markets

================================================================================
SECTION 2: BASIC COMPANY INFORMATION
================================================================================

Extract the following information:

1. **Company Summary**: What does the company do in 10 words or less?

2. **Country of Origin**: Where is the company headquartered?

3. **LinkedIn URL**: Company LinkedIn page URL if findable

4. **Blog URL**: Company blog URL if they have one

================================================================================
OUTPUT FORMAT (JSON ONLY)
================================================================================

{
  "companyName": "${companyName}",
  "companyType": "Generative AI" | "AI tool" | "Data science" | "Service provider" | "Content maker",
  "companySummary": "What the company does in 10 words or less",
  "canTrainLLMs": true | false,
  "reliesOnAI": true | false,
  "businessModel": "B2B" | "B2C" | "Both",
  "country": "Country of origin",
  "linkedinUrl": "LinkedIn company page URL or null if not found",
  "blogUrl": "Company blog URL or null if not found"
}

CATEGORY GUIDELINES:

**Generative AI** - Choose this if:
- Company builds/trains foundation models
- Company provides fine-tuning platforms
- Company offers RLHF or alignment tools
- Company provides data annotation/labeling for AI training
- Company offers model optimization/compression tools
- Examples: OpenAI, Anthropic, Cohere, Scale AI, Weights & Biases

**AI tool** - Choose this if:
- Company offers AI-powered SaaS products
- Company provides AI chatbots, assistants, or agents
- Company offers AI for specific business functions (writing, coding, image gen, etc.)
- The AI tool is the product, not training infrastructure
- Examples: Jasper, Copy.ai, Midjourney, GitHub Copilot, Intercom (AI features)

**Data science** - Choose this if:
- Company focuses on data infrastructure, not AI/LLM training
- Company offers cloud computing, data warehousing
- Company provides BI tools, dashboards, analytics
- Company does traditional ML (not LLM-focused)
- Examples: Snowflake, Databricks (data side), Tableau, Looker

**Service provider** - Choose this if:
- Company primarily offers human services
- Company is a consulting firm, agency, or studio
- AI is not the core offering
- Examples: Accenture, IDEO, traditional marketing agencies

**Content maker** - Choose this if:
- Main business is publishing/creating content
- Company is a media outlet, publisher, or content platform
- Company sells courses, books, or educational materials
- Examples: O'Reilly, Coursera, news publications

RESPOND WITH ONLY THE JSON OBJECT - no markdown, no code blocks, just valid JSON.`;
}

/**
 * Stage 2a: Generate blog ideas for Generative AI companies
 * Uses latest 2025 models and GenAI-specific use cases
 */
export function getGenAIIdeasPrompt(
  companyName: string,
  website: string,
  blogContent?: string,
  specificRequirements?: string
): string {
  return `COMPANY: ${companyName}
WEBSITE: ${website}
${blogContent ? `BLOG CONTENT: ${blogContent.substring(0, 8000)}` : ''}
${specificRequirements ? `SPECIFIC REQUIREMENTS: ${specificRequirements}` : ''}

---

You are generating **highly specific article ideas** for a Generative AI company.

🧠 Models (Top 2025 Models to Use)
| Name | Why It's Hot | Tutorial Idea |
|------|--------------|---------------|
| GPT-5 | Released Aug 2025; combines reasoning and non-reasoning capabilities under one interface; positioned to replace GPT-4, GPT-4.5, o4-mini, etc. | "Benchmark GPT-5 vs GPT-4.1 on domain-specific generation and log results to W&B" |
| Claude 4.1 / Sonnet | Anthropic's recent updates (e.g. Claude Opus / Sonnet iterations) are gaining traction in safety & reasoning benchmarks | "Instrument prompts & chain-of-thought steps in Claude 4.1 with fine-grained telemetry in W&B" |

⚙️ Concepts (Frameworks, Trends, Techniques)
| Name | Why It's Hot (2025 signal) |
|------|----------------------------|
| Agentic AI / Autonomous Agents | Firms see agents as the next frontier to break through the "GenAI productivity plateau" |
| Model Context Protocol (MCP) | Emerging as a standard "USB for AI" to expose tools & context across agents |
| Agent Communication / Interoperability Protocols (ACP, A2A, ANP) | Growing literature (survey in 2025) on multi-agent coordination & protocol layers |
| Agentic Context Engineering (ACE) | New paradigm (Oct 2025) treating context as evolving, structured playbooks; +10.6% agent benchmark lift reported |
| Green AI / Energy-Aware Inference | Power & carbon cost matter more — models optimized for efficiency gain traction in infra & MLOps circles |
| Inference-Time Computation / Dynamic Routing | Techniques like sparse layers, conditional compute, early exit are now more practical at scale |
| Memory / Long Context Optimization | As context windows hit hundreds of thousands, managing memory (differentiable, chunking) is critical |
| On-Device & TinyLLM / Edge Models | Trend to push workloads to client devices (mobile, IoT) using quantized / efficient LLMs |
| Safe & Personalized Alignment (e.g. Superego / Constitution Parsing) | New research (mid-2025) dynamically enforces alignment rules per user, with harm mitigation (98.3 % harm reduction) |
| Agent IAM / Zero-Trust Identity for Agents | 2025 proposals for decentralized identity, verifiable credentials, fine-grained access for agents |

---

IMPORTANT RULES:
1. Each idea must have: **Platform + Company Tool + Ultra-Specific Use Case**
2. Platform: GPT-5, Claude 4.1, Gemini Pro, Phi-3, Mixtral, Falcon, or "LLMs" (NEVER use Llama, NEVER use gpt-oss-20b)
3. Specific Use: NOT "healthcare" - be ultra-specific like "Radiology Report QC for Lung Cancer Detection"
4. Always include the company's tool/product in the title
5. Avoid fraud detection, music generation, banking topics
6. I am a single writer - avoid ideas requiring teams (no "Hiring writers", "Building a team", etc.)
7. Technical depth - not marketing fluff

Generate 5 article ideas.

================================================================================
OUTPUT FORMAT (JSON ONLY)
================================================================================

{
  "ideas": [
    {
      "title": "Full article title: Platform + Company Tool + Ultra-Specific Use Case",
      "whyItFits": "2-3 sentences: (1) Why it fits the COMPANY's blog and audience (2) Why it fits MY portfolio as a single MLOps writer",
      "whatReaderLearns": [
        "Specific learning outcome 1",
        "Specific learning outcome 2",
        "Specific learning outcome 3",
        "Specific learning outcome 4"
      ],
      "keyStackTools": ["Platform", "Company Tool", "Other relevant tools"],
      "angleToAvoidDuplication": "1-2 sentences on how this differs from their existing content",
      "platform": "GPT-5 | Claude 4.1 | Gemini Pro | etc.",
      "specificUse": "Ultra-specific application (e.g., 'Radiology Report QC for Lung Cancer Detection')",
      "companyTool": "The company's specific product/tool name"
    }
  ]
}

RESPOND WITH ONLY THE JSON OBJECT - no markdown, no code blocks, just valid JSON.`;
}

/**
 * Stage 2b: Generate blog ideas for non-GenAI companies
 * For devtools, data platforms, CMS, etc. that want AI-related content
 */
export function getNonGenAIIdeasPrompt(
  companyName: string,
  website: string,
  blogContent?: string,
  specificRequirements?: string
): string {
  return `COMPANY: ${companyName}
WEBSITE: ${website}
${blogContent ? `BLOG CONTENT: ${blogContent.substring(0, 8000)}` : ''}
${specificRequirements ? `SPECIFIC REQUIREMENTS: ${specificRequirements}` : ''}

---

You are generating **highly specific and tailored article ideas** for a B2B company that is NOT primarily GenAI-focused.

🔹 **Step 1: Understand the Company**
- Briefly explain what this company does in **simple terms (3–4 lines max)**.
- Then answer: **Does this company offer a product that can be directly used in the field of Generative AI?** If yes, specify whether it's:
  1. A tool to train or improve LLMs
  2. An AI tool for a specific business goal
  3. A data science/infrastructure platform not directly tied to AI output
Finally, decide: **Would you classify this company under "ML" or "data science"?** Only one.

🔹 **Step 2: Analyze Their Blog Content**
- Skim their official blog or insights section (if available).
- List the **titles of several recent or notable blog posts**, prioritizing ones related to AI or technical topics.
- From this, infer which **fields, industries, or tools** they care about (e.g., CMS + GraphQL, Retail + LLMs, etc.).
- Suggest **5 article ideas** that:
  - Are *very specific*
  - Avoid vague or overdone topics (e.g., no "AI is changing everything")
  - Do **not** include fraud detection
  - Ideally connect to real-world tools or workflows
  - Match the company's actual blog tone and interests

🔹 **Rules for writing the ideas**

🧠 2025 Models & Concepts to Use:
| Name | Why It's Hot |
|------|--------------|
| GPT-5 | Released Aug 2025; combines reasoning and non-reasoning capabilities |
| Claude 4.1 / Sonnet | Anthropic's recent updates gaining traction in safety & reasoning benchmarks |
| Model Context Protocol (MCP) | Emerging as a standard "USB for AI" to expose tools & context across agents |
| Agentic AI / Autonomous Agents | Next frontier to break through the "GenAI productivity plateau" |
| Green AI / Energy-Aware Inference | Power & carbon cost matter more — models optimized for efficiency |
| Memory / Long Context Optimization | As context windows hit hundreds of thousands, managing memory is critical |

IMPORTANT RULES:
1. Make articles technical and related to data science/AI - NOT marketing or sales content
2. If the company does not make software and is a content maker, write technical articles fitting their style
3. If the company has software, ALWAYS include it in the article idea
4. Each idea must be a concrete blog title showing real-world use case
5. Avoid generic titles like "The Power of AI" or "Why ML Matters"
6. NEVER include fraud detection topics
7. I am a single writer - avoid ideas requiring teams
8. Use 2025 models and concepts (never use Llama, never use gpt-oss-20b)

Generate 5 article ideas.

================================================================================
OUTPUT FORMAT (JSON ONLY)
================================================================================

{
  "ideas": [
    {
      "title": "Full article title with specific tools and use case",
      "whyItFits": "2-3 sentences explaining why this fits the company's blog, product, and audience",
      "whatReaderLearns": [
        "Specific learning outcome 1",
        "Specific learning outcome 2",
        "Specific learning outcome 3",
        "Specific learning outcome 4"
      ],
      "keyStackTools": ["Tool1", "Tool2", "Tool3", "Company Product"],
      "angleToAvoidDuplication": "1-2 sentences on how this differs from their existing content"
    }
  ]
}

RESPOND WITH ONLY THE JSON OBJECT - no markdown, no code blocks, just valid JSON.`;
}
