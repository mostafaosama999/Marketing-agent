// src/hooks/usePipelineConfig.ts

import { useState, useEffect } from 'react';
import {
  PipelineConfig,
  PipelineStage,
  subscribeToPipelineConfig,
  updateStageLabel,
  updateStageOrder,
  updateStageVisibility,
  stagesToLabelMap,
} from '../services/api/pipelineConfigService';
import { LeadStatus } from '../types/lead';

interface UsePipelineConfigReturn {
  stages: PipelineStage[];
  config: PipelineConfig | null;
  loading: boolean;
  updateLabel: (stageId: LeadStatus, newLabel: string) => Promise<void>;
  updateOrder: (newStages: PipelineStage[]) => Promise<void>;
  updateVisibility: (stageId: LeadStatus, visible: boolean) => Promise<void>;
  getLabelMap: () => Record<LeadStatus, string>;
}

/**
 * Custom hook to manage pipeline configuration
 * Provides real-time updates to pipeline stages and labels
 */
export function usePipelineConfig(): UsePipelineConfigReturn {
  const [config, setConfig] = useState<PipelineConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToPipelineConfig((pipelineConfig) => {
      setConfig(pipelineConfig);
      setLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const updateLabel = async (stageId: LeadStatus, newLabel: string) => {
    try {
      await updateStageLabel(stageId, newLabel);
    } catch (error) {
      console.error('usePipelineConfig: Error updating label', error);
      throw error;
    }
  };

  const updateOrder = async (newStages: PipelineStage[]) => {
    try {
      // Recalculate order values based on array position
      const reorderedStages = newStages.map((stage, index) => ({
        ...stage,
        order: index,
      }));
      await updateStageOrder(reorderedStages);
    } catch (error) {
      console.error('usePipelineConfig: Error updating order', error);
      throw error;
    }
  };

  const updateVisibility = async (stageId: LeadStatus, visible: boolean) => {
    try {
      await updateStageVisibility(stageId, visible);
    } catch (error) {
      console.error('usePipelineConfig: Error updating visibility', error);
      throw error;
    }
  };

  const getLabelMap = (): Record<LeadStatus, string> => {
    if (!config) {
      // Return default mapping if config not loaded
      return {
        new_lead: 'New Lead',
        qualified: 'Qualified',
        contacted: 'Contacted',
        follow_up: 'Follow up',
        nurture: 'Nurture',
        won: 'Won',
        lost: 'Refused',
        previous_client: 'Previous Client',
        existing_client: 'Existing Client',
      };
    }
    return stagesToLabelMap(config.stages);
  };

  return {
    stages: config?.stages || [],
    config,
    loading,
    updateLabel,
    updateOrder,
    updateVisibility,
    getLabelMap,
  };
}
