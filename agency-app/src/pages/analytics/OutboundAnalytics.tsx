// src/pages/analytics/OutboundAnalytics.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Tabs,
  Tab,
  ThemeProvider,
  createTheme,
} from '@mui/material';
import {
  LinkedIn as LinkedInIcon,
  Sync as SyncIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { LineChart } from '@mui/x-charts/LineChart';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LinkedInManualSync from '../../components/features/analytics/LinkedInManualSync';
import WebsiteAnalytics from '../../components/features/analytics/WebsiteAnalytics';
import CompanyWebsiteAnalytics from '../../components/features/analytics/CompanyWebsiteAnalytics';
import {
  getLinkedInAnalyticsData,
  LinkedInAnalyticsData,
} from '../../services/api/linkedinManualService';

// Modern theme
const modernTheme = createTheme({
  typography: {
    fontFamily: '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
});

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`inbound-tabpanel-${index}`}
      aria-labelledby={`inbound-tab-${index}`}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

const OutboundAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [syncDialogOpen, setSyncDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<LinkedInAnalyticsData | null>(null);

  // Initialize tab from URL parameter
  const getInitialTab = () => {
    const tabParam = searchParams.get('tab');
    return tabParam === 'company' ? 1 : 0;
  };
  const [currentTab, setCurrentTab] = useState(getInitialTab);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
    // Update URL with tab parameter
    const tabName = newValue === 1 ? 'company' : 'personal';
    setSearchParams({ tab: tabName });
  };

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

  // Helper function to parse relative date and convert to absolute date
  const parseRelativeDate = (relativeDate: string, extractedAt: Date): Date => {
    const match = relativeDate.match(/^(\d+)([wdhm])$/);
    if (!match) return extractedAt;

    const value = parseInt(match[1]);
    const unit = match[2];
    const date = new Date(extractedAt);

    switch (unit) {
      case 'w': // weeks
        date.setDate(date.getDate() - value * 7);
        break;
      case 'd': // days
        date.setDate(date.getDate() - value);
        break;
      case 'h': // hours
        date.setHours(date.getHours() - value);
        break;
      case 'm': // minutes
        date.setMinutes(date.getMinutes() - value);
        break;
    }

    return date;
  };

  // Format date for chart display
  const formatChartDate = (date: Date): string => {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[date.getMonth()]} ${date.getDate()}`;
  };

  // Calculate chart data from posts
  const chartData = useMemo(() => {
    if (!posts.length || !lastSyncAt) return [];

    // Convert posts to absolute dates and create data points
    const dataPoints = posts.map(post => {
      const postDate = parseRelativeDate(post.postedDate, lastSyncAt);
      const engagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);

      return {
        date: postDate.toISOString().split('T')[0], // YYYY-MM-DD for grouping
        displayDate: formatChartDate(postDate),
        impressions: post.impressions || 0,
        engagement,
        timestamp: postDate.getTime(),
      };
    });

    // Sort by date chronologically
    dataPoints.sort((a, b) => a.timestamp - b.timestamp);

    // Group by date and aggregate
    const groupedData: { [date: string]: { impressions: number; engagement: number; count: number; displayDate: string } } = {};

    dataPoints.forEach(point => {
      if (!groupedData[point.date]) {
        groupedData[point.date] = {
          impressions: 0,
          engagement: 0,
          count: 0,
          displayDate: point.displayDate,
        };
      }
      groupedData[point.date].impressions += point.impressions;
      groupedData[point.date].engagement += point.engagement;
      groupedData[point.date].count += 1;
    });

    // Convert to array format for LineChart
    return Object.entries(groupedData)
      .map(([date, data]) => ({
        label: data.displayDate,
        impressions: data.impressions,
        engagement: data.engagement,
        posts: data.count,
        date, // Keep for sorting
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [posts, lastSyncAt]);

  // Calculate engagement rate for each post
  const calculateEngagementRate = (post: any) => {
    if (post.impressions === 0) return 0;
    const totalEngagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
    return ((totalEngagement / post.impressions) * 100).toFixed(2);
  };

  return (
    <ThemeProvider theme={modernTheme}>
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        }}
      >
        {/* Fixed Header with Tabs */}
        <Box
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderBottom: '1px solid rgba(226, 232, 240, 0.5)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          }}
        >
          <Box sx={{ px: 4, pt: 2 }}>
            <Typography variant="h5" sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}>
              Inbound Analytics
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
              Monitor your inbound marketing performance across LinkedIn and website
            </Typography>
          </Box>
          <Tabs
            value={currentTab}
            onChange={handleTabChange}
            aria-label="inbound analytics tabs"
            sx={{
              px: 4,
              '& .MuiTabs-indicator': {
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                height: 3,
                borderRadius: '3px 3px 0 0',
              },
            }}
          >
            <Tab
              icon={<PersonIcon />}
              iconPosition="start"
              label="Personal"
              id="inbound-tab-0"
              aria-controls="inbound-tabpanel-0"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '15px',
                minHeight: 64,
                color: '#64748b',
                '&.Mui-selected': {
                  color: '#667eea',
                },
                '&:hover': {
                  color: '#667eea',
                  background: 'rgba(102, 126, 234, 0.05)',
                },
              }}
            />
            <Tab
              icon={<BusinessIcon />}
              iconPosition="start"
              label="Company"
              id="inbound-tab-1"
              aria-controls="inbound-tabpanel-1"
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '15px',
                minHeight: 64,
                color: '#64748b',
                '&.Mui-selected': {
                  color: '#667eea',
                },
                '&:hover': {
                  color: '#667eea',
                  background: 'rgba(102, 126, 234, 0.05)',
                },
              }}
            />
          </Tabs>
        </Box>

        {/* Personal Tab Content */}
        <TabPanel value={currentTab} index={0}>
          <Box sx={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            minHeight: 'calc(100vh - 140px)',
            p: 4,
          }}>
            {/* Personal Tab Header with Sync Button */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              {lastSyncAt && (
                <Typography variant="caption" sx={{ color: '#94a3b8', mr: 2 }}>
                  Last synced: {lastSyncAt.toLocaleString()}
                </Typography>
              )}
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

                    {/* LinkedIn Performance Chart */}
                    {chartData.length > 0 && (
                      <Box sx={{ mt: 4 }}>
                        <Card sx={{
                          borderRadius: 3,
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                          background: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(20px)',
                          border: '1px solid rgba(226, 232, 240, 0.5)',
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
                              LinkedIn Performance Over Time
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
                              Post engagement and reach trends
                            </Typography>

                            <Box sx={{ height: 400 }}>
                              <LineChart
                                dataset={chartData}
                                xAxis={[{ dataKey: 'label', scaleType: 'point' }]}
                                yAxis={[{ label: 'Count' }]}
                                series={[
                                  {
                                    dataKey: 'impressions',
                                    label: 'Impressions',
                                    color: '#0077b5',
                                    curve: 'monotoneX',
                                  },
                                  {
                                    dataKey: 'engagement',
                                    label: 'Engagement',
                                    color: '#4caf50',
                                    curve: 'monotoneX',
                                  },
                                ]}
                                margin={{ left: 70, right: 20, top: 20, bottom: 60 }}
                                grid={{ vertical: true, horizontal: true }}
                              />
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>
                    )}

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
        </TabPanel>

        {/* Company Tab Content */}
        <TabPanel value={currentTab} index={1}>
          <Box sx={{
            background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
            minHeight: 'calc(100vh - 140px)',
            p: 4,
          }}>
            <CompanyWebsiteAnalytics />
          </Box>
        </TabPanel>
      </Box>
    </ThemeProvider>
  );
};

export default OutboundAnalytics;
