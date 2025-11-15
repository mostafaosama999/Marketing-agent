// src/pages/analytics/OutboundAnalytics.tsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import {
  LinkedIn as LinkedInIcon,
  Sync as SyncIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import LinkedInManualSync from '../../components/features/analytics/LinkedInManualSync';
import WebsiteAnalytics from '../../components/features/analytics/WebsiteAnalytics';
import {
  getLinkedInAnalyticsData,
  LinkedInAnalyticsData,
} from '../../services/api/linkedinManualService';

const OutboundAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<LinkedInAnalyticsData | null>(null);

  const loadLinkedInData = useCallback(async () => {
    if (!user?.uid) return;

    try {
      setLoading(true);

      // Load all analytics data from parent document
      const data = await getLinkedInAnalyticsData(user.uid);
      setAnalyticsData(data);
    } catch (error) {
      console.error('Failed to load LinkedIn analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadLinkedInData();
  }, [loadLinkedInData]);

  const handleSyncSuccess = () => {
    loadLinkedInData();
  };

  // Extract data from analytics object
  const posts = analyticsData?.posts || [];
  const totalImpressions = analyticsData?.totalImpressions || 0;
  const totalEngagement = analyticsData?.totalEngagement || 0;
  const postCount = analyticsData?.postCount || 0;
  const lastSyncAt = analyticsData?.extractedAt?.toDate() || null;

  const hasData = posts.length > 0;

  // Calculate engagement rate for each post
  const calculateEngagementRate = (post: any) => {
    if (post.impressions === 0) return 0;
    const totalEngagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
    return ((totalEngagement / post.impressions) * 100).toFixed(2);
  };

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
            Inbound Analytics
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748b' }}>
            Monitor your inbound marketing performance across LinkedIn and website
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

              {/* Posts Table */}
              {posts.length > 0 && (
                <Box sx={{ mt: 4 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                    All Posts
                  </Typography>
                  <TableContainer component={Paper} sx={{
                    borderRadius: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                  }}>
                    <Table>
                      <TableHead>
                        <TableRow sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                          <TableCell sx={{ color: 'white', fontWeight: 600 }}>Post Content</TableCell>
                          <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Impressions</TableCell>
                          <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Likes</TableCell>
                          <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Comments</TableCell>
                          <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Shares</TableCell>
                          <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>Engagement Rate</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 600 }}>Posted</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {posts.map((post, index) => (
                          <TableRow
                            key={index}
                            sx={{
                              '&:nth-of-type(odd)': { background: '#f8fafc' },
                              '&:hover': { background: '#f1f5f9' },
                            }}
                          >
                            <TableCell sx={{ maxWidth: 400 }}>
                              <Typography variant="body2" sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                              }}>
                                {post.content}
                              </Typography>
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, color: '#0077b5' }}>
                              {post.impressions.toLocaleString()}
                            </TableCell>
                            <TableCell align="right">{post.likes || 0}</TableCell>
                            <TableCell align="right">{post.comments || 0}</TableCell>
                            <TableCell align="right">{post.shares || 0}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 600, color: '#667eea' }}>
                              {calculateEngagementRate(post)}%
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ color: '#64748b' }}>
                                {post.postedDate}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Website Analytics Section */}
          <Box sx={{ mt: 4 }}>
            <WebsiteAnalytics />
          </Box>
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
