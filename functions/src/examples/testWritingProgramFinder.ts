/**
 * Example usage of the Writing Program Finder utility
 *
 * This demonstrates how to use the findWritingProgram function
 * to discover community writing programs for a company website.
 *
 * Run this example:
 * 1. cd functions
 * 2. npm run build
 * 3. node lib/examples/testWritingProgramFinder.js
 */

import {findWritingProgram, findMultipleWritingPrograms} from "../utils/writingProgramFinderUtils";

/**
 * Example 1: Find writing program for a single website
 */
async function testSingleWebsite() {
  console.log("=".repeat(60));
  console.log("Example 1: Single Website Search");
  console.log("=".repeat(60));

  try {
    const result = await findWritingProgram("https://kestra.io");

    console.log("\n📊 Summary:");
    console.log(`Total URLs checked: ${result.totalChecked}`);
    console.log(`Valid URLs found: ${result.validUrls.length}`);

    if (result.validUrls.length > 0) {
      console.log("\n✅ Writing Program URLs Found:");
      result.validUrls.forEach((url, index) => {
        console.log(`${index + 1}. ${url.url}`);
        if (url.finalUrl && url.finalUrl !== url.url) {
          console.log(`   → Redirects to: ${url.finalUrl}`);
        }
      });

      console.log("\n📝 Patterns Found:");
      result.patternsFound.forEach((pattern, index) => {
        console.log(`${index + 1}. ${pattern}`);
      });
    } else {
      console.log("\n❌ No writing program URLs found");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Example 2: Find writing programs for multiple websites
 */
async function testMultipleWebsites() {
  console.log("\n" + "=".repeat(60));
  console.log("Example 2: Multiple Websites Search");
  console.log("=".repeat(60));

  const websites = [
    "https://kestra.io",
    "https://apollo.io",
    "https://semaphore.io",
  ];

  try {
    const results = await findMultipleWritingPrograms(websites, {
      concurrent: 5,
      timeout: 5000,
      delayBetweenWebsites: 1000,
    });

    console.log("\n📊 Overall Summary:");
    console.log(`Total websites checked: ${results.size}`);

    let totalUrls = 0;
    results.forEach((result) => {
      totalUrls += result.validUrls.length;
    });
    console.log(`Total writing program URLs found: ${totalUrls}`);

    console.log("\n" + "-".repeat(60));

    results.forEach((result, website) => {
      console.log(`\n🌐 ${website}`);
      console.log(`   URLs checked: ${result.totalChecked}`);
      console.log(`   URLs found: ${result.validUrls.length}`);

      if (result.validUrls.length > 0) {
        console.log(`   ✅ Found URLs:`);
        result.validUrls.forEach((url) => {
          console.log(`      - ${url.url}`);
        });
      } else {
        console.log(`   ❌ No writing programs found`);
      }
    });
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Example 3: Custom configuration
 */
async function testWithCustomConfig() {
  console.log("\n" + "=".repeat(60));
  console.log("Example 3: Custom Configuration");
  console.log("=".repeat(60));

  try {
    // Use higher concurrency and longer timeout
    const result = await findWritingProgram("https://hashnode.com", {
      concurrent: 10, // Check 10 URLs at a time
      timeout: 10000, // 10 second timeout
    });

    console.log("\n📊 Summary:");
    console.log(`Website: ${result.website}`);
    console.log(`Total URLs checked: ${result.totalChecked}`);
    console.log(`Valid URLs found: ${result.validUrls.length}`);

    if (result.validUrls.length > 0) {
      console.log("\n✅ Writing Program URLs:");
      result.validUrls.forEach((url) => {
        console.log(`   - ${url.url} (Status: ${url.status})`);
      });
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Example 4: Test AI Fallback
 * This example uses a website that might not match standard patterns
 */
async function testAiFallback() {
  console.log("\n" + "=".repeat(60));
  console.log("Example 4: AI Fallback Test");
  console.log("=".repeat(60));

  try {
    // Test with a website that might need AI assistance
    const result = await findWritingProgram("https://example.com", {
      concurrent: 5,
      timeout: 5000,
      useAiFallback: true, // Enable AI fallback (enabled by default)
    });

    console.log("\n📊 Summary:");
    console.log(`Website: ${result.website}`);
    console.log(`Total URLs checked: ${result.totalChecked}`);
    console.log(`Valid URLs found: ${result.validUrls.length}`);
    console.log(`Used AI Fallback: ${result.usedAiFallback ? "✅ Yes" : "❌ No"}`);

    if (result.usedAiFallback) {
      console.log(`\n🤖 AI Analysis:`);
      console.log(`   Overall Reasoning: ${result.aiReasoning}`);
      console.log(`   AI Suggestions: ${result.aiSuggestions?.length || 0}`);

      if (result.aiSuggestions && result.aiSuggestions.length > 0) {
        console.log("\n📝 AI Suggestions:");
        result.aiSuggestions.forEach((suggestion, index) => {
          console.log(`\n   ${index + 1}. ${suggestion.url}`);
          console.log(`      Confidence: ${suggestion.confidence}`);
          console.log(`      Verified: ${suggestion.verified ? "✅" : "❌"}`);
          console.log(`      Reasoning: ${suggestion.reasoning}`);
          if (!suggestion.verified && suggestion.verificationError) {
            console.log(`      Error: ${suggestion.verificationError}`);
          }
        });
      }
    }

    if (result.validUrls.length > 0) {
      console.log("\n✅ Verified Writing Program URLs:");
      result.validUrls.forEach((url) => {
        console.log(`   - ${url.url}`);
      });
    } else {
      console.log("\n❌ No writing program URLs found");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Example 5: Disable AI Fallback
 * Sometimes you might want pattern matching only
 */
async function testWithoutAiFallback() {
  console.log("\n" + "=".repeat(60));
  console.log("Example 5: Pattern Matching Only (No AI)");
  console.log("=".repeat(60));

  try {
    const result = await findWritingProgram("https://example.com", {
      useAiFallback: false, // Disable AI fallback
    });

    console.log("\n📊 Summary:");
    console.log(`Website: ${result.website}`);
    console.log(`Total URLs checked: ${result.totalChecked}`);
    console.log(`Valid URLs found: ${result.validUrls.length}`);
    console.log(`Used AI Fallback: ${result.usedAiFallback ? "Yes" : "No"}`);

    if (result.validUrls.length > 0) {
      console.log("\n✅ Writing Program URLs (Pattern Matching):");
      result.validUrls.forEach((url) => {
        console.log(`   - ${url.url}`);
      });
    } else {
      console.log("\n❌ No URLs found with pattern matching");
      console.log("💡 Tip: Try enabling AI fallback with useAiFallback: true");
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

/**
 * Main function - run all examples
 */
async function main() {
  console.log("\n🔍 Writing Program Finder - Test Examples\n");

  // Uncomment the example you want to run:

  // Example 1: Single website search (pattern matching only)
  await testSingleWebsite();

  // Example 2: Multiple websites search
  // await testMultipleWebsites();

  // Example 3: Custom configuration
  // await testWithCustomConfig();

  // Example 4: AI Fallback (when patterns don't match)
  // await testAiFallback();

  // Example 5: Disable AI Fallback
  // await testWithoutAiFallback();

  console.log("\n" + "=".repeat(60));
  console.log("✅ Test completed!");
  console.log("=".repeat(60) + "\n");
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export {
  testSingleWebsite,
  testMultipleWebsites,
  testWithCustomConfig,
  testAiFallback,
  testWithoutAiFallback,
};
