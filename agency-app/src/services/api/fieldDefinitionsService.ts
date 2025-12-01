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
  deleteField,
  query,
  where,
  Timestamp,
  writeBatch,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import {
  FieldDefinition,
  CreateFieldDefinitionData,
  EntityType,
  generateFieldId,
} from '../../types/fieldDefinitions';

const COLLECTION_NAME = 'fieldDefinitions';
const LEADS_COLLECTION = 'leads';
const COMPANIES_COLLECTION = 'entities';
const BATCH_SIZE = 500; // Firestore batch limit

/**
 * Progress callback type for batch operations
 */
export type BatchProgressCallback = (progress: {
  current: number;
  total: number;
  currentEntity: 'leads' | 'companies';
  phase: 'preparing' | 'processing' | 'finalizing' | 'completed' | 'error';
}) => void;

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
    id: docSnap.id, // Use document ID as the field id
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

  return querySnapshot.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id, // Use document ID as the field id
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

/**
 * Get count of records that will be affected by a field operation
 */
export const getAffectedRecordCount = async (
  entityType: EntityType
): Promise<number> => {
  const collectionName = entityType === 'lead' ? LEADS_COLLECTION : COMPANIES_COLLECTION;
  const collectionRef = collection(db, collectionName);
  const snapshot = await getCountFromServer(collectionRef);
  return snapshot.data().count;
};

/**
 * Get count of records that have a value for a specific field
 * This gives a more accurate representation of what will be affected by edit/delete
 */
export const getFieldValueCount = async (
  entityType: EntityType,
  fieldName: string,
  isDefaultField: boolean
): Promise<number> => {
  const collectionName = entityType === 'lead' ? LEADS_COLLECTION : COMPANIES_COLLECTION;
  const collectionRef = collection(db, collectionName);

  // For default fields, query where the field is not null
  // For custom fields, we need to check customFields.fieldName
  // Firestore doesn't support != null directly, so we query where field exists
  // by checking if it's greater than empty string (for strings) or using a workaround

  if (isDefaultField) {
    // For default fields, query where field != null
    // We use a workaround: count all docs and subtract those where field is null/undefined
    // Actually, Firestore doesn't have a "not null" query, so we need to fetch and count
    const snapshot = await getDocs(collectionRef);
    let count = 0;
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data[fieldName] !== undefined && data[fieldName] !== null && data[fieldName] !== '') {
        count++;
      }
    });
    return count;
  } else {
    // For custom fields, check customFields.fieldName
    const snapshot = await getDocs(collectionRef);
    let count = 0;
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      const customFields = data.customFields || {};
      if (customFields[fieldName] !== undefined && customFields[fieldName] !== null && customFields[fieldName] !== '') {
        count++;
      }
    });
    return count;
  }
};

/**
 * Rename a field across all records with data migration
 * For custom fields: renames key in customFields object
 * For default fields: renames top-level property
 */
export const renameFieldWithDataMigration = async (
  entityType: EntityType,
  oldFieldName: string,
  newFieldName: string,
  isDefaultField: boolean,
  userId: string,
  onProgress?: BatchProgressCallback
): Promise<void> => {
  const collectionName = entityType === 'lead' ? LEADS_COLLECTION : COMPANIES_COLLECTION;
  const currentEntity = entityType === 'lead' ? 'leads' : 'companies';

  // Phase 1: Preparing
  onProgress?.({
    current: 0,
    total: 0,
    currentEntity,
    phase: 'preparing',
  });

  // Get all documents
  const collectionRef = collection(db, collectionName);
  const snapshot = await getDocs(collectionRef);
  const total = snapshot.docs.length;

  if (total === 0) {
    // No records to update, just update the field definition
    if (!isDefaultField) {
      const oldFieldId = generateFieldId(entityType, oldFieldName);
      const existingDef = await getFieldDefinition(oldFieldId);
      if (existingDef) {
        // Create new field definition with new name
        const newFieldId = generateFieldId(entityType, newFieldName);
        const newLabel = newFieldName
          .split('_')
          .map(w => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');

        await setDoc(doc(db, COLLECTION_NAME, newFieldId), {
          ...existingDef,
          id: newFieldId,
          name: newFieldName,
          label: newLabel,
          updatedAt: Timestamp.now(),
          updatedBy: userId,
        });

        // Delete old field definition
        await deleteDoc(doc(db, COLLECTION_NAME, oldFieldId));
      }
    }

    onProgress?.({
      current: 0,
      total: 0,
      currentEntity,
      phase: 'completed',
    });
    return;
  }

  // Phase 2: Processing in batches
  let processed = 0;

  for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchDocs = snapshot.docs.slice(i, Math.min(i + BATCH_SIZE, snapshot.docs.length));

    for (const docSnapshot of batchDocs) {
      const docRef = doc(db, collectionName, docSnapshot.id);
      const data = docSnapshot.data();

      if (isDefaultField) {
        // For default fields: rename top-level property
        if (data[oldFieldName] !== undefined) {
          batch.update(docRef, {
            [newFieldName]: data[oldFieldName],
            [oldFieldName]: deleteField(),
            updatedAt: Timestamp.now(),
          });
        }
      } else {
        // For custom fields: rename key in customFields object
        const customFields = data.customFields || {};
        if (customFields[oldFieldName] !== undefined) {
          batch.update(docRef, {
            [`customFields.${newFieldName}`]: customFields[oldFieldName],
            [`customFields.${oldFieldName}`]: deleteField(),
            updatedAt: Timestamp.now(),
          });
        }
      }
    }

    await batch.commit();
    processed += batchDocs.length;

    onProgress?.({
      current: processed,
      total,
      currentEntity,
      phase: 'processing',
    });
  }

  // Phase 3: Finalizing - update field definition
  onProgress?.({
    current: processed,
    total,
    currentEntity,
    phase: 'finalizing',
  });

  if (!isDefaultField) {
    const oldFieldId = generateFieldId(entityType, oldFieldName);
    const existingDef = await getFieldDefinition(oldFieldId);

    if (existingDef) {
      // Create new field definition with new name
      const newFieldId = generateFieldId(entityType, newFieldName);
      const newLabel = newFieldName
        .split('_')
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');

      await setDoc(doc(db, COLLECTION_NAME, newFieldId), {
        ...existingDef,
        id: newFieldId,
        name: newFieldName,
        label: newLabel,
        createdAt: existingDef.createdAt ? Timestamp.fromDate(existingDef.createdAt) : Timestamp.now(),
        updatedAt: Timestamp.now(),
        updatedBy: userId,
      });

      // Delete old field definition
      await deleteDoc(doc(db, COLLECTION_NAME, oldFieldId));
    }
  }

  // Phase 4: Completed
  onProgress?.({
    current: processed,
    total,
    currentEntity,
    phase: 'completed',
  });
};

/**
 * Delete a field from all records
 * For custom fields: removes key from customFields object
 * For default fields: removes top-level property
 */
export const deleteFieldWithDataRemoval = async (
  entityType: EntityType,
  fieldName: string,
  isDefaultField: boolean,
  onProgress?: BatchProgressCallback
): Promise<void> => {
  const collectionName = entityType === 'lead' ? LEADS_COLLECTION : COMPANIES_COLLECTION;
  const currentEntity = entityType === 'lead' ? 'leads' : 'companies';

  // Phase 1: Preparing
  onProgress?.({
    current: 0,
    total: 0,
    currentEntity,
    phase: 'preparing',
  });

  // Get all documents
  const collectionRef = collection(db, collectionName);
  const snapshot = await getDocs(collectionRef);
  const total = snapshot.docs.length;

  if (total === 0) {
    // No records to update, just delete the field definition
    if (!isDefaultField) {
      const fieldId = generateFieldId(entityType, fieldName);
      await deleteDoc(doc(db, COLLECTION_NAME, fieldId));
    }

    onProgress?.({
      current: 0,
      total: 0,
      currentEntity,
      phase: 'completed',
    });
    return;
  }

  // Phase 2: Processing in batches
  let processed = 0;

  for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const batchDocs = snapshot.docs.slice(i, Math.min(i + BATCH_SIZE, snapshot.docs.length));

    for (const docSnapshot of batchDocs) {
      const docRef = doc(db, collectionName, docSnapshot.id);
      const data = docSnapshot.data();

      if (isDefaultField) {
        // For default fields: remove top-level property
        if (data[fieldName] !== undefined) {
          batch.update(docRef, {
            [fieldName]: deleteField(),
            updatedAt: Timestamp.now(),
          });
        }
      } else {
        // For custom fields: remove key from customFields object
        const customFields = data.customFields || {};
        if (customFields[fieldName] !== undefined) {
          batch.update(docRef, {
            [`customFields.${fieldName}`]: deleteField(),
            updatedAt: Timestamp.now(),
          });
        }
      }
    }

    await batch.commit();
    processed += batchDocs.length;

    onProgress?.({
      current: processed,
      total,
      currentEntity,
      phase: 'processing',
    });
  }

  // Phase 3: Finalizing - delete field definition
  onProgress?.({
    current: processed,
    total,
    currentEntity,
    phase: 'finalizing',
  });

  const fieldId = generateFieldId(entityType, fieldName);
  if (isDefaultField) {
    // For default fields: create a field definition document with deleted flag
    // This allows the UI to track which default fields have been deleted
    await setDoc(doc(db, COLLECTION_NAME, fieldId), {
      id: fieldId,
      name: fieldName,
      label: fieldName.charAt(0).toUpperCase() + fieldName.slice(1),
      entityType,
      fieldType: 'text',
      isDefault: true,
      deleted: true,
      deletedAt: Timestamp.now(),
    });
  } else {
    // For custom fields: delete the field definition document
    await deleteDoc(doc(db, COLLECTION_NAME, fieldId));
  }

  // Phase 4: Completed
  onProgress?.({
    current: processed,
    total,
    currentEntity,
    phase: 'completed',
  });
};

/**
 * Get IDs of deleted default fields for an entity type
 * Used to filter out deleted default fields from the UI
 */
export const getDeletedDefaultFieldIds = async (
  entityType: EntityType
): Promise<Set<string>> => {
  const q = query(
    collection(db, COLLECTION_NAME),
    where('entityType', '==', entityType),
    where('isDefault', '==', true),
    where('deleted', '==', true)
  );

  const snapshot = await getDocs(q);
  const deletedIds = new Set<string>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.name) {
      deletedIds.add(data.name);
    }
  });

  return deletedIds;
};
