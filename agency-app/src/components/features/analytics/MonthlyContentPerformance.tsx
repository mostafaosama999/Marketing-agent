// src/components/features/analytics/MonthlyContentPerformance.tsx
// Expandable table showing monthly content performance across LinkedIn, TDS, and Medium

import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Collapse,
  Paper,
  Chip,
} from '@mui/material';
import {
  KeyboardArrowUp,
  KeyboardArrowDown,
  TrendingUp,
} from '@mui/icons-material';
import {
  LinkedInTopPost,
  TDSArticle,
  MediumStory,
} from '../../../types/contentAnalytics';

interface MonthlyContentPerformanceProps {
  linkedInPosts: LinkedInTopPost[];
  tdsArticles: TDSArticle[];
  mediumStories: MediumStory[];
}

interface ContentPiece {
  title: string;
  platform: 'linkedin' | 'tds' | 'medium';
  reach: number;
  engagement: number;
  earnings: number;
}

interface MonthlyAggregate {
  monthKey: string; // "YYYY-MM"
  monthLabel: string; // "Mar 2026"
  linkedInCount: number;
  linkedInImpressions: number;
  tdsCount: number;
  tdsPageviews: number;
  mediumCount: number;
  mediumViews: number;
  totalReach: number;
  totalEarnings: number;
  pieces: ContentPiece[];
}

// Helper: Parse dates in "MM/DD/YYYY" or "YYYY-MM-DD" formats
const parsePublishDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  try {
    // Check for MM/DD/YYYY format
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0], 10);
        const day = parseInt(parts[1], 10);
        const year = parseInt(parts[2], 10);
        const d = new Date(year, month - 1, day);
        if (!isNaN(d.getTime())) return d;
      }
    }
    // YYYY-MM-DD format
    const d = new Date(dateStr + 'T00:00:00');
    if (!isNaN(d.getTime())) return d;
  } catch {
    // Invalid date
  }
  return null;
};

// Helper: Get month key from date (YYYY-MM)
const getMonthKey = (date: Date): string => {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
};

// Helper: Get readable month label
const getMonthLabel = (monthKey: string): string => {
  const [year, month] = monthKey.split('-');
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[parseInt(month) - 1]} ${year}`;
};

// Platform chip colors
const platformColors: Record<string, string> = {
  linkedin: '#0077b5',
  tds: '#FF6D00',
  medium: '#00ab6c',
};

const platformLabels: Record<string, string> = {
  linkedin: 'LinkedIn',
  tds: 'TDS',
  medium: 'Medium',
};

// Monthly Row Component
const MonthRow: React.FC<{
  data: MonthlyAggregate;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ data, isExpanded, onToggle }) => {
  return (
    <>
      <TableRow
        onClick={onToggle}
        sx={{
          cursor: 'pointer',
          '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.04)' },
          transition: 'background-color 0.2s',
        }}
      >
        <TableCell>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton size="small" sx={{ mr: 1 }}>
              {isExpanded ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
            </IconButton>
            <Typography sx={{ fontWeight: 600 }}>{data.monthLabel}</Typography>
          </Box>
        </TableCell>
        <TableCell align="center">
          <Typography sx={{ fontWeight: 600 }}>{data.linkedInCount}</Typography>
        </TableCell>
        <TableCell align="center">
          <Typography sx={{ fontWeight: 600 }}>{data.linkedInImpressions.toLocaleString()}</Typography>
        </TableCell>
        <TableCell align="center">
          <Typography sx={{ fontWeight: 600 }}>{data.tdsCount}</Typography>
        </TableCell>
        <TableCell align="center">
          <Typography sx={{ fontWeight: 600 }}>{data.tdsPageviews.toLocaleString()}</Typography>
        </TableCell>
        <TableCell align="center">
          <Typography sx={{ fontWeight: 600 }}>{data.mediumCount}</Typography>
        </TableCell>
        <TableCell align="center">
          <Typography sx={{ fontWeight: 600 }}>{data.mediumViews.toLocaleString()}</Typography>
        </TableCell>
        <TableCell align="center">
          <Typography sx={{ fontWeight: 700, color: '#667eea' }}>{data.totalReach.toLocaleString()}</Typography>
        </TableCell>
        <TableCell align="center">
          <Typography sx={{ fontWeight: 700, color: '#10b981' }}>
            ${data.totalEarnings.toFixed(2)}
          </Typography>
        </TableCell>
      </TableRow>

      {/* Expanded Content Details */}
      <TableRow>
        <TableCell colSpan={9} sx={{ py: 0, borderBottom: isExpanded ? undefined : 'none' }}>
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, pl: 6, pr: 2 }}>
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  mb: 2,
                  color: '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                Content Pieces
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'rgba(102, 126, 234, 0.05)' }}>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>Platform</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>Reach</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>Engagement</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: '#64748b', fontSize: '0.8rem' }}>Earnings</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.pieces.map((piece, idx) => (
                    <TableRow
                      key={`${piece.platform}-${idx}`}
                      sx={{
                        '&:hover': { backgroundColor: 'rgba(102, 126, 234, 0.02)' },
                      }}
                    >
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500, maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {piece.title}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={platformLabels[piece.platform]}
                          size="small"
                          sx={{
                            backgroundColor: platformColors[piece.platform],
                            color: '#fff',
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{piece.reach.toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{piece.engagement.toLocaleString()}</Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" sx={{ color: piece.earnings > 0 ? '#10b981' : '#94a3b8' }}>
                          {piece.earnings > 0 ? `$${piece.earnings.toFixed(2)}` : '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                  {data.pieces.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center" sx={{ color: '#94a3b8', py: 2 }}>
                        No content pieces for this month
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

export const MonthlyContentPerformance: React.FC<MonthlyContentPerformanceProps> = ({
  linkedInPosts,
  tdsArticles,
  mediumStories,
}) => {
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const monthlyData = useMemo(() => {
    const monthMap: Record<string, {
      linkedInCount: number;
      linkedInImpressions: number;
      tdsCount: number;
      tdsPageviews: number;
      mediumCount: number;
      mediumViews: number;
      totalEarnings: number;
      pieces: ContentPiece[];
    }> = {};

    const ensureMonth = (key: string) => {
      if (!monthMap[key]) {
        monthMap[key] = {
          linkedInCount: 0,
          linkedInImpressions: 0,
          tdsCount: 0,
          tdsPageviews: 0,
          mediumCount: 0,
          mediumViews: 0,
          totalEarnings: 0,
          pieces: [],
        };
      }
    };

    // Process LinkedIn posts
    linkedInPosts.forEach((post) => {
      const date = parsePublishDate(post.publishDate);
      if (!date) return;
      const key = getMonthKey(date);
      ensureMonth(key);
      monthMap[key].linkedInCount += 1;
      monthMap[key].linkedInImpressions += post.impressions || 0;
      monthMap[key].pieces.push({
        title: post.url || `LinkedIn Post (${post.publishDate})`,
        platform: 'linkedin',
        reach: post.impressions || 0,
        engagement: post.engagements || 0,
        earnings: 0,
      });
    });

    // Process TDS articles
    tdsArticles.forEach((article) => {
      const date = parsePublishDate(article.publishedDate);
      if (!date) return;
      const key = getMonthKey(date);
      ensureMonth(key);
      monthMap[key].tdsCount += 1;
      monthMap[key].tdsPageviews += article.pageviewsLifetime || 0;
      monthMap[key].totalEarnings += article.estimatedPayout || 0;
      monthMap[key].pieces.push({
        title: article.title,
        platform: 'tds',
        reach: article.pageviewsLifetime || 0,
        engagement: article.engagedViewsLifetime || 0,
        earnings: article.estimatedPayout || 0,
      });
    });

    // Process Medium stories
    mediumStories.forEach((story) => {
      const date = parsePublishDate(story.publishDate);
      if (!date) return;
      const key = getMonthKey(date);
      ensureMonth(key);
      monthMap[key].mediumCount += 1;
      monthMap[key].mediumViews += story.views || 0;
      monthMap[key].totalEarnings += story.earnings || 0;
      monthMap[key].pieces.push({
        title: story.title,
        platform: 'medium',
        reach: story.views || 0,
        engagement: story.reads || 0,
        earnings: story.earnings || 0,
      });
    });

    // Build sorted array
    const result: MonthlyAggregate[] = Object.keys(monthMap)
      .sort((a, b) => b.localeCompare(a)) // Newest first
      .map((monthKey) => {
        const m = monthMap[monthKey];
        // Sort pieces by reach descending
        m.pieces.sort((a, b) => b.reach - a.reach);
        return {
          monthKey,
          monthLabel: getMonthLabel(monthKey),
          linkedInCount: m.linkedInCount,
          linkedInImpressions: m.linkedInImpressions,
          tdsCount: m.tdsCount,
          tdsPageviews: m.tdsPageviews,
          mediumCount: m.mediumCount,
          mediumViews: m.mediumViews,
          totalReach: m.linkedInImpressions + m.tdsPageviews + m.mediumViews,
          totalEarnings: m.totalEarnings,
          pieces: m.pieces,
        };
      });

    return result;
  }, [linkedInPosts, tdsArticles, mediumStories]);

  const toggleMonth = (month: string) => {
    setExpandedMonths((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(month)) {
        newSet.delete(month);
      } else {
        newSet.add(month);
      }
      return newSet;
    });
  };

  if (monthlyData.length === 0) {
    return null;
  }

  return (
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
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <TrendingUp sx={{ fontSize: 24, color: '#667eea' }} />
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Monthly Inbound Content Performance
          </Typography>
        </Box>
        <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
          Click on a month to see individual content pieces
        </Typography>

        <TableContainer component={Paper} elevation={0} sx={{ borderRadius: 2, border: '1px solid #e2e8f0' }}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: 'rgba(102, 126, 234, 0.08)' }}>
                <TableCell sx={{ fontWeight: 700, color: '#1e293b' }}>Month</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#1e293b' }}>LinkedIn Posts</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#1e293b' }}>LinkedIn Impressions</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#1e293b' }}>TDS Articles</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#1e293b' }}>TDS Pageviews</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#1e293b' }}>Medium Stories</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#1e293b' }}>Medium Views</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#1e293b' }}>Total Reach</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, color: '#1e293b' }}>Total Earnings</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {monthlyData.map((data) => (
                <MonthRow
                  key={data.monthKey}
                  data={data}
                  isExpanded={expandedMonths.has(data.monthKey)}
                  onToggle={() => toggleMonth(data.monthKey)}
                />
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

export default MonthlyContentPerformance;
