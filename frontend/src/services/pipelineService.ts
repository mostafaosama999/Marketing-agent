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
import { PipelineConfig, PipelineStage, DEFAULT_PIPELINE_STAGES } from '../app/types/crm';

const PIPELINE_CONFIGS_COLLECTION = 'pipeline_configs';
const DEFAULT_CONFIG_ID = 'default'; // Using a single default config for all users

/**
 * Convert Firestore document to PipelineConfig
 */
function convertToPipelineConfig(id: string, data: any): PipelineConfig {
  return {
    id,
    stages: data.stages || [],
    createdAt: data.createdAt?.toDate() || new Date(),
    updatedAt: data.updatedAt?.toDate() || new Date(),
  };
}

/**
 * Create default pipeline configuration
 */
export async function createDefaultPipeline(): Promise<PipelineConfig> {
  const stages: PipelineStage[] = DEFAULT_PIPELINE_STAGES.map((stage, index) => ({
    id: `stage-${index}-${Date.now()}`,
    ...stage,
  }));

  const config: Omit<PipelineConfig, 'id' | 'createdAt' | 'updatedAt'> = {
    stages,
  };

  const configRef = doc(db, PIPELINE_CONFIGS_COLLECTION, DEFAULT_CONFIG_ID);
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
 * Get or create pipeline configuration
 */
export async function getPipelineConfig(): Promise<PipelineConfig> {
  const configRef = doc(db, PIPELINE_CONFIGS_COLLECTION, DEFAULT_CONFIG_ID);
  const configSnap = await getDoc(configRef);

  if (configSnap.exists()) {
    return convertToPipelineConfig(configSnap.id, configSnap.data());
  } else {
    // Create default if doesn't exist
    return await createDefaultPipeline();
  }
}

/**
 * Subscribe to pipeline configuration updates
 */
export function subscribeToPipelineConfig(
  callback: (config: PipelineConfig | null) => void
): Unsubscribe {
  const configRef = doc(db, PIPELINE_CONFIGS_COLLECTION, DEFAULT_CONFIG_ID);

  return onSnapshot(
    configRef,
    async (doc) => {
      if (doc.exists()) {
        callback(convertToPipelineConfig(doc.id, doc.data()));
      } else {
        // Create default if doesn't exist
        const defaultConfig = await createDefaultPipeline();
        callback(defaultConfig);
      }
    },
    (error) => {
      console.error('Error listening to pipeline config:', error);
      callback(null);
    }
  );
}

/**
 * Update pipeline configuration
 */
export async function updatePipelineConfig(stages: PipelineStage[]): Promise<void> {
  try {
    const configRef = doc(db, PIPELINE_CONFIGS_COLLECTION, DEFAULT_CONFIG_ID);
    await setDoc(
      configRef,
      {
        stages,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating pipeline config:', error);
    throw error;
  }
}
