/**
 * AI Concepts Types - For Dynamic Blog Idea Generation
 *
 * These types support the V2 enhancement that extracts AI concepts
 * from real-time sources (HN, arXiv, RSS) and matches them to companies.
 */

/**
 * Raw signal from external sources (before LLM extraction)
 */
export interface RawSignal {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: "hackernews" | "arxiv" | "rundown" | "importai";
  publishedAt: Date;
  score?: number; // HN points, arXiv citations, etc.
}

/**
 * AI Concept extracted from raw signals
 */
export interface AIConcept {
  id: string;
  name: string; // e.g., "Agentic AI", "RAG", "MCP"
  description: string; // What is this concept?
  whyHot: string; // Why is it trending now?
  useCases: string[]; // Common applications
  keywords: string[]; // For matching to company tech stack
  category:
    | "paradigm" // Agentic AI, Multimodal
    | "technique" // RAG, Fine-tuning, RLHF
    | "protocol" // MCP, A2A
    | "architecture" // Mixture of Experts, Transformers
    | "tool"; // Frameworks, libraries
  hypeLevel:
    | "emerging" // Just starting to gain traction
    | "peak" // Maximum buzz right now
    | "maturing" // Still relevant but hype declining
    | "declining"; // Fading from discourse
  lastUpdated: Date;
}

/**
 * Result of matching an AI concept to a company
 */
export interface MatchedConcept {
  concept: AIConcept;
  fitScore: number; // 0-100, only concepts >= 70 are included
  fitReason: string; // Why this concept fits this company
  productIntegration: string; // How their product could use this concept
  tutorialAngle: string; // Suggested tutorial title angle
}

/**
 * Cached AI concepts in Firestore
 */
export interface CachedConcepts {
  concepts: AIConcept[];
  extractedAt: Date;
  expiresAt: Date;
  rawSignalCount: number;
  sources: string[];
}

/**
 * Response from concept extraction
 */
export interface ConceptExtractionResult {
  concepts: AIConcept[];
  rawSignalCount: number;
  extractionCost: number;
  cached: boolean;
  /** How old the concepts are in hours (0 if fresh) */
  ageHours?: number;
  /** Whether concepts are from an expired/stale cache (still usable, just old) */
  stale?: boolean;
}

/**
 * Response from concept matching
 */
export interface ConceptMatchingResult {
  matchedConcepts: MatchedConcept[];
  totalConceptsEvaluated: number;
  matchingCost: number;
}
