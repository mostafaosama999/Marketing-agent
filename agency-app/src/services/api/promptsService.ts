// src/services/api/promptsService.ts
import { db } from '../firebase/firestore';
import {
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  onSnapshot,
  Unsubscribe,
} from 'firebase/firestore';
import { PromptMetadata } from '../../data/prompts';

const COLLECTION_NAME = 'userPreferences';
const SUBCOLLECTION_NAME = 'customPrompts';

/**
 * Save a custom prompt override for a specific user
 * Stored at: userPreferences/{userId}/customPrompts/{promptId}
 */
export async function saveUserPrompt(
  userId: string,
  prompt: PromptMetadata
): Promise<void> {
  const promptRef = doc(
    db,
    COLLECTION_NAME,
    userId,
    SUBCOLLECTION_NAME,
    prompt.id
  );

  await setDoc(promptRef, {
    ...prompt,
    updatedAt: new Date(),
  });
}

/**
 * Get a specific custom prompt for a user
 */
export async function getUserPrompt(
  userId: string,
  promptId: string
): Promise<PromptMetadata | null> {
  const promptRef = doc(
    db,
    COLLECTION_NAME,
    userId,
    SUBCOLLECTION_NAME,
    promptId
  );

  const snapshot = await getDoc(promptRef);
  if (!snapshot.exists()) {
    return null;
  }

  return snapshot.data() as PromptMetadata;
}

/**
 * Get all custom prompts for a user
 * Returns a map of promptId -> PromptMetadata
 */
export async function getUserPrompts(
  userId: string
): Promise<Record<string, PromptMetadata>> {
  const promptsRef = collection(
    db,
    COLLECTION_NAME,
    userId,
    SUBCOLLECTION_NAME
  );

  const snapshot = await getDocs(promptsRef);
  const prompts: Record<string, PromptMetadata> = {};

  snapshot.forEach((doc) => {
    prompts[doc.id] = doc.data() as PromptMetadata;
  });

  return prompts;
}

/**
 * Delete a custom prompt (reset to default)
 */
export async function deleteUserPrompt(
  userId: string,
  promptId: string
): Promise<void> {
  const promptRef = doc(
    db,
    COLLECTION_NAME,
    userId,
    SUBCOLLECTION_NAME,
    promptId
  );

  await deleteDoc(promptRef);
}

/**
 * Subscribe to real-time updates of custom prompts
 */
export function subscribeToUserPrompts(
  userId: string,
  callback: (prompts: Record<string, PromptMetadata>) => void
): Unsubscribe {
  const promptsRef = collection(
    db,
    COLLECTION_NAME,
    userId,
    SUBCOLLECTION_NAME
  );

  return onSnapshot(promptsRef, (snapshot) => {
    const prompts: Record<string, PromptMetadata> = {};

    snapshot.forEach((doc) => {
      prompts[doc.id] = doc.data() as PromptMetadata;
    });

    callback(prompts);
  });
}

/**
 * Migrate prompts from localStorage to Firebase
 * Useful for syncing existing customizations across devices
 */
export async function migrateLocalPromptsToFirebase(
  userId: string
): Promise<number> {
  const saved = localStorage.getItem('custom_prompts');
  if (!saved) {
    return 0;
  }

  try {
    const localPrompts: Record<string, PromptMetadata> = JSON.parse(saved);
    const promptIds = Object.keys(localPrompts);

    // Save each prompt to Firebase
    await Promise.all(
      promptIds.map((id) => saveUserPrompt(userId, localPrompts[id]))
    );

    // Clear localStorage after successful migration
    localStorage.removeItem('custom_prompts');

    return promptIds.length;
  } catch (err) {
    console.error('Error migrating prompts:', err);
    throw err;
  }
}

/**
 * Export all custom prompts as JSON (for backup)
 */
export async function exportUserPrompts(
  userId: string
): Promise<string> {
  const prompts = await getUserPrompts(userId);
  return JSON.stringify(prompts, null, 2);
}

/**
 * Import custom prompts from JSON (for restore)
 */
export async function importUserPrompts(
  userId: string,
  jsonData: string
): Promise<number> {
  const prompts: Record<string, PromptMetadata> = JSON.parse(jsonData);
  const promptIds = Object.keys(prompts);

  await Promise.all(
    promptIds.map((id) => saveUserPrompt(userId, prompts[id]))
  );

  return promptIds.length;
}

/**
 * Combine userPrompt and outputSchema for sending to OpenAI
 * This helper function merges the two fields when needed
 */
export function combinePromptWithSchema(prompt: PromptMetadata): string {
  if (!prompt.outputSchema) {
    return prompt.userPrompt;
  }

  return `${prompt.userPrompt}\n\n${prompt.outputSchema}`;
}
