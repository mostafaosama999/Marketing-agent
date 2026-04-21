import React, { useState } from 'react';
import { Box } from '@mui/material';
import {
  SourcedCandidate,
  OUTBOUND_STAGES,
  OutboundStatus,
} from '../../../types/sourcedCandidate';
import { OutboundColumn } from './OutboundColumn';

interface OutboundBoardProps {
  candidates: SourcedCandidate[];
  onStatusChange: (candidate: SourcedCandidate, newStatus: OutboundStatus) => void;
  onCandidateClick: (candidate: SourcedCandidate) => void;
  onCopyDm: (candidate: SourcedCandidate) => void;
  copyDisabledForCandidate: (candidate: SourcedCandidate) => boolean;
}

export const OutboundBoard: React.FC<OutboundBoardProps> = ({
  candidates,
  onStatusChange,
  onCandidateClick,
  onCopyDm,
  copyDisabledForCandidate,
}) => {
  const [dragged, setDragged] = useState<SourcedCandidate | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, candidate: SourcedCandidate) => {
    setDragged(candidate);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== stageId) setDragOverColumn(stageId);
  };

  const handleDrop = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!dragged || dragged.status === targetStageId) {
      setDragged(null);
      return;
    }
    onStatusChange(dragged, targetStageId as OutboundStatus);
    setDragged(null);
  };

  const groupedByStage: Record<OutboundStatus, SourcedCandidate[]> = {
    sourced: [],
    contacted: [],
    replied: [],
    interested: [],
    closed: [],
  };
  candidates.forEach((c) => {
    (groupedByStage[c.status] ||= []).push(c);
  });

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        height: '100%',
        overflowX: 'auto',
        pb: 2,
        px: 2,
        '&::-webkit-scrollbar': { height: 8 },
        '&::-webkit-scrollbar-track': { background: 'rgba(255,255,255,0.1)' },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.3)', borderRadius: 4 },
      }}
    >
      {OUTBOUND_STAGES.map((stage) => (
        <OutboundColumn
          key={stage.id}
          stage={stage}
          candidates={groupedByStage[stage.id] || []}
          onDragOver={(e) => handleDragOver(e, stage.id)}
          onDrop={handleDrop}
          onDragStart={handleDragStart}
          onCandidateClick={onCandidateClick}
          onCopyDm={onCopyDm}
          copyDisabledForCandidate={copyDisabledForCandidate}
          isDraggedOver={dragOverColumn === stage.id}
        />
      ))}
    </Box>
  );
};
