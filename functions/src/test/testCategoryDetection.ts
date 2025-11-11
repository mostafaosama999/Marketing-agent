/**
 * Test Category Detection
 * Standalone test script to verify category detection logic
 */

import {detectCategory, CategoryResult} from '../utils/categoryDetector';

interface TestCase {
  title: string;
  description?: string;
  expectedCategory: string;
  testName: string;
}

const testCases: TestCase[] = [
  // AI & Machine Learning Tests
  {
    testName: 'RAG System with LLM',
    title: 'Building a RAG System with Gemini LLM for Financial forecasting',
    description: 'Learn how to build a retrieval augmented generation pipeline using Google Gemini',
    expectedCategory: 'AI & Machine Learning'
  },
  {
    testName: 'CUDA Programming',
    title: 'How To Get Started with CUDA',
    description: 'Introduction to GPU programming with NVIDIA CUDA for deep learning',
    expectedCategory: 'AI & Machine Learning'
  },
  {
    testName: 'HuggingFace Model Bias',
    title: 'How to address Machine Learning Bias in a pre-trained HuggingFace text classification model',
    expectedCategory: 'AI & Machine Learning'
  },
  {
    testName: 'LlamaIndex RAG',
    title: 'Building a RAG pipeline using LlamaIndex and Claude 3',
    description: 'Step-by-step guide to creating retrieval augmented generation systems',
    expectedCategory: 'AI & Machine Learning'
  },
  {
    testName: 'Fine-tuning vs RAG',
    title: 'Fine-Tuning vs. Retrieval-Augmented Generation: Navigating Legal Document Analysis',
    expectedCategory: 'AI & Machine Learning'
  },

  // Cloud & Deployment Tests
  {
    testName: 'Kubernetes Deployment',
    title: 'Deploying ML Models on Civo Kubernetes',
    description: 'Guide to deploying machine learning models to Kubernetes clusters on Civo cloud',
    expectedCategory: 'Cloud & Deployment'
  },
  {
    testName: 'GPU Inference',
    title: 'Optimizing GPU Inference with Docker Containers',
    description: 'Learn how to optimize GPU utilization for model inference using containerization',
    expectedCategory: 'Cloud & Deployment'
  },
  {
    testName: 'Kubernetes Scaling',
    title: 'Auto-scaling ML Workloads on Kubernetes',
    expectedCategory: 'Cloud & Deployment'
  },

  // Developer Tools & Security Tests
  {
    testName: 'Authentication System',
    title: 'Why Startups Can\'t Afford Weak or Over-Engineered Authentication',
    description: 'Deep dive into authentication strategies using Supertokens',
    expectedCategory: 'Developer Tools & Security'
  },
  {
    testName: 'MLOps Pipeline',
    title: 'Building an MLOps Pipeline with LangChain',
    description: 'Create automated machine learning pipelines for production',
    expectedCategory: 'Developer Tools & Security'
  },
  {
    testName: 'API Security',
    title: 'Securing REST APIs with OAuth and JWT',
    expectedCategory: 'Developer Tools & Security'
  },

  // Freelancing & Career Tests
  {
    testName: 'Webflow Portfolio',
    title: 'Boost Your Freelance Career with a Professional Webflow Portfolio',
    description: 'Learn how to create stunning portfolios to attract clients',
    expectedCategory: 'Freelancing & Career'
  },
  {
    testName: 'Personal Branding',
    title: 'Building Your Personal Brand as a Freelance Developer',
    expectedCategory: 'Freelancing & Career'
  },
  {
    testName: 'Career Development',
    title: 'Career Growth Strategies for Software Engineers',
    expectedCategory: 'Freelancing & Career'
  },

  // Case Studies & Tutorials Tests
  {
    testName: 'Getting Started Tutorial',
    title: 'Getting Started with Python for Data Science',
    description: 'A beginner-friendly introduction to Python programming',
    expectedCategory: 'Case Studies & Tutorials'
  },
  {
    testName: 'Step-by-Step Guide',
    title: 'How to Build Your First Web Application: A Step-by-Step Guide',
    expectedCategory: 'Case Studies & Tutorials'
  },
  {
    testName: 'Industry Case Study',
    title: 'Healthcare AI: A Real-World Case Study',
    description: 'Examining how AI transformed patient care at a major hospital',
    expectedCategory: 'Case Studies & Tutorials'
  },

  // Edge Cases
  {
    testName: 'Ambiguous - AI + Cloud',
    title: 'Deploying LLMs on Kubernetes with GPU Support',
    description: 'Complete guide to deploying large language models on cloud infrastructure',
    expectedCategory: 'AI & Machine Learning' // Should favor AI due to LLM keywords
  },
  {
    testName: 'Ambiguous - MLOps + Cloud',
    title: 'Building ML Pipelines on Civo Cloud',
    description: 'DevOps practices for machine learning in Kubernetes',
    expectedCategory: 'Developer Tools & Security' // MLOps is in Dev Tools
  },
  {
    testName: 'No Keywords',
    title: 'The Future of Technology',
    description: 'An opinion piece about where tech is heading',
    expectedCategory: 'Case Studies & Tutorials' // Default category
  }
];

/**
 * Run all test cases
 */
function runTests() {
  console.log('🧪 Testing Category Detection\n');
  console.log('=' .repeat(80));
  console.log('\n');

  let passed = 0;
  let failed = 0;
  const failures: string[] = [];

  testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}/${testCases.length}: ${testCase.testName}`);
    console.log('─'.repeat(80));
    console.log(`📝 Title: "${testCase.title}"`);
    if (testCase.description) {
      console.log(`📄 Description: "${testCase.description}"`);
    }
    console.log(`🎯 Expected: ${testCase.expectedCategory}`);

    const result: CategoryResult = detectCategory(testCase.title, testCase.description);

    const success = result.category === testCase.expectedCategory;

    if (success) {
      console.log(`✅ PASS - Got: ${result.category} (${result.confidence} confidence, score: ${result.score})`);
      passed++;
    } else {
      console.log(`❌ FAIL - Got: ${result.category} (expected: ${testCase.expectedCategory})`);
      console.log(`   Confidence: ${result.confidence}, Score: ${result.score}`);
      console.log(`   All scores:`, result.allScores);
      failed++;
      failures.push(testCase.testName);
    }

    console.log(`   Matched keywords: ${result.matchedKeywords.slice(0, 5).join(', ')}${result.matchedKeywords.length > 5 ? '...' : ''}`);
    console.log('\n');
  });

  console.log('=' .repeat(80));
  console.log('\n📊 Test Results Summary\n');
  console.log(`Total Tests: ${testCases.length}`);
  console.log(`✅ Passed: ${passed} (${Math.round(passed / testCases.length * 100)}%)`);
  console.log(`❌ Failed: ${failed} (${Math.round(failed / testCases.length * 100)}%)`);

  if (failures.length > 0) {
    console.log('\n❌ Failed Tests:');
    failures.forEach((name) => console.log(`   - ${name}`));
  }

  console.log('\n');

  // Exit with error code if tests failed
  if (failed > 0) {
    console.log('⚠️  Some tests failed. Review the category detection logic or adjust test expectations.');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!');
    process.exit(0);
  }
}

// Run the tests
runTests();
