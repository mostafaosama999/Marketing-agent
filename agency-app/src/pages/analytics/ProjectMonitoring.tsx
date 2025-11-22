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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Business as BusinessIcon,
  Schedule as ScheduleIcon,
  ContactMail as ContactMailIcon,
  AttachMoney as MoneyIcon,
  Psychology as AIIcon,
  CloudQueue as APIIcon,
  Spa as NurtureIcon,
} from '@mui/icons-material';
import { subscribeToLeads } from '../../services/api/leads';
import { Lead, LeadStatus } from '../../types/lead';
import { useAuth } from '../../contexts/AuthContext';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase/firestore';
import { UserProfile } from '../../types/auth';

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
  nurture: 'Nurture',
  won: 'Won',
  lost: 'Refused',
  previous_client: 'Previous Client',
  existing_client: 'Existing Client',
};

const ProjectMonitoring: React.FC = () => {
  const { userProfile } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);

  // Subscribe to leads
  useEffect(() => {
    const unsubscribe = subscribeToLeads((leadsData) => {
      setLeads(leadsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to users for cost monitoring
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const usersData: UserProfile[] = snapshot.docs.map(doc => ({
        uid: doc.id,
        email: doc.data().email || '',
        role: doc.data().role || 'Writer',
        displayName: doc.data().displayName || '',
        apiUsage: doc.data().apiUsage,
      } as UserProfile));

      // Filter based on role: CEO sees all, others see only themselves
      const filteredUsers = userProfile?.role === 'CEO'
        ? usersData
        : usersData.filter(u => u.uid === userProfile?.uid);

      setUsers(filteredUsers);
      setUsersLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile]);

  // Calculate metrics
  const recentActivity = leads.filter(lead => {
    const updatedAt = lead.updatedAt ? new Date(lead.updatedAt) : null;
    if (!updatedAt) return false;
    const daysSinceUpdate = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate <= 7;
  }).length;

  const nurtureLeads = leads.filter(lead => lead.status === 'nurture');

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

  // Calculate cost metrics
  const totalAICost = users.reduce((sum, user) =>
    sum + (user.apiUsage?.ai?.totalCost || 0), 0
  );

  const totalApolloCredits = users.reduce((sum, user) =>
    sum + (user.apiUsage?.apollo?.totalCredits || 0), 0
  );

  const totalAPICalls = users.reduce((sum, user) =>
    sum + (user.apiUsage?.ai?.totalCalls || 0) + (user.apiUsage?.apollo?.totalCalls || 0), 0
  );

  const usersWithUsage = users.filter(u =>
    (u.apiUsage?.ai?.totalCost || 0) > 0 || (u.apiUsage?.apollo?.totalCredits || 0) > 0
  );

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

              {/* Nurture Leads */}
              <Grid size={{ xs: 12, md: 3 }}>
                <Card sx={{
                  background: 'linear-gradient(135deg, #00bcd4 0%, #00acc1 100%)',
                  color: 'white',
                }}>
                  <CardContent>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                          Nurture Leads
                        </Typography>
                        <Typography variant="h4" fontWeight={700}>
                          {nurtureLeads.length}
                        </Typography>
                      </Box>
                      <NurtureIcon sx={{ fontSize: 48, opacity: 0.3 }} />
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
              {/* Nurture Leads */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Paper sx={{ p: 3, height: '100%' }}>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <NurtureIcon sx={{ color: '#00bcd4' }} />
                    Leads in Nurture
                  </Typography>
                  {nurtureLeads.length === 0 ? (
                    <Box sx={{ py: 4, textAlign: 'center' }}>
                      <NurtureIcon sx={{ fontSize: 48, color: '#cbd5e1', mb: 1 }} />
                      <Typography variant="body2" color="text.secondary">
                        No leads in nurture stage
                      </Typography>
                    </Box>
                  ) : (
                    <TableContainer sx={{ maxHeight: 400 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Lead Name</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Company</TableCell>
                            <TableCell sx={{ fontWeight: 600, bgcolor: '#f8fafc' }}>Email</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {nurtureLeads.map((lead) => (
                            <TableRow key={lead.id} hover>
                              <TableCell>
                                <Typography variant="body2" fontWeight={600}>
                                  {lead.name}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {lead.company || '—'}
                                </Typography>
                              </TableCell>
                              <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                  {lead.email || '—'}
                                </Typography>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
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

              {/* API Cost Monitoring Section */}
              <Grid size={{ xs: 12 }} sx={{ mt: 4 }}>
                <Box sx={{ mb: 3 }}>
                  <Typography
                    variant="h5"
                    gutterBottom
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      fontWeight: 700,
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      backgroundClip: 'text',
                      WebkitBackgroundClip: 'text',
                      color: 'transparent',
                    }}
                  >
                    <MoneyIcon sx={{ color: '#667eea' }} />
                    API Cost Monitoring
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {userProfile?.role === 'CEO'
                      ? 'Organization-wide API usage and costs'
                      : 'Your personal API usage and costs'}
                  </Typography>
                </Box>

                {usersLoading ? (
                  <Box display="flex" justifyContent="center" my={4}>
                    <CircularProgress sx={{ color: '#667eea' }} />
                  </Box>
                ) : (
                  <>
                    {/* Cost Summary Cards */}
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                      {/* Total AI Cost */}
                      <Grid size={{ xs: 12, md: 3 }}>
                        <Card sx={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                        }}>
                          <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                              <Box>
                                <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                                  Total AI Cost
                                </Typography>
                                <Typography variant="h4" fontWeight={700}>
                                  ${totalAICost.toFixed(2)}
                                </Typography>
                              </Box>
                              <AIIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Total Apollo Credits */}
                      <Grid size={{ xs: 12, md: 3 }}>
                        <Card sx={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: 'white',
                        }}>
                          <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                              <Box>
                                <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                                  Total Apollo Credits
                                </Typography>
                                <Typography variant="h4" fontWeight={700}>
                                  {totalApolloCredits}
                                </Typography>
                              </Box>
                              <APIIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Total API Calls */}
                      <Grid size={{ xs: 12, md: 3 }}>
                        <Card sx={{
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: 'white',
                        }}>
                          <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                              <Box>
                                <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                                  Total API Calls
                                </Typography>
                                <Typography variant="h4" fontWeight={700}>
                                  {totalAPICalls.toLocaleString()}
                                </Typography>
                              </Box>
                              <TrendingUpIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>

                      {/* Active Users */}
                      <Grid size={{ xs: 12, md: 3 }}>
                        <Card sx={{
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          color: 'white',
                        }}>
                          <CardContent>
                            <Box display="flex" alignItems="center" justifyContent="space-between">
                              <Box>
                                <Typography color="rgba(255,255,255,0.8)" gutterBottom variant="body2">
                                  Active Users
                                </Typography>
                                <Typography variant="h4" fontWeight={700}>
                                  {usersWithUsage.length}
                                </Typography>
                              </Box>
                              <CheckCircleIcon sx={{ fontSize: 48, opacity: 0.3 }} />
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>

                    {/* User Cost Breakdown Table */}
                    {usersWithUsage.length > 0 ? (
                      <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                          Detailed Cost Breakdown by User
                        </Typography>
                        <TableContainer>
                          <Table>
                            <TableHead>
                              <TableRow sx={{ bgcolor: '#f8fafc' }}>
                                <TableCell sx={{ fontWeight: 600 }}>User</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">AI Cost</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">AI Tokens</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">Apollo Credits</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">Total Cost</TableCell>
                                <TableCell sx={{ fontWeight: 600 }} align="right">Total Calls</TableCell>
                              </TableRow>
                            </TableHead>
                            <TableBody>
                              {usersWithUsage.map((user) => {
                                const aiCost = user.apiUsage?.ai?.totalCost || 0;
                                const aiTokens = user.apiUsage?.ai?.totalTokens || 0;
                                const aiCalls = user.apiUsage?.ai?.totalCalls || 0;
                                const apolloCredits = user.apiUsage?.apollo?.totalCredits || 0;
                                const apolloCalls = user.apiUsage?.apollo?.totalCalls || 0;
                                const totalCost = aiCost; // Only AI costs in dollars
                                const totalCalls = aiCalls + apolloCalls;

                                return (
                                  <TableRow key={user.uid} hover>
                                    <TableCell>
                                      <Box>
                                        <Typography variant="body2" fontWeight={600}>
                                          {user.displayName || 'Unknown User'}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {user.email}
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Chip
                                        label={`$${aiCost.toFixed(4)}`}
                                        size="small"
                                        sx={{
                                          bgcolor: aiCost > 0 ? '#ede9fe' : '#f1f5f9',
                                          color: aiCost > 0 ? '#7c3aed' : '#64748b',
                                          fontWeight: 600,
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="body2" color="text.secondary">
                                        {aiTokens.toLocaleString()}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Chip
                                        label={`${apolloCredits} credit${apolloCredits !== 1 ? 's' : ''}`}
                                        size="small"
                                        sx={{
                                          bgcolor: apolloCredits > 0 ? '#d1fae5' : '#f1f5f9',
                                          color: apolloCredits > 0 ? '#059669' : '#64748b',
                                          fontWeight: 600,
                                        }}
                                      />
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="body1" fontWeight={700} color="primary">
                                        ${totalCost.toFixed(2)}
                                      </Typography>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Typography variant="body2">
                                        {totalCalls.toLocaleString()}
                                      </Typography>
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                              {/* Total Row */}
                              <TableRow sx={{ bgcolor: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                                <TableCell>
                                  <Typography variant="body1" fontWeight={700}>
                                    TOTAL
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body1" fontWeight={700} color="primary">
                                    ${totalAICost.toFixed(4)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body1" fontWeight={600}>
                                    {users.reduce((sum, u) => sum + (u.apiUsage?.ai?.totalTokens || 0), 0).toLocaleString()}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body1" fontWeight={600}>
                                    {totalApolloCredits} credit{totalApolloCredits !== 1 ? 's' : ''}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="h6" fontWeight={700} sx={{
                                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                    backgroundClip: 'text',
                                    WebkitBackgroundClip: 'text',
                                    color: 'transparent',
                                  }}>
                                    ${totalAICost.toFixed(2)}
                                  </Typography>
                                </TableCell>
                                <TableCell align="right">
                                  <Typography variant="body1" fontWeight={700}>
                                    {totalAPICalls.toLocaleString()}
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            </TableBody>
                          </Table>
                        </TableContainer>

                        {/* Breakdown Details */}
                        <Box sx={{ mt: 3 }}>
                          <Divider sx={{ mb: 2 }} />
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                            Cost Breakdown Categories:
                          </Typography>
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            <Chip
                              label="AI: Blog Analysis"
                              size="small"
                              variant="outlined"
                              sx={{ borderColor: '#7c3aed', color: '#7c3aed' }}
                            />
                            <Chip
                              label="AI: Writing Program"
                              size="small"
                              variant="outlined"
                              sx={{ borderColor: '#7c3aed', color: '#7c3aed' }}
                            />
                            <Chip
                              label="Apollo: Email Enrichment"
                              size="small"
                              variant="outlined"
                              sx={{ borderColor: '#059669', color: '#059669' }}
                            />
                            <Chip
                              label="Apollo: Organization Enrichment"
                              size="small"
                              variant="outlined"
                              sx={{ borderColor: '#059669', color: '#059669' }}
                            />
                            <Chip
                              label="Apollo: People Search"
                              size="small"
                              variant="outlined"
                              sx={{ borderColor: '#059669', color: '#059669' }}
                            />
                          </Box>
                        </Box>
                      </Paper>
                    ) : (
                      <Paper sx={{ p: 4, textAlign: 'center' }}>
                        <MoneyIcon sx={{ fontSize: 64, color: '#cbd5e1', mb: 2 }} />
                        <Typography variant="h6" color="text.secondary" gutterBottom>
                          No API Usage Yet
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Start using AI analysis or Apollo enrichment features to see cost data here.
                        </Typography>
                      </Paper>
                    )}
                  </>
                )}
              </Grid>
            </Grid>
          </>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default ProjectMonitoring;
