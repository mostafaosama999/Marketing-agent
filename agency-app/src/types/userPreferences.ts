// src/types/userPreferences.ts

export interface UserPreferences {
  // Apollo lead discovery preferences
  apolloJobTitles?: string[];

  // Default LinkedIn DM template id (used by the Copy DM action on outbound candidates
  // that have no skill-generated draftOutreach). Points to a doc in the shared
  // `linkedinDmTemplates` collection.
  defaultLinkedinDmTemplateId?: string | null;
}
