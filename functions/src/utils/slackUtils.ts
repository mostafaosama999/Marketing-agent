import {WebClient} from "@slack/web-api";
import * as functions from "firebase-functions";

// Slack configuration from Firebase Functions config
const SLACK_TOKEN = functions.config().slack?.bot_token;
const SLACK_CHANNEL = functions.config().slack?.channel || "project-reports";
const HIRING_CHANNEL = functions.config().slack?.hiring_channel || "hiring";

/**
 * Initialize Slack Web API client
 */
function getSlackClient(): WebClient {
  if (!SLACK_TOKEN) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Slack bot token not configured. Please set slack.bot_token in Firebase Functions config."
    );
  }
  return new WebClient(SLACK_TOKEN);
}

/**
 * Send a formatted message to Slack channel using Web API
 */
export async function sendSlackMessage(message: string): Promise<void> {
  try {
    console.log("🔧 Initializing Slack client...");
    console.log("🔑 Using Slack token:", SLACK_TOKEN ? SLACK_TOKEN.substring(0, 10) + "..." : "NOT SET");
    console.log("📺 Target channel:", SLACK_CHANNEL);

    const slack = getSlackClient();

    console.log(`📤 Sending message to Slack channel: ${SLACK_CHANNEL}`);
    console.log("📄 Message preview:", message.substring(0, 200) + "...");

    const result = await slack.chat.postMessage({
      channel: SLACK_CHANNEL,
      text: message,
      username: "Marketing Report Bot",
      icon_emoji: ":chart_with_upwards_trend:",
    });

    console.log("📋 Slack API result:", JSON.stringify(result, null, 2));

    if (result.ok) {
      console.log(`✅ Message sent successfully to Slack channel: ${SLACK_CHANNEL}`);
      console.log("⏰ Message timestamp:", result.ts);
    } else {
      console.error("❌ Slack API returned error:", result.error);
      console.error("❌ Full result object:", JSON.stringify(result, null, 2));
      throw new Error(`Slack API error: ${result.error}`);
    }
  } catch (error) {
    console.error("❌ CRITICAL: Error sending Slack message:", error);
    console.error("❌ Error name:", error instanceof Error ? error.name : 'Unknown');
    console.error("❌ Error message:", error instanceof Error ? error.message : String(error));
    console.error("❌ Error stack:", error instanceof Error ? error.stack : 'No stack trace');
    if (error && typeof error === 'object' && 'data' in error) {
      console.error("❌ Slack API error data:", JSON.stringify((error as any).data, null, 2));
    }
    if (error && typeof error === 'object' && 'code' in error) {
      console.error("❌ Error code:", (error as any).code);
    }
    // Re-throw so we can catch it in the calling function
    throw error;
  }
}

/**
 * Send a message to a specific Slack channel
 */
export async function sendSlackMessageToChannel(
  channel: string,
  message: string,
  username = "Marketing Report Bot",
  iconEmoji = ":chart_with_upwards_trend:"
): Promise<void> {
  const slack = getSlackClient();
  const result = await slack.chat.postMessage({
    channel,
    text: message,
    username,
    icon_emoji: iconEmoji,
  });
  if (!result.ok) {
    throw new Error(`Slack API error: ${result.error}`);
  }
}

/**
 * Send a message to the hiring Slack channel
 */
export async function sendHiringSlackMessage(message: string): Promise<void> {
  await sendSlackMessageToChannel(HIRING_CHANNEL, message, "Hiring Bot", ":briefcase:");
}

/**
 * Send a formatted report to Slack using Web API with rich formatting
 */
export async function sendReportToSlack(
  report: string,
  programDist: any,
  ideasDist: any
): Promise<void> {
  try {
    console.log("🚀 ENTERED sendReportToSlack function");
    console.log("📊 Received programDist:", JSON.stringify(programDist));
    console.log("💡 Received ideasDist:", JSON.stringify(ideasDist));
    console.log("📄 Report length:", report.length);

    console.log("🔧 Creating Slack client...");
    const slack = getSlackClient();
    console.log("✅ Slack client created successfully");

    // Create Slack blocks for rich formatting
    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: "📊 Marketing Sheet Report",
          emoji: true,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `Generated: ${new Date().toISOString()}`,
          },
        ],
      },
      {
        type: "divider",
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*📋 Program Status Distribution (Column G)*",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Total entries: *${programDist.total}*\n` +
            `• Not Yet contacted: ${programDist["Not Yet contacted"]} (${((programDist["Not Yet contacted"] / programDist.total) * 100).toFixed(1)}%)\n` +
            `• No Program: ${programDist["No Program"]} (${((programDist["No Program"] / programDist.total) * 100).toFixed(1)}%)\n` +
            `• Inactive: ${programDist["Inactive"]} (${((programDist["Inactive"] / programDist.total) * 100).toFixed(1)}%)\n` +
            `• Contacted: ${programDist["Contacted"]} (${((programDist["Contacted"] / programDist.total) * 100).toFixed(1)}%)\n` +
            `• Approved: ${programDist["Approved"]} (${((programDist["Approved"] / programDist.total) * 100).toFixed(1)}%)\n` +
            `• Refused: ${programDist["Refused"]} (${((programDist["Refused"] / programDist.total) * 100).toFixed(1)}%)`,
        },
      },
      {
        type: "divider",
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: "*💡 Ideas Generated Distribution (Column J)*",
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `Total entries: *${ideasDist.total}*\n` +
            `• Not yet: ${ideasDist["Not yet"]} (${((ideasDist["Not yet"] / ideasDist.total) * 100).toFixed(1)}%)\n` +
            `• Generated: ${ideasDist["Generated"]} (${((ideasDist["Generated"] / ideasDist.total) * 100).toFixed(1)}%)\n` +
            `• Chosen: ${ideasDist["Chosen"]} (${((ideasDist["Chosen"] / ideasDist.total) * 100).toFixed(1)}%)\n` +
            `• To be redone: ${ideasDist["To be redone"]} (${((ideasDist["To be redone"] / ideasDist.total) * 100).toFixed(1)}%)`,
        },
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: "🤖 Generated automatically every 3 days",
          },
        ],
      },
    ];

    console.log("📤 Sending formatted report to Slack with blocks...");

    const result = await slack.chat.postMessage({
      channel: SLACK_CHANNEL,
      blocks: blocks,
      text: "Marketing Sheet Report", // Fallback text for notifications
      username: "Marketing Report Bot",
      icon_emoji: ":chart_with_upwards_trend:",
    });

    if (result.ok) {
      console.log(`✅ Formatted report sent successfully to Slack channel: ${SLACK_CHANNEL}`);
      console.log("Message timestamp:", result.ts);
    } else {
      console.error("❌ Slack API returned error:", result.error);
      console.log("📄 Falling back to simple text message...");
      // Fallback to simple text message
      await sendSlackMessage(report);
    }
  } catch (error) {
    console.error("❌ Error sending formatted report to Slack:", error);
    console.error("Error details:", error instanceof Error ? error.message : String(error));
    if (error && typeof error === 'object' && 'data' in error) {
      console.error("Slack API error data:", (error as any).data);
    }

    console.log("📄 Attempting fallback to simple text message...");
    try {
      await sendSlackMessage(report);
    } catch (fallbackError) {
      console.error("❌ Fallback also failed:", fallbackError);
    }
  }
}