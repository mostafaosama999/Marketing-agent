// src/types/settings.ts
// Application-wide settings and configuration

/**
 * Main settings interface for the application
 */
export interface AppSettings {
  // Offer Template Configuration
  offerTemplate: string;
  offerHeadline?: string;

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
  aiPrompts?: AppSettings['aiPrompts'];
  aiTrendsPrompt?: string;
  aiTrendsDefaultEmailCount?: number;
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
