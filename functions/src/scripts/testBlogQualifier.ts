/**
 * Test script for Blog Qualifier Service
 *
 * Usage:
 *   1. Set your OPENAI_API_KEY environment variable
 *   2. Run: npm run build && node lib/scripts/testBlogQualifier.js
 *
 * Or test with a specific company:
 *   OPENAI_API_KEY=sk-xxx node lib/scripts/testBlogQualifier.js
 */

import {qualifyCompany} from "../utils/blogQualifierService";
import {CompanyInput} from "../types";

async function main() {
  // Get API key from environment
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    console.error("❌ Error: OPENAI_API_KEY environment variable not set");
    console.log("\nUsage:");
    console.log("  export OPENAI_API_KEY=your-api-key");
    console.log("  npm run build");
    console.log("  node lib/scripts/testBlogQualifier.js");
    process.exit(1);
  }

  // Test company (you can change this)
  const testCompany: CompanyInput = {
    name: "Vercel",
    website: "https://vercel.com",
    description: "Frontend cloud platform",
  };

  console.log("🚀 Blog Qualification Test Starting...\n");
  console.log(`Testing with company: ${testCompany.name}`);
  console.log(`Website: ${testCompany.website}\n`);

  try {
    const result = await qualifyCompany(testCompany, openaiApiKey);

    // Print results
    console.log("\n" + "=".repeat(60));
    console.log("📊 FINAL RESULT");
    console.log("=".repeat(60));
    console.log(`Company: ${result.companyName}`);
    console.log(`Website: ${result.website}`);
    console.log(`Qualified: ${result.qualified ? "✅ YES" : "❌ NO"}`);
    console.log("\nCriteria:");
    console.log(`  • Active blog (1+ posts/30d): ${result.hasActiveBlog ? "✅" : "❌"} (${result.blogPostCount} posts)`);
    console.log(`  • Multiple authors (2+): ${result.hasMultipleAuthors ? "✅" : "❌"} (${result.authorCount} authors)`);
    console.log(`  • Developer-first B2B SaaS: ${result.isDeveloperB2BSaas ? "✅" : "❌"}`);
    console.log("\nDetails:");
    console.log(`  Blog URL: ${result.blogLinkUsed || "N/A"}`);
    console.log(`  Last Post: ${result.lastBlogCreatedAt || "N/A"}`);
    console.log(`  Authors: ${result.authorNames || "N/A"}`);
    console.log(`  Authors Type: ${result.authorsAreEmployees}`);
    console.log(`  Covers AI Topics: ${result.coversAiTopics ? "Yes" : "No"}`);
    console.log(`  RSS Feed Found: ${result.rssFeedFound ? "Yes" : "No"}`);
    console.log(`  Analysis Method: ${result.analysisMethod}`);

    if (result.contentSummary) {
      console.log(`\nContent Summary:`);
      console.log(result.contentSummary);
    }

    console.log("\n" + "=".repeat(60));
    console.log("✨ Test complete!");
    console.log("=".repeat(60));
  } catch (error) {
    console.error("\n❌ Error during qualification:");
    console.error(error);
    process.exit(1);
  }
}

// Run the test
main();
