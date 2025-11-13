// src/components/features/companies/CompetitorWorkflowDialog.tsx
import React, { useState, useEffect } from 'react';
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
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  IconButton,
  Link,
  Chip,
  FormControlLabel,
  Paper,
  Divider,
  Radio,
  RadioGroup,
  FormControl,
  FormLabel,
} from '@mui/material';
import {
  CompareArrows as CompareArrowsIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { Company } from '../../../types/crm';
import { findCompetitors, FindCompetitorsResponse, Competitor } from '../../../services/firebase/cloudFunctions';
import { bulkEnrichCompetitors, bulkAnalyzeBlogs, importCompetitors, checkDuplicateCompanies } from '../../../services/api/competitorWorkflowService';
import { useAuth } from '../../../contexts/AuthContext';
import { v4 as uuidv4 } from 'uuid';

// Types
type WorkflowStep = 'finding' | 'review' | 'enriching' | 'confirmUrls' | 'analyzing' | 'importing' | 'complete';
type ProcessStatus = 'idle' | 'pending' | 'success' | 'error' | 'skipped';

interface ApolloEnrichmentData {
  name?: string;
  estimated_num_employees?: number;
  employee_range?: string;
  total_funding?: string;
  industry?: string;
  technology_names?: string[];
  logo_url?: string;
}

interface BlogAnalysisData {
  hasActiveBlog: boolean;
  contentQualityRating?: 'low' | 'medium' | 'high';
  technicalDepth?: 'beginner' | 'intermediate' | 'advanced';
  isDeveloperB2BSaas: boolean;
}

export interface CompetitorWithEnrichment {
  // Original AI data
  id: string;
  name: string;
  website: string;
  description: string;
  companySize: string;
  whyCompetitor: string;

  // UI state
  selected: boolean;

  // Apollo enrichment (Step 3)
  apolloData?: ApolloEnrichmentData;
  apolloStatus: ProcessStatus;
  apolloError?: string;

  // Blog analysis (Step 4)
  blogUrl?: string; // Detected or user-entered blog URL
  blogData?: BlogAnalysisData;
  blogStatus: ProcessStatus;
  blogError?: string;

  // Save status
  savedCompanyId?: string;
  saveStatus: ProcessStatus;
  saveError?: string;
}

interface CompetitorWorkflowDialogProps {
  open: boolean;
  onClose: () => void;
  company: Company;
}


export const CompetitorWorkflowDialog: React.FC<CompetitorWorkflowDialogProps> = ({
  open,
  onClose,
  company,
}) => {
  const { user } = useAuth();
  // Main workflow state
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('finding');
  const [competitors, setCompetitors] = useState<CompetitorWithEnrichment[]>([]);

  // Step toggles
  const [skipEnrichment, setSkipEnrichment] = useState(false);
  const [skipBlogAnalysis, setSkipBlogAnalysis] = useState(false);

  // Loading and error states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Progress tracking
  const [enrichProgress, setEnrichProgress] = useState({ completed: 0, total: 0 });
  const [analyzeProgress, setAnalyzeProgress] = useState({ completed: 0, total: 0 });
  const [importProgress, setImportProgress] = useState({ completed: 0, total: 0 });

  // Cost tracking
  const [costBreakdown, setCostBreakdown] = useState({
    aiSearch: 0,
    apollo: 0,
    blogAnalysis: 0,
  });

  // Import state
  const [duplicateStrategy, setDuplicateStrategy] = useState<'skip' | 'update' | 'create'>('skip');
  const [duplicateCompanies, setDuplicateCompanies] = useState<Map<string, boolean>>(new Map());
  const [importResults, setImportResults] = useState<Map<string, string | null>>(new Map());

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setCurrentStep('finding');
      setCompetitors([]);
      setError(null);
      setSkipEnrichment(false);
      setSkipBlogAnalysis(false);
      setCostBreakdown({ aiSearch: 0, apollo: 0, blogAnalysis: 0 });

      // Start finding competitors immediately
      handleFindCompetitors();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, company.id]);

  // STEP 1: Find Competitors
  const handleFindCompetitors = async () => {
    setCurrentStep('finding');
    setLoading(true);
    setError(null);

    try {

      const response = await findCompetitors({
        companyId: company.id,
        companyName: company.name,
        website: company.website || '',
        description: company.description || '',
        industry: company.industry || '',
      });

      // Transform competitors into enriched format
      const enrichedCompetitors: CompetitorWithEnrichment[] = response.competitors.map(comp => ({
        id: uuidv4(),
        name: comp.name,
        website: comp.website,
        description: comp.description,
        companySize: comp.companySize,
        whyCompetitor: comp.whyCompetitor,
        selected: true, // All selected by default
        apolloStatus: 'idle',
        blogStatus: 'idle',
        saveStatus: 'idle',
      }));

      setCompetitors(enrichedCompetitors);

      // Track AI search cost
      if (response.costInfo) {
        setCostBreakdown(prev => ({
          ...prev,
          aiSearch: response.costInfo!.totalCost,
        }));
      }

      // Check for duplicates
      try {
        const names = enrichedCompetitors.map(c => c.name);
        const duplicates = await checkDuplicateCompanies(names);
        setDuplicateCompanies(duplicates);
      } catch (error) {
        console.error('Error checking duplicates:', error);
      }

      // Move to review step
      setCurrentStep('review');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to find competitors');
    } finally {
      setLoading(false);
    }
  };

  // Selection handlers
  const handleToggleSelect = (id: string) => {
    setCompetitors(prev =>
      prev.map(comp => comp.id === id ? { ...comp, selected: !comp.selected } : comp)
    );
  };

  const handleSelectAll = (checked: boolean) => {
    setCompetitors(prev =>
      prev.map(comp => ({ ...comp, selected: checked }))
    );
  };

  const handleDelete = (id: string) => {
    setCompetitors(prev => prev.filter(comp => comp.id !== id));
  };

  // Navigation handlers
  const handleNext = () => {
    const selectedCount = competitors.filter(c => c.selected).length;

    if (selectedCount === 0) {
      setError('Please select at least one competitor to continue');
      return;
    }

    // Determine next step based on toggles
    if (currentStep === 'review') {
      if (!skipEnrichment) {
        setCurrentStep('enriching');
        handleEnrichCompetitors();
      } else if (!skipBlogAnalysis) {
        // If skipping enrichment but analyzing blogs, go straight to URL confirmation
        setCurrentStep('confirmUrls');
        detectBlogUrls();
      } else {
        setCurrentStep('importing');
      }
    } else if (currentStep === 'enriching') {
      if (!skipBlogAnalysis) {
        // After enrichment, go to URL confirmation
        setCurrentStep('confirmUrls');
        detectBlogUrls();
      } else {
        setCurrentStep('importing');
      }
    } else if (currentStep === 'confirmUrls') {
      // Validate at least one competitor has a blog URL
      const hasUrls = competitors.filter(c => c.selected && c.blogUrl).length > 0;
      if (!hasUrls) {
        setError('Please provide at least one blog URL to continue');
        return;
      }
      setCurrentStep('analyzing');
      handleAnalyzeBlogs();
    } else if (currentStep === 'analyzing') {
      setCurrentStep('importing');
    } else if (currentStep === 'importing') {
      handleImportCompetitors();
    }
  };

  const handleBack = () => {
    if (currentStep === 'enriching') {
      setCurrentStep('review');
    } else if (currentStep === 'confirmUrls') {
      setCurrentStep(skipEnrichment ? 'review' : 'enriching');
    } else if (currentStep === 'analyzing') {
      setCurrentStep('confirmUrls');
    } else if (currentStep === 'importing') {
      if (!skipBlogAnalysis) {
        setCurrentStep('analyzing');
      } else if (!skipEnrichment) {
        setCurrentStep('enriching');
      } else {
        setCurrentStep('review');
      }
    } else if (currentStep === 'complete') {
      onClose();
    }
  };

  const handleSkipToImport = () => {
    setCurrentStep('importing');
  };

  // STEP 3.5: Detect Blog URLs
  const detectBlogUrls = () => {
    // Attempt to detect blog URLs from website or Apollo data
    setCompetitors(prev =>
      prev.map(comp => {
        if (!comp.selected) return comp;

        // If blogUrl already set, keep it
        if (comp.blogUrl && comp.blogUrl.trim() !== '') return comp;

        // Try to extract from website: common patterns like /blog, /blog/, /news
        let detectedUrl = '';
        if (comp.website) {
          const baseUrl = comp.website.startsWith('http') ? comp.website : `https://${comp.website}`;
          detectedUrl = `${baseUrl.replace(/\/$/, '')}/blog`;
        }

        return { ...comp, blogUrl: detectedUrl };
      })
    );
  };

  // Update blog URL handler
  const handleBlogUrlChange = (id: string, url: string) => {
    setCompetitors(prev =>
      prev.map(comp => (comp.id === id ? { ...comp, blogUrl: url } : comp))
    );
  };

  // STEP 3: Apollo Enrichment
  const handleEnrichCompetitors = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError(null);

    const selectedCompetitors = competitors.filter(c => c.selected);
    setEnrichProgress({ completed: 0, total: selectedCompetitors.length });

    try {
      await bulkEnrichCompetitors(
        competitors,
        user.uid,
        (competitorId, status, data, errorMsg) => {
          // Update competitor status in real-time
          setCompetitors(prev =>
            prev.map(comp => {
              if (comp.id === competitorId) {
                const updated = { ...comp, apolloStatus: status };

                if (status === 'success' && data) {
                  updated.apolloData = data;
                  // Add cost (1 credit per company)
                  setCostBreakdown(prev => ({
                    ...prev,
                    apollo: prev.apollo + 1,
                  }));
                } else if (status === 'error') {
                  updated.apolloError = errorMsg;
                }

                return updated;
              }
              return comp;
            })
          );

          // Update progress
          if (status === 'success' || status === 'error' || status === 'skipped') {
            setEnrichProgress(prev => ({
              ...prev,
              completed: prev.completed + 1,
            }));
          }
        }
      );

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enrichment failed');
    } finally {
      setLoading(false);
    }
  };

  // STEP 4: Blog Analysis
  const handleAnalyzeBlogs = async () => {
    setLoading(true);
    setError(null);

    const selectedCompetitors = competitors.filter(c => c.selected);
    setAnalyzeProgress({ completed: 0, total: selectedCompetitors.length });

    try {
      await bulkAnalyzeBlogs(
        competitors,
        (competitorId, status, data, errorMsg) => {
          // Update competitor status in real-time
          setCompetitors(prev =>
            prev.map(comp => {
              if (comp.id === competitorId) {
                const updated = { ...comp, blogStatus: status };

                if (status === 'success' && data) {
                  updated.blogData = data;
                  // Add cost
                  if (data.costInfo) {
                    setCostBreakdown(prev => ({
                      ...prev,
                      blogAnalysis: prev.blogAnalysis + data.costInfo!.totalCost,
                    }));
                  }
                } else if (status === 'error') {
                  updated.blogError = errorMsg;
                }

                return updated;
              }
              return comp;
            })
          );

          // Update progress
          if (status === 'success' || status === 'error' || status === 'skipped') {
            setAnalyzeProgress(prev => ({
              ...prev,
              completed: prev.completed + 1,
            }));
          }
        }
      );

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Blog analysis failed');
    } finally {
      setLoading(false);
    }
  };

  // Check for duplicates when entering import step
  useEffect(() => {
    if (currentStep === 'importing' && competitors.length > 0) {
      const checkDuplicates = async () => {
        const selectedCompetitors = competitors.filter(c => c.selected);
        const names = selectedCompetitors.map(c => c.name);

        try {
          const duplicates = await checkDuplicateCompanies(names);
          setDuplicateCompanies(duplicates);
        } catch (error) {
        }
      };

      checkDuplicates();
    }
  }, [currentStep, competitors]);

  // STEP 5: Import Competitors
  const handleImportCompetitors = async () => {
    setLoading(true);
    setError(null);

    const selectedCompetitors = competitors.filter(c => c.selected);
    setImportProgress({ completed: 0, total: selectedCompetitors.length });

    try {
      const results = await importCompetitors(
        competitors,
        company.id,
        duplicateStrategy,
        (competitorId, status, data, errorMsg) => {
          // Update competitor save status in real-time
          setCompetitors(prev =>
            prev.map(comp => {
              if (comp.id === competitorId) {
                const updated = { ...comp, saveStatus: status };
                if (status === 'success' && data) {
                  updated.savedCompanyId = data;
                } else if (status === 'error') {
                  updated.saveError = errorMsg;
                }
                return updated;
              }
              return comp;
            })
          );

          // Update progress counter
          if (status === 'success' || status === 'error' || status === 'skipped') {
            setImportProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
          }
        }
      );

      setImportResults(results);

      // Move to complete step
      setCurrentStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const selectedCount = competitors.filter(c => c.selected).length;
  const allSelected = competitors.length > 0 && selectedCount === competitors.length;
  const someSelected = selectedCount > 0 && selectedCount < competitors.length;

  const totalCost = costBreakdown.aiSearch + costBreakdown.blogAnalysis;

  const getStepIndex = () => {
    let index = 0;
    if (currentStep === 'finding') return index;
    index++; // review = 1
    if (currentStep === 'review') return index;
    if (!skipEnrichment) {
      index++; // enrich = 2 (or skip)
      if (currentStep === 'enriching') return index;
    }
    if (!skipBlogAnalysis) {
      index++; // confirmUrls = 3 (or 2 if skipped enrich)
      if (currentStep === 'confirmUrls') return index;
      index++; // analyze = 4 (or 3 if skipped enrich)
      if (currentStep === 'analyzing') return index;
    }
    index++; // import
    if (currentStep === 'importing' || currentStep === 'complete') return index;
    return 0;
  };

  const handleClose = () => {
    if (currentStep === 'finding' || currentStep === 'complete') {
      onClose();
    } else {
      // Confirm before closing
      if (window.confirm('Are you sure you want to close? Your progress will be lost.')) {
        onClose();
      }
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          minHeight: '600px',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          borderBottom: '1px solid #e2e8f0',
          pb: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <CompareArrowsIcon sx={{ color: '#667eea' }} />
          <Typography variant="h6" component="span">
            Find Competitors for {company.name}
          </Typography>
        </Box>

        {/* Stepper */}
        {currentStep !== 'finding' && (
          <Stepper activeStep={getStepIndex()} sx={{ mt: 2 }}>
            <Step key="find">
              <StepLabel>Find</StepLabel>
            </Step>
            <Step key="review">
              <StepLabel>Review</StepLabel>
            </Step>
            {!skipEnrichment && (
              <Step key="enrich">
                <StepLabel>Enrich</StepLabel>
              </Step>
            )}
            {!skipBlogAnalysis && (
              <>
                <Step key="confirmUrls">
                  <StepLabel>Confirm URLs</StepLabel>
                </Step>
                <Step key="analyze">
                  <StepLabel>Analyze</StepLabel>
                </Step>
              </>
            )}
            <Step key="import">
              <StepLabel>Import</StepLabel>
            </Step>
          </Stepper>
        )}
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2, px: 3, minHeight: '400px' }}>
        {/* STEP 1: FINDING */}
        {currentStep === 'finding' && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '400px',
              gap: 2,
            }}
          >
            <CircularProgress
              size={48}
              sx={{ color: '#667eea' }}
            />
            <Typography variant="body1" color="text.secondary">
              Finding competitors using AI...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', maxWidth: '400px' }}>
              Analyzing {company.name} and searching for similar companies
            </Typography>
          </Box>
        )}

        {/* Error State */}
        {error && currentStep !== 'finding' && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* STEP 2: REVIEW */}
        {currentStep === 'review' && (
          <Box>
            {/* Duplicate Warning */}
            {Array.from(duplicateCompanies.values()).filter(isDupe => isDupe).length > 0 && (
              <Alert severity="warning" sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {Array.from(duplicateCompanies.values()).filter(isDupe => isDupe).length} {Array.from(duplicateCompanies.values()).filter(isDupe => isDupe).length === 1 ? 'company' : 'companies'} already exist in your database
                </Typography>
                <Typography variant="body2">
                  Companies marked with a "Duplicate" badge already exist. You can still enrich and analyze them, or deselect them to skip.
                </Typography>
              </Alert>
            )}

            {/* Header with summary and toggles */}
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Select competitors to proceed ({selectedCount} of {competitors.length} selected)
              </Typography>

              <Box sx={{ ml: 'auto', display: 'flex', gap: 2, alignItems: 'center' }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!skipEnrichment}
                      onChange={(e) => setSkipEnrichment(!e.target.checked)}
                      sx={{
                        color: '#667eea',
                        '&.Mui-checked': { color: '#667eea' },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">Enrich with Apollo</Typography>
                      <Typography variant="caption" color="text.secondary">
                        ~{selectedCount} {selectedCount === 1 ? 'credit' : 'credits'}
                      </Typography>
                    </Box>
                  }
                />

                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!skipBlogAnalysis}
                      onChange={(e) => setSkipBlogAnalysis(!e.target.checked)}
                      sx={{
                        color: '#667eea',
                        '&.Mui-checked': { color: '#667eea' },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2">Analyze Blogs</Typography>
                      <Typography variant="caption" color="text.secondary">
                        ~${(selectedCount * 0.05).toFixed(2)}
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            </Box>

            {/* Competitors Table */}
            <TableContainer
              component={Paper}
              sx={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: 'none',
              }}
            >
              <Table>
                <TableHead sx={{ bgcolor: '#f7fafc' }}>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        sx={{
                          color: '#667eea',
                          '&.Mui-checked': { color: '#667eea' },
                          '&.MuiCheckbox-indeterminate': { color: '#667eea' },
                        }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Website</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '30%' }}>Why Competitor</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Size</TableCell>
                    <TableCell sx={{ fontWeight: 600 }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {competitors.map((comp) => (
                    <TableRow
                      key={comp.id}
                      hover
                      sx={{
                        opacity: comp.selected ? 1 : 0.5,
                        transition: 'opacity 0.2s',
                        '&:hover': {
                          opacity: 1,
                        },
                      }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={comp.selected}
                          onChange={() => handleToggleSelect(comp.id)}
                          sx={{
                            color: '#667eea',
                            '&.Mui-checked': { color: '#667eea' },
                          }}
                        />
                      </TableCell>

                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BusinessIcon sx={{ fontSize: '18px', color: '#667eea' }} />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {comp.name}
                          </Typography>
                          {duplicateCompanies.get(comp.name) && (
                            <Chip
                              label="Duplicate"
                              size="small"
                              sx={{
                                height: '20px',
                                fontSize: '11px',
                                bgcolor: '#fef3c7',
                                color: '#92400e',
                                fontWeight: 600,
                              }}
                            />
                          )}
                        </Box>
                      </TableCell>

                      <TableCell>
                        {comp.website ? (
                          <Link
                            href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              fontSize: '13px',
                              color: '#667eea',
                              textDecoration: 'none',
                              '&:hover': {
                                textDecoration: 'underline',
                              },
                            }}
                          >
                            {comp.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          </Link>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No website
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '13px', lineHeight: 1.5 }}>
                          {comp.whyCompetitor}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={comp.companySize}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(102, 126, 234, 0.1)',
                            color: '#667eea',
                            fontWeight: 500,
                            fontSize: '11px',
                          }}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(comp.id)}
                          sx={{
                            color: '#ef4444',
                            '&:hover': {
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            },
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: '18px' }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {competitors.length === 0 && (
              <Box
                sx={{
                  py: 8,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <BusinessIcon sx={{ fontSize: 64, color: '#cbd5e0' }} />
                <Typography variant="h6" color="text.secondary">
                  No Competitors
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  All competitors have been removed. Click "Regenerate" to find new ones.
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* STEP 3: ENRICHING */}
        {currentStep === 'enriching' && (
          <Box>
            {/* Progress Bar */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Enriching with Apollo ({enrichProgress.completed} of {enrichProgress.total})
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {enrichProgress.total > 0
                    ? Math.round((enrichProgress.completed / enrichProgress.total) * 100)
                    : 0}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={enrichProgress.total > 0
                  ? (enrichProgress.completed / enrichProgress.total) * 100
                  : 0}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#e2e8f0',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  },
                }}
              />
            </Box>

            {/* Progress Table */}
            <TableContainer
              component={Paper}
              sx={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: 'none',
              }}
            >
              <Table>
                <TableHead sx={{ bgcolor: '#f7fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Employees</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Funding</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Technologies</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {competitors.filter(c => c.selected).map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {comp.name}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {comp.apolloStatus === 'idle' && (
                          <Chip
                            label="Waiting"
                            size="small"
                            sx={{ bgcolor: '#e2e8f0', color: '#64748b' }}
                          />
                        )}
                        {comp.apolloStatus === 'pending' && (
                          <Chip
                            icon={<CircularProgress size={12} sx={{ color: '#3b82f6 !important' }} />}
                            label="Enriching..."
                            size="small"
                            sx={{ bgcolor: '#dbeafe', color: '#3b82f6' }}
                          />
                        )}
                        {comp.apolloStatus === 'success' && (
                          <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                            label="Success"
                            size="small"
                            sx={{ bgcolor: '#dcfce7', color: '#16a34a' }}
                          />
                        )}
                        {comp.apolloStatus === 'error' && (
                          <Chip
                            icon={<ErrorIcon sx={{ fontSize: 16 }} />}
                            label="Error"
                            size="small"
                            sx={{ bgcolor: '#fee2e2', color: '#dc2626' }}
                          />
                        )}
                        {comp.apolloStatus === 'skipped' && (
                          <Chip
                            label="Skipped"
                            size="small"
                            sx={{ bgcolor: '#f1f5f9', color: '#64748b' }}
                          />
                        )}
                      </TableCell>

                      <TableCell>
                        {comp.apolloData?.estimated_num_employees ? (
                          <Typography variant="body2">
                            {comp.apolloData.estimated_num_employees.toLocaleString()}
                            {comp.apolloData.employee_range && (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                                ({comp.apolloData.employee_range})
                              </Typography>
                            )}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {comp.apolloStatus === 'success' ? 'N/A' : '-'}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        {comp.apolloData?.total_funding ? (
                          <Typography variant="body2">
                            {comp.apolloData.total_funding}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {comp.apolloStatus === 'success' ? 'N/A' : '-'}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        {comp.apolloData?.technology_names && comp.apolloData.technology_names.length > 0 ? (
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {comp.apolloData.technology_names.slice(0, 3).map((tech, idx) => (
                              <Chip
                                key={idx}
                                label={tech}
                                size="small"
                                sx={{
                                  height: '20px',
                                  fontSize: '11px',
                                  bgcolor: 'rgba(102, 126, 234, 0.1)',
                                  color: '#667eea',
                                }}
                              />
                            ))}
                            {comp.apolloData.technology_names.length > 3 && (
                              <Chip
                                label={`+${comp.apolloData.technology_names.length - 3}`}
                                size="small"
                                sx={{
                                  height: '20px',
                                  fontSize: '11px',
                                  bgcolor: '#e2e8f0',
                                  color: '#64748b',
                                }}
                              />
                            )}
                          </Box>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {comp.apolloStatus === 'success' ? 'None' : '-'}
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Error messages */}
            {competitors.some(c => c.apolloStatus === 'error') && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Some companies could not be enriched. You can still continue to the next step.
              </Alert>
            )}
          </Box>
        )}

        {/* STEP 3.5: CONFIRM URLS */}
        {currentStep === 'confirmUrls' && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                Review and confirm blog URLs before analysis
              </Typography>
              <Typography variant="body2">
                We've detected blog URLs for each company. Please review and edit if needed.
                Blog analysis costs ~$0.04 per company and takes 30-60 seconds each.
              </Typography>
            </Alert>

            {/* URL Confirmation Table */}
            <TableContainer
              component={Paper}
              sx={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: 'none',
              }}
            >
              <Table>
                <TableHead sx={{ bgcolor: '#f7fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600, width: '22%' }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '28%' }}>Website</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '40%' }}>Blog URL</TableCell>
                    <TableCell sx={{ fontWeight: 600, width: '10%' }} align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {competitors.filter(c => c.selected).map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <BusinessIcon sx={{ fontSize: '18px', color: '#667eea' }} />
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {comp.name}
                          </Typography>
                        </Box>
                      </TableCell>

                      <TableCell>
                        {comp.website ? (
                          <Link
                            href={comp.website.startsWith('http') ? comp.website : `https://${comp.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              fontSize: '13px',
                              color: '#667eea',
                              textDecoration: 'none',
                              '&:hover': {
                                textDecoration: 'underline',
                              },
                            }}
                          >
                            {comp.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                          </Link>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            No website
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        <Box
                          component="input"
                          type="text"
                          value={comp.blogUrl || ''}
                          onChange={(e) => handleBlogUrlChange(comp.id, e.target.value)}
                          placeholder="https://example.com/blog"
                          sx={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #e2e8f0',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontFamily: 'inherit',
                            '&:focus': {
                              outline: 'none',
                              borderColor: '#667eea',
                              boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
                            },
                            '&::placeholder': {
                              color: '#94a3b8',
                            },
                          }}
                        />
                      </TableCell>

                      <TableCell align="center">
                        <IconButton
                          size="small"
                          onClick={() => handleDelete(comp.id)}
                          sx={{
                            color: '#ef4444',
                            '&:hover': {
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                            },
                          }}
                        >
                          <DeleteIcon sx={{ fontSize: '18px' }} />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Total estimated cost: ${(competitors.filter(c => c.selected && c.blogUrl).length * 0.04).toFixed(2)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {competitors.filter(c => c.selected && c.blogUrl).length} of {competitors.filter(c => c.selected).length} companies have blog URLs
              </Typography>
            </Box>
          </Box>
        )}

        {/* STEP 4: ANALYZING */}
        {currentStep === 'analyzing' && (
          <Box>
            {/* Progress Bar */}
            <Box sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  Analyzing Blogs ({analyzeProgress.completed} of {analyzeProgress.total})
                </Typography>
                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    {analyzeProgress.total > 0
                      ? Math.round((analyzeProgress.completed / analyzeProgress.total) * 100)
                      : 0}%
                  </Typography>
                  {analyzeProgress.completed < analyzeProgress.total && (
                    <Typography variant="caption" color="text.secondary">
                      Est. {Math.ceil((analyzeProgress.total - analyzeProgress.completed) * 45 / 60)} min remaining
                    </Typography>
                  )}
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={analyzeProgress.total > 0
                  ? (analyzeProgress.completed / analyzeProgress.total) * 100
                  : 0}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: '#e2e8f0',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  },
                }}
              />
            </Box>

            <Alert severity="info" sx={{ mb: 2 }}>
              Analyzing all blogs in parallel. Each analysis takes 30-60 seconds.
            </Alert>

            {/* Progress Table */}
            <TableContainer
              component={Paper}
              sx={{
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                boxShadow: 'none',
              }}
            >
              <Table>
                <TableHead sx={{ bgcolor: '#f7fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 600 }}>Company</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Blog URL</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Quality</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Technical Depth</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Developer B2B</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {competitors.filter(c => c.selected).map((comp) => (
                    <TableRow key={comp.id}>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {comp.name}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        {comp.blogUrl ? (
                          <Link
                            href={comp.blogUrl.startsWith('http') ? comp.blogUrl : `https://${comp.blogUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            sx={{
                              fontSize: '12px',
                              color: '#667eea',
                              textDecoration: 'none',
                              '&:hover': {
                                textDecoration: 'underline',
                              },
                            }}
                          >
                            {comp.blogUrl.replace(/^https?:\/\//, '').substring(0, 35)}
                            {comp.blogUrl.length > 35 ? '...' : ''}
                          </Link>
                        ) : (
                          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '12px' }}>
                            {comp.website?.replace(/^https?:\/\//, '').substring(0, 35) || 'N/A'}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        {comp.blogStatus === 'idle' && (
                          <Chip
                            label="Waiting"
                            size="small"
                            sx={{ bgcolor: '#e2e8f0', color: '#64748b' }}
                          />
                        )}
                        {comp.blogStatus === 'pending' && (
                          <Chip
                            icon={<CircularProgress size={12} sx={{ color: '#3b82f6 !important' }} />}
                            label="Analyzing..."
                            size="small"
                            sx={{ bgcolor: '#dbeafe', color: '#3b82f6' }}
                          />
                        )}
                        {comp.blogStatus === 'success' && (
                          <Chip
                            icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                            label="Complete"
                            size="small"
                            sx={{ bgcolor: '#dcfce7', color: '#16a34a' }}
                          />
                        )}
                        {comp.blogStatus === 'error' && (
                          <Chip
                            icon={<ErrorIcon sx={{ fontSize: 16 }} />}
                            label="Error"
                            size="small"
                            sx={{ bgcolor: '#fee2e2', color: '#dc2626' }}
                          />
                        )}
                        {comp.blogStatus === 'skipped' && (
                          <Chip
                            label="Skipped"
                            size="small"
                            sx={{ bgcolor: '#f1f5f9', color: '#64748b' }}
                          />
                        )}
                      </TableCell>

                      <TableCell>
                        {comp.blogData?.contentQualityRating ? (
                          <Chip
                            label={comp.blogData.contentQualityRating.toUpperCase()}
                            size="small"
                            sx={{
                              bgcolor: comp.blogData.contentQualityRating === 'high'
                                ? '#dcfce7'
                                : comp.blogData.contentQualityRating === 'medium'
                                ? '#fef3c7'
                                : '#fee2e2',
                              color: comp.blogData.contentQualityRating === 'high'
                                ? '#16a34a'
                                : comp.blogData.contentQualityRating === 'medium'
                                ? '#ca8a04'
                                : '#dc2626',
                            }}
                          />
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {comp.blogStatus === 'success' ? 'N/A' : '-'}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        {comp.blogData?.technicalDepth ? (
                          <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                            {comp.blogData.technicalDepth}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            {comp.blogStatus === 'success' ? 'N/A' : '-'}
                          </Typography>
                        )}
                      </TableCell>

                      <TableCell>
                        {comp.blogData?.isDeveloperB2BSaas !== undefined ? (
                          comp.blogData.isDeveloperB2BSaas ? (
                            <Chip
                              icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                              label="Yes"
                              size="small"
                              sx={{ bgcolor: '#dcfce7', color: '#16a34a' }}
                            />
                          ) : (
                            <Chip
                              label="No"
                              size="small"
                              sx={{ bgcolor: '#f1f5f9', color: '#64748b' }}
                            />
                          )
                        ) : (
                          <Typography variant="body2" color="text.secondary">-</Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Error messages */}
            {competitors.some(c => c.blogStatus === 'error') && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Some blogs could not be analyzed. You can still continue to import.
              </Alert>
            )}
          </Box>
        )}

        {/* STEP 5: IMPORTING */}
        {currentStep === 'importing' && (
          <Box>
            {/* Import progress during save */}
            {loading && (
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Importing Companies ({importProgress.completed} of {importProgress.total})
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {importProgress.total > 0 ? Math.round((importProgress.completed / importProgress.total) * 100) : 0}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={importProgress.total > 0 ? (importProgress.completed / importProgress.total) * 100 : 0}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: '#e0e7ff',
                    '& .MuiLinearProgress-bar': {
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      borderRadius: 4,
                    },
                  }}
                />
              </Box>
            )}

            {/* Pre-import summary */}
            {!loading && (
              <>
                <Alert severity="info" sx={{ mb: 3 }}>
                  You're about to import {selectedCount} competitor{selectedCount !== 1 ? 's' : ''} as companies into your CRM.
                </Alert>

                {/* Duplicate detection warning */}
                {Array.from(duplicateCompanies.values()).some(isDup => isDup) && (
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                      Duplicate companies detected
                    </Typography>
                    <Typography variant="caption">
                      {Array.from(duplicateCompanies.entries()).filter(([_, isDup]) => isDup).length} of {selectedCount} companies already exist in your CRM.
                      Choose how to handle duplicates below.
                    </Typography>
                  </Alert>
                )}

                {/* Duplicate handling strategy */}
                <FormControl component="fieldset" sx={{ mb: 3 }}>
                  <FormLabel component="legend" sx={{ mb: 1, fontWeight: 500 }}>
                    Duplicate Handling Strategy
                  </FormLabel>
                  <RadioGroup
                    value={duplicateStrategy}
                    onChange={(e) => setDuplicateStrategy(e.target.value as 'skip' | 'update' | 'create')}
                  >
                    <FormControlLabel
                      value="skip"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body2">Skip duplicates</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Only import companies that don't already exist
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="update"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body2">Update existing</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Update existing companies with new data (Apollo, blog analysis, etc.)
                          </Typography>
                        </Box>
                      }
                    />
                    <FormControlLabel
                      value="create"
                      control={<Radio />}
                      label={
                        <Box>
                          <Typography variant="body2">Create new with suffix</Typography>
                          <Typography variant="caption" color="text.secondary">
                            Create new entries like "Company Name (2)"
                          </Typography>
                        </Box>
                      }
                    />
                  </RadioGroup>
                </FormControl>

                {/* Summary table */}
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 500 }}>
                  Import Summary
                </Typography>
                <TableContainer component={Paper} sx={{ mb: 2, maxHeight: 400 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Company</TableCell>
                        <TableCell>Website</TableCell>
                        <TableCell>Apollo Data</TableCell>
                        <TableCell>Blog Analysis</TableCell>
                        <TableCell>Duplicate</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {competitors.filter(c => c.selected).map((comp) => (
                        <TableRow key={comp.id}>
                          <TableCell>{comp.name}</TableCell>
                          <TableCell>
                            {comp.website ? (
                              <Link href={comp.website} target="_blank" rel="noopener" sx={{ fontSize: '0.875rem' }}>
                                {new URL(comp.website.startsWith('http') ? comp.website : `https://${comp.website}`).hostname}
                              </Link>
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {comp.apolloStatus === 'success' ? (
                              <Chip label="✓" size="small" sx={{ bgcolor: '#dcfce7', color: '#16a34a', minWidth: 24 }} />
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {comp.blogStatus === 'success' ? (
                              <Chip label="✓" size="small" sx={{ bgcolor: '#dcfce7', color: '#16a34a', minWidth: 24 }} />
                            ) : '-'}
                          </TableCell>
                          <TableCell>
                            {duplicateCompanies.get(comp.name) ? (
                              <Chip label="Exists" size="small" sx={{ bgcolor: '#fef3c7', color: '#ca8a04' }} />
                            ) : (
                              <Chip label="New" size="small" sx={{ bgcolor: '#e0f2fe', color: '#0284c7' }} />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}
          </Box>
        )}

        {/* STEP 6: COMPLETE */}
        {currentStep === 'complete' && (
          <Box>
            {/* Success message */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <CheckCircleIcon sx={{ fontSize: 48, color: '#16a34a' }} />
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 500, mb: 0.5 }}>
                  Import Complete!
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Successfully processed {importProgress.total} competitor{importProgress.total !== 1 ? 's' : ''}
                </Typography>
              </Box>
            </Box>

            {/* Import results summary */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8fafc' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 500, mb: 2 }}>
                Import Results
              </Typography>
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Imported
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#16a34a', fontWeight: 500 }}>
                    {Array.from(importResults.entries()).filter(([_, id]) => id !== null).length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Skipped
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#ca8a04', fontWeight: 500 }}>
                    {Array.from(importResults.entries()).filter(([_, id]) => id === null).length}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Errors
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#dc2626', fontWeight: 500 }}>
                    {competitors.filter(c => c.saveStatus === 'error').length}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Cost breakdown */}
            <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8fafc' }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 500, mb: 2 }}>
                Cost Breakdown
              </Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {costBreakdown.aiSearch > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      AI Competitor Search
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      ${costBreakdown.aiSearch.toFixed(4)}
                    </Typography>
                  </Box>
                )}
                {costBreakdown.apollo > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Apollo Enrichment ({costBreakdown.apollo} {costBreakdown.apollo === 1 ? 'company' : 'companies'})
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {costBreakdown.apollo} {costBreakdown.apollo === 1 ? 'credit' : 'credits'}
                    </Typography>
                  </Box>
                )}
                {costBreakdown.blogAnalysis > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Blog Analysis
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      ${costBreakdown.blogAnalysis.toFixed(4)}
                    </Typography>
                  </Box>
                )}
                <Divider sx={{ my: 1 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Total Cost
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#667eea' }}>
                    ${totalCost.toFixed(4)}
                  </Typography>
                </Box>
              </Box>
            </Paper>

            {/* Detailed results table (only if there were issues) */}
            {competitors.some(c => c.saveStatus === 'error' || c.saveStatus === 'skipped') && (
              <>
                <Typography variant="subtitle2" sx={{ fontWeight: 500, mb: 2 }}>
                  Import Details
                </Typography>
                <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Company</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Details</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {competitors.filter(c => c.selected).map((comp) => (
                        <TableRow key={comp.id}>
                          <TableCell>{comp.name}</TableCell>
                          <TableCell>
                            {comp.saveStatus === 'success' ? (
                              <Chip label="Imported" size="small" sx={{ bgcolor: '#dcfce7', color: '#16a34a' }} />
                            ) : comp.saveStatus === 'skipped' ? (
                              <Chip label="Skipped" size="small" sx={{ bgcolor: '#fef3c7', color: '#ca8a04' }} />
                            ) : comp.saveStatus === 'error' ? (
                              <Chip label="Error" size="small" sx={{ bgcolor: '#fee2e2', color: '#dc2626' }} />
                            ) : (
                              <Chip label="Pending" size="small" sx={{ bgcolor: '#e0f2fe', color: '#0284c7' }} />
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="caption" color="text.secondary">
                              {comp.saveError || (comp.saveStatus === 'skipped' ? 'Company already exists' : 'Successfully imported')}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </>
            )}

            {/* Action buttons in complete step */}
            <Box sx={{ display: 'flex', gap: 2, mt: 3 }}>
              <Button
                variant="outlined"
                startIcon={<BusinessIcon />}
                onClick={() => {
                  onClose();
                  // Navigate to companies page (parent component handles this)
                  window.location.href = '/companies';
                }}
                sx={{ flex: 1 }}
              >
                View in Companies
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  // Reset and start over
                  setCurrentStep('finding');
                  setCompetitors([]);
                  setError(null);
                  setSkipEnrichment(false);
                  setSkipBlogAnalysis(false);
                  setCostBreakdown({ aiSearch: 0, apollo: 0, blogAnalysis: 0 });
                  handleFindCompetitors();
                }}
                sx={{ flex: 1 }}
              >
                Find More Competitors
              </Button>
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid #e2e8f0', flexDirection: 'column', alignItems: 'stretch' }}>
        {/* Cost Display */}
        {(totalCost > 0 || costBreakdown.apollo > 0) && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, width: '100%' }}>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              Total Cost: ${totalCost.toFixed(4)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {costBreakdown.aiSearch > 0 && `AI: $${costBreakdown.aiSearch.toFixed(4)}`}
              {costBreakdown.apollo > 0 && `${costBreakdown.aiSearch > 0 ? ' | ' : ''}Apollo: ${costBreakdown.apollo} ${costBreakdown.apollo === 1 ? 'credit' : 'credits'}`}
              {costBreakdown.blogAnalysis > 0 && ` | Blogs: $${costBreakdown.blogAnalysis.toFixed(4)}`}
            </Typography>
          </Box>
        )}

        {/* Action Buttons */}
        <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
          {currentStep === 'review' && (
            <Button
              startIcon={<RefreshIcon />}
              onClick={handleFindCompetitors}
            >
              Regenerate
            </Button>
          )}

          <Box sx={{ ml: 'auto', display: 'flex', gap: 2 }}>
            {currentStep !== 'finding' && currentStep !== 'complete' && (
              <Button
                onClick={currentStep === 'review' ? handleClose : handleBack}
              >
                {currentStep === 'review' ? 'Cancel' : 'Back'}
              </Button>
            )}

            {currentStep === 'review' && skipEnrichment && skipBlogAnalysis && (
              <Button
                variant="outlined"
                onClick={handleSkipToImport}
                disabled={selectedCount === 0}
              >
                Skip to Import
              </Button>
            )}

            {currentStep !== 'finding' && currentStep !== 'complete' && (
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={selectedCount === 0 || loading}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  },
                }}
              >
                {currentStep === 'importing' ? 'Import Selected' : 'Next'}
              </Button>
            )}

            {currentStep === 'complete' && (
              <Button
                variant="contained"
                onClick={onClose}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  },
                }}
              >
                Close
              </Button>
            )}
          </Box>
        </Box>
      </DialogActions>
    </Dialog>
  );
};
