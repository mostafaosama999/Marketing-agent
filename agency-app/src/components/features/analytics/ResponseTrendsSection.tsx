// src/components/features/analytics/ResponseTrendsSection.tsx
// Response trends charts embedded in the Leads Analytics tab (Outreach Activity section).
// Follows the day-range selected in the Outreach Activity header; granularity is local.
import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { Lead } from '../../../types/lead';
import {
  getLinkedInDate,
  getEmailDate,
  hasLinkedInResponse,
  hasEmailResponse,
} from '../../../utils/outreachHelpers';

type Granularity = 'daily' | 'weekly' | 'monthly';

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// --- Bucketing helpers ---

const getDayKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// Monday of the ISO week containing the date
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const dayOffset = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dayOffset);
  return d;
};

const getWeekKey = (date: Date): string => {
  return getDayKey(getWeekStart(date));
};

const getBucketKey = (date: Date, granularity: Granularity): string => {
  if (granularity === 'monthly') return getMonthKey(date);
  if (granularity === 'weekly') return getWeekKey(date);
  return getDayKey(date);
};

const formatBucketLabel = (key: string, granularity: Granularity): string => {
  if (granularity === 'monthly') {
    const [year, month] = key.split('-');
    return `${MONTH_NAMES[parseInt(month, 10) - 1]} ${year}`;
  }
  // daily / weekly keys are YYYY-MM-DD
  const [year, month, day] = key.split('-');
  const label = `${MONTH_NAMES[parseInt(month, 10) - 1]} ${parseInt(day, 10)}`;
  return granularity === 'weekly' ? `Wk of ${label}` : `${label} '${year.slice(2)}`;
};

// Generate every bucket key between two dates (inclusive) so the chart has no gaps
const generateBucketKeys = (start: Date, end: Date, granularity: Granularity): string[] => {
  const keys: string[] = [];
  if (granularity === 'monthly') {
    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const last = new Date(end.getFullYear(), end.getMonth(), 1);
    while (cursor <= last) {
      keys.push(getMonthKey(cursor));
      cursor.setMonth(cursor.getMonth() + 1);
    }
  } else {
    const step = granularity === 'weekly' ? 7 : 1;
    const cursor = granularity === 'weekly' ? getWeekStart(start) : new Date(start);
    cursor.setHours(0, 0, 0, 0);
    const last = new Date(end);
    last.setHours(0, 0, 0, 0);
    while (cursor <= last) {
      keys.push(getDayKey(cursor));
      cursor.setDate(cursor.getDate() + step);
    }
  }
  return keys;
};

interface ResponseTrendsSectionProps {
  leads: Lead[];
  dayRange: number | 'all';
}

export const ResponseTrendsSection: React.FC<ResponseTrendsSectionProps> = ({ leads, dayRange }) => {
  const [granularity, setGranularity] = useState<Granularity>('daily');

  // Responses bucketed over time. A response is attributed to the date the
  // outreach was SENT (same convention as the Monthly Outreach Summary table) —
  // leads have no separate response timestamp.
  const responseData = useMemo(() => {
    const cutoffDate = dayRange === 'all'
      ? new Date('2000-01-01')
      : (() => {
          const date = new Date();
          date.setDate(date.getDate() - dayRange);
          date.setHours(0, 0, 0, 0);
          return date;
        })();

    const linkedInByBucket: { [key: string]: number } = {};
    const emailByBucket: { [key: string]: number } = {};
    const linkedInSentByBucket: { [key: string]: number } = {};
    const emailSentByBucket: { [key: string]: number } = {};

    let earliestDate: Date | null = null;

    leads.forEach(lead => {
      const linkedInDate = getLinkedInDate(lead);
      if (linkedInDate && !isNaN(linkedInDate.getTime()) && linkedInDate >= cutoffDate) {
        const key = getBucketKey(linkedInDate, granularity);
        linkedInSentByBucket[key] = (linkedInSentByBucket[key] || 0) + 1;
        if (hasLinkedInResponse(lead)) {
          linkedInByBucket[key] = (linkedInByBucket[key] || 0) + 1;
        }
        if (!earliestDate || linkedInDate < earliestDate) earliestDate = linkedInDate;
      }

      const emailDate = getEmailDate(lead);
      if (emailDate && !isNaN(emailDate.getTime()) && emailDate >= cutoffDate) {
        const key = getBucketKey(emailDate, granularity);
        emailSentByBucket[key] = (emailSentByBucket[key] || 0) + 1;
        if (hasEmailResponse(lead)) {
          emailByBucket[key] = (emailByBucket[key] || 0) + 1;
        }
        if (!earliestDate || emailDate < earliestDate) earliestDate = emailDate;
      }
    });

    const today = new Date();
    const rangeStart = dayRange === 'all' ? earliestDate : cutoffDate;

    if (!rangeStart) return [];

    return generateBucketKeys(rangeStart, today, granularity).map(key => {
      const linkedInSent = linkedInSentByBucket[key] || 0;
      const emailSent = emailSentByBucket[key] || 0;
      const linkedInResponses = linkedInByBucket[key] || 0;
      const emailResponses = emailByBucket[key] || 0;
      return {
        label: formatBucketLabel(key, granularity),
        linkedInResponses,
        emailResponses,
        totalResponses: linkedInResponses + emailResponses,
        linkedInRate: linkedInSent > 0 ? +((linkedInResponses / linkedInSent) * 100).toFixed(1) : 0,
        emailRate: emailSent > 0 ? +((emailResponses / emailSent) * 100).toFixed(1) : 0,
      };
    });
  }, [leads, granularity, dayRange]);

  const rangeLabel = dayRange === 'all' ? 'all time' : `last ${dayRange} days`;

  return (
    <Card sx={{
      background: 'rgba(255, 255, 255, 0.9)',
      borderRadius: 3,
      backdropFilter: 'blur(20px)',
      border: '1px solid rgba(226, 232, 240, 0.5)',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
      mb: 4,
    }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" sx={{
              fontWeight: 700,
              mb: 1,
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}>
              Responses Over Time
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              LinkedIn and email responses ({rangeLabel}), attributed to the date the outreach was sent
            </Typography>
          </Box>

          {/* Granularity Selector */}
          <ToggleButtonGroup
            value={granularity}
            exclusive
            onChange={(e, newGranularity) => newGranularity && setGranularity(newGranularity)}
            aria-label="granularity"
            size="small"
            sx={{
              backgroundColor: '#f8fafc',
              borderRadius: 2,
              '& .MuiToggleButton-root': {
                border: 'none',
                borderRadius: 2,
                px: 2,
                py: 0.75,
                fontSize: '13px',
                fontWeight: 600,
                textTransform: 'none',
                color: '#64748b',
                '&.Mui-selected': {
                  backgroundColor: '#667eea',
                  color: 'white',
                  '&:hover': {
                    backgroundColor: '#5a67d8',
                  }
                },
                '&:hover': {
                  backgroundColor: '#f1f5f9',
                }
              }
            }}
          >
            <ToggleButton value="daily">Daily</ToggleButton>
            <ToggleButton value="weekly">Weekly</ToggleButton>
            <ToggleButton value="monthly">Monthly</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {responseData.length > 0 ? (
          <>
            <Box sx={{ height: 360, mt: 2 }}>
              <LineChart
                dataset={responseData}
                xAxis={[{ dataKey: 'label', scaleType: 'point' }]}
                yAxis={[{ label: 'Responses', tickMinStep: 1 }]}
                series={[
                  {
                    dataKey: 'linkedInResponses',
                    label: 'LinkedIn Responses',
                    color: '#0077b5',
                    curve: 'monotoneX',
                  },
                  {
                    dataKey: 'emailResponses',
                    label: 'Email Responses',
                    color: '#ea4335',
                    curve: 'monotoneX',
                  },
                  {
                    dataKey: 'totalResponses',
                    label: 'Total Responses',
                    color: '#667eea',
                    curve: 'monotoneX',
                  },
                ]}
                margin={{ left: 60, right: 20, top: 20, bottom: 60 }}
                grid={{ vertical: true, horizontal: true }}
              />
            </Box>

            <Typography variant="h5" sx={{
              fontWeight: 700,
              mt: 4,
              mb: 1,
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}>
              Response Rate Over Time
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              Responses as a percentage of outreach sent in each period
            </Typography>

            <Box sx={{ height: 360 }}>
              <LineChart
                dataset={responseData}
                xAxis={[{ dataKey: 'label', scaleType: 'point' }]}
                yAxis={[{ label: 'Response Rate (%)' }]}
                series={[
                  {
                    dataKey: 'linkedInRate',
                    label: 'LinkedIn Response %',
                    color: '#0077b5',
                    curve: 'monotoneX',
                  },
                  {
                    dataKey: 'emailRate',
                    label: 'Email Response %',
                    color: '#ea4335',
                    curve: 'monotoneX',
                  },
                ]}
                margin={{ left: 60, right: 20, top: 20, bottom: 60 }}
                grid={{ vertical: true, horizontal: true }}
              />
            </Box>
          </>
        ) : (
          <Box sx={{ py: 6, textAlign: 'center' }}>
            <Typography variant="body2" sx={{ color: '#94a3b8' }}>
              No response data in the selected range
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ResponseTrendsSection;
