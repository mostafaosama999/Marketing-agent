// src/components/features/crm/TemplateVersionPickerDialog.tsx
// Dialog for resolving conflicts when multiple template versions match a company's labels

import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Chip,
  Card,
  CardActionArea,
  CardContent,
} from '@mui/material';
import { OfferTemplateVersion } from '../../../types/settings';

interface TemplateVersionPickerDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (version: OfferTemplateVersion) => void;
  matchingVersions: OfferTemplateVersion[];
  companyName: string;
  companyLabels: string[];
  defaultVersion?: OfferTemplateVersion;
}

/** Strip HTML tags and truncate for preview */
function getPreviewSnippet(html: string, maxLength = 120): string {
  const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '...';
}

export const TemplateVersionPickerDialog: React.FC<TemplateVersionPickerDialogProps> = ({
  open,
  onClose,
  onSelect,
  matchingVersions,
  companyName,
  companyLabels,
  defaultVersion,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={600}>
          Multiple templates match
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {companyName} has labels that match multiple template versions. Choose which to use:
        </Typography>
        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {companyLabels.map(label => (
            <Chip
              key={label}
              label={label}
              size="small"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontWeight: 500,
                fontSize: '0.75rem',
              }}
            />
          ))}
        </Box>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {matchingVersions.map(version => (
            <Card
              key={version.id}
              variant="outlined"
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  borderColor: '#667eea',
                  boxShadow: '0 0 0 1px #667eea',
                },
              }}
            >
              <CardActionArea onClick={() => onSelect(version)}>
                <CardContent sx={{ py: 1.5, px: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="subtitle1" fontWeight={600}>
                      {version.name}
                    </Typography>
                    <Chip
                      label={version.id.toUpperCase()}
                      size="small"
                      variant="outlined"
                      sx={{ fontSize: '0.7rem', height: 22 }}
                    />
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 0.75 }}>
                    {version.labels.map(label => (
                      <Chip
                        key={label}
                        label={label}
                        size="small"
                        sx={{
                          fontSize: '0.7rem',
                          height: 20,
                          bgcolor: companyLabels.includes(label) ? 'rgba(102, 126, 234, 0.12)' : 'action.hover',
                          color: companyLabels.includes(label) ? '#667eea' : 'text.secondary',
                          fontWeight: companyLabels.includes(label) ? 600 : 400,
                        }}
                      />
                    ))}
                  </Box>
                  {version.offerTemplate && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                      {getPreviewSnippet(version.offerTemplate)}
                    </Typography>
                  )}
                </CardContent>
              </CardActionArea>
            </Card>
          ))}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {defaultVersion && !matchingVersions.some(v => v.isDefault) && (
          <Button
            onClick={() => onSelect(defaultVersion)}
            size="small"
            sx={{ color: '#667eea' }}
          >
            Use Default ({defaultVersion.name})
          </Button>
        )}
        <Button onClick={onClose} size="small" color="inherit">
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
};
