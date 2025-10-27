import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Box,
  Typography,
  Chip,
  Alert,
  Link,
  TextField,
} from '@mui/material';
import {
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  OpenInNew as OpenIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

interface URLOption {
  url: string;
  source: 'pattern' | 'ai';
  confidence?: 'high' | 'medium' | 'low';
  verified?: boolean;
}

interface WritingProgramUrlSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selectedUrl: string) => void;
  urls: URLOption[];
  loading?: boolean;
}

export const WritingProgramUrlSelectionDialog: React.FC<WritingProgramUrlSelectionDialogProps> = ({
  open,
  onClose,
  onSelect,
  urls,
  loading = false,
}) => {
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [useCustom, setUseCustom] = useState<boolean>(false);

  const handleSelect = () => {
    const urlToUse = useCustom ? customUrl.trim() : selectedUrl;
    if (urlToUse) {
      onSelect(urlToUse);
    }
  };

  const handleClose = () => {
    setSelectedUrl('');
    setCustomUrl('');
    setUseCustom(false);
    onClose();
  };

  const handleCustomUrlChange = (value: string) => {
    setCustomUrl(value);
    setUseCustom(true);
    setSelectedUrl('');
  };

  const getConfidenceColor = (confidence?: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return '#10b981';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#ef4444';
      default:
        return '#667eea';
    }
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
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 700,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          backgroundClip: 'text',
          WebkitBackgroundClip: 'text',
          color: 'transparent',
          pb: 1,
        }}
      >
        Select Writing Program URL
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        <Alert severity="info" sx={{ mb: 3 }}>
          We found {urls.length} potential writing program URL{urls.length !== 1 ? 's' : ''}.
          Please select the correct one to analyze in detail.
        </Alert>

        <RadioGroup
          value={selectedUrl}
          onChange={(e) => setSelectedUrl(e.target.value)}
        >
          {urls.map((urlOption, index) => (
            <Box
              key={index}
              sx={{
                mb: 2,
                p: 2,
                border: '1px solid',
                borderColor: selectedUrl === urlOption.url ? '#667eea' : '#e2e8f0',
                borderRadius: 2,
                backgroundColor: selectedUrl === urlOption.url ? 'rgba(102, 126, 234, 0.04)' : 'transparent',
                transition: 'all 0.2s',
                '&:hover': {
                  borderColor: '#667eea',
                  backgroundColor: 'rgba(102, 126, 234, 0.02)',
                },
              }}
            >
              <FormControlLabel
                value={urlOption.url}
                control={
                  <Radio
                    sx={{
                      color: '#667eea',
                      '&.Mui-checked': {
                        color: '#667eea',
                      },
                    }}
                  />
                }
                label={
                  <Box sx={{ width: '100%', ml: 1 }}>
                    {/* URL with link */}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Link
                        href={urlOption.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        sx={{
                          color: '#667eea',
                          textDecoration: 'none',
                          fontWeight: 500,
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          '&:hover': {
                            textDecoration: 'underline',
                          },
                        }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {urlOption.url}
                        <OpenIcon sx={{ fontSize: 14 }} />
                      </Link>
                    </Box>

                    {/* Badges */}
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {/* Source badge */}
                      <Chip
                        size="small"
                        label={urlOption.source === 'pattern' ? 'Pattern Match' : 'AI Suggestion'}
                        icon={urlOption.source === 'pattern' ? <CheckIcon /> : undefined}
                        sx={{
                          bgcolor: urlOption.source === 'pattern' ? '#e0e7ff' : '#fef3c7',
                          color: urlOption.source === 'pattern' ? '#4338ca' : '#92400e',
                          fontSize: '11px',
                          height: '22px',
                          '& .MuiChip-icon': {
                            fontSize: 14,
                            color: urlOption.source === 'pattern' ? '#4338ca' : '#92400e',
                          },
                        }}
                      />

                      {/* Confidence badge for AI suggestions */}
                      {urlOption.source === 'ai' && urlOption.confidence && (
                        <Chip
                          size="small"
                          label={`${urlOption.confidence} confidence`}
                          sx={{
                            bgcolor: `${getConfidenceColor(urlOption.confidence)}20`,
                            color: getConfidenceColor(urlOption.confidence),
                            fontSize: '11px',
                            height: '22px',
                          }}
                        />
                      )}

                      {/* Verified badge */}
                      {urlOption.verified && (
                        <Chip
                          size="small"
                          label="Verified"
                          icon={<CheckIcon />}
                          sx={{
                            bgcolor: '#d1fae5',
                            color: '#065f46',
                            fontSize: '11px',
                            height: '22px',
                            '& .MuiChip-icon': {
                              fontSize: 14,
                              color: '#065f46',
                            },
                          }}
                        />
                      )}

                      {/* Unverified badge */}
                      {urlOption.source === 'ai' && urlOption.verified === false && (
                        <Chip
                          size="small"
                          label="Unverified"
                          icon={<ErrorIcon />}
                          sx={{
                            bgcolor: '#fee2e2',
                            color: '#991b1b',
                            fontSize: '11px',
                            height: '22px',
                            '& .MuiChip-icon': {
                              fontSize: 14,
                              color: '#991b1b',
                            },
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                }
                sx={{
                  width: '100%',
                  alignItems: 'flex-start',
                  m: 0,
                }}
              />
            </Box>
          ))}
        </RadioGroup>

        {/* Custom URL Input */}
        <Box
          sx={{
            mt: 3,
            p: 2,
            border: '1px solid',
            borderColor: useCustom ? '#667eea' : '#e2e8f0',
            borderRadius: 2,
            backgroundColor: useCustom ? 'rgba(102, 126, 234, 0.04)' : 'transparent',
            transition: 'all 0.2s',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <EditIcon sx={{ color: '#667eea', fontSize: 20 }} />
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#1e293b' }}>
              Or Enter Custom URL
            </Typography>
          </Box>
          <TextField
            fullWidth
            placeholder="https://example.com/write-for-us"
            value={customUrl}
            onChange={(e) => handleCustomUrlChange(e.target.value)}
            size="small"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: '#667eea',
                },
              },
            }}
          />
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 1 }}>
            Enter a custom writing program URL if the ones above are incorrect
          </Typography>
        </Box>

        {urls.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">
              No writing program URLs found
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
        <Button
          onClick={handleClose}
          disabled={loading}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            color: '#64748b',
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSelect}
          disabled={(!selectedUrl && !customUrl.trim()) || loading}
          variant="contained"
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
            },
            '&:disabled': {
              background: '#e2e8f0',
              color: '#94a3b8',
            },
          }}
        >
          {loading ? 'Analyzing...' : 'Analyze Selected URL'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
