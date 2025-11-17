// src/pages/analytics/CompanyAnalytics.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import Grid from '@mui/material/GridLegacy';
import {
  Business as BusinessIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  Archive as ArchiveIcon,
  Public as PublicIcon,
  Category as CategoryIcon,
  Star as StarIcon,
} from '@mui/icons-material';
import { subscribeToCompanies, subscribeToArchivedCompanies } from '../../services/api/companies';
import { Company } from '../../types/crm';

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

  // Calculate basic stats
  const totalCompanies = companies.length;
  const totalArchivedCompanies = archivedCompanies.length;
  const companiesWithWebsite = companies.filter(c => c.website).length;
  const companiesWithIndustry = companies.filter(c => c.industry).length;
  const averageRating = companies.length > 0
    ? (companies.reduce((sum, c) => sum + (c.ratingV2 || 0), 0) / companies.length).toFixed(1)
    : '0';

  // Companies by industry
  const companiesByIndustry = companies.reduce((acc, company) => {
    const industry = company.industry || 'Unknown';
    acc[industry] = (acc[industry] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topIndustries = Object.entries(companiesByIndustry)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

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
                  title="Archived Companies"
                  value={totalArchivedCompanies}
                  icon={<ArchiveIcon sx={{ fontSize: 24, color: '#ef4444' }} />}
                  color="#ef4444"
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  title="With Website"
                  value={companiesWithWebsite}
                  icon={<TrendingUpIcon sx={{ fontSize: 24, color: '#10b981' }} />}
                  color="#10b981"
                  trend={totalCompanies > 0 ? `${Math.round((companiesWithWebsite / totalCompanies) * 100)}%` : '0%'}
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

            {/* Top Industries */}
            <Card
              sx={{
                background: 'rgba(255, 255, 255, 0.9)',
                borderRadius: 3,
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(226, 232, 240, 0.5)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                mb: 4,
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Typography
                  variant="h5"
                  sx={{
                    color: '#1e293b',
                    fontWeight: 700,
                    mb: 3,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <BusinessIcon sx={{ fontSize: 24, color: '#667eea' }} />
                  Top 5 Industries
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {topIndustries.map(([industry, count], index) => (
                    <Box
                      key={industry}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        p: 2,
                        borderRadius: 2,
                        background: index % 2 === 0 ? 'rgba(102, 126, 234, 0.05)' : 'transparent',
                      }}
                    >
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#1e293b',
                          fontWeight: 600,
                          fontSize: '14px',
                        }}
                      >
                        {industry}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box
                          sx={{
                            width: `${(count / totalCompanies) * 200}px`,
                            height: 8,
                            borderRadius: 1,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            minWidth: '20px',
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#64748b',
                            fontWeight: 700,
                            fontSize: '14px',
                            minWidth: '60px',
                            textAlign: 'right',
                          }}
                        >
                          {count} ({Math.round((count / totalCompanies) * 100)}%)
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                  {topIndustries.length === 0 && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#94a3b8',
                        textAlign: 'center',
                        py: 4,
                      }}
                    >
                      No industry data available
                    </Typography>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Distribution Charts - Row 1 */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <PlaceholderChart
                  title="Distribution by Rating V2"
                  description="Coming soon: View how companies are distributed across different rating levels"
                  icon={<StarIcon sx={{ fontSize: 40, color: '#667eea' }} />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <PlaceholderChart
                  title="Distribution by Country"
                  description="Coming soon: Analyze company distribution across different countries and regions"
                  icon={<PublicIcon sx={{ fontSize: 40, color: '#10b981' }} />}
                />
              </Grid>
            </Grid>

            {/* Distribution Charts - Row 2 */}
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid item xs={12} md={6}>
                <PlaceholderChart
                  title="Distribution by Company Type"
                  description="Coming soon: See breakdown of companies by type (SaaS, Agency, Enterprise, etc.)"
                  icon={<CategoryIcon sx={{ fontSize: 40, color: '#f59e0b' }} />}
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <PlaceholderChart
                  title="Company Growth Timeline"
                  description="Coming soon: Track how your company database has grown over time"
                  icon={<TrendingUpIcon sx={{ fontSize: 40, color: '#8b5cf6' }} />}
                />
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
