import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Collapse,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  ThumbUp as LikeIcon,
  ChatBubble as CommentIcon,
  Share as ShareIcon,
  Visibility as ViewIcon,
  ExpandMore as ExpandIcon,
  LinkedIn as LinkedInIcon,
  TrendingUp as TrendingIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { subscribeToCompetitors } from '../../../services/api/competitorService';
import { subscribeToCompetitorPosts, getCompetitorMetrics } from '../../../services/api/competitorPostsService';
import { Competitor, CompetitorPost, CompetitorMetrics } from '../../../types/competitor';

export default function CompetitorContentView() {
  const { user } = useAuth();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [posts, setPosts] = useState<CompetitorPost[]>([]);
  const [metrics, setMetrics] = useState<CompetitorMetrics | null>(null);
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Subscribe to competitors
  useEffect(() => {
    if (!user) return;

    const unsubscribe = subscribeToCompetitors((data) => {
      setCompetitors(data);

      // If we have competitors and no tab selected, select first
      if (data.length > 0 && selectedTab >= data.length) {
        setSelectedTab(0);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Subscribe to posts for selected competitor
  useEffect(() => {
    if (!user || competitors.length === 0) {
      setPosts([]);
      setMetrics(null);
      return;
    }

    const selectedCompetitor = competitors[selectedTab];
    if (!selectedCompetitor) return;

    setLoading(true);

    const unsubscribe = subscribeToCompetitorPosts(
      user.uid,
      selectedCompetitor.id,
      (data) => {
        setPosts(data);
        setLoading(false);
      }
    );

    // Load metrics
    getCompetitorMetrics(user.uid, selectedCompetitor.id, selectedCompetitor.name)
      .then(setMetrics)
      .catch(console.error);

    return () => unsubscribe();
  }, [user, competitors, selectedTab]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
    setExpandedPost(null); // Collapse any expanded post
  };

  const getPostTypeColor = (type: string): string => {
    const colors: Record<string, string> = {
      text: '#1976d2',
      image: '#388e3c',
      video: '#d32f2f',
      carousel: '#f57c00',
      article: '#7b1fa2',
      poll: '#0288d1',
      document: '#5d4037',
    };
    return colors[type] || '#757575';
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  if (competitors.length === 0) {
    return (
      <Alert severity="info">
        No competitors tracked yet. Add competitors and sync their posts to see content here.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Metrics Cards */}
      {metrics && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: '1fr 1fr',
              md: '1fr 1fr 1fr 1fr',
            },
            gap: 2,
            mb: 3,
          }}
        >
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="caption">
                    Total Posts
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {metrics.totalPosts}
                  </Typography>
                </Box>
                <LinkedInIcon sx={{ fontSize: 40, color: '#0077B5', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="caption">
                    Total Engagement
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatNumber(metrics.totalEngagement)}
                  </Typography>
                </Box>
                <TrendingIcon sx={{ fontSize: 40, color: '#4caf50', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="caption">
                    Avg Engagement Rate
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {metrics.avgEngagementRate.toFixed(2)}%
                  </Typography>
                </Box>
                <LikeIcon sx={{ fontSize: 40, color: '#ff5722', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography color="textSecondary" variant="caption">
                    Total Impressions
                  </Typography>
                  <Typography variant="h5" fontWeight="bold">
                    {formatNumber(metrics.totalImpressions)}
                  </Typography>
                </Box>
                <ViewIcon sx={{ fontSize: 40, color: '#9c27b0', opacity: 0.3 }} />
              </Box>
            </CardContent>
          </Card>
        </Box>
      )}

      {/* Competitor Tabs */}
      <Paper sx={{ mb: 2 }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
            },
            '& .Mui-selected': {
              color: '#667eea',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#667eea',
            },
          }}
        >
          {competitors.map((competitor, index) => (
            <Tab key={competitor.id} label={competitor.name} />
          ))}
        </Tabs>
      </Paper>

      {/* Loading */}
      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Posts Table */}
      {posts.length === 0 ? (
        <Alert severity="info">
          No posts synced for {competitors[selectedTab]?.name}. Use the "Sync Competitor Posts" button to add posts.
        </Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell width="50">#</TableCell>
                <TableCell>Content</TableCell>
                <TableCell align="center">Type</TableCell>
                <TableCell align="center">Posted</TableCell>
                <TableCell align="center">
                  <LikeIcon fontSize="small" />
                </TableCell>
                <TableCell align="center">
                  <CommentIcon fontSize="small" />
                </TableCell>
                <TableCell align="center">
                  <ShareIcon fontSize="small" />
                </TableCell>
                <TableCell align="center">
                  <ViewIcon fontSize="small" />
                </TableCell>
                <TableCell align="center">Engagement</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {posts.map((post, index) => {
                const isExpanded = expandedPost === post.id;
                const engagement = (post.likes || 0) + (post.comments || 0) + (post.shares || 0);
                const engagementRate = post.impressions
                  ? ((engagement / post.impressions) * 100).toFixed(2)
                  : '—';

                return (
                  <React.Fragment key={post.id}>
                    <TableRow hover>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>
                        <Box>
                          <Typography
                            variant="body2"
                            sx={{
                              display: '-webkit-box',
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: 'vertical',
                              overflow: 'hidden',
                              cursor: 'pointer',
                            }}
                            onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                          >
                            {post.content}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => setExpandedPost(isExpanded ? null : post.id)}
                            sx={{
                              transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.3s',
                            }}
                          >
                            <ExpandIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={post.postType}
                          size="small"
                          sx={{
                            bgcolor: getPostTypeColor(post.postType),
                            color: 'white',
                            fontWeight: 500,
                            fontSize: '0.75rem',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">{post.postedDate}</Typography>
                      </TableCell>
                      <TableCell align="center">{formatNumber(post.likes || 0)}</TableCell>
                      <TableCell align="center">{formatNumber(post.comments || 0)}</TableCell>
                      <TableCell align="center">{formatNumber(post.shares || 0)}</TableCell>
                      <TableCell align="center">
                        {post.impressions ? formatNumber(post.impressions) : '—'}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={engagementRate !== '—' ? `${engagementRate}%` : '—'}
                          size="small"
                          sx={{
                            bgcolor: '#f5f5f5',
                            fontWeight: 600,
                          }}
                        />
                      </TableCell>
                    </TableRow>

                    {/* Expanded Content Row */}
                    <TableRow>
                      <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={9}>
                        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                          <Box sx={{ margin: 2, bgcolor: '#f9f9f9', p: 2, borderRadius: 1 }}>
                            <Typography variant="body1" paragraph>
                              {post.content}
                            </Typography>

                            {post.hashtags.length > 0 && (
                              <Box mb={1}>
                                <Typography variant="caption" color="textSecondary" mr={1}>
                                  Hashtags:
                                </Typography>
                                {post.hashtags.map((tag, i) => (
                                  <Chip
                                    key={i}
                                    label={`#${tag}`}
                                    size="small"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                  />
                                ))}
                              </Box>
                            )}

                            {post.mentions.length > 0 && (
                              <Box mb={1}>
                                <Typography variant="caption" color="textSecondary" mr={1}>
                                  Mentions:
                                </Typography>
                                {post.mentions.map((mention, i) => (
                                  <Chip
                                    key={i}
                                    label={`@${mention}`}
                                    size="small"
                                    sx={{ mr: 0.5, mb: 0.5 }}
                                  />
                                ))}
                              </Box>
                            )}

                            {post.mediaInfo && (
                              <Box>
                                <Typography variant="caption" color="textSecondary">
                                  Media: {post.mediaInfo.type}
                                  {post.mediaInfo.count && ` (${post.mediaInfo.count} items)`}
                                  {post.mediaInfo.description && ` - ${post.mediaInfo.description}`}
                                </Typography>
                              </Box>
                            )}
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
