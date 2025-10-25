// src/services/api/companyFilterPresetsService.ts
// Service for managing company filter presets in Firestore

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
import { CompanyFilterPreset, SaveCompanyPresetRequest, CompanyPresetListItem } from '../../types/companyFilter';

/**
 * Subscribe to user's company filter presets with real-time updates
 * @param userId - User ID
 * @param callback - Callback function that receives preset list
 * @returns Unsubscribe function
 */
export function subscribeToCompanyPresets(
  userId: string,
  callback: (presets: CompanyPresetListItem[]) => void
): () => void {
  const presetsRef = collection(db, 'users', userId, 'companyFilterPresets');
  const q = query(presetsRef, orderBy('updatedAt', 'desc'));

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const presets: CompanyPresetListItem[] = snapshot.docs.map(doc => {
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
      console.error('Error subscribing to company filter presets:', error);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Save a new company filter preset or update existing one
 * @param userId - User ID
 * @param preset - Preset data to save
 * @param presetId - Optional ID for updating existing preset
 * @returns Preset ID
 */
export async function saveCompanyPreset(
  userId: string,
  preset: SaveCompanyPresetRequest,
  presetId?: string
): Promise<string> {
  try {
    const id = presetId || `preset_${Date.now()}`;
    const presetRef = doc(db, 'users', userId, 'companyFilterPresets', id);

    const now = new Date().toISOString();

    // Build preset data, omitting undefined fields
    const presetData: any = {
      name: preset.name,
      advancedRules: preset.advancedRules,
      basicFilters: preset.basicFilters,
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
    console.error('Error saving company filter preset:', error);
    throw new Error('Failed to save company filter preset');
  }
}

/**
 * Load a specific company filter preset
 * @param userId - User ID
 * @param presetId - Preset ID
 * @returns Company filter preset data
 */
export async function loadCompanyPreset(
  userId: string,
  presetId: string
): Promise<CompanyFilterPreset | null> {
  try {
    const presetRef = doc(db, 'users', userId, 'companyFilterPresets', presetId);
    const presetDoc = await getDoc(presetRef);

    if (!presetDoc.exists()) {
      return null;
    }

    return {
      id: presetDoc.id,
      ...presetDoc.data()
    } as CompanyFilterPreset;
  } catch (error) {
    console.error('Error loading company filter preset:', error);
    throw new Error('Failed to load company filter preset');
  }
}

/**
 * Delete a company filter preset
 * @param userId - User ID
 * @param presetId - Preset ID to delete
 */
export async function deleteCompanyPreset(
  userId: string,
  presetId: string
): Promise<void> {
  try {
    const presetRef = doc(db, 'users', userId, 'companyFilterPresets', presetId);
    await deleteDoc(presetRef);
  } catch (error) {
    console.error('Error deleting company filter preset:', error);
    throw new Error('Failed to delete company filter preset');
  }
}

/**
 * Set a company preset as the default
 * @param userId - User ID
 * @param presetId - Preset ID to set as default
 */
export async function setDefaultCompanyPreset(
  userId: string,
  presetId: string
): Promise<void> {
  try {
    // Clear all other defaults first
    await clearOtherDefaults(userId, presetId);

    // Set this preset as default
    const presetRef = doc(db, 'users', userId, 'companyFilterPresets', presetId);
    await setDoc(presetRef, {
      isDefault: true,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  } catch (error) {
    console.error('Error setting default company preset:', error);
    throw new Error('Failed to set default company preset');
  }
}

/**
 * Get the default company preset for a user
 * @param userId - User ID
 * @returns Default company preset or null
 */
export async function getDefaultCompanyPreset(userId: string): Promise<CompanyFilterPreset | null> {
  try {
    const presetsRef = collection(db, 'users', userId, 'companyFilterPresets');
    const q = query(presetsRef, where('isDefault', '==', true));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    return {
      id: doc.id,
      ...doc.data()
    } as CompanyFilterPreset;
  } catch (error) {
    console.error('Error getting default company preset:', error);
    return null;
  }
}

/**
 * Clear default flag from all presets except the specified one
 * @param userId - User ID
 * @param excludePresetId - Preset ID to exclude from clearing
 */
async function clearOtherDefaults(userId: string, excludePresetId: string): Promise<void> {
  const presetsRef = collection(db, 'users', userId, 'companyFilterPresets');
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
