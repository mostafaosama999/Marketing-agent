/**
 * Category Detector Utility
 * Automatically detects article categories based on keyword matching
 */

export interface CategoryResult {
  category: string;
  confidence: 'high' | 'medium' | 'low';
  score: number;
  allScores: Record<string, number>;
  matchedKeywords: string[];
}

interface CategoryDefinition {
  name: string;
  keywords: string[];
  weight: number; // Multiplier for scoring (0.5 - 1.0)
}

/**
 * Category definitions based on user-provided taxonomy
 */
const CATEGORIES: CategoryDefinition[] = [
  {
    name: 'AI & Machine Learning',
    keywords: [
      // LLMs & Generative AI
      'LLM', 'large language model', 'GPT', 'Claude', 'Gemini', 'ChatGPT',
      'generative AI', 'gen AI', 'prompt engineering', 'fine-tuning', 'fine-tune',

      // RAG & Vector DBs
      'RAG', 'retrieval augmented', 'vector database', 'embeddings', 'similarity search',

      // ML Frameworks & Tools
      'HuggingFace', 'Hugging Face', 'transformers', 'LangChain', 'LlamaIndex',
      'OpenAI', 'Anthropic', 'Cohere',

      // ML Concepts
      'machine learning', 'deep learning', 'neural network', 'model training',
      'AI model', 'text classification', 'NLP', 'natural language',
      'computer vision', 'image classification', 'object detection',

      // ML Ethics & Quality
      'bias', 'fairness', 'interpretability', 'explainability', 'model evaluation',
      'Giskard', 'responsible AI', 'AI ethics', 'model auditing',

      // W&B Specific
      'weights and biases', 'wandb', 'experiment tracking', 'hyperparameter'
    ],
    weight: 1.0
  },
  {
    name: 'Cloud & Deployment',
    keywords: [
      // Kubernetes & Orchestration
      'Kubernetes', 'K8s', 'container orchestration', 'pods', 'deployment',
      'kubectl', 'helm',

      // Cloud Providers & Platforms
      'Civo', 'AWS', 'Azure', 'GCP', 'Google Cloud', 'cloud platform',
      'cloud deployment', 'cloud infrastructure',

      // Containerization
      'Docker', 'container', 'containerize', 'image', 'registry',

      // Infrastructure & DevOps
      'infrastructure', 'scaling', 'auto-scaling', 'load balancing',
      'cluster', 'node', 'orchestration',

      // GPU & Compute
      'GPU', 'CUDA', 'inference', 'model serving', 'GPU acceleration',
      'compute', 'TPU', 'hardware acceleration'
    ],
    weight: 1.0
  },
  {
    name: 'Developer Tools & Security',
    keywords: [
      // Authentication & Security
      'authentication', 'auth', 'authorization', 'identity',
      'Supertokens', 'JWT', 'OAuth', 'SSO', 'single sign-on',
      'security', 'encryption', 'access control', 'IAM',

      // APIs & Integration
      'API', 'REST API', 'GraphQL', 'webhook', 'endpoint',
      'integration', 'SDK', 'API key',

      // DevOps & MLOps
      'DevOps', 'MLOps', 'LLMOps', 'CI/CD', 'continuous integration',
      'pipeline', 'workflow', 'automation', 'orchestration',

      // Development Frameworks
      'framework', 'library', 'package', 'dependency',
      'npm', 'pip', 'package manager',

      // Monitoring & Observability
      'monitoring', 'logging', 'observability', 'metrics',
      'tracing', 'debugging', 'performance'
    ],
    weight: 1.0
  },
  {
    name: 'Freelancing & Career',
    keywords: [
      // Freelancing
      'freelance', 'freelancer', 'freelancing', 'independent contractor',
      'client', 'project', 'gig',

      // Portfolio & Branding
      'portfolio', 'personal brand', 'branding', 'showcase',
      'professional', 'website', 'online presence',

      // Career Development
      'career', 'job', 'resume', 'CV', 'interview',
      'career growth', 'career development', 'professional development',

      // Tools & Platforms
      'Webflow', 'NovaPersona', 'template', 'design',
      'no-code', 'low-code',

      // Business
      'business', 'entrepreneurship', 'startup', 'marketing',
      'productivity', 'time management', 'work-life'
    ],
    weight: 1.0
  },
  {
    name: 'Case Studies & Tutorials',
    keywords: [
      // Tutorial Indicators
      'how to', 'getting started', 'introduction to', 'beginner',
      'step-by-step', 'walkthrough', 'guide', 'tutorial',

      // Building & Implementation
      'building', 'build', 'creating', 'implementing',
      'setup', 'configure', 'install',

      // Learning Resources
      'learn', 'example', 'demo', 'sample',
      'hands-on', 'practical',

      // Case Study Indicators
      'case study', 'use case', 'real-world', 'application',
      'industry', 'production', 'at scale'
    ],
    weight: 0.8 // Lower weight since these are format/style indicators
  }
];

/**
 * Default category when no keywords match
 */
const DEFAULT_CATEGORY = 'Case Studies & Tutorials';

/**
 * Normalize text for matching (lowercase, remove special chars)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Replace special chars with spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Count keyword matches in text
 */
function countKeywordMatches(text: string, keywords: string[]): { count: number; matched: string[] } {
  const normalizedText = normalizeText(text);
  const matched: string[] = [];

  let count = 0;
  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);

    // Check if keyword appears in text (word boundary aware)
    const regex = new RegExp(`\\b${normalizedKeyword.replace(/\s+/g, '\\s+')}\\b`, 'i');
    if (regex.test(normalizedText)) {
      count++;
      matched.push(keyword);
    }
  }

  return { count, matched };
}

/**
 * Calculate category scores based on keyword matches
 */
function calculateScores(title: string, description?: string): Record<string, { score: number; matched: string[] }> {
  const combinedText = `${title} ${description || ''}`;
  const scores: Record<string, { score: number; matched: string[] }> = {};

  for (const category of CATEGORIES) {
    const { count, matched } = countKeywordMatches(combinedText, category.keywords);
    const weightedScore = count * category.weight;

    scores[category.name] = {
      score: weightedScore,
      matched
    };
  }

  return scores;
}

/**
 * Determine confidence level based on score
 */
function determineConfidence(topScore: number, secondScore: number, totalKeywords: number): 'high' | 'medium' | 'low' {
  // High confidence: clear winner with good keyword count
  if (topScore >= 3 && topScore > secondScore * 1.5) {
    return 'high';
  }

  // Medium confidence: moderate lead or decent keyword count
  if (topScore >= 2 || topScore > secondScore * 1.2) {
    return 'medium';
  }

  // Low confidence: very close scores or few keywords
  return 'low';
}

/**
 * Detect category based on article title and description
 *
 * @param title - Article title (required)
 * @param description - Article description (optional)
 * @returns CategoryResult with detected category and metadata
 */
export function detectCategory(title: string, description?: string): CategoryResult {
  // Validate input
  if (!title || title.trim().length === 0) {
    console.warn('⚠️  Empty title provided to category detector, using default');
    return {
      category: DEFAULT_CATEGORY,
      confidence: 'low',
      score: 0,
      allScores: {},
      matchedKeywords: []
    };
  }

  // Calculate scores for all categories
  const categoryScores = calculateScores(title, description);

  // Extract scores and sort
  const scoreEntries = Object.entries(categoryScores)
    .sort(([, a], [, b]) => b.score - a.score);

  // Get top two scores for confidence calculation
  const topCategory = scoreEntries[0];
  const secondCategory = scoreEntries[1];

  const topScore = topCategory[1].score;
  const secondScore = secondCategory ? secondCategory[1].score : 0;

  // If no keywords matched at all, use default
  if (topScore === 0) {
    console.log(`📂 No category keywords found in: "${title}"`);
    console.log(`   → Using default category: ${DEFAULT_CATEGORY}`);

    return {
      category: DEFAULT_CATEGORY,
      confidence: 'low',
      score: 0,
      allScores: Object.fromEntries(
        Object.entries(categoryScores).map(([name, data]) => [name, data.score])
      ),
      matchedKeywords: []
    };
  }

  // Determine confidence
  const confidence = determineConfidence(topScore, secondScore, topCategory[1].matched.length);

  // Log detection
  console.log(`📂 Category detected: ${topCategory[0]} (${confidence} confidence, score: ${topScore})`);
  console.log(`   Keywords: ${topCategory[1].matched.slice(0, 5).join(', ')}${topCategory[1].matched.length > 5 ? '...' : ''}`);

  return {
    category: topCategory[0],
    confidence,
    score: topScore,
    allScores: Object.fromEntries(
      Object.entries(categoryScores).map(([name, data]) => [name, data.score])
    ),
    matchedKeywords: topCategory[1].matched
  };
}

/**
 * Detect category with simple string output (convenience function)
 */
export function detectCategorySimple(title: string, description?: string): string {
  const result = detectCategory(title, description);
  return result.category;
}
