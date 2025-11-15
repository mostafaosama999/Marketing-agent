// src/components/features/analytics/WebsiteAnalytics.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Alert,
  Grid,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
} from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import {
  Language as WebsiteIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  People as PeopleIcon,
  Pageview as PageviewIcon,
  Schedule as ScheduleIcon,
  Sync as SyncIcon,
  Settings as SettingsIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import {
  syncGoogleAnalytics,
  getGAConfig,
  subscribeToGAMetrics,
  getDateRange,
  calculateMetricsSummary,
  aggregateTrafficSources,
  formatMetricsForChart,
  formatDuration,
  formatNumber,
  formatPercentage,
  formatSourceName,
  getGAMetrics,
} from '../../../services/api/googleAnalyticsService';
import type {
  GAConfig,
  GAMetrics,
  GAMetricsSummary,
  GATrafficSourceSummary,
  GAChartDataPoint,
} from '../../../types/googleAnalytics';

interface WebsiteAnalyticsProps {
  onConfigureClick?: () => void;
}

const WebsiteAnalytics: React.FC<WebsiteAnalyticsProps> = ({ onConfigureClick }) => {
  const [config, setConfig] = useState<GAConfig | null>(null);
  const [metrics, setMetrics] = useState<GAMetrics[]>([]);
  const [chartData, setChartData] = useState<GAChartDataPoint[]>([]);
  const [summary, setSummary] = useState<GAMetricsSummary | null>(null);
  const [trafficSources, setTrafficSources] = useState<GATrafficSourceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [dayRange, setDayRange] = useState<7 | 14 | 30>(30);

  // Load config and subscribe to metrics
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Use global config for company-wide analytics
        const configId = 'global';
        const gaConfig = await getGAConfig(configId);
        setConfig(gaConfig);

        if (!gaConfig) {
          setLoading(false);
          return;
        }

        // Get date range
        const dateRange = getDateRange(dayRange);

        // Subscribe to metrics using global config
        const unsubscribe = subscribeToGAMetrics(
          configId,
          dateRange,
          (metricsData) => {
            setMetrics(metricsData);
            setChartData(formatMetricsForChart(metricsData));
            setLoading(false);
          }
        );

        return unsubscribe;
      } catch (err: any) {
        console.error('Failed to load GA data:', err);
        setError(err.message || 'Failed to load analytics data');
        setLoading(false);
      }
    };

    loadData();
  }, [dayRange]);

  // Calculate summary and trends whenever metrics change
  useEffect(() => {
    if (metrics.length === 0) return;

    const calculateSummary = async () => {
      try {
        // Get previous period metrics for trend calculation
        const configId = 'global';
        const previousDateRange = getDateRange(dayRange * 2);
        const previousEndDate = new Date();
        previousEndDate.setDate(previousEndDate.getDate() - dayRange);

        const previousMetrics = await getGAMetrics(configId, {
          startDate: previousDateRange.startDate,
          endDate: previousEndDate.toISOString().split('T')[0],
        });

        const summaryData = calculateMetricsSummary(metrics, previousMetrics);
        setSummary(summaryData);
      } catch (err) {
        console.error('Failed to calculate summary:', err);
      }
    };

    calculateSummary();
  }, [metrics, dayRange]);

  // Load traffic sources
  useEffect(() => {
    if (metrics.length === 0) return;

    const loadTrafficSources = async () => {
      try {
        const configId = 'global';
        const { getGATrafficSources } = await import('../../../services/api/googleAnalyticsService');
        const dateRange = getDateRange(dayRange);
        const sources = await getGATrafficSources(configId, dateRange);
        const aggregated = aggregateTrafficSources(sources, 10); // Limit to top 10 sources

        // Format source names for display
        const formatted = aggregated.map(s => ({
          ...s,
          sourceName: formatSourceName(s.source),
        }));

        setTrafficSources(formatted);
      } catch (err) {
        console.error('Failed to load traffic sources:', err);
      }
    };

    loadTrafficSources();
  }, [metrics, dayRange]);

  // Handle manual sync
  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      setSyncSuccess(false);

      await syncGoogleAnalytics(dayRange);

      setSyncSuccess(true);
      setTimeout(() => setSyncSuccess(false), 3000);
    } catch (err: any) {
      console.error('Sync failed:', err);
      setError(err.message || 'Failed to sync analytics');
    } finally {
      setSyncing(false);
    }
  };

  // Render trend icon
  const renderTrendIcon = (trend: number) => {
    if (trend > 0) {
      return <TrendingUpIcon sx={{ fontSize: 20, color: '#4caf50' }} />;
    } else if (trend < 0) {
      return <TrendingDownIcon sx={{ fontSize: 20, color: '#f44336' }} />;
    }
    return null;
  };

  // Render trend text
  const renderTrendText = (trend: number) => {
    const color = trend > 0 ? '#4caf50' : trend < 0 ? '#f44336' : '#64748b';
    const sign = trend > 0 ? '+' : '';
    return (
      <Typography variant="caption" sx={{ color, fontWeight: 600 }}>
        {sign}{trend.toFixed(1)}%
      </Typography>
    );
  };

  // Show loading state
  if (loading) {
    return (
      <Box sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '300px',
        flexDirection: 'column',
        gap: 2,
      }}>
        <CircularProgress size={40} sx={{ color: '#667eea' }} />
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Loading website analytics...
        </Typography>
      </Box>
    );
  }

  // Show not configured state
  if (!config) {
    return (
      <Card sx={{
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 3,
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(226, 232, 240, 0.5)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        p: 6,
        textAlign: 'center',
      }}>
        <WebsiteIcon sx={{ fontSize: 64, color: '#667eea', mb: 2 }} />
        <Typography variant="h5" sx={{ color: '#1e293b', fontWeight: 600, mb: 2 }}>
          Google Analytics Not Configured
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mb: 4, maxWidth: 500, mx: 'auto' }}>
          Connect your Google Analytics account to track website traffic, user behavior, and conversion metrics in real-time.
        </Typography>
        <Button
          variant="contained"
          startIcon={<SettingsIcon />}
          onClick={onConfigureClick}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            px: 4,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b3fa0 100%)',
            }
          }}
        >
          Configure Google Analytics
        </Button>
      </Card>
    );
  }

  // Show no data state
  if (metrics.length === 0) {
    return (
      <Card sx={{
        background: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 3,
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(226, 232, 240, 0.5)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
        p: 6,
        textAlign: 'center',
      }}>
        <WebsiteIcon sx={{ fontSize: 64, color: '#64748b', mb: 2, opacity: 0.5 }} />
        <Typography variant="h5" sx={{ color: '#1e293b', fontWeight: 600, mb: 2 }}>
          No Analytics Data Available
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
          Sync your Google Analytics data to see website traffic and performance metrics.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 3, maxWidth: 500, mx: 'auto' }}>
            {error}
          </Alert>
        )}
        <Button
          variant="contained"
          startIcon={syncing ? <CircularProgress size={20} color="inherit" /> : <SyncIcon />}
          onClick={handleSync}
          disabled={syncing}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            px: 4,
            py: 1.5,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b3fa0 100%)',
            }
          }}
        >
          {syncing ? 'Syncing...' : 'Sync Website Analytics'}
        </Button>
      </Card>
    );
  }

  return (
    <Box>
      {/* Header with sync button and day range selector */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <WebsiteIcon sx={{ fontSize: 36, color: '#667eea' }} />
          <Box>
            <Typography variant="h5" sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}>
              Website Analytics
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                {config.websiteUrl}
              </Typography>
              {config.lastSyncAt && (
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  • Last synced {new Date(config.lastSyncAt).toLocaleDateString()}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Day Range Selector */}
          <ToggleButtonGroup
            value={dayRange}
            exclusive
            onChange={(e, newRange) => newRange && setDayRange(newRange)}
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
          </ToggleButtonGroup>

          {/* Sync Button */}
          <Tooltip title="Sync latest data from Google Analytics">
            <Button
              variant="contained"
              startIcon={syncing ? <CircularProgress size={16} color="inherit" /> : syncSuccess ? <CheckCircleIcon /> : <SyncIcon />}
              onClick={handleSync}
              disabled={syncing}
              sx={{
                background: syncSuccess
                  ? 'linear-gradient(135deg, #4caf50 0%, #388e3c 100%)'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                px: 3,
                py: 1,
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: 600,
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                '&:hover': {
                  background: syncSuccess
                    ? 'linear-gradient(135deg, #388e3c 0%, #2e7d32 100%)'
                    : 'linear-gradient(135deg, #5a67d8 0%, #6b3fa0 100%)',
                }
              }}
            >
              {syncing ? 'Syncing...' : syncSuccess ? 'Synced!' : 'Sync Now'}
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Metrics Summary Cards */}
      {summary && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(102, 126, 234, 0.3)',
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <PeopleIcon sx={{ fontSize: 40, color: 'white', opacity: 0.9 }} />
                  {renderTrendIcon(summary.trend.users)}
                </Box>
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 0.5 }}>
                  {formatNumber(summary.totalUsers)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 0.5 }}>
                  Total Users
                </Typography>
                {renderTrendText(summary.trend.users)}
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <ScheduleIcon sx={{ fontSize: 40, color: 'white', opacity: 0.9 }} />
                  {renderTrendIcon(summary.trend.sessions)}
                </Box>
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 0.5 }}>
                  {formatNumber(summary.totalSessions)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 0.5 }}>
                  Sessions
                </Typography>
                {renderTrendText(summary.trend.sessions)}
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
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <PageviewIcon sx={{ fontSize: 40, color: 'white', opacity: 0.9 }} />
                  {renderTrendIcon(summary.trend.pageviews)}
                </Box>
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 0.5 }}>
                  {formatNumber(summary.totalPageviews)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 0.5 }}>
                  Pageviews
                </Typography>
                {renderTrendText(summary.trend.pageviews)}
              </CardContent>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card sx={{
              background: 'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
              borderRadius: 3,
              boxShadow: '0 4px 20px rgba(156, 39, 176, 0.3)',
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <ScheduleIcon sx={{ fontSize: 40, color: 'white', opacity: 0.9 }} />
                </Box>
                <Typography variant="h4" sx={{ color: 'white', fontWeight: 700, mb: 0.5 }}>
                  {formatDuration(summary.avgSessionDuration)}
                </Typography>
                <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', mb: 0.5 }}>
                  Avg Session Duration
                </Typography>
                <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                  Bounce: {formatPercentage(summary.avgBounceRate)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Traffic Over Time Chart */}
      {chartData.length > 0 && (
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
              Traffic Over Time
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
              Daily website traffic trends for the last {dayRange} days
            </Typography>

            <Box sx={{ height: 400 }}>
              <LineChart
                dataset={chartData}
                xAxis={[{ dataKey: 'date', scaleType: 'point' }]}
                yAxis={[{ label: 'Count' }]}
                series={[
                  {
                    dataKey: 'sessions',
                    label: 'Sessions',
                    color: '#2196f3',
                    curve: 'monotoneX',
                  },
                  {
                    dataKey: 'users',
                    label: 'Users',
                    color: '#667eea',
                    curve: 'monotoneX',
                  },
                  {
                    dataKey: 'pageviews',
                    label: 'Pageviews',
                    color: '#ff9800',
                    curve: 'monotoneX',
                  },
                ]}
                margin={{ left: 70, right: 20, top: 20, bottom: 60 }}
                grid={{ vertical: true, horizontal: true }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Traffic Sources Chart */}
      {trafficSources.length > 0 && (
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
              Traffic Sources
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
              Where your visitors are coming from
            </Typography>

            <Box sx={{ height: 450 }}>
              <BarChart
                dataset={trafficSources}
                xAxis={[{
                  scaleType: 'band',
                  dataKey: 'sourceName',
                  label: 'Traffic Source',
                }]}
                yAxis={[{ label: 'Sessions' }]}
                series={[
                  {
                    dataKey: 'totalSessions',
                    label: 'Sessions',
                    color: '#667eea',
                    valueFormatter: (value: number | null) => value ? formatNumber(value) : '0',
                  },
                ]}
                margin={{ left: 70, right: 20, top: 20, bottom: 100 }}
                grid={{ vertical: true, horizontal: true }}
              />
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default WebsiteAnalytics;
