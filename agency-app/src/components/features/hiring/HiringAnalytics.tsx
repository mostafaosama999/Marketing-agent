import React, { useMemo } from 'react';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts';
import { Applicant } from '../../../types/applicant';

interface HiringAnalyticsProps {
  applicants: Applicant[];
}

const glassCardSx = {
  background: 'rgba(255,255,255,0.85)',
  backdropFilter: 'blur(20px)',
  borderRadius: 3,
  border: '1px solid rgba(255,255,255,0.3)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
};

const HiringAnalytics: React.FC<HiringAnalyticsProps> = ({ applicants }) => {
  const dailyData = useMemo(() => {
    const counts: Record<string, { inbound: number; recruiter: number }> = {};

    applicants.forEach((a) => {
      const d = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      if (!counts[key]) counts[key] = { inbound: 0, recruiter: 0 };
      if (a.recruiterSourced) counts[key].recruiter += 1;
      else counts[key].inbound += 1;
    });

    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { inbound, recruiter }]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        inbound,
        recruiter,
      }));
  }, [applicants]);

  const aiScoredDailyData = useMemo(() => {
    const counts: Record<string, { autoRejected: number; passed: number }> = {};

    applicants.forEach((a) => {
      if (!a.aiScore) return;
      const d = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
      if (isNaN(d.getTime())) return;
      const key = d.toISOString().slice(0, 10);
      if (!counts[key]) counts[key] = { autoRejected: 0, passed: 0 };
      const isAutoRejected = a.aiScore.instantReject === true || a.aiScore.tier === 'REJECT';
      if (isAutoRejected) counts[key].autoRejected += 1;
      else counts[key].passed += 1;
    });

    return Object.entries(counts)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, { autoRejected, passed }]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        autoRejected,
        passed,
      }));
  }, [applicants]);

  const xTickInterval = useMemo(() => {
    if (dailyData.length <= 15) return undefined;
    const step = Math.ceil(dailyData.length / 15);
    return (_: unknown, i: number) => i % step === 0;
  }, [dailyData]);

  const aiXTickInterval = useMemo(() => {
    if (aiScoredDailyData.length <= 15) return undefined;
    const step = Math.ceil(aiScoredDailyData.length / 15);
    return (_: unknown, i: number) => i % step === 0;
  }, [aiScoredDailyData]);

  const aiTotals = useMemo(() => {
    let autoRejected = 0;
    let passed = 0;
    aiScoredDailyData.forEach((d) => {
      autoRejected += d.autoRejected;
      passed += d.passed;
    });
    const total = autoRejected + passed;
    const rejectRate = total > 0 ? Math.round((autoRejected / total) * 100) : 0;
    return { autoRejected, passed, total, rejectRate };
  }, [aiScoredDailyData]);

  if (dailyData.length === 0) {
    return (
      <Box sx={{ px: 4, py: 8, textAlign: 'center', flex: 1, overflow: 'auto', minHeight: 0 }}>
        <Typography variant="body1" sx={{ color: '#64748b' }}>
          No applicant data available for analytics.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 4, py: 3, flex: 1, overflow: 'auto', minHeight: 0 }}>
      <Card sx={{ ...glassCardSx, mb: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              mb: 1,
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Applicants Added Per Day
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
            Number of new applicants added each day
          </Typography>

          <Box sx={{ height: 400 }}>
            <BarChart
              dataset={dailyData}
              xAxis={[
                {
                  dataKey: 'date',
                  scaleType: 'band',
                  tickLabelInterval: xTickInterval,
                },
              ]}
              yAxis={[{ label: 'Applicants' }]}
              series={[
                {
                  dataKey: 'inbound',
                  label: 'Inbound',
                  color: '#667eea',
                  stack: 'applicants',
                },
                {
                  dataKey: 'recruiter',
                  label: 'Recruiter',
                  color: '#a78bfa',
                  stack: 'applicants',
                },
              ]}
              margin={{ left: 70, right: 20, top: 20, bottom: 60 }}
              grid={{ vertical: true, horizontal: true }}
            />
          </Box>
        </CardContent>
      </Card>

      <Card sx={glassCardSx}>
        <CardContent sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1, gap: 2 }}>
            <Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  mb: 1,
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                AI Scoring Outcome Per Day
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Of applicants that went through AI scoring, how many were auto-rejected vs. passed to review
              </Typography>
            </Box>
            {aiTotals.total > 0 && (
              <Box sx={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                <Box sx={{ textAlign: 'center', px: 2 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Auto-Rejected
                  </Typography>
                  <Typography sx={{ fontSize: '24px', fontWeight: 800, color: '#ef4444', lineHeight: 1.2 }}>
                    {aiTotals.autoRejected}
                  </Typography>
                  <Typography sx={{ fontSize: '11px', color: '#64748b' }}>
                    {aiTotals.rejectRate}% of scored
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'center', px: 2 }}>
                  <Typography sx={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Passed
                  </Typography>
                  <Typography sx={{ fontSize: '24px', fontWeight: 800, color: '#10b981', lineHeight: 1.2 }}>
                    {aiTotals.passed}
                  </Typography>
                  <Typography sx={{ fontSize: '11px', color: '#64748b' }}>
                    {100 - aiTotals.rejectRate}% of scored
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>

          <Box sx={{ height: 400, mt: 3 }}>
            {aiScoredDailyData.length === 0 ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                  No AI-scored applicants yet.
                </Typography>
              </Box>
            ) : (
              <BarChart
                dataset={aiScoredDailyData}
                xAxis={[
                  {
                    dataKey: 'date',
                    scaleType: 'band',
                    tickLabelInterval: aiXTickInterval,
                  },
                ]}
                yAxis={[{ label: 'Scored Applicants' }]}
                series={[
                  {
                    dataKey: 'passed',
                    label: 'Passed to Review',
                    color: '#10b981',
                    stack: 'aiOutcome',
                  },
                  {
                    dataKey: 'autoRejected',
                    label: 'Auto-Rejected',
                    color: '#ef4444',
                    stack: 'aiOutcome',
                  },
                ]}
                margin={{ left: 70, right: 20, top: 20, bottom: 60 }}
                grid={{ vertical: true, horizontal: true }}
              />
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default HiringAnalytics;
