// src/components/features/companies/ContentQualityCard.tsx
import React from 'react';
import { Box, Typography, Chip, Paper, Divider, Grid } from '@mui/material';
import {
  Code as CodeIcon,
  AccountTree as DiagramIcon,
  SmartToy as AIIcon,
  TrendingUp as FunnelIcon,
  School as DepthIcon,
  FormatQuote as QuoteIcon,
} from '@mui/icons-material';

interface BlogNature {
  rating: 'low' | 'medium' | 'high';
  reasoning?: string;
  isAIWritten: boolean;
  aiWrittenConfidence?: 'low' | 'medium' | 'high' | null;
  aiWrittenEvidence?: string | null;
  technicalDepth?: 'beginner' | 'intermediate' | 'advanced' | null;
  funnelStage?: 'top' | 'middle' | 'bottom' | null;
  hasCodeExamples: boolean;
  codeExamplesCount?: number;
  codeLanguages?: string[];
  hasDiagrams: boolean;
  diagramsCount?: number;
  exampleQuotes?: string[];
  isTechnical?: boolean;
}

interface ContentQualityCardProps {
  blogNature: BlogNature;
  isDeveloperB2BSaas?: boolean;
  contentSummary?: string;
}

export const ContentQualityCard: React.FC<ContentQualityCardProps> = ({
  blogNature,
  isDeveloperB2BSaas,
  contentSummary,
}) => {
  const getRatingStars = (rating: 'low' | 'medium' | 'high') => {
    const counts = { low: 2, medium: 3, high: 4 };
    return '⭐'.repeat(counts[rating]);
  };

  const getRatingColor = (rating: 'low' | 'medium' | 'high') => {
    return rating === 'high' ? '#10b981' : rating === 'medium' ? '#f59e0b' : '#ef4444';
  };

  const getConfidenceColor = (confidence?: 'low' | 'medium' | 'high' | null) => {
    if (!confidence) return '#94a3b8';
    return confidence === 'high' ? '#ef4444' : confidence === 'medium' ? '#f59e0b' : '#10b981';
  };

  const getDepthColor = (depth?: 'beginner' | 'intermediate' | 'advanced' | null) => {
    if (!depth) return '#94a3b8';
    return depth === 'advanced' ? '#10b981' : depth === 'intermediate' ? '#3b82f6' : '#94a3b8';
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 3,
        border: '1px solid rgba(255, 255, 255, 0.2)',
      }}
    >
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            mb: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1,
          }}
        >
          🎯 Content Quality Analysis
          <Chip
            label="AI-Powered"
            size="small"
            sx={{
              fontSize: '10px',
              height: '20px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 600,
            }}
          />
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Deep analysis of blog content, technical depth, and quality
        </Typography>
      </Box>

      {/* Rating Display */}
      <Box
        sx={{
          mb: 3,
          p: 2,
          background: `linear-gradient(135deg, ${getRatingColor(blogNature.rating)}15 0%, ${getRatingColor(blogNature.rating)}05 100%)`,
          borderRadius: 2,
          border: `1px solid ${getRatingColor(blogNature.rating)}30`,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, color: getRatingColor(blogNature.rating), mb: 0.5 }}>
          {getRatingStars(blogNature.rating)} {blogNature.rating.toUpperCase()}
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748b', fontStyle: 'italic', lineHeight: 1.6 }}>
          {blogNature.reasoning}
        </Typography>
      </Box>

      {/* Metrics Grid */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Technical Depth */}
        {blogNature.technicalDepth && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box
              sx={{
                p: 2,
                background: '#f8fafc',
                borderRadius: 2,
                border: '1px solid #e2e8f0',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DepthIcon sx={{ fontSize: 20, color: getDepthColor(blogNature.technicalDepth) }} />
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  Technical Depth
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 600, color: getDepthColor(blogNature.technicalDepth), textTransform: 'capitalize' }}>
                {blogNature.technicalDepth}
              </Typography>
            </Box>
          </Grid>
        )}

        {/* Funnel Stage */}
        {blogNature.funnelStage && (
          <Grid size={{ xs: 12, sm: 6 }}>
            <Box
              sx={{
                p: 2,
                background: '#f8fafc',
                borderRadius: 2,
                border: '1px solid #e2e8f0',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FunnelIcon sx={{ fontSize: 20, color: '#667eea' }} />
                <Typography variant="caption" fontWeight={600} color="text.secondary">
                  Funnel Stage
                </Typography>
              </Box>
              <Typography variant="body1" sx={{ fontWeight: 600, color: '#667eea', textTransform: 'capitalize' }}>
                {blogNature.funnelStage} of Funnel
              </Typography>
            </Box>
          </Grid>
        )}

        {/* Code Examples */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box
            sx={{
              p: 2,
              background: '#f8fafc',
              borderRadius: 2,
              border: '1px solid #e2e8f0',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <CodeIcon sx={{ fontSize: 20, color: blogNature.hasCodeExamples ? '#3b82f6' : '#94a3b8' }} />
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                Code Examples
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 600, color: blogNature.hasCodeExamples ? '#3b82f6' : '#94a3b8' }}>
              {blogNature.hasCodeExamples ? `${blogNature.codeExamplesCount} example${blogNature.codeExamplesCount !== 1 ? 's' : ''}` : 'None found'}
            </Typography>
            {blogNature.codeLanguages && blogNature.codeLanguages.length > 0 && (
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {blogNature.codeLanguages.map((lang, index) => (
                  <Chip
                    key={index}
                    label={lang}
                    size="small"
                    sx={{
                      fontSize: '10px',
                      height: '18px',
                      background: '#3b82f6',
                      color: 'white',
                    }}
                  />
                ))}
              </Box>
            )}
          </Box>
        </Grid>

        {/* Diagrams */}
        <Grid size={{ xs: 12, sm: 6 }}>
          <Box
            sx={{
              p: 2,
              background: '#f8fafc',
              borderRadius: 2,
              border: '1px solid #e2e8f0',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <DiagramIcon sx={{ fontSize: 20, color: blogNature.hasDiagrams ? '#9333ea' : '#94a3b8' }} />
              <Typography variant="caption" fontWeight={600} color="text.secondary">
                Diagrams
              </Typography>
            </Box>
            <Typography variant="body1" sx={{ fontWeight: 600, color: blogNature.hasDiagrams ? '#9333ea' : '#94a3b8' }}>
              {blogNature.hasDiagrams ? `${blogNature.diagramsCount} diagram${blogNature.diagramsCount !== 1 ? 's' : ''}` : 'None found'}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* AI Detection */}
      {blogNature.isAIWritten && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            background: 'linear-gradient(135deg, #fef3c7 0%, #fecaca 100%)',
            borderRadius: 2,
            border: '1px solid #fbbf24',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <AIIcon sx={{ fontSize: 20, color: '#f59e0b' }} />
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#92400e' }}>
              🤖 AI-Generated Content Detected
            </Typography>
            {blogNature.aiWrittenConfidence && (
              <Chip
                label={`Confidence: ${blogNature.aiWrittenConfidence.toUpperCase()}`}
                size="small"
                sx={{
                  fontSize: '10px',
                  height: '20px',
                  background: getConfidenceColor(blogNature.aiWrittenConfidence),
                  color: 'white',
                  fontWeight: 600,
                }}
              />
            )}
          </Box>
          {blogNature.aiWrittenEvidence && (
            <Typography variant="caption" sx={{ color: '#78350f', fontStyle: 'italic', display: 'block', mt: 1 }}>
              Evidence: {blogNature.aiWrittenEvidence}
            </Typography>
          )}
        </Box>
      )}

      {!blogNature.isAIWritten && blogNature.aiWrittenConfidence && (
        <Box
          sx={{
            mb: 3,
            p: 2,
            background: 'linear-gradient(135deg, #d1fae515 0%, #a7f3d015 100%)',
            borderRadius: 2,
            border: '1px solid #10b98130',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ color: '#065f46' }}>
              ✍️ Human-Written Content
            </Typography>
            <Chip
              label={`Confidence: ${blogNature.aiWrittenConfidence.toUpperCase()}`}
              size="small"
              sx={{
                fontSize: '10px',
                height: '20px',
                background: '#10b981',
                color: 'white',
                fontWeight: 600,
              }}
            />
          </Box>
          {blogNature.aiWrittenEvidence && (
            <Typography variant="caption" sx={{ color: '#065f46', fontStyle: 'italic', display: 'block', mt: 1 }}>
              Evidence: {blogNature.aiWrittenEvidence}
            </Typography>
          )}
        </Box>
      )}

      {/* Additional Badges */}
      {isDeveloperB2BSaas && (
        <Box sx={{ mb: 2 }}>
          <Chip
            label="🎯 Developer B2B SaaS Focused"
            sx={{
              fontSize: '12px',
              height: '24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 600,
            }}
          />
        </Box>
      )}

      {/* Example Quotes */}
      {blogNature.exampleQuotes && blogNature.exampleQuotes.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <QuoteIcon sx={{ fontSize: 20, color: '#667eea' }} />
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
                Example Quotes from Blog
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {blogNature.exampleQuotes.slice(0, 3).map((quote, index) => (
                <Box
                  key={index}
                  sx={{
                    pl: 2,
                    py: 1,
                    borderLeft: '3px solid #667eea',
                    background: '#f8fafc',
                    borderRadius: '0 4px 4px 0',
                  }}
                >
                  <Typography variant="caption" sx={{ color: '#475569', fontStyle: 'italic', lineHeight: 1.5 }}>
                    "{quote}"
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </>
      )}

      {/* Content Summary */}
      {contentSummary && (
        <>
          <Divider sx={{ my: 2 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 1 }}>
              Content Summary
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', lineHeight: 1.6, whiteSpace: 'pre-line' }}>
              {contentSummary}
            </Typography>
          </Box>
        </>
      )}
    </Paper>
  );
};
