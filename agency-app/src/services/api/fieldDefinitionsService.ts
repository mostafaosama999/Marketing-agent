/**
 * Field Definitions Service
 *
 * Handles CRUD operations for field definitions in Firestore.
 * Field definitions define the schema for custom fields including dropdown/status fields.
 */

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import {
  FieldDefinition,
  CreateFieldDefinitionData,
  EntityType,
  generateFieldId,
} from '../../types/fieldDefinitions';

const COLLECTION_NAME = 'fieldDefinitions';

/**
 * Create a new field definition
 */
export const createFieldDefinition = async (
  data: CreateFieldDefinitionData,
  userId: string
): Promise<FieldDefinition> => {
  const fieldId = generateFieldId(data.entityType, data.name);

  const fieldDefinition: FieldDefinition = {
    id: fieldId,
    ...data,
    createdAt: new Date(),
    createdBy: userId,
  };

  const docRef = doc(db, COLLECTION_NAME, fieldId);
  await setDoc(docRef, {
    ...fieldDefinition,
    createdAt: Timestamp.fromDate(fieldDefinition.createdAt),
  });

  return fieldDefinition;
};

/**
 * Get a single field definition by ID
 */
export const getFieldDefinition = async (
  fieldId: string
): Promise<FieldDefinition | null> => {
  const docRef = doc(db, COLLECTION_NAME, fieldId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) {
    return null;
  }

  const data = docSnap.data();
  return {
    ...data,
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  } as FieldDefinition;
};

/**
 * Get field definition by entity type and field name
 */
export const getFieldDefinitionByName = async (
  entityType: EntityType,
  fieldName: string
): Promise<FieldDefinition | null> => {
  const fieldId = generateFieldId(entityType, fieldName);
  return getFieldDefinition(fieldId);
};

/**
 * Get all field definitions, optionally filtered by entity type
 */
export const getFieldDefinitions = async (
  entityType?: EntityType
): Promise<FieldDefinition[]> => {
  const collectionRef = collection(db, COLLECTION_NAME);

  let q = query(collectionRef);
  if (entityType) {
    q = query(collectionRef, where('entityType', '==', entityType));
  }

  const querySnapshot = await getDocs(q);

  return querySnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
    } as FieldDefinition;
  });
};

/**
 * Get all dropdown field definitions
 */
export const getDropdownFieldDefinitions = async (
  entityType?: EntityType
): Promise<FieldDefinition[]> => {
  const allDefinitions = await getFieldDefinitions(entityType);
  return allDefinitions.filter(def => def.fieldType === 'dropdown');
};

/**
 * Update a field definition
 */
export const updateFieldDefinition = async (
  fieldId: string,
  updates: Partial<CreateFieldDefinitionData>,
  userId: string
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, fieldId);

  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
};

/**
 * Delete a field definition
 */
export const deleteFieldDefinition = async (fieldId: string): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, fieldId);
  await deleteDoc(docRef);
};

/**
 * Get dropdown options for a specific field
 */
export const getDropdownOptions = async (
  entityType: EntityType,
  fieldName: string
): Promise<string[]> => {
  const fieldDefinition = await getFieldDefinitionByName(entityType, fieldName);

  if (!fieldDefinition || fieldDefinition.fieldType !== 'dropdown') {
    return [];
  }

  return fieldDefinition.options || [];
};

/**
 * Update dropdown options for a field
 */
export const updateDropdownOptions = async (
  fieldId: string,
  options: string[],
  userId: string
): Promise<void> => {
  const docRef = doc(db, COLLECTION_NAME, fieldId);

  await updateDoc(docRef, {
    options,
    updatedAt: Timestamp.now(),
    updatedBy: userId,
  });
};

/**
 * Batch create field definitions (useful for CSV import)
 */
export const batchCreateFieldDefinitions = async (
  definitions: CreateFieldDefinitionData[],
  userId: string
): Promise<FieldDefinition[]> => {
  const createdDefinitions: FieldDefinition[] = [];

  // Check for existing definitions to avoid duplicates
  const existingIds = new Set<string>();
  for (const data of definitions) {
    const fieldId = generateFieldId(data.entityType, data.name);
    const existing = await getFieldDefinition(fieldId);
    if (existing) {
      existingIds.add(fieldId);
      createdDefinitions.push(existing);
    }
  }

  // Create new definitions
  for (const data of definitions) {
    const fieldId = generateFieldId(data.entityType, data.name);
    if (!existingIds.has(fieldId)) {
      const newDefinition = await createFieldDefinition(data, userId);
      createdDefinitions.push(newDefinition);
    }
  }

  return createdDefinitions;
};

/**
 * Check if a field definition exists
 */
export const fieldDefinitionExists = async (
  entityType: EntityType,
  fieldName: string
): Promise<boolean> => {
  const fieldId = generateFieldId(entityType, fieldName);
  const docRef = doc(db, COLLECTION_NAME, fieldId);
  const docSnap = await getDoc(docRef);
  return docSnap.exists();
};

/**
 * Merge or update field definition options
 * Useful when importing new CSV with additional dropdown values
 */
export const mergeDropdownOptions = async (
  entityType: EntityType,
  fieldName: string,
  newOptions: string[],
  userId: string
): Promise<string[]> => {
  const fieldId = generateFieldId(entityType, fieldName);
  const existing = await getFieldDefinition(fieldId);

  if (!existing) {
    // Create new field definition
    await createFieldDefinition(
      {
        name: fieldName,
        label: fieldName
          .split('_')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        entityType,
        fieldType: 'dropdown',
        section: 'general',
        options: newOptions,
      },
      userId
    );
    return newOptions;
  }

  // Merge with existing options
  const existingOptions = existing.options || [];
  const mergedOptions = Array.from(new Set([...existingOptions, ...newOptions])).sort();

  await updateDropdownOptions(fieldId, mergedOptions, userId);

  return mergedOptions;
};
