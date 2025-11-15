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
  Grid,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import {
  TrendingUp as TrendingUpIcon,
  People as PeopleIcon,
  CheckCircle as CheckCircleIcon,
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
  Send as SendIcon,
} from '@mui/icons-material';
import { subscribeToLeads } from '../../services/api/leads';
import { Lead, LeadStatus } from '../../types/lead';

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
  nurture: 'Nurture',
  won: 'Won',
  lost: 'Refused',
};

// Status colors
const STATUS_COLORS: Record<LeadStatus, string> = {
  new_lead: '#9e9e9e',
  qualified: '#ff9800',
  contacted: '#2196f3',
  follow_up: '#9c27b0',
  nurture: '#00bcd4',
  won: '#4caf50',
  lost: '#f44336',
};

const LeadAnalytics: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode] = useState<'daily' | 'weekly'>('weekly'); // Fixed to weekly view
  const [outreachDayRange, setOutreachDayRange] = useState<7 | 14 | 30 | 'all'>(30);

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

  // Helper: Get LinkedIn date from custom fields or outreach object
  const getLinkedInDate = (lead: Lead): Date | null => {
    // Check custom fields first (linkedin_date_of_linkedin_contact)
    if (lead.customFields?.linkedin_date_of_linkedin_contact) {
      try {
        return new Date(lead.customFields.linkedin_date_of_linkedin_contact);
      } catch (e) {
        console.warn('Invalid LinkedIn date in custom fields:', lead.customFields.linkedin_date_of_linkedin_contact);
      }
    }

    // Fall back to outreach.linkedIn.sentAt
    if (lead.outreach?.linkedIn?.sentAt) {
      return lead.outreach.linkedIn.sentAt instanceof Date
        ? lead.outreach.linkedIn.sentAt
        : new Date(lead.outreach.linkedIn.sentAt);
    }

    return null;
  };

  // Helper: Get email date from custom fields or outreach object
  const getEmailDate = (lead: Lead): Date | null => {
    // Check custom fields for email date fields
    if (lead.customFields?.email_date_sending_email) {
      try {
        return new Date(lead.customFields.email_date_sending_email);
      } catch (e) {
        console.warn('Invalid email date in custom fields:', lead.customFields.email_date_sending_email);
      }
    }

    // Fall back to outreach.email.sentAt
    if (lead.outreach?.email?.sentAt) {
      return lead.outreach.email.sentAt instanceof Date
        ? lead.outreach.email.sentAt
        : new Date(lead.outreach.email.sentAt);
    }

    return null;
  };

  // Helper: Check if lead has LinkedIn response
  const hasLinkedInResponse = (lead: Lead): boolean => {
    if (lead.customFields?.linkedin_lead_response) {
      const response = lead.customFields.linkedin_lead_response;

      // Explicitly exclude "No Response" and "Not Interested"
      if (
        response === 'No Response' ||
        response === 'Not Interested' ||
        response === '-' ||
        !response ||
        response.trim() === ''
      ) {
        return false;
      }

      // New dropdown values (exact match) - positive responses only
      if (
        response === 'Interested' ||
        response === 'Meeting Scheduled' ||
        response === 'Referred Us'
      ) {
        return true;
      }

      // Legacy text values
      const lowerResponse = response.toLowerCase();
      if (lowerResponse.includes('not interested') || lowerResponse.includes('no response')) {
        return false;
      }
      return lowerResponse.includes('replied') ||
             lowerResponse.includes('responded') ||
             lowerResponse.includes('accepted') ||
             lowerResponse.includes('agreed');
    }

    return lead.outreach?.linkedIn?.status === 'replied';
  };

  // Helper: Check if lead has email response
  const hasEmailResponse = (lead: Lead): boolean => {
    // Check custom fields for email response
    const response = lead.customFields?.email_lead_response || lead.customFields?.email_email_lead_response;

    if (response) {
      // Explicitly exclude "No Response" and "Not Interested"
      if (
        response === 'No Response' ||
        response === 'Not Interested' ||
        response === '-' ||
        !response ||
        response.trim() === ''
      ) {
        return false;
      }

      // New dropdown values (exact match) - positive responses only
      if (
        response === 'Interested' ||
        response === 'Meeting Scheduled' ||
        response === 'Referred Us'
      ) {
        return true;
      }

      // Legacy text values
      const lowerResponse = response.toLowerCase();
      if (lowerResponse.includes('not interested') || lowerResponse.includes('no response')) {
        return false;
      }
      return lowerResponse.includes('replied') ||
             lowerResponse.includes('responded') ||
             lowerResponse.includes('accepted') ||
             lowerResponse.includes('agreed');
    }

    return lead.outreach?.email?.status === 'replied';
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

  // Outreach metrics
  const outreachMetrics = useMemo(() => {
    // For 'all time', use a date far in the past (effectively no cutoff)
    const cutoffDate = outreachDayRange === 'all'
      ? new Date('2000-01-01')
      : (() => {
          const date = new Date();
          date.setDate(date.getDate() - outreachDayRange);
          return date;
        })();

    const linkedInOutreach = leads.filter(lead => {
      const linkedInDate = getLinkedInDate(lead);
      return linkedInDate !== null && linkedInDate >= cutoffDate;
    });

    const emailOutreach = leads.filter(lead => {
      const emailDate = getEmailDate(lead);
      return emailDate !== null && emailDate >= cutoffDate;
    });

    // Calculate total unique leads reached out to (not sum, to avoid double-counting)
    const uniqueLeadsReachedOut = new Set([
      ...linkedInOutreach.map(l => l.id),
      ...emailOutreach.map(l => l.id)
    ]);
    const totalOutreach = uniqueLeadsReachedOut.size;

    // Calculate response rates
    const linkedInReplies = linkedInOutreach.filter(hasLinkedInResponse).length;
    const emailReplies = emailOutreach.filter(hasEmailResponse).length;

    const linkedInResponseRate = linkedInOutreach.length > 0
      ? ((linkedInReplies / linkedInOutreach.length) * 100).toFixed(1)
      : '0';
    const emailResponseRate = emailOutreach.length > 0
      ? ((emailReplies / emailOutreach.length) * 100).toFixed(1)
      : '0';

    return {
      linkedInCount: linkedInOutreach.length,
      emailCount: emailOutreach.length,
      totalCount: totalOutreach,
      linkedInResponseRate,
      emailResponseRate,
    };
  }, [leads, outreachDayRange]);

  // Outreach activity over time (daily)
  const outreachActivityData = useMemo(() => {
    const dailyLinkedIn: { [date: string]: number } = {};
    const dailyEmail: { [date: string]: number } = {};

    // For 'all time', use a date far in the past
    const cutoffDate = outreachDayRange === 'all'
      ? new Date('2000-01-01')
      : (() => {
          const date = new Date();
          date.setDate(date.getDate() - outreachDayRange);
          return date;
        })();

    // Track earliest date for 'all time' mode
    let earliestDate: Date | null = null;

    // Aggregate LinkedIn outreach by day
    leads.forEach(lead => {
      const linkedInDate = getLinkedInDate(lead);
      if (linkedInDate && linkedInDate >= cutoffDate) {
        const dateStr = getDateString(linkedInDate);
        dailyLinkedIn[dateStr] = (dailyLinkedIn[dateStr] || 0) + 1;

        // Track earliest date
        if (!earliestDate || linkedInDate < earliestDate) {
          earliestDate = linkedInDate;
        }
      }
    });

    // Aggregate email outreach by day
    leads.forEach(lead => {
      const emailDate = getEmailDate(lead);
      if (emailDate && emailDate >= cutoffDate) {
        const dateStr = getDateString(emailDate);
        dailyEmail[dateStr] = (dailyEmail[dateStr] || 0) + 1;

        // Track earliest date
        if (!earliestDate || emailDate < earliestDate) {
          earliestDate = emailDate;
        }
      }
    });

    // Generate array of dates for the selected range
    const dates: string[] = [];
    const today = new Date();

    if (outreachDayRange === 'all' && earliestDate) {
      // For 'all time', generate dates from earliest to today
      const currentDate = new Date(earliestDate);
      currentDate.setHours(0, 0, 0, 0);

      while (currentDate <= today) {
        dates.push(getDateString(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } else {
      // For specific day ranges, use the fixed range
      const dayRange = outreachDayRange === 'all' ? 30 : outreachDayRange;
      for (let i = dayRange - 1; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        dates.push(getDateString(date));
      }
    }

    return dates.map(date => ({
      label: formatDateLabel(date),
      linkedIn: dailyLinkedIn[date] || 0,
      email: dailyEmail[date] || 0,
    }));
  }, [leads, outreachDayRange]);

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

            {/* Outreach Activity Section */}
            <Box sx={{ mt: 6, mb: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <SendIcon sx={{ fontSize: 36, color: '#667eea' }} />
                  <Box>
                    <Typography variant="h5" sx={{
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                    }}>
                      Outreach Activity
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                      Track LinkedIn and email outreach performance
                    </Typography>
                  </Box>
                </Box>

                {/* Day Range Selector */}
                <ToggleButtonGroup
                  value={outreachDayRange}
                  exclusive
                  onChange={(e, newRange) => newRange && setOutreachDayRange(newRange)}
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
                  <ToggleButton value={7}>7 Days</ToggleButton>
                  <ToggleButton value={14}>14 Days</ToggleButton>
                  <ToggleButton value={30}>30 Days</ToggleButton>
                  <ToggleButton value="all">All Time</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>

            {/* Outreach Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
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
                          {outreachMetrics.linkedInCount}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          LinkedIn Outreach
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
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
                          {outreachMetrics.emailCount}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          Email Outreach
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <SendIcon sx={{ fontSize: 40, color: 'white', opacity: 0.9 }} />
                      <Box>
                        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                          {outreachMetrics.totalCount}
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          Total Outreach
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
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
                          {outreachMetrics.linkedInResponseRate}%
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          LinkedIn Response
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
                <Card sx={{
                  background: 'linear-gradient(135deg, #ff9800 0%, #f57c00 100%)',
                  borderRadius: 3,
                  boxShadow: '0 4px 20px rgba(255, 152, 0, 0.3)',
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <CheckCircleIcon sx={{ fontSize: 40, color: 'white', opacity: 0.9 }} />
                      <Box>
                        <Typography variant="h4" sx={{ color: 'white', fontWeight: 700 }}>
                          {outreachMetrics.emailResponseRate}%
                        </Typography>
                        <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)' }}>
                          Email Response
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Outreach Activity Over Time Chart */}
            {outreachActivityData.length > 0 && (
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
                    Daily Outreach Activity
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
                    LinkedIn and email outreach trends{outreachDayRange === 'all' ? ' (all time)' : ` over the last ${outreachDayRange} days`}
                  </Typography>

                  <Box sx={{ height: 400 }}>
                    <LineChart
                      dataset={outreachActivityData}
                      xAxis={[{ dataKey: 'label', scaleType: 'point' }]}
                      yAxis={[{ label: 'Outreach Count' }]}
                      series={[
                        {
                          dataKey: 'linkedIn',
                          label: 'LinkedIn',
                          color: '#0077b5',
                          curve: 'monotoneX',
                        },
                        {
                          dataKey: 'email',
                          label: 'Email',
                          color: '#ea4335',
                          curve: 'monotoneX',
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
