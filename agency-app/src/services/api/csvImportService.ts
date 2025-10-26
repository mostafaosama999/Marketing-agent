// src/services/api/csvImportService.ts
// Service for CSV parsing and lead import logic

import Papa from 'papaparse';
import { CSVRow, FieldMapping, FieldSection, EntityType } from '../../types/crm';
import { LeadFormData, LeadStatus } from '../../types/lead';
import { createLeadsBatch } from './leads';
import { getAllLeadsMap, checkDuplicateFromMap } from './deduplicationService';
import { getOrCreateCompaniesBatch, updateCompany } from './companies';

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
  errors: string[];
  totalProcessed: number;
}

/**
 * Detect if a CSV column belongs to LinkedIn section
 */
export function isLinkedInField(columnName: string): boolean {
  const lower = columnName.toLowerCase().trim();
  return (
    lower.includes('linkedin') ||
    lower.includes('linked in') ||
    lower.includes('linked-in') ||
    lower.includes('li profile') ||
    (lower.includes('profile') && (lower.includes('url') || lower.includes('link'))) ||
    lower === 'link' || // Generic "Link" in LinkedIn context
    lower.includes('name of person') ||
    lower.includes('job') ||
    lower.includes('type of message') ||
    lower.includes('date of contact') ||
    lower.includes('date of followup') ||
    lower.includes('follow up') ||
    lower.includes('followup')
  );
}

/**
 * Detect if a CSV column belongs to Email section
 */
export function isEmailField(columnName: string): boolean {
  const lower = columnName.toLowerCase().trim();
  return (
    lower.includes('email') ||
    lower.includes('e-mail') ||
    lower.includes("e'mail") ||
    lower.includes('mail') ||
    lower.includes('date sent') ||
    lower.includes('sent date') ||
    lower.includes('who applied') ||
    lower.includes('applied')
  );
}

/**
 * Detect section for a CSV column
 */
export function detectFieldSection(columnName: string): FieldSection {
  if (isLinkedInField(columnName)) {
    return 'linkedin';
  }
  if (isEmailField(columnName)) {
    return 'email';
  }
  return 'general';
}

/**
 * Detect entity type (lead or company) for a CSV column
 * Company fields include standard company info and fields with company-related keywords
 */
export function detectEntityType(columnName: string, leadFieldName: string | null): EntityType {
  const lower = columnName.toLowerCase().trim();

  // Standard company fields
  if (
    leadFieldName === 'website' ||
    leadFieldName === 'industry' ||
    leadFieldName === 'description'
  ) {
    return 'company';
  }

  // Company-related keywords in column name
  const companyKeywords = [
    // Website & online presence
    'website',
    'blog',
    'blog link',
    'url',
    'domain',

    // Industry & classification
    'industry',
    'sector',
    'vertical',
    'niche',
    'category',

    // Company size & structure
    'company size',
    'company_size',
    'companysize',
    'employees',
    'employee count',
    'headcount',
    'team size',

    // Financial
    'revenue',
    'funding',
    'valuation',
    'arr',
    'mrr',

    // Location
    'headquarters',
    'hq',
    'location',
    'country',
    'region',
    'city',
    'address',
    'company location',

    // Description & details
    'company description',
    'description',
    'about company',
    'company info',
    'company details',
    'what they do',
    'what the company does',
    'business description',
    'overview',

    // Organization type
    'organization',
    'firm',
    'business type',
    'company type',

    // Rating & evaluation
    'rating',
    'score',
    'company rating',
    'quality',
    'tier',

    // Content & programs
    'program',
    'writing program',
    'content program',
    'contributor program',
    'ideas generated',
    'chosen idea',
    'selected idea',
    'article name',
    'blog post',
    'content ideas',
    'topics',
  ];

  for (const keyword of companyKeywords) {
    if (lower.includes(keyword)) {
      return 'company';
    }
  }

  // Default to lead entity type
  return 'lead';
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
 * Currently unused but kept for potential future use
 */
// function sanitize(str: string): string {
//   return str
//     .toLowerCase()
//     .trim()
//     .replace(/[^a-z0-9]/g, '');
// }

/**
 * Transform CSV row to LeadFormData and CompanyData using field mappings
 */
function transformRowToLead(
  row: CSVRow,
  mappings: FieldMapping[],
  defaultStatus: LeadStatus
): { leadData: LeadFormData; companyData: Record<string, any> } | null {
  const leadData: Partial<LeadFormData> = {
    status: defaultStatus,
    customFields: {},
    outreach: {},
  };

  const companyData: Record<string, any> = {};

  // Apply mappings
  for (const mapping of mappings) {
    if (!mapping.leadField) continue;

    // Handle auto-create for skipped fields
    if (mapping.leadField === 'skip') {
      if (!mapping.autoCreate) continue; // Skip if not auto-creating

      // Generate field name from CSV column name
      let fieldName = mapping.csvField
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '_'); // Convert "What they do" → "what_they_do"

      // Prefix with section if it's linkedin or email to organize in outreach tab
      if (mapping.section === 'linkedin') {
        fieldName = `linkedin_${fieldName}`;
      } else if (mapping.section === 'email') {
        fieldName = `email_${fieldName}`;
      }

      mapping.leadField = fieldName;
    }

    const value = row[mapping.csvField];
    if (!value || value.trim() === '') continue;

    const entityType = mapping.entityType || 'lead';

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
    }
    // Outreach fields - LinkedIn
    else if (mapping.leadField === 'outreach.linkedIn.profileUrl') {
      if (!leadData.outreach!.linkedIn) {
        leadData.outreach!.linkedIn = { status: 'not_sent' };
      }
      leadData.outreach!.linkedIn.profileUrl = value.trim();
    } else if (mapping.leadField === 'outreach.linkedIn.status') {
      if (!leadData.outreach!.linkedIn) {
        leadData.outreach!.linkedIn = { status: 'not_sent' };
      }
      const statusLower = value.toLowerCase().trim();
      if (statusLower.includes('sent') && !statusLower.includes('not')) {
        leadData.outreach!.linkedIn.status = 'sent';
      } else if (statusLower.includes('open')) {
        leadData.outreach!.linkedIn.status = 'opened';
      } else if (statusLower.includes('repl')) {
        leadData.outreach!.linkedIn.status = 'replied';
      } else if (statusLower.includes('refus')) {
        leadData.outreach!.linkedIn.status = 'refused';
      } else if (statusLower.includes('no response')) {
        leadData.outreach!.linkedIn.status = 'no_response';
      }
    }
    // Outreach fields - Email
    else if (mapping.leadField === 'outreach.email.status') {
      if (!leadData.outreach!.email) {
        leadData.outreach!.email = { status: 'not_sent' };
      }
      const statusLower = value.toLowerCase().trim();
      if (statusLower.includes('sent') && !statusLower.includes('not')) {
        leadData.outreach!.email.status = 'sent';
      } else if (statusLower.includes('open')) {
        leadData.outreach!.email.status = 'opened';
      } else if (statusLower.includes('repl')) {
        leadData.outreach!.email.status = 'replied';
      } else if (statusLower.includes('bounc')) {
        leadData.outreach!.email.status = 'bounced';
      } else if (statusLower.includes('refus')) {
        leadData.outreach!.email.status = 'refused';
      } else if (statusLower.includes('no response')) {
        leadData.outreach!.email.status = 'no_response';
      }
    }
    // Custom field - could be for lead or company
    else {
      if (entityType === 'company') {
        if (!companyData.customFields) {
          companyData.customFields = {};
        }
        companyData.customFields[mapping.leadField] = value.trim();
      } else {
        leadData.customFields![mapping.leadField] = value.trim();
      }
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

  // Clean up empty outreach objects
  if (leadData.outreach && Object.keys(leadData.outreach).length === 0) {
    delete leadData.outreach;
  }

  return { leadData: leadData as LeadFormData, companyData };
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
    errors: [],
    totalProcessed: 0,
  };

  // Apply forward-fill for Excel compatibility
  const filledData = applyForwardFill(data);

  // OPTIMIZED BATCH IMPORT

  // 1. Fetch all existing leads once for fast duplicate checking
  const existingLeadsMap = await getAllLeadsMap();

  // 2. Transform and validate all rows
  const validLeadsData: LeadFormData[] = [];
  const batchLeads: Array<{ name: string; company: string }> = [];
  const companyDataByName: Map<string, Record<string, any>> = new Map();

  for (let i = 0; i < filledData.length; i++) {
    const row = filledData[i];
    const rowNumber = i + 2;

    try {
      const transformResult = transformRowToLead(row, mappings, defaultStatus);

      if (!transformResult) {
        result.failed++;
        result.errors.push(
          `Row ${rowNumber}: Missing required fields (name or company)`
        );
        continue;
      }

      const { leadData, companyData } = transformResult;

      // Fast duplicate check using Map
      const duplicateCheck = checkDuplicateFromMap(
        leadData.name,
        leadData.company,
        existingLeadsMap,
        batchLeads
      );

      if (duplicateCheck.isDuplicate) {
        result.duplicates++;
        result.errors.push(
          `Row ${rowNumber}: Skipped - duplicate of existing lead "${leadData.name} at ${leadData.company}"`
        );
        continue;
      }

      validLeadsData.push(leadData);
      batchLeads.push({ name: leadData.name, company: leadData.company });

      // Collect company data - merge data from multiple leads of the same company
      if (Object.keys(companyData).length > 0) {
        const companyKey = leadData.company.toLowerCase();
        const existingCompanyData = companyDataByName.get(companyKey) || {};

        // Merge company data (later rows override earlier ones if conflict)
        companyDataByName.set(companyKey, {
          ...existingCompanyData,
          ...companyData,
          customFields: {
            ...(existingCompanyData.customFields || {}),
            ...(companyData.customFields || {})
          }
        });
      }

      result.totalProcessed++;

      // Throttled progress reporting (every 50 leads)
      if (onProgress && i % 50 === 0) {
        onProgress(i + 1, filledData.length);
      }
    } catch (error) {
      result.failed++;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      result.errors.push(`Row ${rowNumber}: ${errorMessage}`);
      result.totalProcessed++;
    }
  }

  // 3. Extract unique company names
  const uniqueCompanyNames = Array.from(
    new Set(validLeadsData.map((lead) => lead.company))
  );

  // 4. Batch create/get all companies
  const companyIdMap = await getOrCreateCompaniesBatch(uniqueCompanyNames);

  // 4.5. Update companies with their data (if any company-level fields were imported)
  if (companyDataByName.size > 0) {
    const companyUpdatePromises: Promise<void>[] = [];

    companyDataByName.forEach((companyData, companyKey) => {
      const companyId = companyIdMap.get(companyKey);
      if (companyId) {
        companyUpdatePromises.push(
          updateCompany(companyId, companyData).catch((error) => {
            console.error(`Failed to update company ${companyKey}:`, error);
            // Non-blocking: continue with import even if company update fails
          })
        );
      }
    });

    // Execute all company updates in parallel
    try {
      await Promise.all(companyUpdatePromises);
    } catch (error) {
      console.error('Some company updates failed:', error);
      // Non-blocking: continue with lead import
    }
  }

  // 5. Batch create all leads (with progress updates)
  try {
    await createLeadsBatch(validLeadsData, userId, companyIdMap);
    result.successful = validLeadsData.length;

    // Final progress update
    if (onProgress) {
      onProgress(filledData.length, filledData.length);
    }
  } catch (error) {
    console.error('Error in batch lead creation:', error);
    result.failed += validLeadsData.length;
    result.successful = 0;
    result.errors.push(`Batch creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
}
