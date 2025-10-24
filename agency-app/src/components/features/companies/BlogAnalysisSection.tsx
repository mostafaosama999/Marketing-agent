// src/components/features/companies/BlogAnalysisSection.tsx
import React from 'react';
import { Box, Typography, Button, CircularProgress, Alert, Chip } from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  BarChart as ChartIcon,
  People as PeopleIcon,
  Star as StarIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import Grid from '@mui/material/Grid';
import { Company } from '../../../types/crm';
import { AnalysisCard } from './AnalysisCard';
import { formatCost } from '../../../services/firebase/cloudFunctions';

interface BlogAnalysisSectionProps {
  company: Company;
  onAnalyze: () => void;
  loading: boolean;
  error: string | null;
}

export const BlogAnalysisSection: React.FC<BlogAnalysisSectionProps> = ({
  company,
  onAnalyze,
  loading,
  error,
}) => {
  const analysis = company.blogAnalysis;

  const getTimeSinceAnalysis = () => {
    if (!analysis?.lastAnalyzedAt) return null;

    const now = new Date();
    const analyzed = new Date(analysis.lastAnalyzedAt);
    const daysSince = Math.floor((now.getTime() - analyzed.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince === 0) return 'Today';
    if (daysSince === 1) return '1 day ago';
    return `${daysSince} days ago`;
  };

  const needsRefresh = () => {
    if (!analysis?.lastAnalyzedAt) return true;

    const now = new Date();
    const analyzed = new Date(analysis.lastAnalyzedAt);
    const daysSince = Math.floor((now.getTime() - analyzed.getTime()) / (1000 * 60 * 60 * 24));

    return daysSince > 30;
  };

  const getLastPostStatus = () => {
    if (!analysis?.lastActivePost) return 'error';

    const lastPostDate = new Date(analysis.lastActivePost);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - lastPostDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince <= 30) return 'success';
    if (daysSince <= 90) return 'warning';
    return 'error';
  };

  const formatLastPost = () => {
    if (!analysis?.lastActivePost) return 'Unknown';

    const lastPostDate = new Date(analysis.lastActivePost);
    const now = new Date();
    const daysSince = Math.floor((now.getTime() - lastPostDate.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSince === 0) return 'Today';
    if (daysSince === 1) return '1 day ago';
    if (daysSince < 30) return `${daysSince} days ago`;

    return lastPostDate.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getWriterTypeLabel = () => {
    if (!analysis) return 'Unknown';

    if (analysis.writers.areEmployees && analysis.writers.areFreelancers) {
      return 'Mixed (Employees & Freelancers)';
    } else if (analysis.writers.areEmployees) {
      return 'Employees';
    } else if (analysis.writers.areFreelancers) {
      return 'Freelancers';
    }
    return 'Unknown';
  };

  const getRatingStars = (rating: 'low' | 'medium' | 'high') => {
    const counts = { low: 2, medium: 3, high: 4 };
    return '⭐'.repeat(counts[rating]);
  };

  const getContentBadges = () => {
    if (!analysis) return [];

    const badges: Array<{ label: string; color: string }> = [];

    if (analysis.blogNature.isTechnical) {
      badges.push({ label: 'Technical Content', color: '#10b981' });
    }

    if (analysis.blogNature.hasCodeExamples) {
      badges.push({ label: 'Code Examples', color: '#3b82f6' });
    }

    if (analysis.blogNature.hasDiagrams) {
      badges.push({ label: 'Diagrams', color: '#9333ea' });
    }

    if (analysis.blogNature.isAIWritten) {
      badges.push({ label: 'AI Generated', color: '#f59e0b' });
    }

    if (analysis.isDeveloperB2BSaas) {
      badges.push({ label: 'Developer-Focused', color: '#667eea' });
    }

    return badges;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              mb: 0.5,
            }}
          >
            Blog Analysis
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Comprehensive analysis of blog activity, writers, and content quality
          </Typography>

          {/* RSS Feed Display */}
          {analysis?.rssFeedUrl && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#64748b' }}>
              RSS Feed Used:{' '}
              <a
                href={analysis.rssFeedUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#667eea', textDecoration: 'none' }}
              >
                {analysis.rssFeedUrl}
              </a>
            </Typography>
          )}
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Button
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <RefreshIcon />}
            onClick={onAnalyze}
            disabled={loading}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              fontWeight: 600,
              mb: 1,
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              },
            }}
          >
            {analysis ? 'Re-analyze' : 'Analyze Blog'}
          </Button>
          {analysis?.lastAnalyzedAt && (
            <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
              Last analyzed: {getTimeSinceAnalysis()}
              {needsRefresh() && ' (Refresh recommended)'}
            </Typography>
          )}
          {analysis?.costInfo && (
            <Typography variant="caption" sx={{ display: 'block', color: '#64748b' }}>
              Cost: {formatCost(analysis.costInfo)}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* No Data State */}
      {!analysis && !loading && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No analysis available
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Click "Analyze Blog" to discover blog insights
          </Typography>
        </Box>
      )}

      {/* Loading State */}
      {loading && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <CircularProgress size={48} sx={{ color: '#667eea', mb: 2 }} />
          <Typography variant="body2" color="text.secondary">
            Analyzing blog...
          </Typography>
          <Typography variant="caption" color="text.secondary">
            This may take 30-60 seconds
          </Typography>
        </Box>
      )}

      {/* Analysis Results */}
      {analysis && !loading && (
        <Grid container spacing={3}>
          {/* Card 1: Last Activity */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AnalysisCard
              icon={<CalendarIcon />}
              title="Last Active Post"
              value={formatLastPost()}
              subtitle={
                analysis.lastActivePost
                  ? getLastPostStatus() === 'success'
                    ? 'Recently active'
                    : getLastPostStatus() === 'warning'
                    ? 'Moderately active'
                    : 'Inactive'
                  : 'No recent posts found'
              }
              status={getLastPostStatus()}
              link={analysis.lastPostUrl || analysis.blogUrl || undefined}
            />
          </Grid>

          {/* Card 2: Frequency */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AnalysisCard
              icon={<ChartIcon />}
              title="Monthly Frequency"
              value={`${analysis.monthlyFrequency} posts`}
              subtitle={
                analysis.monthlyFrequency >= 4
                  ? 'High activity'
                  : analysis.monthlyFrequency >= 2
                  ? 'Moderate activity'
                  : 'Low activity'
              }
              status={
                analysis.monthlyFrequency >= 4
                  ? 'success'
                  : analysis.monthlyFrequency >= 2
                  ? 'warning'
                  : 'error'
              }
            >
              <Typography
                variant="caption"
                sx={{
                  color: '#64748b',
                  fontSize: '11px',
                }}
              >
                Based on last 30 days
              </Typography>
            </AnalysisCard>
          </Grid>

          {/* Card 3: Writers */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AnalysisCard
              icon={<PeopleIcon />}
              title="Writers"
              value={`${analysis.writers.count} writer${analysis.writers.count !== 1 ? 's' : ''}`}
              subtitle={getWriterTypeLabel()}
              status={analysis.writers.count >= 2 ? 'success' : 'info'}
            >
              {analysis.writers.list.length > 0 && (
                <Box>
                  <Typography
                    variant="caption"
                    sx={{
                      color: '#64748b',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'block',
                      mb: 0.5,
                    }}
                  >
                    Writers:
                  </Typography>
                  {analysis.writers.list.map((writer, index) => (
                    <Chip
                      key={index}
                      label={writer}
                      size="small"
                      sx={{
                        fontSize: '10px',
                        height: '18px',
                        mr: 0.5,
                        mb: 0.5,
                      }}
                    />
                  ))}
                </Box>
              )}
            </AnalysisCard>
          </Grid>

          {/* Card 4: Blog Nature */}
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <AnalysisCard
              icon={<StarIcon />}
              title="Content Quality"
              value={`${getRatingStars(analysis.blogNature.rating)} ${analysis.blogNature.rating.toUpperCase()}`}
              subtitle={
                analysis.blogNature.reasoning ||
                (analysis.blogNature.isTechnical
                  ? 'Technical & Bottom-of-funnel'
                  : 'Top-of-funnel content')
              }
              status={
                analysis.blogNature.rating === 'high'
                  ? 'success'
                  : analysis.blogNature.rating === 'medium'
                  ? 'warning'
                  : 'error'
              }
              badges={getContentBadges()}
            >
              {analysis.contentSummary && !analysis.blogNature.reasoning && (
                <Typography
                  variant="caption"
                  sx={{
                    color: '#64748b',
                    fontSize: '10px',
                    display: 'block',
                    mt: 1,
                  }}
                >
                  {analysis.contentSummary.split('\n').slice(0, 2).join(', ')}
                </Typography>
              )}
            </AnalysisCard>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};
