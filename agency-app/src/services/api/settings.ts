// src/services/api/settings.ts
// Service for managing application settings in Firestore

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { AppSettings, UpdateSettingsRequest, DEFAULT_OFFER_TEMPLATE, OfferTemplateVersion } from '../../types/settings';

const SETTINGS_COLLECTION = 'settings';
const APP_SETTINGS_DOC = 'app-settings';

/**
 * Convert raw Firestore version data to OfferTemplateVersion with date handling
 */
function convertVersionDates(v: any): OfferTemplateVersion {
  return {
    ...v,
    createdAt: v.createdAt?.toDate?.() || (v.createdAt ? new Date(v.createdAt) : new Date()),
    updatedAt: v.updatedAt?.toDate?.() || (v.updatedAt ? new Date(v.updatedAt) : new Date()),
  };
}

/**
 * Migrate existing single template to versioned format.
 * Creates V1 from the existing offerTemplate/offerHeadline.
 */
function migrateToVersionedTemplates(data: any): OfferTemplateVersion[] {
  if (data.offerTemplateVersions && data.offerTemplateVersions.length > 0) {
    return data.offerTemplateVersions.map(convertVersionDates);
  }

  // Create V1 from existing single template
  return [{
    id: 'v1',
    name: 'Default',
    offerTemplate: data.offerTemplate || DEFAULT_OFFER_TEMPLATE,
    offerHeadline: data.offerHeadline || '',
    labels: [],
    isDefault: true,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  }];
}

/**
 * Convert Firestore document to AppSettings object
 */
function convertToSettings(data: any): AppSettings {
  return {
    offerTemplate: data.offerTemplate || DEFAULT_OFFER_TEMPLATE,
    offerHeadline: data.offerHeadline || '',
    offerTemplateVersions: migrateToVersionedTemplates(data),
    aiPrompts: data.aiPrompts,
    aiTrendsPrompt: data.aiTrendsPrompt,
    aiTrendsDefaultEmailCount: data.aiTrendsDefaultEmailCount,
    linkedInPostPrompt: data.linkedInPostPrompt,
    linkedInCondensedInsightsPrompt: data.linkedInCondensedInsightsPrompt,
    postIdeasPrompts: data.postIdeasPrompts,
    dalleImageStylePrompt: data.dalleImageStylePrompt,
    followUpTemplate: data.followUpTemplate,
    followUpSubject: data.followUpSubject,
    updatedAt: data.updatedAt?.toDate() || new Date(),
    updatedBy: data.updatedBy || '',
    createdAt: data.createdAt?.toDate(),
  };
}

/**
 * Get application settings
 * Creates default settings if they don't exist
 */
export async function getSettings(): Promise<AppSettings> {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC);
    const settingsDoc = await getDoc(settingsRef);

    if (!settingsDoc.exists()) {
      console.log('📝 [SETTINGS] No settings found, creating default settings');

      // Create default settings
      const defaultSettings: any = {
        offerTemplate: DEFAULT_OFFER_TEMPLATE,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        updatedBy: 'system',
      };

      await setDoc(settingsRef, defaultSettings);

      return {
        offerTemplate: DEFAULT_OFFER_TEMPLATE,
        offerHeadline: '',
        updatedAt: new Date(),
        updatedBy: 'system',
        createdAt: new Date(),
      };
    }

    return convertToSettings(settingsDoc.data());
  } catch (error) {
    console.error('❌ [SETTINGS] Error fetching settings:', error);

    // Return default settings on error
    return {
      offerTemplate: DEFAULT_OFFER_TEMPLATE,
      offerHeadline: '',
      updatedAt: new Date(),
      updatedBy: 'system',
    };
  }
}

/**
 * Update application settings
 * @param updates Partial settings to update
 * @param userId ID of user making the update
 */
export async function updateSettings(
  updates: UpdateSettingsRequest,
  userId: string
): Promise<void> {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC);
    const settingsDoc = await getDoc(settingsRef);

    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
    };

    if (!settingsDoc.exists()) {
      // Create settings if they don't exist
      console.log('📝 [SETTINGS] Creating settings document');
      await setDoc(settingsRef, {
        ...updateData,
        createdAt: serverTimestamp(),
      });
    } else {
      // Update existing settings
      console.log('💾 [SETTINGS] Updating settings');
      await updateDoc(settingsRef, updateData);
    }

    console.log('✅ [SETTINGS] Settings updated successfully');
  } catch (error) {
    console.error('❌ [SETTINGS] Error updating settings:', error);
    throw new Error('Failed to update settings');
  }
}

/**
 * Subscribe to settings with real-time updates
 * @param callback Function to call when settings change
 * @returns Unsubscribe function
 */
export function subscribeToSettings(
  callback: (settings: AppSettings) => void
): Unsubscribe {
  const settingsRef = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC);

  return onSnapshot(
    settingsRef,
    async (snapshot) => {
      if (!snapshot.exists()) {
        // Initialize default settings if document doesn't exist
        console.log('📝 [SETTINGS] No settings document, initializing defaults');
        const defaultSettings = await getSettings();
        callback(defaultSettings);
      } else {
        const settings = convertToSettings(snapshot.data());
        callback(settings);
      }
    },
    (error) => {
      console.error('❌ [SETTINGS] Error listening to settings:', error);

      // Return default settings on error
      callback({
        offerTemplate: DEFAULT_OFFER_TEMPLATE,
        offerHeadline: '',
        updatedAt: new Date(),
        updatedBy: 'system',
      });
    }
  );
}

/**
 * Reset settings to defaults
 * @param userId ID of user performing the reset
 */
export async function resetSettings(userId: string): Promise<void> {
  try {
    const settingsRef = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC);

    await setDoc(settingsRef, {
      offerTemplate: DEFAULT_OFFER_TEMPLATE,
      updatedAt: serverTimestamp(),
      updatedBy: userId,
      createdAt: serverTimestamp(),
    });

    console.log('✅ [SETTINGS] Settings reset to defaults');
  } catch (error) {
    console.error('❌ [SETTINGS] Error resetting settings:', error);
    throw new Error('Failed to reset settings');
  }
}

// ========== Offer Template Version CRUD ==========

/**
 * Get all offer template versions from settings.
 * Runs migration if versions don't exist yet.
 */
export async function getOfferTemplateVersions(): Promise<OfferTemplateVersion[]> {
  const settings = await getSettings();
  return settings.offerTemplateVersions || [];
}

/**
 * Add a new offer template version.
 * Auto-generates an id like "v2", "v3", etc.
 */
export async function addOfferTemplateVersion(
  version: Omit<OfferTemplateVersion, 'id' | 'createdAt' | 'updatedAt' | 'isDefault'>,
  userId: string
): Promise<OfferTemplateVersion> {
  const settingsRef = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC);
  const settings = await getSettings();
  const versions = settings.offerTemplateVersions || [];

  // Generate next id
  const maxNum = versions.reduce((max, v) => {
    const num = parseInt(v.id.replace('v', ''), 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);

  const now = new Date();
  const newVersion: OfferTemplateVersion = {
    ...version,
    id: `v${maxNum + 1}`,
    isDefault: false,
    createdAt: now,
    updatedAt: now,
  };

  const updatedVersions = [...versions, newVersion];

  await updateDoc(settingsRef, {
    offerTemplateVersions: updatedVersions,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });

  console.log(`✅ [SETTINGS] Added offer template version ${newVersion.id}: ${newVersion.name}`);
  return newVersion;
}

/**
 * Update an existing offer template version.
 * If updating V1, also keeps root offerTemplate/offerHeadline in sync.
 */
export async function updateOfferTemplateVersion(
  versionId: string,
  updates: Partial<Pick<OfferTemplateVersion, 'name' | 'offerTemplate' | 'offerHeadline' | 'labels'>>,
  userId: string
): Promise<void> {
  const settingsRef = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC);
  const settings = await getSettings();
  const versions = settings.offerTemplateVersions || [];

  const idx = versions.findIndex(v => v.id === versionId);
  if (idx === -1) {
    throw new Error(`Template version ${versionId} not found`);
  }

  const updatedVersion = {
    ...versions[idx],
    ...updates,
    updatedAt: new Date(),
  };
  const updatedVersions = [...versions];
  updatedVersions[idx] = updatedVersion;

  const updateData: any = {
    offerTemplateVersions: updatedVersions,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  };

  // Keep root fields in sync with V1 for backward compatibility
  if (updatedVersion.isDefault) {
    if (updates.offerTemplate !== undefined) {
      updateData.offerTemplate = updates.offerTemplate;
    }
    if (updates.offerHeadline !== undefined) {
      updateData.offerHeadline = updates.offerHeadline;
    }
  }

  await updateDoc(settingsRef, updateData);
  console.log(`✅ [SETTINGS] Updated offer template version ${versionId}`);
}

/**
 * Delete an offer template version.
 * Cannot delete the default version (V1).
 */
export async function deleteOfferTemplateVersion(
  versionId: string,
  userId: string
): Promise<void> {
  const settingsRef = doc(db, SETTINGS_COLLECTION, APP_SETTINGS_DOC);
  const settings = await getSettings();
  const versions = settings.offerTemplateVersions || [];

  const version = versions.find(v => v.id === versionId);
  if (!version) {
    throw new Error(`Template version ${versionId} not found`);
  }
  if (version.isDefault) {
    throw new Error('Cannot delete the default template version');
  }

  const updatedVersions = versions.filter(v => v.id !== versionId);

  await updateDoc(settingsRef, {
    offerTemplateVersions: updatedVersions,
    updatedAt: serverTimestamp(),
    updatedBy: userId,
  });

  console.log(`✅ [SETTINGS] Deleted offer template version ${versionId}`);
}
