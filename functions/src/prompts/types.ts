// src/prompts/types.ts
// Types and utilities for AI prompt templates

/**
 * Prompt template function type
 * Takes typed variables and returns the formatted prompt string
 */
export type PromptTemplate<T = Record<string, any>> = (variables: T) => string;

/**
 * Metadata for prompt versioning and tracking
 */
export interface PromptMetadata {
  name: string;
  description: string;
  version: string;
  author: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

/**
 * Prompt with metadata wrapper
 */
export interface PromptWithMetadata<T = Record<string, any>> {
  template: PromptTemplate<T>;
  metadata: PromptMetadata;
}

/**
 * Helper to create a versioned prompt with metadata
 */
export function createPrompt<T = Record<string, any>>(
  template: PromptTemplate<T>,
  metadata: Omit<PromptMetadata, 'createdAt' | 'updatedAt'>
): PromptWithMetadata<T> {
  return {
    template,
    metadata: {
      ...metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
}

/**
 * Helper to extract just the template function from a prompt with metadata
 */
export function getTemplate<T = Record<string, any>>(
  prompt: PromptWithMetadata<T>
): PromptTemplate<T> {
  return prompt.template;
}
