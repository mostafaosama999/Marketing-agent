// src/pages/team/TeamMemberPerformance.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Avatar,
  Chip,
  Button,
  Grid,
  Divider,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  TrendingUp as TrendingUpIcon,
  Schedule as ScheduleIcon,
  Assignment as AssignmentIcon,
  Person as ManagerIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import { db } from '../../services/firebase/firestore';
import { collection, doc, getDoc, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { Lead } from '../../types/lead';
import { usePipelineConfigContext } from '../../contexts/PipelineConfigContext';

interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  specialties?: string[];
  joinDate?: string;
  department?: string;
  compensation?: {
    type: 'salary' | 'commission';
    baseSalary?: number;
    commissionRate?: number;
    bonusStructure?: number;
  };
}

const TeamMemberPerformance: React.FC = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { userProfile } = useAuth();
  const { getLabel } = usePipelineConfigContext();
  const [teamMember, setTeamMember] = useState<User | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  // Helper function to safely convert dates
  const safeToDate = (dateValue: any): Date | null => {
    if (!dateValue) return null;
    if (dateValue instanceof Date) return dateValue;
    if (typeof dateValue === 'object' && typeof dateValue.toDate === 'function') {
      return dateValue.toDate();
    }
    if (typeof dateValue === 'string' || typeof dateValue === 'number') {
      const date = new Date(dateValue);
      return isNaN(date.getTime()) ? null : date;
    }
    return null;
  };

  // Fetch team member and their leads
  useEffect(() => {
    if (!userId) return;

    const fetchData = async () => {
      try {
        // Fetch team member details
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
          const userData = { id: userDoc.id, ...userDoc.data() } as User;
          setTeamMember(userData);

          // Fetch leads assigned to this team member
          const leadsRef = collection(db, 'leads');
          const q = query(
            leadsRef,
            where('customFields.lead_owner', '==', userData.displayName)
          );
          const leadsSnapshot = await getDocs(q);

          const leadsData: Lead[] = leadsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              ...data,
              createdAt: safeToDate(data.createdAt) || new Date(),
              updatedAt: safeToDate(data.updatedAt) || new Date(),
            } as Lead;
          });

          setLeads(leadsData);
        }
        setLoading(false);
      } catch (error) {
        console.error('Error fetching team member data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  // Calculate performance metrics

  // 1. Total Leads Assigned
  const getTotalLeads = () => leads.length;

  // 2. Leads Converted (Won)
  const getLeadsConverted = () => {
    return leads.filter(lead => lead.status === 'won').length;
  };

  // 3. Conversion Rate
  const getConversionRate = () => {
    const total = getTotalLeads();
    if (total === 0) return 0;
    const converted = getLeadsConverted();
    return Math.round((converted / total) * 100);
  };

  // 4. Average Deal Value (if deal_value custom field exists)
  const getAverageDealValue = () => {
    const wonLeads = leads.filter(lead =>
      lead.status === 'won' &&
      lead.customFields?.deal_value &&
      lead.customFields.deal_value > 0
    );

    if (wonLeads.length === 0) return null;

    const totalValue = wonLeads.reduce((sum, lead) =>
      sum + (lead.customFields?.deal_value || 0), 0
    );

    return Math.round(totalValue / wonLeads.length);
  };

  // 5. Total Pipeline Value (sum of all non-lost leads with deal values)
  const getTotalPipelineValue = () => {
    const activeLeads = leads.filter(lead =>
      lead.status !== 'lost' &&
      lead.customFields?.deal_value &&
      lead.customFields.deal_value > 0
    );

    return activeLeads.reduce((sum, lead) =>
      sum + (lead.customFields?.deal_value || 0), 0
    );
  };

  // 6. Average Sales Cycle (days from creation to won)
  const getAverageSalesCycle = () => {
    const wonLeads = leads.filter(lead =>
      lead.status === 'won' &&
      lead.createdAt
    );

    if (wonLeads.length === 0) return null;

    const totalDays = wonLeads.reduce((sum, lead) => {
      const created = safeToDate(lead.createdAt);
      const updated = safeToDate(lead.updatedAt);
      if (!created || !updated) return sum;

      const days = Math.ceil((updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      return sum + Math.max(0, days);
    }, 0);

    return Math.round(totalDays / wonLeads.length);
  };

  // 7. Leads by Status
  const getLeadsByStatus = (status: string) => {
    return leads.filter(lead => lead.status === status).length;
  };

  const totalLeads = getTotalLeads();
  const leadsConverted = getLeadsConverted();
  const conversionRate = getConversionRate();
  const averageDealValue = getAverageDealValue();
  const totalPipelineValue = getTotalPipelineValue();
  const averageSalesCycle = getAverageSalesCycle();

  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50vh',
        flexDirection: 'column',
        gap: 2
      }}>
        <CircularProgress />
        <Typography>Loading team member performance...</Typography>
      </Box>
    );
  }

  if (!loading && !teamMember) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '50vh',
        flexDirection: 'column'
      }}>
        <Typography variant="h6" color="error">Team member not found</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          User ID: {userId}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Please check the URL or contact support if this error persists.
        </Typography>
        <Button onClick={() => navigate('/team')} sx={{ mt: 2 }}>
          Back to Team
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
        <IconButton onClick={() => navigate('/team')} sx={{ mr: 2 }}>
          <ArrowBackIcon />
        </IconButton>
        <Avatar sx={{
          width: 60,
          height: 60,
          mr: 3,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          fontSize: '24px',
          fontWeight: 600
        }}>
          {teamMember?.displayName?.charAt(0)?.toUpperCase() || 'U'}
        </Avatar>
        <Box>
          <Typography variant="h4" fontWeight="bold">
            {teamMember?.displayName || 'Unknown Member'}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <Chip
              label={teamMember?.role || 'Unknown'}
              color={teamMember?.role === 'Sales Manager' ? 'warning' : 'info'}
              sx={{ fontWeight: 600 }}
            />
            <Typography variant="body2" color="text.secondary">
              {teamMember?.email || 'No email'}
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Performance Metrics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <AssignmentIcon sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                {totalLeads}
              </Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                Total Leads Assigned
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUpIcon sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                {leadsConverted}
              </Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                Leads Converted
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ManagerIcon sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                {conversionRate}%
              </Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                Conversion Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <ScheduleIcon sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                {averageSalesCycle !== null ? averageSalesCycle : 'N/A'}
              </Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                Avg Sales Cycle (Days)
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Financial Metrics Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <Card sx={{
            background: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <MoneyIcon sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                {averageDealValue !== null ? `$${averageDealValue.toLocaleString()}` : 'N/A'}
              </Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                Average Deal Value
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6 }}>
          <Card sx={{
            background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
            color: 'white'
          }}>
            <CardContent sx={{ textAlign: 'center' }}>
              <MoneyIcon sx={{ fontSize: 40, mb: 1, opacity: 0.9 }} />
              <Typography variant="h3" fontWeight="bold" sx={{ mb: 1 }}>
                ${totalPipelineValue.toLocaleString()}
              </Typography>
              <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>
                Total Pipeline Value
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Team Member Details */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Team Member Details
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Email:</strong> {teamMember?.email || 'No email'}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  <strong>Department:</strong> {teamMember?.department || 'Sales Team'}
                </Typography>
                {teamMember?.joinDate && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    <strong>Joined:</strong> {new Date(teamMember.joinDate).toLocaleDateString()}
                  </Typography>
                )}
                <Typography variant="body2" color="text.secondary">
                  <strong>Total Leads:</strong> {totalLeads}
                </Typography>
              </Box>

              {teamMember?.specialties && teamMember.specialties.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                    Specialties
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {teamMember.specialties.map((specialty, idx) => (
                      <Chip
                        key={idx}
                        label={specialty}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Pipeline Overview
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">New Leads</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {getLeadsByStatus('new_lead')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Qualified</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {getLeadsByStatus('qualified')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Contacted</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {getLeadsByStatus('contacted')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Follow Up</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {getLeadsByStatus('follow_up')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="success.main">Won</Typography>
                  <Typography variant="body2" fontWeight="bold" color="success.main">
                    {getLeadsByStatus('won')}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="error.main">Lost</Typography>
                  <Typography variant="body2" fontWeight="bold" color="error.main">
                    {getLeadsByStatus('lost')}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
                Success Rate
              </Typography>
              <LinearProgress
                variant="determinate"
                value={conversionRate}
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {conversionRate}% of assigned leads converted to wins
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Recent Leads Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Recent Leads
          </Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell><strong>Lead Name</strong></TableCell>
                  <TableCell><strong>Company</strong></TableCell>
                  <TableCell><strong>Status</strong></TableCell>
                  <TableCell><strong>Priority</strong></TableCell>
                  <TableCell><strong>Deal Value</strong></TableCell>
                  <TableCell><strong>Created</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {leads.slice(0, 15).map((lead) => {
                  const createdAt = safeToDate(lead.createdAt);

                  return (
                    <TableRow key={lead.id} hover>
                      <TableCell>
                        <Typography variant="body2" fontWeight="500">
                          {lead.name}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {lead.company || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={getLabel(lead.status)}
                          size="small"
                          color={
                            lead.status === 'won' ? 'success' :
                            lead.status === 'lost' ? 'error' :
                            lead.status === 'follow_up' ? 'warning' :
                            lead.status === 'contacted' ? 'info' :
                            lead.status === 'qualified' ? 'primary' : 'default'
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {lead.customFields?.priority ? (
                          <Chip
                            label={lead.customFields.priority}
                            size="small"
                            color={
                              lead.customFields.priority === 'Urgent' ? 'error' :
                              lead.customFields.priority === 'High' ? 'warning' :
                              lead.customFields.priority === 'Medium' ? 'info' : 'default'
                            }
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.customFields?.deal_value ? (
                          <Typography variant="body2" fontWeight="500">
                            ${lead.customFields.deal_value.toLocaleString()}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {createdAt ? createdAt.toLocaleDateString() : 'Unknown'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {leads.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" color="text.secondary">
                No leads assigned to this team member
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default TeamMemberPerformance;
