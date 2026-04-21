import React from 'react';
import { Box, Typography } from '@mui/material';
import { SourcedCandidate, OutboundStage } from '../../../types/sourcedCandidate';
import { OutboundCandidateCard } from './OutboundCandidateCard';

interface OutboundColumnProps {
  stage: OutboundStage;
  candidates: SourcedCandidate[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onDragStart: (e: React.DragEvent, candidate: SourcedCandidate) => void;
  onCandidateClick: (candidate: SourcedCandidate) => void;
  onCopyDm: (candidate: SourcedCandidate) => void;
  copyDisabledForCandidate: (candidate: SourcedCandidate) => boolean;
  isDraggedOver: boolean;
}

export const OutboundColumn: React.FC<OutboundColumnProps> = ({
  stage,
  candidates,
  onDragOver,
  onDrop,
  onDragStart,
  onCandidateClick,
  onCopyDm,
  copyDisabledForCandidate,
  isDraggedOver,
}) => {
  return (
    <Box
      sx={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 3,
        minWidth: 280,
        maxWidth: 280,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: isDraggedOver ? '3px solid #2196f3' : '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: isDraggedOver
          ? '0 12px 48px rgba(33, 150, 243, 0.3)'
          : '0 8px 32px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s ease',
      }}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage.id)}
    >
      {/* Header */}
      <Box
        sx={{
          background: stage.headerColor,
          color: 'white',
          px: 2.5,
          py: 1.5,
          borderRadius: '12px 12px 0 0',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontSize: '18px' }}>{stage.icon}</Typography>
            <Typography
              variant="h6"
              sx={{ fontWeight: 700, fontSize: '13px', letterSpacing: '0.5px', textTransform: 'uppercase' }}
            >
              {stage.label}
            </Typography>
          </Box>
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.3)',
              borderRadius: '12px',
              minWidth: 28,
              height: 24,
              px: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              fontWeight: 700,
            }}
          >
            {candidates.length}
          </Box>
        </Box>
      </Box>

      {/* Cards */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          '&::-webkit-scrollbar': { width: 6 },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': { background: '#cbd5e1', borderRadius: 3 },
        }}
      >
        {candidates.map((candidate) => (
          <OutboundCandidateCard
            key={candidate.id}
            candidate={candidate}
            onDragStart={onDragStart}
            onClick={onCandidateClick}
            onCopyDm={onCopyDm}
            copyDisabled={copyDisabledForCandidate(candidate)}
          />
        ))}
        {candidates.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center', color: '#94a3b8', fontSize: '13px', fontStyle: 'italic' }}>
            No candidates
          </Box>
        )}
      </Box>
    </Box>
  );
};
