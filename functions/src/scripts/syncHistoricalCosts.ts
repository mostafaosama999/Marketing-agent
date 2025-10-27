/**
 * Migration script to sync historical API costs from apiCosts collection to users.apiUsage
 *
 * Run this script once to backfill user API usage data from historical cost records
 *
 * Usage:
 *   npx ts-node src/scripts/syncHistoricalCosts.ts
 */

import * as admin from "firebase-admin";

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

interface ApiCostRecord {
  userId: string;
  service: string;
  totalCost: number;
  inputTokens: number;
  outputTokens: number;
  timestamp: admin.firestore.Timestamp;
}

interface UserCostAggregation {
  totalCost: number;
  totalTokens: number;
  totalCalls: number;
  breakdown: {
    blogAnalysis: { cost: number; tokens: number; calls: number };
    writingProgram: { cost: number; tokens: number; calls: number };
    other: { cost: number; tokens: number; calls: number };
  };
}

const SERVICE_TO_CATEGORY: Record<string, string> = {
  "blog-qualification": "blogAnalysis",
  "writing-program-finder": "writingProgram",
  "writing-program-analyzer": "writingProgram",
  "idea-generation": "other",
};

async function syncHistoricalCosts() {
  console.log("🚀 Starting historical cost sync...");

  try {
    // Step 1: Fetch all cost records from apiCosts collection
    console.log("📊 Fetching cost records from apiCosts collection...");
    const costSnapshot = await db.collection("apiCosts").get();

    console.log(`✅ Found ${costSnapshot.size} cost records`);

    // Step 2: Aggregate costs by user
    const userCosts = new Map<string, UserCostAggregation>();

    costSnapshot.forEach((doc) => {
      const data = doc.data() as ApiCostRecord;
      const { userId, service, totalCost, inputTokens, outputTokens } = data;

      if (!userId) {
        console.warn(`⚠️  Skipping cost record ${doc.id} - no userId`);
        return;
      }

      // Get or create user aggregation
      if (!userCosts.has(userId)) {
        userCosts.set(userId, {
          totalCost: 0,
          totalTokens: 0,
          totalCalls: 0,
          breakdown: {
            blogAnalysis: { cost: 0, tokens: 0, calls: 0 },
            writingProgram: { cost: 0, tokens: 0, calls: 0 },
            other: { cost: 0, tokens: 0, calls: 0 },
          },
        });
      }

      const userAgg = userCosts.get(userId)!;
      const category = SERVICE_TO_CATEGORY[service] || "other";
      const totalTokens = inputTokens + outputTokens;

      // Update totals
      userAgg.totalCost += totalCost;
      userAgg.totalTokens += totalTokens;
      userAgg.totalCalls += 1;

      // Update category breakdown
      userAgg.breakdown[category as keyof typeof userAgg.breakdown].cost += totalCost;
      userAgg.breakdown[category as keyof typeof userAgg.breakdown].tokens += totalTokens;
      userAgg.breakdown[category as keyof typeof userAgg.breakdown].calls += 1;
    });

    console.log(`👥 Aggregated costs for ${userCosts.size} users`);

    // Step 3: Update each user's apiUsage field
    console.log("💾 Updating user documents...");

    const batch = db.batch();
    let updateCount = 0;

    for (const [userId, agg] of userCosts.entries()) {
      const userRef = db.collection("users").doc(userId);

      // Check if user exists
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        console.warn(`⚠️  User ${userId} not found, skipping`);
        continue;
      }

      // Update user document with aggregated costs
      batch.update(userRef, {
        "apiUsage.ai.totalCost": agg.totalCost,
        "apiUsage.ai.totalTokens": agg.totalTokens,
        "apiUsage.ai.totalCalls": agg.totalCalls,
        "apiUsage.ai.breakdown.blogAnalysis.cost": agg.breakdown.blogAnalysis.cost,
        "apiUsage.ai.breakdown.blogAnalysis.tokens": agg.breakdown.blogAnalysis.tokens,
        "apiUsage.ai.breakdown.blogAnalysis.calls": agg.breakdown.blogAnalysis.calls,
        "apiUsage.ai.breakdown.writingProgram.cost": agg.breakdown.writingProgram.cost,
        "apiUsage.ai.breakdown.writingProgram.tokens": agg.breakdown.writingProgram.tokens,
        "apiUsage.ai.breakdown.writingProgram.calls": agg.breakdown.writingProgram.calls,
        "apiUsage.ai.breakdown.other.cost": agg.breakdown.other.cost,
        "apiUsage.ai.breakdown.other.tokens": agg.breakdown.other.tokens,
        "apiUsage.ai.breakdown.other.calls": agg.breakdown.other.calls,
        "apiUsage.ai.lastUpdated": admin.firestore.FieldValue.serverTimestamp(),
      });

      updateCount++;

      console.log(
        `   ✅ ${userDoc.data()?.email || userId}: $${agg.totalCost.toFixed(4)} (${agg.totalTokens} tokens, ${agg.totalCalls} calls)`
      );
    }

    // Commit batch update
    if (updateCount > 0) {
      await batch.commit();
      console.log(`\n✨ Successfully updated ${updateCount} user(s) with historical costs`);
    } else {
      console.log("\n⚠️  No users to update");
    }

    // Step 4: Summary
    console.log("\n📈 Migration Summary:");
    console.log(`   Total cost records processed: ${costSnapshot.size}`);
    console.log(`   Users updated: ${updateCount}`);
    console.log(`   Total AI costs synced: $${Array.from(userCosts.values()).reduce((sum, u) => sum + u.totalCost, 0).toFixed(4)}`);
    console.log(`   Total tokens synced: ${Array.from(userCosts.values()).reduce((sum, u) => sum + u.totalTokens, 0)}`);
    console.log(`   Total API calls synced: ${Array.from(userCosts.values()).reduce((sum, u) => sum + u.totalCalls, 0)}`);

    console.log("\n✅ Historical cost sync completed successfully!");
  } catch (error) {
    console.error("❌ Error syncing historical costs:", error);
    throw error;
  }
}

// Run the migration
syncHistoricalCosts()
  .then(() => {
    console.log("\n🎉 Migration script finished");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n💥 Migration script failed:", error);
    process.exit(1);
  });
