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
  TableSortLabel,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  InputAdornment,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  RemoveRedEye as EngagedIcon,
  AttachMoney as MoneyIcon,
  Article as ArticleIcon,
  Search as SearchIcon,
} from '@mui/icons-material';
import { BarChart } from '@mui/x-charts/BarChart';
import { TDSSummary, TDSArticle } from '../../../types/contentAnalytics';

interface TDSAnalyticsPanelProps {
  summary: TDSSummary | null;
  articles: TDSArticle[];
  loading: boolean;
}

type SortKey =
  | 'title'
  | 'pageviewsLifetime'
  | 'engagedViewsLifetime'
  | 'pageviews30d'
  | 'engagedViews30d'
  | 'estimatedPayout'
  | 'engagementRate'
  | 'publishedDate';

type SortDirection = 'asc' | 'desc';
type TimeRange = '7d' | '30d' | '90d' | 'all';

const parsePublishedDate = (dateStr: string): Date | null => {
  // Try YYYY-MM-DD format first
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }
  // Try natural date format like "March 3, 2026"
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) {
    return parsed;
  }
  return null;
};

const TDSAnalyticsPanel: React.FC<TDSAnalyticsPanelProps> = ({ summary, articles, loading }) => {
  const [sortKey, setSortKey] = useState<SortKey>('pageviewsLifetime');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('desc');
    }
  };

  const getEngagementRate = (article: TDSArticle): number => {
    if (article.pageviewsLifetime === 0) return 0;
    return (article.engagedViewsLifetime / article.pageviewsLifetime) * 100;
  };

  const filteredArticles = useMemo(() => {
    let result = articles;

    // Time range filter
    if (timeRange !== 'all') {
      const daysMap: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90 };
      const days = daysMap[timeRange];
      const now = new Date();
      const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
      result = result.filter((article) => {
        const date = parsePublishedDate(article.publishedDate);
        return date ? date >= cutoff : false;
      });
    }

    // Text search filter
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter((article) => article.title.toLowerCase().includes(query));
    }

    return result;
  }, [articles, timeRange, searchQuery]);

  const sortedArticles = useMemo(() => {
    const sorted = [...filteredArticles].sort((a, b) => {
      let aVal: number | string;
      let bVal: number | string;

      switch (sortKey) {
        case 'title':
          aVal = a.title.toLowerCase();
          bVal = b.title.toLowerCase();
          break;
        case 'pageviewsLifetime':
          aVal = a.pageviewsLifetime;
          bVal = b.pageviewsLifetime;
          break;
        case 'engagedViewsLifetime':
          aVal = a.engagedViewsLifetime;
          bVal = b.engagedViewsLifetime;
          break;
        case 'pageviews30d':
          aVal = a.pageviews30d ?? -1;
          bVal = b.pageviews30d ?? -1;
          break;
        case 'engagedViews30d':
          aVal = a.engagedViews30d ?? -1;
          bVal = b.engagedViews30d ?? -1;
          break;
        case 'estimatedPayout':
          aVal = a.estimatedPayout;
          bVal = b.estimatedPayout;
          break;
        case 'engagementRate':
          aVal = getEngagementRate(a);
          bVal = getEngagementRate(b);
          break;
        case 'publishedDate':
          aVal = a.publishedDate;
          bVal = b.publishedDate;
          break;
        default:
          return 0;
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredArticles, sortKey, sortDirection]);

  const filteredMetrics = useMemo(() => {
    const totalPageviews = filteredArticles.reduce((sum, a) => sum + a.pageviewsLifetime, 0);
    const totalEngagedViews = filteredArticles.reduce((sum, a) => sum + a.engagedViewsLifetime, 0);
    const totalEarnings = filteredArticles.reduce((sum, a) => sum + a.estimatedPayout, 0);
    const totalArticles = filteredArticles.length;
    return { totalPageviews, totalEngagedViews, totalEarnings, totalArticles };
  }, [filteredArticles]);

  const chartData = useMemo(() => {
    const sorted = [...filteredArticles].sort((a, b) => b.pageviewsLifetime - a.pageviewsLifetime);
    const top10 = sorted.slice(0, 10);
    return top10.map((a) => ({
      label: a.title.length > 20 ? a.title.slice(0, 20) + '...' : a.title,
      pageviews: a.pageviewsLifetime,
      engagedViews: a.engagedViewsLifetime,
    }));
  }, [filteredArticles]);

  const metricCards = summary
    ? [
        { label: 'Total Pageviews', value: filteredMetrics.totalPageviews.toLocaleString(), icon: <VisibilityIcon /> },
        { label: 'Engaged Views', value: filteredMetrics.totalEngagedViews.toLocaleString(), icon: <EngagedIcon /> },
        { label: 'Total Earnings', value: `$${filteredMetrics.totalEarnings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: <MoneyIcon /> },
        { label: 'Articles Count', value: filteredMetrics.totalArticles.toLocaleString(), icon: <ArticleIcon /> },
      ]
    : [];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!summary && articles.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 3 }}>
        No Towards Data Science analytics data available. Sync your TDS data to get started.
      </Alert>
    );
  }

  const columns: { key: SortKey; label: string; align?: 'left' | 'right' }[] = [
    { key: 'title', label: 'Title', align: 'left' },
    { key: 'pageviewsLifetime', label: 'Pageviews (Lifetime)', align: 'right' },
    { key: 'engagedViewsLifetime', label: 'Engaged Views (Lifetime)', align: 'right' },
    { key: 'pageviews30d', label: 'Pageviews (30d)', align: 'right' },
    { key: 'engagedViews30d', label: 'Engaged Views (30d)', align: 'right' },
    { key: 'estimatedPayout', label: 'Payout ($)', align: 'right' },
    { key: 'engagementRate', label: 'Engagement Rate', align: 'right' },
    { key: 'publishedDate', label: 'Published Date', align: 'right' },
  ];

  return (
    <Box>
      {/* Section Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '8px',
            background: 'linear-gradient(135deg, #FF6D00 0%, #FF9100 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mr: 2,
          }}
        >
          <Typography sx={{ color: 'white', fontWeight: 800, fontSize: 16 }}>T</Typography>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Towards Data Science
        </Typography>
      </Box>

      {/* Metric Cards */}
      {summary && (
        <Box sx={{ display: 'flex', gap: 3, mb: 4, flexWrap: 'wrap' }}>
          {metricCards.map((card, index) => (
            <Box
              key={index}
              sx={{
                flex: '1 1 200px',
                p: 3,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 2,
                color: 'white',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <Box sx={{ opacity: 0.9 }}>{card.icon}</Box>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {card.label}
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 700 }}>
                {card.value}
              </Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* Filter Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3, flexWrap: 'wrap' }}>
        <ToggleButtonGroup
          value={timeRange}
          exclusive
          onChange={(_, value) => { if (value !== null) setTimeRange(value); }}
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
          size="small"
          placeholder="Search articles..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: '#667eea', fontSize: 20 }} />
              </InputAdornment>
            ),
          }}
          sx={{
            minWidth: 240,
            '& .MuiOutlinedInput-root': {
              borderRadius: '8px',
              '&.Mui-focused fieldset': {
                borderColor: '#667eea',
              },
            },
          }}
        />
      </Box>

      {/* Trend Chart */}
      {filteredArticles.length > 0 && (
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(226, 232, 240, 0.5)',
            mb: 3,
          }}
        >
          <CardContent>
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
              Article Performance
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              Pageviews vs Engaged Views (top 10 by pageviews)
            </Typography>
            <BarChart
              dataset={chartData}
              height={400}
              xAxis={[
                {
                  scaleType: 'band',
                  dataKey: 'label',
                  tickLabelStyle: { fontSize: 11, angle: -45, textAnchor: 'end' },
                },
              ]}
              yAxis={[
                {
                  label: 'Views',
                },
              ]}
              series={[
                {
                  dataKey: 'pageviews',
                  label: 'Pageviews',
                  color: '#667eea',
                },
                {
                  dataKey: 'engagedViews',
                  label: 'Engaged Views',
                  color: '#FF6D00',
                },
              ]}
              margin={{ left: 70, right: 20, top: 20, bottom: 80 }}
              grid={{ vertical: true, horizontal: true }}
            />
          </CardContent>
        </Card>
      )}

      {/* Articles Table */}
      {articles.length > 0 && (
        <Card
          sx={{
            borderRadius: 3,
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
          }}
        >
          <CardContent sx={{ p: 0 }}>
            <Box sx={{ p: 3, pb: 0 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
                All Articles
              </Typography>
            </Box>
            <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 0 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
                    {columns.map((col) => (
                      <TableCell
                        key={col.key}
                        align={col.align || 'left'}
                        sx={{ color: 'white', fontWeight: 600 }}
                      >
                        <TableSortLabel
                          active={sortKey === col.key}
                          direction={sortKey === col.key ? sortDirection : 'asc'}
                          onClick={() => handleSort(col.key)}
                          sx={{
                            color: 'white !important',
                            '& .MuiTableSortLabel-icon': {
                              color: 'white !important',
                            },
                            '&.Mui-active': {
                              color: 'white !important',
                            },
                            '&.Mui-active .MuiTableSortLabel-icon': {
                              color: 'white !important',
                            },
                          }}
                        >
                          {col.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {sortedArticles.map((article, index) => (
                    <TableRow
                      key={article.id}
                      sx={{
                        '&:nth-of-type(odd)': { background: '#f8fafc' },
                        '&:nth-of-type(even)': { background: '#ffffff' },
                        '&:hover': { background: '#f1f5f9' },
                      }}
                    >
                      <TableCell sx={{ maxWidth: 300 }}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 500,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {article.title}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#667eea' }}>
                        {article.pageviewsLifetime.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        {article.engagedViewsLifetime.toLocaleString()}
                      </TableCell>
                      <TableCell align="right">
                        {article.pageviews30d !== null ? article.pageviews30d.toLocaleString() : '\u2014'}
                      </TableCell>
                      <TableCell align="right">
                        {article.engagedViews30d !== null ? article.engagedViews30d.toLocaleString() : '\u2014'}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#FF6D00' }}>
                        ${article.estimatedPayout.toFixed(2)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600, color: '#667eea' }}>
                        {getEngagementRate(article).toFixed(1)}%
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          {article.publishedDate}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default TDSAnalyticsPanel;
