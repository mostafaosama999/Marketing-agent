/**
 * Built-in Dropdowns Service
 *
 * Manages field definitions for built-in dropdown types like LinkedIn and Email status.
 * These were previously hardcoded but are now configurable through field definitions.
 */

import {
  createFieldDefinition,
  getFieldDefinitionByName,
  fieldDefinitionExists,
} from './fieldDefinitionsService';
import { CreateFieldDefinitionData } from '../../types/fieldDefinitions';

/**
 * Default LinkedIn status values
 */
export const DEFAULT_LINKEDIN_STATUSES = [
  'not_sent',
  'sent',
  'opened',
  'replied',
  'refused',
  'no_response',
];

/**
 * Default Email status values
 */
export const DEFAULT_EMAIL_STATUSES = [
  'not_sent',
  'sent',
  'opened',
  'replied',
  'bounced',
  'refused',
  'no_response',
];

/**
 * LinkedIn status display labels
 */
export const LINKEDIN_STATUS_LABELS: Record<string, string> = {
  not_sent: 'Not Sent',
  sent: 'Sent',
  opened: 'Opened',
  replied: 'Replied',
  refused: 'Refused',
  no_response: 'No Response',
};

/**
 * Email status display labels
 */
export const EMAIL_STATUS_LABELS: Record<string, string> = {
  not_sent: 'Not Sent',
  sent: 'Sent',
  opened: 'Opened',
  replied: 'Replied',
  bounced: 'Bounced',
  refused: 'Refused',
  no_response: 'No Response',
};

/**
 * Initialize LinkedIn status field definition if it doesn't exist
 */
export const initializeLinkedInStatusField = async (userId: string): Promise<void> => {
  const fieldName = 'linkedin_status';
  const exists = await fieldDefinitionExists('lead', fieldName);

  if (!exists) {
    const fieldData: CreateFieldDefinitionData = {
      name: fieldName,
      label: 'LinkedIn Status',
      entityType: 'lead',
      fieldType: 'dropdown',
      section: 'linkedin',
      options: DEFAULT_LINKEDIN_STATUSES,
      required: false,
    };

    await createFieldDefinition(fieldData, userId);
  }
};

/**
 * Initialize Email status field definition if it doesn't exist
 */
export const initializeEmailStatusField = async (userId: string): Promise<void> => {
  const fieldName = 'email_status';
  const exists = await fieldDefinitionExists('lead', fieldName);

  if (!exists) {
    const fieldData: CreateFieldDefinitionData = {
      name: fieldName,
      label: 'Email Status',
      entityType: 'lead',
      fieldType: 'dropdown',
      section: 'email',
      options: DEFAULT_EMAIL_STATUSES,
      required: false,
    };

    await createFieldDefinition(fieldData, userId);
  }
};

/**
 * Initialize all built-in dropdown field definitions
 */
export const initializeBuiltInDropdowns = async (userId: string): Promise<void> => {
  try {
    await Promise.all([
      initializeLinkedInStatusField(userId),
      initializeEmailStatusField(userId),
    ]);
  } catch (error) {
    console.error('❌ Error initializing built-in dropdown fields:', error);
    throw error;
  }
};

/**
 * Get LinkedIn status options from field definition
 * Falls back to defaults if field definition doesn't exist
 */
export const getLinkedInStatusOptions = async (): Promise<string[]> => {
  try {
    const fieldDef = await getFieldDefinitionByName('lead', 'linkedin_status');
    return fieldDef?.options || DEFAULT_LINKEDIN_STATUSES;
  } catch (error) {
    console.error('Error fetching LinkedIn status options:', error);
    return DEFAULT_LINKEDIN_STATUSES;
  }
};

/**
 * Get Email status options from field definition
 * Falls back to defaults if field definition doesn't exist
 */
export const getEmailStatusOptions = async (): Promise<string[]> => {
  try {
    const fieldDef = await getFieldDefinitionByName('lead', 'email_status');
    return fieldDef?.options || DEFAULT_EMAIL_STATUSES;
  } catch (error) {
    console.error('Error fetching Email status options:', error);
    return DEFAULT_EMAIL_STATUSES;
  }
};

/**
 * Get display label for LinkedIn status
 */
export const getLinkedInStatusLabel = (status: string): string => {
  return LINKEDIN_STATUS_LABELS[status] || status;
};

/**
 * Get display label for Email status
 */
export const getEmailStatusLabel = (status: string): string => {
  return EMAIL_STATUS_LABELS[status] || status;
};
