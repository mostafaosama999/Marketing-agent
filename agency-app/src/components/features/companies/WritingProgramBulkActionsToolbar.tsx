// src/components/features/companies/WritingProgramBulkActionsToolbar.tsx
import React from 'react';
import { Box, Button, IconButton, Typography, Tooltip, Chip } from '@mui/material';
import {
  Close as CloseIcon,
  Science as AnalyzeIcon,
} from '@mui/icons-material';

interface WritingProgramBulkActionsToolbarProps {
  selectedCount: number;
  onAnalyze: () => void;
  onClear: () => void;
}

export const WritingProgramBulkActionsToolbar: React.FC<WritingProgramBulkActionsToolbarProps> = ({
  selectedCount,
  onAnalyze,
  onClear,
}) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <Box
      sx={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        p: 2,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: '8px 8px 0 0',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        mb: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Chip
          label={`${selectedCount} selected`}
          sx={{
            bgcolor: 'rgba(255,255,255,0.2)',
            color: 'white',
            fontWeight: 600,
            fontSize: '14px',
          }}
        />
        <Typography variant="body2" sx={{ opacity: 0.9 }}>
          {selectedCount === 1 ? 'company' : 'companies'}
        </Typography>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Tooltip title="Analyze writing programs for selected companies">
          <Button
            variant="contained"
            startIcon={<AnalyzeIcon />}
            onClick={onAnalyze}
            sx={{
              bgcolor: 'rgba(255,255,255,0.95)',
              color: '#667eea',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': {
                bgcolor: 'white',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              },
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            Analyze Writing Programs
          </Button>
        </Tooltip>

        <Tooltip title="Clear selection">
          <IconButton
            onClick={onClear}
            sx={{
              color: 'white',
              bgcolor: 'rgba(255,255,255,0.1)',
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)',
              },
            }}
          >
            <CloseIcon />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
};
