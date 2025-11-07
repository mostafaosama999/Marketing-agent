/**
 * Field Validation Service
 *
 * Provides validation functions for custom fields including dropdown/status fields.
 */

import {
  FieldDefinition,
  EntityType,
  FieldType,
  isValidDropdownValue as isValidDropdownValueHelper,
} from '../../types/fieldDefinitions';
import {
  getFieldDefinitionByName,
  getDropdownOptions,
} from '../api/fieldDefinitionsService';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate a dropdown value against field definition
 */
export const validateDropdownValue = (
  value: string,
  options: string[]
): ValidationResult => {
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      error: 'Value cannot be empty',
    };
  }

  const isValid = isValidDropdownValueHelper(value, options);

  if (!isValid) {
    return {
      isValid: false,
      error: `Value "${value}" is not a valid option. Allowed values: ${options.join(', ')}`,
    };
  }

  return { isValid: true };
};

/**
 * Validate a text field value
 */
export const validateTextValue = (
  value: string,
  required?: boolean
): ValidationResult => {
  if (required && (!value || value.trim() === '')) {
    return {
      isValid: false,
      error: 'This field is required',
    };
  }

  return { isValid: true };
};

/**
 * Validate a number field value
 */
export const validateNumberValue = (
  value: any,
  required?: boolean
): ValidationResult => {
  if (required && (value === null || value === undefined || value === '')) {
    return {
      isValid: false,
      error: 'This field is required',
    };
  }

  if (value !== null && value !== undefined && value !== '') {
    const num = Number(value);
    if (isNaN(num)) {
      return {
        isValid: false,
        error: 'Value must be a valid number',
      };
    }
  }

  return { isValid: true };
};

/**
 * Validate a date field value
 */
export const validateDateValue = (
  value: any,
  required?: boolean
): ValidationResult => {
  if (required && (!value || value === '')) {
    return {
      isValid: false,
      error: 'This field is required',
    };
  }

  if (value && value !== '') {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return {
        isValid: false,
        error: 'Value must be a valid date',
      };
    }
  }

  return { isValid: true };
};

/**
 * Validate a custom field value based on field definition
 */
export const validateCustomFieldValue = (
  value: any,
  fieldDefinition: FieldDefinition
): ValidationResult => {
  const { fieldType, required, options } = fieldDefinition;

  switch (fieldType) {
    case 'text':
      return validateTextValue(value, required);

    case 'number':
      return validateNumberValue(value, required);

    case 'date':
      return validateDateValue(value, required);

    case 'dropdown':
      if (required && (!value || value === '')) {
        return {
          isValid: false,
          error: 'This field is required',
        };
      }
      if (value && options) {
        return validateDropdownValue(value, options);
      }
      return { isValid: true };

    default:
      return { isValid: true };
  }
};

/**
 * Validate a custom field value by field name and entity type
 */
export const validateFieldByName = async (
  entityType: EntityType,
  fieldName: string,
  value: any
): Promise<ValidationResult> => {
  const fieldDefinition = await getFieldDefinitionByName(entityType, fieldName);

  if (!fieldDefinition) {
    // If no field definition exists, accept any value (backward compatibility)
    return { isValid: true };
  }

  return validateCustomFieldValue(value, fieldDefinition);
};

/**
 * Validate dropdown options (for adding/editing dropdown options)
 */
export const validateDropdownOptions = (options: string[]): ValidationResult => {
  if (!options || options.length === 0) {
    return {
      isValid: false,
      error: 'Dropdown must have at least one option',
    };
  }

  // Check for empty options
  const hasEmpty = options.some(opt => !opt || opt.trim() === '');
  if (hasEmpty) {
    return {
      isValid: false,
      error: 'Options cannot be empty',
    };
  }

  // Check for duplicates
  const uniqueOptions = new Set(options);
  if (uniqueOptions.size !== options.length) {
    return {
      isValid: false,
      error: 'Duplicate options are not allowed',
    };
  }

  return { isValid: true };
};

/**
 * Get field definition for validation
 */
export const getFieldDefinition = async (
  entityType: EntityType,
  fieldName: string
): Promise<FieldDefinition | null> => {
  return await getFieldDefinitionByName(entityType, fieldName);
};

/**
 * Check if a field is a dropdown field
 */
export const isDropdownField = async (
  entityType: EntityType,
  fieldName: string
): Promise<boolean> => {
  const fieldDefinition = await getFieldDefinitionByName(entityType, fieldName);
  return fieldDefinition?.fieldType === 'dropdown';
};

/**
 * Get dropdown options for a field
 */
export const getFieldDropdownOptions = async (
  entityType: EntityType,
  fieldName: string
): Promise<string[]> => {
  return await getDropdownOptions(entityType, fieldName);
};

/**
 * Validate multiple custom fields at once
 */
export const validateCustomFields = async (
  entityType: EntityType,
  customFields: Record<string, any>
): Promise<Record<string, ValidationResult>> => {
  const results: Record<string, ValidationResult> = {};

  for (const [fieldName, value] of Object.entries(customFields)) {
    results[fieldName] = await validateFieldByName(entityType, fieldName, value);
  }

  return results;
};

/**
 * Check if all fields in the validation results are valid
 */
export const areAllFieldsValid = (
  results: Record<string, ValidationResult>
): boolean => {
  return Object.values(results).every(result => result.isValid);
};
