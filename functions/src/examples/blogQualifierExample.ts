/**
 * Example usage of the Blog Qualifier Service
 *
 * This demonstrates how to use the blog qualification functions
 * to analyze companies and determine if they meet qualification criteria:
 *
 * 1. Active blog (1+ posts in last 30 days)
 * 2. Multiple authors (2+)
 * 3. Developer-first B2B SaaS company
 */

import {qualifyCompany, qualifyCompanies} from "../utils/blogQualifierService";
import {CompanyInput} from "../types";

// Example 1: Qualify a single company
async function exampleSingleCompany() {
  const company: CompanyInput = {
    name: "Example Tech",
    website: "https://example.com",
    description: "A developer tools company",
  };

  // You'll need to provide your OpenAI API key
  const openaiApiKey = process.env.OPENAI_API_KEY || "your-api-key-here";

  const result = await qualifyCompany(company, openaiApiKey);

  console.log("\n=== Single Company Result ===");
  console.log(`Company: ${result.companyName}`);
  console.log(`Qualified: ${result.qualified}`);
  console.log(`Active Blog: ${result.hasActiveBlog} (${result.blogPostCount} posts)`);
  console.log(`Multiple Authors: ${result.hasMultipleAuthors} (${result.authorCount} authors)`);
  console.log(`Developer B2B SaaS: ${result.isDeveloperB2BSaas}`);
  console.log(`Analysis Method: ${result.analysisMethod}`);

  return result;
}

// Example 2: Qualify multiple companies
async function exampleMultipleCompanies() {
  const companies: CompanyInput[] = [
    {
      name: "Company A",
      website: "https://companya.com",
    },
    {
      name: "Company B",
      website: "https://companyb.com",
    },
    {
      name: "Company C",
      website: "https://companyc.com",
    },
  ];

  const openaiApiKey = process.env.OPENAI_API_KEY || "your-api-key-here";

  // The third parameter is delay between companies in milliseconds (default 2000ms)
  const results = await qualifyCompanies(companies, openaiApiKey, 2000);

  console.log("\n=== Multiple Companies Results ===");
  console.log(`Total analyzed: ${results.length}`);
  console.log(`Qualified: ${results.filter((r) => r.qualified).length}`);

  results.forEach((result) => {
    console.log(`\n${result.companyName}:`);
    console.log(`  Qualified: ${result.qualified ? "✅" : "❌"}`);
    console.log(`  Posts: ${result.blogPostCount}`);
    console.log(`  Authors: ${result.authorCount}`);
    console.log(`  Dev SaaS: ${result.isDeveloperB2BSaas ? "Yes" : "No"}`);
  });

  return results;
}

// Example 3: Using the result data
async function exampleProcessResults() {
  const company: CompanyInput = {
    name: "Example Corp",
    website: "https://example-corp.com",
  };

  const openaiApiKey = process.env.OPENAI_API_KEY || "your-api-key-here";
  const result = await qualifyCompany(company, openaiApiKey);

  // Access all the detailed information
  console.log("\n=== Detailed Company Information ===");
  console.log(`Company Name: ${result.companyName}`);
  console.log(`Website: ${result.website}`);
  console.log(`Blog URL: ${result.blogLinkUsed}`);
  console.log(`Last Post Date: ${result.lastBlogCreatedAt}`);
  console.log(`Author Names: ${result.authorNames}`);
  console.log(`Authors Are: ${result.authorsAreEmployees}`);
  console.log(`Covers AI Topics: ${result.coversAiTopics}`);
  console.log(`Content Summary: ${result.contentSummary}`);
  console.log(`RSS Feed Found: ${result.rssFeedFound}`);
  console.log(`Analysis Method: ${result.analysisMethod}`);

  // Filter qualified companies
  if (result.qualified) {
    console.log("\n✅ This company is qualified!");
    console.log("Criteria met:");
    console.log(`  - Active blog: ${result.hasActiveBlog}`);
    console.log(`  - Multiple authors: ${result.hasMultipleAuthors}`);
    console.log(`  - Developer B2B SaaS: ${result.isDeveloperB2BSaas}`);
  } else {
    console.log("\n❌ This company does not meet qualification criteria");
  }

  return result;
}

// Uncomment to run examples:
// exampleSingleCompany();
// exampleMultipleCompanies();
// exampleProcessResults();

export {exampleSingleCompany, exampleMultipleCompanies, exampleProcessResults};
