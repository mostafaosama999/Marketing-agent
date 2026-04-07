import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import OpenAI from "openai";
import {logApiCost, calculateCost, extractTokenUsage} from "../utils/costTracker";

const SCORING_SYSTEM_PROMPT = `You are a hiring evaluator for CodeContent, a developer-first technical content agency hiring Software Engineers (Technical Content) based in Cairo, Egypt. Salary: 20,000-30,000 EGP/month.

Score the applicant on a 0-10 scale using these 5 dimensions:

**Dimension 1: Location & University Fit (0-2)**
- 0: Non-Cairo/non-Alexandria location OR no recognized university
- 1: Cairo/Giza/Alexandria but lesser-known institution
- 2: Cairo/Alexandria + CS/Engineering from preferred universities (Cairo University, Ain Shams, GUC, AUC, BUE, Future University, Nile University, MSA, Alexandria University, Arab Academy, El Shorouk Academy)

**Dimension 2: Engineering Experience & Technical Depth (0-3)**
- 0: No engineering experience, only coursework
- 0.5: Projects but no real work; internships at unknown companies
- 1.0: 1 year real experience, specific projects/frameworks
- 1.5: 1-2 years at recognized company, architecture details
- 2.0: Solid 1-2 years, exact projects/stacks, production experience
- 2.5: Strong LLM/AI experience (RAG, agents, embeddings)
- 3.0: Exceptional production AI/LLM systems, architecture decisions

Over-qualified check: 3+ years at top-tier companies (Instabug, Swvl, Vodafone, Valeo, Si-Ware, FAANG-adjacent) = flag as over-qualified but score normally.

**Dimension 3: Answer Quality & Effort (0-2)**
- 0: Multiple blank/single-character/single-word answers
- 0.5: Brief (<30 words), generic, or copy-pasted
- 1.0: Multi-sentence with specific details
- 1.5: Thoughtful, specific, genuine reflection
- 2.0: Detailed, well-structured, clearly engaged

**Dimension 4: Writing & Communication (0-1.5)**
- 0: Poor English, cannot articulate ideas
- 0.5: Passable but generic
- 1.0: Clear, well-structured, can explain concepts
- 1.5: Excellent + evidence of teaching instinct (TA, mentoring, published content)

**Dimension 5: Authenticity & Role Fit (0-1.5)**
- 0: AI-generated application OR fundamentally misunderstands role
- 0.5: Generic motivation, appears genuine
- 1.0: Authentic voice, specific reasons, understands engineering+writing role
- 1.5: Personal anecdotes, passion for teaching, aligned career goals

**AI-Generated Detection** (flag if 3+ signals):
- Bio starts with "I'm interested in this role because it combines two things I genuinely enjoy"
- Career goals follow "In the next 1-3 years, I aim to..."
- Multiple "Furthermore/Moreover/Additionally" transitions
- Restates job description back
- Unnaturally balanced structure
- Perfect 3-example lists throughout

**Bonus Signals** (+0.5 each, max +1.0):
- Teaching/TA/mentoring experience
- Published technical content with links
- Specific LLM/AI framework with implementation details
- Active LinkedIn with technical content

**Instant Reject Triggers** (cap score 0-1):
- 3+ questions with single characters/words
- Non-Cairo/Alexandria with no recognized university
- Non-technical background, no engineering skills
- Bio or Role Fit answer under 15 words

**Tiers**: 8-10 ADVANCE, 5-7 REVIEW, 3-4 HOLD, 0-2 REJECT

Return a JSON object with exactly these fields:
{
  "total": <number 0-10>,
  "dimensions": {
    "locationUniversityFit": <0-2>,
    "engineeringExperience": <0-3>,
    "answerQuality": <0-2>,
    "writingCommunication": <0-1.5>,
    "authenticityRoleFit": <0-1.5>,
    "bonusSignals": <0-1>
  },
  "tier": "ADVANCE" | "REVIEW" | "HOLD" | "REJECT",
  "reasoning": "<3-5 bullet points as a single string>",
  "redFlags": ["<flag1>", ...],
  "strengths": ["<strength1>", ...],
  "overQualified": <boolean>,
  "instantReject": <boolean>
}`;

export const scoreApplicantOnCreate = functions
  .runWith({timeoutSeconds: 60, memory: "256MB"})
  .firestore.document("applicants/{applicantId}")
  .onCreate(async (snap) => {
    const data = snap.data();
    const applicantId = snap.id;

    // Skip if already scored
    if (data.aiScore) {
      console.log(`Applicant ${applicantId} already has aiScore, skipping`);
      return;
    }

    const openaiApiKey = functions.config().openai?.key || process.env.OPENAI_API_KEY;
    if (!openaiApiKey) {
      console.error("OpenAI API key not configured, skipping AI scoring");
      return;
    }

    try {
      const openai = new OpenAI({apiKey: openaiApiKey});

      // Format applicant data for scoring
      const formAnswersText = data.formAnswers
        ? Object.entries(data.formAnswers)
          .map(([q, a]) => `Q: ${q}\nA: ${a}`)
          .join("\n\n")
        : "No form answers provided";

      const userPrompt = `Score this applicant:

Name: ${data.name || "Not provided"}
Email: ${data.email || "Not provided"}
Education: ${data.education || "Not provided"}
Age: ${data.age || "Not provided"}
Sex: ${data.sex || "Not provided"}
Availability: ${data.availability || "Not provided"}
LinkedIn: ${data.linkedInUrl || "Not provided"}
Bio: ${data.bio || "Not provided"}

Form Answers:
${formAnswersText}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {role: "system", content: SCORING_SYSTEM_PROMPT},
          {role: "user", content: userPrompt},
        ],
        temperature: 0.1,
        max_tokens: 800,
        response_format: {type: "json_object"},
      });

      // Log cost
      const tokenUsage = extractTokenUsage(completion);
      if (tokenUsage) {
        const costInfo = calculateCost(tokenUsage, "gpt-4o-mini");
        await logApiCost("system-ai-scorer", "applicant-ai-score", costInfo, {
          operationDetails: {applicantId, applicantName: data.name},
        });
      }

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        console.error(`No AI response for applicant ${applicantId}`);
        return;
      }

      const result = JSON.parse(content);

      const aiScore = {
        total: Math.min(10, Math.max(0, result.total)),
        dimensions: {
          locationUniversityFit: result.dimensions?.locationUniversityFit ?? 0,
          engineeringExperience: result.dimensions?.engineeringExperience ?? 0,
          answerQuality: result.dimensions?.answerQuality ?? 0,
          writingCommunication: result.dimensions?.writingCommunication ?? 0,
          authenticityRoleFit: result.dimensions?.authenticityRoleFit ?? 0,
          bonusSignals: result.dimensions?.bonusSignals ?? 0,
        },
        tier: result.tier || "REJECT",
        reasoning: result.reasoning || "",
        redFlags: result.redFlags || [],
        strengths: result.strengths || [],
        overQualified: result.overQualified || false,
        instantReject: result.instantReject || false,
        scoredAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await snap.ref.update({
        aiScore,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`AI scored applicant ${applicantId}: ${aiScore.total}/10 (${aiScore.tier})`);
    } catch (error: any) {
      console.error(`Failed to AI-score applicant ${applicantId}:`, error.message || error);
      // Don't throw — the applicant is still created, just without AI score
    }
  });
