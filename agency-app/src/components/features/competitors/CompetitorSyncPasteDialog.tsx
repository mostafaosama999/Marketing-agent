import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import {
  Close as CloseIcon,
  CloudSync as CloudSyncIcon,
} from '@mui/icons-material';
import CompetitorPasteCards from './CompetitorPasteCards';

interface CompetitorSyncPasteDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function CompetitorSyncPasteDialog({
  open,
  onClose,
}: CompetitorSyncPasteDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 2.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <CloudSyncIcon sx={{ fontSize: 28 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Sync Competitor Posts
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.9, display: 'block', mt: 0.5 }}>
              Paste LinkedIn feed content to automatically extract and save competitor posts
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          sx={{
            color: 'white',
            '&:hover': {
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 4, bgcolor: '#f8fafc' }}>
        {/* Instructions */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            <strong>How to sync competitor posts:</strong>
          </Typography>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: '0.875rem' }}>
            <li>Open a competitor's LinkedIn profile in your browser</li>
            <li>Scroll through their posts to load more content</li>
            <li>Select all content (Cmd/Ctrl + A) and copy (Cmd/Ctrl + C)</li>
            <li>Click "Paste from Clipboard" below or paste manually</li>
            <li>Click "Extract Posts" - AI will automatically detect the competitor and save posts</li>
            <li>Add more paste boxes to sync multiple competitors at once</li>
          </ol>
        </Alert>

        {/* Paste Cards */}
        <CompetitorPasteCards />
      </DialogContent>
    </Dialog>
  );
}
