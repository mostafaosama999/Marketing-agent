// src/contexts/PipelineConfigContext.tsx

import React, { createContext, useContext, ReactNode } from 'react';
import { usePipelineConfig } from '../hooks/usePipelineConfig';
import { PipelineStage } from '../services/api/pipelineConfigService';
import { LeadStatus } from '../types/lead';

interface PipelineConfigContextType {
  stages: PipelineStage[];
  loading: boolean;
  getLabel: (status: LeadStatus) => string;
  getLabelMap: () => Record<LeadStatus, string>;
  updateLabel: (stageId: LeadStatus, newLabel: string) => Promise<void>;
  updateOrder: (newStages: PipelineStage[]) => Promise<void>;
}

const PipelineConfigContext = createContext<PipelineConfigContextType | undefined>(
  undefined
);

export function PipelineConfigProvider({ children }: { children: ReactNode }) {
  const { stages, loading, updateLabel, updateOrder, getLabelMap } = usePipelineConfig();

  const getLabel = (status: LeadStatus): string => {
    const stage = stages.find((s) => s.id === status);
    return stage?.label || status;
  };

  const value: PipelineConfigContextType = {
    stages,
    loading,
    getLabel,
    getLabelMap,
    updateLabel,
    updateOrder,
  };

  return (
    <PipelineConfigContext.Provider value={value}>
      {children}
    </PipelineConfigContext.Provider>
  );
}

export function usePipelineConfigContext(): PipelineConfigContextType {
  const context = useContext(PipelineConfigContext);
  if (!context) {
    throw new Error(
      'usePipelineConfigContext must be used within PipelineConfigProvider'
    );
  }
  return context;
}
