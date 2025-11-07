import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import {FieldValue} from "firebase-admin/firestore";
import OpenAI from "openai";
import {logApiCost, calculateCost} from "../utils/costTracker";

/**
 * GenAI Blog Ideas Generator
 * Analyzes company blogs and generates 5 highly personalized technical article ideas
 * focused on Generative AI applications using latest 2025 models and trends
 */

export interface GenAIIdeaRequest {
  leadId: string;
  companyUrl: string;
  companyName: string;
  blogContent: string;
}

export interface GenAIIdea {
  title: string;
  platform: string;
  specificUse: string;
  tool: string;
  description: string;
  whyItFits: string;
}

export interface GenAIIdeaResponse {
  companyContext: {
    companyName: string;
    companyWebsite: string;
    companyDescription: string;
    isDeveloperB2BSaaS: boolean;
    isGenAIRelated: boolean;
    category: "ML" | "Data Science" | "Not AI-related";
    toolType: string;
  };
  blogAnalysis: {
    previousArticleTitles: string[];
    topicsTheyDiscuss: string[];
    keywords: string[];
    technicalDepth: "beginner" | "intermediate" | "advanced";
    writerTypes: "employees" | "freelancers" | "mixed" | "unknown";
  };
  ideas: GenAIIdea[];
  linkedInMessage: string;
  costInfo?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
    model: string;
  };
}

/**
 * Cloud function to generate GenAI blog ideas
 */
export const generateGenAIBlogIdeas = functions.https.onCall(
  async (data: GenAIIdeaRequest, context): Promise<GenAIIdeaResponse> => {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to generate ideas"
      );
    }

    // Validate input
    const {leadId, companyUrl, companyName, blogContent} = data;

    if (!leadId || typeof leadId !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Lead ID is required and must be a string"
      );
    }

    if (!companyUrl || typeof companyUrl !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Company URL is required and must be a string"
      );
    }

    if (!companyName || typeof companyName !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Company name is required and must be a string"
      );
    }

    if (!blogContent || typeof blogContent !== "string") {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Blog content is required and must be a string"
      );
    }

    // Get OpenAI API key from environment config
    const openaiApiKey = functions.config().openai?.key || process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      throw new functions.https.HttpsError(
        "failed-precondition",
        "OpenAI API key not configured. Run: firebase functions:config:set openai.key=YOUR_KEY"
      );
    }

    try {
      console.log(`Generating GenAI blog ideas for lead ${leadId}`);
      console.log(`Company: ${companyName} (${companyUrl})`);

      const openai = new OpenAI({apiKey: openaiApiKey});

      // Build the user prompt with company data
      const userPrompt = buildGenAIPrompt(companyUrl, companyName, blogContent);

      console.log("Calling OpenAI with GenAI Blog Ideas prompt...");

      const completion = await openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: "You are an expert content strategist and MLOps engineer specializing in Generative AI. You analyze company blogs and generate highly personalized, technical article ideas focused on cutting-edge GenAI applications using the latest 2025 models and trends.",
          },
          {
            role: "user",
            content: userPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      });

      const responseContent = completion.choices[0]?.message?.content;

      if (!responseContent) {
        throw new Error("Empty response from OpenAI");
      }

      console.log("Received response from OpenAI, parsing JSON...");

      // Parse the JSON response
      let parsedResponse: GenAIIdeaResponse;
      try {
        // Remove markdown code blocks if present
        const cleanedResponse = responseContent
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        parsedResponse = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error("Failed to parse OpenAI response as JSON:", parseError);
        console.error("Raw response:", responseContent.substring(0, 500));
        throw new Error("Invalid JSON response from OpenAI");
      }

      // Validate response structure
      if (!parsedResponse.ideas || !Array.isArray(parsedResponse.ideas)) {
        throw new Error("Response missing 'ideas' array");
      }

      if (parsedResponse.ideas.length !== 5) {
        console.warn(`Expected 5 ideas but got ${parsedResponse.ideas.length}`);
      }

      console.log(`Successfully generated ${parsedResponse.ideas.length} GenAI blog ideas`);

      // Calculate cost
      const usage = completion.usage;
      const costInfo = usage ? calculateCost(
        {
          inputTokens: usage.prompt_tokens,
          outputTokens: usage.completion_tokens,
          totalTokens: usage.total_tokens,
        },
        "gpt-4-turbo-preview"
      ) : {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        inputCost: 0,
        outputCost: 0,
        totalCost: 0,
        model: "gpt-4-turbo-preview",
      };

      // Create a session ID for this generation
      const sessionId = `genai-session-${Date.now()}`;

      // Save all ideas to Firestore subcollection
      const db = admin.firestore();
      const ideasCollectionRef = db.collection("leads").doc(leadId).collection("ideas");

      // Batch write all ideas
      const batch = db.batch();

      parsedResponse.ideas.forEach((idea, index) => {
        const ideaRef = ideasCollectionRef.doc(); // Auto-generate ID
        const ideaData = {
          id: ideaRef.id,
          type: "genai-blog-idea",
          sessionId,
          title: idea.title,
          platform: idea.platform,
          specificUse: idea.specificUse,
          tool: idea.tool,
          description: idea.description,
          whyItFits: idea.whyItFits,
          status: "pending",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
          companyContext: parsedResponse.companyContext,
          blogAnalysis: parsedResponse.blogAnalysis,
        };

        batch.set(ideaRef, ideaData);
      });

      await batch.commit();

      console.log(`Saved ${parsedResponse.ideas.length} ideas to Firestore for lead ${leadId}`);

      // Log API cost
      if (costInfo && context.auth) {
        await logApiCost(
          context.auth.uid,
          "genai-blog-idea",
          costInfo,
          {
            leadId,
            companyName,
            website: companyUrl,
            operationDetails: {
              sessionId,
              ideasGenerated: parsedResponse.ideas.length,
              blogContentLength: blogContent.length,
            },
          }
        );
      }

      // Update lead with metadata
      const leadRef = db.collection("leads").doc(leadId);
      await leadRef.update({
        hasGeneratedIdeas: true,
        lastIdeaGeneratedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Return the response with cost info
      return {
        ...parsedResponse,
        costInfo,
      };
    } catch (error: any) {
      console.error("Error generating GenAI blog ideas:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate GenAI blog ideas: ${error.message || "Unknown error"}`
      );
    }
  }
);

/**
 * Build the complete GenAI prompt with company data
 */
function buildGenAIPrompt(companyUrl: string, companyName: string, blogContent: string): string {
  return `COMPANY TO ANALYZE:
Company URL: ${companyUrl}
Company Name: ${companyName}
Blog Content: ${blogContent}

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

—————— Prompt 2 I was given a task to generate ideas for articles for certain websites. The articles will cover technical things like computer science and machine learning. I will start by giving you a website and you must know that i do not know almost anything about these topics. I want you to explain the back what the company does in very simple and clear terms and give me the topics that they discuss. (Task 1) You must also understand the description of the website yourself, since I expect you to use this data when I ask you to generate relevant ideas. The idea is that the websites I am going to give you here are going to be in the business that provides a service related to generative AI. So, your first task for any given website would be to confirm that this is related to Generative AI. And then explain what this website does in simple terms in 4 lines. what does the following company do. explain it to me clearly and simply You should also for the given website confirm that this website provides a tool that can be used directly to help in a field related to Generative AI in a direct way meaning does this website provide a an AI tool that can be used to train and improve LLM or does it provide a simple AI tool to be used by companies for a certain goal or does it do something not related to AI and more related to Data science for example. And then explain what this website does in simple terms in 4 lines. (Task 2) Also, based on this description to this company. if you had to classify it in one of two categories, "ML" or "data science" which would you choose. (Task 3) Just give me the information above and nothing more Prompt 3 I was given a task to generate ideas for articles for certain websites. The articles will cover technical things like computer science and machine learning. You must also understand the description of the website that you gave me above yourself, since I expect you to use this data when I ask you to generate relevant ideas. The idea is that the websites I am going to give you here are going to be in the business that provides a service related to generative AI. Provide me with the titles of some of their previous articles especially those related to AI and to the uses of these tool in specific fields and give me some keywords to consider when addressing this company. Use the articles you find on their blog to understand which uses they care about and to make the suggested article ideas personalized to them. (Task 4) I want you to use them as a reference to generate 5 more articles for me and under each article write a description explaining what the terms are that you are explaining and what the content of the article should be . (Task 5) Under each article also write for me why you see it fits (when addressing why it fits also mention why it fits based on our own personal case meaning look at the words we provided below and tell me why this articles fits to what we typically write about and not only why it fits because of the strength and relevance of the content overall) (the description and the why it fits should be 4 to 5 lines long each) The idea generated should have three parts in each single one: How to use the tool provided in the website I gave you to do something very specific in one of the fields in generative AI that you mentioned in the beginning of this chat on a certain platform that I will give you. 1. a platform: Gemini / Gemini Pro, Llama 3, Phi-3, Claude, Mixtral, Falcon, or just "LLMs" 2. a specific use: not something generic.... Not healthcare for example…. Something like imaging to detect lung cancer for example…….. I want them to be as specific as possible and try to make sure that they cover important areas when possible like business or healthcare. But always give one or two examples in the big and important flields like healthcare and business. Use the fields that you already mentioned in this chat (in this answer of yours "Here is a list of generative AI applications categorized by their fields" ). Always avoid banking and things related to music. For the use … I donot want something like "Using Writesonic and Gemini Pro for Automated Medical Report Generation"…. I want you to be even more specific like "Using Writesonic and Gemini Pro for Automated Radiology Report Generation to Detect Lung Cancer" Other good examples to follow: (be as specific as you can ever be) Earthquake Tremors to Trembling Models Predicting Nature's Force with AI and Tabular Data Fine-Tuning vs. Retrieval-Augmented Generation: Navigating Legal Document Analysis Building a RAG System with Gemini LLM for Financial forecasting Using YOLOv5 Object Detection to Optimize Parking Lot Management 3. the tool itself which you have already confirmed that can be used in this case Final part (generating the message) Now using everything you generated above, do the following: For the company above, I am writing them a linkedin message. I donot want you to change anything about the message itself. I simply want you to change the slots with the correct information: Change {Company} with the correct company name. If there is an "'s" leave it after it. Change the word {article name] with one of the articles you suggested but one related to AI from the suggested ones you got. Don't change the {idea}, leave it as it is Change "For example, I can add some blogs about the use of {example from their blog like using your tool in certain field}, as I think your viewers would love that." To the most fitting example of usage from the 3 you suggested. Subject: Collaborating on Articles for {Company}! Hi {NAME}, I'm Mostafa, a software and MLOps engineer passionate about AI and software development writing, with notable clients like Weights & Biases and Supertokens. I came across {Company}'s blog, especially the article "{article name}", and I'm impressed. I'd love to contribute by writing AI concepts or detailed tutorials on {Company}'s features. Here's an article idea made specifically for you: {Idea} My articles have garnered over 500,000+ views. Check out my profiles: https://wandb.ai/mostafaibrahim17/ml-articles/reportlist https://medium.com/@mostafaibrahim18 I look forward to discussing more. ————————————————— ——————— Ideas to use - Must identify if the tool is used in generative AI or a direct tool - Focuses that each article should have a platform + a specific use + the tool itself You need to use more relevant and newer tech and languages and LLMS. For example In some of the ideas you were using RAG/ Retrieval Augmented Generation. This has been replaced with Model Context Protocol. Llama 3 isn't the latest AI model, we have Llama 4 and so on. GPT 3 and 4 have been replaced with 5. So from now on, and for any ideas, use only the most relevant and newest models ones made in 2025 or in the past month and never issue anything that is older than that unless there is no newer replacement. Here is a list of trending models and concepts to use (only use these or very similar very relevant models as new and relevant and trending as these): Here's a refined list of high-potential topics (models + concepts) as of late 2025, each with signal metrics and tutorial hooks. Use these as seeds to spin into hands-on blogs, integrations, or infrastructure pieces. 🧠 Models (Top 4) Name Why It's Hot 🔥 Trend Score Tutorial Idea GPT-5 Released Aug 2025; combines reasoning and non-reasoning capabilities under one interface; positioned to replace GPT-4, GPT-4.5, o4-mini, etc. Wikipedia 9.5 "Benchmark GPT-5 vs GPT-4.1 on domain-specific generation and log results to W&B" gpt-oss-120b / gpt-oss-20b (OpenAI open-weight models) OpenAI's first open-weight models since GPT-2; downloadable, fine-tunable, can run locally (20B on 16 GB VRAM) WIRED+3OpenAI Help Center+3TechCrunch+3 9.0 "Deploy gpt-oss-20b in a Civo/ONNX pipeline and log latency & memory metrics to W&B" Llama 4 Scout (or Llama 4 family) Meta's newest large model line, with improvements in efficiency and context handling. (Mentioned among 2025 open LLM rankings) Exploding Topics 8.5 "Fine-tune Llama 4 Scout on domain data and track model drift over time with W&B" Claude 4.1 / Sonnet (or next Anthropic flagship) Anthropic's recent updates (e.g. Claude Opus / Sonnet iterations) are gaining traction in safety & reasoning benchmarks 8.5 "Instrument prompts & chain-of-thought steps in Claude 4.1 with fine-grained telemetry in W&B" Note: where a model pair (like gpt-oss) is released, you can treat them as a family in tutorials. ⚙️ Concepts (Frameworks, Trends, Techniques) Name Why It's Hot (2025 signal) 🔥 Trend Score Tutorial Idea Agentic AI / Autonomous Agents Firms see agents as the next frontier to break through the "GenAI productivity plateau" McKinsey & Company+2Capgemini+2 9.0 "Build a simple multi-step agent with memory and decision logic, track its performance via W&B" Model Context Protocol (MCP) Emerging as a standard "USB for AI" to expose tools & context across agents IBM+3Bitdefender Blog+3OneReach+3 8.8 "Wrap a tool (e.g. web search or DB lookup) behind an MCP API and plug into an agent demo, logging usage stats" Agent Communication / Interoperability Protocols (ACP, A2A, ANP) Growing literature (survey in 2025) on multi-agent coordination & protocol layers arXiv+2OneReach+2 8.2 "Implement a toy A2A peer-to-peer agent call and measure latency / message semantics" Agentic Context Engineering (ACE) New paradigm (Oct 2025) treating context as evolving, structured playbooks; +10.6% agent benchmark lift reported arXiv 8.5 "Implement ACE loop (generate → reflect → curate) in an agent pipeline and track performance over time" Green AI / Energy-Aware Inference Power & carbon cost matter more — models optimized for efficiency gain traction in infra & MLOps circles 8.0 "Track energy usage & CO₂ per inference (via hardware counters) across model versions in W&B" Inference-Time Computation / Dynamic Routing Techniques like sparse layers, conditional compute, early exit are now more practical at scale 8.0 "Integrate a model with early-exit heads; compare latency vs quality and log curves in W&B" Memory / Long Context Optimization As context windows hit hundreds of thousands, managing memory (differentiable, chunking) is critical 8.5 "Build a retrieval-augmented memory module with vector DB and measure context effectiveness" On-Device & TinyLLM / Edge Models Trend to push workloads to client devices (mobile, IoT) using quantized / efficient LLMs 8.3 "Deploy a quantized LLM to a Jetson or M1 and log latency vs cloud baseline" Safe & Personalized Alignment (e.g. Superego / Constitution Parsing) New research (mid-2025) dynamically enforces alignment rules per user, with harm mitigation (98.3 % harm reduction) arXiv 8.7 "Integrate a 'superego agent' overlay for user policies, evaluate on harmful input benchmarks, log refusals" Agent IAM / Zero-Trust Identity for Agents 2025 proposals for decentralized identity, verifiable credentials, fine-grained access for agents arXiv 7.8 "Prototype a DID / VC-based identity system for agents and log access denials, credential lifecycle" - Must give examples of uses of generative ai - https://research.aimultiple.com/generative-ai-applications/#banking-applications - Must give article examples from Mostafa's portfolio on weights and biases - Must make GPT say if the business has a relation to generative ai or not - Must make chat gpt understand generative ai: https://www.gartner.com/en/topics/generative-ai - For companies not related to generative ai or without a specific use…. Then use the older prompt - Must understand each tool and what it is used for - Gives a specific example…… not health care…. Something specific in health care There is also another point about why am generating the ideas. I am a single person generating ideas to propose them to companies that I want to work with. I am a single writer so ideas like "Why Most AI-Generated Tech Blogs Fail SEO — and What We've Learned From Editing 1,000 of Them", …. How can I single writer edit a 1000 articles as a single writer…… or "Hiring vs. Training: How to Build a Stable of Reliable Technical Writers in Niche Fields"…. I donot have a stable or a team….. so overall, avoid ideas that donot make sense in the context of a single writer applying to fit with a company. Very important note: For some of the companies and websites: I will not only give you the website or name, but I will also give you the ideas they expect or what the idea should revolve around

================================================================================
STRUCTURED JSON OUTPUT SECTION
================================================================================

Based on all the analysis above, provide your response as valid JSON with the following structure:

{
  "companyContext": {
    "companyName": "string",
    "companyWebsite": "string",
    "companyDescription": "4-line simple explanation of what they do",
    "isDeveloperB2BSaaS": true/false,
    "isGenAIRelated": true/false,
    "category": "ML" | "Data Science" | "Not AI-related",
    "toolType": "Direct GenAI tool" | "Training/LLM tool" | "Data Science tool" | "Other"
  },
  "blogAnalysis": {
    "previousArticleTitles": ["actual article title 1", "actual article title 2", "actual article title 3"],
    "topicsTheyDiscuss": ["topic1", "topic2", "topic3"],
    "keywords": ["keyword1", "keyword2", "keyword3"],
    "technicalDepth": "beginner" | "intermediate" | "advanced",
    "writerTypes": "employees" | "freelancers" | "mixed" | "unknown"
  },
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
  ],
  "linkedInMessage": "Subject: Collaborating on Articles for {CompanyName}!\\n\\nHi {NAME},\\n\\nI'm Mostafa, a software and MLOps engineer passionate about AI and software development writing, with notable clients like Weights & Biases and Supertokens.\\n\\nI came across {CompanyName}'s blog, especially the article \\"{actual article title}\\", and I'm impressed.\\n\\nI'd love to contribute by writing AI concepts or detailed tutorials on {CompanyName}'s features. Here's an article idea made specifically for you:\\n\\n{chosen idea title from above}\\n\\nMy articles have garnered over 500,000+ views. Check out my profiles:\\nhttps://wandb.ai/mostafaibrahim17/ml-articles/reportlist\\nhttps://medium.com/@mostafaibrahim18\\n\\nI look forward to discussing more."
}

RESPOND WITH ONLY THE JSON OBJECT - NO MARKDOWN, NO CODE BLOCKS, JUST VALID JSON.`;
}
