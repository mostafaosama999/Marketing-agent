// src/services/api/companyFilterService.ts
// Service for evaluating filter rules against companies

import { Company } from '../../types/crm';
import { FilterRule, FilterableField } from '../../types/filter';

/**
 * Get all filterable fields from standard Company fields + custom fields from actual companies
 */
export function getCompanyFilterableFields(companies: Company[]): FilterableField[] {
  // Standard company fields
  const standardFields: FilterableField[] = [
    { name: 'name', label: 'Name', type: 'text', isCustomField: false },
    { name: 'website', label: 'Website', type: 'text', isCustomField: false },
    { name: 'industry', label: 'Industry', type: 'text', isCustomField: false },
    { name: 'description', label: 'Description', type: 'text', isCustomField: false },
    { name: 'createdAt', label: 'Created Date', type: 'date', isCustomField: false },
    { name: 'updatedAt', label: 'Updated Date', type: 'date', isCustomField: false },
  ];

  // Apollo enrichment fields (if available)
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

  // Blog analysis fields (if available)
  const blogFields: FilterableField[] = [
    { name: 'blogAnalysis.monthlyFrequency', label: 'Blog Posts per Month', type: 'number', isCustomField: false },
    { name: 'blogAnalysis.writers.count', label: 'Number of Writers', type: 'number', isCustomField: false },
    { name: 'blogAnalysis.blogNature.rating', label: 'Blog Quality Rating', type: 'select', options: ['low', 'medium', 'high'], isCustomField: false },
    { name: 'blogAnalysis.blogNature.isTechnical', label: 'Technical Blog', type: 'boolean', isCustomField: false },
    { name: 'blogAnalysis.blogNature.isAIWritten', label: 'AI Written Content', type: 'boolean', isCustomField: false },
    { name: 'blogAnalysis.isDeveloperB2BSaas', label: 'Is Developer B2B SaaS', type: 'boolean', isCustomField: false },
  ];

  // Writing program fields (if available)
  const writingProgramFields: FilterableField[] = [
    { name: 'writingProgramAnalysis.hasProgram', label: 'Has Writing Program', type: 'boolean', isCustomField: false },
    { name: 'writingProgramAnalysis.isOpen', label: 'Program is Open', type: 'boolean', isCustomField: false },
    { name: 'writingProgramAnalysis.payment.amount', label: 'Payment Amount', type: 'text', isCustomField: false },
    { name: 'writingProgramAnalysis.payment.method', label: 'Payment Method', type: 'text', isCustomField: false },
  ];

  // Extract unique custom field names from all companies
  const customFieldNames = new Set<string>();
  companies.forEach(company => {
    if (company.customFields) {
      Object.keys(company.customFields).forEach(fieldName => {
        customFieldNames.add(fieldName);
      });
    }
  });

  // Create filterable fields for each custom field
  const customFilterableFields: FilterableField[] = Array.from(customFieldNames)
    .sort()
    .map(fieldName => ({
      name: fieldName,
      label: fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' '),
      type: 'text' as const,
      isCustomField: true,
    }));

  // Check if any companies have Apollo/Blog/WritingProgram data
  const hasApolloData = companies.some(c => c.apolloEnrichment);
  const hasBlogData = companies.some(c => c.blogAnalysis);
  const hasWritingProgramData = companies.some(c => c.writingProgramAnalysis);

  const fields = [...standardFields];
  if (hasApolloData) fields.push(...apolloFields);
  if (hasBlogData) fields.push(...blogFields);
  if (hasWritingProgramData) fields.push(...writingProgramFields);
  fields.push(...customFilterableFields);

  return fields;
}

/**
 * Get the value from a company for a given field name
 * Handles both standard fields, nested fields, and custom fields
 */
function getFieldValue(company: Company, fieldName: string): any {
  // Handle nested fields (e.g., "apolloEnrichment.employeeCount")
  if (fieldName.includes('.')) {
    const parts = fieldName.split('.');
    let value: any = company;

    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }

    return value;
  }

  // Standard fields
  if (fieldName in company) {
    return (company as any)[fieldName];
  }

  // Custom fields
  if (company.customFields && fieldName in company.customFields) {
    return company.customFields[fieldName];
  }

  return undefined;
}

/**
 * Evaluate a single filter rule against a company
 */
export function evaluateCompanyRule(company: Company, rule: FilterRule): boolean {
  const fieldValue = getFieldValue(company, rule.field);
  const operator = rule.operator;
  const ruleValue = rule.value;

  // Handle empty/not empty checks
  if (operator === 'is_empty') {
    return fieldValue === undefined || fieldValue === null || fieldValue === '';
  }
  if (operator === 'is_not_empty') {
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
    // Handle arrays (like technologies, industries)
    if (Array.isArray(fieldValue)) {
      return fieldValue.some(item =>
        String(item).toLowerCase().includes(String(ruleValue).toLowerCase())
      );
    }
    return String(fieldValue).toLowerCase().includes(String(ruleValue).toLowerCase());
  }
  if (operator === 'not_contains') {
    if (Array.isArray(fieldValue)) {
      return !fieldValue.some(item =>
        String(item).toLowerCase().includes(String(ruleValue).toLowerCase())
      );
    }
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
 * Apply filter rules to a list of companies
 * Returns filtered companies based on all rules combined with their logic gates
 */
export function applyCompanyAdvancedFilters(companies: Company[], rules: FilterRule[]): Company[] {
  if (rules.length === 0) {
    return companies;
  }

  return companies.filter(company => {
    // Evaluate each rule and combine with logic gates
    let result = evaluateCompanyRule(company, rules[0]);

    for (let i = 0; i < rules.length - 1; i++) {
      const currentRule = rules[i];
      const nextRule = rules[i + 1];
      const nextResult = evaluateCompanyRule(company, nextRule);

      if (currentRule.logicGate === 'AND') {
        result = result && nextResult;
      } else if (currentRule.logicGate === 'OR') {
        result = result || nextResult;
      }
    }

    return result;
  });
}
