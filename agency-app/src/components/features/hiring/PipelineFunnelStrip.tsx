import React, { useMemo } from 'react';
import { Box, Typography, Chip, Divider, Tooltip } from '@mui/material';
import { ChevronRight as ChevronIcon } from '@mui/icons-material';
import { Applicant, ApplicantStatus, RejectionStage, HIRING_STAGES, REJECTION_STAGE_LABELS } from '../../../types/applicant';

interface PipelineFunnelStripProps {
  applicants: Applicant[];
}

// Responded is merged into Writing Test, so exclude from funnel
const FUNNEL_STAGES: ApplicantStatus[] = ['applied', 'shortlisted', 'test_task', 'offer', 'hired'];

export const PipelineFunnelStrip: React.FC<PipelineFunnelStripProps> = ({ applicants }) => {
  const stageCounts = useMemo(() => {
    const counts: Record<ApplicantStatus, number> = {
      applied: 0, shortlisted: 0, test_task: 0, responded: 0,
      feedback: 0, offer: 0, hired: 0, rejected: 0,
    };
    for (const a of applicants) counts[a.status]++;
    return counts;
  }, [applicants]);

  const rejectionBreakdown = useMemo(() => {
    const counts: Partial<Record<RejectionStage, number>> = {};
    let unknown = 0;
    for (const a of applicants) {
      if (a.status === 'rejected') {
        if (a.rejectionStage) {
          counts[a.rejectionStage] = (counts[a.rejectionStage] || 0) + 1;
        } else {
          unknown++;
        }
      }
    }
    return { counts, unknown };
  }, [applicants]);

  const total = applicants.length;
  const hireRate = total > 0 ? Math.round((stageCounts.hired / total) * 100) : 0;

  const getStageInfo = (id: ApplicantStatus) =>
    HIRING_STAGES.find((s) => s.id === id)!;

  const getPercent = (count: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <Box
      sx={{
        mx: 4,
        mb: 2,
        px: 3,
        py: 1.5,
        background: 'rgba(255, 255, 255, 0.85)',
        backdropFilter: 'blur(20px)',
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.6)',
        boxShadow: '0 4px 24px rgba(102, 126, 234, 0.08)',
        display: 'flex',
        alignItems: 'center',
        flexShrink: 0,
      }}
    >
      {/* Left Zone — Funnel Flow */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
        {FUNNEL_STAGES.map((stageId, i) => {
          const stage = getStageInfo(stageId);
          // First step shows total; Writing Test includes responded + feedback count
          const count = i === 0
            ? total
            : stageId === 'test_task'
              ? stageCounts.test_task + stageCounts.responded + stageCounts.feedback
              : stageCounts[stageId];
          const pct = getPercent(count);

          return (
            <React.Fragment key={stageId}>
              {i > 0 && (
                <ChevronIcon sx={{ fontSize: 18, color: '#cbd5e1', flexShrink: 0 }} />
              )}
              <Tooltip title={i === 0 ? `${total} total applications received` : `${count} of ${total} applicants (${pct}%)`} arrow>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1.5,
                    borderBottom: `3px solid ${stage.color}`,
                    minWidth: 56,
                    cursor: 'default',
                    transition: 'background 0.15s',
                    '&:hover': { background: 'rgba(0,0,0,0.03)' },
                  }}
                >
                  <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
                    {count}
                  </Typography>
                  <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#64748b', mt: 0.25, whiteSpace: 'nowrap' }}>
                    {i === 0 ? 'Applied' : stage.label}
                  </Typography>
                  {i > 0 && (
                    <Typography sx={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600 }}>
                      {pct}%
                    </Typography>
                  )}
                </Box>
              </Tooltip>
            </React.Fragment>
          );
        })}

        {/* Rejected — separate chip with breakdown tooltip */}
        <Box sx={{ ml: 1.5 }}>
          <Tooltip
            arrow
            title={
              stageCounts.rejected > 0 ? (
                <Box sx={{ p: 0.5 }}>
                  {(Object.entries(rejectionBreakdown.counts) as [RejectionStage, number][]).map(
                    ([stage, count]) => (
                      <Typography key={stage} sx={{ fontSize: '12px', mb: 0.25 }}>
                        {count} {REJECTION_STAGE_LABELS[stage]}
                      </Typography>
                    )
                  )}
                  {rejectionBreakdown.unknown > 0 && (
                    <Typography sx={{ fontSize: '12px', color: '#94a3b8' }}>
                      {rejectionBreakdown.unknown} Unknown
                    </Typography>
                  )}
                </Box>
              ) : ''
            }
          >
            <Chip
              label={`${stageCounts.rejected} Rejected`}
              size="small"
              sx={{
                bgcolor: '#fee2e2',
                color: '#dc2626',
                fontWeight: 700,
                fontSize: '11px',
                height: 24,
                cursor: 'default',
              }}
            />
          </Tooltip>
        </Box>
      </Box>

      <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />

      {/* Right Zone — Spotlight */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
        {/* Active Test Tasks */}
        <Box
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2,
            background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(234,88,12,0.04) 100%)',
            border: '1.5px solid rgba(249, 115, 22, 0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
          }}
        >
          <Typography sx={{ fontSize: '22px', fontWeight: 800, color: '#f97316', lineHeight: 1 }}>
            {stageCounts.test_task + stageCounts.responded + stageCounts.feedback}
          </Typography>
          <Box>
            <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#ea580c', lineHeight: 1.2 }}>
              Writing Tests
            </Typography>
            <Typography sx={{ fontSize: '10px', color: '#fb923c', fontWeight: 600 }}>
              Active
            </Typography>
          </Box>
        </Box>

        {/* Hire Rate */}
        <Box
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 56,
          }}
        >
          <Typography sx={{ fontSize: '18px', fontWeight: 800, color: 'white', lineHeight: 1 }}>
            {hireRate}%
          </Typography>
          <Typography sx={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', mt: 0.25 }}>
            Hire Rate
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
