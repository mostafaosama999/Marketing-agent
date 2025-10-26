// src/pages/analytics/LeadAnalytics.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  ThemeProvider,
  createTheme,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import {
  TrendingUp as TrendingUpIcon,
  CalendarToday,
  DateRange,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { subscribeToLeads } from '../../services/api/leads';
import { Lead, LeadStatus } from '../../types/lead';
import { useAuth } from '../../contexts/AuthContext';

// Modern theme
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

// Status labels
const STATUS_LABELS: Record<LeadStatus, string> = {
  new_lead: 'New Lead',
  qualified: 'Qualified',
  contacted: 'Contacted',
  follow_up: 'Follow Up',
  won: 'Won',
  lost: 'Lost',
};

// Status colors
const STATUS_COLORS: Record<LeadStatus, string> = {
  new_lead: '#9e9e9e',
  qualified: '#ff9800',
  contacted: '#2196f3',
  follow_up: '#9c27b0',
  won: '#4caf50',
  lost: '#607d8b',
};

const LeadAnalytics: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'daily' | 'weekly'>('weekly');

  // Subscribe to leads
  useEffect(() => {
    const unsubscribe = subscribeToLeads((leadsData) => {
      setLeads(leadsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Helper: Get ISO week string
  const getISOWeek = (date: Date): string => {
    const target = new Date(date.valueOf());
    const dayNumber = (date.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNumber + 3);
    const firstThursdayOfYear = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    const week = 1 + Math.ceil((firstThursdayOfYear - target.valueOf()) / 604800000);
    return `${target.getFullYear()}-W${week.toString().padStart(2, '0')}`;
  };

  // Helper: Get readable week label
  const getReadableWeekLabel = (isoWeek: string): string => {
    const [year, weekNum] = isoWeek.split('-W');
    const jan4 = new Date(parseInt(year), 0, 4);
    const monday = new Date(jan4);
    const dayOffset = (parseInt(weekNum) - 1) * 7;
    const weekDay = (jan4.getDay() + 6) % 7;
    monday.setDate(jan4.getDate() - weekDay + dayOffset);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[monday.getMonth()];
    const day = monday.getDate();
    return `${month} ${day}`;
  };

  // Helper: Get date string for daily grouping
  const getDateString = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  // Helper: Format date for display
  const formatDateLabel = (dateStr: string): string => {
    const date = new Date(dateStr);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[date.getMonth()];
    const day = date.getDate();
    return `${month} ${day}`;
  };

  // Calculate summary metrics
  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const wonLeads = leads.filter(l => l.status === 'won').length;
    const activeLeads = leads.filter(l => !['won', 'lost'].includes(l.status)).length;
    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0';

    return {
      totalLeads,
      wonLeads,
      activeLeads,
      conversionRate,
    };
  }, [leads]);

  // Lead distribution by status (for funnel chart)
  const statusDistribution = useMemo(() => {
    const statusOrder: LeadStatus[] = ['new_lead', 'qualified', 'contacted', 'follow_up', 'won', 'lost'];
    const counts = statusOrder.map(status => {
      const count = leads.filter(l => l.status === status).length;
      return {
        status: STATUS_LABELS[status],
        count,
        color: STATUS_COLORS[status],
      };
    });

    return counts.filter(item => item.count > 0);
  }, [leads]);

  // Lead activity over time (new leads added)
  const leadActivityData = useMemo(() => {
    if (viewMode === 'daily') {
      // Group by day
      const dailyData: { [date: string]: number } = {};

      leads.forEach(lead => {
        const dateStr = getDateString(lead.createdAt);
        dailyData[dateStr] = (dailyData[dateStr] || 0) + 1;
      });

      // Get last 30 days
      const dates: string[] = [];
      const today = new Date();
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(getDateString(date));
      }

      return dates.map(date => ({
        label: formatDateLabel(date),
        count: dailyData[date] || 0,
      }));
    } else {
      // Group by week
      const weeklyData: { [week: string]: number } = {};

      leads.forEach(lead => {
        const week = getISOWeek(lead.createdAt);
        weeklyData[week] = (weeklyData[week] || 0) + 1;
      });

      const weeks = Object.keys(weeklyData).sort().slice(-12);

      return weeks.map(week => ({
        label: getReadableWeekLabel(week),
        count: weeklyData[week] || 0,
      }));
    }
  }, [leads, viewMode]);

  // Conversion funnel (leads moving through stages) - Commented out as it's not currently used
  // const conversionFunnelData = useMemo(() => {
  //   const stages = [
  //     { stage: 'New', count: leads.filter(l => l.status === 'new_lead').length },
  //     { stage: 'Qualified', count: leads.filter(l => l.status === 'qualified').length },
  //     { stage: 'Contacted', count: leads.filter(l => l.status === 'contacted').length },
  //     { stage: 'Won', count: leads.filter(l => l.status === 'won').length },
  //   ];
  //
  //   return stages.filter(s => s.count > 0);
  // }, [leads]);

  return (
    <ThemeProvider theme={modernTheme}>
      <Box sx={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        minHeight: '100vh',
        p: 4
      }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <TrendingUpIcon sx={{ fontSize: 40, color: '#667eea' }} />
              <Box>
                <Typography variant="h4" sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}>
                  Lead Analytics
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  Track lead pipeline performance and conversion metrics
                </Typography>
              </Box>
            </Box>

            {/* View Mode Toggle */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(e, newMode) => newMode && setViewMode(newMode)}
              aria-label="view mode"
              sx={{
                backgroundColor: 'white',
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                '& .MuiToggleButton-root': {
                  border: 'none',
                  borderRadius: 2,
                  px: 3,
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
              <ToggleButton value="weekly">
                <DateRange sx={{ mr: 1, fontSize: 20 }} />
                Weekly
              </ToggleButton>
              <ToggleButton value="daily">
                <CalendarToday sx={{ mr: 1, fontSize: 20 }} />
                Daily
              </ToggleButton>
            </ToggleButtonGroup>
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
              Loading lead data...
            </Typography>
          </Box>
        ) : (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <PeopleIcon sx={{ fontSize: 40, color: 'white', opacity: 0.9 }} />
                      <Box>
                        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                          {metrics.totalLeads}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          Total Leads
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
                          {metrics.wonLeads}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          Won Leads
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{
                  background: 'linear-gradient(135deg, #2196f3 0%, #1976d2 100%)',
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(33, 150, 243, 0.3)',
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <ScheduleIcon sx={{ fontSize: 40, color: 'white', opacity: 0.9 }} />
                      <Box>
                        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                          {metrics.activeLeads}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          Active Leads
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card sx={{
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(255, 152, 0, 0.3)',
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <TrendingUpIcon sx={{ fontSize: 40, color: 'white', opacity: 0.9 }} />
                      <Box>
                        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                          {metrics.conversionRate}%
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          Conversion Rate
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Lead Status Distribution */}
            {statusDistribution.length > 0 && (
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
                    Lead Distribution by Status
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
                    Current pipeline breakdown across all stages
                  </Typography>

                  <Box sx={{ height: 400 }}>
                    <BarChart
                      dataset={statusDistribution}
                      xAxis={[{ dataKey: 'status', scaleType: 'band' }]}
                      yAxis={[{ label: 'Number of Leads' }]}
                      series={[
                        {
                          dataKey: 'count',
                          label: 'Leads',
                          color: '#667eea',
                        },
                      ]}
                      margin={{ left: 60, right: 20, top: 20, bottom: 60 }}
                      grid={{ vertical: true, horizontal: true }}
                    />
                  </Box>
                </CardContent>
              </Card>
            )}

            {/* Lead Activity Over Time */}
            {leadActivityData.length > 0 && (
              <Card sx={{
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 3,
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(226, 232, 240, 0.5)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
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
                    {viewMode === 'daily' ? 'Daily' : 'Weekly'} New Leads Added
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
                    {viewMode === 'daily' ? 'Last 30 days' : 'Last 12 weeks'} of lead acquisition activity
                  </Typography>

                  <Box sx={{ height: 400 }}>
                    <LineChart
                      dataset={leadActivityData}
                      xAxis={[{ dataKey: 'label', scaleType: 'point' }]}
                      yAxis={[{ label: 'New Leads' }]}
                      series={[
                        {
                          dataKey: 'count',
                          label: 'New Leads',
                          color: '#667eea',
                          curve: 'linear',
                        },
                      ]}
                      margin={{ left: 60, right: 20, top: 20, bottom: 60 }}
                      grid={{ vertical: true, horizontal: true }}
                    />
                  </Box>
                </CardContent>
              </Card>
            )}

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
                  Start adding leads to see analytics and insights
                </Typography>
              </Card>
            )}
          </>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default LeadAnalytics;
