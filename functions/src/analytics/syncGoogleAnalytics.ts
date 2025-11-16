// functions/src/analytics/syncGoogleAnalytics.ts
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { BetaAnalyticsDataClient } from "@google-analytics/data";

interface GAMetricsData {
  date: string;
  sessions: number;
  users: number;
  newUsers: number;
  pageviews: number;
  avgSessionDuration: number;
  bounceRate: number;
}

interface GATrafficSourceData {
  date: string;
  source: string;
  sessions: number;
  users: number;
  newUsers: number;
}

/**
 * Helper function to initialize GA4 client with service account credentials
 */
async function initializeGA4Client(): Promise<BetaAnalyticsDataClient> {
  // Get service account credentials from Firebase config or environment
  const serviceAccountJson = functions.config().ga4?.service_account || process.env.GA4_SERVICE_ACCOUNT;

  if (!serviceAccountJson) {
    throw new functions.https.HttpsError(
      "failed-precondition",
      "GA4 service account credentials not configured"
    );
  }

  let credentials;
  try {
    // Parse JSON string to object
    credentials = typeof serviceAccountJson === 'string'
      ? JSON.parse(serviceAccountJson)
      : serviceAccountJson;
  } catch (error) {
    console.error("Failed to parse GA4 service account JSON:", error);
    throw new functions.https.HttpsError(
      "failed-precondition",
      "Invalid GA4 service account JSON format"
    );
  }

  // Initialize client with credentials
  const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
      client_email: credentials.client_email,
      private_key: credentials.private_key,
    },
  });

  return analyticsDataClient;
}

/**
 * Fetch GA4 metrics for a date range
 */
async function fetchGA4Metrics(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<GAMetricsData[]> {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate,
        endDate,
      },
    ],
    dimensions: [
      {
        name: 'date',
      },
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
    ],
  });

  const metricsData: GAMetricsData[] = [];

  if (response.rows) {
    for (const row of response.rows) {
      const dateValue = row.dimensionValues?.[0]?.value || '';
      const date = `${dateValue.substring(0, 4)}-${dateValue.substring(4, 6)}-${dateValue.substring(6, 8)}`;

      metricsData.push({
        date,
        sessions: parseInt(row.metricValues?.[0]?.value || '0'),
        users: parseInt(row.metricValues?.[1]?.value || '0'),
        newUsers: parseInt(row.metricValues?.[2]?.value || '0'),
        pageviews: parseInt(row.metricValues?.[3]?.value || '0'),
        avgSessionDuration: parseFloat(row.metricValues?.[4]?.value || '0'),
        bounceRate: parseFloat(row.metricValues?.[5]?.value || '0') * 100, // Convert to percentage
      });
    }
  }

  return metricsData;
}

/**
 * Fetch GA4 traffic sources for a date range
 * Now fetches specific source domains instead of channel groupings
 */
async function fetchGA4TrafficSources(
  client: BetaAnalyticsDataClient,
  propertyId: string,
  startDate: string,
  endDate: string
): Promise<GATrafficSourceData[]> {
  const [response] = await client.runReport({
    property: `properties/${propertyId}`,
    dateRanges: [
      {
        startDate,
        endDate,
      },
    ],
    dimensions: [
      {
        name: 'date',
      },
      {
        name: 'sessionSource', // Changed from 'sessionDefaultChannelGroup' to get specific sources
      },
    ],
    metrics: [
      { name: 'sessions' },
      { name: 'totalUsers' },
      { name: 'newUsers' },
    ],
  });

  const trafficData: GATrafficSourceData[] = [];

  if (response.rows) {
    for (const row of response.rows) {
      const dateValue = row.dimensionValues?.[0]?.value || '';
      const date = `${dateValue.substring(0, 4)}-${dateValue.substring(4, 6)}-${dateValue.substring(6, 8)}`;
      const source = row.dimensionValues?.[1]?.value || '(not set)';

      trafficData.push({
        date,
        source: source, // Use raw source name (instagram.com, linkedin, etc.)
        sessions: parseInt(row.metricValues?.[0]?.value || '0'),
        users: parseInt(row.metricValues?.[1]?.value || '0'),
        newUsers: parseInt(row.metricValues?.[2]?.value || '0'),
      });
    }
  }

  return trafficData;
}

/**
 * Save metrics data to Firestore
 */
async function saveMetricsToFirestore(
  userId: string,
  metricsData: GAMetricsData[]
): Promise<number> {
  const batch = admin.firestore().batch();
  let count = 0;

  for (const metrics of metricsData) {
    const docRef = admin.firestore()
      .collection('googleAnalytics')
      .doc(userId)
      .collection('metrics')
      .doc(metrics.date);

    batch.set(docRef, {
      ...metrics,
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    count++;
  }

  await batch.commit();
  return count;
}

/**
 * Save traffic source data to Firestore
 */
async function saveTrafficSourcesToFirestore(
  userId: string,
  trafficData: GATrafficSourceData[]
): Promise<number> {
  const batch = admin.firestore().batch();
  let count = 0;

  // Group by date and source
  const groupedData: { [key: string]: GATrafficSourceData } = {};

  for (const traffic of trafficData) {
    const key = `${traffic.date}_${traffic.source}`;

    if (groupedData[key]) {
      // Aggregate if duplicate
      groupedData[key].sessions += traffic.sessions;
      groupedData[key].users += traffic.users;
      groupedData[key].newUsers += traffic.newUsers;
    } else {
      groupedData[key] = { ...traffic };
    }
  }

  // Save aggregated data
  for (const [key, traffic] of Object.entries(groupedData)) {
    const docRef = admin.firestore()
      .collection('googleAnalytics')
      .doc(userId)
      .collection('trafficSources')
      .doc(key);

    batch.set(docRef, {
      id: key,
      ...traffic,
      syncedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });

    count++;
  }

  await batch.commit();
  return count;
}

/**
 * Calculate traffic source percentages
 */
async function updateTrafficSourcePercentages(userId: string, date: string): Promise<void> {
  const sourcesSnapshot = await admin.firestore()
    .collection('googleAnalytics')
    .doc(userId)
    .collection('trafficSources')
    .where('date', '==', date)
    .get();

  const totalSessions = sourcesSnapshot.docs.reduce(
    (sum, doc) => sum + (doc.data().sessions || 0),
    0
  );

  if (totalSessions === 0) return;

  const batch = admin.firestore().batch();

  for (const doc of sourcesSnapshot.docs) {
    const sessions = doc.data().sessions || 0;
    const percentage = (sessions / totalSessions) * 100;

    batch.update(doc.ref, { percentage });
  }

  await batch.commit();
}

/**
 * Callable Cloud Function to manually trigger Google Analytics sync
 */
export const syncGoogleAnalytics = functions
  .runWith({
    timeoutSeconds: 300,
    memory: "512MB",
    secrets: ["GA4_SERVICE_ACCOUNT"],
  })
  .https.onCall(async (data: { daysToSync?: number }, context) => {
    // Require authentication
    if (!context.auth) {
      throw new functions.https.HttpsError(
        "unauthenticated",
        "User must be authenticated to sync Google Analytics"
      );
    }

    const userId = 'global'; // Use global config instead of per-user
    const daysToSync = data.daysToSync || 30; // Default to last 30 days

    try {
      console.log(`Starting Google Analytics sync for global config, ${daysToSync} days`);

      // Get GA4 property ID from user config
      const configDoc = await admin.firestore()
        .collection('googleAnalytics')
        .doc(userId)
        .get();

      const config = configDoc.data();
      if (!config || !config.propertyId) {
        throw new functions.https.HttpsError(
          "failed-precondition",
          "Google Analytics not configured. Please configure your GA4 property ID first."
        );
      }

      const propertyId = config.propertyId;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - daysToSync);

      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      console.log(`Fetching GA4 data for property ${propertyId} from ${startDateStr} to ${endDateStr}`);

      // Initialize GA4 client
      const client = await initializeGA4Client();

      // Fetch metrics and traffic sources in parallel
      const [metricsData, trafficData] = await Promise.all([
        fetchGA4Metrics(client, propertyId, startDateStr, endDateStr),
        fetchGA4TrafficSources(client, propertyId, startDateStr, endDateStr),
      ]);

      console.log(`Fetched ${metricsData.length} metric records and ${trafficData.length} traffic source records`);

      // Save to Firestore
      const [metricsCount, trafficCount] = await Promise.all([
        saveMetricsToFirestore(userId, metricsData),
        saveTrafficSourcesToFirestore(userId, trafficData),
      ]);

      // Update percentages for each date
      const uniqueDates = [...new Set(trafficData.map(t => t.date))];
      await Promise.all(
        uniqueDates.map(date => updateTrafficSourcePercentages(userId, date))
      );

      // Update config with last sync info
      await admin.firestore()
        .collection('googleAnalytics')
        .doc(userId)
        .update({
          lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSyncStatus: 'success',
          lastSyncError: admin.firestore.FieldValue.delete(),
        });

      console.log(`✅ Successfully synced ${metricsCount} metrics and ${trafficCount} traffic sources for user ${userId}`);

      return {
        success: true,
        metricsCount,
        trafficSourcesCount: trafficCount,
        dateRange: {
          startDate: startDateStr,
          endDate: endDateStr,
        },
        syncedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error("Failed to sync Google Analytics:", error);

      // Update config with error
      await admin.firestore()
        .collection('googleAnalytics')
        .doc(userId)
        .update({
          lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
          lastSyncStatus: 'error',
          lastSyncError: error.message || 'Unknown error',
        });

      // Re-throw HttpsErrors as-is
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      // Wrap other errors
      throw new functions.https.HttpsError(
        "internal",
        `Failed to sync Google Analytics: ${error.message || "Unknown error"}`
      );
    }
  });

/**
 * Scheduled Cloud Function to automatically sync Google Analytics daily
 * Runs at 2:00 AM UTC every day
 */
export const scheduledGoogleAnalyticsSync = functions
  .runWith({
    timeoutSeconds: 540,
    memory: "1GB",
    secrets: ["GA4_SERVICE_ACCOUNT"],
  })
  .pubsub.schedule("0 2 * * *")
  .timeZone("UTC")
  .onRun(async (context) => {
    console.log("Starting scheduled Google Analytics sync");

    try {
      // Get all users with Google Analytics configured
      const configsSnapshot = await admin.firestore()
        .collection('googleAnalytics')
        .where('enabled', '==', true)
        .get();

      if (configsSnapshot.empty) {
        console.log("No users with Google Analytics configured");
        return null;
      }

      console.log(`Found ${configsSnapshot.size} users to sync`);

      // Initialize GA4 client once
      const client = await initializeGA4Client();

      // Sync for each user
      const syncPromises = configsSnapshot.docs.map(async (doc) => {
        const userId = doc.id;
        const config = doc.data();
        const propertyId = config.propertyId;

        try {
          console.log(`Syncing GA4 for user ${userId}, property ${propertyId}`);

          // Sync last 2 days to capture any updates
          const endDate = new Date();
          const startDate = new Date();
          startDate.setDate(endDate.getDate() - 2);

          const startDateStr = startDate.toISOString().split('T')[0];
          const endDateStr = endDate.toISOString().split('T')[0];

          // Fetch and save data
          const [metricsData, trafficData] = await Promise.all([
            fetchGA4Metrics(client, propertyId, startDateStr, endDateStr),
            fetchGA4TrafficSources(client, propertyId, startDateStr, endDateStr),
          ]);

          await Promise.all([
            saveMetricsToFirestore(userId, metricsData),
            saveTrafficSourcesToFirestore(userId, trafficData),
          ]);

          // Update percentages
          const uniqueDates = [...new Set(trafficData.map(t => t.date))];
          await Promise.all(
            uniqueDates.map(date => updateTrafficSourcePercentages(userId, date))
          );

          // Update sync status
          await doc.ref.update({
            lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSyncStatus: 'success',
            lastSyncError: admin.firestore.FieldValue.delete(),
          });

          console.log(`✅ Synced user ${userId}`);
        } catch (error: any) {
          console.error(`❌ Failed to sync user ${userId}:`, error);

          // Update error status
          await doc.ref.update({
            lastSyncAt: admin.firestore.FieldValue.serverTimestamp(),
            lastSyncStatus: 'error',
            lastSyncError: error.message || 'Unknown error',
          });
        }
      });

      await Promise.all(syncPromises);

      console.log("✅ Scheduled Google Analytics sync complete");
      return null;
    } catch (error) {
      console.error("❌ Scheduled sync failed:", error);
      throw error;
    }
  });
