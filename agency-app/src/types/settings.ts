// src/types/settings.ts
// Application-wide settings and configuration

/**
 * A single offer template version.
 * V1 is always the default fallback.
 */
export interface OfferTemplateVersion {
  id: string;              // "v1", "v2", etc.
  name: string;            // Display name ("Default", "Agency Outreach")
  offerTemplate: string;   // HTML body
  offerHeadline: string;   // HTML headline
  labels: string[];        // Company labels this version targets (empty for V1 = default)
  isDefault: boolean;      // true only for V1
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Main settings interface for the application
 */
export interface AppSettings {
  // Offer Template Configuration
  offerTemplate: string;
  offerHeadline?: string;

  // Offer Template Versioning
  offerTemplateVersions?: OfferTemplateVersion[];

  // AI Prompts Configuration (Future)
  aiPrompts?: {
    leadEnrichment?: string;
    emailGeneration?: string;
    blogAnalysis?: string;
    writingProgramAnalysis?: string;
  };

  // AI Trends Configuration
  aiTrendsPrompt?: string;
  aiTrendsDefaultEmailCount?: number;

  // LinkedIn Post Generation Configuration
  linkedInPostPrompt?: string;
  linkedInCondensedInsightsPrompt?: string;

  // Post Ideas System Configuration (5 prompts)
  postIdeasPrompts?: {
    analyticsAnalysis?: string;
    newsletterTrends?: string;
    competitorInsights?: string;
    ideasGeneration?: string;
    fullPostGeneration?: string;
  };

  // DALL-E Image Generation Configuration
  dalleImageStylePrompt?: string;

  // Follow-Up Email Template
  followUpTemplate?: string; // HTML body for follow-up emails
  followUpSubject?: string; // Subject override (defaults to "Re: <original subject>")

  // Metadata
  updatedAt: Date;
  updatedBy: string; // User ID who last updated settings
  createdAt?: Date;
}

/**
 * Form data for updating settings
 */
export interface UpdateSettingsRequest {
  offerTemplate?: string;
  offerHeadline?: string;
  offerTemplateVersions?: OfferTemplateVersion[];
  aiPrompts?: AppSettings['aiPrompts'];
  aiTrendsPrompt?: string;
  aiTrendsDefaultEmailCount?: number;
  linkedInPostPrompt?: string;
  linkedInCondensedInsightsPrompt?: string;
  postIdeasPrompts?: AppSettings['postIdeasPrompts'];
  dalleImageStylePrompt?: string;
  followUpTemplate?: string;
  followUpSubject?: string;
}

/**
 * Default offer template with standard variables
 */
export const DEFAULT_OFFER_TEMPLATE = `Hi {{name}},

I noticed you work at {{company}} as a {{job}}. We specialize in...

[Your offer details here]

Best regards`;

/**
 * Template variable interface
 */
export interface TemplateVariable {
  key: string;
  description: string;
  category: 'basic' | 'outreach' | 'custom' | 'dates' | 'company';
  example?: string;
}

/**
 * Default template variables (basic fields only)
 * For dynamic variables including custom fields, use buildTemplateVariables() from templateVariablesService
 */
export const DEFAULT_TEMPLATE_VARIABLES: TemplateVariable[] = [
  { key: '{{name}}', description: 'Lead name', category: 'basic', example: 'John Doe' },
  { key: '{{email}}', description: 'Lead email', category: 'basic', example: 'john@example.com' },
  { key: '{{company}}', description: 'Company name', category: 'basic', example: 'Acme Corporation' },
  { key: '{{phone}}', description: 'Phone number', category: 'basic', example: '+1 (555) 123-4567' },
  { key: '{{status}}', description: 'Lead status', category: 'basic', example: 'Qualified' },
];
