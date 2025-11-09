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
  CircularProgress,
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
  onStartSearch: () => Promise<void>; // Callback to trigger search when user chooses to search
  urls: URLOption[];
  loading?: boolean;
  existingUrl?: string; // URL from mapped custom field
}

export const WritingProgramUrlSelectionDialog: React.FC<WritingProgramUrlSelectionDialogProps> = ({
  open,
  onClose,
  onSelect,
  onStartSearch,
  urls,
  loading = false,
  existingUrl,
}) => {
  const [selectedUrl, setSelectedUrl] = useState<string>('');
  const [customUrl, setCustomUrl] = useState<string>('');
  const [useCustom, setUseCustom] = useState<boolean>(false);
  const [mode, setMode] = useState<'existing' | 'search'>('existing'); // Track which option user chose

  const handleSelect = () => {
    let urlToUse = '';

    // If using existing URL from mapped field
    if (existingUrl && mode === 'existing') {
      urlToUse = existingUrl;
    }
    // If using custom URL
    else if (useCustom) {
      urlToUse = customUrl.trim();
    }
    // If using searched/found URL
    else {
      urlToUse = selectedUrl;
    }

    if (urlToUse) {
      onSelect(urlToUse);
    }
  };

  const handleClose = () => {
    setSelectedUrl('');
    setCustomUrl('');
    setUseCustom(false);
    setMode('existing');
    onClose();
  };

  const handleCustomUrlChange = (value: string) => {
    setCustomUrl(value);
    setUseCustom(true);
    setSelectedUrl('');
  };

  const handleModeChange = async (newMode: 'existing' | 'search') => {
    setMode(newMode);

    // If user selects "search", trigger the search immediately
    if (newMode === 'search') {
      await onStartSearch();
    }
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
        {loading && urls.length === 0
          ? 'Finding Writing Programs...'
          : !loading && urls.length === 0
          ? 'No Programs Found'
          : 'Select Writing Program URL'}
      </DialogTitle>

      <DialogContent sx={{ pt: 2 }}>
        {/* Existing URL Options - Show when existingUrl is provided and not loading */}
        {existingUrl && !loading && (
          <Box sx={{ mb: 3 }}>
            <Alert severity="success" sx={{ mb: 2 }}>
              A program URL was found in your mapped field. Choose an option below:
            </Alert>

            <RadioGroup
              value={mode}
              onChange={(e) => handleModeChange(e.target.value as 'existing' | 'search')}
            >
              {/* Option 1: Use existing URL */}
              <Box
                sx={{
                  mb: 2,
                  p: 2,
                  border: '2px solid',
                  borderColor: mode === 'existing' ? '#667eea' : '#e2e8f0',
                  borderRadius: 2,
                  backgroundColor: mode === 'existing' ? 'rgba(102, 126, 234, 0.04)' : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.02)',
                  },
                }}
              >
                <FormControlLabel
                  value="existing"
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
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: '#1e293b' }}>
                        Use Existing URL from Mapped Field
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Link
                          href={existingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            color: '#667eea',
                            textDecoration: 'none',
                            fontWeight: 500,
                            fontSize: '13px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            '&:hover': {
                              textDecoration: 'underline',
                            },
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {existingUrl}
                          <OpenIcon sx={{ fontSize: 14 }} />
                        </Link>
                      </Box>
                      <Chip
                        size="small"
                        label="From Mapped Field"
                        icon={<CheckIcon />}
                        sx={{
                          bgcolor: '#dcfce7',
                          color: '#16a34a',
                          fontSize: '11px',
                          height: '22px',
                          mt: 1,
                          '& .MuiChip-icon': {
                            fontSize: 14,
                            color: '#16a34a',
                          },
                        }}
                      />
                    </Box>
                  }
                  sx={{
                    width: '100%',
                    alignItems: 'flex-start',
                    m: 0,
                  }}
                />
              </Box>

              {/* Option 2: Search for new URL */}
              <Box
                sx={{
                  p: 2,
                  border: '2px solid',
                  borderColor: mode === 'search' ? '#667eea' : '#e2e8f0',
                  borderRadius: 2,
                  backgroundColor: mode === 'search' ? 'rgba(102, 126, 234, 0.04)' : 'transparent',
                  transition: 'all 0.2s',
                  '&:hover': {
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.02)',
                  },
                }}
              >
                <FormControlLabel
                  value="search"
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
                      <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, color: '#1e293b' }}>
                        Search for New URL
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Find a different writing program URL by searching the company website
                      </Typography>
                    </Box>
                  }
                  sx={{
                    width: '100%',
                    alignItems: 'flex-start',
                    m: 0,
                  }}
                />
              </Box>
            </RadioGroup>
          </Box>
        )}

        {/* Only show search results if mode is 'search' or no existingUrl */}
        {(!existingUrl || mode === 'search') && (
          <>
        {/* Loading State - Show spinner only */}
        {loading && urls.length === 0 ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 2,
              py: 6,
            }}
          >
            <CircularProgress size={48} sx={{ color: '#667eea' }} />
            <Typography variant="body1" sx={{ fontWeight: 500, color: '#1e293b' }}>
              Searching for writing programs...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This may take a few moments
            </Typography>
          </Box>
        ) : (
          <>
            {/* URLs Found - Show list */}
            {!loading && urls.length > 0 && (
              <>
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
              </>
            )}

            {/* No URLs Found - Show custom URL input only */}
            {!loading && urls.length === 0 && (
              <>
                <Alert severity="info" sx={{ mb: 3 }}>
                  No writing program URLs found. Please enter a custom URL below.
                </Alert>

                <Box
                  sx={{
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
                      Enter Custom URL
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
                    Enter the URL of the company's writing program
                  </Typography>
                </Box>
              </>
            )}
          </>
        )}
        </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
        <Button
          onClick={handleClose}
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
          disabled={
            // Disable if no option is selected
            (existingUrl && mode === 'existing' ? false : !selectedUrl && !customUrl.trim())
          }
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
          {loading
            ? (mode === 'search' && urls.length === 0 ? 'Searching...' : 'Analyzing...')
            : existingUrl && mode === 'existing'
            ? 'Analyze Existing URL'
            : 'Analyze Program'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
