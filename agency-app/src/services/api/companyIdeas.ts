// src/services/api/companyIdeas.ts
// Service for managing AI-generated blog ideas for companies

import { getFunctions, httpsCallable } from 'firebase/functions';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { Company } from '../../types/crm';

const functions = getFunctions();

// Types for idea generation
export interface GeneratedIdea {
  id: string;
  title: string;
  content: string;
  approved: boolean;
  rejected: boolean;
  feedback?: string;
  createdAt: Date;
}

export interface GenerateIdeasRequest {
  companyId: string;
  prompt: string;
  context?: {
    companyName?: string;
    website?: string;
    industry?: string;
    blogUrl?: string;
  };
}

export interface GenerateIdeasResponse {
  ideas: GeneratedIdea[];
  totalGenerated: number;
  sessionId: string;
  costInfo?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    inputCost: number;
    outputCost: number;
    totalCost: number;
  };
}

/**
 * Generate AI-powered blog ideas for a company
 * Calls the cloud function to generate 5-10 structured ideas
 */
export async function generateIdeasForCompany(
  request: GenerateIdeasRequest
): Promise<GenerateIdeasResponse> {
  try {
    console.log('Generating ideas for company:', request.companyId);

    const generateIdeas = httpsCallable<GenerateIdeasRequest, GenerateIdeasResponse>(
      functions,
      'generateCustomIdeasCloud'
    );

    const result = await generateIdeas(request);

    console.log(`Generated ${result.data.ideas.length} ideas`, {
      sessionId: result.data.sessionId,
      cost: result.data.costInfo?.totalCost,
    });

    return result.data;
  } catch (error: any) {
    console.error('Error generating ideas:', error);
    throw new Error(error.message || 'Failed to generate ideas. Please try again.');
  }
}

/**
 * Save approved ideas to the company record
 * Updates the offerIdeas field with approved ideas and feedback
 */
export async function saveApprovedIdeas(
  companyId: string,
  ideas: GeneratedIdea[],
  generalFeedback?: string,
  generationPrompt?: string,
  sessionId?: string
): Promise<void> {
  try {
    console.log('Saving approved ideas for company:', companyId, {
      count: ideas.filter(i => i.approved).length,
    });

    const companyRef = doc(db, 'entities', companyId);

    const approvedIdeas = ideas.filter(idea => idea.approved);

    if (approvedIdeas.length === 0) {
      throw new Error('No approved ideas to save');
    }

    await updateDoc(companyRef, {
      'offerIdeas.ideas': ideas,
      'offerIdeas.sessionId': sessionId || null,
      'offerIdeas.generationPrompt': generationPrompt || null,
      'offerIdeas.lastGeneratedAt': serverTimestamp(),
      'offerIdeas.generalFeedback': generalFeedback || null,
      updatedAt: serverTimestamp(),
    });

    console.log('Successfully saved approved ideas');
  } catch (error: any) {
    console.error('Error saving approved ideas:', error);
    throw new Error(error.message || 'Failed to save approved ideas');
  }
}

/**
 * Clear generated ideas from the company record
 * Used when regenerating or canceling the review process
 */
export async function clearGeneratedIdeas(companyId: string): Promise<void> {
  try {
    console.log('Clearing generated ideas for company:', companyId);

    const companyRef = doc(db, 'entities', companyId);

    await updateDoc(companyRef, {
      'offerIdeas.ideas': [],
      'offerIdeas.sessionId': null,
      'offerIdeas.generationPrompt': null,
      'offerIdeas.lastGeneratedAt': null,
      'offerIdeas.generalFeedback': null,
      updatedAt: serverTimestamp(),
    });

    console.log('Successfully cleared ideas');
  } catch (error: any) {
    console.error('Error clearing ideas:', error);
    throw new Error(error.message || 'Failed to clear ideas');
  }
}

/**
 * Get approved ideas from a company record
 */
export function getApprovedIdeas(company: Company): GeneratedIdea[] {
  if (!company.offerIdeas?.ideas) {
    return [];
  }

  return company.offerIdeas.ideas.filter(idea => idea.approved);
}

/**
 * Check if company has any approved ideas
 */
export function hasApprovedIdeas(company: Company): boolean {
  return getApprovedIdeas(company).length > 0;
}

/**
 * Get pending (not yet approved/rejected) ideas
 */
export function getPendingIdeas(company: Company): GeneratedIdea[] {
  if (!company.offerIdeas?.ideas) {
    return [];
  }

  return company.offerIdeas.ideas.filter(
    idea => !idea.approved && !idea.rejected
  );
}
