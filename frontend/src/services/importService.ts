import Papa from 'papaparse';
import { LeadFormData, CSVRow, FieldMapping, Lead, CustomField } from '../app/types/crm';
import { createLead } from './crmService';
import { findDuplicates, getDeduplicationConfig } from './deduplicationService';
import { detectFieldType, generateFieldName } from './typeDetectionService';
import { createCustomField } from './customFieldsService';

export interface ImportResult {
  total: number;
  successful: number;
  failed: number;
  skipped: number;
  customFieldsCreated: number;
  errors: string[];
}

/**
 * Parse CSV file
 */
export function parseCSV(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        resolve(results.data as CSVRow[]);
      },
      error: (error) => {
        reject(error);
      },
    });
  });
}

/**
 * Auto-detect field mappings based on common column names
 */
export function autoDetectMappings(csvHeaders: string[], customFields: any[] = []): FieldMapping[] {
  const mappings: FieldMapping[] = csvHeaders.map((header) => {
    const lowerHeader = header.toLowerCase().trim();
    let leadField: string | null = null;

    // Auto-detect common standard mappings
    if (lowerHeader.includes('name') && !lowerHeader.includes('company')) {
      leadField = 'name';
    } else if (lowerHeader.includes('email')) {
      leadField = 'email';
    } else if (lowerHeader.includes('company')) {
      leadField = 'company';
    } else if (lowerHeader.includes('phone')) {
      leadField = 'phone';
    } else if (lowerHeader.includes('status') || lowerHeader.includes('stage')) {
      leadField = 'status';
    } else {
      // Try to match custom fields
      const customField = customFields.find(f =>
        f.label.toLowerCase() === lowerHeader ||
        f.name.toLowerCase() === lowerHeader
      );
      if (customField) {
        leadField = `custom_${customField.name}`;
      }
    }

    return {
      csvField: header,
      leadField,
    };
  });

  return mappings;
}

/**
 * Validate that required fields are mapped
 */
export function validateMappings(mappings: FieldMapping[]): string[] {
  const errors: string[] = [];
  // Only name and company are required for CSV import
  // Email will be auto-generated if not provided
  const requiredFields: (keyof LeadFormData)[] = ['name', 'company'];

  for (const field of requiredFields) {
    const isMapped = mappings.some((m) => m.leadField === field);
    if (!isMapped) {
      errors.push(`Required field "${field}" is not mapped`);
    }
  }

  return errors;
}

/**
 * Convert CSV row to LeadFormData using mappings
 */
function mapRowToLead(row: CSVRow, mappings: FieldMapping[], defaultStatus: string): LeadFormData | null {
  const lead: Partial<LeadFormData> = {
    status: defaultStatus,
    customFields: {},
  };

  for (const mapping of mappings) {
    if (mapping.leadField && row[mapping.csvField]) {
      const value = row[mapping.csvField].trim();
      if (value) {
        // Check if this is a custom field
        if (typeof mapping.leadField === 'string' && mapping.leadField.startsWith('custom_')) {
          const customFieldName = mapping.leadField.replace('custom_', '');
          lead.customFields![customFieldName] = value;
        } else {
          // Standard field
          (lead as any)[mapping.leadField] = value;
        }
      }
    }
  }

  // Validate required fields (name and company)
  // Email is optional for CSV imports - generate placeholder if missing
  if (!lead.name || !lead.company) {
    return null; // Skip invalid rows
  }

  // Generate placeholder email if not provided
  if (!lead.email) {
    // Create a placeholder email from name and company
    const namePart = lead.name.toLowerCase().replace(/\s+/g, '.');
    const companyPart = lead.company.toLowerCase().replace(/\s+/g, '');
    lead.email = `${namePart}@${companyPart}.example`;
  }

  // Set phone to empty string if not provided
  if (!lead.phone) {
    lead.phone = '';
  }

  return lead as LeadFormData;
}

/**
 * Forward-fill empty cells in CSV data (for merged cells from Excel)
 * Carries forward non-empty values to subsequent rows with empty cells
 */
function forwardFillCSVData(csvData: CSVRow[], mappings: FieldMapping[]): CSVRow[] {
  if (csvData.length === 0) return [];

  const filledData: CSVRow[] = [];
  const lastValues: Record<string, string> = {};

  // Analyze the data to find columns that should be forward-filled
  // These are columns where:
  // 1. The value appears in the first row of a group
  // 2. Subsequent rows have empty values
  // 3. The pattern repeats (indicating merged cells)

  const headers = Object.keys(csvData[0]);
  const columnsToFill = new Set<string>();

  // Always forward-fill columns related to company data
  const companyRelatedKeywords = [
    'company', 'organization', 'business', 'industry', 'sector',
    'website', 'url', 'link', 'site', 'homepage',
    'description', 'about', 'overview', 'summary',
    'category', 'type', 'vertical'
  ];

  mappings.forEach(m => {
    const headerLower = m.csvField.toLowerCase();

    // Check if it's explicitly mapped to company or related to company keywords
    if (m.leadField === 'company' ||
        companyRelatedKeywords.some(keyword => headerLower.includes(keyword))) {
      columnsToFill.add(m.csvField);
    }
  });

  // Also detect columns with repetitive empty patterns (likely merged cells)
  for (const header of headers) {
    let emptyCount = 0;
    let nonEmptyCount = 0;
    let hasPattern = false;

    for (let i = 0; i < Math.min(csvData.length, 20); i++) {
      const value = csvData[i][header];
      if (!value || value.trim() === '') {
        emptyCount++;
      } else {
        nonEmptyCount++;
        // If we see a non-empty value after empties, it's a pattern
        if (emptyCount > 0 && i > 0) {
          hasPattern = true;
        }
      }
    }

    // If more than 30% of sampled rows are empty and we see a pattern, forward-fill
    if (hasPattern && emptyCount > 0 && nonEmptyCount > 0 &&
        emptyCount / (emptyCount + nonEmptyCount) > 0.3) {
      columnsToFill.add(header);
    }
  }

  // Forward-fill the identified columns
  for (const row of csvData) {
    const filledRow = { ...row };

    for (const column of columnsToFill) {
      if (row[column] && row[column].trim() !== '') {
        // Update last known value
        lastValues[column] = row[column];
      } else if (lastValues[column]) {
        // Use last known value if current cell is empty
        filledRow[column] = lastValues[column];
      }
    }

    filledData.push(filledRow);
  }

  return filledData;
}

/**
 * Import leads from CSV data
 */
export async function importLeadsFromCSV(
  csvData: CSVRow[],
  mappings: FieldMapping[],
  existingLeads: Lead[],
  autoCreateCustomFields: boolean = false,
  defaultStatus: string = 'New Lead'
): Promise<ImportResult> {
  const result: ImportResult = {
    total: csvData.length,
    successful: 0,
    failed: 0,
    skipped: 0,
    customFieldsCreated: 0,
    errors: [],
  };

  // Auto-create custom fields for unmapped columns if enabled
  if (autoCreateCustomFields) {
    const unmappedColumns = mappings.filter(m => !m.leadField || m.leadField === '');

    for (const mapping of unmappedColumns) {
      try {
        // Collect sample values from this column
        const sampleValues = csvData
          .map(row => row[mapping.csvField])
          .filter(v => v && v.trim() !== '')
          .slice(0, 10);

        if (sampleValues.length > 0) {
          // Detect the best field type
          const detectedType = detectFieldType(sampleValues);
          const fieldName = generateFieldName(mapping.csvField);

          // Create the custom field
          const newField: Omit<CustomField, 'id'> = {
            name: fieldName,
            label: mapping.csvField,
            type: detectedType,
            required: false,
            visible: true,
            showInTable: true,
            showInCard: true,
            order: 999, // Add to end
            ...(detectedType === 'select' || detectedType === 'radio' || detectedType === 'checkbox'
              ? { options: [] }
              : {}),
          };

          await createCustomField(newField);

          // Update the mapping to use the new custom field
          mapping.leadField = `custom_${fieldName}`;
          result.customFieldsCreated++;
        }
      } catch (error) {
        console.error(`Failed to create custom field for column "${mapping.csvField}":`, error);
        // Continue with import even if custom field creation fails
      }
    }
  }

  // Forward-fill merged cells (handles Excel merged cell exports)
  const filledData = forwardFillCSVData(csvData, mappings);

  const config = getDeduplicationConfig();

  for (let i = 0; i < filledData.length; i++) {
    const row = filledData[i];
    try {
      const leadData = mapRowToLead(row, mappings, defaultStatus);

      if (!leadData) {
        result.failed++;
        const missingFields = [];
        if (!row[mappings.find(m => m.leadField === 'name')?.csvField || '']?.trim()) missingFields.push('name');
        if (!row[mappings.find(m => m.leadField === 'company')?.csvField || '']?.trim()) missingFields.push('company');
        result.errors.push(`Row ${i + 2}: Missing required fields: ${missingFields.join(', ')}`);
        console.log(`Row ${i + 2} failed - Missing:`, missingFields, 'Data:', row);
        continue;
      }

      // Check for duplicates
      const duplicates = findDuplicates(leadData, existingLeads, config);
      if (duplicates.length > 0) {
        result.skipped++;
        result.errors.push(`Row ${i + 2}: Skipped - duplicate of existing lead "${duplicates[0].name}"`);
        console.log(`Row ${i + 2} skipped - Duplicate of:`, duplicates[0].name);
        continue;
      }

      console.log(`Importing row ${i + 2}:`, leadData);
      await createLead(leadData);

      // Add to existing leads so we don't create duplicates within the same import
      existingLeads.push({ ...leadData, id: `temp-${i}`, createdAt: new Date(), updatedAt: new Date() } as Lead);

      result.successful++;
    } catch (error) {
      result.failed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Row ${i + 2}: ${errorMessage}`);
      console.error(`Row ${i + 2} error:`, error, 'Data:', row);
    }
  }

  return result;
}
