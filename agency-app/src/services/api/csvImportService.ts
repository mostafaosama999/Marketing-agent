// src/services/api/csvImportService.ts
// Service for CSV parsing and lead import logic

import Papa from 'papaparse';
import { CSVRow, FieldMapping, FieldSection, EntityType } from '../../types/crm';
import { LeadFormData, LeadStatus } from '../../types/lead';
import { createLeadsBatch } from './leads';
import { getAllLeadsMap, checkDuplicateFromMap } from './deduplicationService';
import { getOrCreateCompaniesBatch, updateCompany } from './companies';
import {
  DetectedDropdownField,
  DetectedDateField,
  isDropdownColumn,
  isDateColumn,
  normalizeFieldName,
  extractUniqueValues,
  getDisplayLabel,
  getSectionFromFieldName,
} from '../../types/fieldDefinitions';
import { batchCreateFieldDefinitions } from './fieldDefinitionsService';

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
  companiesOnly: number; // Companies imported without associated leads
  errors: string[];
  totalProcessed: number;
}

/**
 * Detect if a CSV column is a personal LinkedIn profile URL
 * This is specifically for the standard lead-level LinkedIn profile field
 */
export function isPersonalLinkedInProfile(columnName: string): boolean {
  const lower = columnName.toLowerCase().trim();

  // Exclude company LinkedIn fields
  if (lower.includes('company')) {
    return false;
  }

  // Match personal/individual LinkedIn profile URLs
  return (
    (lower.includes('linkedin') || lower.includes('linked in') || lower.includes('linked-in')) &&
    (lower.includes('profile') || lower.includes('url') || lower.includes('link')) &&
    (lower.includes('personal') || lower.includes('person') || lower.includes('individual') ||
     lower.includes('contact') || lower === 'linkedin' || lower === 'linkedin url' ||
     lower === 'linkedin profile' || lower === 'linkedin link')
  );
}

/**
 * Detect if a CSV column is a company-level LinkedIn field
 */
export function isCompanyLinkedInField(columnName: string): boolean {
  const lower = columnName.toLowerCase().trim();

  return (
    (lower.includes('linkedin') || lower.includes('linked in') || lower.includes('linked-in')) &&
    lower.includes('company')
  );
}

/**
 * Detect if a CSV column belongs to LinkedIn section
 * More selective - only catches lead-level LinkedIn outreach fields
 */
export function isLinkedInField(columnName: string): boolean {
  const lower = columnName.toLowerCase().trim();

  // Exclude company LinkedIn fields from LinkedIn section
  if (isCompanyLinkedInField(columnName)) {
    return false;
  }

  // Include personal LinkedIn profiles
  if (isPersonalLinkedInProfile(columnName)) {
    return true;
  }

  // Include LinkedIn outreach tracking fields
  return (
    lower.includes('li profile') ||
    lower.includes('name of person') ||
    lower.includes('type of message') ||
    lower.includes('date of contact') ||
    lower.includes('date of followup') ||
    lower.includes('follow up') ||
    lower.includes('followup') ||
    // LinkedIn status/connection fields (but not if they're dropdown - those should be custom)
    (lower.includes('linkedin') && (lower.includes('status') || lower.includes('connection') || lower.includes('response')) && !lower.includes('dropdown'))
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
    lower.includes('applied') ||
    lower === 'response' || // Single word "Response" typically refers to email response
    lower.includes('email response') ||
    lower.includes('reply')
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
 * Validate if a CSV column name is legitimate and should be included in import
 * Filters out problematic column names like underscore-numbered columns (_1, _2),
 * Excel temporary columns (__EMPTY), and empty/whitespace-only names
 * @param columnName Column name to validate
 * @returns true if valid, false if should be filtered out
 */
function isValidColumnName(columnName: string): boolean {
  if (!columnName) return false;

  const trimmed = columnName.trim();

  // Filter out empty or whitespace-only
  if (trimmed === '') return false;

  // Filter out underscore + numbers only (e.g., "_1", "_2", "_10")
  if (/^_\d+$/.test(trimmed)) return false;

  // Filter out Excel temporary columns (e.g., "__EMPTY", "__EMPTY_1", "__EMPTY_2")
  if (/^__EMPTY(_\d+)?$/i.test(trimmed)) return false;

  // Filter out single special characters only
  if (/^[^a-zA-Z0-9]+$/.test(trimmed) && trimmed.length <= 2) return false;

  return true;
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
        const allHeaders = results.meta.fields || [];

        // Filter out invalid column names (e.g., _1, _2, __EMPTY)
        const headers = allHeaders.filter(isValidColumnName);
        const filteredCount = allHeaders.length - headers.length;

        const errors: string[] = results.errors.map(
          (err) => `Row ${err.row}: ${err.message}`
        );

        // Add informational message if columns were filtered
        if (filteredCount > 0) {
          const filteredColumns = allHeaders.filter(h => !isValidColumnName(h));
          errors.push(
            `Info: Filtered out ${filteredCount} invalid column(s): ${filteredColumns.join(', ')}`
          );
        }

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
 * Detect dropdown fields from CSV headers and data
 * Checks if column name contains "dropdown" (case-insensitive) and extracts unique values
 * @param headers CSV column headers
 * @param data CSV data rows
 * @param mappings Current field mappings to determine entity type and section
 * @returns Array of detected dropdown fields with their options
 */
export function detectDropdownFields(
  headers: string[],
  data: CSVRow[],
  mappings: FieldMapping[]
): DetectedDropdownField[] {
  const detectedDropdowns: DetectedDropdownField[] = [];

  for (const header of headers) {
    // Check if column name indicates dropdown field
    if (!isDropdownColumn(header)) {
      continue;
    }

    // Find mapping for this column to get entity type and section
    const mapping = mappings.find(m => m.csvField === header);

    if (!mapping) {
      continue; // Skip if no mapping found
    }

    // Extract unique values from this column
    const uniqueValues = extractUniqueValues(data, header);

    // Skip if no values found
    if (uniqueValues.length === 0) {
      continue;
    }

    // Normalize field name (remove "dropdown" keyword)
    const fieldName = normalizeFieldName(header);

    // Determine entity type from mapping
    const entityType = mapping.entityType || 'lead';

    // Infer section from field name (e.g., linkedin_*, email_*)
    const section = getSectionFromFieldName(fieldName);

    detectedDropdowns.push({
      columnName: header,
      fieldName,
      options: uniqueValues,
      entityType,
      section,
    });
  }

  return detectedDropdowns;
}

/**
 * Detect date fields from CSV headers and data
 * Checks if column name contains "date" or if values match date patterns
 * @param headers CSV column headers
 * @param data CSV data rows
 * @param mappings Current field mappings to determine entity type and section
 * @returns Array of detected date fields
 */
export function detectDateFields(
  headers: string[],
  data: CSVRow[],
  mappings: FieldMapping[]
): DetectedDateField[] {
  const detectedDates: DetectedDateField[] = [];

  for (const header of headers) {
    // Get sample values for date pattern detection
    const sampleValues = data
      .slice(0, 10)
      .map(row => row[header])
      .filter(val => val && val.trim() !== '')
      .map(val => String(val));

    // Check if column is a date field
    if (!isDateColumn(header, sampleValues)) {
      continue;
    }

    // Find mapping for this column to get entity type and section
    const mapping = mappings.find(m => m.csvField === header);

    if (!mapping) {
      continue; // Skip if no mapping found
    }

    // Normalize field name
    const fieldName = normalizeFieldName(header);

    // Determine entity type from mapping
    const entityType = mapping.entityType || 'lead';

    // Infer section from field name (e.g., linkedin_*, email_*)
    const section = getSectionFromFieldName(fieldName);

    detectedDates.push({
      columnName: header,
      fieldName,
      entityType,
      section,
    });
  }

  return detectedDates;
}

/**
 * Get dropdown field name from mapping (handles both standard and custom fields)
 * @param mapping Field mapping
 * @returns Field name for dropdown or null if not applicable
 */
export function getDropdownFieldName(mapping: FieldMapping): string | null {
  if (!mapping.leadField || mapping.leadField === 'skip') {
    return null;
  }

  // For custom fields, return the field name directly
  // For standard fields, they're not dropdowns
  const standardFields = ['name', 'email', 'company', 'phone', 'status'];
  const standardOutreachFields = [
    'outreach.linkedIn.profileUrl',
    'outreach.linkedIn.status',
    'outreach.email.status',
  ];

  if (
    standardFields.includes(mapping.leadField) ||
    standardOutreachFields.includes(mapping.leadField)
  ) {
    return null; // Standard fields are not dropdowns
  }

  return mapping.leadField;
}

/**
 * Apply forward-fill algorithm to handle Excel merged cells
 * Only fills company columns (not lead-specific columns) to prevent data bleeding
 * @param data CSV data rows
 * @param mappings Field mappings to determine which columns are company fields
 * @returns Data with forward-filled company columns
 */
export function applyForwardFill(data: CSVRow[], mappings: FieldMapping[]): CSVRow[] {
  if (data.length === 0) return data;

  const headers = Object.keys(data[0]);

  // Only forward-fill columns mapped to 'company' or detected as company-type
  // This prevents lead data from bleeding into company-only rows
  const columnsToFill: string[] = [];

  for (const header of headers) {
    // Find mapping for this CSV column
    const mapping = mappings.find(m => m.csvField === header);

    if (mapping) {
      // Only fill if it's mapped to company field or entity type is company
      if (mapping.leadField === 'company' || mapping.entityType === 'company') {
        // Also verify that this column actually has merged cells (>20% empty)
        const emptyCells = data.filter(
          (row) => !row[header] || row[header].trim() === ''
        ).length;
        const emptyPercentage = emptyCells / Math.min(data.length, 20);

        if (emptyPercentage > 0.2) {
          columnsToFill.push(header);
        }
      }
    } else {
      // No mapping found - use heuristic detection for company field
      const lowerHeader = header.toLowerCase().trim();
      const isCompanyField = lowerHeader === 'company' ||
                            lowerHeader === 'company name' ||
                            lowerHeader === 'organization';

      if (isCompanyField) {
        const emptyCells = data.filter(
          (row) => !row[header] || row[header].trim() === ''
        ).length;
        const emptyPercentage = emptyCells / Math.min(data.length, 20);

        if (emptyPercentage > 0.2) {
          columnsToFill.push(header);
        }
      }
    }
  }

  // Apply forward-fill ONLY to company columns
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
 * Returns null if validation fails (missing company)
 * Returns { leadData: null, companyData, companyName } for company-only rows (has company, no name)
 * Returns { leadData, companyData, companyName: null } for normal lead rows
 */
function transformRowToLead(
  row: CSVRow,
  mappings: FieldMapping[],
  defaultStatus: LeadStatus
): { leadData: LeadFormData | null; companyData: Record<string, any>; companyName: string | null } | null {
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

      // Generate field name from CSV column name using consistent normalization
      // This ensures field names match the field definitions created for dropdowns
      let fieldName = normalizeFieldName(mapping.csvField);

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

  // Validation logic:
  // - If no company: invalid row, return null
  // - If company but no name: company-only row, return leadData = null
  // - If both: normal lead row

  if (!leadData.company) {
    return null; // Company is required
  }

  // Company-only row (has company but no person name)
  if (!leadData.name) {
    return {
      leadData: null,
      companyData,
      companyName: leadData.company
    };
  }

  // Normal lead row - set default values for optional fields
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

  return { leadData: leadData as LeadFormData, companyData, companyName: null };
}

/**
 * Import leads from CSV data
 * @param data Parsed CSV data
 * @param mappings Field mappings from CSV columns to lead fields
 * @param defaultStatus Default pipeline stage for imported leads
 * @param autoCreateCustomFields Whether to auto-create custom fields for unmapped columns
 * @param userId User ID performing the import
 * @param dropdownFields Optional array of dropdown field definitions to create
 * @param dateFields Optional array of date field definitions to create
 * @param onProgress Optional progress callback
 * @returns Import result with statistics
 */
export async function importLeadsFromCSV(
  data: CSVRow[],
  mappings: FieldMapping[],
  defaultStatus: LeadStatus,
  autoCreateCustomFields: boolean,
  userId: string,
  dropdownFields?: DetectedDropdownField[],
  dateFields?: DetectedDateField[],
  onProgress?: (current: number, total: number) => void
): Promise<ImportResult> {
  const result: ImportResult = {
    successful: 0,
    failed: 0,
    duplicates: 0,
    companiesOnly: 0,
    errors: [],
    totalProcessed: 0,
  };

  // Create field definitions for dropdown fields if provided
  if (dropdownFields && dropdownFields.length > 0) {
    try {
      const fieldDefinitionsToCreate = dropdownFields.map(dropdown => ({
        name: dropdown.fieldName,
        label: getDisplayLabel(dropdown.fieldName),
        entityType: dropdown.entityType,
        fieldType: 'dropdown' as const,
        section: dropdown.section,
        options: dropdown.options,
      }));

      await batchCreateFieldDefinitions(fieldDefinitionsToCreate, userId);
    } catch (error) {
      console.error('Error creating field definitions:', error);
      // Non-blocking: continue with import even if field definitions fail
      result.errors.push(
        `Warning: Failed to create dropdown field definitions: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  // Create field definitions for date fields if provided
  if (dateFields && dateFields.length > 0) {
    try {
      const fieldDefinitionsToCreate = dateFields.map(dateField => ({
        name: dateField.fieldName,
        label: getDisplayLabel(dateField.fieldName),
        entityType: dateField.entityType,
        fieldType: 'date' as const,
        section: dateField.section,
      }));

      await batchCreateFieldDefinitions(fieldDefinitionsToCreate, userId);
    } catch (error) {
      console.error('Error creating date field definitions:', error);
      // Non-blocking: continue with import even if field definitions fail
      result.errors.push(
        `Warning: Failed to create date field definitions: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  // Apply forward-fill for Excel compatibility (only for company columns to prevent data bleeding)
  const filledData = applyForwardFill(data, mappings);

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
          `Row ${rowNumber}: Missing required company field`
        );
        continue;
      }

      const { leadData, companyData, companyName } = transformResult;

      // Handle company-only rows (has company but no person name)
      if (leadData === null && companyName) {
        result.companiesOnly++;

        // Collect company data for company-only rows
        if (Object.keys(companyData).length > 0 || companyName) {
          const companyKey = companyName.toLowerCase();
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
        continue; // Skip lead creation, only create company
      }

      // Normal lead row processing
      // Fast duplicate check using Map
      const duplicateCheck = checkDuplicateFromMap(
        leadData!.name,
        leadData!.company,
        existingLeadsMap,
        batchLeads
      );

      if (duplicateCheck.isDuplicate) {
        result.duplicates++;
        result.errors.push(
          `Row ${rowNumber}: Skipped - duplicate of existing lead "${leadData!.name} at ${leadData!.company}"`
        );
        continue;
      }

      validLeadsData.push(leadData!);
      batchLeads.push({ name: leadData!.name, company: leadData!.company });

      // Collect company data - merge data from multiple leads of the same company
      if (Object.keys(companyData).length > 0) {
        const companyKey = leadData!.company.toLowerCase();
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
