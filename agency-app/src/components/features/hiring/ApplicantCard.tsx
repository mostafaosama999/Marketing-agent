import React from 'react';
import { Box, Typography, Tooltip, Chip } from '@mui/material';
import {
  LinkedIn as LinkedInIcon,
  LinkOff as LinkOffIcon,
  Description as DocIcon,
  AccessTime as AccessTimeIcon,
  WarningAmber as WarningAmberIcon,
  MailOutline as MailOutlineIcon,
} from '@mui/icons-material';
import { Applicant, REJECTION_STAGE_LABELS, REJECTION_STAGE_COLORS } from '../../../types/applicant';

interface ApplicantCardProps {
  applicant: Applicant;
  isNew?: boolean;
  onDragStart: (e: React.DragEvent, applicant: Applicant) => void;
  onClick: (applicant: Applicant) => void;
}

export const ApplicantCard: React.FC<ApplicantCardProps> = ({
  applicant,
  isNew,
  onDragStart,
  onClick,
}) => {
  const hasLinkedIn = !!applicant.linkedInUrl;
  const answerCount = Object.keys(applicant.formAnswers).length;
  const infoParts = [applicant.sex, applicant.age ? `${applicant.age}y` : '', applicant.education].filter(Boolean);

  return (
    <Box
      draggable
      onDragStart={(e) => onDragStart(e, applicant)}
      onClick={() => onClick(applicant)}
      sx={{
        background: hasLinkedIn ? 'white' : '#fefce8',
        borderRadius: 2.5,
        p: 2.5,
        cursor: 'pointer',
        border: hasLinkedIn ? '1px solid #e2e8f0' : '1px solid #fde68a',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        position: 'relative',
        opacity: hasLinkedIn ? 1 : 0.85,
        '&:hover': {
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          transform: 'translateY(-2px)',
          borderColor: '#667eea',
          opacity: 1,
        },
      }}
    >
      {/* NEW Badge */}
      {isNew && (
        <Box
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white',
            borderRadius: '6px',
            px: 1,
            py: 0.25,
            fontSize: '9px',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
          }}
        >
          NEW
        </Box>
      )}

      {/* No LinkedIn Warning Banner */}
      {!hasLinkedIn && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.75,
            mb: 1.5,
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
            background: '#fef3c7',
            border: '1px solid #fde68a',
          }}
        >
          <LinkOffIcon sx={{ fontSize: 12, color: '#d97706' }} />
          <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#92400e' }}>
            No LinkedIn
          </Typography>
        </Box>
      )}

      {/* Name */}
      <Typography
        sx={{
          fontWeight: 600,
          fontSize: '15px',
          color: '#1e293b',
          mb: 0.5,
          pr: isNew ? 5 : 0,
        }}
      >
        {applicant.name}
      </Typography>

      {/* Rejection Stage Chip */}
      {applicant.status === 'rejected' && applicant.rejectionStage && (
        <Chip
          label={REJECTION_STAGE_LABELS[applicant.rejectionStage]}
          size="small"
          sx={{
            fontSize: '10px',
            fontWeight: 600,
            height: 18,
            mb: 0.75,
            bgcolor: `${REJECTION_STAGE_COLORS[applicant.rejectionStage]}15`,
            color: REJECTION_STAGE_COLORS[applicant.rejectionStage],
            border: `1px solid ${REJECTION_STAGE_COLORS[applicant.rejectionStage]}40`,
          }}
        />
      )}

      {/* Age · Sex · University */}
      {infoParts.length > 0 && (
        <Typography
          sx={{
            color: '#64748b',
            fontSize: '12px',
            mb: 0.75,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {infoParts.join(' · ')}
        </Typography>
      )}

      {/* Score + Answer Count */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        {applicant.score !== null ? (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 0.25,
              px: 1.5,
              py: 0.25,
              borderRadius: 1.5,
              background: applicant.score >= 8 ? '#dcfce7' : applicant.score >= 5 ? '#fef3c7' : '#fee2e2',
              border: '1px solid',
              borderColor: applicant.score >= 8 ? '#86efac' : applicant.score >= 5 ? '#fde68a' : '#fecaca',
            }}
          >
            <Typography sx={{ fontSize: '14px', fontWeight: 700, color: applicant.score >= 8 ? '#16a34a' : applicant.score >= 5 ? '#d97706' : '#dc2626' }}>
              {applicant.score}
            </Typography>
            <Typography sx={{ fontSize: '10px', color: '#94a3b8' }}>
              /10
            </Typography>
          </Box>
        ) : (
          <Typography sx={{ fontSize: '11px', color: '#cbd5e1', fontStyle: 'italic' }}>
            Not scored
          </Typography>
        )}
        {answerCount > 0 && (
          <Tooltip title={`${answerCount} answers submitted`} arrow>
            <Typography sx={{ fontSize: '11px', color: '#94a3b8' }}>
              {answerCount} answers
            </Typography>
          </Tooltip>
        )}
      </Box>

      {/* Writing Test Deadline Badge */}
      {applicant.status === 'test_task' && (() => {
        const draftDate = applicant.outreach?.email?.draftCreatedAt;
        if (!draftDate) {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.25, height: 28, borderRadius: '8px', background: '#f8fafc', border: '1px dashed #cbd5e1', mb: 1.5 }}>
              <MailOutlineIcon sx={{ fontSize: 13, color: '#94a3b8' }} />
              <Typography sx={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8' }}>Test not sent yet</Typography>
            </Box>
          );
        }
        const deadline = new Date(draftDate);
        deadline.setDate(deadline.getDate() + 7);
        const daysLeft = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const isOverdue = daysLeft < 0;

        if (isOverdue) {
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.25, height: 28, borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', borderLeft: '3px solid #ef4444', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <WarningAmberIcon sx={{ fontSize: 13, color: '#dc2626' }} />
                <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#dc2626' }}>Overdue · {Math.abs(daysLeft)}d ago</Typography>
              </Box>
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', flexShrink: 0 }} />
            </Box>
          );
        }

        const isUrgent = daysLeft <= 3;
        const textColor = isUrgent ? '#c2410c' : '#15803d';
        const fillColor = isUrgent ? '#fb923c' : '#4ade80';
        const bg = isUrgent ? '#fff7ed' : '#f0fdf4';
        const borderColor = isUrgent ? '#fed7aa' : '#86efac';
        const fillWidth = Math.round((daysLeft / 7) * 48);

        return (
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.25, height: 28, borderRadius: '8px', background: bg, border: `1px solid ${borderColor}`, mb: 1.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <AccessTimeIcon sx={{ fontSize: 13, color: textColor }} />
              <Typography sx={{ fontSize: '11px', fontWeight: 700, color: textColor }}>{daysLeft}d left</Typography>
            </Box>
            <Box sx={{ width: 48, height: 4, borderRadius: 2, background: '#e2e8f0', overflow: 'hidden', flexShrink: 0 }}>
              <Box sx={{ width: fillWidth, height: '100%', background: fillColor, borderRadius: 2 }} />
            </Box>
          </Box>
        );
      })()}

      {/* Bottom Row: LinkedIn + Google Doc + Source */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          {hasLinkedIn ? (
            <Tooltip title="View LinkedIn" arrow>
              <Box
                component="a"
                href={applicant.linkedInUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #0077b520, #0077b510)',
                  border: '1px solid #0077b540',
                  borderRadius: 1.5,
                  p: 0.75,
                  '&:hover': { background: '#0077b520' },
                }}
              >
                <LinkedInIcon sx={{ fontSize: 16, color: '#0077b5' }} />
              </Box>
            </Tooltip>
          ) : (
            <Box />
          )}
          {applicant.testTaskUrl && (
            <Tooltip title="View Writing Test" arrow>
              <Box
                component="a"
                href={applicant.testTaskUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e: React.MouseEvent) => e.stopPropagation()}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #4285f420, #4285f410)',
                  border: '1px solid #4285f440',
                  borderRadius: 1.5,
                  p: 0.75,
                  '&:hover': { background: '#4285f420' },
                }}
              >
                <DocIcon sx={{ fontSize: 16, color: '#4285f4' }} />
              </Box>
            </Tooltip>
          )}
        </Box>

        <Chip
          label={applicant.source === 'webflow' ? 'Webflow' : applicant.source === 'csv_import' ? 'CSV' : 'Manual'}
          size="small"
          sx={{
            fontSize: '10px',
            fontWeight: 600,
            height: 20,
            background: applicant.source === 'webflow' ? '#dbeafe' : '#f1f5f9',
            color: applicant.source === 'webflow' ? '#2563eb' : '#64748b',
          }}
        />
      </Box>
    </Box>
  );
};
