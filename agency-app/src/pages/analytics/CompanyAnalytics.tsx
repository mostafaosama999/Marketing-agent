// src/pages/analytics/CompanyAnalytics.tsx
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  ThemeProvider,
  createTheme,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import { BarChart } from '@mui/x-charts/BarChart';
import {
  Business as BusinessIcon,
  Timeline as TimelineIcon,
  Archive as ArchiveIcon,
  Category as CategoryIcon,
  Star as StarIcon,
  Assignment as AssignmentIcon,
  FilterList as FilterListIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { subscribeToCompanies, subscribeToArchivedCompanies } from '../../services/api/companies';
import { Company } from '../../types/crm';
import { LeadStatus } from '../../types/lead';
import { getStatusLabel, getStatusColor } from '../../components/features/companies/CompanyStatusBadge';

// Client statuses to exclude from analytics (these are existing/previous clients, not prospects)
const CLIENT_STATUSES: LeadStatus[] = ['previous_client', 'existing_client'];

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

// Stat Card Component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, trend, color }) => {
  return (
    <Card
      sx={{
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 3,
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(226, 232, 240, 0.5)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: '0 12px 48px rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      <CardContent sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 2,
              background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {icon}
          </Box>
          {trend && (
            <Typography
              variant="body2"
              sx={{
                color: trend.startsWith('+') ? '#10b981' : '#ef4444',
                fontWeight: 600,
                fontSize: '12px',
              }}
            >
              {trend}
            </Typography>
          )}
        </Box>
        <Typography variant="h4" sx={{ color: '#1e293b', mb: 0.5, fontWeight: 700 }}>
          {value}
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
          {title}
        </Typography>
      </CardContent>
    </Card>
  );
};

// Placeholder Chart Component
interface PlaceholderChartProps {
  title: string;
  description: string;
  icon: React.ReactNode;
}

const PlaceholderChart: React.FC<PlaceholderChartProps> = ({ title, description, icon }) => {
  return (
    <Card
      sx={{
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 3,
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(226, 232, 240, 0.5)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        height: '100%',
        minHeight: '300px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <CardContent sx={{ p: 4, textAlign: 'center' }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}
        >
          {icon}
        </Box>
        <Typography variant="h5" sx={{ color: '#64748b', fontWeight: 600, mb: 2 }}>
          {title}
        </Typography>
        <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: '300px', margin: '0 auto' }}>
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

const CompanyAnalytics: React.FC = () => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [archivedCompanies, setArchivedCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRating, setSelectedRating] = useState<number | 'all'>('all');
  const navigate = useNavigate();

  // Subscribe to active companies
  useEffect(() => {
    const unsubscribe = subscribeToCompanies((companiesData) => {
      setCompanies(companiesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to archived companies
  useEffect(() => {
    const unsubscribe = subscribeToArchivedCompanies((archivedData) => {
      setArchivedCompanies(archivedData);
    });

    return () => unsubscribe();
  }, []);

  // Filter out client companies (previous_client, existing_client) from analytics
  const analyticsCompanies = useMemo(() => {
    return companies.filter(c => !CLIENT_STATUSES.includes(c.status as LeadStatus));
  }, [companies]);

  // Count of excluded client companies (for transparency)
  const excludedClientCount = useMemo(() => {
    return companies.filter(c => CLIENT_STATUSES.includes(c.status as LeadStatus)).length;
  }, [companies]);

  // Calculate basic stats (using analyticsCompanies - excludes clients)
  const totalCompanies = analyticsCompanies.length;
  const totalArchivedCompanies = archivedCompanies.length;
  const companiesWithIndustry = analyticsCompanies.filter(c => c.industry).length;
  const averageRating = analyticsCompanies.length > 0
    ? (analyticsCompanies.reduce((sum, c) => sum + (c.ratingV2 || 0), 0) / analyticsCompanies.length).toFixed(1)
    : '0';

  // Filtered companies by rating (for Status chart) - uses analyticsCompanies (excludes clients)
  const filteredCompaniesByRating = useMemo(() => {
    if (selectedRating === 'all') return analyticsCompanies;
    return analyticsCompanies.filter(c => c.ratingV2 === selectedRating);
  }, [analyticsCompanies, selectedRating]);

  // High-quality uncontacted companies counter (rating > 6, status = new_lead or qualified)
  // Uses analyticsCompanies (excludes clients)
  const highQualityUncontactedCount = useMemo(() => {
    return analyticsCompanies.filter(c =>
      c.ratingV2 &&
      c.ratingV2 > 6 &&
      (c.status === 'new_lead' || c.status === 'qualified')
    ).length;
  }, [analyticsCompanies]);

  // Get alert styling based on high-quality uncontacted count
  const getAlertStyle = (count: number) => {
    if (count >= 10) {
      return {
        textColor: '#16a34a',
        IconComponent: TrendingUpIcon,
        message: 'You have enough high-quality leads to contact',
        status: 'good',
      };
    } else if (count >= 5) {
      return {
        textColor: '#d97706',
        IconComponent: WarningIcon,
        message: 'Consider finding more high-quality leads',
        status: 'warning',
      };
    } else {
      return {
        textColor: '#dc2626',
        IconComponent: WarningIcon,
        message: 'Low inventory - find more high-quality leads urgently',
        status: 'critical',
      };
    }
  };

  const alertStyle = getAlertStyle(highQualityUncontactedCount);

  // Handle high-quality uncontacted counter click
  const handleHighQualityUncontactedClick = () => {
    navigate('/companies?rating=7,8,9,10&status=new_lead,qualified');
  };

  // Rating distribution (1-10 only, excluding archived, no rating, and client statuses)
  const ratingDistribution = useMemo(() => {
    const counts: { rating: string; count: number }[] = [];

    // Add ratings 1-10 only (exclude 0/no rating, archived, and client statuses)
    const ratingOrder = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    ratingOrder.forEach(rating => {
      const count = analyticsCompanies.filter(c => c.ratingV2 === rating).length;
      counts.push({
        rating: rating.toString(),
        count,
      });
    });

    return counts;
  }, [analyticsCompanies]);

  // Handle rating bar click
  const handleRatingClick = (event: any, itemData: any) => {
    if (itemData?.axisValue) {
      const rating = itemData.axisValue;
      navigate(`/companies?rating=${rating}`);
    }
  };

  // Company type distribution (from customFields, filtered by rating)
  const companyTypeDistribution = useMemo(() => {
    // Count companies by type
    const typeCounts: Record<string, number> = {};

    filteredCompaniesByRating.forEach(company => {
      // Check all possible field name variations
      const rawType = company.customFields?.['Company Type']
        || company.customFields?.['company_type']
        || company.customFields?.companyType
        || 'Unknown';

      // Normalize to lowercase to merge case variations (e.g., "Not yet" and "Not Yet")
      let normalizedType = rawType.toString().trim().toLowerCase();

      // Merge "not yet" and "unknown" into one category
      if (normalizedType === 'not yet' || normalizedType === 'unknown') {
        normalizedType = 'not yet / unknown';
      }

      typeCounts[normalizedType] = (typeCounts[normalizedType] || 0) + 1;
    });

    // Convert to array and sort by count (descending)
    return Object.entries(typeCounts)
      .map(([type, count]) => ({
        type: type === 'not yet / unknown'
          ? 'Not yet / Unknown'  // Special case for merged category
          : type.charAt(0).toUpperCase() + type.slice(1), // Capitalize first letter for display
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredCompaniesByRating]);

  // Handle company type bar click
  const handleCompanyTypeClick = (event: any, itemData: any) => {
    if (itemData?.axisValue) {
      const type = itemData.axisValue;
      const ratingParam = selectedRating !== 'all' ? `&rating=${selectedRating}` : '';
      navigate(`/companies?companyType=${type}${ratingParam}`);
    }
  };

  // Status distribution (filtered by rating)
  const statusDistribution = useMemo(() => {
    const allStatuses: LeadStatus[] = ['new_lead', 'qualified', 'contacted', 'follow_up', 'nurture', 'won', 'lost'];

    return allStatuses
      .map(status => {
        const count = filteredCompaniesByRating.filter(c => c.status === status).length;
        return {
          status: getStatusLabel(status),
          count: count,
          statusId: status,
          color: getStatusColor(status),
        };
      })
      .filter(item => item.count > 0); // Only show statuses that have companies
  }, [filteredCompaniesByRating]);

  // Handle status bar chart click
  const handleStatusClick = (event: any, itemData: any) => {
    if (itemData?.axisValue) {
      const statusLabel = itemData.axisValue;
      // Find the status ID from the label
      const statusItem = statusDistribution.find(s => s.status === statusLabel);
      if (statusItem) {
        const ratingParam = selectedRating !== 'all' ? `&rating=${selectedRating}` : '';
        navigate(`/companies?status=${statusItem.statusId}${ratingParam}`);
      }
    }
  };

  return (
    <ThemeProvider theme={modernTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          p: 4,
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <CircularProgress size={60} sx={{ color: 'white' }} />
          </Box>
        ) : (
          <>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h4"
                sx={{
                  color: 'white',
                  fontWeight: 700,
                  mb: 1,
                  textShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                }}
              >
                Company Analytics
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '14px',
                  fontWeight: 500,
                }}
              >
                Insights and metrics about your company database
              </Typography>
            </Box>

            {/* Stats Cards */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Total Companies"
                  value={totalCompanies}
                  icon={<BusinessIcon sx={{ fontSize: 24, color: '#667eea' }} />}
                  color="#667eea"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Existing/Previous Clients"
                  value={excludedClientCount}
                  icon={<PeopleIcon sx={{ fontSize: 24, color: '#009688' }} />}
                  color="#009688"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Archived Companies"
                  value={totalArchivedCompanies}
                  icon={<ArchiveIcon sx={{ fontSize: 24, color: '#ef4444' }} />}
                  color="#ef4444"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="Avg Rating"
                  value={averageRating}
                  icon={<TimelineIcon sx={{ fontSize: 24, color: '#8b5cf6' }} />}
                  color="#8b5cf6"
                />
              </Grid>
            </Grid>

            {/* Top Section - Rating Distribution (Full Width) */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                {/* Rating Distribution Chart */}
                <Card
                  sx={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: 3,
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(226, 232, 240, 0.5)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        color: '#1e293b',
                        fontWeight: 700,
                        mb: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <StarIcon sx={{ fontSize: 24, color: '#667eea' }} />
                      Distribution by Rating V2
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
                      View how companies are distributed across different rating levels
                    </Typography>

                    <Box sx={{ height: 400 }}>
                      <BarChart
                        dataset={ratingDistribution}
                        xAxis={[{ dataKey: 'rating', scaleType: 'band', label: 'Rating' }]}
                        yAxis={[{ label: 'Number of Companies' }]}
                        series={[
                          {
                            dataKey: 'count',
                            label: 'Companies',
                            color: '#667eea',
                          },
                        ]}
                        margin={{ left: 80, right: 20, top: 20, bottom: 60 }}
                        grid={{ vertical: true, horizontal: true }}
                        onItemClick={handleRatingClick}
                        sx={{
                          '& .MuiChartsAxis-label': {
                            fill: '#64748b',
                            fontWeight: 600,
                          },
                          '& .MuiChartsAxis-tick': {
                            stroke: '#e2e8f0',
                          },
                          '& .MuiChartsAxis-tickLabel': {
                            fill: '#475569',
                            fontWeight: 500,
                          },
                          '& .MuiBarElement-root': {
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                            '&:hover': {
                              opacity: 0.8,
                            },
                          },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Bottom Section - Status Distribution with Rating Filter */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              {/* Rating Filter Toolbar */}
              <Grid item xs={12}>
                <Card
                  sx={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: 3,
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(226, 232, 240, 0.5)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <FilterListIcon sx={{ color: '#667eea', fontSize: 24 }} />
                      <Typography
                        variant="h6"
                        sx={{ color: '#1e293b', fontWeight: 600, flex: 1 }}
                      >
                        Filter by Rating
                      </Typography>
                      <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel id="rating-filter-label">Rating</InputLabel>
                        <Select
                          labelId="rating-filter-label"
                          value={selectedRating}
                          label="Rating"
                          onChange={(e) => setSelectedRating(e.target.value as number | 'all')}
                          sx={{
                            '& .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#e2e8f0',
                            },
                            '&:hover .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#667eea',
                            },
                            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                              borderColor: '#667eea',
                            },
                          }}
                        >
                          <MenuItem value="all">All Ratings</MenuItem>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
                            <MenuItem key={rating} value={rating}>
                              Rating {rating}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {selectedRating !== 'all' && (
                        <Chip
                          label={`Showing ${filteredCompaniesByRating.length} companies with rating ${selectedRating}`}
                          sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            fontWeight: 600,
                          }}
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* High-Quality Uncontacted Companies Alert */}
              <Grid item xs={12}>
                <Card
                  onClick={handleHighQualityUncontactedClick}
                  sx={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: 3,
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(226, 232, 240, 0.5)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                    cursor: 'pointer',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2,
                          background: `linear-gradient(135deg, ${alertStyle.textColor}15 0%, ${alertStyle.textColor}25 100%)`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <alertStyle.IconComponent sx={{ fontSize: 24, color: alertStyle.textColor }} />
                      </Box>
                    </Box>
                    <Typography variant="h4" sx={{ color: '#1e293b', mb: 0.5, fontWeight: 700 }}>
                      {highQualityUncontactedCount}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', fontWeight: 500, mb: 1 }}>
                      High-Quality Uncontacted Companies
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: alertStyle.textColor,
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    >
                      {alertStyle.message}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Status Distribution Chart */}
              <Grid item xs={12}>
                <Card
                  sx={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: 3,
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(226, 232, 240, 0.5)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        color: '#1e293b',
                        fontWeight: 700,
                        mb: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <AssignmentIcon sx={{ fontSize: 24, color: '#667eea' }} />
                      Distribution by Status
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
                      View how companies are distributed across pipeline stages
                    </Typography>

                    <Box sx={{ height: 400 }}>
                      <BarChart
                        dataset={statusDistribution}
                        xAxis={[{
                          dataKey: 'status',
                          scaleType: 'band',
                          label: 'Status',
                        }]}
                        yAxis={[{ label: 'Number of Companies' }]}
                        series={[
                          {
                            dataKey: 'count',
                            label: 'Companies',
                            color: '#667eea',
                          },
                        ]}
                        margin={{ left: 80, right: 20, top: 20, bottom: 60 }}
                        grid={{ vertical: true, horizontal: true }}
                        onItemClick={handleStatusClick}
                        sx={{
                          '& .MuiChartsAxis-label': {
                            fill: '#64748b',
                            fontWeight: 600,
                          },
                          '& .MuiChartsAxis-tick': {
                            stroke: '#e2e8f0',
                          },
                          '& .MuiChartsAxis-tickLabel': {
                            fill: '#475569',
                            fontWeight: 500,
                          },
                          '& .MuiBarElement-root': {
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                            '&:hover': {
                              opacity: 0.8,
                            },
                          },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Company Type Distribution - Row 3 */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12}>
                {/* Company Type Distribution Chart */}
                <Card
                  sx={{
                    background: 'rgba(255, 255, 255, 0.9)',
                    borderRadius: 3,
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(226, 232, 240, 0.5)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                  }}
                >
                  <CardContent sx={{ p: 4 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        color: '#1e293b',
                        fontWeight: 700,
                        mb: 1,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                      }}
                    >
                      <CategoryIcon sx={{ fontSize: 24, color: '#f59e0b' }} />
                      Distribution by Company Type
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
                      See breakdown of companies by type (SaaS, Agency, Enterprise, etc.)
                    </Typography>

                    <Box sx={{ height: 500 }}>
                      <BarChart
                        dataset={companyTypeDistribution}
                        xAxis={[{
                          dataKey: 'type',
                          scaleType: 'band',
                          label: 'Company Type',
                          tickLabelInterval: () => true,
                        }]}
                        yAxis={[{ label: 'Number of Companies' }]}
                        series={[
                          {
                            dataKey: 'count',
                            label: 'Companies',
                            color: '#f59e0b',
                            valueFormatter: (value) => value?.toString() || '0',
                          },
                        ]}
                        margin={{ left: 80, right: 20, top: 20, bottom: 100 }}
                        grid={{ vertical: true, horizontal: true }}
                        onItemClick={handleCompanyTypeClick}
                        sx={{
                          '& .MuiChartsAxis-label': {
                            fill: '#64748b',
                            fontWeight: 600,
                          },
                          '& .MuiChartsAxis-tick': {
                            stroke: '#e2e8f0',
                          },
                          '& .MuiChartsAxis-tickLabel': {
                            fill: '#475569',
                            fontWeight: 500,
                            fontSize: '11px',
                          },
                          '& .MuiBarElement-root': {
                            cursor: 'pointer',
                            transition: 'opacity 0.2s',
                            '&:hover': {
                              opacity: 0.8,
                            },
                          },
                        }}
                      />
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Empty State */}
            {companies.length === 0 && (
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.9)',
                  borderRadius: 3,
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(226, 232, 240, 0.5)',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                  p: 6,
                  textAlign: 'center',
                }}
              >
                <Typography variant="h5" sx={{ color: '#64748b', fontWeight: 600 }}>
                  No Company Data Available
                </Typography>
                <Typography variant="body2" sx={{ color: '#94a3b8', mt: 2 }}>
                  Start adding companies to see analytics and insights
                </Typography>
              </Card>
            )}
          </>
        )}
      </Box>
    </ThemeProvider>
  );
};

export default CompanyAnalytics;
