import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import OpenAI from "openai";
import {logApiCost, calculateCost, extractTokenUsage} from "../utils/costTracker";

// Approved universities — exactly the 13 the user specified.
// Uses ONE boundary-aware regex so short acronyms (auc, bue, aast, msa)
// don't false-positive inside English words like "breakfast", "debug",
// "prestigious", "I must", etc.
const APPROVED_UNIVERSITY_REGEX = new RegExp(
  [
    // Short acronyms — require word boundaries
    "\\b(auc|guc|bue|aast|aastmt|fcai)\\b",
    // AUC / American University in Cairo
    "american university (in|,) cairo",
    // Zewail
    "zewail",
    // Cairo University / FCAI
    "cairo univ(ersity)?",
    "ciro university",
    "faculty of computers and (artificial intelligence|information)",
    // GUC
    "german university in cairo",
    // GIU — full name only ("giu" too collision-prone)
    "german international university",
    // Ain Shams
    "ain[\\s-]?shams",
    // AASTMT / Arab Academy
    "arab academy( for science)?",
    // BUE
    "british university in egypt",
    // MSA
    "\\bmsa\\b",
    "modern sciences? and arts",
    // CIC — full name only
    "canadian international college",
    // Nile
    "nile university",
    // Alexandria (accept typo "alexandra" as well)
    "alexandri?a univ(ersity)?",
    // MUST — "must" alone is unsafe, require disambiguators
    "misr university for science",
    "\\bmust university\\b",
  ].join("|"),
  "i"
);

function isApprovedUniversity(education: string): boolean {
  if (!education) return false;
  return APPROVED_UNIVERSITY_REGEX.test(education);
}

function isFemale(sex: string): boolean {
  if (!sex) return false;
  return sex.toLowerCase() === "female";
}

const SCORING_SYSTEM_PROMPT = `You are a hiring evaluator for CodeContent, a developer-first technical content agency hiring Software Engineers (Technical Content) based in Cairo, Egypt. Salary: 20,000-30,000 EGP/month.

Score the applicant on a 0-10 scale using these 5 dimensions:

**Dimension 1: Location & University Fit (0-2)**
- 0: Non-Cairo/non-Alexandria location OR no recognized university
- 1: Cairo/Giza/Alexandria but lesser-known institution
- 2: Cairo/Alexandria + CS/Engineering from preferred universities (AUC, Zewail City, Cairo University / FCAI, GUC, GIU, Ain Shams, AASTMT / Arab Academy, BUE, MSA / Modern Sciences and Arts, CIC / Canadian International College, Nile University, Alexandria University, MUST / Misr University for Science and Technology)

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

    // Pre-screen: reject if not from approved university or if female
    const education = (data.education || "").trim();
    const sex = (data.sex || "").trim();

    if (!isApprovedUniversity(education) || isFemale(sex)) {
      const reasons: string[] = [];
      if (!isApprovedUniversity(education)) {
        reasons.push(`University not in approved list: "${education || "not provided"}"`);
      }
      if (isFemale(sex)) {
        reasons.push("Female candidate — not matching current hiring criteria");
      }

      const aiScore = {
        total: 0,
        dimensions: {
          locationUniversityFit: 0,
          engineeringExperience: 0,
          answerQuality: 0,
          writingCommunication: 0,
          authenticityRoleFit: 0,
          bonusSignals: 0,
        },
        tier: "REJECT" as const,
        reasoning: reasons.join(". "),
        redFlags: reasons,
        strengths: [] as string[],
        overQualified: false,
        instantReject: true,
        scoredAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await snap.ref.update({
        aiScore,
        status: "ai_rejected",
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      console.log(`Pre-screened applicant ${applicantId}: 0/10 (REJECT) → ai_rejected — ${reasons.join("; ")}`);
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

      const VALID_TIERS = ["ADVANCE", "REVIEW", "HOLD", "REJECT"] as const;
      const safeTier = VALID_TIERS.includes(result.tier) ? result.tier : "REVIEW";

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
        tier: safeTier,
        reasoning: result.reasoning || "",
        redFlags: result.redFlags || [],
        strengths: result.strengths || [],
        overQualified: result.overQualified || false,
        instantReject: result.instantReject || false,
        scoredAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const update: Record<string, unknown> = {
        aiScore,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (safeTier === "REJECT") update.status = "ai_rejected";
      await snap.ref.update(update);

      console.log(`AI scored applicant ${applicantId}: ${aiScore.total}/10 (${aiScore.tier})${safeTier === "REJECT" ? " → ai_rejected" : ""}`);
    } catch (error: any) {
      console.error(`Failed to AI-score applicant ${applicantId}:`, error.message || error);
      // Don't throw — the applicant is still created, just without AI score
    }
  });
