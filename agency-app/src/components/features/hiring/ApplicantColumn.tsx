import React, { useState } from 'react';
import { Box, Typography, Collapse, Chip } from '@mui/material';
import { ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import { Applicant, HiringStage } from '../../../types/applicant';
import { ApplicantCard } from './ApplicantCard';

// Columns that get a rejection zone at the bottom
const REJECTION_ZONE_STAGES = new Set(['applied', 'test_task', 'offer']);

interface SubSection {
  label: string;
  icon: string;
  color: string;
  applicants: Applicant[];
  droppable?: boolean;
  dropStageId?: string;
}

interface ApplicantColumnProps {
  stage: HiringStage;
  applicants: Applicant[];
  rejectedApplicants?: Applicant[];
  subSections?: SubSection[];
  viewedIds: Set<string>;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onDragStart: (e: React.DragEvent, applicant: Applicant) => void;
  onApplicantClick: (applicant: Applicant) => void;
  isDraggedOver: boolean;
  isDraggedOverRejection?: boolean;
  isDraggedOverSubSection?: string | null;
  onRejectionDragOver?: (e: React.DragEvent) => void;
  onRejectionDrop?: (e: React.DragEvent) => void;
  onSubSectionDragOver?: (e: React.DragEvent, dropStageId: string) => void;
  onSubSectionDrop?: (e: React.DragEvent, dropStageId: string) => void;
  totalCount?: number;
}

export const ApplicantColumn: React.FC<ApplicantColumnProps> = ({
  stage,
  applicants,
  rejectedApplicants = [],
  subSections = [],
  viewedIds,
  onDragOver,
  onDrop,
  onDragStart,
  onApplicantClick,
  isDraggedOver,
  isDraggedOverRejection = false,
  isDraggedOverSubSection = null,
  onRejectionDragOver,
  onRejectionDrop,
  onSubSectionDragOver,
  onSubSectionDrop,
  totalCount,
}) => {
  const [rejectedExpanded, setRejectedExpanded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const showRejectionZone = REJECTION_ZONE_STAGES.has(stage.id);
  const displayCount = totalCount ?? applicants.length;

  const toggleSection = (label: string) => {
    setExpandedSections((prev) => ({ ...prev, [label]: !prev[label] }));
  };

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
          px: 2.5,
          py: 1.5,
          borderRadius: '12px 12px 0 0',
          flexShrink: 0,
        }}
      >
        {/* Top row: icon + label + primary count */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Typography sx={{ fontSize: '18px' }}>{stage.icon}</Typography>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '13px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
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
            {displayCount}
          </Box>
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
            isNew={!viewedIds.has(applicant.id)}
            onDragStart={onDragStart}
            onClick={onApplicantClick}
          />
        ))}
        {applicants.length === 0 && subSections.length === 0 && (
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

        {/* Sub-Sections (e.g., Responded under Writing Test) */}
        {subSections.map((section) => {
          const isExpanded = expandedSections[section.label] ?? (section.applicants.length > 0);
          const isSectionDragOver = isDraggedOverSubSection === section.dropStageId;

          return (
            <Box
              key={section.label}
              onDragOver={(e) => {
                if (section.droppable && section.dropStageId) {
                  e.preventDefault();
                  e.stopPropagation();
                  onSubSectionDragOver?.(e, section.dropStageId);
                }
              }}
              onDrop={(e) => {
                if (section.droppable && section.dropStageId) {
                  e.preventDefault();
                  e.stopPropagation();
                  onSubSectionDrop?.(e, section.dropStageId);
                }
              }}
              sx={{
                mt: 0.5,
                borderTop: `1px dashed ${section.color}50`,
                pt: 1,
              }}
            >
              <Box
                onClick={() => toggleSection(section.label)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 1.5,
                  py: 0.75,
                  borderRadius: 2,
                  background: isSectionDragOver
                    ? `${section.color}15`
                    : section.applicants.length > 0
                      ? `${section.color}08`
                      : 'transparent',
                  border: isSectionDragOver
                    ? `2px dashed ${section.color}`
                    : section.applicants.length > 0
                      ? `1px solid ${section.color}30`
                      : `1px dashed ${section.color}25`,
                  cursor: section.applicants.length > 0 ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Typography sx={{ fontSize: '12px' }}>{section.icon}</Typography>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: section.color }}>
                    {section.label}
                  </Typography>
                  {section.applicants.length > 0 && (
                    <Chip
                      label={section.applicants.length}
                      size="small"
                      sx={{
                        fontSize: '10px',
                        fontWeight: 700,
                        height: 18,
                        minWidth: 18,
                        bgcolor: `${section.color}15`,
                        color: section.color,
                      }}
                    />
                  )}
                </Box>
                {section.applicants.length > 0 && (
                  <Box sx={{ color: section.color, display: 'flex', alignItems: 'center' }}>
                    {isExpanded ? (
                      <ExpandLessIcon sx={{ fontSize: 16 }} />
                    ) : (
                      <ExpandMoreIcon sx={{ fontSize: 16 }} />
                    )}
                  </Box>
                )}
              </Box>

              <Collapse in={isExpanded && section.applicants.length > 0}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1.5 }}>
                  {section.applicants.map((applicant) => (
                    <ApplicantCard
                      key={applicant.id}
                      applicant={applicant}
                      isNew={!viewedIds.has(applicant.id)}
                      onDragStart={onDragStart}
                      onClick={onApplicantClick}
                    />
                  ))}
                </Box>
              </Collapse>
            </Box>
          );
        })}

        {/* Rejection Drop Zone & Rejected Applicants */}
        {showRejectionZone && (
          <Box
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRejectionDragOver?.(e);
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onRejectionDrop?.(e);
            }}
            sx={{
              mt: 0.5,
              borderTop: '1px dashed #fca5a550',
              pt: 1,
            }}
          >
            {/* Rejection Header */}
            <Box
              onClick={() => rejectedApplicants.length > 0 && setRejectedExpanded(!rejectedExpanded)}
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                background: isDraggedOverRejection
                  ? 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)'
                  : rejectedApplicants.length > 0
                    ? '#fef2f208'
                    : 'transparent',
                border: isDraggedOverRejection
                  ? '2px dashed #ef4444'
                  : rejectedApplicants.length > 0
                    ? '1px solid #fecaca'
                    : '1px dashed #e2e8f020',
                cursor: rejectedApplicants.length > 0 ? 'pointer' : 'default',
                transition: 'all 0.2s ease',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography sx={{ fontSize: '12px' }}>{'❌'}</Typography>
                {isDraggedOverRejection ? (
                  <Typography sx={{ fontSize: '11px', color: '#dc2626', fontWeight: 700 }}>
                    Drop to reject
                  </Typography>
                ) : (
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#dc2626' }}>
                    Rejected
                  </Typography>
                )}
                {!isDraggedOverRejection && rejectedApplicants.length > 0 && (
                  <Chip
                    label={rejectedApplicants.length}
                    size="small"
                    sx={{
                      fontSize: '10px',
                      fontWeight: 700,
                      height: 18,
                      minWidth: 18,
                      bgcolor: '#fee2e2',
                      color: '#dc2626',
                    }}
                  />
                )}
              </Box>
              {rejectedApplicants.length > 0 && (
                <Box sx={{ color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                  {rejectedExpanded ? (
                    <ExpandLessIcon sx={{ fontSize: 16 }} />
                  ) : (
                    <ExpandMoreIcon sx={{ fontSize: 16 }} />
                  )}
                </Box>
              )}
            </Box>

            <Collapse in={rejectedExpanded}>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1.5 }}>
                {rejectedApplicants.map((applicant) => (
                  <ApplicantCard
                    key={applicant.id}
                    applicant={applicant}
                    isNew={!viewedIds.has(applicant.id)}
                    onDragStart={onDragStart}
                    onClick={onApplicantClick}
                  />
                ))}
              </Box>
            </Collapse>
          </Box>
        )}
      </Box>
    </Box>
  );
};
