// src/services/api/csvImportService.ts
// Service for CSV parsing and lead import logic

import Papa from 'papaparse';
import { CSVRow, FieldMapping } from '../../types/crm';
import { LeadFormData, LeadStatus } from '../../types/lead';
import { createLead } from './leads';
import { checkDuplicate } from './deduplicationService';
import { autoCreateCustomField } from './customFieldsService';
import { detectFieldType } from './csvTypeDetectionService';

/**
 * Parse result interface
 */
export interface ParseResult {
  data: CSVRow[];
  headers: string[];
  totalRows: number;
  errors: string[];
}

/**
 * Import result interface
 */
export interface ImportResult {
  successful: number;
  failed: number;
  duplicates: number;
  customFieldsCreated: number;
  errors: string[];
  totalProcessed: number;
}

/**
 * Parse CSV file using PapaParse
 * @param file CSV file to parse
 * @returns Promise with parse result
 */
export async function parseCSVFile(file: File): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true, // Use first row as headers
      skipEmptyLines: true, // Skip empty lines
      complete: (results) => {
        const data = results.data as CSVRow[];
        const headers = results.meta.fields || [];
        const errors: string[] = results.errors.map(
          (err) => `Row ${err.row}: ${err.message}`
        );

        resolve({
          data,
          headers,
          totalRows: data.length,
          errors,
        });
      },
      error: (error) => {
        reject(new Error(`CSV parsing failed: ${error.message}`));
      },
    });
  });
}

/**
 * Apply forward-fill algorithm to handle Excel merged cells
 * Detects columns where >20% of cells are empty and fills them with previous value
 */
export function applyForwardFill(data: CSVRow[]): CSVRow[] {
  if (data.length === 0) return data;

  const headers = Object.keys(data[0]);
  const threshold = 0.2; // 20% empty cells threshold

  // Detect which columns need forward-fill
  const columnsToFill: string[] = [];
  for (const header of headers) {
    const emptyCells = data.filter(
      (row) => !row[header] || row[header].trim() === ''
    ).length;
    const emptyPercentage = emptyCells / Math.min(data.length, 20); // Check first 20 rows

    if (emptyPercentage > threshold) {
      columnsToFill.push(header);
    }
  }

  // Apply forward-fill to detected columns
  const filledData = data.map((row, index) => {
    const newRow = { ...row };

    for (const column of columnsToFill) {
      if (!newRow[column] || newRow[column].trim() === '') {
        // Find previous non-empty value
        for (let i = index - 1; i >= 0; i--) {
          if (data[i][column] && data[i][column].trim() !== '') {
            newRow[column] = data[i][column];
            break;
          }
        }
      }
    }

    return newRow;
  });

  return filledData;
}

/**
 * Sanitize string for use in email or field names
 */
function sanitize(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Transform CSV row to LeadFormData using field mappings
 */
function transformRowToLead(
  row: CSVRow,
  mappings: FieldMapping[],
  defaultStatus: LeadStatus
): LeadFormData | null {
  const leadData: Partial<LeadFormData> = {
    status: defaultStatus,
    customFields: {},
  };

  // Apply mappings
  for (const mapping of mappings) {
    if (!mapping.leadField || mapping.leadField === 'skip') continue;

    const value = row[mapping.csvField];
    if (!value || value.trim() === '') continue;

    // Standard fields
    if (mapping.leadField === 'name') {
      leadData.name = value.trim();
    } else if (mapping.leadField === 'email') {
      leadData.email = value.trim();
    } else if (mapping.leadField === 'company') {
      leadData.company = value.trim();
    } else if (mapping.leadField === 'phone') {
      leadData.phone = value.trim();
    } else if (mapping.leadField === 'status') {
      // Map status from CSV value to LeadStatus
      const statusLower = value.toLowerCase().trim();
      if (statusLower.includes('new')) leadData.status = 'new_lead';
      else if (statusLower.includes('qualif')) leadData.status = 'qualified';
      else if (statusLower.includes('contact')) leadData.status = 'contacted';
      else if (statusLower.includes('follow')) leadData.status = 'follow_up';
      else if (statusLower.includes('won')) leadData.status = 'won';
      else if (statusLower.includes('lost')) leadData.status = 'lost';
    } else {
      // Custom field
      leadData.customFields![mapping.leadField] = value.trim();
    }
  }

  // Validation: name and company are required
  if (!leadData.name || !leadData.company) {
    return null;
  }

  // Set empty string if email is missing (don't fabricate data)
  if (!leadData.email || leadData.email.trim() === '') {
    leadData.email = '';
  }

  // Set default phone if missing
  if (!leadData.phone) {
    leadData.phone = '';
  }

  return leadData as LeadFormData;
}

/**
 * Import leads from CSV data
 * @param data Parsed CSV data
 * @param mappings Field mappings from CSV columns to lead fields
 * @param defaultStatus Default pipeline stage for imported leads
 * @param autoCreateCustomFields Whether to auto-create custom fields for unmapped columns
 * @param userId User ID performing the import
 * @param onProgress Optional progress callback
 * @returns Import result with statistics
 */
export async function importLeadsFromCSV(
  data: CSVRow[],
  mappings: FieldMapping[],
  defaultStatus: LeadStatus,
  autoCreateCustomFields: boolean,
  userId: string,
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    successful: 0,
    failed: 0,
    duplicates: 0,
    customFieldsCreated: 0,
    errors: [],
    totalProcessed: 0,
  };

  // Apply forward-fill for Excel compatibility
  const filledData = applyForwardFill(data);

  // Auto-create custom fields if enabled
  if (autoCreateCustomFields) {
    const unmappedColumns = Object.keys(filledData[0] || {}).filter(
      (column) => !mappings.find((m) => m.csvField === column && m.leadField !== 'skip')
    );

    for (const column of unmappedColumns) {
      try {
        // Detect type from sample data
        const samples = filledData.slice(0, 10).map((row) => row[column] || '');
        const detectedType = detectFieldType(samples);

        // Create custom field
        await autoCreateCustomField(column, detectedType);
        result.customFieldsCreated++;

        // Add mapping for this column
        mappings.push({
          csvField: column,
          leadField: column.toLowerCase().trim().replace(/[^a-z0-9]+/g, '_'),
        });
      } catch (error) {
        console.error(`Failed to auto-create custom field for column ${column}:`, error);
        // Non-blocking: continue with import
      }
    }
  }

  // Track leads being imported in current batch (for duplicate detection)
  const batchLeads: Array<{ name: string; company: string }> = [];

  // Process each row
  for (let i = 0; i < filledData.length; i++) {
    const row = filledData[i];
    const rowNumber = i + 2; // +2 because: 0-indexed + 1 for header row + 1 for display

    try {
      // Transform CSV row to lead data
      const leadData = transformRowToLead(row, mappings, defaultStatus);

      if (!leadData) {
        result.failed++;
        result.errors.push(
          `Row ${rowNumber}: Missing required fields (name or company)`
        );
        continue;
      }

      // Check for duplicates
      const duplicateCheck = await checkDuplicate(
        leadData.name,
        leadData.company,
        batchLeads as any
      );

      if (duplicateCheck.isDuplicate) {
        result.duplicates++;
        result.errors.push(
          `Row ${rowNumber}: Skipped - duplicate of existing lead "${leadData.name} at ${leadData.company}"`
        );
        continue;
      }

      // Create lead
      await createLead(leadData, userId);
      result.successful++;

      // Add to batch tracking
      batchLeads.push({ name: leadData.name, company: leadData.company });

      // Report progress
      if (onProgress) {
        onProgress(i + 1, filledData.length);
      }
    } catch (error) {
      result.failed++;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Row ${rowNumber}: ${errorMessage}`);
    }

    result.totalProcessed++;
  }

  return result;
}
