// src/pages/analytics/OutboundAnalytics.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  LinkedIn as LinkedInIcon,
  Language as LanguageIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import { useAuth } from '../../contexts/AuthContext';
import LinkedInManualSync from '../../components/features/analytics/LinkedInManualSync';
import {
  getLinkedInSyncMetadata,
  getLinkedInPosts,
  getLinkedInAggregates,
  LinkedInPost,
  LinkedInAggregate,
} from '../../services/api/linkedinManualService';

const OutboundAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [posts, setPosts] = useState<LinkedInPost[]>([]);
  const [aggregates, setAggregates] = useState<LinkedInAggregate[]>([]);

  useEffect(() => {
    loadLinkedInData();
  }, [user]);

  const loadLinkedInData = async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);

      // Load metadata
      const metadata = await getLinkedInSyncMetadata(user.uid);
      if (metadata?.lastSyncAt) {
        setLastSyncAt(metadata.lastSyncAt.toDate());
      }

      // Load posts
      const loadedPosts = await getLinkedInPosts(user.uid, 10);
      setPosts(loadedPosts);

      // Load aggregates for charts
      const loadedAggregates = await getLinkedInAggregates(user.uid, 30);
      setAggregates(loadedAggregates);
    } catch (error) {
      // Error handling
    } finally {
      setLoading(false);
    }
  };

  const handleSyncSuccess = () => {
    loadLinkedInData();
  };

  // Calculate metrics from most recent aggregate
  const latestAggregate = aggregates.length > 0 ? aggregates[aggregates.length - 1] : null;
  const totalImpressions = latestAggregate?.totalImpressions || 0;
  const totalEngagement = latestAggregate?.totalEngagement || 0;
  const postCount = latestAggregate?.postCount || 0;

  // Prepare chart data
  const trendData = aggregates.map((agg) => ({
    date: agg.id || new Date(agg.extractedAt.toDate()).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    impressions: agg.totalImpressions,
    engagement: agg.totalEngagement,
  }));

  // Top posts data for bar chart
  const topPostsData = posts.slice(0, 5).map((post) => ({
    post: post.content.substring(0, 30) + '...',
    impressions: post.impressions,
  }));

  const hasData = posts.length > 0;

  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
      p: 4,
    }}>
      {/* Page Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{
            fontWeight: 700,
            mb: 1,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
          }}>
            Outbound Analytics
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748b' }}>
            Monitor your outbound marketing performance across LinkedIn and website
          </Typography>
          {lastSyncAt && (
            <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
              Last synced: {lastSyncAt.toLocaleString()}
            </Typography>
          )}
        </Box>

        <Button
          variant="contained"
          startIcon={<SyncIcon />}
          onClick={() => setSyncDialogOpen(true)}
          sx={{
            background: 'linear-gradient(135deg, #0077b5 0%, #005885 100%)',
            color: 'white',
            textTransform: 'none',
            px: 3,
            '&:hover': {
              background: 'linear-gradient(135deg, #006399 0%, #004d6d 100%)',
            },
          }}
        >
          Sync LinkedIn Analytics
        </Button>
      </Box>

      {/* Loading State */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
          <CircularProgress />
        </Box>
      )}

      {/* No Data State */}
      {!loading && !hasData && (
        <Alert severity="info" sx={{ mb: 3 }}>
          No LinkedIn analytics data yet. Click "Sync LinkedIn Analytics" to get started.
        </Alert>
      )}

      {/* Content */}
      {!loading && hasData && (
        <Box>
          {/* LinkedIn Analytics Section */}
          <Card sx={{
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            mb: 3,
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <LinkedInIcon sx={{ fontSize: 32, color: '#0077b5', mr: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  LinkedIn Analytics
                </Typography>
              </Box>

              {/* Metrics Cards */}
              <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
                <Box sx={{
                  flex: '1 1 200px',
                  p: 3,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 2,
                  color: 'white',
                }}>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Total Impressions
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {totalImpressions.toLocaleString()}
                  </Typography>
                </Box>

                <Box sx={{
                  flex: '1 1 200px',
                  p: 3,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 2,
                  color: 'white',
                }}>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Total Engagement
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {totalEngagement.toLocaleString()}
                  </Typography>
                </Box>

                <Box sx={{
                  flex: '1 1 200px',
                  p: 3,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: 2,
                  color: 'white',
                }}>
                  <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
                    Posts Tracked
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700 }}>
                    {postCount}
                  </Typography>
                </Box>
              </Box>

              {/* Engagement Trend Chart */}
              {trendData.length > 1 && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    Engagement Trend
                  </Typography>
                  <Box sx={{ height: 400 }}>
                    <LineChart
                      dataset={trendData}
                      xAxis={[{ dataKey: 'date', scaleType: 'point' }]}
                      series={[
                        {
                          dataKey: 'impressions',
                          label: 'Impressions',
                          color: '#0077b5',
                          curve: 'linear',
                        },
                        {
                          dataKey: 'engagement',
                          label: 'Engagement',
                          color: '#667eea',
                          curve: 'linear',
                        },
                      ]}
                      margin={{ left: 80, right: 20, top: 20, bottom: 60 }}
                      grid={{ vertical: true, horizontal: true }}
                    />
                  </Box>
                </Box>
              )}

              {/* Top Posts Chart */}
              {topPostsData.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    Top Performing Posts
                  </Typography>
                  <Box sx={{ height: 400 }}>
                    <BarChart
                      dataset={topPostsData}
                      xAxis={[{ dataKey: 'post', scaleType: 'band' }]}
                      series={[
                        {
                          dataKey: 'impressions',
                          label: 'Impressions',
                          color: '#0077b5',
                        },
                      ]}
                      margin={{ left: 80, right: 20, top: 20, bottom: 100 }}
                      grid={{ vertical: true, horizontal: true }}
                    />
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Website Analytics Section (Placeholder) */}
          <Card sx={{
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
          }}>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <LanguageIcon sx={{ fontSize: 32, color: '#667eea', mr: 2 }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Website Analytics
                </Typography>
              </Box>

              <Box sx={{ p: 6, background: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                <Typography variant="body1" sx={{ color: '#64748b' }}>
                  Website analytics integration coming soon
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Sync Dialog */}
      <LinkedInManualSync
        open={syncDialogOpen}
        onClose={() => setSyncDialogOpen(false)}
        onSuccess={handleSyncSuccess}
      />
    </Box>
  );
};

export default OutboundAnalytics;
