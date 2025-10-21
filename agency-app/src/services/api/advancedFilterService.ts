// src/services/api/advancedFilterService.ts
// Service for evaluating advanced filter rules against leads

import { Lead } from '../../types/lead';
import { FilterRule, FilterOperator, FilterableField } from '../../types/filter';
import { CustomField } from '../../types/crm';

/**
 * Get all filterable fields from standard Lead fields + custom fields
 */
export function getFilterableFields(customFields: CustomField[]): FilterableField[] {
  // Standard lead fields
  const standardFields: FilterableField[] = [
    { name: 'name', label: 'Name', type: 'text', isCustomField: false },
    { name: 'email', label: 'Email', type: 'text', isCustomField: false },
    { name: 'phone', label: 'Phone', type: 'text', isCustomField: false },
    { name: 'company', label: 'Company', type: 'text', isCustomField: false },
    { name: 'status', label: 'Status', type: 'select', options: ['new_lead', 'qualified', 'contacted', 'follow_up', 'won', 'lost'], isCustomField: false },
    { name: 'createdAt', label: 'Created Date', type: 'date', isCustomField: false },
    { name: 'updatedAt', label: 'Updated Date', type: 'date', isCustomField: false },
  ];

  // Custom fields
  const customFilterableFields: FilterableField[] = customFields
    .filter(field => field.visible)
    .map(field => ({
      name: field.name,
      label: field.label,
      type: mapCustomFieldType(field.type),
      options: field.options,
      isCustomField: true,
    }));

  return [...standardFields, ...customFilterableFields];
}

/**
 * Map custom field type to filter field type
 */
function mapCustomFieldType(customFieldType: string): 'text' | 'number' | 'date' | 'select' | 'boolean' {
  switch (customFieldType) {
    case 'number':
    case 'currency':
      return 'number';
    case 'date':
    case 'datetime':
      return 'date';
    case 'select':
    case 'multiselect':
      return 'select';
    case 'boolean':
    case 'checkbox':
      return 'boolean';
    case 'text':
    case 'textarea':
    case 'email':
    case 'phone':
    case 'url':
    default:
      return 'text';
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
