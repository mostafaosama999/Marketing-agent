// src/services/api/pipelineConfigService.ts

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot,
  Timestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { LeadStatus } from '../../types/lead';

// Pipeline stage configuration
export interface PipelineStage {
  id: LeadStatus; // Status value (unchangeable - used in database)
  label: string; // Display name (editable by user)
  icon: string; // Emoji icon
  color: string; // Column background gradient
  headerColor: string; // Header background gradient
  order: number; // Position in board (0-5)
  visible: boolean; // Whether stage is visible
}

export interface PipelineConfig {
  id: string; // 'default'
  stages: PipelineStage[];
  createdAt: Date;
  updatedAt: Date;
}

// Default pipeline stages (initial configuration)
const DEFAULT_STAGES: PipelineStage[] = [
  {
    id: 'new_lead',
    label: 'New Lead',
    icon: '📋',
    color: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
    headerColor: 'linear-gradient(135deg, #6c757d 0%, #495057 100%)',
    order: 0,
    visible: true,
  },
  {
    id: 'qualified',
    label: 'Qualified',
    icon: '🎯',
    color: 'linear-gradient(135deg, #fff3e0 0%, #ffcc80 100%)',
    headerColor: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
    order: 1,
    visible: true,
  },
  {
    id: 'contacted',
    label: 'Contacted',
    icon: '📞',
    color: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)',
    headerColor: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
    order: 2,
    visible: true,
  },
  {
    id: 'follow_up',
    label: 'Follow up',
    icon: '🔄',
    color: 'linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%)',
    headerColor: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
    order: 3,
    visible: true,
  },
  {
    id: 'nurture',
    label: 'Nurture',
    icon: '🌱',
    color: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
    headerColor: 'linear-gradient(135deg, #00bcd4 0%, #0097a7 100%)',
    order: 4,
    visible: true,
  },
  {
    id: 'won',
    label: 'Won',
    icon: '✅',
    color: 'linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%)',
    headerColor: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
    order: 5,
    visible: true,
  },
  {
    id: 'lost',
    label: 'Refused',
    icon: '❌',
    color: 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)',
    headerColor: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
    order: 6,
    visible: true,
  },
];

const PIPELINE_CONFIG_ID = 'default';
const COLLECTION_NAME = 'pipelineConfig';

/**
 * Get the pipeline configuration document reference
 */
function getPipelineConfigRef() {
  return doc(db, COLLECTION_NAME, PIPELINE_CONFIG_ID);
}

/**
 * Fetch the current pipeline configuration from Firestore
 * Creates default configuration if it doesn't exist
 */
export async function getPipelineConfig(): Promise<PipelineConfig> {
  const configRef = getPipelineConfigRef();
  const configSnap = await getDoc(configRef);

  if (configSnap.exists()) {
    const data = configSnap.data();
    return {
      id: configSnap.id,
      stages: data.stages,
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
    };
  }

  // Create default configuration
  const defaultConfig: Omit<PipelineConfig, 'id' | 'createdAt' | 'updatedAt'> = {
    stages: DEFAULT_STAGES,
  };

  const now = Timestamp.now();
  await setDoc(configRef, {
    ...defaultConfig,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id: PIPELINE_CONFIG_ID,
    stages: DEFAULT_STAGES,
    createdAt: now.toDate(),
    updatedAt: now.toDate(),
  };
}

/**
 * Subscribe to real-time pipeline configuration updates
 */
export function subscribeToPipelineConfig(
  callback: (config: PipelineConfig) => void
): Unsubscribe {
  const configRef = getPipelineConfigRef();

  return onSnapshot(configRef, async (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        id: snapshot.id,
        stages: data.stages,
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
      });
    } else {
      // Initialize if doesn't exist
      const config = await getPipelineConfig();
      callback(config);
    }
  });
}

/**
 * Update a pipeline stage label
 * @param stageId - The stage ID (e.g., 'new_lead', 'qualified')
 * @param newLabel - The new display label
 */
export async function updateStageLabel(
  stageId: LeadStatus,
  newLabel: string
): Promise<void> {
  if (!newLabel || newLabel.trim().length === 0) {
    throw new Error('Label cannot be empty');
  }

  const config = await getPipelineConfig();
  const updatedStages = config.stages.map((stage) =>
    stage.id === stageId ? { ...stage, label: newLabel.trim() } : stage
  );

  const configRef = getPipelineConfigRef();
  await updateDoc(configRef, {
    stages: updatedStages,
    updatedAt: Timestamp.now(),
  });

  console.log(`Updated stage "${stageId}" label to "${newLabel}"`);
}

/**
 * Get label for a specific status (useful for backward compatibility)
 */
export function getStageLabelSync(
  stages: PipelineStage[],
  status: LeadStatus
): string {
  const stage = stages.find((s) => s.id === status);
  return stage?.label || status; // Fallback to status ID if not found
}

/**
 * Convert stages array to status-to-label mapping object
 */
export function stagesToLabelMap(
  stages: PipelineStage[]
): Record<LeadStatus, string> {
  return stages.reduce((acc, stage) => {
    acc[stage.id] = stage.label;
    return acc;
  }, {} as Record<LeadStatus, string>);
}

/**
 * Update the order of pipeline stages
 * @param reorderedStages - Array of stages with new order values
 */
export async function updateStageOrder(
  reorderedStages: PipelineStage[]
): Promise<void> {
  if (!reorderedStages || reorderedStages.length === 0) {
    throw new Error('Stages array cannot be empty');
  }

  const configRef = getPipelineConfigRef();
  await updateDoc(configRef, {
    stages: reorderedStages,
    updatedAt: Timestamp.now(),
  });

  console.log('Updated pipeline stage order');
}

/**
 * Update the visibility of a pipeline stage
 * @param stageId - The stage ID to update
 * @param visible - Whether the stage should be visible
 */
export async function updateStageVisibility(
  stageId: LeadStatus,
  visible: boolean
): Promise<void> {
  const config = await getPipelineConfig();

  // Prevent hiding all stages
  if (!visible) {
    const visibleCount = config.stages.filter(s => s.visible).length;
    if (visibleCount <= 1) {
      throw new Error('Cannot hide all columns. At least one column must remain visible.');
    }
  }

  const updatedStages = config.stages.map((stage) =>
    stage.id === stageId ? { ...stage, visible } : stage
  );

  const configRef = getPipelineConfigRef();
  await updateDoc(configRef, {
    stages: updatedStages,
    updatedAt: Timestamp.now(),
  });

  console.log(`Updated stage "${stageId}" visibility to ${visible}`);
}
