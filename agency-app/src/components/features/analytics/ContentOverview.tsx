import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TableSortLabel,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  InputAdornment,
} from '@mui/material';
import { Search as SearchIcon } from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import { LineChart } from '@mui/x-charts/LineChart';
import {
  ContentAnalyticsSummary,
  PlatformPerformance,
  LinkedInTopPost,
  TDSArticle,
  MediumStory,
} from '../../../types/contentAnalytics';

interface ContentOverviewProps {
  summary: ContentAnalyticsSummary | null;
  linkedInPosts?: LinkedInTopPost[];
  tdsArticles?: TDSArticle[];
  mediumStories?: MediumStory[];
  loading: boolean;
}

type MonthlyReachDataPoint = {
  [key: string]: string | number;
  month: string;
  linkedIn: number;
  tds: number;
  medium: number;
};

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: '#0077b5',
  tds: '#1a1a2e',
  medium: '#00ab6c',
};

const PLATFORM_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  tds: 'TDS',
  medium: 'Medium',
};

const cardStyle = {
  borderRadius: 3,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(20px)',
};

const metricCardStyle = {
  flex: '1 1 200px',
  p: 3,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: 2,
  color: 'white',
};

const tableHeaderStyle = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

const tableHeaderCellStyle = {
  color: 'white',
  fontWeight: 600,
};

type SortKey = 'title' | 'platform' | 'reach' | 'engagement';
type SortDir = 'asc' | 'desc';

const formatMonthKey = (dateStr: string): string => {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${monthNames[month]} ${year}`;
  } catch {
    return '';
  }
};

const sortMonthKeys = (a: string, b: string): number => {
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const [aMonth, aYear] = a.split(' ');
  const [bMonth, bYear] = b.split(' ');
  const yearDiff = parseInt(aYear) - parseInt(bYear);
  if (yearDiff !== 0) return yearDiff;
  return monthNames.indexOf(aMonth) - monthNames.indexOf(bMonth);
};

const ContentOverview: React.FC<ContentOverviewProps> = ({ summary, linkedInPosts, tdsArticles, mediumStories, loading }) => {
  const [sortKey, setSortKey] = useState<SortKey>('reach');
  const [sortDirection, setSortDirection] = useState<SortDir>('desc');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [titleSearch, setTitleSearch] = useState<string>('');

  const crossPlatform = summary?.crossPlatform || {
    totalReach: 0,
    totalEngagement: 0,
    totalContentPieces: 0,
    totalEarnings: 0,
    topPerformingContent: [],
    platformPerformance: [],
  };
  const platforms = summary?.platforms || { linkedin: null, tds: null, medium: null };

  const performanceArray = Array.isArray(crossPlatform.platformPerformance)
    ? crossPlatform.platformPerformance
    : [];
  const topContentArray = Array.isArray(crossPlatform.topPerformingContent)
    ? crossPlatform.topPerformingContent
    : [];

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedContent = useMemo(() => {
    let data = topContentArray.slice(0, 10);

    // Platform filter
    if (platformFilter !== 'all') {
      data = data.filter(c => c.platform === platformFilter);
    }

    // Title search
    if (titleSearch.trim()) {
      const query = titleSearch.trim().toLowerCase();
      data = data.filter(c => (c.title || '').toLowerCase().includes(query));
    }

    // Sort
    data = [...data].sort((a, b) => {
      let aVal: string | number;
      let bVal: string | number;
      switch (sortKey) {
        case 'title':
          aVal = (a.title || '').toLowerCase();
          bVal = (b.title || '').toLowerCase();
          break;
        case 'platform':
          aVal = (PLATFORM_LABELS[a.platform] || a.platform || '').toLowerCase();
          bVal = (PLATFORM_LABELS[b.platform] || b.platform || '').toLowerCase();
          break;
        case 'reach':
          aVal = a.reach || 0;
          bVal = b.reach || 0;
          break;
        case 'engagement':
          aVal = a.engagement || 0;
          bVal = b.engagement || 0;
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return data;
  }, [topContentArray, platformFilter, titleSearch, sortKey, sortDirection]);

  const monthlyReachData = useMemo<MonthlyReachDataPoint[]>(() => {
    const monthMap: Record<string, { linkedIn: number; tds: number; medium: number }> = {};

    // LinkedIn: group by publishDate month, sum impressions
    const liPosts = Array.isArray(linkedInPosts) ? linkedInPosts : [];
    liPosts.forEach(post => {
      const key = formatMonthKey(post.publishDate || '');
      if (!key) return;
      if (!monthMap[key]) monthMap[key] = { linkedIn: 0, tds: 0, medium: 0 };
      monthMap[key].linkedIn += post.impressions || 0;
    });

    // TDS: group by publishedDate month, sum pageviewsLifetime
    const tdsArts = Array.isArray(tdsArticles) ? tdsArticles : [];
    tdsArts.forEach(article => {
      const key = formatMonthKey(article.publishedDate || '');
      if (!key) return;
      if (!monthMap[key]) monthMap[key] = { linkedIn: 0, tds: 0, medium: 0 };
      monthMap[key].tds += article.pageviewsLifetime || 0;
    });

    // Medium: group by publishDate month, sum views
    const medStories = Array.isArray(mediumStories) ? mediumStories : [];
    medStories.forEach(story => {
      const key = formatMonthKey(story.publishDate || '');
      if (!key) return;
      if (!monthMap[key]) monthMap[key] = { linkedIn: 0, tds: 0, medium: 0 };
      monthMap[key].medium += story.views || 0;
    });

    // Sort chronologically
    const sortedKeys = Object.keys(monthMap).sort(sortMonthKeys);
    return sortedKeys.map(month => ({
      month,
      linkedIn: monthMap[month].linkedIn,
      tds: monthMap[month].tds,
      medium: monthMap[month].medium,
    }));
  }, [linkedInPosts, tdsArticles, mediumStories]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!summary) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        No content analytics data available. Sync your platforms to get started.
      </Alert>
    );
  }

  // Prepare bar chart data
  const chartData = performanceArray.map((p: PlatformPerformance) => ({
    platform: PLATFORM_LABELS[p.platform] || p.platform,
    avgReachPerPiece: Math.round(p.avgReachPerPiece || 0),
    avgEngagementRate: parseFloat((p.avgEngagementRate || 0).toFixed(2)),
  }));

  const formatSyncDate = (lastSyncAt: any) => {
    try {
      const date = lastSyncAt?.toDate ? lastSyncAt.toDate() : new Date(lastSyncAt);
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };

  return (
    <Box>
      {/* Section 1: Aggregate Metric Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <Box sx={metricCardStyle}>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
            Total Reach
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {(crossPlatform.totalReach || 0).toLocaleString()}
          </Typography>
        </Box>

        <Box sx={metricCardStyle}>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
            Total Engagement
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {(crossPlatform.totalEngagement || 0).toLocaleString()}
          </Typography>
        </Box>

        <Box sx={metricCardStyle}>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
            Total Content Pieces
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {(crossPlatform.totalContentPieces || 0).toLocaleString()}
          </Typography>
        </Box>

        <Box sx={metricCardStyle}>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 1 }}>
            Total Earnings
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            ${(crossPlatform.totalEarnings || 0).toFixed(2)}
          </Typography>
        </Box>
      </Box>

      {/* Section 2: Platform Comparison Bar Chart */}
      {chartData.length > 0 && (
        <Card sx={{ ...cardStyle, mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Platform Comparison
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              Average reach per piece and engagement rate by platform
            </Typography>
            <Box sx={{ height: 350 }}>
              <BarChart
                dataset={chartData}
                xAxis={[{ dataKey: 'platform', scaleType: 'band' }]}
                series={[
                  {
                    dataKey: 'avgReachPerPiece',
                    label: 'Avg Reach/Piece',
                    color: '#667eea',
                  },
                  {
                    dataKey: 'avgEngagementRate',
                    label: 'Avg Engagement Rate (%)',
                    color: '#764ba2',
                  },
                ]}
                margin={{ left: 70, right: 20, top: 20, bottom: 40 }}
                grid={{ horizontal: true }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Section 2b: Monthly Reach Trends Line Chart */}
      {monthlyReachData.length > 0 && (
        <Card sx={{ ...cardStyle, mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Monthly Reach Trends
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              Content reach by platform over time
            </Typography>
            <Box sx={{ height: 350 }}>
              <LineChart
                dataset={monthlyReachData}
                xAxis={[{ dataKey: 'month', scaleType: 'point' }]}
                series={[
                  {
                    dataKey: 'linkedIn',
                    label: 'LinkedIn Impressions',
                    color: '#0077b5',
                    curve: 'monotoneX',
                  },
                  {
                    dataKey: 'tds',
                    label: 'TDS Pageviews',
                    color: '#FF6D00',
                    curve: 'monotoneX',
                  },
                  {
                    dataKey: 'medium',
                    label: 'Medium Views',
                    color: '#00ab6c',
                    curve: 'monotoneX',
                  },
                ]}
                margin={{ left: 70, right: 20, top: 20, bottom: 40 }}
                grid={{ horizontal: true }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Section 3: Platform Summary Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        {/* LinkedIn */}
        <Card sx={{
          ...cardStyle,
          flex: '1 1 280px',
          borderLeft: `4px solid ${PLATFORM_COLORS.linkedin}`,
        }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: PLATFORM_COLORS.linkedin }}>
              LinkedIn
            </Typography>
            {platforms.linkedin ? (
              <>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                  Last synced: {formatSyncDate(platforms.linkedin.lastSyncAt)}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Impressions:</strong> {platforms.linkedin.totalImpressions.toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Posts:</strong> {platforms.linkedin.postCount}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                Not synced
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* TDS */}
        <Card sx={{
          ...cardStyle,
          flex: '1 1 280px',
          borderLeft: `4px solid ${PLATFORM_COLORS.tds}`,
        }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: PLATFORM_COLORS.tds }}>
              TDS
            </Typography>
            {platforms.tds ? (
              <>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                  Last synced: {formatSyncDate(platforms.tds.lastSyncAt)}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Pageviews:</strong> {platforms.tds.totalPageviews.toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Articles:</strong> {platforms.tds.articleCount}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                Not synced
              </Typography>
            )}
          </CardContent>
        </Card>

        {/* Medium */}
        <Card sx={{
          ...cardStyle,
          flex: '1 1 280px',
          borderLeft: `4px solid ${PLATFORM_COLORS.medium}`,
        }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: PLATFORM_COLORS.medium }}>
              Medium
            </Typography>
            {platforms.medium ? (
              <>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                  Last synced: {formatSyncDate(platforms.medium.lastSyncAt)}
                </Typography>
                <Typography variant="body2" sx={{ mb: 0.5 }}>
                  <strong>Views:</strong> {platforms.medium.totalViews.toLocaleString()}
                </Typography>
                <Typography variant="body2">
                  <strong>Stories:</strong> {platforms.medium.storyCount}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" sx={{ color: '#94a3b8', fontStyle: 'italic' }}>
                Not synced
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Section 4: Top Performing Content Table */}
      {topContentArray.length > 0 && (
        <Card sx={{ ...cardStyle }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
              Top Performing Content
            </Typography>

            {/* Filters row */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <ToggleButtonGroup
                value={platformFilter}
                exclusive
                onChange={(_e, val) => { if (val !== null) setPlatformFilter(val); }}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    fontSize: '13px',
                    px: 2,
                    py: 0.5,
                    border: '1px solid rgba(102, 126, 234, 0.3)',
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4292 100%)' },
                    },
                  },
                }}
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="linkedin">LinkedIn</ToggleButton>
                <ToggleButton value="tds">TDS</ToggleButton>
                <ToggleButton value="medium">Medium</ToggleButton>
              </ToggleButtonGroup>

              <TextField
                size="small"
                placeholder="Search by title..."
                value={titleSearch}
                onChange={e => setTitleSearch(e.target.value)}
                sx={{ minWidth: 220 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <Table>
                <TableHead>
                  <TableRow sx={tableHeaderStyle}>
                    <TableCell sx={tableHeaderCellStyle}>
                      <TableSortLabel
                        active={sortKey === 'title'}
                        direction={sortKey === 'title' ? sortDirection : 'asc'}
                        onClick={() => handleSort('title')}
                        sx={{
                          color: 'white !important',
                          '& .MuiTableSortLabel-icon': { color: 'white !important' },
                          '&.Mui-active': { color: 'white !important' },
                          '&.Mui-active .MuiTableSortLabel-icon': { color: 'white !important' },
                        }}
                      >
                        Title
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={tableHeaderCellStyle}>
                      <TableSortLabel
                        active={sortKey === 'platform'}
                        direction={sortKey === 'platform' ? sortDirection : 'asc'}
                        onClick={() => handleSort('platform')}
                        sx={{
                          color: 'white !important',
                          '& .MuiTableSortLabel-icon': { color: 'white !important' },
                          '&.Mui-active': { color: 'white !important' },
                          '&.Mui-active .MuiTableSortLabel-icon': { color: 'white !important' },
                        }}
                      >
                        Platform
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={tableHeaderCellStyle}>
                      <TableSortLabel
                        active={sortKey === 'reach'}
                        direction={sortKey === 'reach' ? sortDirection : 'asc'}
                        onClick={() => handleSort('reach')}
                        sx={{
                          color: 'white !important',
                          '& .MuiTableSortLabel-icon': { color: 'white !important' },
                          '&.Mui-active': { color: 'white !important' },
                          '&.Mui-active .MuiTableSortLabel-icon': { color: 'white !important' },
                        }}
                      >
                        Reach
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={tableHeaderCellStyle}>
                      <TableSortLabel
                        active={sortKey === 'engagement'}
                        direction={sortKey === 'engagement' ? sortDirection : 'asc'}
                        onClick={() => handleSort('engagement')}
                        sx={{
                          color: 'white !important',
                          '& .MuiTableSortLabel-icon': { color: 'white !important' },
                          '&.Mui-active': { color: 'white !important' },
                          '&.Mui-active .MuiTableSortLabel-icon': { color: 'white !important' },
                        }}
                      >
                        Engagement
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredAndSortedContent.map((content, index) => (
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
                          {content.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={PLATFORM_LABELS[content.platform] || content.platform}
                          size="small"
                          sx={{
                            backgroundColor: PLATFORM_COLORS[content.platform] || '#667eea',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#667eea' }}>
                        {(content.reach || 0).toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {(content.engagement || 0).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAndSortedContent.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} align="center" sx={{ py: 3, color: '#94a3b8' }}>
                        No content matches the current filters.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default ContentOverview;
