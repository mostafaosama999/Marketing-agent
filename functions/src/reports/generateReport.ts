import * as functions from "firebase-functions";
import {
  readSheetData,
  extractSheetId,
  analyzeProgramDistribution,
  analyzeIdeasDistribution,
  formatDistributionReport,
} from "../utils/sheetsUtils";
import {sendReportToSlack} from "../utils/slackUtils";

const SHEET_URL = "https://docs.google.com/spreadsheets/d/1vEg6LZKlHVjzzYDAHpi6-cCF3Qv7BeT2ORio4I5on_Q/edit?usp=sharing";

/**
 * Generate marketing sheet distribution report
 * This function reads the Google Sheet and analyzes distribution of:
 * - Column G (Program): "Not Yet contacted", "No Program", "Inactive", "Contacted", "Approved", "Refused"
 * - Column J (Ideas generated): "Not yet", "Generated", "Chosen", "To be redone"
 */
export const generateMarketingReport = functions.pubsub
  .schedule("0 0 */3 * *") // Run every 3 days at midnight
  .timeZone("UTC")
  .onRun(async (context) => {
    try {
      console.log("Starting marketing report generation...");

      // Extract sheet ID from URL
      const sheetId = extractSheetId(SHEET_URL);
      console.log(`Processing sheet: ${sheetId}`);

      // Read all data from the sheet
      const sheetData = await readSheetData(sheetId, "A:Z");
      console.log(`Read ${sheetData.values.length} rows from sheet`);

      if (sheetData.values.length === 0) {
        console.warn("No data found in sheet");
        return;
      }

      // Analyze distributions
      const programDistribution = analyzeProgramDistribution(sheetData.values);
      const ideasDistribution = analyzeIdeasDistribution(sheetData.values);

      // Generate formatted report
      const report = formatDistributionReport(programDistribution, ideasDistribution);

      // Send report to Slack
      console.log("🔥 ABOUT TO SEND SLACK REPORT");
      console.log("📊 Program distribution:", JSON.stringify(programDistribution));
      console.log("💡 Ideas distribution:", JSON.stringify(ideasDistribution));

      try {
        console.log("🚀 Calling sendReportToSlack function...");
        await sendReportToSlack(report, programDistribution, ideasDistribution);
        console.log("✅ Report sent to Slack channel: project-reports");
      } catch (slackError) {
        console.error("❌ SLACK ERROR:", slackError);
        console.error("❌ Slack error message:", slackError instanceof Error ? slackError.message : String(slackError));
        console.error("❌ Slack error stack:", slackError instanceof Error ? slackError.stack : 'No stack trace available');
        console.warn("⚠️ Continuing function execution despite Slack failure");
      }

      // Log the report
      console.log("=== MARKETING REPORT GENERATED ===");
      console.log(report);
      console.log("=== END REPORT ===");

      // Optional: Store report in Firestore for later retrieval
      const admin = await import("firebase-admin");
      const db = admin.firestore();

      await db.collection("reports").add({
        type: "marketing_distribution",
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        programDistribution,
        ideasDistribution,
        report,
        sheetId,
      });

      console.log("Report saved to Firestore");

      return {
        success: true,
        timestamp: new Date().toISOString(),
        programDistribution,
        ideasDistribution,
      };
    } catch (error) {
      console.error("Error generating marketing report:", error);
      throw new functions.https.HttpsError(
        "internal",
        `Failed to generate marketing report: ${error}`
      );
    }
  });

/**
 * Manual trigger for generating the report (for testing)
 */
export const triggerMarketingReport = functions.https.onCall(async (data, context) => {
  try {
    console.log("Manual marketing report trigger...");

    const sheetId = extractSheetId(SHEET_URL);
    const sheetData = await readSheetData(sheetId, "A:Z");

    if (sheetData.values.length === 0) {
      throw new functions.https.HttpsError("not-found", "No data found in sheet");
    }

    const programDistribution = analyzeProgramDistribution(sheetData.values);
    const ideasDistribution = analyzeIdeasDistribution(sheetData.values);
    const report = formatDistributionReport(programDistribution, ideasDistribution);

    // Send report to Slack for manual trigger too
    console.log("🔥 MANUAL TRIGGER: ABOUT TO SEND SLACK REPORT");
    try {
      console.log("🚀 Manual trigger: Calling sendReportToSlack function...");
      await sendReportToSlack(report, programDistribution, ideasDistribution);
      console.log("✅ Manual report sent to Slack successfully");
    } catch (slackError) {
      console.error("❌ MANUAL TRIGGER SLACK ERROR:", slackError);
      console.error("❌ Manual Slack error message:", slackError instanceof Error ? slackError.message : String(slackError));
      console.error("❌ Manual Slack error stack:", slackError instanceof Error ? slackError.stack : 'No stack trace available');
    }
    console.log("Manual report generated:", report);

    return {
      success: true,
      timestamp: new Date().toISOString(),
      programDistribution,
      ideasDistribution,
      report,
    };
  } catch (error) {
    console.error("Error in manual report trigger:", error);
    throw new functions.https.HttpsError(
      "internal",
      `Failed to generate report: ${error}`
    );
  }
});