import { FilterCondition } from '../app/types/filters';

/**
 * Get nested property value from object using dot notation
 * Supports both direct properties and customFields
 */
function getFieldValue(item: any, fieldPath: string): any {
  // Handle custom fields (format: custom_fieldName)
  if (fieldPath.startsWith('custom_')) {
    const fieldName = fieldPath.replace('custom_', '');
    return item.customFields?.[fieldName];
  }

  // Handle nested paths (e.g., 'user.email')
  const parts = fieldPath.split('.');
  let value = item;
  for (const part of parts) {
    if (value == null) return undefined;
    value = value[part];
  }
  return value;
}

/**
 * Normalize value for comparison (handle null/undefined, trim strings, lowercase)
 */
function normalizeValue(value: any): any {
  if (value == null) return null;
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (value instanceof Date) return value.getTime();
  return value;
}

/**
 * Evaluate a single filter condition against an item
 */
export function evaluateCondition(item: any, condition: FilterCondition): boolean {
  const fieldValue = getFieldValue(item, condition.field);
  const { operator, value } = condition;

  // Handle is_empty and is_not_empty
  if (operator === 'is_empty') {
    return fieldValue == null || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
  }
  if (operator === 'is_not_empty') {
    return fieldValue != null && fieldValue !== '' && !(Array.isArray(fieldValue) && fieldValue.length === 0);
  }

  // If field is empty and operator needs value, fail
  if (fieldValue == null || fieldValue === '') {
    return false;
  }

  const normalizedField = normalizeValue(fieldValue);
  const normalizedValue = normalizeValue(value);

  switch (operator) {
    case 'equals':
      return normalizedField === normalizedValue;

    case 'not_equals':
      return normalizedField !== normalizedValue;

    case 'contains':
      if (typeof fieldValue === 'string' && typeof value === 'string') {
        return normalizedField.includes(normalizedValue);
      }
      return false;

    case 'starts_with':
      if (typeof fieldValue === 'string' && typeof value === 'string') {
        return normalizedField.startsWith(normalizedValue);
      }
      return false;

    case 'ends_with':
      if (typeof fieldValue === 'string' && typeof value === 'string') {
        return normalizedField.endsWith(normalizedValue);
      }
      return false;

    case 'greater_than':
      if (typeof fieldValue === 'number' && typeof value === 'number') {
        return fieldValue > value;
      }
      if (fieldValue instanceof Date && value instanceof Date) {
        return fieldValue.getTime() > value.getTime();
      }
      return false;

    case 'less_than':
      if (typeof fieldValue === 'number' && typeof value === 'number') {
        return fieldValue < value;
      }
      if (fieldValue instanceof Date && value instanceof Date) {
        return fieldValue.getTime() < value.getTime();
      }
      return false;

    case 'before':
      if (fieldValue instanceof Date || typeof fieldValue === 'string') {
        const date = new Date(fieldValue);
        const compareDate = new Date(value);
        return date.getTime() < compareDate.getTime();
      }
      return false;

    case 'after':
      if (fieldValue instanceof Date || typeof fieldValue === 'string') {
        const date = new Date(fieldValue);
        const compareDate = new Date(value);
        return date.getTime() > compareDate.getTime();
      }
      return false;

    case 'between':
      if (Array.isArray(value) && value.length === 2) {
        const [min, max] = value;
        if (typeof fieldValue === 'number') {
          return fieldValue >= min && fieldValue <= max;
        }
        if (fieldValue instanceof Date || typeof fieldValue === 'string') {
          const date = new Date(fieldValue).getTime();
          const minDate = new Date(min).getTime();
          const maxDate = new Date(max).getTime();
          return date >= minDate && date <= maxDate;
        }
      }
      return false;

    case 'contains_any':
      if (Array.isArray(fieldValue) && Array.isArray(value)) {
        return value.some(v =>
          fieldValue.some(fv => normalizeValue(fv) === normalizeValue(v))
        );
      }
      return false;

    case 'not_contains':
      if (Array.isArray(fieldValue) && typeof value === 'string') {
        return !fieldValue.some(fv => normalizeValue(fv) === normalizedValue);
      }
      return false;

    default:
      return false;
  }
}

/**
 * Evaluate all filter conditions against an item with AND/OR logic
 *
 * Logic:
 * - Splits conditions into groups based on OR connectors
 * - Within each group, all conditions must match (AND)
 * - Item passes if ANY group matches (OR)
 *
 * Example: [A AND B OR C AND D]
 * Groups: [[A, B], [C, D]]
 * Passes if: (A AND B) OR (C AND D)
 */
export function evaluateFilters<T>(item: T, conditions: FilterCondition[]): boolean {
  if (conditions.length === 0) return true;

  // Split into groups based on OR connectors
  const groups: FilterCondition[][] = [];
  let currentGroup: FilterCondition[] = [];

  for (let i = 0; i < conditions.length; i++) {
    const condition = conditions[i];
    currentGroup.push(condition);

    // If this condition is followed by OR (or it's the last one), end the group
    if (condition.connector === 'OR' || i === conditions.length - 1) {
      groups.push([...currentGroup]);
      currentGroup = [];
    }
  }

  // Item passes if ANY group passes (all conditions in group must match)
  return groups.some(group =>
    group.every(condition => evaluateCondition(item, condition))
  );
}

/**
 * Apply filters to an array of items
 */
export function applyFilters<T>(items: T[], conditions: FilterCondition[]): T[] {
  if (conditions.length === 0) return items;
  return items.filter(item => evaluateFilters(item, conditions));
}
