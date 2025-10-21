// src/services/api/csvTypeDetectionService.ts
// Service for auto-detecting field types from CSV data

import { CustomFieldType } from '../../types/crm';

/**
 * Check if a value is a valid number
 */
function isNumber(value: string): boolean {
  if (!value || value.trim() === '') return false;
  const num = Number(value.trim());
  return !isNaN(num) && isFinite(num);
}

/**
 * Check if a value is a valid date
 * Supports formats: YYYY-MM-DD, MM/DD/YYYY, ISO format, etc.
 */
function isDate(value: string): boolean {
  if (!value || value.trim() === '') return false;

  // Try parsing as date
  const date = new Date(value.trim());
  if (!isNaN(date.getTime())) {
    return true;
  }

  // Check common date patterns
  const datePatterns = [
    /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
    /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
    /^\d{2}-\d{2}-\d{4}$/, // DD-MM-YYYY
    /^\d{4}\/\d{2}\/\d{2}$/, // YYYY/MM/DD
  ];

  return datePatterns.some((pattern) => pattern.test(value.trim()));
}

/**
 * Check if a value is a valid URL
 */
function isURL(value: string): boolean {
  if (!value || value.trim() === '') return false;
  const trimmed = value.trim().toLowerCase();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

/**
 * Check if a value is long text (should use textarea)
 */
function isLongText(value: string): boolean {
  return !!(value && value.length > 100);
}

/**
 * Detect field type from sample values
 * Analyzes first N sample values to determine most appropriate type
 *
 * @param samples Array of sample values from the column
 * @param minSamples Minimum number of samples needed for detection (default: 3)
 * @returns Detected CustomFieldType
 */
export function detectFieldType(
  samples: string[],
  minSamples: number = 3
): CustomFieldType {
  // Filter out empty values
  const nonEmptyValues = samples.filter((v) => v && v.trim() !== '');

  // Need at least minSamples non-empty values for reliable detection
  if (nonEmptyValues.length < minSamples) {
    return 'text'; // Default to text if not enough samples
  }

  // Take first 10 samples for analysis
  const sampleData = nonEmptyValues.slice(0, 10);

  // Count how many samples match each type
  let numberCount = 0;
  let dateCount = 0;
  let urlCount = 0;
  let longTextCount = 0;

  for (const value of sampleData) {
    if (isNumber(value)) numberCount++;
    if (isDate(value)) dateCount++;
    if (isURL(value)) urlCount++;
    if (isLongText(value)) longTextCount++;
  }

  const totalSamples = sampleData.length;

  // If 80%+ are numbers, it's a number field
  if (numberCount / totalSamples >= 0.8) {
    return 'number';
  }

  // If 80%+ are dates, it's a date field
  if (dateCount / totalSamples >= 0.8) {
    return 'date';
  }

  // If 80%+ are URLs, it's a URL field
  if (urlCount / totalSamples >= 0.8) {
    return 'url';
  }

  // If any value is long text, use textarea
  if (longTextCount > 0) {
    return 'textarea';
  }

  // Default to text
  return 'text';
}

/**
 * Detect types for all columns in CSV data
 * Returns a map of column name to detected type
 *
 * @param data Array of CSV row objects
 * @param headers Array of column headers
 * @returns Map of column name to CustomFieldType
 */
export function detectTypesForColumns(
  data: Array<Record<string, string>>,
  headers: string[]
): Map<string, CustomFieldType> {
  const typeMap = new Map<string, CustomFieldType>();

  for (const header of headers) {
    // Extract sample values for this column
    const samples = data
      .map((row) => row[header])
      .filter((val) => val !== undefined && val !== null);

    // Detect type
    const detectedType = detectFieldType(samples);
    typeMap.set(header, detectedType);
  }

  return typeMap;
}
