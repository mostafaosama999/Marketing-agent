import React from 'react';
import { Box, Typography } from '@mui/material';
import { Applicant, HiringStage } from '../../../types/applicant';
import { ApplicantCard } from './ApplicantCard';

interface ApplicantColumnProps {
  stage: HiringStage;
  applicants: Applicant[];
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onDragStart: (e: React.DragEvent, applicant: Applicant) => void;
  onApplicantClick: (applicant: Applicant) => void;
  isDraggedOver: boolean;
}

export const ApplicantColumn: React.FC<ApplicantColumnProps> = ({
  stage,
  applicants,
  onDragOver,
  onDrop,
  onDragStart,
  onApplicantClick,
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
        boxShadow: isDraggedOver ? '0 12px 48px rgba(33, 150, 243, 0.3)' : '0 8px 32px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.2s ease',
      }}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage.id)}
    >
      {/* Column Header */}
      <Box
        sx={{
          background: stage.headerColor,
          color: 'white',
          p: 3,
          borderRadius: '12px 12px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Typography sx={{ fontSize: '20px' }}>{stage.icon}</Typography>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '14px',
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
            }}
          >
            {stage.label}
          </Typography>
        </Box>
        <Box
          sx={{
            background: 'rgba(255, 255, 255, 0.25)',
            borderRadius: '50%',
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '13px',
            fontWeight: 700,
          }}
        >
          {applicants.length}
        </Box>
      </Box>

      {/* Cards List */}
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
          '&::-webkit-scrollbar-thumb': {
            background: '#cbd5e1',
            borderRadius: 3,
          },
        }}
      >
        {applicants.map((applicant) => (
          <ApplicantCard
            key={applicant.id}
            applicant={applicant}
            onDragStart={onDragStart}
            onClick={onApplicantClick}
          />
        ))}
        {applicants.length === 0 && (
          <Box
            sx={{
              py: 4,
              textAlign: 'center',
              color: '#94a3b8',
              fontSize: '13px',
              fontStyle: 'italic',
            }}
          >
            No applicants
          </Box>
        )}
      </Box>
    </Box>
  );
};
