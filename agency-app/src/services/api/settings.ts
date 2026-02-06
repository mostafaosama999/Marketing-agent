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
import { AppSettings, UpdateSettingsRequest, DEFAULT_OFFER_TEMPLATE } from '../../types/settings';

const SETTINGS_COLLECTION = 'settings';
const APP_SETTINGS_DOC = 'app-settings';

/**
 * Convert Firestore document to AppSettings object
 */
function convertToSettings(data: any): AppSettings {
  return {
    offerTemplate: data.offerTemplate || DEFAULT_OFFER_TEMPLATE,
    offerHeadline: data.offerHeadline || '',
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
