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
  TableSortLabel,
  Paper,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Visibility as ViewsIcon,
  MenuBook as ReadsIcon,
  AttachMoney as EarningsIcon,
  Article as StoriesIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import { MediumSummary, MediumStory } from '../../../types/contentAnalytics';

interface MediumAnalyticsPanelProps {
  summary: MediumSummary | null;
  stories: MediumStory[];
  loading: boolean;
}

type SortField = 'title' | 'readTime' | 'presentations' | 'views' | 'reads' | 'earnings' | 'readRate' | 'publishDate';
type SortDirection = 'asc' | 'desc';
type TimeRange = '7d' | '30d' | '90d' | 'all';

const parsePublishDate = (dateStr: string): Date | null => {
  // Try YYYY-MM-DD format first
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr + 'T00:00:00');
    return isNaN(d.getTime()) ? null : d;
  }
  // Try "Mar 16, 2026" style format
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? null : d;
};

const MediumAnalyticsPanel: React.FC<MediumAnalyticsPanelProps> = ({ summary, stories, loading }) => {
  const [sortField, setSortField] = useState<SortField>('views');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredStories = useMemo(() => {
    let result = stories;

    // Time range filter
    if (timeRange !== 'all') {
      const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
      const days = daysMap[timeRange];
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      cutoff.setHours(0, 0, 0, 0);

      result = result.filter((story) => {
        const date = parsePublishDate(story.publishDate);
        return date ? date >= cutoff : false;
      });
    }

    // Text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((story) => story.title.toLowerCase().includes(query));
    }

    return result;
  }, [stories, timeRange, searchQuery]);

  const filteredTotals = useMemo(() => {
    return {
      views: filteredStories.reduce((sum, s) => sum + s.views, 0),
      reads: filteredStories.reduce((sum, s) => sum + s.reads, 0),
      earnings: filteredStories.reduce((sum, s) => sum + s.earnings, 0),
      count: filteredStories.length,
    };
  }, [filteredStories]);

  const sortedStories = useMemo(() => {
    return [...filteredStories].sort((a, b) => {
      const dir = sortDirection === 'asc' ? 1 : -1;

      switch (sortField) {
        case 'title':
          return dir * a.title.localeCompare(b.title);
        case 'readTime':
          return dir * a.readTime.localeCompare(b.readTime);
        case 'presentations': {
          const aVal = a.presentations ?? -1;
          const bVal = b.presentations ?? -1;
          return dir * (aVal - bVal);
        }
        case 'views':
          return dir * (a.views - b.views);
        case 'reads':
          return dir * (a.reads - b.reads);
        case 'earnings':
          return dir * (a.earnings - b.earnings);
        case 'readRate': {
          const aRate = a.views > 0 ? a.reads / a.views : 0;
          const bRate = b.views > 0 ? b.reads / b.views : 0;
          return dir * (aRate - bRate);
        }
        case 'publishDate':
          return dir * a.publishDate.localeCompare(b.publishDate);
        default:
          return 0;
      }
    });
  }, [filteredStories, sortField, sortDirection]);

  const chartData = useMemo(() => {
    const top10 = [...filteredStories]
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);
    return top10.map((s) => ({
      label: s.title.length > 20 ? s.title.slice(0, 20) + '...' : s.title,
      views: s.views,
      reads: s.reads,
    }));
  }, [filteredStories]);

  const formatMonth = (monthStr: string): string => {
    try {
      const date = new Date(monthStr + '-01');
      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } catch {
      return monthStr;
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!summary && stories.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        No Medium analytics data available.
      </Alert>
    );
  }

  return (
    <Box>
      {/* Current Month Banner */}
      {summary?.currentMonth && (
        <Card sx={{
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '2px solid #00ab6c',
          mb: 3,
        }}>
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
                {formatMonth(summary.currentMonth.month)}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label={`${summary.currentMonth.presentations.toLocaleString()} Presentations`}
                  size="small"
                  sx={{ background: 'rgba(0, 171, 108, 0.1)', color: '#00ab6c', fontWeight: 600 }}
                />
                <Chip
                  label={`${summary.currentMonth.views.toLocaleString()} Views`}
                  size="small"
                  sx={{ background: 'rgba(0, 171, 108, 0.1)', color: '#00ab6c', fontWeight: 600 }}
                />
                <Chip
                  label={`${summary.currentMonth.reads.toLocaleString()} Reads`}
                  size="small"
                  sx={{ background: 'rgba(0, 171, 108, 0.1)', color: '#00ab6c', fontWeight: 600 }}
                />
                <Chip
                  label={`+${summary.currentMonth.followersGained} Followers`}
                  size="small"
                  sx={{ background: 'rgba(0, 171, 108, 0.1)', color: '#00ab6c', fontWeight: 600 }}
                />
                <Chip
                  label={`+${summary.currentMonth.subscribersGained} Subscribers`}
                  size="small"
                  sx={{ background: 'rgba(0, 171, 108, 0.1)', color: '#00ab6c', fontWeight: 600 }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Metric Cards */}
      {summary && (
        <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
          <Box sx={{
            flex: '1 1 200px',
            p: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            color: 'white',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, opacity: 0.9 }}>
              <ViewsIcon sx={{ fontSize: 20, mr: 1 }} />
              <Typography variant="body2">Total Views</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {(timeRange === 'all' && !searchQuery.trim() ? summary.totalViews : filteredTotals.views).toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{
            flex: '1 1 200px',
            p: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            color: 'white',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, opacity: 0.9 }}>
              <ReadsIcon sx={{ fontSize: 20, mr: 1 }} />
              <Typography variant="body2">Total Reads</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {(timeRange === 'all' && !searchQuery.trim() ? summary.totalReads : filteredTotals.reads).toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{
            flex: '1 1 200px',
            p: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            color: 'white',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, opacity: 0.9 }}>
              <EarningsIcon sx={{ fontSize: 20, mr: 1 }} />
              <Typography variant="body2">Total Earnings</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              ${(timeRange === 'all' && !searchQuery.trim() ? summary.totalEarnings : filteredTotals.earnings).toFixed(2)}
            </Typography>
          </Box>

          <Box sx={{
            flex: '1 1 200px',
            p: 3,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: 2,
            color: 'white',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, opacity: 0.9 }}>
              <StoriesIcon sx={{ fontSize: 20, mr: 1 }} />
              <Typography variant="body2">Stories Count</Typography>
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              {(timeRange === 'all' && !searchQuery.trim() ? summary.totalStories : filteredTotals.count).toLocaleString()}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Filter Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(_e, value) => { if (value !== null) setTimeRange(value); }}
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
          <ToggleButton value="7d">7d</ToggleButton>
          <ToggleButton value="30d">30d</ToggleButton>
          <ToggleButton value="90d">90d</ToggleButton>
          <ToggleButton value="all">All</ToggleButton>
        </ToggleButtonGroup>

        <TextField
          placeholder="Search stories..."
          size="small"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: 240 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {/* Trend Chart */}
      {chartData.length > 0 && (
        <Card sx={{
          borderRadius: 3,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(226, 232, 240, 0.5)',
          mb: 3,
        }}>
          <CardContent sx={{ p: 3 }}>
            <Typography variant="h5" sx={{
              fontWeight: 700,
              mb: 1,
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}>
              Story Performance
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              Views vs Reads (top 10 by views)
            </Typography>
            <BarChart
              height={400}
              dataset={chartData}
              xAxis={[{
                scaleType: 'band',
                dataKey: 'label',
              }]}
              yAxis={[{
                label: 'Count',
              }]}
              series={[
                { dataKey: 'views', label: 'Views', color: '#00ab6c' },
                { dataKey: 'reads', label: 'Reads', color: '#667eea' },
              ]}
              margin={{ left: 70, right: 20, top: 20, bottom: 80 }}
              grid={{ vertical: true, horizontal: true }}
            />
          </CardContent>
        </Card>
      )}

      {/* Stories Table */}
      {sortedStories.length > 0 && (
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
            All Stories
          </Typography>
          <TableContainer component={Paper} sx={{
            borderRadius: 2,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          }}>
            <Table>
              <TableHead>
                <TableRow sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>
                    <TableSortLabel
                      active={sortField === 'title'}
                      direction={sortField === 'title' ? sortDirection : 'asc'}
                      onClick={() => handleSort('title')}
                      sx={{
                        color: 'white !important',
                        '& .MuiTableSortLabel-icon': { color: 'white !important' },
                        '&.Mui-active': { color: 'white !important' },
                      }}
                    >
                      Title
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>
                    <TableSortLabel
                      active={sortField === 'readTime'}
                      direction={sortField === 'readTime' ? sortDirection : 'asc'}
                      onClick={() => handleSort('readTime')}
                      sx={{
                        color: 'white !important',
                        '& .MuiTableSortLabel-icon': { color: 'white !important' },
                        '&.Mui-active': { color: 'white !important' },
                      }}
                    >
                      Read Time
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>
                    <TableSortLabel
                      active={sortField === 'presentations'}
                      direction={sortField === 'presentations' ? sortDirection : 'asc'}
                      onClick={() => handleSort('presentations')}
                      sx={{
                        color: 'white !important',
                        '& .MuiTableSortLabel-icon': { color: 'white !important' },
                        '&.Mui-active': { color: 'white !important' },
                      }}
                    >
                      Presentations
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>
                    <TableSortLabel
                      active={sortField === 'views'}
                      direction={sortField === 'views' ? sortDirection : 'asc'}
                      onClick={() => handleSort('views')}
                      sx={{
                        color: 'white !important',
                        '& .MuiTableSortLabel-icon': { color: 'white !important' },
                        '&.Mui-active': { color: 'white !important' },
                      }}
                    >
                      Views
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>
                    <TableSortLabel
                      active={sortField === 'reads'}
                      direction={sortField === 'reads' ? sortDirection : 'asc'}
                      onClick={() => handleSort('reads')}
                      sx={{
                        color: 'white !important',
                        '& .MuiTableSortLabel-icon': { color: 'white !important' },
                        '&.Mui-active': { color: 'white !important' },
                      }}
                    >
                      Reads
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>
                    <TableSortLabel
                      active={sortField === 'earnings'}
                      direction={sortField === 'earnings' ? sortDirection : 'asc'}
                      onClick={() => handleSort('earnings')}
                      sx={{
                        color: 'white !important',
                        '& .MuiTableSortLabel-icon': { color: 'white !important' },
                        '&.Mui-active': { color: 'white !important' },
                      }}
                    >
                      Earnings ($)
                    </TableSortLabel>
                  </TableCell>
                  <TableCell align="right" sx={{ color: 'white', fontWeight: 600 }}>
                    <TableSortLabel
                      active={sortField === 'readRate'}
                      direction={sortField === 'readRate' ? sortDirection : 'asc'}
                      onClick={() => handleSort('readRate')}
                      sx={{
                        color: 'white !important',
                        '& .MuiTableSortLabel-icon': { color: 'white !important' },
                        '&.Mui-active': { color: 'white !important' },
                      }}
                    >
                      Read Rate (%)
                    </TableSortLabel>
                  </TableCell>
                  <TableCell sx={{ color: 'white', fontWeight: 600 }}>
                    <TableSortLabel
                      active={sortField === 'publishDate'}
                      direction={sortField === 'publishDate' ? sortDirection : 'asc'}
                      onClick={() => handleSort('publishDate')}
                      sx={{
                        color: 'white !important',
                        '& .MuiTableSortLabel-icon': { color: 'white !important' },
                        '&.Mui-active': { color: 'white !important' },
                      }}
                    >
                      Published Date
                    </TableSortLabel>
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sortedStories.map((story, index) => {
                  const readRate = story.views > 0 ? ((story.reads / story.views) * 100).toFixed(1) : '0.0';
                  return (
                    <TableRow
                      key={story.id}
                      sx={{
                        '&:nth-of-type(odd)': { background: '#f8fafc' },
                        '&:hover': { background: '#f1f5f9' },
                      }}
                    >
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography variant="body2" sx={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          fontWeight: 500,
                        }}>
                          {story.title}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          {story.readTime}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {story.presentations !== null ? story.presentations.toLocaleString() : '\u2014'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#00ab6c' }}>
                        {story.views.toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>
                        {story.reads.toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#667eea' }}>
                        ${story.earnings.toFixed(2)}
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {readRate}%
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          {story.publishDate}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
};

export default MediumAnalyticsPanel;
