import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";

const openai = new OpenAI({
  apiKey: functions.config().openai?.key || process.env.OPENAI_API_KEY,
});

interface OrganizerResearch {
  organizerName: string;
  summary: string;
  credibility: {
    score: "high" | "medium" | "low" | "unknown";
    reasoning: string;
    yearsActive?: number;
    pastEditions?: number;
  };
  reputation: {
    rating: "excellent" | "good" | "mixed" | "poor" | "unknown";
    highlights: string[];
    concerns: string[];
  };
  relevanceToCodeContent: {
    score: "high" | "medium" | "low";
    reasoning: string;
    targetAudience: string;
  };
  notableSpeakers?: string[];
  typicalAttendeeProfile?: string;
  socialPresence: {
    website?: string;
    linkedin?: string;
    twitter?: string;
    followersEstimate?: string;
  };
  researchedAt: string;
  sources: string[];
}

interface ResearchRequest {
  eventId: string;
  eventName: string;
  organizerName?: string;
  eventWebsite?: string;
  eventType: string;
  eventCategory: "client" | "educational";
}

/**
 * Scrape a URL and extract its main text content.
 * Returns empty string on failure (non-throwing).
 */
async function scrapeUrl(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: {"User-Agent": USER_AGENT},
      maxRedirects: 3,
    });
    const $ = cheerio.load(response.data);
    $("script, style, nav, footer, header, iframe, noscript").remove();

    // Try main content areas first
    let content = $("article, main, [role='main']").text().trim();
    if (!content || content.length < 100) {
      content = $("body").text().trim();
    }

    // Collapse whitespace
    content = content.replace(/\s+/g, " ");
    return content.substring(0, 8000);
  } catch (error) {
    functions.logger.warn(`Failed to scrape ${url}`, {error});
    return "";
  }
}

/**
 * Scrape the event website and common sub-pages.
 */
async function scrapeEventWebsite(
  eventWebsite: string
): Promise<{content: string; scrapedUrls: string[]}> {
  const baseUrl = eventWebsite.replace(/\/+$/, "");
  const pagesToScrape = [
    baseUrl,
    `${baseUrl}/about`,
    `${baseUrl}/speakers`,
    `${baseUrl}/sponsors`,
  ];

  const scrapedUrls: string[] = [];
  const contentParts: string[] = [];

  const results = await Promise.allSettled(
    pagesToScrape.map(async (url) => {
      const text = await scrapeUrl(url);
      return {url, text};
    })
  );

  for (const result of results) {
    if (result.status === "fulfilled" && result.value.text) {
      scrapedUrls.push(result.value.url);
      contentParts.push(
        `--- Content from ${result.value.url} ---\n${result.value.text}`
      );
    }
  }

  return {
    content: contentParts.join("\n\n"),
    scrapedUrls,
  };
}

const SYSTEM_PROMPT = `You are a research analyst evaluating event organizers for CodeContent.

CodeContent is a technical content agency specializing in developer-focused content (blog posts, tutorials, documentation) for B2B SaaS and devtools companies. The founder, Mostafa Ibrahim, attends events to network with potential clients (VP Engineering, DevRel, CMO at devtools companies) and learn about agency growth.

Analyze the provided information about an event and its organizer. Produce a structured JSON research report.

Your response MUST be valid JSON matching this exact structure:
{
  "organizerName": "string - the organizer's name",
  "summary": "string - 2-3 sentence summary of the organizer and event",
  "credibility": {
    "score": "high | medium | low | unknown",
    "reasoning": "string - why this score",
    "yearsActive": "number or null - how many years they've been active",
    "pastEditions": "number or null - how many past editions of this event"
  },
  "reputation": {
    "rating": "excellent | good | mixed | poor | unknown",
    "highlights": ["string array - positive aspects"],
    "concerns": ["string array - any concerns or red flags"]
  },
  "relevanceToCodeContent": {
    "score": "high | medium | low",
    "reasoning": "string - why this relevance score for CodeContent specifically",
    "targetAudience": "string - who typically attends this event"
  },
  "notableSpeakers": ["string array - notable speakers if found"],
  "typicalAttendeeProfile": "string - description of typical attendees",
  "socialPresence": {
    "website": "string or null",
    "linkedin": "string or null",
    "twitter": "string or null",
    "followersEstimate": "string or null - rough estimate"
  }
}

Guidelines:
- Be honest about uncertainty. If you can't find information, use "unknown" scores rather than guessing.
- For relevanceToCodeContent, consider: Does this event attract devtools/B2B SaaS companies? Would VP Engineering, DevRel, or CMO roles attend? Is this a developer or marketing focused event?
- For credibility, look for: years of operation, past editions, known sponsors, speaker quality.
- For reputation, look for: attendee feedback, industry recognition, speaker caliber.
- If limited information is available, still provide your best assessment but note the limitations in the reasoning fields.`;

/**
 * Core research logic — shared by the callable and the onCreate trigger.
 */
async function runResearch(params: {
  eventId: string;
  eventName: string;
  organizerName?: string;
  eventWebsite?: string;
  eventType: string;
  eventCategory: string;
}): Promise<OrganizerResearch> {
  const {eventId, eventName, organizerName, eventWebsite, eventType, eventCategory} = params;

  functions.logger.info("Starting organizer research", {
    eventId,
    eventName,
    organizerName,
    eventWebsite,
    eventType,
    eventCategory,
  });

  // Step 1: Scrape the event website (if provided)
  let scrapedContent = "";
  let scrapedUrls: string[] = [];

  if (eventWebsite) {
    try {
      const scrapeResult = await scrapeEventWebsite(eventWebsite);
      scrapedContent = scrapeResult.content;
      scrapedUrls = scrapeResult.scrapedUrls;
      functions.logger.info("Scraping complete", {
        scrapedUrls,
        contentLength: scrapedContent.length,
      });
    } catch (error) {
      functions.logger.warn("Scraping failed, continuing with event name only", {error});
    }
  }

  // Step 2: Build the user prompt
  let userPrompt = `Research the following event and its organizer:\n\n`;
  userPrompt += `Event Name: ${eventName}\n`;
  userPrompt += `Event Type: ${eventType}\n`;
  userPrompt += `Event Category: ${eventCategory}\n`;

  if (organizerName) {
    userPrompt += `Organizer Name: ${organizerName}\n`;
  }

  if (eventWebsite) {
    userPrompt += `Event Website: ${eventWebsite}\n`;
  }

  if (scrapedContent) {
    userPrompt += `\n--- Scraped Website Content ---\n${scrapedContent}\n--- End of Scraped Content ---\n`;
  } else {
    userPrompt += `\nNo website content was available. Please provide your best assessment based on the event name and any knowledge you have.\n`;
  }

  userPrompt += `\nProvide your research as a JSON object.`;

  // Step 3: Call OpenAI
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {role: "system", content: SYSTEM_PROMPT},
      {role: "user", content: userPrompt},
    ],
    response_format: {type: "json_object"},
    temperature: 0.3,
    max_tokens: 2000,
  });

  const responseText = completion.choices[0]?.message?.content;

  if (!responseText) {
    throw new Error("Empty response from OpenAI");
  }

  const parsed = JSON.parse(responseText);

  const research: OrganizerResearch = {
    organizerName: parsed.organizerName || organizerName || "Unknown",
    summary: parsed.summary || "",
    credibility: {
      score: parsed.credibility?.score || "unknown",
      reasoning: parsed.credibility?.reasoning || "",
      yearsActive: parsed.credibility?.yearsActive || undefined,
      pastEditions: parsed.credibility?.pastEditions || undefined,
    },
    reputation: {
      rating: parsed.reputation?.rating || "unknown",
      highlights: parsed.reputation?.highlights || [],
      concerns: parsed.reputation?.concerns || [],
    },
    relevanceToCodeContent: {
      score: parsed.relevanceToCodeContent?.score || "low",
      reasoning: parsed.relevanceToCodeContent?.reasoning || "",
      targetAudience: parsed.relevanceToCodeContent?.targetAudience || "",
    },
    notableSpeakers: parsed.notableSpeakers || [],
    typicalAttendeeProfile: parsed.typicalAttendeeProfile || "",
    socialPresence: {
      website: parsed.socialPresence?.website || eventWebsite || undefined,
      linkedin: parsed.socialPresence?.linkedin || undefined,
      twitter: parsed.socialPresence?.twitter || undefined,
      followersEstimate: parsed.socialPresence?.followersEstimate || undefined,
    },
    researchedAt: new Date().toISOString(),
    sources: scrapedUrls.length > 0 ? scrapedUrls : ["OpenAI knowledge base"],
  };

  functions.logger.info("OpenAI analysis complete", {
    eventId,
    credibilityScore: research.credibility.score,
    relevanceScore: research.relevanceToCodeContent.score,
  });

  // Save to Firestore
  await admin
    .firestore()
    .collection("events")
    .doc(eventId)
    .update({
      organizerResearch: research,
      updatedAt: new Date().toISOString(),
    });

  functions.logger.info("Research saved to Firestore", {eventId});

  return research;
}

/**
 * Callable Cloud Function — triggered manually from the UI.
 */
export const researchEventOrganizer = functions
  .runWith({timeoutSeconds: 120, memory: "512MB"})
  .https.onCall(async (data: ResearchRequest, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "Authentication required"
      );
    }

    const {eventId, eventName, eventType, eventCategory} = data;

    if (!eventId || !eventName) {
      throw new functions.https.HttpsError(
        "invalid-argument",
        "eventId and eventName are required"
      );
    }

    try {
      return await runResearch({
        eventId,
        eventName,
        organizerName: data.organizerName,
        eventWebsite: data.eventWebsite,
        eventType: eventType || "conference",
        eventCategory: eventCategory || "client",
      });
    } catch (error) {
      functions.logger.error("Organizer research failed", {eventId, error});
      throw new functions.https.HttpsError(
        "internal",
        "Failed to research event organizer. Please try again."
      );
    }
  });

/**
 * Firestore onCreate trigger — automatically researches the organizer
 * whenever a new event is created.
 */
export const onEventCreatedResearchOrganizer = functions
  .runWith({timeoutSeconds: 120, memory: "512MB"})
  .firestore.document("events/{eventId}")
  .onCreate(async (snapshot, context) => {
    const eventId = context.params.eventId;
    const data = snapshot.data();

    if (!data || !data.name) {
      functions.logger.warn("New event missing name, skipping research", {eventId});
      return;
    }

    // Skip if research already exists (e.g. imported with research)
    if (data.organizerResearch) {
      functions.logger.info("Event already has research, skipping", {eventId});
      return;
    }

    functions.logger.info("Auto-researching organizer for new event", {
      eventId,
      eventName: data.name,
    });

    try {
      await runResearch({
        eventId,
        eventName: data.name,
        organizerName: data.organiser || undefined,
        eventWebsite: data.website || undefined,
        eventType: data.eventType || "conference",
        eventCategory: data.category || "client",
      });
    } catch (error) {
      // Don't throw — onCreate triggers shouldn't retry on transient failures
      functions.logger.error("Auto-research failed for new event", {eventId, error});
    }
  });
