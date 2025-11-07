// src/components/features/companies/OfferIdeaCard.tsx
// Individual idea card component for reviewing AI-generated blog ideas

import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Box,
  Collapse,
  IconButton,
} from '@mui/material';
import {
  CheckCircle as ApproveIcon,
  Cancel as RejectIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';
import { GeneratedIdea } from '../../../services/api/companyIdeas';

interface OfferIdeaCardProps {
  idea: GeneratedIdea;
  onApprove: (ideaId: string) => void;
  onReject: (ideaId: string) => void;
  onFeedbackChange: (ideaId: string, feedback: string) => void;
}

export const OfferIdeaCard: React.FC<OfferIdeaCardProps> = ({
  idea,
  onApprove,
  onReject,
  onFeedbackChange,
}) => {
  const [showFeedback, setShowFeedback] = useState(false);
  const [localFeedback, setLocalFeedback] = useState(idea.feedback || '');

  const handleFeedbackChange = (value: string) => {
    setLocalFeedback(value);
    onFeedbackChange(idea.id, value);
  };

  const isApproved = idea.approved;
  const isRejected = idea.rejected;

  return (
    <Card
      sx={{
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderRadius: 3,
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07)',
        border: isApproved
          ? '2px solid #10b981'
          : isRejected
          ? '2px solid #ef4444'
          : '1px solid #e2e8f0',
        transition: 'all 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 12px rgba(0, 0, 0, 0.1)',
        },
      }}
    >
      <CardContent sx={{ padding: 3 }}>
        {/* Title */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 600,
            fontSize: '1rem',
            color: '#1e293b',
            mb: 1.5,
          }}
        >
          {idea.title}
        </Typography>

        {/* Content */}
        <Typography
          variant="body2"
          sx={{
            color: '#64748b',
            fontSize: '0.875rem',
            lineHeight: 1.6,
            mb: 2,
          }}
        >
          {idea.content}
        </Typography>

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 1, mb: showFeedback ? 2 : 0 }}>
          <Button
            variant="contained"
            size="small"
            startIcon={<ApproveIcon />}
            onClick={() => onApprove(idea.id)}
            disabled={isRejected}
            sx={{
              flex: 1,
              backgroundColor: isApproved ? '#10b981' : '#e2e8f0',
              color: isApproved ? 'white' : '#64748b',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': {
                backgroundColor: isApproved ? '#059669' : '#cbd5e1',
              },
              '&:disabled': {
                backgroundColor: '#f1f5f9',
                color: '#94a3b8',
              },
            }}
          >
            {isApproved ? 'Approved' : 'Approve'}
          </Button>

          <Button
            variant="outlined"
            size="small"
            startIcon={<RejectIcon />}
            onClick={() => onReject(idea.id)}
            disabled={isApproved}
            sx={{
              flex: 1,
              borderColor: isRejected ? '#ef4444' : '#e2e8f0',
              color: isRejected ? '#ef4444' : '#64748b',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': {
                borderColor: isRejected ? '#dc2626' : '#cbd5e1',
                backgroundColor: isRejected
                  ? 'rgba(239, 68, 68, 0.04)'
                  : 'rgba(0, 0, 0, 0.04)',
              },
              '&:disabled': {
                borderColor: '#f1f5f9',
                color: '#94a3b8',
              },
            }}
          >
            {isRejected ? 'Rejected' : 'Reject'}
          </Button>

          <IconButton
            size="small"
            onClick={() => setShowFeedback(!showFeedback)}
            sx={{
              color: showFeedback || localFeedback ? '#667eea' : '#94a3b8',
              '&:hover': {
                backgroundColor: 'rgba(102, 126, 234, 0.08)',
              },
            }}
          >
            <CommentIcon />
          </IconButton>
        </Box>

        {/* Feedback Field */}
        <Collapse in={showFeedback}>
          <TextField
            fullWidth
            multiline
            rows={2}
            placeholder="Add feedback or notes for this idea..."
            value={localFeedback}
            onChange={(e) => handleFeedbackChange(e.target.value)}
            size="small"
            sx={{
              mt: 2,
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
        </Collapse>

        {/* Display feedback if exists but collapsed */}
        {!showFeedback && localFeedback && (
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              mt: 1,
              color: '#667eea',
              fontSize: '0.75rem',
              fontStyle: 'italic',
            }}
          >
            Has feedback
          </Typography>
        )}
      </CardContent>
    </Card>
  );
};
