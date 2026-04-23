import React, { useMemo, useState } from 'react';
import { Box, Typography, Chip, Divider, Tooltip, Collapse, IconButton } from '@mui/material';
import { ChevronRight as ChevronIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon, PlayArrow as PlayIcon, Pause as PauseIcon } from '@mui/icons-material';
import { Applicant, ApplicantStatus, RejectionStage, HIRING_STAGES, REJECTION_STAGE_LABELS } from '../../../types/applicant';
import { calculateHiringCosts, formatUSD, CostCategory } from '../../../utils/hiringCosts';

interface PipelineFunnelStripProps {
  applicants: Applicant[];
  recruiterOutreachCount?: number;
  hiringFeesFrozen?: boolean;
  hiringFeesFrozenAt?: Date;
  onToggleHiringFeesFrozen?: () => void;
}

// Responded is merged into Writing Test, so exclude from funnel
const FUNNEL_STAGES: ApplicantStatus[] = ['applied', 'shortlisted', 'test_task', 'interview', 'hired'];

export const PipelineFunnelStrip: React.FC<PipelineFunnelStripProps> = ({ applicants, recruiterOutreachCount, hiringFeesFrozen, hiringFeesFrozenAt, onToggleHiringFeesFrozen }) => {
  const stageCounts = useMemo(() => {
    const counts: Record<ApplicantStatus, number> = {
      ai_rejected: 0, backlog: 0, applied: 0, shortlisted: 0, test_task: 0, not_responded: 0,
      responded: 0, feedback: 0, interview: 0, hired: 0, rejected: 0,
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

  const total = applicants.filter((a) => a.status !== 'ai_rejected').length;
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

  const costs = useMemo(
    () => calculateHiringCosts(applicants, hiringFeesFrozen && hiringFeesFrozenAt ? hiringFeesFrozenAt : undefined),
    [applicants, hiringFeesFrozen, hiringFeesFrozenAt]
  );

  const recruiterStats = useMemo(() => {
    const sourced = applicants.filter((a) => a.recruiterSourced);
    const sourcedTotal = sourced.length;
    const organicTotal = applicants.length - sourcedTotal;
    // Real top-of-funnel: total candidates in recruiter's outreach sheet
    const outreached = recruiterOutreachCount || sourcedTotal;
    // Count recruiter-sourced at key funnel stages (includes those who passed through)
    const stageCount = (statuses: ApplicantStatus[]) =>
      sourced.filter((a) => statuses.includes(a.status)).length;
    const applied = sourcedTotal; // those who actually applied from outreach
    const shortlisted = stageCount(['shortlisted', 'test_task', 'not_responded', 'responded', 'feedback', 'interview', 'hired']);
    const writingTest = stageCount(['test_task', 'not_responded', 'responded', 'feedback', 'interview', 'hired']);
    const interview = stageCount(['interview', 'hired']);
    const hired = stageCount(['hired']);
    // Writing test sub-breakdown for recruiter-sourced
    const wtSent = sourced.filter((a) => a.status === 'test_task').length;
    const wtGhost = sourced.filter((a) => a.status === 'not_responded').length;
    const wtResp = sourced.filter((a) => a.status === 'responded').length;
    const wtFdbk = sourced.filter((a) => a.status === 'feedback').length;
    const wtRej = sourced.filter((a) => a.status === 'rejected' && (a.rejectionStage === 'test_task' || a.rejectionStage === 'not_responded' || a.rejectionStage === 'responded' || a.rejectionStage === 'feedback')).length;
    const wtTotal = wtSent + wtGhost + wtResp + wtFdbk + wtRej;
    const wtBreakdown = [
      { label: 'Sent', count: wtSent, color: '#f97316' },
      { label: 'Ghost', count: wtGhost, color: '#6b7280' },
      { label: 'Resp', count: wtResp, color: '#8b5cf6' },
      { label: 'Fdbk', count: wtFdbk, color: '#0ea5e9' },
      { label: 'Rej', count: wtRej, color: '#ef4444' },
    ];
    // Upwork cost from existing cost channels
    const upworkCost = costs.channels.find((c) => c.name === 'Upwork Recruiter')?.amountUSD || 0;

    // Quality comparison: recruiter vs organic
    const organic = applicants.filter((a) => !a.recruiterSourced);
    const rScores = sourced.filter((a) => a.score !== null).map((a) => a.score!);
    const oScores = organic.filter((a) => a.score !== null).map((a) => a.score!);
    const avgScore = rScores.length > 0 ? rScores.reduce((s, v) => s + v, 0) / rScores.length : null;
    const oAvgScore = oScores.length > 0 ? oScores.reduce((s, v) => s + v, 0) / oScores.length : null;
    const highPct = rScores.length > 0 ? Math.round(rScores.filter((s) => s >= 7).length / rScores.length * 100) : null;
    const oHighPct = oScores.length > 0 ? Math.round(oScores.filter((s) => s >= 7).length / oScores.length * 100) : null;
    const lowPct = rScores.length > 0 ? Math.round(rScores.filter((s) => s <= 3).length / rScores.length * 100) : null;
    const oLowPct = oScores.length > 0 ? Math.round(oScores.filter((s) => s <= 3).length / oScores.length * 100) : null;

    return { outreached, sourcedTotal, organicTotal, applied, shortlisted, writingTest, wtTotal, wtBreakdown, interview, hired, upworkCost, avgScore, oAvgScore, highPct, oHighPct, lowPct, oLowPct };
  }, [applicants, costs, recruiterOutreachCount]);

  const getStageInfo = (id: ApplicantStatus) =>
    HIRING_STAGES.find((s) => s.id === id)!;

  const getPercent = (count: number) =>
    total > 0 ? Math.round((count / total) * 100) : 0;

  const [statsExpanded, setStatsExpanded] = useState(false);

  const COST_GROUPS: { categoryKey: CostCategory; label: string; color: string; bgHover: string }[] = [
    { categoryKey: 'platforms', label: 'Platforms', color: '#667eea', bgHover: 'rgba(102,126,234,0.06)' },
    { categoryKey: 'hr', label: 'Human Resources', color: '#f59e0b', bgHover: 'rgba(245,158,11,0.06)' },
    { categoryKey: 'writing-tests', label: 'Writing Tests', color: '#10b981', bgHover: 'rgba(16,185,129,0.06)' },
  ];

  return (
    <Box sx={{ mx: 4, mb: 2, display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
      {/* Pipeline Funnel Strip — always visible */}
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

        {/* Right Zone — Hire Rate + Stats Toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
          <Tooltip arrow title={statsExpanded ? 'Hide stats' : 'Show costs & recruiter stats'}>
            <IconButton
              onClick={() => setStatsExpanded(!statsExpanded)}
              size="small"
              sx={{
                border: '1px solid #e2e8f0',
                borderRadius: 1.5,
                px: 1,
                py: 0.5,
                color: statsExpanded ? '#667eea' : '#94a3b8',
                transition: 'all 0.15s',
                '&:hover': { background: 'rgba(102,126,234,0.06)', color: '#667eea' },
              }}
            >
              {statsExpanded ? <ExpandLessIcon sx={{ fontSize: 18 }} /> : <ExpandMoreIcon sx={{ fontSize: 18 }} />}
              <Typography sx={{ fontSize: '10px', fontWeight: 600, ml: 0.5 }}>
                Stats
              </Typography>
            </IconButton>
          </Tooltip>
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

      {/* Collapsible stats — expand below pipeline strip */}
      <Collapse in={statsExpanded} timeout={300}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
          {/* Cost Breakdown Strip */}
          <CostBreakdownStrip
            costs={costs}
            costGroups={COST_GROUPS}
            paidTestCount={costs.paidTestCount}
            hiringFeesFrozen={hiringFeesFrozen}
            hiringFeesFrozenAt={hiringFeesFrozenAt}
            onToggleHiringFeesFrozen={onToggleHiringFeesFrozen}
          />

          {/* Recruiter ROI Strip */}
          {recruiterStats.sourcedTotal > 0 && (
            <RecruiterROIStrip recruiterStats={recruiterStats} costs={costs} />
          )}
        </Box>
      </Collapse>
    </Box>
  );
};

function abbreviateChannelName(name: string): string {
  const map: Record<string, string> = {
    'LinkedIn Job Post V1': 'LinkedIn V1',
    'LinkedIn Job Post V2': 'LinkedIn V2',
    'Upwork Recruiter': 'Upwork',
    'Paid Writing Tests': 'Paid Tests',
  };
  return map[name] ?? name;
}

/* ── Cost Breakdown Strip (extracted for Collapse) ── */
const CostBreakdownStrip: React.FC<{
  costs: any;
  costGroups: any[];
  paidTestCount: number;
  hiringFeesFrozen?: boolean;
  hiringFeesFrozenAt?: Date;
  onToggleHiringFeesFrozen?: () => void;
}> = ({ costs, costGroups, paidTestCount, hiringFeesFrozen, hiringFeesFrozenAt, onToggleHiringFeesFrozen }) => (
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
        background: hiringFeesFrozen
          ? 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)'
          : 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
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
        {hiringFeesFrozen ? 'Frozen Total' : 'Total Cost'}
      </Typography>
    </Box>

    {/* Freeze / Resume toggle */}
    {onToggleHiringFeesFrozen && (
      <Tooltip
        arrow
        title={
          hiringFeesFrozen
            ? `Frozen${hiringFeesFrozenAt ? ` at ${hiringFeesFrozenAt.toLocaleDateString()}` : ''} — click to resume daily accrual`
            : 'Click to freeze hiring fees (stops daily accrual)'
        }
      >
        <IconButton
          onClick={onToggleHiringFeesFrozen}
          size="small"
          sx={{
            ml: 1.5,
            border: `1px solid ${hiringFeesFrozen ? '#10b981' : '#cbd5e1'}`,
            borderRadius: 1.5,
            px: 1,
            py: 0.5,
            color: hiringFeesFrozen ? '#10b981' : '#ef4444',
            background: hiringFeesFrozen ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.06)',
            transition: 'all 0.15s',
            '&:hover': {
              background: hiringFeesFrozen ? 'rgba(16,185,129,0.14)' : 'rgba(239,68,68,0.12)',
            },
          }}
        >
          {hiringFeesFrozen ? <PlayIcon sx={{ fontSize: 16 }} /> : <PauseIcon sx={{ fontSize: 16 }} />}
          <Typography sx={{ fontSize: '10px', fontWeight: 700, ml: 0.5, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {hiringFeesFrozen ? 'Resume' : 'Freeze'}
          </Typography>
        </IconButton>
      </Tooltip>
    )}

    <Divider orientation="vertical" flexItem sx={{ mx: 2.5, my: 0.5 }} />

    {/* Calculated amounts grouped by category */}
    <Box sx={{ display: 'flex', alignItems: 'center', flex: 1 }}>
      {costGroups.map((group: any, gi: number) => {
        const channels = costs.channels.filter((c: any) => c.category === group.categoryKey);
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
                {channels.map((ch: any) => {
                  const isClosed = ch.status === 'closed';
                  return (
                    <Tooltip key={ch.name} arrow title={ch.detail} placement="bottom">
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          px: 1.5,
                          py: 0.75,
                          borderRadius: 1.5,
                          borderLeft: `3px solid ${isClosed ? `${group.color}66` : group.color}`,
                          background: 'rgba(0,0,0,0.025)',
                          cursor: 'default',
                          transition: 'background 0.15s',
                          '&:hover': { background: group.bgHover },
                        }}
                      >
                        <Typography sx={{ fontSize: '15px', fontWeight: 700, color: isClosed ? '#94a3b8' : '#1e293b', lineHeight: 1, whiteSpace: 'nowrap' }}>
                          {formatUSD(ch.amountUSD)}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: '5px', mt: 0.375 }}>
                          <Typography sx={{ fontSize: '10px', fontWeight: 500, color: isClosed ? '#94a3b8' : '#64748b', whiteSpace: 'nowrap' }}>
                            {abbreviateChannelName(ch.name)}
                          </Typography>
                          <Box
                            sx={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              bgcolor: isClosed ? '#cbd5e1' : ch.status === 'recurring' ? '#22c55e' : '#f59e0b',
                              flexShrink: 0,
                              ...(ch.status === 'recurring' && {
                                '@keyframes pulse-ring': {
                                  '0%': { boxShadow: '0 0 0 0px rgba(34,197,94,0.4)' },
                                  '70%': { boxShadow: '0 0 0 4px rgba(34,197,94,0)' },
                                  '100%': { boxShadow: '0 0 0 0px rgba(34,197,94,0)' },
                                },
                                animation: 'pulse-ring 2s ease-out infinite',
                              }),
                            }}
                          />
                          {ch.status === 'recurring' && ch.elapsed && (
                            <Typography sx={{ fontSize: '9px', fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                              {ch.elapsed}
                            </Typography>
                          )}
                          {ch.status === 'per-event' && ch.eventCount !== undefined && (
                            <Typography sx={{ fontSize: '9px', fontWeight: 600, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                              {ch.eventCount}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    </Tooltip>
                  );
                })}
              </Box>
            </Box>
          </React.Fragment>
        );
      })}
    </Box>

    <Divider orientation="vertical" flexItem sx={{ mx: 2.5, my: 0.5 }} />

    {/* Right side: unit rates / constants */}
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0 }}>
      <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
        Rates
      </Typography>
      <Box sx={{ display: 'flex', gap: 1.5 }}>
        {costs.channels.map((ch: any) => (
          <Box key={ch.name} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography sx={{ fontSize: '12px', fontWeight: 700, color: '#475569', lineHeight: 1, whiteSpace: 'nowrap' }}>
              {ch.unitRate}
            </Typography>
            <Typography sx={{ fontSize: '9px', fontWeight: 500, color: '#94a3b8', mt: 0.25, whiteSpace: 'nowrap' }}>
              {abbreviateChannelName(ch.name)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  </Box>
);

/* ── Recruiter ROI Strip (extracted for Collapse) ── */
const RecruiterROIStrip: React.FC<{ recruiterStats: any; costs: any }> = ({ recruiterStats, costs }) => (
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
    {/* Left Zone — Funnel Flow (starts at outreached total, same pattern as main pipeline) */}
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flex: 1 }}>
      {[
        { label: 'Applied', count: recruiterStats.outreached, color: '#3b82f6', isFirst: true },
        { label: 'Shortlisted', count: recruiterStats.shortlisted, color: '#f59e0b', isFirst: false },
        { label: 'Writing Test', count: recruiterStats.wtTotal, color: '#f97316', isFirst: false, isWT: true },
        { label: 'Interview', count: recruiterStats.interview, color: '#06b6d4', isFirst: false },
        { label: 'Hired', count: recruiterStats.hired, color: '#10b981', isFirst: false },
      ].map((stage, i) => (
        <React.Fragment key={stage.label}>
          {i > 0 && <ChevronIcon sx={{ fontSize: 16, color: '#cbd5e1', flexShrink: 0 }} />}
          {stage.isWT ? (
            /* Writing Test with sub-breakdown */
            <Box
              sx={{
                minWidth: 200,
                flexShrink: 0,
                px: 1.5,
                py: 0.75,
                borderRadius: 2,
                background: 'linear-gradient(135deg, rgba(249,115,22,0.06) 0%, rgba(139,92,246,0.05) 50%, rgba(14,165,233,0.05) 100%)',
                border: '1.5px solid rgba(249,115,22,0.2)',
                cursor: 'default',
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
                  {stage.count}
                </Typography>
                <Typography sx={{ fontSize: '9px', fontWeight: 600, color: '#64748b', mt: 0.25, whiteSpace: 'nowrap' }}>
                  Writing Test
                </Typography>
              </Box>
              {recruiterStats.wtTotal > 0 && (
                <>
                  <Box sx={{ display: 'flex', height: 4, borderRadius: '2px', overflow: 'hidden', mt: 0.5, bgcolor: 'rgba(0,0,0,0.06)' }}>
                    {recruiterStats.wtBreakdown.filter((item: any) => item.count > 0).map((item: any) => (
                      <Box key={item.label} sx={{ flex: item.count, bgcolor: item.color, transition: 'flex 0.3s ease' }} />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.75, mt: 0.375 }}>
                    {recruiterStats.wtBreakdown.filter((item: any) => item.count > 0).map((item: any) => (
                      <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                        <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: item.color, flexShrink: 0 }} />
                        <Typography sx={{ fontSize: '9px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
                          {item.count}
                        </Typography>
                        <Typography sx={{ fontSize: '8px', fontWeight: 500, color: '#64748b' }}>
                          {item.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
              {recruiterStats.outreached > 0 && (
                <Typography sx={{ fontSize: '8px', color: '#94a3b8', fontWeight: 600, textAlign: 'center', mt: 0.25 }}>
                  {Math.round((stage.count / recruiterStats.outreached) * 100)}%
                </Typography>
              )}
            </Box>
          ) : (
            <Tooltip arrow title={stage.isFirst ? `${stage.count} total recruiter outreach` : `${stage.count} of ${recruiterStats.outreached} outreached (${recruiterStats.outreached > 0 ? Math.round((stage.count / recruiterStats.outreached) * 100) : 0}%)`}>
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  px: 1.25,
                  py: 0.5,
                  borderRadius: 1.5,
                  borderBottom: `3px solid ${stage.color}`,
                  minWidth: 48,
                  cursor: 'default',
                  transition: 'background 0.15s',
                  '&:hover': { background: 'rgba(0,0,0,0.03)' },
                }}
              >
                <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
                  {stage.count}
                </Typography>
                <Typography sx={{ fontSize: '9px', fontWeight: 600, color: '#64748b', mt: 0.25, whiteSpace: 'nowrap' }}>
                  {stage.label}
                </Typography>
                {!stage.isFirst && recruiterStats.outreached > 0 && (
                  <Typography sx={{ fontSize: '8px', color: '#94a3b8', fontWeight: 600 }}>
                    {Math.round((stage.count / recruiterStats.outreached) * 100)}%
                  </Typography>
                )}
              </Box>
            </Tooltip>
          )}
        </React.Fragment>
      ))}
    </Box>

    <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />

    <Box sx={{ display: 'flex', gap: 2, flexShrink: 0 }}>
      <Tooltip arrow title={`${formatUSD(recruiterStats.upworkCost)} Upwork cost / ${recruiterStats.outreached} outreached candidates`}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', px: 1 }}>
          <Typography sx={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', lineHeight: 1 }}>
            {recruiterStats.outreached > 0 ? formatUSD(recruiterStats.upworkCost / recruiterStats.outreached) : 'N/A'}
          </Typography>
          <Typography sx={{ fontSize: '9px', fontWeight: 600, color: '#64748b', mt: 0.25, whiteSpace: 'nowrap' }}>
            Cost/Outreach
          </Typography>
        </Box>
      </Tooltip>
      <Tooltip arrow title={recruiterStats.hired > 0 ? `${formatUSD(recruiterStats.upworkCost)} Upwork cost / ${recruiterStats.hired} hires` : 'No recruiter-sourced hires yet'}>
        <Box
          sx={{
            px: 2,
            py: 1,
            borderRadius: 2,
            background: recruiterStats.hired > 0
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            minWidth: 56,
          }}
        >
          <Typography sx={{ fontSize: '16px', fontWeight: 800, color: 'white', lineHeight: 1 }}>
            {recruiterStats.hired > 0 ? formatUSD(recruiterStats.upworkCost / recruiterStats.hired) : 'N/A'}
          </Typography>
          <Typography sx={{ fontSize: '9px', fontWeight: 600, color: 'rgba(255,255,255,0.8)', mt: 0.25, whiteSpace: 'nowrap' }}>
            Cost/Hire
          </Typography>
        </Box>
      </Tooltip>
    </Box>

    {/* Quality comparison: Recruiter vs Organic */}
    {recruiterStats.avgScore !== null && recruiterStats.oAvgScore !== null && (
      <>
        <Divider orientation="vertical" flexItem sx={{ mx: 2 }} />
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flexShrink: 0 }}>
          <Typography sx={{ fontSize: '10px', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Quality: Recruiter vs Organic
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            {[
              {
                label: 'Avg Score',
                recruiter: recruiterStats.avgScore?.toFixed(1) ?? '-',
                organic: recruiterStats.oAvgScore?.toFixed(1) ?? '-',
                better: (recruiterStats.avgScore ?? 0) > (recruiterStats.oAvgScore ?? 0),
              },
              {
                label: 'High Scorers (7+)',
                recruiter: recruiterStats.highPct !== null ? `${recruiterStats.highPct}%` : '-',
                organic: recruiterStats.oHighPct !== null ? `${recruiterStats.oHighPct}%` : '-',
                better: (recruiterStats.highPct ?? 0) > (recruiterStats.oHighPct ?? 0),
              },
              {
                label: 'Low Scorers (0-3)',
                recruiter: recruiterStats.lowPct !== null ? `${recruiterStats.lowPct}%` : '-',
                organic: recruiterStats.oLowPct !== null ? `${recruiterStats.oLowPct}%` : '-',
                better: (recruiterStats.lowPct ?? 0) < (recruiterStats.oLowPct ?? 0),
              },
            ].map((metric) => (
              <Box key={metric.label} sx={{ display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                <Typography sx={{ fontSize: '9px', fontWeight: 600, color: '#64748b', whiteSpace: 'nowrap' }}>
                  {metric.label}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.375 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #f59e0b, #d97706)', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '13px', fontWeight: 700, color: metric.better ? '#16a34a' : '#dc2626', lineHeight: 1 }}>
                      {metric.recruiter}
                    </Typography>
                  </Box>
                  <Typography sx={{ fontSize: '9px', color: '#cbd5e1', lineHeight: 1 }}>|</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.375 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#e2e8f0', flexShrink: 0 }} />
                    <Typography sx={{ fontSize: '13px', fontWeight: 600, color: '#94a3b8', lineHeight: 1 }}>
                      {metric.organic}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </>
    )}
  </Box>
);
