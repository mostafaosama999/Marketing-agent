// src/components/features/companies/ApprovedIdeasDisplay.tsx
// Display approved AI-generated blog ideas

import React from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Chip,
  Grid,
} from '@mui/material';
import {
  Refresh as RegenerateIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { AnalysisCard } from './AnalysisCard';
import { GeneratedIdea } from '../../../services/api/companyIdeas';

// Helper function to format relative time without external dependencies
const formatDistanceToNow = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
  if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`;
  return `${diffYears} year${diffYears !== 1 ? 's' : ''} ago`;
};

interface ApprovedIdeasDisplayProps {
  ideas: GeneratedIdea[];
  lastGeneratedAt?: Date;
  generalFeedback?: string;
  onRegenerate: () => void;
}

export const ApprovedIdeasDisplay: React.FC<ApprovedIdeasDisplayProps> = ({
  ideas,
  lastGeneratedAt,
  generalFeedback,
  onRegenerate,
}) => {
  const approvedIdeas = ideas.filter(i => i.approved);

  return (
    <Box>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 0.5,
            }}
          >
            Approved Blog Ideas
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body2"
              sx={{
                color: '#64748b',
                fontSize: '0.875rem',
              }}
            >
              {approvedIdeas.length} approved idea{approvedIdeas.length !== 1 ? 's' : ''}
            </Typography>
            {lastGeneratedAt && (
              <>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#cbd5e1',
                    fontSize: '0.875rem',
                  }}
                >
                  •
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    color: '#64748b',
                    fontSize: '0.875rem',
                  }}
                >
                  Generated {formatDistanceToNow(lastGeneratedAt)}
                </Typography>
              </>
            )}
          </Box>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RegenerateIcon />}
          onClick={onRegenerate}
          sx={{
            borderColor: '#667eea',
            color: '#667eea',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': {
              borderColor: '#5568d3',
              backgroundColor: 'rgba(102, 126, 234, 0.04)',
            },
          }}
        >
          Regenerate Ideas
        </Button>
      </Box>

      {/* General Feedback (if exists) */}
      {generalFeedback && (
        <Paper
          elevation={0}
          sx={{
            padding: 2.5,
            background: 'rgba(102, 126, 234, 0.08)',
            backdropFilter: 'blur(20px)',
            borderRadius: 2,
            border: '1px solid rgba(102, 126, 234, 0.2)',
            mb: 3,
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              fontWeight: 600,
              color: '#667eea',
              mb: 1,
              fontSize: '0.8rem',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Overall Notes
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#475569',
              fontSize: '0.875rem',
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
            }}
          >
            {generalFeedback}
          </Typography>
        </Paper>
      )}

      {/* Approved Ideas Grid */}
      <Grid container spacing={3}>
        {approvedIdeas.map((idea, index) => (
          <Grid size={{ xs: 12, md: 6 }} key={idea.id}>
            <AnalysisCard
              icon={<CheckIcon />}
              title={`Idea ${index + 1}`}
              value={idea.title}
              subtitle={idea.content}
              status="success"
            >
              {/* Individual Feedback */}
              {idea.feedback && (
                <Box
                  sx={{
                    mt: 2,
                    pt: 2,
                    borderTop: '1px solid #e2e8f0',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      fontWeight: 600,
                      color: '#64748b',
                      mb: 0.5,
                      fontSize: '0.7rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Feedback
                  </Typography>
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#64748b',
                      fontSize: '0.8rem',
                      fontStyle: 'italic',
                      lineHeight: 1.5,
                    }}
                  >
                    {idea.feedback}
                  </Typography>
                </Box>
              )}
            </AnalysisCard>
          </Grid>
        ))}
      </Grid>

      {/* Empty State (shouldn't happen but just in case) */}
      {approvedIdeas.length === 0 && (
        <Paper
          elevation={0}
          sx={{
            padding: 6,
            textAlign: 'center',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: 3,
            border: '1px solid #e2e8f0',
          }}
        >
          <Typography
            variant="body1"
            sx={{
              color: '#64748b',
              mb: 2,
            }}
          >
            No approved ideas found
          </Typography>
          <Button
            variant="contained"
            startIcon={<RegenerateIcon />}
            onClick={onRegenerate}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              },
            }}
          >
            Generate New Ideas
          </Button>
        </Paper>
      )}
    </Box>
  );
};
