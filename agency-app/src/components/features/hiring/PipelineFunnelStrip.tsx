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

  const writingTestBreakdown = useMemo(() => {
    const items = [
      { label: 'Sent Test', count: stageCounts.test_task, color: '#f97316' },
      { label: 'Responded', count: stageCounts.responded, color: '#8b5cf6' },
      { label: 'Feedback', count: stageCounts.feedback, color: '#0ea5e9' },
    ];
    const wtTotal = stageCounts.test_task + stageCounts.responded + stageCounts.feedback;
    return { items, total: wtTotal };
  }, [stageCounts]);

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
              {stageId === 'test_task' ? (
                <Box
                  sx={{
                    width: 240,
                    flexShrink: 0,
                    overflow: 'hidden',
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, rgba(249,115,22,0.06) 0%, rgba(139,92,246,0.05) 50%, rgba(14,165,233,0.05) 100%)',
                    border: '1.5px solid rgba(249,115,22,0.2)',
                    cursor: 'default',
                    transition: 'background 0.15s, box-shadow 0.15s',
                    '&:hover': {
                      background: 'linear-gradient(135deg, rgba(249,115,22,0.10) 0%, rgba(139,92,246,0.08) 50%, rgba(14,165,233,0.07) 100%)',
                      boxShadow: '0 2px 10px rgba(249,115,22,0.12)',
                    },
                  }}
                >
                  {/* Top: count + label */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
                      {count}
                    </Typography>
                    <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#64748b', mt: 0.25, whiteSpace: 'nowrap' }}>
                      Writing Test
                    </Typography>
                  </Box>

                  {/* Stacked bar */}
                  <Box sx={{ display: 'flex', height: 5, borderRadius: '3px', overflow: 'hidden', mt: 0.75, bgcolor: 'rgba(0,0,0,0.06)' }}>
                    {writingTestBreakdown.total > 0 && writingTestBreakdown.items.filter(item => item.count > 0).map(item => (
                      <Box key={item.label} sx={{ flex: item.count, bgcolor: item.color, transition: 'flex 0.3s ease' }} />
                    ))}
                  </Box>

                  {/* Sub-stage legend */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 0.5 }}>
                    {writingTestBreakdown.items.map((item) => (
                      <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
                          {item.count}
                        </Typography>
                        <Typography sx={{ fontSize: '9px', fontWeight: 500, color: '#64748b' }}>
                          {item.label === 'Sent Test' ? 'Sent' : item.label === 'Responded' ? 'Resp' : 'Fdbk'}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Percentage at bottom */}
                  <Typography sx={{ fontSize: '9px', color: '#94a3b8', fontWeight: 600, textAlign: 'center', mt: 0.25 }}>
                    {pct}%
                  </Typography>
                </Box>
              ) : (
                <Tooltip arrow title={i === 0 ? `${total} total applications received` : `${count} of ${total} applicants (${pct}%)`}>
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
              )}
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
