import React from 'react';
import { Box, Typography, Tooltip, Chip, IconButton } from '@mui/material';
import {
  LinkedIn as LinkedInIcon,
  ContentCopy as CopyIcon,
  AccessTime as AccessTimeIcon,
  WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import { SourcedCandidate, isStale } from '../../../types/sourcedCandidate';

interface OutboundCandidateCardProps {
  candidate: SourcedCandidate;
  onDragStart: (e: React.DragEvent, candidate: SourcedCandidate) => void;
  onClick: (candidate: SourcedCandidate) => void;
  onCopyDm: (candidate: SourcedCandidate) => void;
  copyDisabled?: boolean;
}

function scoreColors(score: number) {
  if (score >= 8) return { bg: '#dcfce7', color: '#16a34a', border: '#86efac' };
  if (score >= 5) return { bg: '#fef3c7', color: '#d97706', border: '#fde68a' };
  return { bg: '#fee2e2', color: '#dc2626', border: '#fecaca' };
}

export const OutboundCandidateCard: React.FC<OutboundCandidateCardProps> = ({
  candidate,
  onDragStart,
  onClick,
  onCopyDm,
  copyDisabled,
}) => {
  const stale = isStale(candidate);
  const sc = scoreColors(candidate.score);
  const roleLine = [candidate.currentRole, candidate.currentCompany].filter(Boolean).join(' @ ');

  return (
    <Box
      draggable
      onDragStart={(e) => onDragStart(e, candidate)}
      onClick={() => onClick(candidate)}
      sx={{
        background: 'white',
        borderRadius: 2.5,
        p: 2.5,
        cursor: 'pointer',
        border: '1px solid #e2e8f0',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        flexShrink: 0,
        position: 'relative',
        '&:hover': {
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          transform: 'translateY(-2px)',
          borderColor: '#667eea',
        },
      }}
    >
      {/* Copy DM button (top-right) */}
      <Tooltip title={copyDisabled ? 'No draft or default template' : 'Copy DM to clipboard'} arrow>
        <span
          style={{ position: 'absolute', top: 8, right: 8 }}
          onClick={(e) => e.stopPropagation()}
        >
          <IconButton
            size="small"
            disabled={copyDisabled}
            onClick={(e) => {
              e.stopPropagation();
              onCopyDm(candidate);
            }}
            sx={{
              background: copyDisabled ? '#f1f5f9' : 'linear-gradient(135deg, #667eea20, #764ba220)',
              border: copyDisabled ? '1px solid #e2e8f0' : '1px solid #667eea40',
              '&:hover': {
                background: 'linear-gradient(135deg, #667eea35, #764ba235)',
              },
            }}
          >
            <CopyIcon sx={{ fontSize: 14, color: copyDisabled ? '#cbd5e1' : '#667eea' }} />
          </IconButton>
        </span>
      </Tooltip>

      {/* Name */}
      <Typography sx={{ fontWeight: 600, fontSize: '15px', color: '#1e293b', mb: 0.5, pr: 5 }}>
        {candidate.name}
      </Typography>

      {/* Role @ Company */}
      {roleLine && (
        <Typography sx={{ color: '#64748b', fontSize: '12px', mb: 0.75, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {roleLine}
        </Typography>
      )}

      {/* University + tier */}
      {candidate.university && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <Typography sx={{ fontSize: '11px', color: '#475569' }}>{candidate.university}</Typography>
          {candidate.universityTier && (
            <Chip
              label={candidate.universityTier}
              size="small"
              sx={{ fontSize: '9px', fontWeight: 700, height: 16, bgcolor: '#ede9fe', color: '#6d28d9', '& .MuiChip-label': { px: 0.75 } }}
            />
          )}
        </Box>
      )}

      {/* Score + tier chips */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, flexWrap: 'wrap' }}>
        <Tooltip title={candidate.whyThisPerson || 'Candidate score'} arrow>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 0.25,
              px: 1,
              py: 0.25,
              borderRadius: 1.5,
              background: sc.bg,
              border: `1px solid ${sc.border}`,
            }}
          >
            <Typography sx={{ fontSize: '13px', fontWeight: 700, color: sc.color }}>{candidate.score}</Typography>
            <Typography sx={{ fontSize: '9px', color: '#94a3b8' }}>/10</Typography>
          </Box>
        </Tooltip>
        {candidate.tier && (
          <Chip
            label={candidate.tier.toUpperCase()}
            size="small"
            sx={{
              fontSize: '9px',
              fontWeight: 800,
              height: 18,
              bgcolor: candidate.tier === 'premium' ? '#fef3c7' : '#dbeafe',
              color: candidate.tier === 'premium' ? '#b45309' : '#2563eb',
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        )}
      </Box>

      {/* Stale badge */}
      {stale && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            mb: 1,
            px: 1,
            py: 0.5,
            borderRadius: 1,
            background: '#fff7ed',
            border: '1px solid #fed7aa',
            borderLeft: '3px solid #f97316',
          }}
        >
          <WarningAmberIcon sx={{ fontSize: 12, color: '#c2410c' }} />
          <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#c2410c' }}>
            No response {candidate.sentAt ? `· ${Math.floor((Date.now() - candidate.sentAt.getTime()) / 86400000)}d` : ''}
          </Typography>
        </Box>
      )}

      {/* Sent / replied timestamps */}
      {candidate.sentAt && !stale && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <AccessTimeIcon sx={{ fontSize: 12, color: '#64748b' }} />
          <Typography sx={{ fontSize: '10px', color: '#64748b' }}>
            Sent {candidate.sentAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Typography>
        </Box>
      )}

      {/* Bottom row: LinkedIn icon */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {candidate.linkedInUrl ? (
          <Tooltip title="View LinkedIn" arrow>
            <Box
              component="a"
              href={candidate.linkedInUrl}
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
        {candidate.sourcedBy === 'claude_skill' && (
          <Chip
            label="Skill"
            size="small"
            sx={{
              fontSize: '9px',
              fontWeight: 700,
              height: 18,
              bgcolor: '#ede9fe',
              color: '#6d28d9',
              '& .MuiChip-label': { px: 0.75 },
            }}
          />
        )}
      </Box>
    </Box>
  );
};
