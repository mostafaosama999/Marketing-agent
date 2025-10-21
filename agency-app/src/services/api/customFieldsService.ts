// src/services/api/customFieldsService.ts
// Service for managing custom field configurations

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import {
  CustomField,
  CustomFieldsConfig,
  CustomFieldType,
  DEFAULT_CUSTOM_FIELDS,
} from '../../types/crm';

const CUSTOM_FIELDS_COLLECTION = 'customFields';
const CONFIG_DOC_ID = 'config'; // Singleton document

/**
 * Get custom fields configuration
 * Returns default fields if no configuration exists
 */
export async function getCustomFieldsConfig(): Promise<CustomFieldsConfig> {
  try {
    const configRef = doc(db, CUSTOM_FIELDS_COLLECTION, CONFIG_DOC_ID);
    const configDoc = await getDoc(configRef);

    if (!configDoc.exists()) {
      // Initialize with default fields
      const defaultConfig: CustomFieldsConfig = {
        id: CONFIG_DOC_ID,
        fields: DEFAULT_CUSTOM_FIELDS.map((field, index) => ({
          ...field,
          id: `field_${index}`,
        })),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Save to Firestore
      await setDoc(configRef, {
        fields: defaultConfig.fields,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return defaultConfig;
    }

    const data = configDoc.data();
    return {
      id: configDoc.id,
      fields: data.fields || [],
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  } catch (error) {
    console.error('Error getting custom fields config:', error);
    // Return default fields on error
    return {
      id: CONFIG_DOC_ID,
      fields: DEFAULT_CUSTOM_FIELDS.map((field, index) => ({
        ...field,
        id: `field_${index}`,
      })),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * Add a new custom field
 */
export async function addCustomField(
  field: Omit<CustomField, 'id'>
): Promise<CustomField> {
  try {
    const config = await getCustomFieldsConfig();

    // Generate unique ID
    const newId = `field_${Date.now()}`;
    const newField: CustomField = {
      ...field,
      id: newId,
    };

    const updatedFields = [...config.fields, newField];

    const configRef = doc(db, CUSTOM_FIELDS_COLLECTION, CONFIG_DOC_ID);
    await updateDoc(configRef, {
      fields: updatedFields,
      updatedAt: serverTimestamp(),
    });

    return newField;
  } catch (error) {
    console.error('Error adding custom field:', error);
    throw error;
  }
}

/**
 * Update an existing custom field
 */
export async function updateCustomField(
  fieldId: string,
  updates: Partial<Omit<CustomField, 'id'>>
): Promise<void> {
  try {
    const config = await getCustomFieldsConfig();

    const updatedFields = config.fields.map((field) =>
      field.id === fieldId ? { ...field, ...updates } : field
    );

    const configRef = doc(db, CUSTOM_FIELDS_COLLECTION, CONFIG_DOC_ID);
    await updateDoc(configRef, {
      fields: updatedFields,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating custom field:', error);
    throw error;
  }
}

/**
 * Delete a custom field
 */
export async function deleteCustomField(fieldId: string): Promise<void> {
  try {
    const config = await getCustomFieldsConfig();

    const updatedFields = config.fields.filter((field) => field.id !== fieldId);

    const configRef = doc(db, CUSTOM_FIELDS_COLLECTION, CONFIG_DOC_ID);
    await updateDoc(configRef, {
      fields: updatedFields,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error deleting custom field:', error);
    throw error;
  }
}

/**
 * Sanitize column name to create field name
 * Example: "Lead Owner" -> "lead_owner"
 */
export function sanitizeFieldName(columnName: string): string {
  return columnName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_') // Replace non-alphanumeric with underscore
    .replace(/^_+|_+$/g, ''); // Remove leading/trailing underscores
}

/**
 * Format field name to create label
 * Example: "lead_owner" -> "Lead Owner"
 */
export function formatFieldLabel(fieldName: string): string {
  return fieldName
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Auto-create custom field from CSV column
 * Returns the created field
 */
export async function autoCreateCustomField(
  columnName: string,
  type: CustomFieldType
): Promise<CustomField> {
  try {
    const fieldName = sanitizeFieldName(columnName);
    const label = formatFieldLabel(columnName);

    // Check if field with this name already exists
    const config = await getCustomFieldsConfig();
    const existingField = config.fields.find((f) => f.name === fieldName);

    if (existingField) {
      return existingField;
    }

    // Create new field
    const newField: Omit<CustomField, 'id'> = {
      name: fieldName,
      label: label,
      type: type,
      required: false,
      visible: true,
      showInTable: true,
      showInCard: true,
      order: config.fields.length,
    };

    return await addCustomField(newField);
  } catch (error) {
    console.error('Error auto-creating custom field:', error);
    throw error;
  }
}
