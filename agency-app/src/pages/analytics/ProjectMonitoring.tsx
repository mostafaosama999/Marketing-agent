// src/pages/analytics/ProjectMonitoring.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Paper,
  CircularProgress,
  Chip,
  ThemeProvider,
  createTheme,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  ContactMail as ContactMailIcon,
} from '@mui/icons-material';
import { subscribeToLeads } from '../../services/api/leads';
import { Lead, LeadStatus } from '../../types/lead';

// Modern theme matching CRM board
const modernTheme = createTheme({
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    h4: { fontWeight: 700, fontSize: '28px', lineHeight: 1.2 },
    h6: { fontWeight: 600, fontSize: '16px' },
    body1: { fontWeight: 500, fontSize: '14px' },
    body2: { fontWeight: 400, fontSize: '13px' },
  },
});

const STATUS_LABELS: Record<LeadStatus, string> = {
  new_lead: 'New Lead',
  qualified: 'Qualified',
  contacted: 'Contacted',
  follow_up: 'Follow Up',
  won: 'Won',
  lost: 'Lost',
};

const ProjectMonitoring: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Subscribe to leads
  useEffect(() => {
    const unsubscribe = subscribeToLeads((leadsData) => {
      setLeads(leadsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Calculate metrics
  const recentActivity = leads.filter(lead => {
    const updatedAt = lead.updatedAt ? new Date(lead.updatedAt) : null;
    if (!updatedAt) return false;
    const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate <= 7;
  }).length;

  const stuckLeads = leads.filter(lead => {
    const stateHistory = lead.stateHistory || {};
    const currentStatusTimestamp = stateHistory[lead.status];
    if (!currentStatusTimestamp) return false;

    const daysSinceChange = (Date.now() - new Date(currentStatusTimestamp).getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceChange >= 7;
  });

  const missingData = leads.filter(lead => !lead.email || !lead.phone);

  const companiesWithMultipleLeads = Object.entries(
    leads.reduce((acc, lead) => {
      if (lead.company) {
        acc[lead.company] = (acc[lead.company] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>)
  )
    .filter(([_, count]) => count > 1)
    .sort(([_, a], [__, b]) => b - a)
    .slice(0, 5);

  const stuckByStatus = stuckLeads.reduce((acc, lead) => {
    acc[lead.status] = (acc[lead.status] || 0) + 1;
    return acc;
  }, {} as Record<LeadStatus, number>);

  return (
    <ThemeProvider theme={modernTheme}>
      <Box sx={{ width: '100%', p: 3 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography
            variant="h4"
            gutterBottom
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            <DashboardIcon fontSize="large" sx={{ color: '#667eea' }} />
            CRM Health Monitor
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Quick insights into pipeline health and lead activity
          </Typography>
        </Box>

        {loading ? (
          <Box display="flex" justifyContent="center" my={8}>
            <CircularProgress sx={{ color: '#667eea' }} />
          </Box>
        ) : (
          <>
            {/* Summary Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* Total Leads */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Card sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                          Total Leads
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                          {leads.length}
                        </Typography>
                      </Box>
                      <TrendingUpIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Recent Activity */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Card sx={{
                  background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                  color: 'white',
                }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                          Active (7 days)
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                          {recentActivity}
                        </Typography>
                      </Box>
                      <CheckCircleIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Stuck Leads */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Card sx={{
                  background: 'linear-gradient(135deg, #ff9800 0%, #ffa726 100%)',
                  color: 'white',
                }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                          Stuck (7+ days)
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                          {stuckLeads.length}
                        </Typography>
                      </Box>
                      <ScheduleIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Missing Data */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Card sx={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
                  color: 'white',
                }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                          Missing Data
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                          {missingData.length}
                        </Typography>
                      </Box>
                      <WarningIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Detailed Sections */}
            <Grid container spacing={3}>
              {/* Stuck Leads by Status */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ScheduleIcon sx={{ color: '#ff9800' }} />
                    Leads Stuck by Stage
                  </Typography>
                  {Object.keys(stuckByStatus).length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <CheckCircleIcon sx={{ fontSize: 48, color: '#4caf50', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        No stuck leads! Pipeline is healthy.
                      </Typography>
                    </Box>
                  ) : (
                    <List>
                      {Object.entries(stuckByStatus).map(([status, count]) => (
                        <ListItem key={status} sx={{ px: 0 }}>
                          <ListItemText
                            primary={STATUS_LABELS[status as LeadStatus]}
                            secondary={`${count} lead${count > 1 ? 's' : ''} stuck for 7+ days`}
                          />
                          <Chip
                            label={count}
                            size="small"
                            sx={{
                              bgcolor: '#ff9800',
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Paper>
              </Grid>

              {/* Companies with Multiple Leads */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <BusinessIcon sx={{ color: '#667eea' }} />
                    Top Companies
                  </Typography>
                  {companiesWithMultipleLeads.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        No companies with multiple leads yet
                      </Typography>
                    </Box>
                  ) : (
                    <List>
                      {companiesWithMultipleLeads.map(([company, count]) => (
                        <ListItem key={company} sx={{ px: 0 }}>
                          <ListItemText
                            primary={company}
                            secondary={`${count} leads`}
                          />
                          <Chip
                            label={count}
                            size="small"
                            sx={{
                              bgcolor: '#667eea',
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  )}
                </Paper>
              </Grid>

              {/* Data Quality Issues */}
              {missingData.length > 0 && (
                <Grid size={{ xs: 12 }}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ContactMailIcon sx={{ color: '#ef4444' }} />
                      Leads Missing Contact Information
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {missingData.length} lead{missingData.length > 1 ? 's are' : ' is'} missing email or phone
                    </Typography>
                    <Grid container spacing={2}>
                      {missingData.slice(0, 6).map(lead => (
                        <Grid size={{ xs: 12, md: 4 }} key={lead.id}>
                          <Card variant="outlined">
                            <CardContent sx={{ py: 1.5 }}>
                              <Typography variant="body1" fontWeight={600}>
                                {lead.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {lead.company}
                              </Typography>
                              <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}>
                                {!lead.email && (
                                  <Chip label="No Email" size="small" color="error" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                                )}
                                {!lead.phone && (
                                  <Chip label="No Phone" size="small" color="error" variant="outlined" sx={{ fontSize: '0.7rem', height: 20 }} />
                                )}
                              </Box>
                            </CardContent>
                          </Card>
                        </Grid>
                      ))}
                    </Grid>
                    {missingData.length > 6 && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                        +{missingData.length - 6} more leads with missing data
                      </Typography>
                    )}
                  </Paper>
                </Grid>
              )}
            </Grid>
          </>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default ProjectMonitoring;
