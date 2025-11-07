/**
 * Field Definitions Types
 *
 * Defines the structure for custom field definitions including dropdown/status fields.
 * Field definitions are stored in Firestore and used for:
 * - CSV import field type detection
 * - Inline editing in table views
 * - Field validation
 */

export type FieldType = 'text' | 'number' | 'date' | 'dropdown';
export type EntityType = 'lead' | 'company';
export type FieldSection = 'general' | 'linkedin' | 'email';

/**
 * Field Definition stored in Firestore
 */
export interface FieldDefinition {
  id: string;                         // Unique identifier (e.g., "lead_project_status_dropdown")
  name: string;                        // Field name used in customFields object
  label: string;                       // Display label for UI
  entityType: EntityType;              // Whether this field belongs to leads or companies
  fieldType: FieldType;                // Type of field (text, number, date, dropdown)
  section: FieldSection;               // Which section this field belongs to
  options?: string[];                  // For dropdown fields - array of possible values
  required?: boolean;                  // Whether field is required
  createdAt: Date;                     // When field definition was created
  createdBy: string;                   // User ID who created the field
  updatedAt?: Date;                    // Last update timestamp
  updatedBy?: string;                  // User ID who last updated
}

/**
 * Field Definition for creation (without generated fields)
 */
export interface CreateFieldDefinitionData {
  name: string;
  label: string;
  entityType: EntityType;
  fieldType: FieldType;
  section: FieldSection;
  options?: string[];
  required?: boolean;
}

/**
 * Detected dropdown field from CSV import
 */
export interface DetectedDropdownField {
  columnName: string;                  // Original CSV column name
  fieldName: string;                   // Normalized field name for storage
  options: string[];                   // Unique values detected from CSV data
  entityType: EntityType;              // Whether this is for lead or company
  section: FieldSection;               // Which section (general, linkedin, email)
}

/**
 * Detected date field from CSV import
 */
export interface DetectedDateField {
  columnName: string;                  // Original CSV column name
  fieldName: string;                   // Normalized field name for storage
  entityType: EntityType;              // Whether this is for lead or company
  section: FieldSection;               // Which section (general, linkedin, email)
}

/**
 * Helper function to generate field ID
 */
export const generateFieldId = (
  entityType: EntityType,
  fieldName: string
): string => {
  return `${entityType}_${fieldName}`;
};

/**
 * Helper function to check if a column name indicates dropdown field
 */
export const isDropdownColumn = (columnName: string): boolean => {
  return columnName.toLowerCase().includes('dropdown');
};

/**
 * Helper function to check if a column name or values indicate date field
 */
export const isDateColumn = (columnName: string, sampleValues: string[] = []): boolean => {
  // Check column name for "date" keyword
  if (/date/i.test(columnName)) {
    return true;
  }

  // If no sample values provided, rely on column name only
  if (sampleValues.length === 0) {
    return false;
  }

  // Check sample values for common date patterns
  const datePatterns = [
    /^\d{1,2}\/\d{1,2}\/\d{4}$/,       // MM/DD/YYYY or DD/MM/YYYY
    /^\d{4}-\d{2}-\d{2}$/,              // YYYY-MM-DD (ISO)
    /^\d{1,2}-\d{1,2}-\d{4}$/,          // DD-MM-YYYY or MM-DD-YYYY
    /^\d{1,2}\.\d{1,2}\.\d{4}$/,        // DD.MM.YYYY
  ];

  // At least 50% of sample values should match date patterns
  const matchCount = sampleValues.filter(val =>
    val && datePatterns.some(pattern => pattern.test(val.trim()))
  ).length;

  return matchCount >= sampleValues.length * 0.5;
};

/**
 * Helper function to normalize field name from CSV column
 */
export const normalizeFieldName = (columnName: string): string => {
  // Remove "dropdown" keyword and normalize
  return columnName
    .toLowerCase()
    .replace(/dropdown/gi, '')
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
};

/**
 * Helper function to get display label from field name
 */
export const getDisplayLabel = (fieldName: string): string => {
  return fieldName
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Helper function to extract unique values from CSV column
 */
export const extractUniqueValues = (
  csvData: any[],
  columnName: string
): string[] => {
  const values = new Set<string>();

  csvData.forEach(row => {
    const value = row[columnName];
    if (value !== null && value !== undefined && value !== '') {
      // Convert to string and trim
      const stringValue = String(value).trim();
      if (stringValue) {
        values.add(stringValue);
      }
    }
  });

  return Array.from(values).sort();
};

/**
 * Helper function to validate dropdown value
 */
export const isValidDropdownValue = (
  value: string,
  options: string[]
): boolean => {
  return options.includes(value);
};

/**
 * Helper function to format dropdown value for display
 */
export const formatDropdownValue = (value: string): string => {
  if (!value) return '';

  // Convert underscores to spaces and capitalize
  return value
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

/**
 * Helper function to infer section from field name
 * Checks field name to determine if it belongs to LinkedIn, Email, or General section
 * Looks for both prefix patterns (linkedin_) and contains patterns (contains "linkedin")
 */
export const getSectionFromFieldName = (fieldName: string): FieldSection => {
  const lowerFieldName = fieldName.toLowerCase();

  // Check if field name contains "linkedin" anywhere
  if (lowerFieldName.includes('linkedin')) {
    return 'linkedin';
  }

  // Check if field name contains "email" anywhere
  if (lowerFieldName.includes('email')) {
    return 'email';
  }

  return 'general';
};
