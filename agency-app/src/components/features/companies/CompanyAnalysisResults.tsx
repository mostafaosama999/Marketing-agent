// src/components/features/companies/CompanyAnalysisResults.tsx
// Displays company analysis results from offer analysis

import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Grid,
  Link as MuiLink,
} from '@mui/material';
import {
  Business as BusinessIcon,
  Public as PublicIcon,
  Category as CategoryIcon,
  TrendingUp as TrendingUpIcon,
  SmartToy as AIIcon,
  LinkedIn as LinkedInIcon,
  Article as BlogIcon,
  Check as CheckIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { AnalysisCard } from './AnalysisCard';

export interface CompanyAnalysis {
  companyName: string;
  companyType: 'Generative AI' | 'AI tool' | 'Data science' | 'Service provider' | 'Content maker';
  companySummary: string;
  canTrainLLMs: boolean;
  reliesOnAI: boolean;
  businessModel: 'B2B' | 'B2C' | 'Both';
  country: string;
  linkedinUrl: string | null;
  blogUrl: string | null;
}

interface CompanyAnalysisResultsProps {
  analysis: CompanyAnalysis;
}

export const CompanyAnalysisResults: React.FC<CompanyAnalysisResultsProps> = ({
  analysis,
}) => {
  // Get color for company type
  const getCompanyTypeColor = (type: string): string => {
    switch (type) {
      case 'Generative AI':
        return '#667eea';
      case 'AI tool':
        return '#764ba2';
      case 'Data science':
        return '#06b6d4';
      case 'Service provider':
        return '#10b981';
      case 'Content maker':
        return '#f59e0b';
      default:
        return '#64748b';
    }
  };

  const companyTypeColor = getCompanyTypeColor(analysis.companyType);

  return (
    <Box>
      {/* Section Title */}
      <Typography
        variant="h6"
        sx={{
          fontWeight: 700,
          color: '#1e293b',
          mb: 3,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <BusinessIcon sx={{ color: '#667eea' }} />
        Company Analysis
      </Typography>

      {/* Company Type Badge (Prominent) */}
      <Box sx={{ mb: 3 }}>
        <Chip
          icon={<CategoryIcon />}
          label={analysis.companyType}
          sx={{
            background: `linear-gradient(135deg, ${companyTypeColor} 0%, ${companyTypeColor}dd 100%)`,
            color: 'white',
            fontWeight: 700,
            fontSize: '16px',
            height: '40px',
            px: 2,
            '& .MuiChip-icon': {
              color: 'white',
              fontSize: '20px',
            },
          }}
        />
      </Box>

      {/* Summary Box */}
      <Box
        sx={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          p: 3,
          mb: 3,
          border: '1px solid #e2e8f0',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            color: '#64748b',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            fontSize: '11px',
            mb: 1.5,
          }}
        >
          Company Summary
        </Typography>
        <Typography
          variant="body1"
          sx={{
            color: '#475569',
            fontSize: '15px',
            lineHeight: 1.7,
          }}
        >
          {analysis.companySummary}
        </Typography>
      </Box>

      {/* Analysis Cards Grid */}
      <Grid container spacing={2.5}>
        {/* Business Model */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <AnalysisCard
            icon={<TrendingUpIcon />}
            title="Business Model"
            value={analysis.businessModel}
            status="info"
          />
        </Grid>

        {/* Country */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <AnalysisCard
            icon={<PublicIcon />}
            title="Country"
            value={analysis.country}
            status="info"
          />
        </Grid>

        {/* AI Capabilities */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Box
            sx={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              borderRadius: 3,
              p: 3,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              height: '100%',
            }}
          >
            <Box
              sx={{
                fontSize: '32px',
                mb: 2,
                color: '#667eea',
              }}
            >
              <AIIcon fontSize="inherit" />
            </Box>
            <Typography
              variant="body2"
              sx={{
                color: '#64748b',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: '11px',
                mb: 1.5,
              }}
            >
              AI Capabilities
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {analysis.canTrainLLMs ? (
                  <CheckIcon sx={{ color: '#10b981', fontSize: '18px' }} />
                ) : (
                  <CloseIcon sx={{ color: '#94a3b8', fontSize: '18px' }} />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    color: analysis.canTrainLLMs ? '#1e293b' : '#94a3b8',
                    fontSize: '13px',
                    fontWeight: analysis.canTrainLLMs ? 600 : 400,
                  }}
                >
                  Can Train LLMs
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {analysis.reliesOnAI ? (
                  <CheckIcon sx={{ color: '#10b981', fontSize: '18px' }} />
                ) : (
                  <CloseIcon sx={{ color: '#94a3b8', fontSize: '18px' }} />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    color: analysis.reliesOnAI ? '#1e293b' : '#94a3b8',
                    fontSize: '13px',
                    fontWeight: analysis.reliesOnAI ? 600 : 400,
                  }}
                >
                  Relies on AI
                </Typography>
              </Box>
            </Box>
          </Box>
        </Grid>

        {/* LinkedIn URL */}
        {analysis.linkedinUrl && (
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Box
              sx={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: 3,
                p: 3,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                height: '100%',
              }}
            >
              <Box
                sx={{
                  fontSize: '32px',
                  mb: 2,
                  color: '#0077b5',
                }}
              >
                <LinkedInIcon fontSize="inherit" />
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: '#64748b',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontSize: '11px',
                  mb: 1,
                }}
              >
                LinkedIn
              </Typography>
              <MuiLink
                href={analysis.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#0077b5',
                  textDecoration: 'none',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                View Profile
              </MuiLink>
            </Box>
          </Grid>
        )}

        {/* Blog URL */}
        {analysis.blogUrl && (
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Box
              sx={{
                background: 'rgba(255, 255, 255, 0.95)',
                backdropFilter: 'blur(20px)',
                borderRadius: 3,
                p: 3,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                height: '100%',
              }}
            >
              <Box
                sx={{
                  fontSize: '32px',
                  mb: 2,
                  color: '#667eea',
                }}
              >
                <BlogIcon fontSize="inherit" />
              </Box>
              <Typography
                variant="body2"
                sx={{
                  color: '#64748b',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  fontSize: '11px',
                  mb: 1,
                }}
              >
                Blog
              </Typography>
              <MuiLink
                href={analysis.blogUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: '#667eea',
                  textDecoration: 'none',
                  display: 'block',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  '&:hover': {
                    textDecoration: 'underline',
                  },
                }}
              >
                Visit Blog
              </MuiLink>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};
