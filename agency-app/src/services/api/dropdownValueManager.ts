/**
 * Dropdown Value Manager Service
 *
 * Handles renaming and deleting dropdown values across all leads and companies.
 * When a dropdown value is renamed or deleted, this service updates all entities
 * that reference that value.
 */

import {
  collection,
  getDocs,
  query,
  where,
  writeBatch,
  doc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { EntityType } from '../../types/fieldDefinitions';
import { updateDropdownOptions, getFieldDefinitionByName } from './fieldDefinitionsService';

/**
 * Result of a rename or delete operation
 */
export interface DropdownValueUpdateResult {
  success: boolean;
  affectedCount: number;
  error?: string;
}

/**
 * Get the Firestore field path for a given field name
 * Handles special cases like linkedin_status and email_status
 */
const getFieldPath = (fieldName: string): string => {
  if (fieldName === 'linkedin_status') {
    return 'outreach.linkedIn.status';
  }
  if (fieldName === 'email_status') {
    return 'outreach.email.status';
  }
  // Default: custom field
  return `customFields.${fieldName}`;
};

/**
 * Get all documents that match a field value
 * Handles both custom fields and special outreach fields
 */
const getMatchingDocuments = async (
  collectionName: string,
  fieldName: string,
  value: string
) => {
  const collectionRef = collection(db, collectionName);
  const fieldPath = getFieldPath(fieldName);

  const q = query(
    collectionRef,
    where(fieldPath, '==', value)
  );

  return await getDocs(q);
};

/**
 * Rename a dropdown value across all entities
 * This updates both the field definition options and all entity records
 */
export const renameDropdownValue = async (
  entityType: EntityType,
  fieldName: string,
  oldValue: string,
  newValue: string,
  userId: string
): Promise<DropdownValueUpdateResult> => {
  try {
    // Validate inputs
    if (!oldValue || !newValue) {
      return {
        success: false,
        affectedCount: 0,
        error: 'Old and new values cannot be empty',
      };
    }

    if (oldValue === newValue) {
      return {
        success: false,
        affectedCount: 0,
        error: 'New value must be different from old value',
      };
    }

    // Get field definition to access options
    const fieldDefinition = await getFieldDefinitionByName(entityType, fieldName);
    if (!fieldDefinition) {
      return {
        success: false,
        affectedCount: 0,
        error: `Field definition not found for ${fieldName}`,
      };
    }

    if (fieldDefinition.fieldType !== 'dropdown') {
      return {
        success: false,
        affectedCount: 0,
        error: 'Field is not a dropdown type',
      };
    }

    const options = fieldDefinition.options || [];

    // Check if old value exists in options
    if (!options.includes(oldValue)) {
      return {
        success: false,
        affectedCount: 0,
        error: `Value "${oldValue}" not found in dropdown options`,
      };
    }

    // Check if new value already exists
    if (options.includes(newValue)) {
      return {
        success: false,
        affectedCount: 0,
        error: `Value "${newValue}" already exists in dropdown options`,
      };
    }

    // Determine collection name
    const collectionName = entityType === 'lead' ? 'leads' : 'companies';

    // Query all entities with this field value
    const querySnapshot = await getMatchingDocuments(collectionName, fieldName, oldValue);

    // Update entities in batches (Firestore limit is 500 operations per batch)
    const batchSize = 500;
    let affectedCount = 0;
    const docs = querySnapshot.docs;
    const fieldPath = getFieldPath(fieldName);

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = docs.slice(i, i + batchSize);

      batchDocs.forEach((docSnap) => {
        const docRef = doc(db, collectionName, docSnap.id);
        batch.update(docRef, {
          [fieldPath]: newValue,
          updatedAt: Timestamp.now(),
        });
      });

      await batch.commit();
      affectedCount += batchDocs.length;
    }

    // Update field definition options (replace old value with new value)
    const updatedOptions = options.map(opt => opt === oldValue ? newValue : opt).sort();
    await updateDropdownOptions(fieldDefinition.id, updatedOptions, userId);

    return {
      success: true,
      affectedCount,
    };
  } catch (error) {
    console.error('Error renaming dropdown value:', error);
    return {
      success: false,
      affectedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Delete a dropdown value across all entities
 * This removes the value from field definition options and clears it from all entity records
 */
export const deleteDropdownValue = async (
  entityType: EntityType,
  fieldName: string,
  valueToDelete: string,
  userId: string,
  replacementValue?: string // Optional: replace with this value instead of clearing
): Promise<DropdownValueUpdateResult> => {
  try {
    // Validate inputs
    if (!valueToDelete) {
      return {
        success: false,
        affectedCount: 0,
        error: 'Value to delete cannot be empty',
      };
    }

    // Get field definition to access options
    const fieldDefinition = await getFieldDefinitionByName(entityType, fieldName);
    if (!fieldDefinition) {
      return {
        success: false,
        affectedCount: 0,
        error: `Field definition not found for ${fieldName}`,
      };
    }

    if (fieldDefinition.fieldType !== 'dropdown') {
      return {
        success: false,
        affectedCount: 0,
        error: 'Field is not a dropdown type',
      };
    }

    const options = fieldDefinition.options || [];

    // Check if value exists in options
    if (!options.includes(valueToDelete)) {
      return {
        success: false,
        affectedCount: 0,
        error: `Value "${valueToDelete}" not found in dropdown options`,
      };
    }

    // Ensure at least one option remains after deletion
    if (options.length <= 1) {
      return {
        success: false,
        affectedCount: 0,
        error: 'Cannot delete the last remaining option. Dropdown must have at least one option.',
      };
    }

    // If replacement value provided, validate it exists
    if (replacementValue && !options.includes(replacementValue)) {
      return {
        success: false,
        affectedCount: 0,
        error: `Replacement value "${replacementValue}" not found in dropdown options`,
      };
    }

    // Determine collection name
    const collectionName = entityType === 'lead' ? 'leads' : 'companies';

    // Query all entities with this field value
    const querySnapshot = await getMatchingDocuments(collectionName, fieldName, valueToDelete);

    // Update entities in batches
    const batchSize = 500;
    let affectedCount = 0;
    const docs = querySnapshot.docs;
    const fieldPath = getFieldPath(fieldName);

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchDocs = docs.slice(i, i + batchSize);

      batchDocs.forEach((docSnap) => {
        const docRef = doc(db, collectionName, docSnap.id);

        // Either replace with new value or clear the field
        const updateData: any = {
          updatedAt: Timestamp.now(),
        };

        if (replacementValue) {
          updateData[fieldPath] = replacementValue;
        } else {
          // Clear the field by setting to empty string or 'not_sent' for outreach fields
          const isOutreachField = fieldName === 'linkedin_status' || fieldName === 'email_status';
          updateData[fieldPath] = isOutreachField ? 'not_sent' : '';
        }

        batch.update(docRef, updateData);
      });

      await batch.commit();
      affectedCount += batchDocs.length;
    }

    // Update field definition options (remove the deleted value)
    const updatedOptions = options.filter(opt => opt !== valueToDelete);
    await updateDropdownOptions(fieldDefinition.id, updatedOptions, userId);

    return {
      success: true,
      affectedCount,
    };
  } catch (error) {
    console.error('Error deleting dropdown value:', error);
    return {
      success: false,
      affectedCount: 0,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

/**
 * Get count of entities using a specific dropdown value
 * Useful for showing warning before deletion
 */
export const getDropdownValueUsageCount = async (
  entityType: EntityType,
  fieldName: string,
  value: string
): Promise<number> => {
  try {
    const collectionName = entityType === 'lead' ? 'leads' : 'companies';
    const querySnapshot = await getMatchingDocuments(collectionName, fieldName, value);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting dropdown value usage count:', error);
    return 0;
  }
};
