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

// Export core functions
export {triggerResearchFlow} from "./research/orchestrator";
export {dailyWebflowSync} from "./webflow/dailySync";
export {qualifyCompanyBlog} from "./blogQualifier/qualifyBlog";
export {findWritingProgramCloud} from "./writingProgramFinder/findWritingProgram";
export {analyzeWritingProgramDetailsCloud} from "./writingProgramAnalyzer";
export {generateGenAIBlogIdeas} from "./genAIIdeaGenerator/generateGenAIBlogIdeas";
export {getLeadIdeas, updateIdeaStatus} from "./ideaGenerator/generateIdeas";
export {fetchApolloEmail} from "./apollo/apolloProxy";
export {enrichOrganizationCloud} from "./apollo/enrichOrganization";
export {searchPeopleCloud} from "./apollo/searchPeople";
export {findCompetitors} from "./competitors/findCompetitors";

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

// Export competitor content tracking functions
export {extractCompetitorPosts} from "./competitors/extractCompetitorPosts";

// Export AI trends analysis functions
export {generateAITrends} from "./aiTrends/generateAITrends";