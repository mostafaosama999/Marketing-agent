// src/utils/migrateCompanyFieldDefinitions.ts
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase/firestore';
import {
  getFieldDefinitions,
  createFieldDefinition
} from '../services/api/fieldDefinitionsService';
import { getSectionFromFieldName } from '../types/fieldDefinitions';
import type { FieldType, FieldSection } from '../types/fieldDefinitions';

interface FieldAnalysis {
  name: string;
  label: string;
  fieldType: FieldType;
  section: FieldSection;
  options?: string[];
  sampleValues: any[];
  occurrences: number;
}

/**
 * Analyze a value to determine its field type
 */
function detectFieldType(values: any[]): FieldType {
  const nonEmptyValues = values.filter(v => v !== null && v !== undefined && v !== '');

  if (nonEmptyValues.length === 0) return 'text';

  // Check if all values are numbers
  const allNumbers = nonEmptyValues.every(v => {
    const num = Number(v);
    return !isNaN(num) && typeof v !== 'boolean';
  });
  if (allNumbers) return 'number';

  // Check if all values are valid dates
  const allDates = nonEmptyValues.every(v => {
    if (typeof v === 'string') {
      const date = new Date(v);
      return !isNaN(date.getTime()) && (
        v.includes('-') || v.includes('/') || v.includes('T')
      );
    }
    return v instanceof Date && !isNaN(v.getTime());
  });
  if (allDates) return 'date';

  // Check if field name suggests dropdown
  const fieldNameLower = values[0]?.toString().toLowerCase() || '';
  if (fieldNameLower.includes('status') || fieldNameLower.includes('type')) {
    // If there are relatively few unique values (< 20), treat as dropdown
    const uniqueValues = Array.from(new Set(nonEmptyValues.map(v => String(v))));
    if (uniqueValues.length > 0 && uniqueValues.length <= 20) {
      return 'dropdown';
    }
  }

  // Default to text
  return 'text';
}

/**
 * Convert field name to human-readable label
 * e.g., "communityProgramStatus" -> "Community Program Status"
 */
function generateLabel(fieldName: string): string {
  return fieldName
    // Split on camelCase
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    // Split on underscores
    .replace(/_/g, ' ')
    // Capitalize first letter of each word
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Extract all unique custom field names from companies
 */
async function analyzeCompanyCustomFields(): Promise<Map<string, FieldAnalysis>> {
  console.log('📊 Analyzing company custom fields...');

  const companiesRef = collection(db, 'companies');
  const snapshot = await getDocs(companiesRef);

  const fieldData = new Map<string, any[]>();

  // Collect all field values
  snapshot.forEach(doc => {
    const company = doc.data();
    const customFields = company.customFields || {};

    Object.entries(customFields).forEach(([fieldName, value]) => {
      if (!fieldData.has(fieldName)) {
        fieldData.set(fieldName, []);
      }
      fieldData.get(fieldName)!.push(value);
    });
  });

  // Analyze each field
  const analysis = new Map<string, FieldAnalysis>();

  fieldData.forEach((values, fieldName) => {
    const fieldType = detectFieldType(values);
    const section = getSectionFromFieldName(fieldName);

    // Extract unique options for dropdown fields
    let options: string[] | undefined;
    if (fieldType === 'dropdown') {
      const uniqueValues = Array.from(new Set(values
        .filter(v => v !== null && v !== undefined && v !== '')
        .map(v => String(v))
      ));
      options = uniqueValues.sort();
    }

    analysis.set(fieldName, {
      name: fieldName,
      label: generateLabel(fieldName),
      fieldType,
      section,
      options,
      sampleValues: values.slice(0, 3), // Keep first 3 as samples
      occurrences: values.filter(v => v !== null && v !== undefined && v !== '').length,
    });
  });

  console.log(`📊 Found ${analysis.size} unique custom fields in company data`);
  return analysis;
}

/**
 * Identify fields that don't have definitions yet
 */
async function identifyMissingFieldDefinitions(): Promise<FieldAnalysis[]> {
  console.log('🔍 Identifying missing field definitions...');

  // Get all existing field definitions for companies
  const existingDefs = await getFieldDefinitions('company');
  const existingFieldNames = new Set(existingDefs.map(def => def.name));

  console.log(`✅ Found ${existingFieldNames.size} existing field definitions`);

  // Analyze all fields in company data
  const allFields = await analyzeCompanyCustomFields();

  // Find missing fields
  const missingFields: FieldAnalysis[] = [];
  allFields.forEach((analysis, fieldName) => {
    if (!existingFieldNames.has(fieldName)) {
      missingFields.push(analysis);
    }
  });

  console.log(`❌ Found ${missingFields.length} missing field definitions`);

  return missingFields;
}

/**
 * Create field definitions for missing fields
 */
export async function migrateCompanyFieldDefinitions(
  dryRun: boolean = true,
  userId: string = 'system'
): Promise<{
  success: boolean;
  missingFields: FieldAnalysis[];
  created: number;
  errors: string[];
}> {
  console.log('🚀 Starting field definitions migration...');
  console.log(`Mode: ${dryRun ? 'DRY RUN (preview only)' : 'LIVE (will create definitions)'}`);

  const errors: string[] = [];
  let created = 0;

  try {
    // Identify missing fields
    const missingFields = await identifyMissingFieldDefinitions();

    if (missingFields.length === 0) {
      console.log('✅ No missing field definitions found. All fields are properly defined!');
      return {
        success: true,
        missingFields: [],
        created: 0,
        errors: [],
      };
    }

    console.log('\n📋 Missing Field Definitions:');
    console.log('─'.repeat(80));

    // Group by section for better readability
    const bySection = {
      general: missingFields.filter(f => f.section === 'general'),
      linkedin: missingFields.filter(f => f.section === 'linkedin'),
      email: missingFields.filter(f => f.section === 'email'),
    };

    Object.entries(bySection).forEach(([section, fields]) => {
      if (fields.length > 0) {
        console.log(`\n${section.toUpperCase()} (${fields.length} fields):`);
        fields.forEach(field => {
          console.log(`  • ${field.label} (${field.name})`);
          console.log(`    Type: ${field.fieldType}, Occurrences: ${field.occurrences}`);
          if (field.options && field.options.length > 0) {
            console.log(`    Options: ${field.options.join(', ')}`);
          }
        });
      }
    });

    console.log('\n' + '─'.repeat(80));

    if (dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes made');
      console.log(`Would create ${missingFields.length} field definitions`);
      return {
        success: true,
        missingFields,
        created: 0,
        errors: [],
      };
    }

    // Create field definitions
    console.log('\n📝 Creating field definitions...');

    for (const field of missingFields) {
      try {
        await createFieldDefinition({
          name: field.name,
          label: field.label,
          entityType: 'company',
          fieldType: field.fieldType,
          section: field.section,
          options: field.options,
          required: false,
        }, userId);

        created++;
        console.log(`✅ Created: ${field.label}`);
      } catch (error: any) {
        const errorMsg = `Failed to create ${field.name}: ${error.message}`;
        errors.push(errorMsg);
        console.error(`❌ ${errorMsg}`);
      }
    }

    console.log('\n✅ Migration complete!');
    console.log(`Created: ${created}/${missingFields.length} field definitions`);

    if (errors.length > 0) {
      console.log(`⚠️  Errors: ${errors.length}`);
    }

    return {
      success: errors.length === 0,
      missingFields,
      created,
      errors,
    };

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      missingFields: [],
      created: 0,
      errors: [error.message],
    };
  }
}

/**
 * Preview missing field definitions without creating them
 */
export async function previewMissingFieldDefinitions(): Promise<FieldAnalysis[]> {
  const result = await migrateCompanyFieldDefinitions(true);
  return result.missingFields;
}
