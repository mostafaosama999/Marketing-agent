import React, { useMemo } from 'react';
import { Box, Typography, Chip, Divider, Tooltip } from '@mui/material';
import { ChevronRight as ChevronIcon } from '@mui/icons-material';
import { Applicant, ApplicantStatus, RejectionStage, HIRING_STAGES, REJECTION_STAGE_LABELS } from '../../../types/applicant';
import { calculateHiringCosts, formatUSD, CostCategory } from '../../../utils/hiringCosts';

interface PipelineFunnelStripProps {
  applicants: Applicant[];
}

// Responded is merged into Writing Test, so exclude from funnel
const FUNNEL_STAGES: ApplicantStatus[] = ['applied', 'shortlisted', 'test_task', 'offer', 'hired'];

export const PipelineFunnelStrip: React.FC<PipelineFunnelStripProps> = ({ applicants }) => {
  const stageCounts = useMemo(() => {
    const counts: Record<ApplicantStatus, number> = {
      applied: 0, shortlisted: 0, test_task: 0, not_responded: 0,
      responded: 0, feedback: 0, offer: 0, hired: 0, rejected: 0,
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
    const wtRejected = applicants.filter(
      (a) => a.status === 'rejected' && (a.rejectionStage === 'test_task' || a.rejectionStage === 'not_responded' || a.rejectionStage === 'responded' || a.rejectionStage === 'feedback')
    ).length;
    const items = [
      { label: 'Sent Test', count: stageCounts.test_task, color: '#f97316' },
      { label: 'No Reply', count: stageCounts.not_responded, color: '#6b7280' },
      { label: 'Responded', count: stageCounts.responded, color: '#8b5cf6' },
      { label: 'Feedback', count: stageCounts.feedback, color: '#0ea5e9' },
      { label: 'Rejected', count: wtRejected, color: '#ef4444' },
    ];
    const wtTotal = stageCounts.test_task + stageCounts.not_responded + stageCounts.responded + stageCounts.feedback + wtRejected;
    return { items, total: wtTotal };
  }, [stageCounts, applicants]);

  const costs = useMemo(() => calculateHiringCosts(applicants), [applicants]);

  const getStageInfo = (id: ApplicantStatus) =>
    HIRING_STAGES.find((s) => s.id === id)!;

  const getPercent = (count: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  const COST_GROUPS: { categoryKey: CostCategory; label: string; color: string; bgHover: string }[] = [
    { categoryKey: 'platforms', label: 'Platforms', color: '#667eea', bgHover: 'rgba(102,126,234,0.06)' },
    { categoryKey: 'hr', label: 'Human Resources', color: '#f59e0b', bgHover: 'rgba(245,158,11,0.06)' },
    { categoryKey: 'writing-tests', label: 'Writing Tests', color: '#10b981', bgHover: 'rgba(16,185,129,0.06)' },
  ];

  return (
    <Box sx={{ mx: 4, mb: 2, display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
      {/* Cost Breakdown Strip */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 4px 24px rgba(102, 126, 234, 0.08)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Total badge */}
        <Box
          sx={{
            px: 2.5,
            py: 1.25,
            borderRadius: 2,
            background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flexShrink: 0,
            minWidth: 90,
          }}
        >
          <Typography sx={{ fontSize: '20px', fontWeight: 800, color: 'white', lineHeight: 1 }}>
            {formatUSD(costs.totalUSD)}
          </Typography>
          <Typography sx={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.82)', mt: 0.5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
            Total Cost
          </Typography>
        </Box>

        <Divider orientation="vertical" flexItem sx={{ mx: 2.5, my: 0.5 }} />

        {/* Channel clusters grouped by category */}
        {COST_GROUPS.map((group, gi) => {
          const channels = costs.channels.filter((c) => c.category === group.categoryKey);
          if (!channels.length) return null;
          return (
            <React.Fragment key={group.categoryKey}>
              {gi > 0 && (
                <Divider orientation="vertical" flexItem sx={{ mx: 2, my: 0.5, borderColor: 'rgba(0,0,0,0.06)' }} />
              )}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography sx={{ fontSize: '10px', fontWeight: 700, color: group.color, textTransform: 'uppercase', letterSpacing: '0.07em', pl: 1 }}>
                  {group.label}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1.25 }}>
                  {channels.map((ch) => (
                    <Tooltip key={ch.name} arrow title={ch.detail} placement="bottom">
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1.5,
                          px: 1.5,
                          py: 0.75,
                          borderRadius: 1.5,
                          borderLeft: `3px solid ${group.color}`,
                          background: 'rgba(0,0,0,0.025)',
                          cursor: 'default',
                          transition: 'background 0.15s',
                          '&:hover': { background: group.bgHover },
                        }}
                      >
                        {/* Left: calculated amount */}
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography sx={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', lineHeight: 1, whiteSpace: 'nowrap' }}>
                            {formatUSD(ch.amountUSD)}
                          </Typography>
                          <Typography sx={{ fontSize: '10px', fontWeight: 500, color: '#64748b', mt: 0.375, whiteSpace: 'nowrap' }}>
                            {abbreviateChannelName(ch.name)}
                            {ch.category === 'writing-tests' && costs.paidTestCount > 0 ? ` · ${costs.paidTestCount}` : ''}
                          </Typography>
                        </Box>
                        {/* Right: unit rate */}
                        <Typography sx={{ fontSize: '9px', fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {ch.unitRate}
                        </Typography>
                      </Box>
                    </Tooltip>
                  ))}
                </Box>
              </Box>
            </React.Fragment>
          );
        })}
      </Box>

      {/* Pipeline Funnel Strip */}
      <Box
        sx={{
          px: 3,
          py: 1.5,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          border: '1px solid rgba(255, 255, 255, 0.6)',
          boxShadow: '0 4px 24px rgba(102, 126, 234, 0.08)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {/* Left Zone — Funnel Flow */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
          {FUNNEL_STAGES.map((stageId, i) => {
            const stage = getStageInfo(stageId);
            const count = i === 0
              ? total
              : stageId === 'test_task'
                ? writingTestBreakdown.total
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
                      minWidth: 260,
                      flexShrink: 0,
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
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography sx={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
                        {count}
                      </Typography>
                      <Typography sx={{ fontSize: '10px', fontWeight: 600, color: '#64748b', mt: 0.25, whiteSpace: 'nowrap' }}>
                        Writing Test
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', height: 5, borderRadius: '3px', overflow: 'hidden', mt: 0.75, bgcolor: 'rgba(0,0,0,0.06)' }}>
                      {writingTestBreakdown.total > 0 && writingTestBreakdown.items.filter(item => item.count > 0).map(item => (
                        <Box key={item.label} sx={{ flex: item.count, bgcolor: item.color, transition: 'flex 0.3s ease' }} />
                      ))}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mt: 0.5 }}>
                      {writingTestBreakdown.items.filter(item => item.count > 0).map((item) => (
                        <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
                          <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
                            {item.count}
                          </Typography>
                          <Typography sx={{ fontSize: '9px', fontWeight: 500, color: '#64748b' }}>
                            {item.label === 'Sent Test' ? 'Sent' : item.label === 'No Reply' ? 'Ghost' : item.label === 'Responded' ? 'Resp' : item.label === 'Feedback' ? 'Fdbk' : 'Rej'}
                          </Typography>
                        </Box>
                      ))}
                    </Box>

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

          {/* Rejected */}
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

        {/* Right Zone — Hire Rate */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
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
    </Box>
  );
};

function abbreviateChannelName(name: string): string {
  const map: Record<string, string> = {
    'LinkedIn Job Post V1': 'LI Post V1',
    'LinkedIn Job Post V2': 'LI Post V2',
    'Upwork Recruiter': 'Upwork',
    'Paid Writing Tests': 'Paid Tests',
  };
  return map[name] ?? name;
}
