import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Paper,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Visibility as VisibilityIcon,
  People as PeopleIcon,
  PersonAdd as PersonAddIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { LineChart } from '@mui/x-charts/LineChart';
import { BarChart } from '@mui/x-charts/BarChart';
import {
  LinkedInDiscovery,
  LinkedInDailyEngagement,
  LinkedInTopPost,
  LinkedInFollowers,
  LinkedInDemographics,
  LinkedInDemographicEntry,
} from '../../../types/contentAnalytics';

interface LinkedInAnalyticsPanelProps {
  discovery: LinkedInDiscovery | null;
  engagement: LinkedInDailyEngagement[];
  posts: LinkedInTopPost[];
  followers: LinkedInFollowers | null;
  demographics: LinkedInDemographics | null;
  loading: boolean;
}

const metricCardSx = {
  flex: '1 1 200px',
  p: 3,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  borderRadius: 2,
  color: 'white',
};

const glassCardSx = {
  borderRadius: 3,
  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
  background: 'rgba(255, 255, 255, 0.95)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(226, 232, 240, 0.5)',
};

const tableHeaderSx = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
};

const headerCellSx = {
  color: 'white',
  fontWeight: 600,
};

type TimeRange = '7d' | '30d' | '90d' | 'all';
type SortKey = 'url' | 'publishDate' | 'impressions' | 'engagements' | 'engagementRate' | 'contentType';
type SortDirection = 'asc' | 'desc';

const parsePublishDate = (dateStr: string): Date => {
  // Handle "MM/DD/YYYY" format
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    return new Date(Number(slashMatch[3]), Number(slashMatch[1]) - 1, Number(slashMatch[2]));
  }
  // Handle "YYYY-MM-DD" format
  return new Date(dateStr);
};

const DemographicBar: React.FC<{ entry: LinkedInDemographicEntry }> = ({ entry }) => {
  const pct = parseFloat(entry.percentage) || 0;
  return (
    <Box sx={{ mb: 1.5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 500, color: '#334155' }}>
          {entry.name}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#667eea' }}>
          {entry.percentage}%
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(pct, 100)}
        sx={{
          height: 8,
          borderRadius: 4,
          backgroundColor: 'rgba(102, 126, 234, 0.1)',
          '& .MuiLinearProgress-bar': {
            borderRadius: 4,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          },
        }}
      />
    </Box>
  );
};

const DemographicSection: React.FC<{ title: string; entries: LinkedInDemographicEntry[] }> = ({
  title,
  entries,
}) => (
  <Accordion
    defaultExpanded={false}
    sx={{
      ...glassCardSx,
      mb: 1,
      '&:before': { display: 'none' },
    }}
  >
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
    </AccordionSummary>
    <AccordionDetails>
      {entries.map((entry, idx) => (
        <DemographicBar key={idx} entry={entry} />
      ))}
    </AccordionDetails>
  </Accordion>
);

const LinkedInAnalyticsPanel: React.FC<LinkedInAnalyticsPanelProps> = ({
  discovery,
  engagement,
  posts,
  followers,
  demographics,
  loading,
}) => {
  // Time range, sort, and search state
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [sortKey, setSortKey] = useState<SortKey>('impressions');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate cutoff date based on time range
  const cutoffDate = useMemo(() => {
    if (timeRange === 'all') return null;
    const now = new Date();
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }, [timeRange]);

  // Filter out zero-impression days and prepare chart data (with time range filter)
  const chartData = useMemo(() => {
    const activeDays = engagement.filter((d) => {
      if (d.impressions <= 0) return false;
      if (cutoffDate) {
        const date = parsePublishDate(d.date);
        if (date < cutoffDate) return false;
      }
      return true;
    });
    return activeDays.map((d, idx) => ({
      label: idx % 30 === 0 ? d.date : '',
      date: d.date,
      impressions: d.impressions,
      engagements: d.engagements,
    }));
  }, [engagement, cutoffDate]);

  // X-axis labels: show every ~30th to avoid crowding
  const xLabels = useMemo(() => chartData.map((d) => d.date), [chartData]);
  const xTickInterval = useMemo(() => {
    if (xLabels.length <= 12) return undefined; // show all if few
    const step = Math.max(1, Math.floor(xLabels.length / 12));
    return (_value: string, index: number) => index % step === 0;
  }, [xLabels]);

  // Aggregate posts by month for the bar chart
  const monthlyPostData = useMemo(() => {
    const monthMap: Record<string, { impressions: number; engagements: number }> = {};

    posts.forEach((post) => {
      const date = parsePublishDate(post.publishDate);
      // Apply time range filter
      if (cutoffDate && date < cutoffDate) return;

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap[key]) {
        monthMap[key] = { impressions: 0, engagements: 0 };
      }
      monthMap[key].impressions += post.impressions;
      monthMap[key].engagements += post.engagements;
    });

    return Object.entries(monthMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, data]) => {
        const [year, month] = key.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const label = `${monthNames[Number(month) - 1]} ${year}`;
        return { label, impressions: data.impressions, engagements: data.engagements };
      });
  }, [posts, cutoffDate]);

  // Filter and sort posts
  const sortedPosts = useMemo(() => {
    const lowerSearch = searchQuery.toLowerCase();
    const filtered = posts.filter((post) => {
      // Time range filter
      if (cutoffDate) {
        const date = parsePublishDate(post.publishDate);
        if (date < cutoffDate) return false;
      }
      // Text search filter
      if (lowerSearch && !post.url.toLowerCase().includes(lowerSearch)) return false;
      return true;
    });

    return filtered.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'url':
          cmp = a.url.localeCompare(b.url);
          break;
        case 'publishDate':
          cmp = parsePublishDate(a.publishDate).getTime() - parsePublishDate(b.publishDate).getTime();
          break;
        case 'impressions':
          cmp = a.impressions - b.impressions;
          break;
        case 'engagements':
          cmp = a.engagements - b.engagements;
          break;
        case 'engagementRate':
          cmp = a.engagementRate - b.engagementRate;
          break;
        case 'contentType':
          cmp = (a.contentType || '').localeCompare(b.contentType || '');
          break;
      }
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [posts, cutoffDate, searchQuery, sortKey, sortDirection]);

  const hasData =
    discovery !== null || engagement.length > 0 || posts.length > 0 || followers !== null;

  // Loading state
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  // No data state
  if (!hasData) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        No LinkedIn analytics data available. Sync your LinkedIn data to see insights here.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Metric Cards */}
      <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
        <Box sx={metricCardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, opacity: 0.9 }}>
            <VisibilityIcon sx={{ fontSize: 18, mr: 1 }} />
            <Typography variant="body2">Total Impressions</Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {(discovery?.overallImpressions ?? 0).toLocaleString()}
          </Typography>
        </Box>

        <Box sx={metricCardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, opacity: 0.9 }}>
            <PeopleIcon sx={{ fontSize: 18, mr: 1 }} />
            <Typography variant="body2">Members Reached</Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {(discovery?.membersReached ?? 0).toLocaleString()}
          </Typography>
        </Box>

        <Box sx={metricCardSx}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, opacity: 0.9 }}>
            <PersonAddIcon sx={{ fontSize: 18, mr: 1 }} />
            <Typography variant="body2">Total Followers</Typography>
          </Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            {(followers?.totalFollowers ?? 0).toLocaleString()}
          </Typography>
        </Box>
      </Box>

      {/* Daily Engagement Chart */}
      {chartData.length > 0 && (
        <Card sx={{ ...glassCardSx, mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mb: 1,
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Daily Engagement
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
              Impressions and engagements over time (days with activity)
            </Typography>

            <Box sx={{ height: 400 }}>
              <LineChart
                dataset={chartData}
                xAxis={[
                  {
                    dataKey: 'date',
                    scaleType: 'point',
                    tickLabelInterval: xTickInterval,
                  },
                ]}
                yAxis={[{ label: 'Count' }]}
                series={[
                  {
                    dataKey: 'impressions',
                    label: 'Impressions',
                    color: '#0077b5',
                    curve: 'monotoneX',
                  },
                  {
                    dataKey: 'engagements',
                    label: 'Engagements',
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
      )}

      {/* Monthly Post Performance Bar Chart */}
      {monthlyPostData.length > 0 && (
        <Card sx={{ ...glassCardSx, mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 700,
                mb: 1,
                background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Monthly Post Performance
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 4 }}>
              Impressions and engagements aggregated by month
            </Typography>

            <Box sx={{ height: 400 }}>
              <BarChart
                dataset={monthlyPostData}
                xAxis={[
                  {
                    dataKey: 'label',
                    scaleType: 'band',
                  },
                ]}
                yAxis={[{ label: 'Count' }]}
                series={[
                  {
                    dataKey: 'impressions',
                    label: 'Impressions',
                    color: '#0077b5',
                  },
                  {
                    dataKey: 'engagements',
                    label: 'Engagements',
                    color: '#4caf50',
                  },
                ]}
                margin={{ left: 70, right: 20, top: 20, bottom: 60 }}
                grid={{ vertical: true, horizontal: true }}
              />
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Top Posts Table */}
      {posts.length > 0 && (
        <Card sx={{ ...glassCardSx, mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
              Top Posts
            </Typography>

            {/* Time Range Filter & Search */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
              <ToggleButtonGroup
                value={timeRange}
                exclusive
                onChange={(_e, val) => { if (val !== null) setTimeRange(val as TimeRange); }}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    textTransform: 'none',
                    fontWeight: 600,
                    px: 2,
                    '&.Mui-selected': {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4192 100%)',
                      },
                    },
                  },
                }}
              >
                <ToggleButton value="7d">7d</ToggleButton>
                <ToggleButton value="30d">30d</ToggleButton>
                <ToggleButton value="90d">90d</ToggleButton>
                <ToggleButton value="all">All</ToggleButton>
              </ToggleButtonGroup>

              <TextField
                size="small"
                placeholder="Search by URL..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 240 }}
              />
            </Box>

            <TableContainer
              component={Paper}
              sx={{ borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            >
              <Table>
                <TableHead>
                  <TableRow sx={tableHeaderSx}>
                    <TableCell sx={headerCellSx}>
                      <TableSortLabel
                        active={sortKey === 'url'}
                        direction={sortKey === 'url' ? sortDirection : 'asc'}
                        onClick={() => {
                          if (sortKey === 'url') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          else { setSortKey('url'); setSortDirection('asc'); }
                        }}
                        sx={{
                          color: 'white !important',
                          '& .MuiTableSortLabel-icon': { color: 'white !important' },
                          '&.Mui-active': { color: 'white !important' },
                          '&.Mui-active .MuiTableSortLabel-icon': { color: 'white !important' },
                        }}
                      >
                        Post URL
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={headerCellSx}>
                      <TableSortLabel
                        active={sortKey === 'publishDate'}
                        direction={sortKey === 'publishDate' ? sortDirection : 'asc'}
                        onClick={() => {
                          if (sortKey === 'publishDate') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          else { setSortKey('publishDate'); setSortDirection('desc'); }
                        }}
                        sx={{
                          color: 'white !important',
                          '& .MuiTableSortLabel-icon': { color: 'white !important' },
                          '&.Mui-active': { color: 'white !important' },
                          '&.Mui-active .MuiTableSortLabel-icon': { color: 'white !important' },
                        }}
                      >
                        Date
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={headerCellSx}>
                      <TableSortLabel
                        active={sortKey === 'impressions'}
                        direction={sortKey === 'impressions' ? sortDirection : 'asc'}
                        onClick={() => {
                          if (sortKey === 'impressions') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          else { setSortKey('impressions'); setSortDirection('desc'); }
                        }}
                        sx={{
                          color: 'white !important',
                          '& .MuiTableSortLabel-icon': { color: 'white !important' },
                          '&.Mui-active': { color: 'white !important' },
                          '&.Mui-active .MuiTableSortLabel-icon': { color: 'white !important' },
                        }}
                      >
                        Impressions
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={headerCellSx}>
                      <TableSortLabel
                        active={sortKey === 'engagements'}
                        direction={sortKey === 'engagements' ? sortDirection : 'asc'}
                        onClick={() => {
                          if (sortKey === 'engagements') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          else { setSortKey('engagements'); setSortDirection('desc'); }
                        }}
                        sx={{
                          color: 'white !important',
                          '& .MuiTableSortLabel-icon': { color: 'white !important' },
                          '&.Mui-active': { color: 'white !important' },
                          '&.Mui-active .MuiTableSortLabel-icon': { color: 'white !important' },
                        }}
                      >
                        Engagements
                      </TableSortLabel>
                    </TableCell>
                    <TableCell align="right" sx={headerCellSx}>
                      <TableSortLabel
                        active={sortKey === 'engagementRate'}
                        direction={sortKey === 'engagementRate' ? sortDirection : 'asc'}
                        onClick={() => {
                          if (sortKey === 'engagementRate') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          else { setSortKey('engagementRate'); setSortDirection('desc'); }
                        }}
                        sx={{
                          color: 'white !important',
                          '& .MuiTableSortLabel-icon': { color: 'white !important' },
                          '&.Mui-active': { color: 'white !important' },
                          '&.Mui-active .MuiTableSortLabel-icon': { color: 'white !important' },
                        }}
                      >
                        Engagement Rate
                      </TableSortLabel>
                    </TableCell>
                    <TableCell sx={headerCellSx}>
                      <TableSortLabel
                        active={sortKey === 'contentType'}
                        direction={sortKey === 'contentType' ? sortDirection : 'asc'}
                        onClick={() => {
                          if (sortKey === 'contentType') setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
                          else { setSortKey('contentType'); setSortDirection('asc'); }
                        }}
                        sx={{
                          color: 'white !important',
                          '& .MuiTableSortLabel-icon': { color: 'white !important' },
                          '&.Mui-active': { color: 'white !important' },
                          '&.Mui-active .MuiTableSortLabel-icon': { color: 'white !important' },
                        }}
                      >
                        Type
                      </TableSortLabel>
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedPosts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#94a3b8' }}>
                        No posts match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedPosts.map((post) => (
                      <TableRow
                        key={post.id}
                        sx={{
                          '&:nth-of-type(odd)': { background: '#f8fafc' },
                          '&:hover': { background: '#f1f5f9' },
                        }}
                      >
                        <TableCell sx={{ maxWidth: 300 }}>
                          <Typography
                            component="a"
                            href={post.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            variant="body2"
                            sx={{
                              color: '#0077b5',
                              textDecoration: 'none',
                              '&:hover': { textDecoration: 'underline' },
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'block',
                              maxWidth: 280,
                            }}
                          >
                            {post.url}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ color: '#64748b' }}>
                            {post.publishDate}
                          </Typography>
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#0077b5' }}>
                          {post.impressions.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600 }}>
                          {post.engagements.toLocaleString()}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 600, color: '#667eea' }}>
                          {post.engagementRate.toFixed(2)}%
                        </TableCell>
                        <TableCell>
                          {post.contentType ? (
                            <Chip
                              label={post.contentType}
                              size="small"
                              sx={{
                                fontWeight: 600,
                                fontSize: '0.7rem',
                                textTransform: 'capitalize',
                                backgroundColor: post.contentType === 'opinion' ? 'rgba(102, 126, 234, 0.1)'
                                  : post.contentType === 'insight' ? 'rgba(76, 175, 80, 0.1)'
                                  : post.contentType === 'tutorial-promo' ? 'rgba(255, 109, 0, 0.1)'
                                  : 'rgba(148, 163, 184, 0.1)',
                                color: post.contentType === 'opinion' ? '#667eea'
                                  : post.contentType === 'insight' ? '#4caf50'
                                  : post.contentType === 'tutorial-promo' ? '#FF6D00'
                                  : '#64748b',
                              }}
                            />
                          ) : (
                            <Typography variant="body2" sx={{ color: '#94a3b8' }}>—</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}

      {/* Demographics Section */}
      {demographics && (
        <Card sx={{ ...glassCardSx, mb: 4 }}>
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3 }}>
              Audience Demographics
            </Typography>

            {demographics.company.length > 0 && (
              <DemographicSection title="Company" entries={demographics.company} />
            )}
            {demographics.seniority.length > 0 && (
              <DemographicSection title="Seniority" entries={demographics.seniority} />
            )}
            {demographics.jobTitle.length > 0 && (
              <DemographicSection title="Job Title" entries={demographics.jobTitle} />
            )}
            {demographics.location.length > 0 && (
              <DemographicSection title="Location" entries={demographics.location} />
            )}
            {demographics.companySize.length > 0 && (
              <DemographicSection title="Company Size" entries={demographics.companySize} />
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default LinkedInAnalyticsPanel;
