// src/utils/outreachHelpers.ts
// Shared helpers for extracting outreach dates and response flags from leads.
// Mirrors the logic used in LeadAnalytics / OutreachActivityTable / OutreachResponseModal.
import { Lead } from '../types/lead';

/** Get LinkedIn contact date from custom fields or outreach object */
export const getLinkedInDate = (lead: Lead): Date | null => {
  if (lead.customFields?.linkedin_date_of_linkedin_contact) {
    const date = new Date(lead.customFields.linkedin_date_of_linkedin_contact);
    if (!isNaN(date.getTime())) return date;
  }

  if (lead.outreach?.linkedIn?.sentAt) {
    return lead.outreach.linkedIn.sentAt instanceof Date
      ? lead.outreach.linkedIn.sentAt
      : new Date(lead.outreach.linkedIn.sentAt);
  }

  return null;
};

/** Get email contact date from custom fields or outreach object */
export const getEmailDate = (lead: Lead): Date | null => {
  if (lead.customFields?.email_date_sending_email) {
    const date = new Date(lead.customFields.email_date_sending_email);
    if (!isNaN(date.getTime())) return date;
  }

  if (lead.outreach?.email?.sentAt) {
    return lead.outreach.email.sentAt instanceof Date
      ? lead.outreach.email.sentAt
      : new Date(lead.outreach.email.sentAt);
  }

  return null;
};

/** Shared positive-response check for a raw response value */
const isPositiveResponse = (response: string | undefined): boolean | null => {
  if (!response) return null; // no value present — caller should fall back to status

  if (
    response === 'No Response' ||
    response === 'Not Interested' ||
    response === '-' ||
    response.trim() === ''
  ) {
    return false;
  }

  // New dropdown values (exact match) - positive responses only
  if (
    response === 'Interested' ||
    response === 'Meeting Scheduled' ||
    response === 'Referred Us'
  ) {
    return true;
  }

  // Legacy text values
  const lowerResponse = response.toLowerCase();
  if (lowerResponse.includes('not interested') || lowerResponse.includes('no response')) {
    return false;
  }
  return lowerResponse.includes('replied') ||
         lowerResponse.includes('responded') ||
         lowerResponse.includes('accepted') ||
         lowerResponse.includes('agreed');
};

/** Check if lead has a positive LinkedIn response */
export const hasLinkedInResponse = (lead: Lead): boolean => {
  const response = lead.customFields?.linkedin_lead_response ||
                   lead.customFields?.lead_response ||
                   lead.customFields?.['LEAD RESPONSE'] ||
                   lead.customFields?.['Lead Response'] ||
                   lead.customFields?.['lead response'];

  const result = isPositiveResponse(response);
  if (result !== null) return result;

  return lead.outreach?.linkedIn?.status === 'replied';
};

/** Check if lead has a positive email response */
export const hasEmailResponse = (lead: Lead): boolean => {
  const response = lead.customFields?.email_lead_response ||
                   lead.customFields?.email_email_lead_response ||
                   lead.customFields?.lead_response ||
                   lead.customFields?.['LEAD RESPONSE'] ||
                   lead.customFields?.['Lead Response'] ||
                   lead.customFields?.['lead response'];

  const result = isPositiveResponse(response);
  if (result !== null) return result;

  return lead.outreach?.email?.status === 'replied';
};
