// src/components/features/companies/OfferIdeasReviewUI.tsx
// UI for reviewing and approving AI-generated blog ideas

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  Paper,
  Alert,
  Grid,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RegenerateIcon,
} from '@mui/icons-material';
import { OfferIdeaCard } from './OfferIdeaCard';
import { GeneratedIdea } from '../../../services/api/companyIdeas';

interface OfferIdeasReviewUIProps {
  ideas: GeneratedIdea[];
  onApprove: (ideaId: string) => void;
  onReject: (ideaId: string) => void;
  onFeedbackChange: (ideaId: string, feedback: string) => void;
  onGeneralFeedbackChange: (feedback: string) => void;
  onSave: () => void;
  onRegenerate: () => void;
  generalFeedback: string;
  isSaving: boolean;
}

export const OfferIdeasReviewUI: React.FC<OfferIdeasReviewUIProps> = ({
  ideas,
  onApprove,
  onReject,
  onFeedbackChange,
  onGeneralFeedbackChange,
  onSave,
  onRegenerate,
  generalFeedback,
  isSaving,
}) => {
  const approvedCount = ideas.filter(i => i.approved).length;
  const rejectedCount = ideas.filter(i => i.rejected).length;
  const pendingCount = ideas.length - approvedCount - rejectedCount;

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
            Review Generated Ideas
          </Typography>
          <Typography
            variant="body2"
            sx={{
              color: '#64748b',
              fontSize: '0.875rem',
            }}
          >
            {approvedCount} approved • {rejectedCount} rejected • {pendingCount} pending
          </Typography>
        </Box>

        <Button
          variant="outlined"
          startIcon={<RegenerateIcon />}
          onClick={onRegenerate}
          disabled={isSaving}
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
          Regenerate
        </Button>
      </Box>

      {/* Alert if no ideas approved */}
      {approvedCount === 0 && (
        <Alert
          severity="info"
          sx={{
            mb: 3,
            backgroundColor: 'rgba(102, 126, 234, 0.08)',
            color: '#475569',
            '& .MuiAlert-icon': {
              color: '#667eea',
            },
          }}
        >
          Please approve at least one idea before saving
        </Alert>
      )}

      {/* Ideas Grid */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        {ideas.map((idea) => (
          <Grid size={{ xs: 12, md: 6, lg: 4 }} key={idea.id}>
            <OfferIdeaCard
              idea={idea}
              onApprove={onApprove}
              onReject={onReject}
              onFeedbackChange={onFeedbackChange}
            />
          </Grid>
        ))}
      </Grid>

      {/* General Feedback Section */}
      <Paper
        elevation={0}
        sx={{
          padding: 3,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          mb: 3,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: '#1e293b',
            mb: 1.5,
            fontSize: '0.875rem',
          }}
        >
          Overall Notes & Feedback (Optional)
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={3}
          placeholder="Add general feedback, notes, or context about these ideas..."
          value={generalFeedback}
          onChange={(e) => onGeneralFeedbackChange(e.target.value)}
          disabled={isSaving}
          sx={{
            '& .MuiOutlinedInput-root': {
              backgroundColor: '#f8fafc',
              fontSize: '0.875rem',
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: '#667eea',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#667eea',
              },
            },
          }}
        />
      </Paper>

      {/* Save Button */}
      <Button
        fullWidth
        variant="contained"
        size="large"
        startIcon={<SaveIcon />}
        onClick={onSave}
        disabled={approvedCount === 0 || isSaving}
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 600,
          textTransform: 'none',
          padding: '14px 24px',
          fontSize: '1rem',
          borderRadius: 2,
          '&:hover': {
            background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)',
          },
          '&:disabled': {
            background: '#e2e8f0',
            color: '#94a3b8',
          },
          transition: 'all 0.2s ease',
        }}
      >
        {isSaving
          ? 'Saving...'
          : `Save ${approvedCount} Approved Idea${approvedCount !== 1 ? 's' : ''}`}
      </Button>
    </Box>
  );
};
