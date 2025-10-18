import Papa from 'papaparse';
import { LeadFormData, CSVRow, FieldMapping } from '../app/types/crm';
import { createLead } from './crmService';

export interface ImportResult {
  total: number;
  successful: number;
  failed: number;
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
export function autoDetectMappings(csvHeaders: string[]): FieldMapping[] {
  const mappings: FieldMapping[] = csvHeaders.map((header) => {
    const lowerHeader = header.toLowerCase().trim();
    let leadField: keyof LeadFormData | null = null;

    // Auto-detect common mappings
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
  const requiredFields: (keyof LeadFormData)[] = ['name', 'email', 'company'];

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
  };

  for (const mapping of mappings) {
    if (mapping.leadField && row[mapping.csvField]) {
      const value = row[mapping.csvField].trim();
      if (value) {
        lead[mapping.leadField] = value;
      }
    }
  }

  // Validate required fields
  if (!lead.name || !lead.email || !lead.company) {
    return null; // Skip invalid rows
  }

  return lead as LeadFormData;
}

/**
 * Import leads from CSV data
 */
export async function importLeadsFromCSV(
  csvData: CSVRow[],
  mappings: FieldMapping[],
  defaultStatus: string = 'New Lead'
): Promise<ImportResult> {
  const result: ImportResult = {
    total: csvData.length,
    successful: 0,
    failed: 0,
    errors: [],
  };

  for (let i = 0; i < csvData.length; i++) {
    const row = csvData[i];
    try {
      const leadData = mapRowToLead(row, mappings, defaultStatus);

      if (!leadData) {
        result.failed++;
        result.errors.push(`Row ${i + 1}: Missing required fields`);
        continue;
      }

      await createLead(leadData);
      result.successful++;
    } catch (error) {
      result.failed++;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Row ${i + 1}: ${errorMessage}`);
    }
  }

  return result;
}
