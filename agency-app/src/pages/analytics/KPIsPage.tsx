// src/pages/analytics/KPIsPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ThemeProvider,
  createTheme,
  CircularProgress,
  Collapse,
  IconButton,
  Grid,
  Chip,
  Tooltip,
  FormControl,
  Select,
  MenuItem,
  SelectChangeEvent,
  Rating,
  Divider,
} from '@mui/material';
import {
  Assessment,
  KeyboardArrowDown,
  KeyboardArrowUp,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  People,
  EmojiEvents,
  Percent,
  Send,
  Reply,
  Business,
  LinkedIn,
  Email,
  Star,
  Edit as EditIcon,
  Language as WebsiteIcon,
  Visibility as ImpressionsIcon,
  Article as PostsIcon,
} from '@mui/icons-material';
import { subscribeToLeads } from '../../services/api/leads';
import { subscribeToCompanies } from '../../services/api/companies';
import { subscribeToInboundKPIs } from '../../services/api/inboundKPIs';
import { Lead, LeadStatus } from '../../types/lead';
import { Company } from '../../types/crm';
import { InboundKPIData } from '../../types/inboundKPIs';
import { InboundKPIDialog } from '../../components/features/analytics/InboundKPIDialog';

// Modern theme
const modernTheme = createTheme({
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
});

// Types for KPI data
interface MonthlyKPIs {
  month: string; // YYYY-MM format
  monthLabel: string; // "Jan 2024" format
  // High-level KPIs (Outbound)
  newLeads: number;
  wonDeals: number;
  lostDeals: number;
  conversionRate: number;
  totalOutreach: number;
  totalResponses: number;
  responseRate: number;
  companiesAnalyzed: number;
  totalCosts: number;
  // Inbound KPIs (manual input)
  inbound: {
    websiteQuality?: number;
    linkedInQuality?: number;
    impressions?: number;
    posts?: number;
    followers?: number;
  };
  // Detailed KPIs (for drill-down)
  details: {
    // Pipeline breakdown
    pipeline: {
      new_lead: number;
      qualified: number;
      contacted: number;
      follow_up: number;
      nurture: number;
      won: number;
      lost: number;
    };
    // Outreach breakdown
    outreach: {
      linkedInSent: number;
      linkedInResponses: number;
      linkedInResponseRate: number;
      emailSent: number;
      emailResponses: number;
      emailResponseRate: number;
    };
    // Company analysis
    companies: {
      total: number;
      withBlogAnalysis: number;
      withWritingProgram: number;
      withOfferAnalysis: number;
      avgRating: number;
      highRated: number; // 8-10
    };
    // Lead quality
    leads: {
      avgRating: number;
      highRated: number;
      enriched: number;
    };
    // Costs breakdown
    costs: {
      apollo: number;
      openai: number;
      total: number;
      perLead: number;
      perWon: number;
    };
  };
}

interface TrendIndicator {
  value: number;
  direction: 'up' | 'down' | 'flat';
  isPositive: boolean; // Whether the trend direction is good
}

// Status labels for display
const STATUS_LABELS: Record<LeadStatus, string> = {
  new_lead: 'New Lead',
  qualified: 'Qualified',
  contacted: 'Contacted',
  follow_up: 'Follow Up',
  nurture: 'Nurture',
  won: 'Won',
  lost: 'Lost',
  previous_client: 'Previous Client',
  existing_client: 'Existing Client',
};

// Helper: Get month key from date
const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// Helper: Get readable month label
const getMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
};

// Helper: Format large numbers
const formatNumber = (num: number | undefined): string => {
  if (num === undefined || num === null) return '-';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
};

// Helper: Check if lead has LinkedIn response
const hasLinkedInResponse = (lead: Lead): boolean => {
  const response = lead.customFields?.linkedin_lead_response ||
                   lead.customFields?.lead_response;
  if (response) {
    if (response === 'No Response' || response === 'Not Interested' || response === '-') {
      return false;
    }
    if (response === 'Interested' || response === 'Meeting Scheduled' || response === 'Referred Us') {
      return true;
    }
    const lowerResponse = response.toLowerCase();
    if (lowerResponse.includes('not interested') || lowerResponse.includes('no response')) {
      return false;
    }
    return lowerResponse.includes('replied') || lowerResponse.includes('responded') ||
           lowerResponse.includes('accepted') || lowerResponse.includes('agreed');
  }
  return lead.outreach?.linkedIn?.status === 'replied';
};

// Helper: Check if lead has email response
const hasEmailResponse = (lead: Lead): boolean => {
  const response = lead.customFields?.email_lead_response ||
                   lead.customFields?.lead_response;
  if (response) {
    if (response === 'No Response' || response === 'Not Interested' || response === '-') {
      return false;
    }
    if (response === 'Interested' || response === 'Meeting Scheduled' || response === 'Referred Us') {
      return true;
    }
    const lowerResponse = response.toLowerCase();
    if (lowerResponse.includes('not interested') || lowerResponse.includes('no response')) {
      return false;
    }
    return lowerResponse.includes('replied') || lowerResponse.includes('responded') ||
           lowerResponse.includes('accepted') || lowerResponse.includes('agreed');
  }
  return lead.outreach?.email?.status === 'replied';
};

// Helper: Get LinkedIn date
const getLinkedInDate = (lead: Lead): Date | null => {
  if (lead.customFields?.linkedin_date_of_linkedin_contact) {
    try {
      return new Date(lead.customFields.linkedin_date_of_linkedin_contact);
    } catch { return null; }
  }
  if (lead.outreach?.linkedIn?.sentAt) {
    return lead.outreach.linkedIn.sentAt instanceof Date
      ? lead.outreach.linkedIn.sentAt
      : new Date(lead.outreach.linkedIn.sentAt);
  }
  return null;
};

// Helper: Get email date
const getEmailDate = (lead: Lead): Date | null => {
  if (lead.customFields?.email_date_sending_email) {
    try {
      return new Date(lead.customFields.email_date_sending_email);
    } catch { return null; }
  }
  if (lead.outreach?.email?.sentAt) {
    return lead.outreach.email.sentAt instanceof Date
      ? lead.outreach.email.sentAt
      : new Date(lead.outreach.email.sentAt);
  }
  return null;
};

// Helper: Calculate trend
const calculateTrend = (current: number, previous: number, higherIsBetter: boolean = true): TrendIndicator => {
  if (previous === 0) {
    return {
      value: current > 0 ? 100 : 0,
      direction: current > 0 ? 'up' : 'flat',
      isPositive: higherIsBetter ? current > 0 : current === 0,
    };
  }
  const percentChange = ((current - previous) / previous) * 100;
  const direction = percentChange > 1 ? 'up' : percentChange < -1 ? 'down' : 'flat';
  return {
    value: Math.abs(percentChange),
    direction,
    isPositive: higherIsBetter ? direction === 'up' : direction === 'down',
  };
};

// Trend Badge Component
const TrendBadge: React.FC<{ trend: TrendIndicator; showValue?: boolean }> = ({ trend, showValue = true }) => {
  const getIcon = () => {
    switch (trend.direction) {
      case 'up': return <TrendingUp sx={{ fontSize: 16 }} />;
      case 'down': return <TrendingDown sx={{ fontSize: 16 }} />;
      default: return <TrendingFlat sx={{ fontSize: 16 }} />;
    }
  };

  const getColor = () => {
    if (trend.direction === 'flat') return '#64748b';
    return trend.isPositive ? '#10b981' : '#ef4444';
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: getColor() }}>
      {getIcon()}
      {showValue && trend.direction !== 'flat' && (
        <Typography variant="caption" sx={{ fontWeight: 600, color: getColor() }}>
          {trend.value.toFixed(0)}%
        </Typography>
      )}
    </Box>
  );
};

// Expandable Row Component
const MonthRow: React.FC<{
  kpi: MonthlyKPIs;
  previousKpi: MonthlyKPIs | null;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
}> = ({ kpi, previousKpi, isExpanded, onToggle, onEdit }) => {
  // Calculate trends for outbound
  const trends = useMemo(() => ({
    newLeads: calculateTrend(kpi.newLeads, previousKpi?.newLeads || 0, true),
    wonDeals: calculateTrend(kpi.wonDeals, previousKpi?.wonDeals || 0, true),
    totalOutreach: calculateTrend(kpi.totalOutreach, previousKpi?.totalOutreach || 0, true),
    responseRate: calculateTrend(kpi.responseRate, previousKpi?.responseRate || 0, true),
    // Inbound trends
    impressions: calculateTrend(kpi.inbound.impressions || 0, previousKpi?.inbound.impressions || 0, true),
    posts: calculateTrend(kpi.inbound.posts || 0, previousKpi?.inbound.posts || 0, true),
    followers: calculateTrend(kpi.inbound.followers || 0, previousKpi?.inbound.followers || 0, true),
  }), [kpi, previousKpi]);

  return (
    <>
      <TableRow
        sx={{
          '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.04)' },
          transition: 'background-color 0.2s',
        }}
      >
        <TableCell sx={{ cursor: 'pointer' }} onClick={onToggle}>
          <IconButton size="small" sx={{ mr: 1 }}>
            {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
          </IconButton>
          <Typography component="span" sx={{ fontWeight: 600 }}>
            {kpi.monthLabel}
          </Typography>
        </TableCell>
        {/* Outbound Metrics */}
        <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={onToggle}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>{kpi.newLeads}</Typography>
            {previousKpi && <TrendBadge trend={trends.newLeads} />}
          </Box>
        </TableCell>
        <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={onToggle}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 600, color: '#10b981' }}>{kpi.wonDeals}</Typography>
            {previousKpi && <TrendBadge trend={trends.wonDeals} />}
          </Box>
        </TableCell>
        <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={onToggle}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>{kpi.totalOutreach}</Typography>
            {previousKpi && <TrendBadge trend={trends.totalOutreach} />}
          </Box>
        </TableCell>
        <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={onToggle}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>{kpi.responseRate.toFixed(1)}%</Typography>
            {previousKpi && <TrendBadge trend={trends.responseRate} />}
          </Box>
        </TableCell>
        {/* Inbound Metrics */}
        <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={onToggle}>
          <Typography sx={{ fontWeight: 600, color: '#667eea' }}>
            {kpi.inbound.websiteQuality !== undefined ? kpi.inbound.websiteQuality : '-'}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={onToggle}>
          <Typography sx={{ fontWeight: 600, color: '#0077b5' }}>
            {kpi.inbound.linkedInQuality !== undefined ? kpi.inbound.linkedInQuality : '-'}
          </Typography>
        </TableCell>
        <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={onToggle}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>{formatNumber(kpi.inbound.impressions)}</Typography>
            {previousKpi && kpi.inbound.impressions !== undefined && <TrendBadge trend={trends.impressions} />}
          </Box>
        </TableCell>
        <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={onToggle}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>{kpi.inbound.posts !== undefined ? kpi.inbound.posts : '-'}</Typography>
            {previousKpi && kpi.inbound.posts !== undefined && <TrendBadge trend={trends.posts} />}
          </Box>
        </TableCell>
        <TableCell align="center" sx={{ cursor: 'pointer' }} onClick={onToggle}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            <Typography sx={{ fontWeight: 600 }}>{formatNumber(kpi.inbound.followers)}</Typography>
            {previousKpi && kpi.inbound.followers !== undefined && <TrendBadge trend={trends.followers} />}
          </Box>
        </TableCell>
        {/* Edit Button */}
        <TableCell align="center">
          <Tooltip title="Edit Inbound Metrics">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              sx={{
                color: '#667eea',
                '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.1)' },
              }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>

      {/* Expanded Details Row */}
      <TableRow>
        <TableCell colSpan={12} sx={{ py: 0, borderBottom: isExpanded ? undefined : 'none' }}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ py: 3, px: 2 }}>
              {/* OUTBOUND Section */}
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  color: '#667eea',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Send sx={{ fontSize: 20 }} />
                Outbound Details
              </Typography>
              <Grid container spacing={3} sx={{ mb: 3 }}>
                {/* Pipeline Breakdown */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: 'rgba(102, 126, 234, 0.05)',
                      borderRadius: 2,
                      border: '1px solid rgba(102, 126, 234, 0.1)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <People sx={{ color: '#667eea' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Pipeline Breakdown
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {Object.entries(kpi.details.pipeline).map(([status, count]) => (
                        <Chip
                          key={status}
                          label={`${STATUS_LABELS[status as LeadStatus]}: ${count}`}
                          size="small"
                          sx={{
                            backgroundColor: 'white',
                            fontWeight: 500,
                          }}
                        />
                      ))}
                    </Box>
                  </Paper>
                </Grid>

                {/* Outreach Breakdown */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: 'rgba(16, 185, 129, 0.05)',
                      borderRadius: 2,
                      border: '1px solid rgba(16, 185, 129, 0.1)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Send sx={{ color: '#10b981' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Outreach Details
                      </Typography>
                    </Box>
                    <Grid container spacing={1}>
                      <Grid size={{ xs: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                          <LinkedIn sx={{ fontSize: 18, color: '#0077b5' }} />
                          <Typography variant="body2">LinkedIn</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          Sent: {kpi.details.outreach.linkedInSent}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          Responses: {kpi.details.outreach.linkedInResponses}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 600 }}>
                          Rate: {kpi.details.outreach.linkedInResponseRate.toFixed(1)}%
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                          <Email sx={{ fontSize: 18, color: '#ea4335' }} />
                          <Typography variant="body2">Email</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          Sent: {kpi.details.outreach.emailSent}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          Responses: {kpi.details.outreach.emailResponses}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 600 }}>
                          Rate: {kpi.details.outreach.emailResponseRate.toFixed(1)}%
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Company Analysis */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: 'rgba(139, 92, 246, 0.05)',
                      borderRadius: 2,
                      border: '1px solid rgba(139, 92, 246, 0.1)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Business sx={{ color: '#8b5cf6' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Company Analysis
                      </Typography>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          Total Companies: {kpi.details.companies.total}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          With Blog Analysis: {kpi.details.companies.withBlogAnalysis}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          With Writing Program: {kpi.details.companies.withWritingProgram}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          With Offer Analysis: {kpi.details.companies.withOfferAnalysis}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          Avg Rating: {kpi.details.companies.avgRating.toFixed(1)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          High Rated (8-10): {kpi.details.companies.highRated}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>

                {/* Lead Quality */}
                <Grid size={{ xs: 12, md: 6 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: 'rgba(236, 72, 153, 0.05)',
                      borderRadius: 2,
                      border: '1px solid rgba(236, 72, 153, 0.1)',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Star sx={{ color: '#ec4899' }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        Lead Quality
                      </Typography>
                    </Box>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          Avg Lead Rating: {kpi.details.leads.avgRating.toFixed(1)}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          High Rated (8-10): {kpi.details.leads.highRated}
                        </Typography>
                      </Grid>
                      <Grid size={{ xs: 6 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          Enriched Leads: {kpi.details.leads.enriched}
                        </Typography>
                      </Grid>
                    </Grid>
                  </Paper>
                </Grid>
              </Grid>

              {/* Divider */}
              <Divider sx={{ my: 3 }} />

              {/* INBOUND Section */}
              <Typography
                variant="subtitle1"
                sx={{
                  fontWeight: 700,
                  mb: 2,
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <ImpressionsIcon sx={{ fontSize: 20 }} />
                Inbound Details
              </Typography>
              <Grid container spacing={3}>
                {/* Quality Ratings */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: 'rgba(102, 126, 234, 0.05)',
                      borderRadius: 2,
                      border: '1px solid rgba(102, 126, 234, 0.1)',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                      Quality Ratings
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <WebsiteIcon sx={{ fontSize: 18, color: '#667eea' }} />
                        <Typography variant="body2">Website</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Rating
                          value={kpi.inbound.websiteQuality || 0}
                          max={10}
                          readOnly
                          size="small"
                          sx={{ '& .MuiRating-iconFilled': { color: '#667eea' } }}
                        />
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          {kpi.inbound.websiteQuality !== undefined ? `${kpi.inbound.websiteQuality}/10` : 'Not rated'}
                        </Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <LinkedIn sx={{ fontSize: 18, color: '#0077b5' }} />
                        <Typography variant="body2">LinkedIn Page</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Rating
                          value={kpi.inbound.linkedInQuality || 0}
                          max={10}
                          readOnly
                          size="small"
                          sx={{ '& .MuiRating-iconFilled': { color: '#0077b5' } }}
                        />
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          {kpi.inbound.linkedInQuality !== undefined ? `${kpi.inbound.linkedInQuality}/10` : 'Not rated'}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>

                {/* Content Metrics */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: 'rgba(245, 158, 11, 0.05)',
                      borderRadius: 2,
                      border: '1px solid rgba(245, 158, 11, 0.1)',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                      Content Performance
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ImpressionsIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                          <Typography variant="body2">Impressions</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatNumber(kpi.inbound.impressions)}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <PostsIcon sx={{ fontSize: 18, color: '#10b981' }} />
                          <Typography variant="body2">Posts Published</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {kpi.inbound.posts !== undefined ? kpi.inbound.posts : '-'}
                        </Typography>
                      </Box>
                    </Box>
                  </Paper>
                </Grid>

                {/* Audience Growth */}
                <Grid size={{ xs: 12, md: 4 }}>
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: 'rgba(139, 92, 246, 0.05)',
                      borderRadius: 2,
                      border: '1px solid rgba(139, 92, 246, 0.1)',
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
                      Audience
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <People sx={{ fontSize: 18, color: '#8b5cf6' }} />
                        <Typography variant="body2">Total Followers</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {formatNumber(kpi.inbound.followers)}
                        </Typography>
                        {previousKpi && kpi.inbound.followers !== undefined && previousKpi.inbound.followers !== undefined && (
                          <TrendBadge
                            trend={calculateTrend(kpi.inbound.followers, previousKpi.inbound.followers, true)}
                          />
                        )}
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const KPIsPage: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [inboundKPIs, setInboundKPIs] = useState<InboundKPIData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  const [allExpandedInitialized, setAllExpandedInitialized] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all'); // Default to all years

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMonth, setEditingMonth] = useState<{ month: string; label: string } | null>(null);

  // Subscribe to leads, companies, and inbound KPIs
  useEffect(() => {
    let leadsLoaded = false;
    let companiesLoaded = false;
    let inboundLoaded = false;

    const checkLoading = () => {
      if (leadsLoaded && companiesLoaded && inboundLoaded) {
        setLoading(false);
      }
    };

    const unsubscribeLeads = subscribeToLeads((leadsData) => {
      setLeads(leadsData);
      leadsLoaded = true;
      checkLoading();
    });

    const unsubscribeCompanies = subscribeToCompanies((companiesData) => {
      setCompanies(companiesData);
      companiesLoaded = true;
      checkLoading();
    });

    const unsubscribeInbound = subscribeToInboundKPIs((inboundData) => {
      setInboundKPIs(inboundData);
      inboundLoaded = true;
      checkLoading();
    });

    return () => {
      unsubscribeLeads();
      unsubscribeCompanies();
      unsubscribeInbound();
    };
  }, []);

  // Create inbound KPIs map for easy lookup
  const inboundKPIsMap = useMemo(() => {
    const map: Record<string, InboundKPIData> = {};
    for (const kpi of inboundKPIs) {
      map[kpi.month] = kpi;
    }
    return map;
  }, [inboundKPIs]);

  // Get available years from data
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    leads.forEach(lead => {
      if (lead.createdAt) {
        years.add(lead.createdAt.getFullYear());
      }
    });
    companies.forEach(company => {
      if (company.createdAt) {
        const date = company.createdAt instanceof Date ? company.createdAt : new Date(company.createdAt);
        years.add(date.getFullYear());
      }
    });
    // Always include current year
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [leads, companies]);

  // Calculate monthly KPIs
  const monthlyKPIs = useMemo(() => {
    const kpisByMonth: Record<string, MonthlyKPIs> = {};

    // Helper to initialize a month if it doesn't exist
    const ensureMonth = (monthKey: string) => {
      if (!kpisByMonth[monthKey]) {
        const inbound = inboundKPIsMap[monthKey] || {};
        kpisByMonth[monthKey] = {
          month: monthKey,
          monthLabel: getMonthLabel(monthKey),
          newLeads: 0,
          wonDeals: 0,
          lostDeals: 0,
          conversionRate: 0,
          totalOutreach: 0,
          totalResponses: 0,
          responseRate: 0,
          companiesAnalyzed: 0,
          totalCosts: 0,
          inbound: {
            websiteQuality: inbound.websiteQuality,
            linkedInQuality: inbound.linkedInQuality,
            impressions: inbound.impressions,
            posts: inbound.posts,
            followers: inbound.followers,
          },
          details: {
            pipeline: { new_lead: 0, qualified: 0, contacted: 0, follow_up: 0, nurture: 0, won: 0, lost: 0 },
            outreach: { linkedInSent: 0, linkedInResponses: 0, linkedInResponseRate: 0, emailSent: 0, emailResponses: 0, emailResponseRate: 0 },
            companies: { total: 0, withBlogAnalysis: 0, withWritingProgram: 0, withOfferAnalysis: 0, avgRating: 0, highRated: 0 },
            leads: { avgRating: 0, highRated: 0, enriched: 0 },
            costs: { apollo: 0, openai: 0, total: 0, perLead: 0, perWon: 0 },
          },
        };
      }
      return kpisByMonth[monthKey];
    };

    // Helper to check if month matches selected year filter
    const matchesYearFilter = (monthKey: string) => {
      if (selectedYear === 'all') return true;
      return monthKey.startsWith(String(selectedYear));
    };

    // Process leads
    leads.forEach(lead => {
      const createdMonth = getMonthKey(lead.createdAt);
      if (!matchesYearFilter(createdMonth)) return;

      const kpi = ensureMonth(createdMonth);

      // New leads created this month
      kpi.newLeads++;

      // Pipeline status at end of month (current status for simplicity)
      if (lead.status in kpi.details.pipeline) {
        kpi.details.pipeline[lead.status as keyof typeof kpi.details.pipeline]++;
      }

      // Won/Lost deals (based on stateHistory timestamp if available)
      if (lead.stateHistory?.won) {
        const wonDate = new Date(lead.stateHistory.won);
        const wonMonth = getMonthKey(wonDate);
        if (matchesYearFilter(wonMonth)) {
          const targetKpi = ensureMonth(wonMonth);
          targetKpi.wonDeals++;
        }
      }
      if (lead.stateHistory?.lost) {
        const lostDate = new Date(lead.stateHistory.lost);
        const lostMonth = getMonthKey(lostDate);
        if (matchesYearFilter(lostMonth)) {
          const targetKpi = ensureMonth(lostMonth);
          targetKpi.lostDeals++;
        }
      }

      // Outreach metrics
      const linkedInDate = getLinkedInDate(lead);
      if (linkedInDate) {
        const outreachMonth = getMonthKey(linkedInDate);
        if (matchesYearFilter(outreachMonth)) {
          const outreachKpi = ensureMonth(outreachMonth);
          outreachKpi.details.outreach.linkedInSent++;
          if (hasLinkedInResponse(lead)) {
            outreachKpi.details.outreach.linkedInResponses++;
          }
        }
      }

      const emailDate = getEmailDate(lead);
      if (emailDate) {
        const outreachMonth = getMonthKey(emailDate);
        if (matchesYearFilter(outreachMonth)) {
          const outreachKpi = ensureMonth(outreachMonth);
          outreachKpi.details.outreach.emailSent++;
          if (hasEmailResponse(lead)) {
            outreachKpi.details.outreach.emailResponses++;
          }
        }
      }

      // Lead quality
      if (lead.rating !== null && lead.rating !== undefined) {
        const ratings = kpi.details.leads;
        const currentAvg = ratings.avgRating;
        const currentCount = ratings.highRated + (currentAvg > 0 ? 1 : 0);
        ratings.avgRating = currentCount > 0 ? ((currentAvg * currentCount) + lead.rating) / (currentCount + 1) : lead.rating;
        if (lead.rating >= 8) {
          ratings.highRated++;
        }
      }

      if (lead.apolloEnriched) {
        kpi.details.leads.enriched++;
      }

      // Costs
      if (lead.totalApiCosts) {
        kpi.details.costs.total += lead.totalApiCosts;
      }
    });

    // Process companies
    companies.forEach(company => {
      const createdDate = company.createdAt instanceof Date ? company.createdAt : new Date(company.createdAt);
      const createdMonth = getMonthKey(createdDate);
      if (!matchesYearFilter(createdMonth)) return;

      const kpi = ensureMonth(createdMonth);

      kpi.details.companies.total++;

      if (company.blogAnalysis) {
        kpi.details.companies.withBlogAnalysis++;
        kpi.companiesAnalyzed++;
      }
      if (company.writingProgramAnalysis) {
        kpi.details.companies.withWritingProgram++;
      }
      if (company.offerAnalysis) {
        kpi.details.companies.withOfferAnalysis++;
      }
      if (company.ratingV2 !== null && company.ratingV2 !== undefined) {
        const ratings = kpi.details.companies;
        const currentCount = ratings.highRated + (ratings.avgRating > 0 ? 1 : 0);
        ratings.avgRating = currentCount > 0 ? ((ratings.avgRating * currentCount) + company.ratingV2) / (currentCount + 1) : company.ratingV2;
        if (company.ratingV2 >= 8) {
          ratings.highRated++;
        }
      }
      if (company.totalApiCosts) {
        kpi.details.costs.total += company.totalApiCosts;
      }
    });

    // Calculate derived metrics
    Object.values(kpisByMonth).forEach(kpi => {
      // Conversion rate
      if (kpi.newLeads > 0) {
        kpi.conversionRate = (kpi.wonDeals / kpi.newLeads) * 100;
      }

      // Total outreach and responses
      const { linkedInSent, linkedInResponses, emailSent, emailResponses } = kpi.details.outreach;
      kpi.totalOutreach = linkedInSent + emailSent;
      kpi.totalResponses = linkedInResponses + emailResponses;
      kpi.responseRate = kpi.totalOutreach > 0 ? (kpi.totalResponses / kpi.totalOutreach) * 100 : 0;

      // Outreach response rates
      kpi.details.outreach.linkedInResponseRate = linkedInSent > 0 ? (linkedInResponses / linkedInSent) * 100 : 0;
      kpi.details.outreach.emailResponseRate = emailSent > 0 ? (emailResponses / emailSent) * 100 : 0;

      // Cost metrics
      kpi.totalCosts = kpi.details.costs.total;
      kpi.details.costs.perLead = kpi.newLeads > 0 ? kpi.totalCosts / kpi.newLeads : 0;
      kpi.details.costs.perWon = kpi.wonDeals > 0 ? kpi.totalCosts / kpi.wonDeals : 0;
    });

    // Sort by month descending and filter to only show months with data
    // Start from November 2025
    const startMonth = '2025-11';

    return Object.values(kpisByMonth)
      .filter(kpi => {
        // Only show months from Nov 2025 onwards that have any activity
        return kpi.month >= startMonth && (kpi.newLeads > 0 || kpi.totalOutreach > 0 || kpi.companiesAnalyzed > 0 ||
          kpi.inbound.websiteQuality !== undefined || kpi.inbound.impressions !== undefined);
      })
      .sort((a, b) => b.month.localeCompare(a.month));
  }, [leads, companies, selectedYear, inboundKPIsMap]);

  // Expand all months by default once data is loaded
  useEffect(() => {
    if (monthlyKPIs.length > 0 && !allExpandedInitialized) {
      setExpandedMonths(new Set(monthlyKPIs.map(kpi => kpi.month)));
      setAllExpandedInitialized(true);
    }
  }, [monthlyKPIs, allExpandedInitialized]);

  // Get totals for summary cards
  const totals = useMemo(() => {
    return monthlyKPIs.reduce(
      (acc, kpi) => ({
        leads: acc.leads + kpi.newLeads,
        won: acc.won + kpi.wonDeals,
        outreach: acc.outreach + kpi.totalOutreach,
        responses: acc.responses + kpi.totalResponses,
      }),
      { leads: 0, won: 0, outreach: 0, responses: 0 }
    );
  }, [monthlyKPIs]);

  const handleYearChange = (event: SelectChangeEvent<string>) => {
    const value = event.target.value;
    setSelectedYear(value === 'all' ? 'all' : parseInt(value, 10));
    // Reset expanded months to expand all for the new year
    setAllExpandedInitialized(false);
  };

  const toggleMonth = (month: string) => {
    setExpandedMonths(prev => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  const handleEditMonth = (month: string, label: string) => {
    setEditingMonth({ month, label });
    setEditDialogOpen(true);
  };

  const handleDialogClose = () => {
    setEditDialogOpen(false);
    setEditingMonth(null);
  };

  return (
    <ThemeProvider theme={modernTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          py: 4,
        }}
      >
        <Container maxWidth="xl">
          {/* Header */}
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: 'white',
                  mb: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <Assessment sx={{ fontSize: 40 }} />
                Key Performance Indicators
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontWeight: 400,
                }}
              >
                Track monthly outbound and inbound performance metrics
              </Typography>
            </Box>

            {/* Year Selector */}
            <FormControl sx={{ minWidth: 140 }}>
              <Select
                value={String(selectedYear)}
                onChange={handleYearChange}
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: 2,
                  '& .MuiSelect-select': {
                    py: 1.5,
                    px: 2,
                    fontWeight: 600,
                  },
                }}
              >
                <MenuItem value="all">All Years</MenuItem>
                {availableYears.map(year => (
                  <MenuItem key={year} value={String(year)}>{year}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Summary Cards */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '16px',
                  textAlign: 'center',
                }}
              >
                <People sx={{ fontSize: 32, color: '#667eea', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#667eea' }}>
                  {totals.leads}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Total Leads
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '16px',
                  textAlign: 'center',
                }}
              >
                <EmojiEvents sx={{ fontSize: 32, color: '#10b981', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#10b981' }}>
                  {totals.won}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Won Deals
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '16px',
                  textAlign: 'center',
                }}
              >
                <Percent sx={{ fontSize: 32, color: '#f59e0b', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#f59e0b' }}>
                  {totals.leads > 0 ? ((totals.won / totals.leads) * 100).toFixed(1) : 0}%
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Conversion Rate
                </Typography>
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(20px)',
                  borderRadius: '16px',
                  textAlign: 'center',
                }}
              >
                <Reply sx={{ fontSize: 32, color: '#8b5cf6', mb: 1 }} />
                <Typography variant="h4" sx={{ fontWeight: 700, color: '#8b5cf6' }}>
                  {totals.outreach > 0 ? ((totals.responses / totals.outreach) * 100).toFixed(1) : 0}%
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Response Rate
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Monthly KPIs Table */}
          <Paper
            elevation={0}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: '16px',
              overflow: 'hidden',
            }}
          >
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
                <CircularProgress sx={{ color: '#667eea' }} />
              </Box>
            ) : monthlyKPIs.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Typography variant="h6" sx={{ color: '#64748b' }}>
                  No data available{selectedYear !== 'all' ? ` for ${selectedYear}` : ''}
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mt: 1 }}>
                  Start adding leads and companies to see your KPIs
                </Typography>
              </Box>
            ) : (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'rgba(102, 126, 234, 0.08)' }}>
                      <TableCell sx={{ fontWeight: 700, py: 2 }}>Month</TableCell>
                      {/* Outbound columns */}
                      <TableCell align="center" sx={{ fontWeight: 700, borderLeft: '2px solid rgba(102, 126, 234, 0.2)' }}>
                        <Tooltip title="New leads created">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <People sx={{ fontSize: 18 }} />
                            Leads
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        <Tooltip title="Deals closed as won">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <EmojiEvents sx={{ fontSize: 18 }} />
                            Won
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        <Tooltip title="LinkedIn + Email outreach">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <Send sx={{ fontSize: 18 }} />
                            Outreach
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        <Tooltip title="Response rate from outreach">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <Reply sx={{ fontSize: 18 }} />
                            Resp%
                          </Box>
                        </Tooltip>
                      </TableCell>
                      {/* Inbound columns */}
                      <TableCell align="center" sx={{ fontWeight: 700, borderLeft: '2px solid rgba(245, 158, 11, 0.3)' }}>
                        <Tooltip title="Website quality rating (1-10)">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <WebsiteIcon sx={{ fontSize: 18, color: '#667eea' }} />
                            Web
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        <Tooltip title="LinkedIn page quality rating (1-10)">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <LinkedIn sx={{ fontSize: 18, color: '#0077b5' }} />
                            LI
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        <Tooltip title="Total impressions for the month">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <ImpressionsIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
                            Impr
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        <Tooltip title="Total posts published">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <PostsIcon sx={{ fontSize: 18, color: '#10b981' }} />
                            Posts
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700 }}>
                        <Tooltip title="Total followers">
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                            <People sx={{ fontSize: 18, color: '#8b5cf6' }} />
                            Foll
                          </Box>
                        </Tooltip>
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, width: 60 }}>
                        Edit
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {monthlyKPIs.map((kpi, index) => (
                      <MonthRow
                        key={kpi.month}
                        kpi={kpi}
                        previousKpi={monthlyKPIs[index + 1] || null}
                        isExpanded={expandedMonths.has(kpi.month)}
                        onToggle={() => toggleMonth(kpi.month)}
                        onEdit={() => handleEditMonth(kpi.month, kpi.monthLabel)}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Paper>
        </Container>
      </Box>

      {/* Edit Inbound KPI Dialog */}
      {editingMonth && (
        <InboundKPIDialog
          open={editDialogOpen}
          onClose={handleDialogClose}
          month={editingMonth.month}
          monthLabel={editingMonth.label}
          existingData={inboundKPIsMap[editingMonth.month]}
          onSaved={handleDialogClose}
        />
      )}
    </ThemeProvider>
  );
};

export default KPIsPage;
