// src/components/features/analytics/LinkedInManualSync.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
} from '@mui/material';
import {
  ContentPaste as PasteIcon,
  CheckCircle as SuccessIcon,
  LinkedIn as LinkedInIcon,
} from '@mui/icons-material';
import { extractLinkedInAnalytics, ExtractionResult } from '../../../services/api/linkedinManualService';

interface LinkedInManualSyncProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const LinkedInManualSync: React.FC<LinkedInManualSyncProps> = ({
  open,
  onClose,
  onSuccess,
}) => {
  const [pastedContent, setPastedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setPastedContent(text);
      setError(null);
    } catch (err) {
      setError('Failed to read clipboard. Please paste manually using Ctrl+V or Cmd+V.');
    }
  };

  const handleExtract = async () => {
    if (!pastedContent || pastedContent.trim().length < 100) {
      setError('Please paste content from your LinkedIn analytics page.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const extractionResult = await extractLinkedInAnalytics(pastedContent);

      setResult(extractionResult);

      // Call success callback after a short delay to show success message
      setTimeout(() => {
        if (onSuccess) {
          onSuccess();
        }
        handleClose();
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to extract analytics. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPastedContent('');
    setError(null);
    setResult(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
        },
      }}
    >
      <DialogTitle sx={{
        background: 'linear-gradient(135deg, #0077b5 0%, #005885 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        gap: 2,
      }}>
        <LinkedInIcon />
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Sync LinkedIn Analytics
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.9 }}>
            Paste your LinkedIn analytics page content
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ mt: 3 }}>
        {/* Instructions */}
        {!result && (
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              How to sync:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary="1. Go to LinkedIn → Analytics → Top performing posts"
                  secondary="Make sure you're viewing 'Past 7 days' or your desired period"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="2. Select all content (Ctrl+A or Cmd+A)"
                  secondary="This will copy the entire page including post data and metrics"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary="3. Paste below (Ctrl+V or Cmd+V)"
                  secondary="Or click the 'Paste from Clipboard' button"
                />
              </ListItem>
            </List>
          </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Success Result */}
        {result && (
          <Alert
            severity="success"
            icon={<SuccessIcon />}
            sx={{ mb: 3 }}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Analytics extracted successfully!
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 2 }}>
              <Chip
                label={`${result.data.postsExtracted} posts`}
                size="small"
                color="primary"
              />
              <Chip
                label={`${result.data.totalImpressions.toLocaleString()} impressions`}
                size="small"
                color="primary"
              />
              <Chip
                label={`${result.data.totalEngagement.toLocaleString()} engagement`}
                size="small"
                color="primary"
              />
            </Box>
            <Typography variant="caption" sx={{ display: 'block', mt: 2, color: '#64748b' }}>
              Top post: {result.data.topPost}
            </Typography>
          </Alert>
        )}

        {/* Paste Area */}
        {!result && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                LinkedIn Analytics Content
              </Typography>
              <Button
                startIcon={<PasteIcon />}
                onClick={handlePaste}
                size="small"
                sx={{
                  textTransform: 'none',
                  color: '#0077b5',
                }}
              >
                Paste from Clipboard
              </Button>
            </Box>

            <TextField
              multiline
              rows={12}
              fullWidth
              variant="outlined"
              placeholder="Paste your LinkedIn analytics page content here...

Example content should include:
- Post titles and preview text
- Impression counts (e.g., '1,178 Impressions')
- Engagement metrics (likes, comments, shares)
- Post dates (e.g., '2w', '3d', '1d')"
              value={pastedContent}
              onChange={(e) => setPastedContent(e.target.value)}
              disabled={loading}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'monospace',
                  fontSize: '13px',
                  background: '#f8fafc',
                },
              }}
            />

            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: '#64748b' }}>
              {pastedContent.length} characters pasted
              {pastedContent.length > 0 && pastedContent.length < 100 && ' (too short, please paste more)'}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          sx={{ textTransform: 'none' }}
        >
          {result ? 'Close' : 'Cancel'}
        </Button>

        {!result && (
          <Button
            onClick={handleExtract}
            disabled={loading || pastedContent.trim().length < 100}
            variant="contained"
            startIcon={loading ? <CircularProgress size={20} /> : null}
            sx={{
              background: 'linear-gradient(135deg, #0077b5 0%, #005885 100%)',
              color: 'white',
              textTransform: 'none',
              px: 3,
              '&:hover': {
                background: 'linear-gradient(135deg, #006399 0%, #004d6d 100%)',
              },
              '&:disabled': {
                background: '#94a3b8',
                color: 'white',
              },
            }}
          >
            {loading ? 'Extracting...' : 'Extract & Save Analytics'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default LinkedInManualSync;
