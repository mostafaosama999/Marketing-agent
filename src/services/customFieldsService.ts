import {
  collection,
  doc,
  getDoc,
  setDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../app/config/firebase';
import {
  CustomFieldsConfig,
  CustomField,
  DEFAULT_CUSTOM_FIELDS,
} from '../app/types/crm';

const CUSTOM_FIELDS_COLLECTION = 'custom_fields';
const DEFAULT_CONFIG_ID = 'default'; // Single config for all users

/**
 * Convert Firestore document to CustomFieldsConfig
 */
function convertToCustomFieldsConfig(id: string, data: any): CustomFieldsConfig {
  return {
    id,
    fields: data.fields || [],
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Create default custom fields configuration
 */
export async function createDefaultCustomFields(): Promise<CustomFieldsConfig> {
  const fields: CustomField[] = DEFAULT_CUSTOM_FIELDS.map((field, index) => ({
    id: `field-${index}-${Date.now()}`,
    ...field,
  }));

  const config: Omit<CustomFieldsConfig, 'id' | 'createdAt' | 'updatedAt'> = {
    fields,
  };

  const configRef = doc(db, CUSTOM_FIELDS_COLLECTION, DEFAULT_CONFIG_ID);
  await setDoc(configRef, {
    ...config,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return {
    id: DEFAULT_CONFIG_ID,
    ...config,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

/**
 * Get or create custom fields configuration
 */
export async function getCustomFields(): Promise<CustomFieldsConfig> {
  const configRef = doc(db, CUSTOM_FIELDS_COLLECTION, DEFAULT_CONFIG_ID);
  const configSnap = await getDoc(configRef);

  if (configSnap.exists()) {
    return convertToCustomFieldsConfig(configSnap.id, configSnap.data());
  } else {
    // Create default if doesn't exist
    return await createDefaultCustomFields();
  }
}

/**
 * Subscribe to custom fields configuration updates
 */
export function subscribeToCustomFields(
  callback: (config: CustomFieldsConfig | null) => void
): Unsubscribe {
  const configRef = doc(db, CUSTOM_FIELDS_COLLECTION, DEFAULT_CONFIG_ID);

  return onSnapshot(
    configRef,
    async (doc) => {
      if (doc.exists()) {
        callback(convertToCustomFieldsConfig(doc.id, doc.data()));
      } else {
        // Create default if doesn't exist
        const defaultConfig = await createDefaultCustomFields();
        callback(defaultConfig);
      }
    },
    (error) => {
      console.error('Error listening to custom fields:', error);
      callback(null);
    }
  );
}

/**
 * Update custom fields configuration
 */
export async function updateCustomFields(fields: CustomField[]): Promise<void> {
  try {
    const configRef = doc(db, CUSTOM_FIELDS_COLLECTION, DEFAULT_CONFIG_ID);
    await setDoc(
      configRef,
      {
        fields,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating custom fields:', error);
    throw error;
  }
}

/**
 * Create a new custom field
 */
export async function createCustomField(
  field: Omit<CustomField, 'id'>
): Promise<string> {
  try {
    const config = await getCustomFields();
    const newField: CustomField = {
      id: `field-${Date.now()}`,
      ...field,
    };

    const updatedFields = [...config.fields, newField];
    await updateCustomFields(updatedFields);

    return newField.id;
  } catch (error) {
    console.error('Error creating custom field:', error);
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
    const config = await getCustomFields();
    const updatedFields = config.fields.map((field) =>
      field.id === fieldId ? { ...field, ...updates } : field
    );

    await updateCustomFields(updatedFields);
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
    const config = await getCustomFields();
    const updatedFields = config.fields.filter((field) => field.id !== fieldId);

    await updateCustomFields(updatedFields);
  } catch (error) {
    console.error('Error deleting custom field:', error);
    throw error;
  }
}

/**
 * Reorder custom fields
 */
export async function reorderCustomFields(fields: CustomField[]): Promise<void> {
  try {
    // Update order property based on array index
    const reorderedFields = fields.map((field, index) => ({
      ...field,
      order: index,
    }));

    await updateCustomFields(reorderedFields);
  } catch (error) {
    console.error('Error reordering custom fields:', error);
    throw error;
  }
}
