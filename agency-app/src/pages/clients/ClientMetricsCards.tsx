// src/pages/clients/components/ClientMetricsCards.tsx
import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  AttachMoney as MoneyIcon,
  Business as BusinessIcon,
  Assessment as AssessmentIcon,
  Article as ArticleIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from '@mui/icons-material';
import { Client } from '../../types';

interface ClientMetricsCardsProps {
  isCEO: boolean;
  isManager: boolean;
  selectedMonth: string;
  totalExpectedRevenue: number;
  activeClients: Client[];
  actualRevenue: number;
  completedTasks: number;
  revenueChange: number;
  revenueChangePercentage: number;
  tasksChange: number;
  clients: Client[];
}

const ClientMetricsCards: React.FC<ClientMetricsCardsProps> = ({
  isCEO,
  isManager,
  selectedMonth,
  totalExpectedRevenue,
  activeClients,
  actualRevenue,
  completedTasks,
  revenueChange,
  revenueChangePercentage,
  tasksChange,
  clients,
}) => {
  // CEO Metrics
  if (isCEO) {
    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: '1px solid rgba(59, 130, 246, 0.1)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: '0 8px 32px rgba(59, 130, 246, 0.15)',
              transform: 'translateY(-2px)',
            }
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{
                  background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                  borderRadius: 2,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <MoneyIcon sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Typography variant="body2" sx={{ 
                  color: '#64748b',
                  fontWeight: 500,
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  {selectedMonth === 'current' ? 'Expected Monthly' : 'Target'}
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 700,
                color: '#1e293b',
                fontSize: '28px'
              }}>
                ${selectedMonth === 'current' ? totalExpectedRevenue.toLocaleString() : '—'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: '1px solid rgba(16, 185, 129, 0.1)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: '0 8px 32px rgba(16, 185, 129, 0.15)',
              transform: 'translateY(-2px)',
            }
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Box sx={{
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  borderRadius: 2,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <BusinessIcon sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Typography variant="body2" sx={{ 
                  color: '#64748b',
                  fontWeight: 500,
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Active Clients
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 700,
                color: '#1e293b',
                fontSize: '28px'
              }}>
                {activeClients.length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: '1px solid rgba(34, 197, 94, 0.1)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: '0 8px 32px rgba(34, 197, 94, 0.15)',
              transform: 'translateY(-2px)',
            }
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{
                  background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
                  borderRadius: 2,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AssessmentIcon sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Typography variant="body2" sx={{ 
                  color: '#64748b',
                  fontWeight: 500,
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Actual Revenue
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 700,
                color: '#1e293b',
                fontSize: '28px',
                mb: 1
              }}>
                ${actualRevenue.toLocaleString()}
              </Typography>
              {/* Month-over-month change */}
              {selectedMonth !== 'all' && revenueChange !== 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {revenueChange >= 0 ? 
                    <TrendingUpIcon sx={{ fontSize: 16, color: '#059669' }} /> : 
                    <TrendingDownIcon sx={{ fontSize: 16, color: '#dc2626' }} />
                  }
                  <Typography variant="caption" sx={{ 
                    color: revenueChange >= 0 ? '#059669' : '#dc2626',
                    fontWeight: 600,
                    fontSize: '12px'
                  }}>
                    {revenueChange >= 0 ? '+' : ''}{revenueChangePercentage.toFixed(1)}%
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: '1px solid rgba(148, 163, 184, 0.1)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover': {
              boxShadow: '0 8px 32px rgba(148, 163, 184, 0.15)',
              transform: 'translateY(-2px)',
            }
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                <Box sx={{
                  background: 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                  borderRadius: 2,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <AssessmentIcon sx={{ color: 'white', fontSize: 20 }} />
                </Box>
                <Typography variant="body2" sx={{ 
                  color: '#64748b',
                  fontWeight: 500,
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Completed Tasks
                </Typography>
              </Box>
              <Typography variant="h5" sx={{ 
                fontWeight: 700,
                color: '#1e293b',
                fontSize: '28px',
                mb: 1
              }}>
                {completedTasks}
              </Typography>
              {/* Month-over-month change for tasks */}
              {selectedMonth !== 'all' && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {tasksChange >= 0 ? 
                    <TrendingUpIcon sx={{ fontSize: 16, color: '#059669' }} /> : 
                    <TrendingDownIcon sx={{ fontSize: 16, color: '#dc2626' }} />
                  }
                  <Typography variant="caption" sx={{ 
                    color: tasksChange >= 0 ? '#059669' : '#dc2626',
                    fontWeight: 600,
                    fontSize: '12px'
                  }}>
                    {tasksChange >= 0 ? '+' : ''}{tasksChange}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  // Manager Metrics
  if (isManager) {
    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: '1px solid rgba(16, 185, 129, 0.1)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <BusinessIcon sx={{ fontSize: 40, color: 'primary.main', mb: 2 }} />
              <Typography variant="h3" fontWeight="bold" color="primary.main">
                {clients.length}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Total Clients
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: '1px solid rgba(34, 197, 94, 0.1)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <AssessmentIcon sx={{ fontSize: 40, color: 'success.main', mb: 2 }} />
              <Typography variant="h3" fontWeight="bold" color="success.main">
                {activeClients.length}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Active Clients
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card sx={{
            background: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: '1px solid rgba(59, 130, 246, 0.1)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          }}>
            <CardContent sx={{ p: 4, textAlign: 'center' }}>
              <ArticleIcon sx={{ fontSize: 40, color: 'info.main', mb: 2 }} />
              <Typography variant="h3" fontWeight="bold" color="info.main">
                {completedTasks}
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Content Projects
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  return null;
};

export default ClientMetricsCards;