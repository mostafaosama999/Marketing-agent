/**
 * Filter system types for dynamic filtering in tables
 */

export type FilterOperator =
  // Text operators
  | 'contains'
  | 'equals'
  | 'starts_with'
  | 'ends_with'
  | 'not_equals'
  // Number/Date operators
  | 'greater_than'
  | 'less_than'
  | 'between'
  | 'before'
  | 'after'
  // Array operators
  | 'contains_any'
  | 'not_contains'
  // Universal operators
  | 'is_empty'
  | 'is_not_empty';

export type FilterConnector = 'AND' | 'OR';

export type FieldType = 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'array';

/**
 * Represents a single filter condition
 */
export interface FilterCondition {
  id: string;                    // Unique identifier for this condition
  field: string;                 // Field name to filter on (e.g., 'name', 'email', 'custom_revenue')
  operator: FilterOperator;      // Comparison operator
  value: any;                    // Value to compare against
  connector: FilterConnector;    // How to combine with next condition (AND/OR)
}

/**
 * Describes a field that can be filtered
 */
export interface FilterableField {
  id: string;                    // Field identifier (matches data property)
  label: string;                 // Display name
  type: FieldType;               // Field type (determines available operators)
  options?: string[];            // For select fields, list of possible values
}

/**
 * Saved filter preset
 */
export interface FilterPreset {
  id: string;                    // Unique preset identifier
  name: string;                  // User-defined preset name
  conditions: FilterCondition[]; // Filter conditions in this preset
  createdAt: Date;              // When preset was created
}

/**
 * Get available operators for a field type
 */
export function getOperatorsForFieldType(fieldType: FieldType): FilterOperator[] {
  switch (fieldType) {
    case 'text':
      return ['contains', 'equals', 'starts_with', 'ends_with', 'not_equals', 'is_empty', 'is_not_empty'];

    case 'number':
      return ['equals', 'not_equals', 'greater_than', 'less_than', 'is_empty', 'is_not_empty'];

    case 'date':
      return ['equals', 'before', 'after', 'between', 'is_empty', 'is_not_empty'];

    case 'select':
      return ['equals', 'not_equals', 'is_empty', 'is_not_empty'];

    case 'checkbox':
    case 'array':
      return ['contains_any', 'not_contains', 'is_empty', 'is_not_empty'];

    default:
      return ['equals', 'not_equals', 'is_empty', 'is_not_empty'];
  }
}

/**
 * Get human-readable label for operator
 */
export function getOperatorLabel(operator: FilterOperator): string {
  const labels: Record<FilterOperator, string> = {
    contains: 'contains',
    equals: 'equals',
    starts_with: 'starts with',
    ends_with: 'ends with',
    not_equals: 'does not equal',
    greater_than: 'greater than',
    less_than: 'less than',
    between: 'between',
    before: 'before',
    after: 'after',
    contains_any: 'contains any',
    not_contains: 'does not contain',
    is_empty: 'is empty',
    is_not_empty: 'is not empty',
  };
  return labels[operator];
}

/**
 * Check if operator requires a value input
 */
export function operatorNeedsValue(operator: FilterOperator): boolean {
  return operator !== 'is_empty' && operator !== 'is_not_empty';
}
