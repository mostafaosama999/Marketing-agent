// src/pages/analytics/ResponseAnalytics.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  ThemeProvider,
  createTheme,
  Grid,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import {
  QueryStats as QueryStatsIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  Forum as ForumIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { subscribeToLeads } from '../../services/api/leads';
import { Lead } from '../../types/lead';
import {
  getLinkedInDate,
  getEmailDate,
  hasLinkedInResponse,
  hasEmailResponse,
} from '../../utils/outreachHelpers';

// Modern theme (matches LeadAnalytics)
const modernTheme = createTheme({
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: {
      fontWeight: 700,
      fontSize: '32px',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h5: {
      fontWeight: 600,
      fontSize: '20px',
      lineHeight: 1.3,
    },
    body2: {
      fontWeight: 400,
      fontSize: '13px',
    },
  },
});

type Granularity = 'daily' | 'weekly' | 'monthly';
type DayRange = number | 'all';

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

const ResponseAnalytics: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState<Granularity>('monthly');
  const [dayRange, setDayRange] = useState<DayRange>('all');

  // Subscribe to leads
  useEffect(() => {
    const unsubscribe = subscribeToLeads((leadsData) => {
      setLeads(leadsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

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
    let linkedInTotal = 0;
    let emailTotal = 0;
    let linkedInSentTotal = 0;
    let emailSentTotal = 0;

    leads.forEach(lead => {
      const linkedInDate = getLinkedInDate(lead);
      if (linkedInDate && !isNaN(linkedInDate.getTime()) && linkedInDate >= cutoffDate) {
        const key = getBucketKey(linkedInDate, granularity);
        linkedInSentByBucket[key] = (linkedInSentByBucket[key] || 0) + 1;
        linkedInSentTotal++;
        if (hasLinkedInResponse(lead)) {
          linkedInByBucket[key] = (linkedInByBucket[key] || 0) + 1;
          linkedInTotal++;
        }
        if (!earliestDate || linkedInDate < earliestDate) earliestDate = linkedInDate;
      }

      const emailDate = getEmailDate(lead);
      if (emailDate && !isNaN(emailDate.getTime()) && emailDate >= cutoffDate) {
        const key = getBucketKey(emailDate, granularity);
        emailSentByBucket[key] = (emailSentByBucket[key] || 0) + 1;
        emailSentTotal++;
        if (hasEmailResponse(lead)) {
          emailByBucket[key] = (emailByBucket[key] || 0) + 1;
          emailTotal++;
        }
        if (!earliestDate || emailDate < earliestDate) earliestDate = emailDate;
      }
    });

    const today = new Date();
    const rangeStart = dayRange === 'all' ? earliestDate : cutoffDate;

    const dataset = rangeStart
      ? generateBucketKeys(rangeStart, today, granularity).map(key => {
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
        })
      : [];

    return {
      dataset,
      linkedInTotal,
      emailTotal,
      linkedInRate: linkedInSentTotal > 0 ? ((linkedInTotal / linkedInSentTotal) * 100).toFixed(1) : '0',
      emailRate: emailSentTotal > 0 ? ((emailTotal / emailSentTotal) * 100).toFixed(1) : '0',
    };
  }, [leads, granularity, dayRange]);

  const rangeLabel = dayRange === 'all' ? 'all time' : `last ${dayRange} days`;

  return (
    <ThemeProvider theme={modernTheme}>
      <Box sx={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        minHeight: '100vh',
        p: 4
      }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <QueryStatsIcon sx={{ fontSize: 40, color: '#667eea' }} />
              <Box>
                <Typography variant="h4" sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}>
                  Response Trends
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  LinkedIn and email responses over time (attributed to the date the outreach was sent)
                </Typography>
              </Box>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
              {/* Granularity Selector */}
              <ToggleButtonGroup
                value={granularity}
                exclusive
                onChange={(e, newGranularity) => newGranularity && setGranularity(newGranularity)}
                aria-label="granularity"
                sx={{
                  backgroundColor: 'white',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  '& .MuiToggleButton-root': {
                    border: 'none',
                    borderRadius: 2,
                    px: 2.5,
                    py: 1,
                    fontSize: '14px',
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

              {/* Day Range Selector */}
              <ToggleButtonGroup
                value={dayRange}
                exclusive
                onChange={(e, newRange) => newRange !== null && setDayRange(newRange)}
                aria-label="day range"
                sx={{
                  backgroundColor: 'white',
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                  '& .MuiToggleButton-root': {
                    border: 'none',
                    borderRadius: 2,
                    px: 2.5,
                    py: 1,
                    fontSize: '14px',
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
                <ToggleButton value={30}>30 Days</ToggleButton>
                <ToggleButton value={90}>90 Days</ToggleButton>
                <ToggleButton value={180}>6 Months</ToggleButton>
                <ToggleButton value={365}>1 Year</ToggleButton>
                <ToggleButton value="all">All Time</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </Box>

        {loading ? (
          <Box sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px',
            flexDirection: 'column',
            gap: 2
          }}>
            <CircularProgress size={40} sx={{ color: '#667eea' }} />
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Loading response data...
            </Typography>
          </Box>
        ) : (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{
                  background: 'linear-gradient(135deg, #0077b5 0%, #005885 100%)',
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(0, 119, 181, 0.3)',
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <LinkedInIcon sx={{ fontSize: 40, color: 'white', opacity: 0.9 }} />
                      <Box>
                        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                          {responseData.linkedInTotal}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          LinkedIn Responses
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{
                  background: 'linear-gradient(135deg, #ea4335 0%, #c5221f 100%)',
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(234, 67, 53, 0.3)',
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <EmailIcon sx={{ fontSize: 40, color: 'white', opacity: 0.9 }} />
                      <Box>
                        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                          {responseData.emailTotal}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          Email Responses
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <ForumIcon sx={{ fontSize: 40, color: 'white', opacity: 0.9 }} />
                      <Box>
                        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                          {responseData.linkedInTotal + responseData.emailTotal}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          Total Responses
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{
                  background: 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)',
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(76, 175, 80, 0.3)',
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckCircleIcon sx={{ fontSize: 40, color: 'white', opacity: 0.9 }} />
                      <Box>
                        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                          {responseData.linkedInRate}% / {responseData.emailRate}%
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          LinkedIn / Email Response Rate
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Responses Over Time Chart */}
            <Card sx={{
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: 3,
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(226, 232, 240, 0.5)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              mb: 4,
            }}>
              <CardContent sx={{ p: 4 }}>
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
                <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
                  {granularity.charAt(0).toUpperCase() + granularity.slice(1)} LinkedIn and email response counts ({rangeLabel}), grouped by outreach sent date
                </Typography>

                {responseData.dataset.length > 0 ? (
                  <Box sx={{ height: 400 }}>
                    <LineChart
                      dataset={responseData.dataset}
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
                ) : (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      No response data in the selected range
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Response Rate Over Time Chart */}
            <Card sx={{
              background: 'rgba(255, 255, 255, 0.9)',
              borderRadius: 3,
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(226, 232, 240, 0.5)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
              mb: 4,
            }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{
                  fontWeight: 700,
                  mb: 1,
                  background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}>
                  Response Rate Over Time
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
                  Responses as a percentage of outreach sent in each period ({rangeLabel})
                </Typography>

                {responseData.dataset.length > 0 ? (
                  <Box sx={{ height: 400 }}>
                    <LineChart
                      dataset={responseData.dataset}
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
                ) : (
                  <Box sx={{ py: 6, textAlign: 'center' }}>
                    <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                      No response data in the selected range
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* Empty State */}
            {leads.length === 0 && (
              <Card sx={{
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 3,
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(226, 232, 240, 0.5)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                p: 6,
                textAlign: 'center',
              }}>
                <Typography variant="h5" sx={{ color: '#64748b', fontWeight: 600 }}>
                  No Lead Data Available
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mt: 2 }}>
                  Start adding leads to see response trends
                </Typography>
              </Card>
            )}
          </>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default ResponseAnalytics;
