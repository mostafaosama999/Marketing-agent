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
export {generateMarketingReport, scheduledMarketingReport} from "./reports/generateReport";
export {dailyWebflowSync} from "./webflow/dailySync";
export {qualifyCompanyBlog} from "./blogQualifier/qualifyBlog";
export {findWritingProgramCloud} from "./writingProgramFinder/findWritingProgram";
export {generateCustomIdeasCloud, getLeadIdeas, updateIdeaStatus} from "./ideaGenerator/generateIdeas";
export {fetchEmailCloud} from "./apollo/apolloProxy";