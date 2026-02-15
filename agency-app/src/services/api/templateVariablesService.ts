// src/services/api/templateVariablesService.ts
// Service for building dynamic template variables from lead and company data

import { Lead } from '../../types/lead';
import { Company } from '../../types/crm';

export interface TemplateVariable {
  key: string;
  description: string;
  category: 'basic' | 'outreach' | 'custom' | 'dates' | 'company';
  example?: string;
}

/**
 * Build template variables from leads and companies data
 * Scans actual data to discover all available fields dynamically
 */
export function buildTemplateVariables(leads: Lead[], companies: Company[]): TemplateVariable[] {
  const variables: TemplateVariable[] = [];

  // ============================================
  // LEAD VARIABLES
  // ============================================

  // Basic Info Variables (always available)
  variables.push(
    { key: '{{name}}', description: 'Lead name', category: 'basic', example: 'John Doe' },
    { key: '{{email}}', description: 'Lead email', category: 'basic', example: 'john@example.com' },
    { key: '{{phone}}', description: 'Phone number', category: 'basic', example: '+1 (555) 123-4567' },
    { key: '{{company}}', description: 'Company name', category: 'basic', example: 'Acme Corporation' },
    { key: '{{status}}', description: 'Lead status', category: 'basic', example: 'Qualified' },
  );

  // Outreach Variables (check if any lead has outreach data)
  const hasOutreach = leads.some(l => l.outreach);
  if (hasOutreach) {
    variables.push(
      { key: '{{linkedin_status}}', description: 'LinkedIn outreach status', category: 'outreach', example: 'Sent' },
      { key: '{{linkedin_url}}', description: 'LinkedIn profile URL', category: 'outreach', example: 'https://linkedin.com/in/...' },
      { key: '{{email_status}}', description: 'Email outreach status', category: 'outreach', example: 'Opened' },
    );
  }

  // Date Variables (always available)
  variables.push(
    { key: '{{created_date}}', description: 'Lead created date', category: 'dates', example: 'Jan 15, 2025' },
    { key: '{{updated_date}}', description: 'Lead updated date', category: 'dates', example: 'Jan 20, 2025' },
  );

  // Lead Custom Fields - scan all leads for unique custom field names
  const leadCustomFields = new Set<string>();
  leads.forEach(lead => {
    if (lead.customFields) {
      Object.keys(lead.customFields).forEach(fieldName => {
        leadCustomFields.add(fieldName);
      });
    }
  });

  leadCustomFields.forEach(fieldName => {
    const description = fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    variables.push({
      key: `{{${fieldName}}}`,
      description: description,
      category: 'custom',
      example: 'Custom field value',
    });
  });

  // ============================================
  // COMPANY VARIABLES
  // ============================================

  // Company Basic Fields
  if (companies.some(c => c.website)) {
    variables.push({ key: '{{company_website}}', description: 'Company website', category: 'company', example: 'https://example.com' });
  }
  if (companies.some(c => c.industry)) {
    variables.push({ key: '{{company_industry}}', description: 'Company industry', category: 'company', example: 'Technology' });
  }
  if (companies.some(c => c.description)) {
    variables.push({ key: '{{company_description}}', description: 'Company description', category: 'company', example: 'AI-powered platform' });
  }

  // Company Custom Fields - scan all companies for unique custom field names
  const companyCustomFields = new Set<string>();
  companies.forEach(company => {
    if (company.customFields) {
      Object.keys(company.customFields).forEach(fieldName => {
        companyCustomFields.add(fieldName);
      });
    }
  });

  companyCustomFields.forEach(fieldName => {
    const description = 'Company: ' + fieldName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    variables.push({
      key: `{{company_${fieldName}}}`,
      description: description,
      category: 'company',
      example: 'Company custom field value',
    });
  });

  // Apollo Enrichment Data - check if any company has Apollo data
  const hasApolloData = companies.some(c => c.apolloEnrichment);
  if (hasApolloData) {
    if (companies.some(c => c.apolloEnrichment?.employeeCount)) {
      variables.push({ key: '{{company_employees}}', description: 'Employee count', category: 'company', example: '250' });
    }
    if (companies.some(c => c.apolloEnrichment?.employeeRange)) {
      variables.push({ key: '{{company_employee_range}}', description: 'Employee range', category: 'company', example: '201-500' });
    }
    if (companies.some(c => c.apolloEnrichment?.foundedYear)) {
      variables.push({ key: '{{company_founded}}', description: 'Founded year', category: 'company', example: '2018' });
    }
    if (companies.some(c => c.apolloEnrichment?.totalFundingFormatted)) {
      variables.push({ key: '{{company_funding}}', description: 'Total funding', category: 'company', example: '$15.5M' });
    }
    if (companies.some(c => c.apolloEnrichment?.technologies && c.apolloEnrichment.technologies.length > 0)) {
      variables.push({ key: '{{company_technologies}}', description: 'Technologies used', category: 'company', example: 'React, Node.js, AWS' });
    }
  }

  // Blog Audit offer paragraph (sent to prospects)
  if (companies.some(c => c.offerAnalysis?.blogAudit?.offerParagraph)) {
    variables.push({
      key: '{{blog_audit}}',
      description: 'Blog audit paragraph (sent to prospect)',
      category: 'company',
      example: 'Your blog publishes 2x/month on API tutorials, while Competitor posts weekly with...',
    });
  }

  return variables;
}

/**
 * Group template variables by category
 */
export function groupVariablesByCategory(variables: TemplateVariable[]): Record<string, TemplateVariable[]> {
  return variables.reduce((acc, variable) => {
    if (!acc[variable.category]) {
      acc[variable.category] = [];
    }
    acc[variable.category].push(variable);
    return acc;
  }, {} as Record<string, TemplateVariable[]>);
}

/**
 * Get category display name
 */
export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    basic: 'Basic Info',
    outreach: 'Outreach',
    custom: 'Custom Fields',
    dates: 'Dates',
    company: 'Company Info',
  };
  return labels[category] || category;
}

/**
 * Replace template variables in text with actual values from a lead and optional company
 */
export function replaceTemplateVariables(
  template: string,
  lead: Partial<Lead>,
  company?: Company | null
): string {
  let result = template;

  // ============================================
  // LEAD FIELDS
  // ============================================

  // Basic fields
  result = result.replace(/\{\{name\}\}/g, lead.name || '');
  result = result.replace(/\{\{email\}\}/g, lead.email || '');
  result = result.replace(/\{\{phone\}\}/g, lead.phone || '');
  result = result.replace(/\{\{company\}\}/g, lead.company || lead.companyName || '');
  result = result.replace(/\{\{status\}\}/g, lead.status || '');

  // Outreach fields
  result = result.replace(/\{\{linkedin_status\}\}/g, lead.outreach?.linkedIn?.status || 'not_sent');
  result = result.replace(/\{\{linkedin_url\}\}/g, lead.outreach?.linkedIn?.profileUrl || '');
  result = result.replace(/\{\{email_status\}\}/g, lead.outreach?.email?.status || 'not_sent');

  // Date fields
  if (lead.createdAt) {
    const createdDate = lead.createdAt instanceof Date ? lead.createdAt : new Date(lead.createdAt);
    result = result.replace(/\{\{created_date\}\}/g, createdDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }));
  }
  if (lead.updatedAt) {
    const updatedDate = lead.updatedAt instanceof Date ? lead.updatedAt : new Date(lead.updatedAt);
    result = result.replace(/\{\{updated_date\}\}/g, updatedDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }));
  }

  // Lead custom fields
  if (lead.customFields) {
    Object.entries(lead.customFields).forEach(([fieldName, value]) => {
      const regex = new RegExp(`\\{\\{${fieldName}\\}\\}`, 'g');
      result = result.replace(regex, String(value || ''));
    });
  }

  // ============================================
  // COMPANY FIELDS
  // ============================================

  if (company) {
    // Basic company fields
    result = result.replace(/\{\{company_website\}\}/g, company.website || '');
    result = result.replace(/\{\{company_industry\}\}/g, company.industry || '');
    result = result.replace(/\{\{company_description\}\}/g, company.description || '');

    // Company custom fields
    if (company.customFields) {
      Object.entries(company.customFields).forEach(([fieldName, value]) => {
        const regex = new RegExp(`\\{\\{company_${fieldName}\\}\\}`, 'g');
        result = result.replace(regex, String(value || ''));
      });
    }

    // Apollo enrichment
    if (company.apolloEnrichment) {
      const apollo = company.apolloEnrichment;
      result = result.replace(/\{\{company_employees\}\}/g, apollo.employeeCount?.toString() || '');
      result = result.replace(/\{\{company_employee_range\}\}/g, apollo.employeeRange || '');
      result = result.replace(/\{\{company_founded\}\}/g, apollo.foundedYear?.toString() || '');
      result = result.replace(/\{\{company_funding\}\}/g, apollo.totalFundingFormatted || '');
      result = result.replace(/\{\{company_technologies\}\}/g, apollo.technologies?.join(', ') || '');
    }

    // Blog audit offer paragraph
    if (company.offerAnalysis?.blogAudit?.offerParagraph) {
      result = result.replace(/\{\{blog_audit\}\}/g, company.offerAnalysis.blogAudit.offerParagraph);
    } else {
      result = result.replace(/\{\{blog_audit\}\}/g, '');
    }
  }

  return result;
}
