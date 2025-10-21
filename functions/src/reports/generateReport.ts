import * as functions from "firebase-functions";
import {FieldValue} from "firebase-admin/firestore";
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
 * Core report generation logic
 */
async function performReportGeneration(triggerType: 'scheduled' | 'manual' = 'scheduled'): Promise<any> {
  try {
    console.log(`Starting ${triggerType} marketing report generation...`);

    // Extract sheet ID from URL
    const sheetId = extractSheetId(SHEET_URL);
    console.log(`Processing sheet: ${sheetId}`);

    // Read all data from the sheet
    const sheetData = await readSheetData(sheetId, "A:Z");
    console.log(`Read ${sheetData.values.length} rows from sheet`);

    if (sheetData.values.length === 0) {
      console.warn("No data found in sheet");
      if (triggerType === 'manual') {
        throw new functions.https.HttpsError("not-found", "No data found in sheet");
      }
      return;
    }

    // Analyze distributions
    const programDistribution = analyzeProgramDistribution(sheetData.values);
    const ideasDistribution = analyzeIdeasDistribution(sheetData.values);

    // Generate formatted report
    const report = formatDistributionReport(programDistribution, ideasDistribution);

    // Send report to Slack
    console.log(`🔥 ${triggerType.toUpperCase()}: ABOUT TO SEND SLACK REPORT`);
    console.log("📊 Program distribution:", JSON.stringify(programDistribution));
    console.log("💡 Ideas distribution:", JSON.stringify(ideasDistribution));

    try {
      console.log(`🚀 ${triggerType}: Calling sendReportToSlack function...`);
      await sendReportToSlack(report, programDistribution, ideasDistribution);
      console.log(`✅ ${triggerType} report sent to Slack channel: marketing-reports`);
    } catch (slackError) {
      console.error(`❌ ${triggerType.toUpperCase()} SLACK ERROR:`, slackError);
      console.error("❌ Slack error message:", slackError instanceof Error ? slackError.message : String(slackError));
      console.error("❌ Slack error stack:", slackError instanceof Error ? slackError.stack : 'No stack trace available');
      if (triggerType === 'scheduled') {
        console.warn("⚠️ Continuing function execution despite Slack failure");
      }
    }

    // Log the report
    console.log("=== MARKETING REPORT GENERATED ===");
    console.log(report);
    console.log("=== END REPORT ===");

    // Store report in Firestore for later retrieval
    const admin = await import("firebase-admin");
    const db = admin.firestore();

    await db.collection("reports").add({
      type: "marketing_distribution",
      timestamp: FieldValue.serverTimestamp(),
      triggerType,
      programDistribution,
      ideasDistribution,
      report,
      sheetId,
    });

    console.log("Report saved to Firestore");

    return {
      success: true,
      timestamp: new Date().toISOString(),
      triggerType,
      programDistribution,
      ideasDistribution,
      report: triggerType === 'manual' ? report : undefined, // Include report in manual response
    };
  } catch (error) {
    console.error(`Error generating ${triggerType} marketing report:`, error);
    throw new functions.https.HttpsError(
      "internal",
      `Failed to generate marketing report: ${error}`
    );
  }
}

/**
 * Generate marketing sheet distribution report (Scheduled)
 * This function reads the Google Sheet and analyzes distribution of:
 * - Column G (Program): "Not Yet contacted", "No Program", "Inactive", "Contacted", "Approved", "Refused"
 * - Column J (Ideas generated): "Not yet", "Generated", "Chosen", "To be redone"
 *
 * Runs every 3 days at midnight UTC
 * Manual triggers can be done by calling this function with { manual: true } data
 */
export const generateMarketingReport = functions
  .runWith({ timeoutSeconds: 540 })
  .https.onCall(async (data, context) => {
    const isManual = data?.manual === true;
    const triggerType = isManual ? 'manual' : 'scheduled';

    console.log(`🧪 ${triggerType.toUpperCase()} MARKETING REPORT TRIGGERED`);
    if (isManual) {
      console.log(`👤 Triggered by: ${context.auth?.uid || 'anonymous'}`);
    }
    console.log(`⏰ Triggered at: ${new Date().toISOString()}`);

    try {
      const result = await performReportGeneration(triggerType);
      console.log(`✅ ${triggerType} report generation completed successfully`);
      return result;
    } catch (error) {
      console.error(`❌ ${triggerType} report generation failed:`, error);
      throw error;
    }
  });

// Keep scheduled version as well
export const scheduledMarketingReport = functions.pubsub
  .schedule("0 0 */3 * *") // Run every 3 days at midnight
  .timeZone("UTC")
  .onRun(async (context) => {
    console.log("📅 SCHEDULED MARKETING REPORT TRIGGERED VIA CRON");
    console.log(`⏰ Triggered at: ${new Date().toISOString()}`);

    try {
      const result = await performReportGeneration('scheduled');
      console.log("✅ Scheduled report generation completed successfully");
      return result;
    } catch (error) {
      console.error("❌ Scheduled report generation failed:", error);
      throw error;
    }
  });