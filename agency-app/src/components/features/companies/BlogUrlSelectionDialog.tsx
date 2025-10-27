// src/components/features/companies/BlogUrlSelectionDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Radio,
  RadioGroup,
  FormControlLabel,
  FormControl,
} from '@mui/material';
import {
  Link as LinkIcon,
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { Company } from '../../../types/crm';

interface BlogUrlSelectionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (url: string) => void;
  company: Company;
}

type SelectionMode = 'manual' | 'saved' | 'search';

export const BlogUrlSelectionDialog: React.FC<BlogUrlSelectionDialogProps> = ({
  open,
  onClose,
  onConfirm,
  company,
}) => {
  const [mode, setMode] = useState<SelectionMode>('saved');
  const [manualUrl, setManualUrl] = useState('');
  const [selectedSavedUrl, setSelectedSavedUrl] = useState<string | null>(null);
  const [searchedUrl, setSearchedUrl] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'select' | 'confirm'>('select');

  // Get available blog URLs from company data
  const getAvailableBlogUrls = (): Array<{ url: string; source: string }> => {
    const urls: Array<{ url: string; source: string }> = [];

    // Apollo enrichment blog URL
    if (company.apolloEnrichment?.blogUrl) {
      urls.push({
        url: company.apolloEnrichment.blogUrl,
        source: 'Apollo Enrichment',
      });
    }

    // Company website
    if (company.website) {
      urls.push({
        url: company.website,
        source: 'Company Website',
      });
    }

    // Custom fields blog URL
    if (company.customFields?.blog) {
      urls.push({
        url: company.customFields.blog,
        source: 'Custom Field',
      });
    }

    // Previous blog analysis URL
    if (company.blogAnalysis?.blogUrl) {
      urls.push({
        url: company.blogAnalysis.blogUrl,
        source: 'Previous Analysis',
      });
    }

    // Previous RSS feed URL
    if (company.blogAnalysis?.rssFeedUrl) {
      urls.push({
        url: company.blogAnalysis.rssFeedUrl,
        source: 'RSS Feed',
      });
    }

    // Remove duplicates
    const seen = new Set<string>();
    return urls.filter((item) => {
      if (seen.has(item.url)) return false;
      seen.add(item.url);
      return true;
    });
  };

  const availableUrls = getAvailableBlogUrls();

  // Auto-select mode based on available data
  useEffect(() => {
    if (open) {
      setStage('select');
      setError(null);
      setSearchedUrl(null);

      if (availableUrls.length > 0) {
        setMode('saved');
        setSelectedSavedUrl(availableUrls[0].url);
      } else if (company.website || company.name) {
        setMode('search');
      } else {
        setMode('manual');
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return false;
    }

    // Basic URL validation
    try {
      new URL(url);
      setError(null);
      return true;
    } catch {
      setError('Please enter a valid URL (e.g., https://example.com/blog)');
      return false;
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    setError(null);

    try {
      // Simulate search for now - in production, this would call an API
      // For now, we'll check if website exists and append /blog
      const baseUrl = company.website || `https://${company.name.toLowerCase().replace(/\s+/g, '')}.com`;

      // Simple heuristic: try common blog paths
      const potentialUrls = [
        `${baseUrl}/blog`,
        `${baseUrl}/blog/rss`,
        `${baseUrl}/feed`,
        baseUrl,
      ];

      // For now, just use the first one (in production, would actually fetch and verify)
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call

      const foundUrl = potentialUrls[0];
      setSearchedUrl(foundUrl);
      setMode('search');
    } catch (err) {
      setError('Could not find blog URL. Please enter manually.');
      setMode('manual');
    } finally {
      setSearching(false);
    }
  };

  const getSelectedUrl = (): string | null => {
    switch (mode) {
      case 'manual':
        return manualUrl.trim() || null;
      case 'saved':
        return selectedSavedUrl;
      case 'search':
        return searchedUrl;
      default:
        return null;
    }
  };

  const handleNext = () => {
    const url = getSelectedUrl();

    if (!url) {
      setError('Please select or enter a blog URL');
      return;
    }

    if (!validateUrl(url)) {
      return;
    }

    setStage('confirm');
  };

  const handleBack = () => {
    setStage('select');
    setError(null);
  };

  const handleConfirm = () => {
    const url = getSelectedUrl();
    if (url && validateUrl(url)) {
      onConfirm(url);
      onClose();
    }
  };

  const handleClose = () => {
    setManualUrl('');
    setSelectedSavedUrl(null);
    setSearchedUrl(null);
    setError(null);
    setStage('select');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx:{
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          fontSize: '1.25rem',
          color: '#1e293b',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {stage === 'select' ? 'Select Blog URL' : 'Confirm Blog Analysis'}
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2, px: 3 }}>
        {stage === 'select' ? (
          <Box>
            {/* Error Alert */}
            {error && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Choose how to select the blog URL for analysis:
            </Typography>

            <FormControl component="fieldset" fullWidth>
              <RadioGroup value={mode} onChange={(e) => setMode(e.target.value as SelectionMode)}>
                {/* Saved URLs */}
                {availableUrls.length > 0 && (
                  <Box
                    sx={{
                      mb: 3,
                      p: 2.5,
                      border: mode === 'saved' ? '2px solid #667eea' : '1px solid #e2e8f0',
                      borderRadius: '8px',
                      bgcolor: mode === 'saved' ? 'rgba(102, 126, 234, 0.04)' : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => setMode('saved')}
                  >
                    <FormControlLabel
                      value="saved"
                      control={<Radio sx={{ color: '#667eea', '&.Mui-checked': { color: '#667eea' } }} />}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <LinkIcon sx={{ color: '#667eea', fontSize: 20 }} />
                          <Typography variant="body1" sx={{ fontWeight: 600 }}>
                            Use Saved URL
                          </Typography>
                        </Box>
                      }
                      sx={{ mb: 1.5 }}
                    />

                    {mode === 'saved' && (
                      <Box sx={{ ml: 4, mt: 1 }}>
                        {availableUrls.map((item, index) => (
                          <Chip
                            key={index}
                            label={
                              <Box>
                                <Typography variant="caption" sx={{ fontSize: '11px', color: '#64748b' }}>
                                  {item.source}
                                </Typography>
                                <Typography variant="body2" sx={{ fontSize: '13px' }}>
                                  {item.url}
                                </Typography>
                              </Box>
                            }
                            onClick={() => setSelectedSavedUrl(item.url)}
                            sx={{
                              mb: 1,
                              mr: 1,
                              height: 'auto',
                              py: 1,
                              px: 1.5,
                              bgcolor: selectedSavedUrl === item.url ? '#667eea' : '#f1f5f9',
                              color: selectedSavedUrl === item.url ? 'white' : '#1e293b',
                              border: selectedSavedUrl === item.url ? '2px solid #667eea' : '1px solid #e2e8f0',
                              '&:hover': {
                                bgcolor: selectedSavedUrl === item.url ? '#5568d3' : '#e2e8f0',
                              },
                              '& .MuiChip-label': {
                                display: 'block',
                                whiteSpace: 'normal',
                              },
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>
                )}

                {/* Manual Entry */}
                <Box
                  sx={{
                    mb: 3,
                    p: 2.5,
                    border: mode === 'manual' ? '2px solid #667eea' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    bgcolor: mode === 'manual' ? 'rgba(102, 126, 234, 0.04)' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setMode('manual')}
                >
                  <FormControlLabel
                    value="manual"
                    control={<Radio sx={{ color: '#667eea', '&.Mui-checked': { color: '#667eea' } }} />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LinkIcon sx={{ color: '#667eea', fontSize: 20 }} />
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          Enter URL Manually
                        </Typography>
                      </Box>
                    }
                    sx={{ mb: mode === 'manual' ? 1.5 : 0 }}
                  />

                  {mode === 'manual' && (
                    <Box sx={{ ml: 4, mt: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="https://example.com/blog"
                        value={manualUrl}
                        onChange={(e) => setManualUrl(e.target.value)}
                        variant="outlined"
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            '&.Mui-focused fieldset': {
                              borderColor: '#667eea',
                            },
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                        Enter the blog URL or RSS feed URL
                      </Typography>
                    </Box>
                  )}
                </Box>

                {/* Search */}
                <Box
                  sx={{
                    mb: 2,
                    p: 2.5,
                    border: mode === 'search' ? '2px solid #667eea' : '1px solid #e2e8f0',
                    borderRadius: '8px',
                    bgcolor: mode === 'search' ? 'rgba(102, 126, 234, 0.04)' : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setMode('search')}
                >
                  <FormControlLabel
                    value="search"
                    control={<Radio sx={{ color: '#667eea', '&.Mui-checked': { color: '#667eea' } }} />}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <SearchIcon sx={{ color: '#667eea', fontSize: 20 }} />
                        <Typography variant="body1" sx={{ fontWeight: 600 }}>
                          Let AI Find Blog URL
                        </Typography>
                      </Box>
                    }
                    sx={{ mb: mode === 'search' ? 1.5 : 0 }}
                  />

                  {mode === 'search' && (
                    <Box sx={{ ml: 4, mt: 1 }}>
                      {!searchedUrl ? (
                        <Button
                          variant="outlined"
                          startIcon={searching ? <CircularProgress size={16} /> : <SearchIcon />}
                          onClick={handleSearch}
                          disabled={searching}
                          sx={{
                            textTransform: 'none',
                            borderColor: '#667eea',
                            color: '#667eea',
                            '&:hover': {
                              borderColor: '#5568d3',
                              bgcolor: 'rgba(102, 126, 234, 0.08)',
                            },
                          }}
                        >
                          {searching ? 'Searching...' : 'Search for Blog URL'}
                        </Button>
                      ) : (
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                            <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />
                            <Typography variant="body2" sx={{ fontWeight: 600, color: '#10b981' }}>
                              Found URL:
                            </Typography>
                          </Box>
                          <Typography
                            variant="body2"
                            sx={{
                              p: 1.5,
                              bgcolor: '#f8fafc',
                              borderRadius: '6px',
                              border: '1px solid #e2e8f0',
                              fontFamily: 'monospace',
                            }}
                          >
                            <a
                              href={searchedUrl.startsWith('http') ? searchedUrl : `https://${searchedUrl}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: '#667eea',
                                textDecoration: 'none',
                                fontWeight: 500,
                                borderBottom: '1px solid rgba(102, 126, 234, 0.3)',
                                transition: 'all 0.2s',
                                cursor: 'pointer',
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.borderBottomColor = '#667eea';
                                e.currentTarget.style.color = '#5568d3';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.borderBottomColor = 'rgba(102, 126, 234, 0.3)';
                                e.currentTarget.style.color = '#667eea';
                              }}
                            >
                              {searchedUrl}
                            </a>
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                            <Button
                              size="small"
                              onClick={handleSearch}
                              sx={{ textTransform: 'none', color: '#667eea' }}
                            >
                              Search Again
                            </Button>
                            <Button
                              size="small"
                              onClick={() => setMode('manual')}
                              variant="outlined"
                              sx={{
                                textTransform: 'none',
                                borderColor: '#667eea',
                                color: '#667eea',
                                '&:hover': {
                                  borderColor: '#5568d3',
                                  bgcolor: 'rgba(102, 126, 234, 0.08)',
                                },
                              }}
                            >
                              Use Different URL
                            </Button>
                          </Box>
                        </Box>
                      )}
                    </Box>
                  )}
                </Box>
              </RadioGroup>
            </FormControl>
          </Box>
        ) : (
          // Confirmation Stage
          <Box>
            <Box
              sx={{
                p: 3,
                mb: 3,
                bgcolor: '#f8fafc',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 1, display: 'block' }}>
                BLOG URL TO ANALYZE
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  fontFamily: 'monospace',
                  fontSize: '14px',
                  color: '#1e293b',
                  wordBreak: 'break-all',
                }}
              >
                {getSelectedUrl()}
              </Typography>
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="body2">
                The blog analysis will fetch recent posts, identify writers, and analyze content quality.
                This typically costs ~$0.04 (3,354 tokens) and takes 30-60 seconds.
              </Typography>
            </Alert>

            <Typography variant="body2" color="text.secondary">
              Click "Confirm & Analyze" to proceed with the analysis.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid #e2e8f0',
        }}
      >
        {stage === 'select' ? (
          <>
            <Button
              onClick={handleClose}
              sx={{
                textTransform: 'none',
                color: '#64748b',
                fontWeight: 600,
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleNext}
              variant="contained"
              disabled={!getSelectedUrl() || searching}
              sx={{
                textTransform: 'none',
                bgcolor: '#667eea',
                fontWeight: 600,
                px: 3,
                '&:hover': {
                  bgcolor: '#5568d3',
                },
                '&.Mui-disabled': {
                  bgcolor: '#cbd5e1',
                  color: 'white',
                },
              }}
            >
              Next
            </Button>
          </>
        ) : (
          <>
            <Button
              onClick={handleBack}
              sx={{
                textTransform: 'none',
                color: '#64748b',
                fontWeight: 600,
              }}
            >
              Back
            </Button>
            <Button
              onClick={handleConfirm}
              variant="contained"
              sx={{
                textTransform: 'none',
                bgcolor: '#667eea',
                fontWeight: 600,
                px: 3,
                '&:hover': {
                  bgcolor: '#5568d3',
                },
              }}
            >
              Confirm & Analyze
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
