// src/services/api/advancedFilterService.ts
// Service for evaluating advanced filter rules against leads

import { Lead, LeadStatus } from '../../types/lead';
import { Company } from '../../types/crm';
import { FilterRule, FilterOperator, FilterableField } from '../../types/filter';
import { CrossEntityFilterContext } from '../../types/crossEntityFilter';
import { getFieldDefinitions } from './fieldDefinitionsService';
import { FieldDefinition } from '../../types/fieldDefinitions';
import { getCompanyFilterableFields } from './companyFilterService';
import {
  evaluateLeadCrossEntityRule,
  evaluateRulesWithLogicGates,
} from './crossEntityFilterService';

/**
 * Get all filterable fields from standard Lead fields + custom fields from actual leads
 * @param leads - Array of leads to extract fields from
 * @param pipelineStages - Optional array of pipeline stage IDs to use for status options
 * @param fieldDefinitions - Optional pre-fetched field definitions to avoid async call
 */
export function getFilterableFields(
  leads: Lead[],
  pipelineStages?: LeadStatus[],
  fieldDefinitions?: FieldDefinition[]
): FilterableField[] {
  // Determine status options: use pipelineStages if provided, otherwise extract from leads
  let statusOptions: string[];
  if (pipelineStages && pipelineStages.length > 0) {
    statusOptions = pipelineStages;
  } else {
    // Fallback: extract unique statuses from actual leads
    const uniqueStatuses = new Set<string>();
    leads.forEach(lead => {
      if (lead.status) {
        uniqueStatuses.add(lead.status);
      }
    });
    statusOptions = Array.from(uniqueStatuses).sort();
  }

  // Standard lead fields
  const standardFields: FilterableField[] = [
    { name: 'name', label: 'Name', type: 'text', isCustomField: false },
    { name: 'email', label: 'Email', type: 'text', isCustomField: false },
    { name: 'phone', label: 'Phone', type: 'text', isCustomField: false },
    { name: 'company', label: 'Company', type: 'text', isCustomField: false },
    { name: 'status', label: 'Status', type: 'select', options: statusOptions, isCustomField: false },
    { name: 'linkedin_status', label: 'LinkedIn Status', type: 'select', options: ['not_sent', 'sent', 'opened', 'replied', 'refused', 'no_response'], isCustomField: false },
    { name: 'email_outreach_status', label: 'Email Outreach Status', type: 'select', options: ['not_sent', 'sent', 'opened', 'replied', 'bounced', 'refused', 'no_response'], isCustomField: false },
    { name: 'createdAt', label: 'Created Date', type: 'date', isCustomField: false },
    { name: 'updatedAt', label: 'Updated Date', type: 'date', isCustomField: false },
  ];

  // Extract unique custom field names from all leads
  const customFieldNames = new Set<string>();
  leads.forEach(lead => {
    if (lead.customFields) {
      Object.keys(lead.customFields).forEach(fieldName => {
        customFieldNames.add(fieldName);
      });
    }
  });

  // Create a lookup map for field definitions if provided
  const fieldDefMap = fieldDefinitions
    ? new Map(fieldDefinitions.map(def => [def.name, def]))
    : new Map<string, FieldDefinition>();

  // Create filterable fields for each custom field
  const customFilterableFields: FilterableField[] = Array.from(customFieldNames)
    .sort()
    .map(fieldName => {
      const fieldDef = fieldDefMap.get(fieldName);

      // Use label from field definition if available, otherwise generate from field name
      const label = fieldDef?.label ||
        (fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' '));

      // Determine field type from definition
      const fieldType = fieldDef?.fieldType;
      let type: 'text' | 'number' | 'date' | 'select' = 'text';
      let options: string[] | undefined;

      if (fieldType === 'dropdown' && fieldDef?.options) {
        type = 'select';
        options = fieldDef.options;
      } else if (fieldType === 'number') {
        type = 'number';
      } else if (fieldType === 'date') {
        type = 'date';
      }

      return {
        name: fieldName,
        label,
        type,
        options,
        isCustomField: true,
      };
    });

  return [...standardFields, ...customFilterableFields];
}

/**
 * Async version of getFilterableFields that fetches field definitions from Firestore
 * @param leads - Array of leads to extract fields from
 * @param pipelineStages - Optional array of pipeline stage IDs to use for status options
 */
export async function getFilterableFieldsAsync(
  leads: Lead[],
  pipelineStages?: LeadStatus[]
): Promise<FilterableField[]> {
  try {
    const fieldDefinitions = await getFieldDefinitions('lead');
    return getFilterableFields(leads, pipelineStages, fieldDefinitions);
  } catch (error) {
    console.error('Error fetching field definitions for filters:', error);
    // Fallback to without field definitions
    return getFilterableFields(leads, pipelineStages);
  }
}

/**
 * Get available operators for a field type
 */
export function getOperatorsForFieldType(fieldType: 'text' | 'number' | 'date' | 'select' | 'boolean'): { value: FilterOperator; label: string }[] {
  switch (fieldType) {
    case 'text':
      return [
        { value: 'contains', label: 'Contains' },
        { value: 'not_contains', label: 'Does not contain' },
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Does not equal' },
        { value: 'starts_with', label: 'Starts with' },
        { value: 'ends_with', label: 'Ends with' },
        { value: 'is_empty', label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' },
      ];
    case 'number':
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Does not equal' },
        { value: 'greater_than', label: 'Greater than' },
        { value: 'less_than', label: 'Less than' },
        { value: 'greater_than_equal', label: 'Greater than or equal' },
        { value: 'less_than_equal', label: 'Less than or equal' },
        { value: 'is_empty', label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' },
      ];
    case 'date':
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'before', label: 'Before' },
        { value: 'after', label: 'After' },
        { value: 'between', label: 'Between' },
        { value: 'is_empty', label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' },
      ];
    case 'select':
      return [
        { value: 'is_one_of', label: 'Is one of' },
        { value: 'is_none_of', label: 'Is none of' },
        { value: 'is_empty', label: 'Is empty' },
        { value: 'is_not_empty', label: 'Is not empty' },
      ];
    case 'boolean':
      return [
        { value: 'is_true', label: 'Is true' },
        { value: 'is_false', label: 'Is false' },
      ];
    default:
      return [
        { value: 'equals', label: 'Equals' },
        { value: 'not_equals', label: 'Does not equal' },
      ];
  }
}

/**
 * Get the value from a lead for a given field name
 * Handles both standard fields and custom fields
 */
function getFieldValue(lead: Lead, fieldName: string): any {
  // Handle nested outreach fields
  if (fieldName === 'linkedin_status') {
    return lead.outreach?.linkedIn?.status;
  }
  if (fieldName === 'email_outreach_status') {
    return lead.outreach?.email?.status;
  }

  // Standard fields
  if (fieldName in lead) {
    return (lead as any)[fieldName];
  }

  // Custom fields
  if (lead.customFields && fieldName in lead.customFields) {
    return lead.customFields[fieldName];
  }

  return undefined;
}

/**
 * Evaluate a single filter rule against a lead
 */
export function evaluateRule(lead: Lead, rule: FilterRule): boolean {
  const fieldValue = getFieldValue(lead, rule.field);
  const operator = rule.operator;
  const ruleValue = rule.value;

  // Handle empty/not empty checks
  if (operator === 'is_empty') {
    return fieldValue === undefined || fieldValue === null || fieldValue === '';
  }
  if (operator === 'is_not_empty') {
    // For number fields, 0 is a valid non-empty value
    if (typeof fieldValue === 'number') {
      return true; // Any number (including 0) is considered non-empty
    }
    // For other field types, check for undefined, null, and empty string
    return fieldValue !== undefined && fieldValue !== null && fieldValue !== '';
  }

  // Handle boolean operators
  if (operator === 'is_true') {
    return fieldValue === true || fieldValue === 'true' || fieldValue === 1;
  }
  if (operator === 'is_false') {
    return fieldValue === false || fieldValue === 'false' || fieldValue === 0 || !fieldValue;
  }

  // If field value is empty and operator is not an empty check, return false
  if (fieldValue === undefined || fieldValue === null || fieldValue === '') {
    return false;
  }

  // Text operators
  if (operator === 'contains') {
    return String(fieldValue).toLowerCase().includes(String(ruleValue).toLowerCase());
  }
  if (operator === 'not_contains') {
    return !String(fieldValue).toLowerCase().includes(String(ruleValue).toLowerCase());
  }
  if (operator === 'equals') {
    // Handle dates
    if (fieldValue instanceof Date && ruleValue instanceof Date) {
      return fieldValue.toDateString() === ruleValue.toDateString();
    }
    return String(fieldValue).toLowerCase() === String(ruleValue).toLowerCase();
  }
  if (operator === 'not_equals') {
    // Handle dates
    if (fieldValue instanceof Date && ruleValue instanceof Date) {
      return fieldValue.toDateString() !== ruleValue.toDateString();
    }
    return String(fieldValue).toLowerCase() !== String(ruleValue).toLowerCase();
  }
  if (operator === 'starts_with') {
    return String(fieldValue).toLowerCase().startsWith(String(ruleValue).toLowerCase());
  }
  if (operator === 'ends_with') {
    return String(fieldValue).toLowerCase().endsWith(String(ruleValue).toLowerCase());
  }

  // Number operators
  if (operator === 'greater_than') {
    return Number(fieldValue) > Number(ruleValue);
  }
  if (operator === 'less_than') {
    return Number(fieldValue) < Number(ruleValue);
  }
  if (operator === 'greater_than_equal') {
    return Number(fieldValue) >= Number(ruleValue);
  }
  if (operator === 'less_than_equal') {
    return Number(fieldValue) <= Number(ruleValue);
  }

  // Date operators
  if (operator === 'before') {
    const dateValue = fieldValue instanceof Date ? fieldValue : new Date(fieldValue);
    const compareDate = ruleValue instanceof Date ? ruleValue : new Date(ruleValue);
    return dateValue < compareDate;
  }
  if (operator === 'after') {
    const dateValue = fieldValue instanceof Date ? fieldValue : new Date(fieldValue);
    const compareDate = ruleValue instanceof Date ? ruleValue : new Date(ruleValue);
    return dateValue > compareDate;
  }
  if (operator === 'between') {
    if (!Array.isArray(ruleValue) || ruleValue.length !== 2) return false;
    const dateValue = fieldValue instanceof Date ? fieldValue : new Date(fieldValue);
    const startDate = ruleValue[0] instanceof Date ? ruleValue[0] : new Date(ruleValue[0]);
    const endDate = ruleValue[1] instanceof Date ? ruleValue[1] : new Date(ruleValue[1]);
    return dateValue >= startDate && dateValue <= endDate;
  }

  // Select operators
  if (operator === 'is_one_of') {
    if (!Array.isArray(ruleValue)) return false;
    return ruleValue.includes(fieldValue);
  }
  if (operator === 'is_none_of') {
    if (!Array.isArray(ruleValue)) return false;
    return !ruleValue.includes(fieldValue);
  }

  // Default: return false for unknown operators
  return false;
}

/**
 * Apply filter rules to a list of leads
 * Returns filtered leads based on all rules combined with their logic gates
 */
export function applyAdvancedFilters(leads: Lead[], rules: FilterRule[]): Lead[] {
  if (rules.length === 0) {
    return leads;
  }

  return leads.filter(lead => {
    // Evaluate each rule and combine with logic gates
    let result = evaluateRule(lead, rules[0]);

    for (let i = 0; i < rules.length - 1; i++) {
      const currentRule = rules[i];
      const nextRule = rules[i + 1];
      const nextResult = evaluateRule(lead, nextRule);

      if (currentRule.logicGate === 'AND') {
        result = result && nextResult;
      } else if (currentRule.logicGate === 'OR') {
        result = result || nextResult;
      }
    }

    return result;
  });
}

/**
 * Generate a human-readable summary of a filter rule
 */
export function getFilterRuleSummary(rule: FilterRule, fields: FilterableField[]): string {
  const field = fields.find(f => f.name === rule.field);
  const fieldLabel = field?.label || rule.fieldLabel || rule.field;

  const operatorLabels: Record<FilterOperator, string> = {
    contains: 'contains',
    not_contains: 'does not contain',
    equals: 'equals',
    not_equals: 'does not equal',
    starts_with: 'starts with',
    ends_with: 'ends with',
    greater_than: 'is greater than',
    less_than: 'is less than',
    greater_than_equal: 'is greater than or equal to',
    less_than_equal: 'is less than or equal to',
    before: 'is before',
    after: 'is after',
    between: 'is between',
    is_one_of: 'is one of',
    is_none_of: 'is none of',
    is_empty: 'is empty',
    is_not_empty: 'is not empty',
    is_true: 'is true',
    is_false: 'is false',
  };

  const operatorLabel = operatorLabels[rule.operator] || rule.operator;

  // Format value
  let valueStr = '';
  if (rule.operator !== 'is_empty' && rule.operator !== 'is_not_empty' && rule.operator !== 'is_true' && rule.operator !== 'is_false') {
    if (Array.isArray(rule.value)) {
      valueStr = rule.value.join(', ');
    } else if (rule.value instanceof Date) {
      valueStr = rule.value.toLocaleDateString();
    } else {
      valueStr = String(rule.value);
    }
  }

  return `${fieldLabel} ${operatorLabel}${valueStr ? ' ' + valueStr : ''}`;
}

/**
 * Get company fields that can be used to filter leads by their linked company
 * @param companies - Array of companies to extract fields from
 * @param fieldDefinitions - Optional pre-fetched company field definitions
 */
export function getCompanyFieldsForLeadFilter(
  companies: Company[],
  fieldDefinitions?: FieldDefinition[]
): FilterableField[] {
  const companyFields = getCompanyFilterableFields(companies, fieldDefinitions);

  // Mark all fields as coming from 'company' entity and add entity label
  return companyFields.map(field => ({
    ...field,
    entitySource: 'company' as const,
    entityLabel: 'Linked Company',
  }));
}

/**
 * Get company fields from field definitions only (no company data needed)
 * Use this when you need to populate field dropdowns without loading all companies
 * @param fieldDefinitions - Optional pre-fetched field definitions
 */
export function getCompanyFieldsFromDefinitions(
  fieldDefinitions?: FieldDefinition[]
): FilterableField[] {
  // Standard company fields (same as in companyFilterService)
  const standardFields: FilterableField[] = [
    { name: 'name', label: 'Name', type: 'text', isCustomField: false },
    { name: 'website', label: 'Website', type: 'text', isCustomField: false },
    { name: 'industry', label: 'Industry', type: 'text', isCustomField: false },
    { name: 'description', label: 'Description', type: 'text', isCustomField: false },
    { name: 'ratingV2', label: 'Rating V2', type: 'number', isCustomField: false },
    { name: 'status', label: 'Status', type: 'select', options: ['new_lead', 'qualified', 'contacted', 'follow_up', 'nurture', 'won', 'lost', 'previous_client', 'existing_client'], isCustomField: false },
    { name: 'createdAt', label: 'Created Date', type: 'date', isCustomField: false },
    { name: 'updatedAt', label: 'Updated Date', type: 'date', isCustomField: false },
  ];

  // Apollo enrichment fields
  const apolloFields: FilterableField[] = [
    { name: 'apolloEnrichment.employeeCount', label: 'Employee Count', type: 'number', isCustomField: false },
    { name: 'apolloEnrichment.employeeRange', label: 'Employee Range', type: 'text', isCustomField: false },
    { name: 'apolloEnrichment.foundedYear', label: 'Founded Year', type: 'number', isCustomField: false },
    { name: 'apolloEnrichment.totalFundingFormatted', label: 'Total Funding', type: 'text', isCustomField: false },
    { name: 'apolloEnrichment.latestFundingStage', label: 'Funding Stage', type: 'text', isCustomField: false },
    { name: 'apolloEnrichment.latestFundingDate', label: 'Last Funding Date', type: 'date', isCustomField: false },
    { name: 'apolloEnrichment.technologies', label: 'Technologies', type: 'text', isCustomField: false },
    { name: 'apolloEnrichment.industries', label: 'Industries', type: 'text', isCustomField: false },
  ];

  // Blog analysis fields
  const blogFields: FilterableField[] = [
    { name: 'blogAnalysis.monthlyFrequency', label: 'Blog Posts per Month', type: 'number', isCustomField: false },
    { name: 'blogAnalysis.writers.count', label: 'Number of Writers', type: 'number', isCustomField: false },
    { name: 'blogAnalysis.blogNature.rating', label: 'Blog Quality Rating', type: 'select', options: ['low', 'medium', 'high'], isCustomField: false },
    { name: 'blogAnalysis.blogNature.isTechnical', label: 'Technical Blog', type: 'boolean', isCustomField: false },
    { name: 'blogAnalysis.blogNature.isAIWritten', label: 'AI Written Content', type: 'boolean', isCustomField: false },
    { name: 'blogAnalysis.isDeveloperB2BSaas', label: 'Is Developer B2B SaaS', type: 'boolean', isCustomField: false },
  ];

  // Writing program fields
  const writingProgramFields: FilterableField[] = [
    { name: 'writingProgramAnalysis.hasProgram', label: 'Has Writing Program', type: 'boolean', isCustomField: false },
    { name: 'writingProgramAnalysis.isOpen', label: 'Program is Open', type: 'boolean', isCustomField: false },
    { name: 'writingProgramAnalysis.payment.amount', label: 'Payment Amount', type: 'text', isCustomField: false },
    { name: 'writingProgramAnalysis.payment.method', label: 'Payment Method', type: 'text', isCustomField: false },
  ];

  // Create custom fields from field definitions
  const customFields: FilterableField[] = [];
  if (fieldDefinitions) {
    fieldDefinitions
      .filter(def => def.entityType === 'company')
      .forEach(def => {
        let type: 'text' | 'number' | 'date' | 'select' | 'boolean' = 'text';
        let options: string[] | undefined;

        if (def.fieldType === 'dropdown' && def.options) {
          type = 'select';
          options = def.options;
        } else if (def.fieldType === 'number') {
          type = 'number';
        } else if (def.fieldType === 'date') {
          type = 'date';
        }

        customFields.push({
          name: def.name,
          label: def.label || def.name,
          type,
          options,
          isCustomField: true,
        });
      });
  }

  // Combine all fields (always include all standard field types since we don't have actual data)
  const allFields = [
    ...standardFields,
    ...apolloFields,
    ...blogFields,
    ...writingProgramFields,
    ...customFields,
  ];

  // Mark all fields as coming from 'company' entity
  return allFields.map(field => ({
    ...field,
    entitySource: 'company' as const,
    entityLabel: 'Linked Company',
  }));
}

/**
 * Async version that fetches company field definitions from Firestore
 * Use this instead of getCompanyFieldsForLeadFilter when you don't have company data
 */
export async function getCompanyFieldsFromDefinitionsAsync(): Promise<FilterableField[]> {
  try {
    const fieldDefinitions = await getFieldDefinitions('company');
    return getCompanyFieldsFromDefinitions(fieldDefinitions);
  } catch (error) {
    console.error('Error fetching company field definitions:', error);
    // Fallback to standard fields only
    return getCompanyFieldsFromDefinitions(undefined);
  }
}

/**
 * Apply filter rules with cross-entity support
 * Handles both self (lead) rules and cross-entity (company) rules
 *
 * @param leads - Array of leads to filter
 * @param rules - Array of filter rules (may include company-sourced rules)
 * @param context - Optional cross-entity context with companiesMap
 */
export function applyAdvancedFiltersWithCrossEntity(
  leads: Lead[],
  rules: FilterRule[],
  context?: CrossEntityFilterContext
): Lead[] {
  if (rules.length === 0) {
    return leads;
  }

  // Separate self rules from cross-entity rules
  const selfRules = rules.filter(r => !r.entitySource || r.entitySource === 'self');
  const companyRules = rules.filter(r => r.entitySource === 'company');

  return leads.filter(lead => {
    // Evaluate self rules using existing logic
    let selfResult = true;
    if (selfRules.length > 0) {
      selfResult = evaluateRulesWithLogicGates(lead, selfRules, evaluateRule);
    }

    // Evaluate cross-entity (company) rules
    let companyResult = true;
    if (companyRules.length > 0 && context?.companiesMap) {
      companyResult = evaluateRulesWithLogicGates(
        lead,
        companyRules,
        (l, r) => evaluateLeadCrossEntityRule(l, r, context.companiesMap!)
      );
    }

    // Both must pass (AND between self and cross-entity rule groups)
    return selfResult && companyResult;
  });
}
