import { CustomFieldType } from '../app/types/crm';

/**
 * Detect the most appropriate field type based on sample values
 */
export function detectFieldType(values: string[]): CustomFieldType {
  // Filter out empty values
  const nonEmptyValues = values.filter(v => v && v.trim() !== '');

  if (nonEmptyValues.length === 0) {
    return 'text'; // Default to text if no values
  }

  // Sample up to 10 values for analysis
  const sampleValues = nonEmptyValues.slice(0, 10);

  // Check if all values are numbers
  const allNumbers = sampleValues.every(v => {
    const num = parseFloat(v.trim());
    return !isNaN(num) && isFinite(num);
  });

  if (allNumbers) {
    return 'number';
  }

  // Check if values look like dates
  const allDates = sampleValues.every(v => {
    const date = new Date(v.trim());
    return !isNaN(date.getTime());
  });

  if (allDates) {
    return 'date';
  }

  // Check if values look like URLs
  const urlPattern = /^https?:\/\//i;
  const allUrls = sampleValues.every(v => urlPattern.test(v.trim()));

  if (allUrls) {
    return 'url';
  }

  // Check if text is long (multi-line)
  const hasLongText = sampleValues.some(v => v.length > 100);

  if (hasLongText) {
    return 'textarea';
  }

  // Default to text
  return 'text';
}

/**
 * Generate a clean field name from a column header
 */
export function generateFieldName(header: string): string {
  return header
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Remove multiple consecutive underscores
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}
