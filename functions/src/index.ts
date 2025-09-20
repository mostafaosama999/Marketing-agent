import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin SDK
admin.initializeApp();

// Export all functions
export {researchCompany} from "./research/companyAnalysis";
export {discoverBlog} from "./research/blogDiscovery";
export {generateIdeas} from "./research/ideaGeneration";
export {createGoogleDoc} from "./research/docGeneration";
export {triggerResearchFlow} from "./research/orchestrator";
export {generateMarketingReport, triggerMarketingReport} from "./reports/generateReport";

// Health check function
export const healthCheck = functions.https.onCall(async (data, context) => {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
    functions: [
      "triggerResearchFlow",
      "researchCompany",
      "discoverBlog",
      "generateIdeas",
      "createGoogleDoc",
      "generateMarketingReport",
      "triggerMarketingReport",
    ],
  };
});