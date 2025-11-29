// src/services/api/filterPresetsService.ts
// Service for managing filter presets in Firestore

import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { FilterPreset, SavePresetRequest, PresetListItem, FilterRule } from '../../types/filter';

/**
 * Normalize filter rules for backward compatibility
 * Adds default entitySource to rules that don't have it
 */
function normalizeFilterRules(rules: FilterRule[]): FilterRule[] {
  if (!rules || !Array.isArray(rules)) return [];

  return rules.map(rule => ({
    ...rule,
    entitySource: rule.entitySource || 'self',
  }));
}

/**
 * Clean filter rules for Firestore storage
 * Removes undefined values which Firestore doesn't accept
 */
function cleanFilterRulesForStorage(rules: FilterRule[]): Record<string, unknown>[] {
  if (!rules || !Array.isArray(rules)) return [];

  return rules.map(rule => {
    const cleanedRule: Record<string, unknown> = {};

    // Only include defined values
    Object.entries(rule).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanedRule[key] = value;
      }
    });

    // Ensure required fields have defaults
    if (!cleanedRule.entitySource) {
      cleanedRule.entitySource = 'self';
    }

    return cleanedRule;
  });
}

/**
 * Subscribe to user's filter presets with real-time updates
 * @param userId - User ID
 * @param callback - Callback function that receives preset list
 * @returns Unsubscribe function
 */
export function subscribeToUserPresets(
  userId: string,
  callback: (presets: PresetListItem[]) => void
): () => void {
  const presetsRef = collection(db, 'users', userId, 'filterPresets');
  const q = query(presetsRef, orderBy('updatedAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const presets: PresetListItem[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          description: data.description,
          isDefault: data.isDefault || false,
          createdAt: data.createdAt,
        };
      });
      callback(presets);
    },
    (error) => {
      console.error('Error subscribing to filter presets:', error);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Save a new filter preset or update existing one
 * @param userId - User ID
 * @param preset - Preset data to save
 * @param presetId - Optional ID for updating existing preset
 * @returns Preset ID
 */
export async function saveFilterPreset(
  userId: string,
  preset: SavePresetRequest,
  presetId?: string
): Promise<string> {
  try {
    const id = presetId || `preset_${Date.now()}`;
    const presetRef = doc(db, 'users', userId, 'filterPresets', id);

    const now = new Date().toISOString();

    // Build preset data, omitting undefined fields
    const presetData: any = {
      name: preset.name,
      advancedRules: cleanFilterRulesForStorage(preset.advancedRules),
      basicFilters: preset.basicFilters,
      viewMode: preset.viewMode,
      userId,
      isDefault: preset.isDefault || false,
      createdAt: presetId ? (await getDoc(presetRef)).data()?.createdAt || now : now,
      updatedAt: now,
    };

    // Only add optional fields if they have values
    if (preset.description !== undefined && preset.description !== '') {
      presetData.description = preset.description;
    }
    if (preset.tableColumns !== undefined) {
      presetData.tableColumns = preset.tableColumns;
    }

    await setDoc(presetRef, presetData);

    // If setting as default, remove default from all other presets
    if (preset.isDefault) {
      await clearOtherDefaults(userId, id);
    }

    return id;
  } catch (error) {
    console.error('Error saving filter preset:', error);
    throw new Error('Failed to save filter preset');
  }
}

/**
 * Load a specific filter preset
 * @param userId - User ID
 * @param presetId - Preset ID
 * @returns Filter preset data
 */
export async function loadPreset(
  userId: string,
  presetId: string
): Promise<FilterPreset | null> {
  try {
    const presetRef = doc(db, 'users', userId, 'filterPresets', presetId);
    const presetDoc = await getDoc(presetRef);

    if (!presetDoc.exists()) {
      return null;
    }

    const data = presetDoc.data();
    return {
      id: presetDoc.id,
      ...data,
      // Normalize rules for backward compatibility (add entitySource if missing)
      advancedRules: normalizeFilterRules(data.advancedRules),
    } as FilterPreset;
  } catch (error) {
    console.error('Error loading filter preset:', error);
    throw new Error('Failed to load filter preset');
  }
}

/**
 * Delete a filter preset
 * @param userId - User ID
 * @param presetId - Preset ID to delete
 */
export async function deleteFilterPreset(
  userId: string,
  presetId: string
): Promise<void> {
  try {
    const presetRef = doc(db, 'users', userId, 'filterPresets', presetId);
    await deleteDoc(presetRef);
  } catch (error) {
    console.error('Error deleting filter preset:', error);
    throw new Error('Failed to delete filter preset');
  }
}

/**
 * Set a preset as the default
 * @param userId - User ID
 * @param presetId - Preset ID to set as default
 */
export async function setDefaultPreset(
  userId: string,
  presetId: string
): Promise<void> {
  try {
    // Clear all other defaults first
    await clearOtherDefaults(userId, presetId);

    // Set this preset as default
    const presetRef = doc(db, 'users', userId, 'filterPresets', presetId);
    await setDoc(presetRef, {
      isDefault: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error setting default preset:', error);
    throw new Error('Failed to set default preset');
  }
}

/**
 * Remove default status from a preset
 * @param userId - User ID
 * @param presetId - Preset ID to unset as default
 */
export async function unsetDefaultPreset(
  userId: string,
  presetId: string
): Promise<void> {
  try {
    const presetRef = doc(db, 'users', userId, 'filterPresets', presetId);
    await setDoc(presetRef, {
      isDefault: false,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error unsetting default preset:', error);
    throw new Error('Failed to unset default preset');
  }
}

/**
 * Get the default preset for a user
 * @param userId - User ID
 * @returns Default preset or null
 */
export async function getDefaultPreset(userId: string): Promise<FilterPreset | null> {
  try {
    const presetsRef = collection(db, 'users', userId, 'filterPresets');
    const q = query(presetsRef, where('isDefault', '==', true));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const presetDoc = snapshot.docs[0];
    const data = presetDoc.data();
    return {
      id: presetDoc.id,
      ...data,
      // Normalize rules for backward compatibility (add entitySource if missing)
      advancedRules: normalizeFilterRules(data.advancedRules),
    } as FilterPreset;
  } catch (error) {
    console.error('Error getting default preset:', error);
    return null;
  }
}

/**
 * Clear default flag from all presets except the specified one
 * @param userId - User ID
 * @param excludePresetId - Preset ID to exclude from clearing
 */
async function clearOtherDefaults(userId: string, excludePresetId: string): Promise<void> {
  const presetsRef = collection(db, 'users', userId, 'filterPresets');
  const q = query(presetsRef, where('isDefault', '==', true));
  const snapshot = await getDocs(q);

  const batch = writeBatch(db);

  snapshot.docs.forEach(doc => {
    if (doc.id !== excludePresetId) {
      batch.update(doc.ref, { isDefault: false });
    }
  });

  await batch.commit();
}

/**
 * One-time migration from localStorage to Firestore
 * Call this when user first accesses the filter presets feature
 * @param userId - User ID
 */
export async function migrateLocalStorageToFirestore(userId: string): Promise<void> {
  try {
    // Check if migration already happened
    const migrationFlag = localStorage.getItem('filterPresetsMigrated');
    if (migrationFlag === 'true') {
      return;
    }

    // Get localStorage data
    const savedRulesStr = localStorage.getItem('crmAdvancedFilterRules');
    const viewMode = localStorage.getItem('crmViewMode') as 'board' | 'table' || 'board';
    const tableColumnsStr = localStorage.getItem('crmTableColumns');

    // Parse data
    const advancedRules = savedRulesStr ? JSON.parse(savedRulesStr) : [];
    const tableColumns = tableColumnsStr ? JSON.parse(tableColumnsStr) : undefined;

    // Only migrate if there's actual data
    if (advancedRules.length > 0 || tableColumns) {
      const migrationPreset: SavePresetRequest = {
        name: 'Migrated Filters',
        description: 'Auto-migrated from previous session',
        advancedRules: advancedRules,
        basicFilters: {
          search: '',
          statuses: [],
          company: '',
          month: '',
        },
        viewMode: viewMode,
        tableColumns: tableColumns,
        isDefault: true,
      };

      await saveFilterPreset(userId, migrationPreset);
    }

    // Mark migration as complete
    localStorage.setItem('filterPresetsMigrated', 'true');

    // Clean up old localStorage keys
    localStorage.removeItem('crmAdvancedFilterRules');
    localStorage.removeItem('crmViewMode');
    localStorage.removeItem('crmTableColumns');
  } catch (error) {
    console.error('Error migrating localStorage to Firestore:', error);
    // Don't throw - migration is best effort
  }
}
