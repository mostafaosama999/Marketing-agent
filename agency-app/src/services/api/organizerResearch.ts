// src/services/api/organizerResearch.ts

import { getFunctions, httpsCallable } from 'firebase/functions';
import { OrganizerResearch } from '../../types/event';

const functions = getFunctions();

interface ResearchOrganizerRequest {
  eventId: string;
  eventName: string;
  organizerName?: string;
  eventWebsite?: string;
  eventType: string;
  eventCategory: 'client' | 'educational';
}

export async function researchOrganizer(params: ResearchOrganizerRequest): Promise<OrganizerResearch> {
  try {
    const callable = httpsCallable<ResearchOrganizerRequest, OrganizerResearch>(
      functions,
      'researchEventOrganizer'
    );

    const result = await callable(params);
    return result.data;
  } catch (error) {
    console.error('Error researching event organizer:', error);
    throw new Error(
      `Failed to research event organizer: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
