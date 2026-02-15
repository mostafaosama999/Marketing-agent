// src/components/features/companies/GenerateOffersDialog.tsx
// Pre-generation dialog for choosing which pipelines to run

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
} from '@mui/material';
import { AutoAwesome as AnalyzeIcon } from '@mui/icons-material';

interface GenerateOffersDialogProps {
  open: boolean;
  onClose: () => void;
  onGenerate: (options: { contentIdeas: boolean; blogAudit: boolean }) => void;
  companyName: string;
}

export const GenerateOffersDialog: React.FC<GenerateOffersDialogProps> = ({
  open,
  onClose,
  onGenerate,
  companyName,
}) => {
  const [contentIdeas, setContentIdeas] = useState(true);
  const [blogAudit, setBlogAudit] = useState(false);

  const handleGenerate = () => {
    onGenerate({ contentIdeas, blogAudit });
    onClose();
  };

  const noneSelected = !contentIdeas && !blogAudit;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle
        sx={{
          fontWeight: 700,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Generate Offers for {companyName}
      </DialogTitle>
      <DialogContent sx={{ pt: 3 }}>
        <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
          Select which analysis pipelines to run. Each pipeline runs independently.
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: contentIdeas ? '2px solid #667eea' : '1px solid #e2e8f0',
              background: contentIdeas ? 'rgba(102, 126, 234, 0.04)' : 'transparent',
              cursor: 'pointer',
            }}
            onClick={() => setContentIdeas(!contentIdeas)}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={contentIdeas}
                  onChange={(e) => setContentIdeas(e.target.checked)}
                  sx={{ color: '#667eea', '&.Mui-checked': { color: '#667eea' } }}
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Content Ideas (V1 / V2 / V3)
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    Generate tailored blog topic ideas using 3 independent pipelines
                  </Typography>
                </Box>
              }
            />
          </Box>

          <Box
            sx={{
              p: 2,
              borderRadius: 2,
              border: blogAudit ? '2px solid #667eea' : '1px solid #e2e8f0',
              background: blogAudit ? 'rgba(102, 126, 234, 0.04)' : 'transparent',
              cursor: 'pointer',
            }}
            onClick={() => setBlogAudit(!blogAudit)}
          >
            <FormControlLabel
              control={
                <Checkbox
                  checked={blogAudit}
                  onChange={(e) => setBlogAudit(e.target.checked)}
                  sx={{ color: '#667eea', '&.Mui-checked': { color: '#667eea' } }}
                />
              }
              label={
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    Blog Audit
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                    AI agent analyzes company blog vs competitors. Produces a short offer paragraph.
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 0.5 }}>
                    Estimated cost: ~$0.50 - $2.00
                  </Typography>
                </Box>
              }
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: 'none', color: '#64748b' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          startIcon={<AnalyzeIcon />}
          onClick={handleGenerate}
          disabled={noneSelected}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            fontWeight: 600,
            textTransform: 'none',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
            },
            '&:disabled': { background: '#e2e8f0', color: '#94a3b8' },
          }}
        >
          Generate
        </Button>
      </DialogActions>
    </Dialog>
  );
};
