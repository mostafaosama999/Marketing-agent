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

  const xTickInterval = useMemo(() => {
    if (dailyData.length <= 15) return undefined;
    const step = Math.ceil(dailyData.length / 15);
    return (_: unknown, i: number) => i % step === 0;
  }, [dailyData]);

  if (dailyData.length === 0) {
    return (
      <Box sx={{ px: 4, py: 8, textAlign: 'center' }}>
        <Typography variant="body1" sx={{ color: '#64748b' }}>
          No applicant data available for analytics.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ px: 4, py: 3 }}>
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
    </Box>
  );
};

export default HiringAnalytics;
