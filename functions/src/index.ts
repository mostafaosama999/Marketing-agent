import * as admin from "firebase-admin";
import * as functions from "firebase-functions";

// Initialize Firebase Admin SDK
admin.initializeApp();

/**
 * Simple health check function for monitoring
 */
export const healthCheck = functions.https.onCall(async (_data, _context) => {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    message: "Marketing Agent Functions are running"
  };
});

/**
 * Initialize Apollo job titles in Firestore
 * Call this once to populate the shared job titles
 */
export const initApolloJobTitles = functions.https.onCall(async (_data, context) => {
  // Require authentication
  if (!context.auth) {
    throw new functions.https.HttpsError(
      "unauthenticated",
      "You must be logged in to initialize job titles"
    );
  }

  const jobTitles = [
    "CMO",
    "Chief Marketing Officer",
    "VP Marketing",
    "Director of Marketing",
    "Marketing Manager",
    "Content Manager",
    "Content Marketing Manager",
    "Editor",
    "Content editor",
    "Technical content",
    "Product manager",
    "Technical product manager",
    "SEO manager",
    "product marketing ai",
    "devrel",
    "PMM",
  ];

  try {
    const db = admin.firestore();
    const docRef = db.collection("settings").doc("apolloJobTitles");

    await docRef.set({
      titles: jobTitles,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: context.auth.uid,
    });

    functions.logger.info("Initialized Apollo job titles", {
      count: jobTitles.length,
      userId: context.auth.uid,
    });

    return {
      success: true,
      message: `Initialized ${jobTitles.length} job titles`,
      titles: jobTitles,
    };
  } catch (error) {
    functions.logger.error("Error initializing job titles", error);
    throw new functions.https.HttpsError(
      "internal",
      "Failed to initialize job titles"
    );
  }
});

// Export core functions
export {dailyWebflowSync} from "./webflow/dailySync";
export {qualifyCompanyBlog} from "./blogQualifier/qualifyBlog";
export {findWritingProgramCloud} from "./writingProgramFinder/findWritingProgram";
export {analyzeWritingProgramDetailsCloud} from "./writingProgramAnalyzer";
export {fetchApolloEmail} from "./apollo/apolloProxy";
export {enrichOrganizationCloud} from "./apollo/enrichOrganization";
export {searchPeopleCloud} from "./apollo/searchPeople";
export {apolloBulkEnrichPeople} from "./apollo/bulkEnrichPeople";
export {findCompetitorsV2} from "./competitors/findCompetitors";

// Export new profile scraper functions
export {profileScraperSync} from "./webflow/profileSync";
export {sheetsScraperSync, triggerSheetsScraper} from "./webflow/sheetsSync";
export {
  triggerProfileScraper,
  runScraperOnly,
  getCSVDownloadUrl,
  listCSVFiles,
  getScraperStatusInfo,
  runAllScrapersManual,
} from "./webflow/manualTrigger";

// Export analytics functions
export {extractLinkedInAnalytics} from "./analytics/extractLinkedInAnalytics";
export {syncGoogleAnalytics, scheduledGoogleAnalyticsSync} from "./analytics/syncGoogleAnalytics";

// Export Gmail integration functions
export {scheduledEmailSync} from "./gmail/scheduledEmailSync";
export {manualEmailSync} from "./gmail/manualEmailSync";
export {getGmailAuthUrl} from "./gmail/generateAuthUrl";
export {exchangeGmailOAuthCode} from "./gmail/exchangeOAuthCode";
export {checkGmailConnectionStatus} from "./gmail/checkGmailConnection";
export {createGmailDraftCloud} from "./gmail/createDraft";

// Export competitor content tracking functions
export {extractCompetitorPosts} from "./competitors/extractCompetitorPosts";

// Export AI trends analysis functions
export {generateAITrends} from "./aiTrends/generateAITrends";

// Export LinkedIn post generation functions
export {generateLinkedInPostAsync} from "./linkedinGeneration/generateLinkedInPostAsync";
export {getLinkedInGenerationJob} from "./linkedinGeneration/getLinkedInGenerationJob";

// Export new post ideas generation functions
export {generatePostIdeas} from "./linkedinGeneration/generatePostIdeas";
export {generatePostFromIdea} from "./linkedinGeneration/generatePostFromIdea";

// Export RAG-enhanced post ideas generation functions
export {generatePostIdeasRAG} from "./linkedinGeneration/generatePostIdeasRAG";
export {generatePostFromIdeaRAG} from "./linkedinGeneration/generatePostFromIdeaRAG";

// Export RAG indexing functions
export {indexNewsletters, indexSingleNewsletter, getRAGStatus} from "./rag/ragFunctions";

// Export Company Offer Analysis functions
export {analyzeCompanyOffer} from "./offerAnalysis/analyzeCompanyOffer";
export {analyzeCompanyWebsiteCloud} from "./offerAnalysis/analyzeCompanyWebsite";
export {generateOfferIdeasCloud} from "./offerAnalysis/generateOfferIdeas";
export {generateOfferIdeasV2Cloud} from "./offerAnalysis/v2/generateIdeasV2";

// Export V2 staged cloud functions (for progressive UI updates)
export {v2Stage1Cloud} from "./offerAnalysis/v2/stages/stage1Differentiators";
export {v2Stage2Cloud} from "./offerAnalysis/v2/stages/stage2ContentGaps";
export {v2Stage3Cloud} from "./offerAnalysis/v2/stages/stage3GenerateIdeas";
export {v2Stage4Cloud} from "./offerAnalysis/v2/stages/stage4ValidateIdeas";