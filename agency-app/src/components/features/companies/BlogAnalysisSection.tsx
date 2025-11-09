// src/components/features/companies/BlogAnalysisSection.tsx
import React, { useState } from 'react';
import { Box, Typography, Button, CircularProgress, Alert, Chip } from '@mui/material';
import {
  CalendarToday as CalendarIcon,
  BarChart as ChartIcon,
  People as PeopleIcon,
  Star as StarIcon,
  Refresh as RefreshIcon,
  RssFeed as RssIcon,
  SmartToy as AIIcon,
} from '@mui/icons-material';
import Grid from '@mui/material/Grid';
import { Company } from '../../../types/crm';
import { AnalysisCard } from './AnalysisCard';
import { ContentQualityCard } from './ContentQualityCard';
import { formatCost } from '../../../services/firebase/cloudFunctions';
import { BlogUrlSelectionDialog } from './BlogUrlSelectionDialog';
import { getBlogUrlFieldMapping, getCompanyBlogUrl } from '../../../services/api/blogUrlFieldMappingService';

interface BlogAnalysisSectionProps {
  company: Company;
  onAnalyze: (url: string) => void;
  loading: boolean;
  error: string | null;
}

export const BlogAnalysisSection: React.FC<BlogAnalysisSectionProps> = ({
  company,
  onAnalyze,
  loading,
  error,
}) => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const analysis = company.blogAnalysis;

  // Check for mapped blog URL field
  const hasMappedField = Boolean(getBlogUrlFieldMapping());
  const mappedBlogUrl = getCompanyBlogUrl(company);

  const handleOpenDialog = () => {
    // If mapped URL exists, use it directly without opening dialog
    if (hasMappedField && mappedBlogUrl) {
      onAnalyze(mappedBlogUrl);
      return;
    }

    // Otherwise, open dialog for manual URL selection
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
  };

  const handleConfirmUrl = (url: string) => {
    onAnalyze(url);
    setDialogOpen(false);
  };

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

          {/* Blog URL Display */}
          {analysis?.blogUrl && (
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#64748b' }}>
              Blog URL:{' '}
              <a
                href={analysis.blogUrl.startsWith('http') ? analysis.blogUrl : `https://${analysis.blogUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#667eea',
                  textDecoration: 'none',
                  fontWeight: 500,
                  borderBottom: '1px solid rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderBottomColor = '#667eea';
                  e.currentTarget.style.color = '#5568d3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderBottomColor = 'rgba(102, 126, 234, 0.3)';
                  e.currentTarget.style.color = '#667eea';
                }}
              >
                {analysis.blogUrl}
              </a>
            </Typography>
          )}

          {/* RSS Feed Display */}
          {analysis?.rssFeedUrl && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#64748b' }}>
              RSS Feed Used:{' '}
              <a
                href={analysis.rssFeedUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#667eea',
                  textDecoration: 'none',
                  fontWeight: 500,
                  borderBottom: '1px solid rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderBottomColor = '#667eea';
                  e.currentTarget.style.color = '#5568d3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderBottomColor = 'rgba(102, 126, 234, 0.3)';
                  e.currentTarget.style.color = '#667eea';
                }}
              >
                {analysis.rssFeedUrl}
              </a>
            </Typography>
          )}

          {/* Last Post URL Display */}
          {analysis?.lastPostUrl && (
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#64748b' }}>
              Last Post URL:{' '}
              <a
                href={analysis.lastPostUrl.startsWith('http') ? analysis.lastPostUrl : `https://${analysis.lastPostUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: '#667eea',
                  textDecoration: 'none',
                  fontWeight: 500,
                  borderBottom: '1px solid rgba(102, 126, 234, 0.3)',
                  transition: 'all 0.2s',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderBottomColor = '#667eea';
                  e.currentTarget.style.color = '#5568d3';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderBottomColor = 'rgba(102, 126, 234, 0.3)';
                  e.currentTarget.style.color = '#667eea';
                }}
              >
                {analysis.lastPostUrl}
              </a>
            </Typography>
          )}
        </Box>

        <Box sx={{ textAlign: 'right' }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleOpenDialog}
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
            {hasMappedField && mappedBlogUrl && analysis
              ? 'Re-analyze Blog'
              : hasMappedField && mappedBlogUrl
              ? 'Analyze Mapped Blog'
              : analysis
              ? 'Re-analyze'
              : 'Analyze Blog'}
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

      {/* Mapped Blog URL Info - Show when mapped URL exists and no analysis yet */}
      {hasMappedField && mappedBlogUrl && !analysis && !loading && (
        <Alert
          severity="info"
          sx={{ mb: 3 }}
          icon={<RssIcon />}
        >
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
            Mapped Blog URL: <strong>{mappedBlogUrl}</strong>
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Click "Analyze Blog" above to analyze this URL
          </Typography>
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
        <Box>
          {/* Section 1: Blog Activity Metrics (RSS-based) */}
          <Box sx={{ mb: 4 }}>
            <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                }}
              >
                📊 Blog Activity Metrics
              </Typography>
              {analysis.rssFeedUrl ? (
                <Chip
                  icon={<RssIcon sx={{ fontSize: 14 }} />}
                  label="RSS Feed Data"
                  size="small"
                  sx={{
                    fontSize: '11px',
                    height: '22px',
                    background: '#10b981',
                    color: 'white',
                    fontWeight: 600,
                    '& .MuiChip-icon': {
                      color: 'white',
                    },
                  }}
                />
              ) : (
                <Chip
                  icon={<AIIcon sx={{ fontSize: 14 }} />}
                  label="AI Estimate"
                  size="small"
                  sx={{
                    fontSize: '11px',
                    height: '22px',
                    background: '#f59e0b',
                    color: 'white',
                    fontWeight: 600,
                    '& .MuiChip-icon': {
                      color: 'white',
                    },
                  }}
                />
              )}
            </Box>

            {!analysis.rssFeedUrl && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                RSS feed not available - metrics below are AI estimates and may be less accurate
              </Alert>
            )}

            <Grid container spacing={3}>
              {/* Card 1: Last Activity */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <AnalysisCard
                  icon={<CalendarIcon />}
                  title="Last Active Post"
                  value={analysis.lastActivePost ? formatLastPost() : 'Unable to determine'}
                  subtitle={
                    analysis.lastActivePost
                      ? getLastPostStatus() === 'success'
                        ? 'Recently active'
                        : getLastPostStatus() === 'warning'
                        ? 'Moderately active'
                        : 'Inactive'
                      : 'No data from blog page'
                  }
                  status={analysis.lastActivePost ? getLastPostStatus() : 'info'}
                  link={analysis.lastPostUrl || analysis.blogUrl || undefined}
                />
              </Grid>

              {/* Card 2: Frequency */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <AnalysisCard
                  icon={<ChartIcon />}
                  title="Monthly Frequency"
                  value={analysis.monthlyFrequency > 0 ? `${analysis.monthlyFrequency} posts` : 'Unable to determine'}
                  subtitle={
                    analysis.monthlyFrequency >= 4
                      ? 'High activity'
                      : analysis.monthlyFrequency >= 2
                      ? 'Moderate activity'
                      : analysis.monthlyFrequency > 0
                      ? 'Low activity'
                      : 'No data available'
                  }
                  status={
                    analysis.monthlyFrequency >= 4
                      ? 'success'
                      : analysis.monthlyFrequency >= 2
                      ? 'warning'
                      : analysis.monthlyFrequency > 0
                      ? 'error'
                      : 'info'
                  }
                >
                  {analysis.monthlyFrequency > 0 && (
                    <Typography
                      variant="caption"
                      sx={{
                        color: '#64748b',
                        fontSize: '11px',
                      }}
                    >
                      Based on last 30 days
                    </Typography>
                  )}
                </AnalysisCard>
              </Grid>

              {/* Card 3: Writers */}
              <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                <AnalysisCard
                  icon={<PeopleIcon />}
                  title="Writers"
                  value={analysis.writers.count > 0 ? `${analysis.writers.count} writer${analysis.writers.count !== 1 ? 's' : ''}` : 'Unable to determine'}
                  subtitle={analysis.writers.count > 0 ? getWriterTypeLabel() : 'No data available'}
                  status={analysis.writers.count >= 2 ? 'success' : analysis.writers.count > 0 ? 'info' : 'info'}
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
            </Grid>
          </Box>

          {/* Section 2: Content Quality Analysis (AI-based) */}
          {analysis.blogNature && (
            <ContentQualityCard
              blogNature={analysis.blogNature}
              isDeveloperB2BSaas={analysis.isDeveloperB2BSaas}
              contentSummary={analysis.contentSummary}
            />
          )}
        </Box>
      )}

      {/* Blog URL Selection Dialog */}
      <BlogUrlSelectionDialog
        open={dialogOpen}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmUrl}
        company={company}
      />
    </Box>
  );
};
