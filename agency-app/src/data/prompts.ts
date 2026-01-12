// src/data/prompts.ts
// Mirrored prompt definitions from /functions/src/prompts/
// This allows the frontend to display prompt metadata without accessing backend code

export interface PromptMetadata {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  tags: string[];
  variables?: string[];
  systemPrompt?: string;
  userPrompt: string;
  outputSchema?: string; // JSON output structure specification
}

export const AI_PROMPTS: PromptMetadata[] = [
  // LinkedIn Post Generation
  {
    id: 'linkedin-condensed-insights',
    name: 'LinkedIn Post - Condensed Insights',
    description: 'Generates 2 LinkedIn posts from technical articles using the condensed insights with value hooks technique',
    version: '1.0.0',
    author: 'Marketing Team',
    category: 'LinkedIn Posts',
    tags: ['linkedin', 'content-generation', 'technical-writing'],
    variables: ['content'],
    systemPrompt: `You are a senior content marketing expert specializing in technical content for LinkedIn. You excel at creating engaging, data-driven posts that resonate with technical professionals. You always follow instructions precisely and create content that is ready for immediate publication.`,
    outputSchema: `When asked to create 2 different LinkedIn posts, respond with a JSON object containing exactly this structure:
{
  "post1": {
    "content": "full linkedin post content including hashtags",
    "hashtags": ["array", "of", "hashtags", "used"]
  },
  "post2": {
    "content": "second version of linkedin post content including hashtags",
    "hashtags": ["array", "of", "hashtags", "used"]
  }
}

Each post must be 180-220 words, include specific data points from the article, use emojis naturally, have 4-6 numbered takeaways, end with an engagement question, and include 4-6 niche hashtags.`,
    userPrompt: `{{content}}

The above is a long technical article. Summarize it for a LinkedIn post using the "condensed insights with value hooks" technique.

Write a compelling, data-driven hook as the very first sentence.
The hook must grab attention instantly, convey authority, and clearly connect to the post's technical topic.
Avoid generic claims — back it with a specific, credible stat, benchmark, or impact figure.
Keep it short, punchy, and easy to scan (max 15 words).
The hook should make the reader want to learn "how" or "why" the statement is true.
Example:
For a cloud cost optimization topic:
"Cloud waste isn't just inefficiency—it's 30% of your monthly bill gone. ☁️💸"

The total length should be around 180–220 words and must be at least 180 words.

Write in a professional but energetic tone — confident, authoritative, and technically competent.

Preserve as many relevant technical details, figures, and real-world examples from the article as possible. Avoid generic filler or vague claims.

Incorporate emojis naturally for visual breaks and scannability.

Structure the post as a clear, numbered list of 4–6 key takeaways, each offering a tangible insight, data point, or specific example.

End with a brief, subtle engagement question related to the topic (e.g., "What's your team's biggest challenge with scaling LLMs?") rather than a strong prompt to comment.

Add 4–6 highly relevant, niche hashtags at the end (avoid broad hashtags like #AI or #Technology).

The final post must be fully ready for copy-paste into LinkedIn.
I want you to create 2 different linkedin posts I can choose from`,
  },

  // Generative AI Blog Ideas Generation
  {
    id: 'generative-ai-blog-ideas',
    name: 'GenAI Blog Ideas Generator',
    description: 'Analyzes company blogs and generates 5 highly personalized technical article ideas focused on Generative AI applications, using latest 2025 models and trends',
    version: '1.0.0',
    author: 'Mostafa Osama',
    category: 'Idea Generation',
    tags: ['idea-generation', 'blog-outreach', 'generative-ai', 'linkedin', 'url-analysis'],
    variables: ['companyUrl', 'companyName', 'blogContent'],
    userPrompt: `COMPANY TO ANALYZE:
Company URL: {{companyUrl}}
Company Name: {{companyName}}
Blog Content: {{blogContent}}

================================================================================

Generative AI (written by ME) Prompt 1 Here is a list of generative AI applications categorized by their fields:

General Generative AI Applications

Video Applications
1. Video Generation: Impressive video generation capabilities such as those demonstrated by OpenAI's Sora.
2. Video Prediction: GAN-based systems that comprehend temporal and spatial video elements to predict sequences and detect anomalies.

Image Applications
3. Image Generation: Transforming text into images and generating realistic visuals for media, design, advertisement, marketing, education, etc.
4. Semantic Image-to-Photo Translation: Producing realistic images from semantic sketches, useful in healthcare.
5. Image-to-Image Conversion: Transforming external elements of an image while preserving its core, used for effects like day-to-night conversion or style changes.
6. Image Resolution Increase (Super-Resolution): Using GANs to create high-resolution versions of images for archival or medical use.
7. 3D Shape Generation: Creating high-quality 3D versions of objects for various applications.

Audio Applications
8. Text-to-Speech Generator: Producing realistic speech audio for education, marketing, podcasting, and more.
9. Speech-to-Speech Conversion: Generating voice overs for gaming, film, and other industries.
10. Music Generation: Creating novel musical materials for advertisements and other creative purposes.

Text-based Applications
11. Idea Generation: Using LLMs for creative ideation.
12. Text Generation: Generating dialogues, headlines, ads, product descriptions, articles, and social media content.
13. Personalized Content Creation: Generating personalized text, images, music, or other media for social media, blogs, product recommendations, etc.
14. Sentiment Analysis / Text Classification: Generating synthetic text data labeled with various sentiments for training models.

Code-based Applications
15. Code Generation: Producing code snippets or complete programs without manual coding.
16. Code Completion: Suggesting code completions as developers type.
17. Code Review: Optimizing existing code by suggesting improvements or generating alternative implementations.
18. Bug Fixing: Identifying and fixing bugs in the generated code.
19. Code Refactoring: Automating the process of refactoring code.
20. Code Style Checking: Ensuring consistency and readability across a codebase.

Test Automation
21. Generating Test Cases: Creating test cases based on user requirements.
22. Generating Test Code: Converting natural language descriptions into test automation scripts.
23. Test Script Maintenance: Identifying outdated or redundant code in test scripts.
24. Test Documentation: Generating realistic test data based on input parameters.
25. Test Result Analysis: Analyzing test results and providing summaries.

Other Applications
26. Conversational AI: Generating responses for chatbots and virtual assistants.
27. Data Synthesis: Creating synthetic data for training machine learning models.
28. Data Visualization: Performing data visualization tasks using Python libraries.
29. File Conversion: Converting files between different formats.
30. Solving Mathematical Problems: Understanding and solving mathematical questions.

Industry-specific Generative AI Applications

Healthcare Applications
31. Streamlined Drug Discovery and Development: Using AI for drug candidate discovery and testing.
32. Personalized Medicine: Creating individualized treatment plans.
33. Improved Medical Imaging: Enhancing precision in medical imaging.
34. Population Health Management: Designing targeted public health initiatives.

Education Applications
35. Personalized Lessons: Crafting tailored lesson plans for students.
36. Course Design: Designing syllabi and assessments.
37. Content Creation for Courses: Developing unique educational materials.
38. Tutoring: Providing AI-generated tutoring.
39. Data Privacy Protection for Analytical Models: Using synthetic data to protect student privacy.
40. Restoring Old Learning Materials: Enhancing the quality of outdated learning materials.

Fashion Applications
41. Creative Designing for Fashion Designers: Creating innovative styles and optimizing existing designs.
42. Turning Sketches into Color Images: Transforming sketches into vibrant pictures.
43. Generating Representative Fashion Models: Creating diverse fashion models for virtual try-on options.
44. Marketing & Trend Analysis for Fashion Brands: Analyzing trends and personalizing marketing content.

Banking Applications
45. Fraud Detection: Identifying suspicious or fraudulent transactions.
46. Risk Management: Computing value-at-risk estimations and understanding volatility.
47. Generating User-Friendly Explanations for Loan Denial: Creating explanations for loan application decisions.
48. Data Privacy Protection: Using synthetic data for training ML models without privacy concerns.

Gaming Applications
49. Procedural Content Generation: Generating game content like levels and maps.
50. Player Behavior Analysis: Analyzing player data for personalized game experiences.
51. Non-Player Character (NPC) Behavior: Creating realistic NPC behavior.
52. User Interface Design: Designing intuitive user interfaces.
53. Game Testing: Automating game testing and providing feedback.

Travel Applications
54. Identity Verification: Using AI for face identification and verification at airports.
55. Personalized Travel and Destination Recommendations: Analyzing customer data for travel recommendations.

Retail Applications
56. Product and Display Design: Creating new product designs and personalizing display options.
57. Automated Retail Content Generation: Creating product descriptions and promotional content.
58. Product Recommendations: Suggesting products based on buying history and preferences.
59. Inventory Management & Supply Chain Optimization: Forecasting demand and optimizing inventory.
60. Virtual Shopping Assistants: Providing conversational virtual assistants for customers.

Insurance Applications
61. Policy Documentation: Generating policy documents based on user-specific details.
62. Risk Assessment and Premium Calculation: Simulating risk scenarios and calculating premiums.
63. Fraud Detection: Generating examples of fraudulent claims for training models.
64. Customer Profiling: Creating synthetic customer profiles for segmentation and marketing.
65. Claims Processing: Streamlining claims management with automated responses.
66. Policy Generation: Creating personalized insurance policies.
67. Predictive Analysis & Scenario Modeling: Generating potential scenarios for decision-making.

Manufacturing Applications
68. Predictive Maintenance: Predicting equipment failures for proactive maintenance.
69. Quality Control: Improving quality control processes by predicting defects.
70. Production Planning and Inventory Management: Simulating production scenarios and predicting demand.

Business-function-specific Generative AI Applications

Customer Service Applications
71. Multilingual Customer Support: Providing support in multiple languages.
72. Personalized Customer Responses: Generating relevant responses based on customer data.
73. Quick Responses to Customer Inquiries & Complaints: Addressing common complaints and providing solutions.
74. Creating Customer Emails: Generating personalized email templates.
75. Replying to Customer Reviews: Responding to reviews with generated responses.
76. Answering FAQs: Providing answers to frequently asked questions.

Finance Applications
* AP Automation / Invoice Processing: Querying documents for flexible automation.
* Invoice Processing: Enriching ERP systems with automation capabilities.

Marketing Applications
77. Content Creation for Marketing: Generating text for emails, social media posts, blog articles, etc.
78. Personalized Customer Experience: Creating targeted content based on customer data.
79. Audience Research: Analyzing customer data to identify patterns and trends.
80. Writing Product Descriptions: Creating compelling product descriptions.
81. Creating Customer Surveys: Generating survey questions and analyzing responses.
82. Generating Video Ads or Product Demos: Creating high-quality video ads and demos.
83. Email Marketing Campaigns: Generating personalized email content and automating responses.

SEO Applications
90. Generating Topic Ideas for Content Writing: Producing relevant keywords and analyzing competitors' content.
91. Conducting Keyword Research: Generating keyword lists and identifying trends.
92. Finding the Right Titles: Creating SEO-friendly titles.
93. Grouping Search Intent: Analyzing search queries to categorize user intent.
94. Creating Content Structure: Generating outlines and organization suggestions.
95. Generating Meta Descriptions: Creating effective meta descriptions.
96. Creating Sitemap Codes: Producing XML files for website structure.

HR Applications
97. Creating Interview Questions: Generating relevant questions for job candidates.
98. Generating Onboarding Materials: Creating training videos, handbooks, and documentation.
99. Job Description Generation: Creating accurate job descriptions.

Supply Chain & Procurement Applications
100. Demand Forecasting and Supply Chain Management: Predicting demand to optimize supply chain operations.

Legal Applications
101. Contract Generation: Creating contracts based on templates.
102. Contract Compliance: Categorizing and analyzing contracts for compliance.

Sales Applications
103. Sales Coaching: Providing personalized coaching to sales reps.
104. Sales Forecasting and Pipeline Optimization: Analyzing data to generate sales forecasts.
105. Lead Identification and Qualification: Identifying and qualifying sales leads.
106. Sales Video Generation: Creating personalized sales videos.

Audit Applications
107. Audit Reporting Automation: Automating the production of standardized reports.
108. Data Analysis of Documents: Automating data analysis tasks.
109. Real-time Risk Monitoring: Monitoring risk levels in real-time.
110. Pattern Recognition and Anomaly Detection: Spotting and flagging audit abnormalities.
111. **Training Auditors **: Providing educational materials for auditor training.

—————— Prompt 2 I was given a task to generate ideas for articles for certain websites. The articles will cover technical things like computer science and machine learning. I will start by giving you a website and you must know that i do not know almost anything about these topics. I want you to explain the back what the company does in very simple and clear terms and give me the topics that they discuss. (Task 1) You must also understand the description of the website yourself, since I expect you to use this data when I ask you to generate relevant ideas. The idea is that the websites I am going to give you here are going to be in the business that provides a service related to generative AI. So, your first task for any given website would be to confirm that this is related to Generative AI. And then explain what this website does in simple terms in 4 lines. what does the following company do. explain it to me clearly and simply You should also for the given website confirm that this website provides a tool that can be used directly to help in a field related to Generative AI in a direct way meaning does this website provide a an AI tool that can be used to train and improve LLM or does it provide a simple AI tool to be used by companies for a certain goal or does it do something not related to AI and more related to Data science for example. And then explain what this website does in simple terms in 4 lines. (Task 2) Also, based on this description to this company. if you had to classify it in one of two categories, "ML" or "data science" which would you choose. (Task 3) Just give me the information above and nothing more Prompt 3 I was given a task to generate ideas for articles for certain websites. The articles will cover technical things like computer science and machine learning. You must also understand the description of the website that you gave me above yourself, since I expect you to use this data when I ask you to generate relevant ideas. The idea is that the websites I am going to give you here are going to be in the business that provides a service related to generative AI. Provide me with the titles of some of their previous articles especially those related to AI and to the uses of these tool in specific fields and give me some keywords to consider when addressing this company. Use the articles you find on their blog to understand which uses they care about and to make the suggested article ideas personalized to them. (Task 4) I want you to use them as a reference to generate 5 more articles for me and under each article write a description explaining what the terms are that you are explaining and what the content of the article should be . (Task 5) Under each article also write for me why you see it fits (when addressing why it fits also mention why it fits based on our own personal case meaning look at the words we provided below and tell me why this articles fits to what we typically write about and not only why it fits because of the strength and relevance of the content overall) (the description and the why it fits should be 4 to 5 lines long each) The idea generated should have three parts in each single one: How to use the tool provided in the website I gave you to do something very specific in one of the fields in generative AI that you mentioned in the beginning of this chat on a certain platform that I will give you. 1. a platform: Gemini / Gemini Pro, Llama 3, Phi-3, Claude, Mixtral, Falcon, or just "LLMs" 2. a specific use: not something generic.... Not healthcare for example…. Something like imaging to detect lung cancer for example…….. I want them to be as specific as possible and try to make sure that they cover important areas when possible like business or healthcare. But always give one or two examples in the big and important flields like healthcare and business. Use the fields that you already mentioned in this chat (in this answer of yours "Here is a list of generative AI applications categorized by their fields" ). Always avoid banking and things related to music. For the use … I donot want something like "Using Writesonic and Gemini Pro for Automated Medical Report Generation"…. I want you to be even more specific like "Using Writesonic and Gemini Pro for Automated Radiology Report Generation to Detect Lung Cancer" Other good examples to follow: (be as specific as you can ever be) Earthquake Tremors to Trembling Models Predicting Nature's Force with AI and Tabular Data Fine-Tuning vs. Retrieval-Augmented Generation: Navigating Legal Document Analysis Building a RAG System with Gemini LLM for Financial forecasting Using YOLOv5 Object Detection to Optimize Parking Lot Management 3. the tool itself which you have already confirmed that can be used in this case Final part (generating the message) Now using everything you generated above, do the following: For the company above, I am writing them a linkedin message. I donot want you to change anything about the message itself. I simply want you to change the slots with the correct information: Change {Company} with the correct company name. If there is an "'s" leave it after it. Change the word {article name] with one of the articles you suggested but one related to AI from the suggested ones you got. Don't change the {idea}, leave it as it is Change "For example, I can add some blogs about the use of {example from their blog like using your tool in certain field}, as I think your viewers would love that." To the most fitting example of usage from the 3 you suggested. Subject: Collaborating on Articles for {Company}! Hi {NAME}, I'm Mostafa, a software and MLOps engineer passionate about AI and software development writing, with notable clients like Weights & Biases and Supertokens. I came across {Company}'s blog, especially the article "{article name}", and I'm impressed. I'd love to contribute by writing AI concepts or detailed tutorials on {Company}'s features. Here's an article idea made specifically for you: {Idea} My articles have garnered over 500,000+ views. Check out my profiles: https://wandb.ai/mostafaibrahim17/ml-articles/reportlist https://medium.com/@mostafaibrahim18 I look forward to discussing more. ————————————————— ——————— Ideas to use - Must identify if the tool is used in generative AI or a direct tool - Focuses that each article should have a platform + a specific use + the tool itself You need to use more relevant and newer tech and languages and LLMS. For example In some of the ideas you were using RAG/ Retrieval Augmented Generation. This has been replaced with Model Context Protocol. Llama 3 isn't the latest AI model, we have Llama 4 and so on. GPT 3 and 4 have been replaced with 5. So from now on, and for any ideas, use only the most relevant and newest models ones made in 2025 or in the past month and never issue anything that is older than that unless there is no newer replacement. Here is a list of trending models and concepts to use (only use these or very similar very relevant models as new and relevant and trending as these): Here's a refined list of high-potential topics (models + concepts) as of late 2025, each with signal metrics and tutorial hooks. Use these as seeds to spin into hands-on blogs, integrations, or infrastructure pieces. 🧠 Models (Top 4) Name Why It's Hot 🔥 Trend Score Tutorial Idea GPT-5 Released Aug 2025; combines reasoning and non-reasoning capabilities under one interface; positioned to replace GPT-4, GPT-4.5, o4-mini, etc. Wikipedia 9.5 "Benchmark GPT-5 vs GPT-4.1 on domain-specific generation and log results to W&B" gpt-oss-120b / gpt-oss-20b (OpenAI open-weight models) OpenAI's first open-weight models since GPT-2; downloadable, fine-tunable, can run locally (20B on 16 GB VRAM) WIRED+3OpenAI Help Center+3TechCrunch+3 9.0 "Deploy gpt-oss-20b in a Civo/ONNX pipeline and log latency & memory metrics to W&B" Llama 4 Scout (or Llama 4 family) Meta's newest large model line, with improvements in efficiency and context handling. (Mentioned among 2025 open LLM rankings) Exploding Topics 8.5 "Fine-tune Llama 4 Scout on domain data and track model drift over time with W&B" Claude 4.1 / Sonnet (or next Anthropic flagship) Anthropic's recent updates (e.g. Claude Opus / Sonnet iterations) are gaining traction in safety & reasoning benchmarks 8.5 "Instrument prompts & chain-of-thought steps in Claude 4.1 with fine-grained telemetry in W&B" Note: where a model pair (like gpt-oss) is released, you can treat them as a family in tutorials. ⚙️ Concepts (Frameworks, Trends, Techniques) Name Why It's Hot (2025 signal) 🔥 Trend Score Tutorial Idea Agentic AI / Autonomous Agents Firms see agents as the next frontier to break through the "GenAI productivity plateau" McKinsey & Company+2Capgemini+2 9.0 "Build a simple multi-step agent with memory and decision logic, track its performance via W&B" Model Context Protocol (MCP) Emerging as a standard "USB for AI" to expose tools & context across agents IBM+3Bitdefender Blog+3OneReach+3 8.8 "Wrap a tool (e.g. web search or DB lookup) behind an MCP API and plug into an agent demo, logging usage stats" Agent Communication / Interoperability Protocols (ACP, A2A, ANP) Growing literature (survey in 2025) on multi-agent coordination & protocol layers arXiv+2OneReach+2 8.2 "Implement a toy A2A peer-to-peer agent call and measure latency / message semantics" Agentic Context Engineering (ACE) New paradigm (Oct 2025) treating context as evolving, structured playbooks; +10.6% agent benchmark lift reported arXiv 8.5 "Implement ACE loop (generate → reflect → curate) in an agent pipeline and track performance over time" Green AI / Energy-Aware Inference Power & carbon cost matter more — models optimized for efficiency gain traction in infra & MLOps circles 8.0 "Track energy usage & CO₂ per inference (via hardware counters) across model versions in W&B" Inference-Time Computation / Dynamic Routing Techniques like sparse layers, conditional compute, early exit are now more practical at scale 8.0 "Integrate a model with early-exit heads; compare latency vs quality and log curves in W&B" Memory / Long Context Optimization As context windows hit hundreds of thousands, managing memory (differentiable, chunking) is critical 8.5 "Build a retrieval-augmented memory module with vector DB and measure context effectiveness" On-Device & TinyLLM / Edge Models Trend to push workloads to client devices (mobile, IoT) using quantized / efficient LLMs 8.3 "Deploy a quantized LLM to a Jetson or M1 and log latency vs cloud baseline" Safe & Personalized Alignment (e.g. Superego / Constitution Parsing) New research (mid-2025) dynamically enforces alignment rules per user, with harm mitigation (98.3 % harm reduction) arXiv 8.7 "Integrate a 'superego agent' overlay for user policies, evaluate on harmful input benchmarks, log refusals" Agent IAM / Zero-Trust Identity for Agents 2025 proposals for decentralized identity, verifiable credentials, fine-grained access for agents arXiv 7.8 "Prototype a DID / VC-based identity system for agents and log access denials, credential lifecycle" - Must give examples of uses of generative ai - https://research.aimultiple.com/generative-ai-applications/#banking-applications - Must give article examples from Mostafa's portfolio on weights and biases - Must make GPT say if the business has a relation to generative ai or not - Must make chat gpt understand generative ai: https://www.gartner.com/en/topics/generative-ai - For companies not related to generative ai or without a specific use…. Then use the older prompt - Must understand each tool and what it is used for - Gives a specific example…… not health care…. Something specific in health care There is also another point about why am generating the ideas. I am a single person generating ideas to propose them to companies that I want to work with. I am a single writer so ideas like "Why Most AI-Generated Tech Blogs Fail SEO — and What We've Learned From Editing 1,000 of Them", …. How can I single writer edit a 1000 articles as a single writer…… or "Hiring vs. Training: How to Build a Stable of Reliable Technical Writers in Niche Fields"…. I donot have a stable or a team….. so overall, avoid ideas that donot make sense in the context of a single writer applying to fit with a company. Very important note: For some of the companies and websites: I will not only give you the website or name, but I will also give you the ideas they expect or what the idea should revolve around`,
    outputSchema: `================================================================================
STRUCTURED JSON OUTPUT SECTION
================================================================================

Based on all the analysis above, provide your response as valid JSON with the following structure:

{
  "ideas": [
    {
      "title": "Complete article title: Platform + Tool + Specific Use",
      "platform": "GPT-5 | Llama 4 | Claude 4.1 | MCP | etc.",
      "specificUse": "Very specific use case description (e.g., 'Automated Radiology Report QC for Lung Cancer Detection')",
      "tool": "Company's specific tool/product name",
      "description": "4-5 lines: Explain what the terms/concepts are, what the article will teach, technical depth, implementation details, what readers will learn, how it works technically.",
      "whyItFits": "4-5 lines: (1) Why it fits the COMPANY - explain how it aligns with their existing blog topics, references their style/audience, uses their tool features. (2) Why it fits MY PORTFOLIO - explain how it showcases my strengths (MLOps, domain-specific tutorials, hands-on technical depth, single-writer execution, instrumentation/evaluation)."
    },
    {
      "title": "Second idea title",
      "platform": "Different 2025 platform",
      "specificUse": "Different specific use case",
      "tool": "Company's tool",
      "description": "4-5 lines explanation",
      "whyItFits": "4-5 lines explanation"
    },
    {
      "title": "Third idea title",
      "platform": "Different 2025 platform",
      "specificUse": "Different specific use case",
      "tool": "Company's tool",
      "description": "4-5 lines explanation",
      "whyItFits": "4-5 lines explanation"
    },
    {
      "title": "Fourth idea title",
      "platform": "Different 2025 platform",
      "specificUse": "Different specific use case",
      "tool": "Company's tool",
      "description": "4-5 lines explanation",
      "whyItFits": "4-5 lines explanation"
    },
    {
      "title": "Fifth idea title",
      "platform": "Different 2025 platform",
      "specificUse": "Different specific use case",
      "tool": "Company's tool",
      "description": "4-5 lines explanation",
      "whyItFits": "4-5 lines explanation"
    }
  ]
}

RESPOND WITH ONLY THE JSON OBJECT - NO MARKDOWN, NO CODE BLOCKS, JUST VALID JSON.`,
  },

  // Blog Quality Analysis
  {
    id: 'blog-quality-analysis',
    name: 'Blog Quality Analysis',
    description: 'Comprehensive blog content analysis including technical depth, AI-written detection, and quality rating',
    version: '1.0.0',
    author: 'Research Team',
    category: 'Blog Analysis',
    tags: ['blog-analysis', 'content-quality', 'ai-detection'],
    variables: ['website', 'blogPostsCount', 'totalCodeBlocks', 'totalDiagrams', 'blogUrl', 'blogContent'],
    userPrompt: `You are an expert content analyst evaluating B2B SaaS blog quality for partnership opportunities.

COMPANY: {{website}}
ANALYSIS TYPE: {{blogPostsCount}} > 0 ? Detailed analysis of {{blogPostsCount}} actual blog posts : "Blog index page analysis"
DETECTED: {{totalCodeBlocks}} total code blocks, {{totalDiagrams}} total images/diagrams
{{blogUrl && blogContent ? 'Blog URL: {{blogUrl}}\\nContent (first 12000 chars):\\n{{blogContent}}' : ''}}

⚠️ CRITICAL REQUIREMENTS ⚠️
1. NEVER return empty strings ("") for reasoning/evidence/summary fields
2. ALL reasoning fields MUST be at least 100 characters long with SPECIFIC examples
3. If you cannot determine something, say "Unable to determine" with explanation - NOT empty string
4. Quote actual phrases from the content to support your analysis
5. Be HARSH but FAIR in your ratings - don't inflate scores

YOUR TASK:
Perform a rigorous content quality analysis. We need to distinguish between:
- HIGH-quality: Deep technical content that experienced developers value
- LOW-quality: Generic marketing fluff or AI-generated surface-level content

ANALYSIS CRITERIA:

1. TECHNICAL DEPTH
   - Are there code examples? (actual implementations, not just snippets)
   - What technical concepts are covered? (algorithms, architecture, protocols?)
   - Does it explain HOW things work internally, not just WHAT they are?
   - Target audience: beginners vs. experienced developers?
   - Product internals and implementation details shown?

2. AI-GENERATED CONTENT DETECTION (Be thorough - this is critical!)
   🚨 STRONG AI-writing indicators (if 3+ present, likely AI-written):
   - Generic intros: "In today's fast-paced world", "In the ever-evolving landscape", "In recent years"
   - Repetitive sentence structures: Every paragraph starts same way
   - Overly polished without personality: No humor, no opinions, no "I" or "we"
   - Lack of specifics: No real metrics, dates, company names, or concrete examples
   - Surface-level only: Explains WHAT but never HOW or WHY at technical level
   - Listicles without depth: "5 ways to...", "10 tips for..." with 2-3 sentences each
   - Generic conclusions: "In conclusion...", "As we've seen...", restate intro without adding value
   - Buzzword density: Every sentence has "innovative", "seamless", "cutting-edge", "robust"
   - No code examples despite technical topic
   - No controversy or strong opinions (AI plays it safe)

   🎯 Human-written indicators:
   - Specific war stories: "When we tried X at Company Y, Z happened"
   - Strong opinions: "X is terrible because...", "Everyone says Y but they're wrong"
   - Actual code with comments explaining decisions
   - Real metrics/data: "We reduced latency from 500ms to 50ms"
   - Personality/humor: Jokes, sarcasm, colloquialisms
   - Multiple authors with different writing styles

3. CONTENT TYPE & FUNNEL STAGE
   - Top-of-funnel: "What is X?" content, generic tutorials, listicles
   - Middle-funnel: Use cases, comparisons, best practices with some depth
   - Bottom-funnel: Deep dives, architecture, product internals, advanced concepts

4. CODE & DIAGRAMS
   - Count actual code blocks with real implementations
   - What languages/frameworks? (Python, Go, JavaScript, etc.)
   - Are there system diagrams, architecture diagrams, data flows?
   - Technical illustrations showing how things work?

5. EVIDENCE & EXAMPLES
   - Quote specific passages that demonstrate quality (or lack of it)
   - Identify real technical topics mentioned
   - Note any AI-writing red flags found`,
    outputSchema: `RESPONSE FORMAT (JSON ONLY - MUST be valid JSON):
{
  "active_blog": boolean,
  "post_count": number,
  "multiple_authors": boolean,
  "author_count": number,
  "authors": ["Name 1", "Name 2"],
  "last_post_date": "YYYY-MM-DD" or null,
  "is_developer_b2b_saas": boolean,
  "authors_are_employees": "employees"|"freelancers"|"mixed"|"unknown",
  "covers_ai_topics": boolean,
  "content_summary": "REQUIRED: Bullet list of 3-5 main topics covered. Min 50 chars. Use • Topic format.",

  "content_quality_rating": "low"|"medium"|"high" (REQUIRED - pick one),
  "content_quality_reasoning": "REQUIRED: Min 150 chars. Must include: (1) Specific topics mentioned (2) Code languages if any (3) Quoted phrases showing quality level (4) Why you chose this rating.",

  "is_ai_written": boolean (REQUIRED),
  "ai_written_confidence": "low"|"medium"|"high" (REQUIRED),
  "ai_written_evidence": "REQUIRED: Min 100 chars. If AI: List specific patterns found with quotes. If human: Explain why (specific examples, personality, real data).",

  "has_code_examples": boolean,
  "code_examples_count": number (count actual code blocks with >3 lines),
  "code_languages": ["Python", "JavaScript", "Go"] (extract from code blocks, empty [] if none),

  "has_diagrams": boolean,
  "diagrams_count": number,

  "technical_depth": "beginner"|"intermediate"|"advanced" (REQUIRED),
  "funnel_stage": "top"|"middle"|"bottom" (REQUIRED),

  "example_quotes": ["Quote 1 showing quality/issues", "Quote 2", "Quote 3"] (REQUIRED: Provide 2-3 actual quotes from content)
}

RATING GUIDELINES (Be HARSH but FAIR):

HIGH (⭐⭐⭐⭐):
- 3+ code examples per post with real implementations
- Architecture/system diagrams present
- Advanced technical concepts (distributed systems, algorithms, protocols)
- Real product implementation details and internals
- Targets experienced developers
- NOT AI-generated
- Bottom-of-funnel content
Example topics: "Implementing Raft consensus in Go", "Our database query optimizer internals"

MEDIUM (⭐⭐⭐):
- 1-2 code examples per post
- Solid technical explanations with some depth
- Practical but not deeply advanced
- May mix some marketing with technical content
- Intermediate developers can learn from it
Example topics: "Building a REST API with error handling", "Deploying with Docker best practices"

LOW (⭐⭐):
- No or minimal code examples
- Generic marketing language
- Surface-level "What is X?" content
- AI-generated patterns detected (generic intros, repetitive structure)
- Top-of-funnel only
- Could be written by someone with no deep expertise
Example topics: "5 Benefits of Cloud Computing", "Why You Need Event-Driven Architecture"

⚠️ BEFORE SUBMITTING YOUR RESPONSE, VERIFY:
✓ content_quality_reasoning is at least 150 characters with specific examples
✓ ai_written_evidence is at least 100 characters with specific examples
✓ content_summary is at least 50 characters
✓ example_quotes has 2-3 actual quotes from the content
✓ NO empty strings ("") in any field
✓ All REQUIRED fields are filled

RESPOND WITH ONLY THE JSON OBJECT - no markdown, no explanation, just valid JSON.`,
  },

  // LinkedIn Analytics Extraction
  {
    id: 'linkedin-analytics-extraction',
    name: 'LinkedIn Analytics Extraction',
    description: 'Extracts LinkedIn post analytics (impressions, likes, comments, shares) from pasted LinkedIn analytics page content using GPT-4',
    version: '1.0.0',
    author: 'Research Team',
    category: 'Data Extraction',
    tags: ['linkedin', 'analytics', 'data-extraction', 'metrics', 'gpt-4'],
    variables: ['pastedContent'],
    systemPrompt: `You are a data extraction assistant. Extract LinkedIn post analytics from the provided text.

The text contains LinkedIn posts with their performance metrics. For each post, extract:
- <strong>content</strong>: First 100-150 characters of the post text (the actual content, not metadata)
- <strong>impressions</strong>: The number shown next to "Impressions" (e.g., "1,178 Impressions" = 1178)
- <strong>likes</strong>: Number of likes/reactions
- <strong>comments</strong>: Number of comments
- <strong>shares</strong>: Number of shares (if mentioned, otherwise 0)
- <strong>postedDate</strong>: Relative date string (e.g., "2w" for 2 weeks, "3d" for 3 days, "1d" for 1 day, "14h" for 14 hours)

<strong>Important:</strong>
<ul>
  <li>Extract ONLY posts that have impression data</li>
  <li>Ignore navigation elements, headers, and UI text</li>
  <li>Convert formatted numbers (e.g., "1,178" to 1178)</li>
  <li>Return ONLY valid JSON, no additional text or markdown</li>
</ul>`,
    userPrompt: `Extract LinkedIn post analytics from this content:

{{pastedContent}}`,
    outputSchema: `Return a JSON object with this exact structure:
{
  "period": "Past 7 days",
  "posts": [
    {
      "content": "Post preview text here...",
      "impressions": 1178,
      "likes": 185,
      "comments": 59,
      "shares": 0,
      "postedDate": "2w"
    }
  ]
}

Each post should include:
- content (string): First 100-150 characters of the actual post text
- impressions (number): Total impressions/views
- likes (number): Reaction count
- comments (number): Comment count
- shares (number): Share count (0 if not available)
- postedDate (string): Relative date like "2w", "3d", "14h"`,
  },

  // Competitor Posts Extraction
  {
    id: 'competitor-posts-extraction',
    name: 'Competitor Posts Extraction',
    description: 'Extracts competitor LinkedIn profile information and all their posts with engagement metrics, hashtags, mentions, and media details from pasted LinkedIn profile feed',
    version: '1.0.0',
    author: 'Research Team',
    category: 'Data Extraction',
    tags: ['linkedin', 'competitor-analysis', 'data-extraction', 'social-media', 'gpt-4'],
    variables: ['pastedContent'],
    systemPrompt: `You are a data extraction assistant. Extract the competitor profile information and ALL their LinkedIn posts from the provided LinkedIn profile feed page content.

<strong>First, extract the competitor's profile information:</strong>
<ol>
  <li><strong>competitorName</strong>: The full name of the person/profile (from the profile header)</li>
  <li><strong>competitorLinkedInUrl</strong>: The LinkedIn profile URL if visible (optional)</li>
</ol>

<strong>Then, for each post, extract:</strong>
<ol>
  <li><strong>content</strong>: The full text of the post</li>
  <li><strong>likes</strong>: Number of likes (reactions)</li>
  <li><strong>comments</strong>: Number of comments</li>
  <li><strong>shares</strong>: Number of shares (reposts)</li>
  <li><strong>impressions</strong>: Number of impressions/views if visible (optional)</li>
  <li><strong>postedDate</strong>: Relative date like "2w", "3d", "1mo" (exactly as shown)</li>
  <li><strong>hashtags</strong>: Array of hashtags used (without # symbol)</li>
  <li><strong>mentions</strong>: Array of @mentions (just the name/handle)</li>
  <li><strong>postType</strong>: Classify as one of: text, image, video, carousel, article, poll, document</li>
  <li><strong>mediaInfo</strong>: If media present, describe:
    <ul>
      <li>type: image, video, carousel, or document</li>
      <li>count: number of items (for carousel)</li>
      <li>hasAlt: whether alt text is present</li>
      <li>description: brief description of the media</li>
    </ul>
  </li>
</ol>

<strong>Important extraction rules:</strong>
<ul>
  <li>Extract ALL posts visible in the content</li>
  <li>If engagement metrics are not visible, use 0</li>
  <li>Hashtags should NOT include the # symbol</li>
  <li>Mentions should NOT include the @ symbol</li>
  <li>For postedDate, use the exact format shown (e.g., "2w", "3d", "1mo", "2h")</li>
  <li>Be thorough and extract every post you can find</li>
</ul>`,
    userPrompt: `Extract all posts from this LinkedIn profile feed:

{{pastedContent}}`,
    outputSchema: `Return the data in this JSON format:
{
  "competitorName": "Full Name From Profile",
  "competitorLinkedInUrl": "https://www.linkedin.com/in/username/",
  "posts": [
    {
      "content": "Post text here...",
      "likes": 123,
      "comments": 45,
      "shares": 6,
      "impressions": 1500,
      "postedDate": "2w",
      "hashtags": ["AI", "MachineLearning"],
      "mentions": ["JohnDoe"],
      "postType": "image",
      "mediaInfo": {
        "type": "image",
        "count": 1,
        "hasAlt": true,
        "description": "Diagram showing model architecture"
      }
    }
  ],
  "totalPosts": 1
}

Post types: text, image, video, carousel, article, poll, document
Media info is optional and only needed when media is present.`,
  },

  // Website/Company Analysis for Offer Generation
  {
    id: 'website-company-analysis',
    name: 'Website/Company Analysis',
    description: 'Analyzes a company website to categorize it into one of 5 types (Generative AI, AI tool, Data science, Service provider, Content maker), understand its business model, and extract key information for outreach',
    version: '1.0.0',
    author: 'Marketing Team',
    category: 'Offer Generation',
    tags: ['company-analysis', 'website-analysis', 'b2b', 'outreach', 'categorization', 'lead-qualification'],
    variables: ['companyName', 'website', 'websiteContent'],
    userPrompt: `You are analyzing a company to categorize it and extract key information for B2B outreach.

COMPANY: {{companyName}}
WEBSITE: {{website}}
CONTENT: {{websiteContent}}

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

4. **Blog URL**: Company blog URL if they have one`,
    outputSchema: `{
  "companyName": "Company Name",
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

RESPOND WITH ONLY THE JSON OBJECT - no markdown, no code blocks, just valid JSON.`,
  },

  // Non-GenAI Blog Ideas Generation
  {
    id: 'non-genai-blog-ideas',
    name: 'Non-GenAI Blog Ideas Generator',
    description: 'Generates 5 highly specific, tailored technical article ideas for B2B companies that are NOT primarily GenAI-focused (devtools, data infrastructure, CMS, etc.) but want AI-related content',
    version: '1.0.0',
    author: 'Mostafa Osama',
    category: 'Offer Generation',
    tags: ['idea-generation', 'blog-outreach', 'b2b', 'devtools', 'data-science', 'technical-writing'],
    variables: ['companyName', 'website', 'blogContent', 'specificRequirements'],
    userPrompt: `COMPANY: {{companyName}}
WEBSITE: {{website}}
BLOG CONTENT: {{blogContent}}
SPECIFIC REQUIREMENTS (if any): {{specificRequirements}}

---

You are a research assistant helping me generate **highly specific and tailored article ideas** for B2B and AI-related companies based on their blogs and product focus.
I will give you the name or URL of a company website or blog (e.g., \`https://www.mongodb.com/blog\`). For each one, follow this process carefully:

---

🔹 **Step 1: Understand the Company**
- Briefly explain what this company does in **simple terms (3–4 lines max)**.
- Then answer: **Does this company offer a product that can be directly used in the field of Generative AI?** If yes, specify whether it's:
  1. A tool to train or improve LLMs
  2. An AI tool for a specific business goal
  3. A data science/infrastructure platform not directly tied to AI output
Finally, decide: **Would you classify this company under "ML" or "data science"?** Only one.

---

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

---

🔹 Rules for writing the ideas
To generate perfect, specific article ideas tailored to your standards, here are your detailed rules, preferences, and expectations — compiled from all your past instructions, refinements, and implicit patterns:

🔧 1. Overall Goal & Style
You want highly specific, detailed article ideas that are:
- Aligned with the target company's real offerings (based on their blog, product, or positioning)
- Unique, not repetitive of what's already on their blog
- Geared toward AI, developer tools, or technical topics
- Written like real blog titles with actual use cases
- Detailed enough to show value to the company and help them attract technical audiences

You are NOT interested in:
- Vague, generic, or abstract AI topics (e.g., "The Future of AI")
- Buzzword-stuffed titles with no real angle
- Obvious or overdone subjects unless approached with new perspective
- Anything related to fraud detection – always avoid this category

🧠 2. Research Rules
Before suggesting ideas, always:
- Understand what the company actually does
- Look through their blog for:
  - The types of tools or topics they write about
  - Industries or verticals they care about
  - Any articles already published (to avoid duplicates)
- Figure out if the company is:
  - AI-native (LLMs, data platforms, AI assistants, etc.)
  - Devtool-focused (SDKs, APIs, frameworks)
  - Infra/hosting (cloud, edge, serverless, CI/CD)
  - Non-technical but still interested in AI content (e.g. CMS tools exploring AI)
Then tailor the ideas to match what's relevant and timely for them.

📌 3. Article Idea Rules
Make sure the articles are technical and related to data science and so on and are in depth and not marketing or salesy articles from now on.
If the company does not make software to use and is indeed a content maker, write an article idea that is technical and fitting for what they typically write and cover on their website.
If the company has software that can be used in the article than always include it in the article.
If the company offers software or a platform, I'll always ensure that their product is included in the article idea itself, either as the focus or integrated into the use case. If the company does not have a software product, I'll keep writing high-quality, technical, tool-rich articles that match their content style.

Each idea must:
- Be a concrete blog title or strong working title
- Include the real-world use case or benefit in the phrasing (not just a tool name)
- Connect AI/devtools to a niche or industry
- Mention a framework, tool, or method if possible (e.g., "using xx with X") …. (Never include llama) (never include gpt-oss-20b)
- Be relevant for the company's ideal readers — often devs, data teams, or AI engineers

✅ Good Examples:
"Using MongoDB Atlas Vector Search to Build an Internal Developer FAQ Chatbot"
"Tracking and Replaying CI/CD Failures with GitHub Actions + Semaphore Pipelines"
"How Headless CMS Users Are Using LLMs to Auto-Generate Schema Migrations in Hygraph"

❌ Bad Examples:
"The Power of AI in Business"
"AI and Fraud Detection in 2025" (banned topic)
"Why Machine Learning Matters" (too broad)

🧱 4. Structure for Each Company
When working on a new company or blog:
Company Summary
- 2–3 lines summarizing what they do in simple language
- Is this company AI-native or AI-adjacent?
- Classify as: AI / Devtool / Data / Infra / CMS / Other
- Decide: Is it better to pitch an AI article or a developer tool integration?

Blog Summary
- Bullet points listing notable recent articles
- Mention any themes you detect (e.g., focuses on React, .NET, GraphQL, Kubernetes)

Final Output: 5 Article Ideas
- Only 5, no filler
- Must be specific, non-repetitive, and relevant
- Ideally use technical phrasing or tools that devs in that niche care about
- Must follow all the article rules above

🚫 Strict No-Gos
- No fraud detection topics, ever
- No generic AI/ML overviews unless deeply tied to the product
- No fluffy business advice
- Avoid repeating topics already published on the company's blog
- No generic "How AI is Changing X" unless with a unique spin

💡 Bonus Tips
- If unsure about the industry, tie ideas to tools or workflows
- Favor "How-to" style or integration-focused ideas
- Use GPT, Vector DBs, LangChain, etc. when relevant — but don't force it
- You like use cases that involve productized AI, not just theory

You need to use more relevant and newer tech and languages and LLMS.
For example In some of the ideas you were using RAG/ Retrieval Augmented Generation. This has been replaced with Model Context Protocol. Llama 3 isn't the latest AI model, we have Llama 4 and so on. GPT 3 and 4 have been replaced with 5. (But from now on never talk about llama)
So from now on, and for any ideas, use only the most relevant and newest models ones made in 2025 or in the past month and never issue anything that is older than that unless there is no newer replacement.

Here is a list of trending models and concepts to use (only use these or very similar very relevant models as new and relevant and trending as these):

🧠 Models (Top 4)
| Name | Why It's Hot | 🔥 Trend Score | Tutorial Idea |
|------|--------------|----------------|---------------|
| GPT-5 | Released Aug 2025; combines reasoning and non-reasoning capabilities under one interface; positioned to replace GPT-4, GPT-4.5, o4-mini, etc. | 9.5 | "Benchmark GPT-5 vs GPT-4.1 on domain-specific generation and log results to W&B" |
| Claude 4.1 / Sonnet | Anthropic's recent updates (e.g. Claude Opus / Sonnet iterations) are gaining traction in safety & reasoning benchmarks | 8.5 | "Instrument prompts & chain-of-thought steps in Claude 4.1 with fine-grained telemetry in W&B" |

Note: where a model pair (like gpt-oss) is released, you can treat them as a family in tutorials.

⚙️ Concepts (Frameworks, Trends, Techniques)
| Name | Why It's Hot (2025 signal) | 🔥 Trend Score | Tutorial Idea |
|------|----------------------------|----------------|---------------|
| Agentic AI / Autonomous Agents | Firms see agents as the next frontier to break through the "GenAI productivity plateau" | 9.0 | "Build a simple multi-step agent with memory and decision logic, track its performance via W&B" |
| Model Context Protocol (MCP) | Emerging as a standard "USB for AI" to expose tools & context across agents | 8.8 | "Wrap a tool (e.g. web search or DB lookup) behind an MCP API and plug into an agent demo, logging usage stats" |
| Agent Communication / Interoperability Protocols (ACP, A2A, ANP) | Growing literature (survey in 2025) on multi-agent coordination & protocol layers | 8.2 | "Implement a toy A2A peer-to-peer agent call and measure latency / message semantics" |
| Agentic Context Engineering (ACE) | New paradigm (Oct 2025) treating context as evolving, structured playbooks; +10.6% agent benchmark lift reported | 8.5 | "Implement ACE loop (generate → reflect → curate) in an agent pipeline and track performance over time" |
| Green AI / Energy-Aware Inference | Power & carbon cost matter more — models optimized for efficiency gain traction in infra & MLOps circles | 8.0 | "Track energy usage & CO₂ per inference (via hardware counters) across model versions in W&B" |
| Inference-Time Computation / Dynamic Routing | Techniques like sparse layers, conditional compute, early exit are now more practical at scale | 8.0 | "Integrate a model with early-exit heads; compare latency vs quality and log curves in W&B" |
| Memory / Long Context Optimization | As context windows hit hundreds of thousands, managing memory (differentiable, chunking) is critical | 8.5 | "Build a retrieval-augmented memory module with vector DB and measure context effectiveness" |
| On-Device & TinyLLM / Edge Models | Trend to push workloads to client devices (mobile, IoT) using quantized / efficient LLMs | 8.3 | "Deploy a quantized LLM to a Jetson or M1 and log latency vs cloud baseline" |
| Safe & Personalized Alignment (e.g. Superego / Constitution Parsing) | New research (mid-2025) dynamically enforces alignment rules per user, with harm mitigation (98.3 % harm reduction) | 8.7 | "Integrate a 'superego agent' overlay for user policies, evaluate on harmful input benchmarks, log refusals" |
| Agent IAM / Zero-Trust Identity for Agents | 2025 proposals for decentralized identity, verifiable credentials, fine-grained access for agents | 7.8 | "Prototype a DID / VC-based identity system for agents and log access denials, credential lifecycle" |

---

There is also another point about why am generating the ideas. I am a single person generating ideas to propose them to companies that I want to work with. I am a single writer so ideas like "Why Most AI-Generated Tech Blogs Fail SEO — and What We've Learned From Editing 1,000 of Them", …. How can I single writer edit a 1000 articles as a single writer…… or "Hiring vs. Training: How to Build a Stable of Reliable Technical Writers in Niche Fields"…. I donot have a stable or a team….. so overall, avoid ideas that donot make sense in the context of a single writer applying to fit with a company.

Very important note:
For some of the companies and websites: I will not only give you the website or name, but I will also give you the ideas they expect or what the idea should revolve around`,
    outputSchema: `{
  "companyName": "Company Name",
  "companySummary": "2-3 line simple explanation of what they do",
  "isAINative": true | false,
  "companyClassification": "AI" | "Devtool" | "Data" | "Infra" | "CMS" | "Other",
  "mlOrDataScience": "ML" | "Data Science",
  "blogThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "recentBlogPosts": ["Post title 1", "Post title 2", "Post title 3"],
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
    },
    {
      "title": "Second article title",
      "whyItFits": "Why this fits explanation",
      "whatReaderLearns": ["Learning 1", "Learning 2", "Learning 3"],
      "keyStackTools": ["Tools"],
      "angleToAvoidDuplication": "Differentiation angle"
    },
    {
      "title": "Third article title",
      "whyItFits": "Why this fits explanation",
      "whatReaderLearns": ["Learning 1", "Learning 2", "Learning 3"],
      "keyStackTools": ["Tools"],
      "angleToAvoidDuplication": "Differentiation angle"
    },
    {
      "title": "Fourth article title",
      "whyItFits": "Why this fits explanation",
      "whatReaderLearns": ["Learning 1", "Learning 2", "Learning 3"],
      "keyStackTools": ["Tools"],
      "angleToAvoidDuplication": "Differentiation angle"
    },
    {
      "title": "Fifth article title",
      "whyItFits": "Why this fits explanation",
      "whatReaderLearns": ["Learning 1", "Learning 2", "Learning 3"],
      "keyStackTools": ["Tools"],
      "angleToAvoidDuplication": "Differentiation angle"
    }
  ]
}

RESPOND WITH ONLY THE JSON OBJECT - no markdown, no code blocks, just valid JSON.`,
  },

  // GenAI Blog Ideas Generation (for companies IN the Generative AI space)
  {
    id: 'genai-blog-ideas',
    name: 'GenAI Blog Ideas Generator',
    description: 'Generates 5 highly specific article ideas for companies that ARE in the Generative AI space, focusing on their AI tools/platforms with specific use cases combining Platform + Tool + Specific Application',
    version: '1.0.0',
    author: 'Mostafa Osama',
    category: 'Offer Generation',
    tags: ['idea-generation', 'blog-outreach', 'generative-ai', 'llm', 'ai-tools', 'technical-writing'],
    variables: ['companyName', 'website', 'blogContent', 'specificRequirements'],
    userPrompt: `COMPANY: {{companyName}}
WEBSITE: {{website}}
BLOG CONTENT: {{blogContent}}
SPECIFIC REQUIREMENTS (if any): {{specificRequirements}}

---

Prompt 1
Here is a list of generative AI applications categorized by their fields:

General Generative AI Applications

Video Applications
1. Video Generation: Impressive video generation capabilities such as those demonstrated by OpenAI's Sora.
2. Video Prediction: GAN-based systems that comprehend temporal and spatial video elements to predict sequences and detect anomalies.

Image Applications
3. Image Generation: Transforming text into images and generating realistic visuals for media, design, advertisement, marketing, education, etc.
4. Semantic Image-to-Photo Translation: Producing realistic images from semantic sketches, useful in healthcare.
5. Image-to-Image Conversion: Transforming external elements of an image while preserving its core, used for effects like day-to-night conversion or style changes.
6. Image Resolution Increase (Super-Resolution): Using GANs to create high-resolution versions of images for archival or medical use.
7. 3D Shape Generation: Creating high-quality 3D versions of objects for various applications.

Audio Applications
8. Text-to-Speech Generator: Producing realistic speech audio for education, marketing, podcasting, and more.
9. Speech-to-Speech Conversion: Generating voice overs for gaming, film, and other industries.
10. Music Generation: Creating novel musical materials for advertisements and other creative purposes.

Text-based Applications
11. Idea Generation: Using LLMs for creative ideation.
12. Text Generation: Generating dialogues, headlines, ads, product descriptions, articles, and social media content.
13. Personalized Content Creation: Generating personalized text, images, music, or other media for social media, blogs, product recommendations, etc.
14. Sentiment Analysis / Text Classification: Generating synthetic text data labeled with various sentiments for training models.

Code-based Applications
15. Code Generation: Producing code snippets or complete programs without manual coding.
16. Code Completion: Suggesting code completions as developers type.
17. Code Review: Optimizing existing code by suggesting improvements or generating alternative implementations.
18. Bug Fixing: Identifying and fixing bugs in the generated code.
19. Code Refactoring: Automating the process of refactoring code.
20. Code Style Checking: Ensuring consistency and readability across a codebase.

Test Automation
21. Generating Test Cases: Creating test cases based on user requirements.
22. Generating Test Code: Converting natural language descriptions into test automation scripts.
23. Test Script Maintenance: Identifying outdated or redundant code in test scripts.
24. Test Documentation: Generating realistic test data based on input parameters.
25. Test Result Analysis: Analyzing test results and providing summaries.

Other Applications
26. Conversational AI: Generating responses for chatbots and virtual assistants.
27. Data Synthesis: Creating synthetic data for training machine learning models.
28. Data Visualization: Performing data visualization tasks using Python libraries.
29. File Conversion: Converting files between different formats.
30. Solving Mathematical Problems: Understanding and solving mathematical questions.

Industry-specific Generative AI Applications

Healthcare Applications
31. Streamlined Drug Discovery and Development: Using AI for drug candidate discovery and testing.
32. Personalized Medicine: Creating individualized treatment plans.
33. Improved Medical Imaging: Enhancing precision in medical imaging.
34. Population Health Management: Designing targeted public health initiatives.

Education Applications
35. Personalized Lessons: Crafting tailored lesson plans for students.
36. Course Design: Designing syllabi and assessments.
37. Content Creation for Courses: Developing unique educational materials.
38. Tutoring: Providing AI-generated tutoring.
39. Data Privacy Protection for Analytical Models: Using synthetic data to protect student privacy.
40. Restoring Old Learning Materials: Enhancing the quality of outdated learning materials.

Fashion Applications
41. Creative Designing for Fashion Designers: Creating innovative styles and optimizing existing designs.
42. Turning Sketches into Color Images: Transforming sketches into vibrant pictures.
43. Generating Representative Fashion Models: Creating diverse fashion models for virtual try-on options.
44. Marketing & Trend Analysis for Fashion Brands: Analyzing trends and personalizing marketing content.

Banking Applications
45. Fraud Detection: Identifying suspicious or fraudulent transactions.
46. Risk Management: Computing value-at-risk estimations and understanding volatility.
47. Generating User-Friendly Explanations for Loan Denial: Creating explanations for loan application decisions.
48. Data Privacy Protection: Using synthetic data for training ML models without privacy concerns.

Gaming Applications
49. Procedural Content Generation: Generating game content like levels and maps.
50. Player Behavior Analysis: Analyzing player data for personalized game experiences.
51. Non-Player Character (NPC) Behavior: Creating realistic NPC behavior.
52. User Interface Design: Designing intuitive user interfaces.
53. Game Testing: Automating game testing and providing feedback.

Travel Applications
54. Identity Verification: Using AI for face identification and verification at airports.
55. Personalized Travel and Destination Recommendations: Analyzing customer data for travel recommendations.

Retail Applications
56. Product and Display Design: Creating new product designs and personalizing display options.
57. Automated Retail Content Generation: Creating product descriptions and promotional content.
58. Product Recommendations: Suggesting products based on buying history and preferences.
59. Inventory Management & Supply Chain Optimization: Forecasting demand and optimizing inventory.
60. Virtual Shopping Assistants: Providing conversational virtual assistants for customers.

Insurance Applications
61. Policy Documentation: Generating policy documents based on user-specific details.
62. Risk Assessment and Premium Calculation: Simulating risk scenarios and calculating premiums.
63. Fraud Detection: Generating examples of fraudulent claims for training models.
64. Customer Profiling: Creating synthetic customer profiles for segmentation and marketing.
65. Claims Processing: Streamlining claims management with automated responses.
66. Policy Generation: Creating personalized insurance policies.
67. Predictive Analysis & Scenario Modeling: Generating potential scenarios for decision-making.

Manufacturing Applications
68. Predictive Maintenance: Predicting equipment failures for proactive maintenance.
69. Quality Control: Improving quality control processes by predicting defects.
70. Production Planning and Inventory Management: Simulating production scenarios and predicting demand.

Business-function-specific Generative AI Applications

Customer Service Applications
71. Multilingual Customer Support: Providing support in multiple languages.
72. Personalized Customer Responses: Generating relevant responses based on customer data.
73. Quick Responses to Customer Inquiries & Complaints: Addressing common complaints and providing solutions.
74. Creating Customer Emails: Generating personalized email templates.
75. Replying to Customer Reviews: Responding to reviews with generated responses.
76. Answering FAQs: Providing answers to frequently asked questions.

Finance Applications
* AP Automation / Invoice Processing: Querying documents for flexible automation.
* Invoice Processing: Enriching ERP systems with automation capabilities.

Marketing Applications
77. Content Creation for Marketing: Generating text for emails, social media posts, blog articles, etc.
78. Personalized Customer Experience: Creating targeted content based on customer data.
79. Audience Research: Analyzing customer data to identify patterns and trends.
80. Writing Product Descriptions: Creating compelling product descriptions.
81. Creating Customer Surveys: Generating survey questions and analyzing responses.
82. Generating Video Ads or Product Demos: Creating high-quality video ads and demos.
83. Email Marketing Campaigns: Generating personalized email content and automating responses.

SEO Applications
90. Generating Topic Ideas for Content Writing: Producing relevant keywords and analyzing competitors' content.
91. Conducting Keyword Research: Generating keyword lists and identifying trends.
92. Finding the Right Titles: Creating SEO-friendly titles.
93. Grouping Search Intent: Analyzing search queries to categorize user intent.
94. Creating Content Structure: Generating outlines and organization suggestions.
95. Generating Meta Descriptions: Creating effective meta descriptions.
96. Creating Sitemap Codes: Producing XML files for website structure.

HR Applications
97. Creating Interview Questions: Generating relevant questions for job candidates.
98. Generating Onboarding Materials: Creating training videos, handbooks, and documentation.
99. Job Description Generation: Creating accurate job descriptions.

Supply Chain & Procurement Applications
100. Demand Forecasting and Supply Chain Management: Predicting demand to optimize supply chain operations.

Legal Applications
101. Contract Generation: Creating contracts based on templates.
102. Contract Compliance: Categorizing and analyzing contracts for compliance.

Sales Applications
103. Sales Coaching: Providing personalized coaching to sales reps.
104. Sales Forecasting and Pipeline Optimization: Analyzing data to generate sales forecasts.
105. Lead Identification and Qualification: Identifying and qualifying sales leads.
106. Sales Video Generation: Creating personalized sales videos.

Audit Applications
107. Audit Reporting Automation: Automating the production of standardized reports.
108. Data Analysis of Documents: Automating data analysis tasks.
109. Real-time Risk Monitoring: Monitoring risk levels in real-time.
110. Pattern Recognition and Anomaly Detection: Spotting and flagging audit abnormalities.
111. Training Auditors: Providing educational materials for auditor training.

——————

Prompt 2
I was given a task to generate ideas for articles for certain websites. The articles will cover technical things like computer science and machine learning. I will start by giving you a website and you must know that i do not know almost anything about these topics. I want you to explain the back what the company does in very simple and clear terms and give me the topics that they discuss. (Task 1)
You must also understand the description of the website yourself, since I expect you to use this data when I ask you to generate relevant ideas. The idea is that the websites I am going to give you here are going to be in the business that provides a service related to generative AI.
So, your first task for any given website would be to confirm that this is related to Generative AI. And then explain what this website does in simple terms in 4 lines.
what does the following company do.
explain it to me clearly and simply
You should also for the given website confirm that this website provides a tool that can be used directly to help in a field related to Generative AI in a direct way meaning does this website provide a an AI tool that can be used to train and improve LLM or does it provide a simple AI tool to be used by companies for a certain goal or does it do something not related to AI and more related to Data science for example. And then explain what this website does in simple terms in 4 lines. (Task 2)
Also, based on this description to this company. if you had to classify it in one of two categories, "ML" or "data science" which would you choose. (Task 3)
Just give me the information above and nothing more

Prompt 3
I was given a task to generate ideas for articles for certain websites. The articles will cover technical things like computer science and machine learning.
You must also understand the description of the website that you gave me above yourself, since I expect you to use this data when I ask you to generate relevant ideas.
The idea is that the websites I am going to give you here are going to be in the business that provides a service related to generative AI.
Provide me with the titles of some of their previous articles especially those related to AI and to the uses of these tool in specific fields and give me some keywords to consider when addressing this company. Use the articles you find on their blog to understand which uses they care about and to make the suggested article ideas personalized to them. (Task 4)
I want you to use them as a reference to generate 5 more articles for me and under each article write a description explaining what the terms are that you are explaining and what the content of the article should be. (Task 5)
Under each article also write for me why you see it fits (when addressing why it fits also mention why it fits based on our own personal case meaning look at the words we provided below and tell me why this articles fits to what we typically write about and not only why it fits because of the strength and relevance of the content overall) (the description and the why it fits should be 4 to 5 lines long each)

The idea generated should have three parts in each single one:
How to use the tool provided in the website I gave you to do something very specific in one of the fields in generative AI that you mentioned in the beginning of this chat on a certain platform that I will give you.
1. a platform: Gemini / Gemini Pro, Phi-3, Claude, Mixtral, Falcon, or just "LLMs" …. (Never include llama)
2. a specific use: not something generic.... Not healthcare for example…. Something like imaging to detect lung cancer for example…….. I want them to be as specific as possible and try to make sure that they cover important areas when possible like business or healthcare. But always give one or two examples in the big and important fields like healthcare and business. Use the fields that you already mentioned in this chat (in this answer of yours "Here is a list of generative AI applications categorized by their fields"). Always avoid banking and things related to music.
For the use … I donot want something like "Using Writesonic and Gemini Pro for Automated Medical Report Generation"…. I want you to be even more specific like
"Using Writesonic and Gemini Pro for Automated Radiology Report Generation to Detect Lung Cancer"
Other good examples to follow: (be as specific as you can ever be)
- Earthquake Tremors to Trembling Models Predicting Nature's Force with AI and Tabular Data
- Fine-Tuning vs. Retrieval-Augmented Generation: Navigating Legal Document Analysis
- Building a RAG System with Gemini LLM for Financial forecasting
- Using YOLOv5 Object Detection to Optimize Parking Lot Management
3. the tool itself which you have already confirmed that can be used in this case

Final part (generating the message)
Now using everything you generated above, do the following:
For the company above, I am writing them a linkedin message. I donot want you to change anything about the message itself. I simply want you to change the slots with the correct information:
- Change {Company} with the correct company name. If there is an "'s" leave it after it.
- Change the word {article name} with one of the articles you suggested but one related to AI from the suggested ones you got.
- Don't change the {idea}, leave it as it is
- Change "For example, I can add some blogs about the use of {example from their blog like using your tool in certain field}, as I think your viewers would love that." To the most fitting example of usage from the 3 you suggested.

Subject: Collaborating on Articles for {Company}!
Hi {NAME},
I'm Mostafa, a software and MLOps engineer passionate about AI and software development writing, with notable clients like Weights & Biases and Supertokens.
I came across {Company}'s blog, especially the article "{article name}", and I'm impressed. I'd love to contribute by writing AI concepts or detailed tutorials on {Company}'s features. Here's an article idea made specifically for you:
{Idea}
My articles have garnered over 500,000+ views. Check out my profiles:
https://wandb.ai/mostafaibrahim17/ml-articles/reportlist
https://medium.com/@mostafaibrahim18
I look forward to discussing more.

—————————————————

Ideas to use
- Must identify if the tool is used in generative AI or a direct tool
- Focuses that each article should have a platform + a specific use + the tool itself

You need to use more relevant and newer tech and languages and LLMS.
For example In some of the ideas you were using RAG/ Retrieval Augmented Generation. This has been replaced with Model Context Protocol. Llama 3 isn't the latest AI model, we have Llama 4 and so on. GPT 3 and 4 have been replaced with 5.
So from now on, and for any ideas, use only the most relevant and newest models ones made in 2025 or in the past month and never issue anything that is older than that unless there is no newer replacement.

Here is a list of trending models and concepts to use (only use these or very similar very relevant models as new and relevant and trending as these):

🧠 Models (Top 4)
| Name | Why It's Hot | 🔥 Trend Score | Tutorial Idea |
|------|--------------|----------------|---------------|
| GPT-5 | Released Aug 2025; combines reasoning and non-reasoning capabilities under one interface; positioned to replace GPT-4, GPT-4.5, o4-mini, etc. | 9.5 | "Benchmark GPT-5 vs GPT-4.1 on domain-specific generation and log results to W&B" |
| Claude 4.1 / Sonnet | Anthropic's recent updates (e.g. Claude Opus / Sonnet iterations) are gaining traction in safety & reasoning benchmarks | 8.5 | "Instrument prompts & chain-of-thought steps in Claude 4.1 with fine-grained telemetry in W&B" |

Note: where a model pair (like gpt-oss) is released, you can treat them as a family in tutorials.
(never include gpt-oss-20b)
(never include Llama)

⚙️ Concepts (Frameworks, Trends, Techniques)
| Name | Why It's Hot (2025 signal) | 🔥 Trend Score | Tutorial Idea |
|------|----------------------------|----------------|---------------|
| Agentic AI / Autonomous Agents | Firms see agents as the next frontier to break through the "GenAI productivity plateau" | 9.0 | "Build a simple multi-step agent with memory and decision logic, track its performance via W&B" |
| Model Context Protocol (MCP) | Emerging as a standard "USB for AI" to expose tools & context across agents | 8.8 | "Wrap a tool (e.g. web search or DB lookup) behind an MCP API and plug into an agent demo, logging usage stats" |
| Agent Communication / Interoperability Protocols (ACP, A2A, ANP) | Growing literature (survey in 2025) on multi-agent coordination & protocol layers | 8.2 | "Implement a toy A2A peer-to-peer agent call and measure latency / message semantics" |
| Agentic Context Engineering (ACE) | New paradigm (Oct 2025) treating context as evolving, structured playbooks; +10.6% agent benchmark lift reported | 8.5 | "Implement ACE loop (generate → reflect → curate) in an agent pipeline and track performance over time" |
| Green AI / Energy-Aware Inference | Power & carbon cost matter more — models optimized for efficiency gain traction in infra & MLOps circles | 8.0 | "Track energy usage & CO₂ per inference (via hardware counters) across model versions in W&B" |
| Inference-Time Computation / Dynamic Routing | Techniques like sparse layers, conditional compute, early exit are now more practical at scale | 8.0 | "Integrate a model with early-exit heads; compare latency vs quality and log curves in W&B" |
| Memory / Long Context Optimization | As context windows hit hundreds of thousands, managing memory (differentiable, chunking) is critical | 8.5 | "Build a retrieval-augmented memory module with vector DB and measure context effectiveness" |
| On-Device & TinyLLM / Edge Models | Trend to push workloads to client devices (mobile, IoT) using quantized / efficient LLMs | 8.3 | "Deploy a quantized LLM to a Jetson or M1 and log latency vs cloud baseline" |
| Safe & Personalized Alignment (e.g. Superego / Constitution Parsing) | New research (mid-2025) dynamically enforces alignment rules per user, with harm mitigation (98.3 % harm reduction) | 8.7 | "Integrate a 'superego agent' overlay for user policies, evaluate on harmful input benchmarks, log refusals" |
| Agent IAM / Zero-Trust Identity for Agents | 2025 proposals for decentralized identity, verifiable credentials, fine-grained access for agents | 7.8 | "Prototype a DID / VC-based identity system for agents and log access denials, credential lifecycle" |

- Must give examples of uses of generative ai
- https://research.aimultiple.com/generative-ai-applications/#banking-applications
- Must give article examples from Mostafa's portfolio on weights and biases
- Must make GPT say if the business has a relation to generative ai or not
- Must make chat gpt understand generative ai: https://www.gartner.com/en/topics/generative-ai
- For companies not related to generative ai or without a specific use…. Then use the older prompt
- Must understand each tool and what it is used for
- Gives a specific example…… not health care…. Something specific in health care

There is also another point about why am generating the ideas. I am a single person generating ideas to propose them to companies that I want to work with. I am a single writer so ideas like "Why Most AI-Generated Tech Blogs Fail SEO — and What We've Learned From Editing 1,000 of Them", …. How can I single writer edit a 1000 articles as a single writer…… or "Hiring vs. Training: How to Build a Stable of Reliable Technical Writers in Niche Fields"…. I donot have a stable or a team….. so overall, avoid ideas that donot make sense in the context of a single writer applying to fit with a company.

Very important note:
For some of the companies and websites: I will not only give you the website or name, but I will also give you the ideas they expect or what the idea should revolve around`,
    outputSchema: `{
  "companyName": "Company Name",
  "companySummary": "4 line simple explanation of what they do",
  "isGenAIRelated": true,
  "toolClassification": "LLM Training Tool" | "AI Application Tool" | "Data Science Platform",
  "mlOrDataScience": "ML" | "Data Science",
  "blogThemes": ["Theme 1", "Theme 2", "Theme 3"],
  "recentBlogPosts": ["Post title 1", "Post title 2", "Post title 3"],
  "keywords": ["keyword1", "keyword2", "keyword3"],
  "ideas": [
    {
      "title": "Full article title: Platform + Company Tool + Ultra-Specific Use Case",
      "platform": "GPT-5 | Claude 4.1 | Gemini Pro | etc.",
      "specificUse": "Ultra-specific application (e.g., 'Radiology Report QC for Lung Cancer Detection')",
      "companyTool": "The company's specific product/tool name",
      "whyItFits": "2-3 sentences: Why it fits the company's blog AND why it fits my portfolio (MLOps, tutorials, single-writer execution)",
      "whatReaderLearns": [
        "Specific learning outcome 1",
        "Specific learning outcome 2",
        "Specific learning outcome 3",
        "Specific learning outcome 4"
      ],
      "keyStackTools": ["Platform", "Company Tool", "Other relevant tools"],
      "angleToAvoidDuplication": "1-2 sentences on how this differs from their existing content"
    },
    {
      "title": "Second article title with Platform + Tool + Specific Use",
      "platform": "Different platform",
      "specificUse": "Different ultra-specific use case",
      "companyTool": "Company's tool",
      "whyItFits": "Why this fits explanation",
      "whatReaderLearns": ["Learning 1", "Learning 2", "Learning 3"],
      "keyStackTools": ["Tools"],
      "angleToAvoidDuplication": "Differentiation angle"
    },
    {
      "title": "Third article title",
      "platform": "Different platform",
      "specificUse": "Different ultra-specific use case",
      "companyTool": "Company's tool",
      "whyItFits": "Why this fits explanation",
      "whatReaderLearns": ["Learning 1", "Learning 2", "Learning 3"],
      "keyStackTools": ["Tools"],
      "angleToAvoidDuplication": "Differentiation angle"
    },
    {
      "title": "Fourth article title",
      "platform": "Different platform",
      "specificUse": "Different ultra-specific use case",
      "companyTool": "Company's tool",
      "whyItFits": "Why this fits explanation",
      "whatReaderLearns": ["Learning 1", "Learning 2", "Learning 3"],
      "keyStackTools": ["Tools"],
      "angleToAvoidDuplication": "Differentiation angle"
    },
    {
      "title": "Fifth article title",
      "platform": "Different platform",
      "specificUse": "Different ultra-specific use case",
      "companyTool": "Company's tool",
      "whyItFits": "Why this fits explanation",
      "whatReaderLearns": ["Learning 1", "Learning 2", "Learning 3"],
      "keyStackTools": ["Tools"],
      "angleToAvoidDuplication": "Differentiation angle"
    }
  ]
}

RESPOND WITH ONLY THE JSON OBJECT - no markdown, no code blocks, just valid JSON.`,
  },
];

export const PROMPT_CATEGORIES = [
  'LinkedIn Posts',
  'Blog Analysis',
  'Writing Program Finder',
  'Writing Program Analyzer',
  'Idea Generation',
  'Data Extraction',
  'Offer Generation',
];

export function getPromptsByCategory(category: string): PromptMetadata[] {
  return AI_PROMPTS.filter(prompt => prompt.category === category);
}

export function getPromptById(id: string): PromptMetadata | undefined {
  return AI_PROMPTS.find(prompt => prompt.id === id);
}
