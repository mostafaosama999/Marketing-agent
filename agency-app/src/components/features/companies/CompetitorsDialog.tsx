// src/components/features/companies/CompetitorsDialog.tsx
import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Chip,
  Link,
  Divider,
} from '@mui/material';
import {
  CompareArrows as CompareArrowsIcon,
  Business as BusinessIcon,
  Language as LanguageIcon,
} from '@mui/icons-material';
import { Company } from '../../../types/crm';

export interface Competitor {
  name: string;
  website: string;
  description: string;
  companySize: string;
  whyCompetitor: string;
}

interface CompetitorsDialogProps {
  open: boolean;
  onClose: () => void;
  company: Company | null;
  competitors: Competitor[] | null;
  loading: boolean;
  error: string | null;
}

export const CompetitorsDialog: React.FC<CompetitorsDialogProps> = ({
  open,
  onClose,
  company,
  competitors,
  loading,
  error,
}) => {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <CompareArrowsIcon sx={{ color: '#667eea' }} />
        Competitors for {company?.name}
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2, px: 3, minHeight: '300px' }}>
        {/* Loading State */}
        {loading && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px',
              gap: 2,
            }}
          >
            <CircularProgress
              size={48}
              sx={{
                color: '#667eea',
              }}
            />
            <Typography variant="body1" color="text.secondary">
              Finding competitors using AI...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: '400px' }}>
              Analyzing {company?.name} and searching for similar companies in the content writing space
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* Results State */}
        {!loading && !error && competitors && competitors.length > 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Found {competitors.length} competitors offering similar content writing/creation services
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {competitors.map((competitor, index) => (
                <Card
                  key={index}
                  sx={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.2s ease',
                    '&:hover': {
                      boxShadow: '0 4px 16px rgba(102, 126, 234, 0.15)',
                      borderColor: '#667eea',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    {/* Company Name & Website */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                          <BusinessIcon sx={{ fontSize: '18px', color: '#667eea' }} />
                          <Typography
                            variant="h6"
                            sx={{
                              fontWeight: 600,
                              fontSize: '16px',
                              color: '#1a202c',
                            }}
                          >
                            {competitor.name}
                          </Typography>
                        </Box>

                        {competitor.website && (
                          <Link
                            href={competitor.website.startsWith('http') ? competitor.website : `https://${competitor.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 0.5,
                              fontSize: '13px',
                              color: '#667eea',
                              textDecoration: 'none',
                              '&:hover': {
                                textDecoration: 'underline',
                              },
                            }}
                          >
                            <LanguageIcon sx={{ fontSize: '14px' }} />
                            {competitor.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          </Link>
                        )}
                      </Box>

                      {/* Company Size Chip */}
                      {competitor.companySize && (
                        <Chip
                          label={competitor.companySize}
                          size="small"
                          sx={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            fontWeight: 500,
                            fontSize: '11px',
                            height: '24px',
                          }}
                        />
                      )}
                    </Box>

                    <Divider sx={{ my: 1.5 }} />

                    {/* Description */}
                    <Typography
                      variant="body2"
                      sx={{
                        color: '#4a5568',
                        mb: 1.5,
                        lineHeight: 1.6,
                      }}
                    >
                      {competitor.description}
                    </Typography>

                    {/* Why Competitor */}
                    {competitor.whyCompetitor && (
                      <Box
                        sx={{
                          backgroundColor: 'rgba(102, 126, 234, 0.08)',
                          borderRadius: '6px',
                          p: 1.5,
                          borderLeft: '3px solid #667eea',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#667eea',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            fontSize: '10px',
                            letterSpacing: '0.5px',
                            display: 'block',
                            mb: 0.5,
                          }}
                        >
                          Why This is a Competitor
                        </Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#2d3748',
                            fontSize: '13px',
                            lineHeight: 1.5,
                          }}
                        >
                          {competitor.whyCompetitor}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              ))}
            </Box>
          </Box>
        )}

        {/* No Results State */}
        {!loading && !error && competitors && competitors.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '300px',
              gap: 2,
            }}
          >
            <BusinessIcon sx={{ fontSize: 64, color: '#cbd5e0' }} />
            <Typography variant="h6" color="text.secondary">
              No Competitors Found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: '400px' }}>
              We couldn't find any competitors for {company?.name}. This might mean the company is highly unique or operates in a niche market.
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0' }}>
        <Button
          onClick={onClose}
          variant="contained"
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            textTransform: 'none',
            fontWeight: 500,
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
            },
          }}
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
