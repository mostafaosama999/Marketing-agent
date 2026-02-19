// src/components/features/companies/BulkWritingProgramDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  MenuItem,
  Select,
  Chip,
  CircularProgress,
  Checkbox,
  FormControlLabel,
} from '@mui/material';
import {
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { Company } from '../../../types/crm';
import { updateCompany } from '../../../services/api/companies';
import {
  getProgramUrlFieldMapping,
  getCompanyProgramUrl,
} from '../../../services/api/programUrlFieldMappingService';
import {
  bulkFindWritingPrograms,
  bulkAnalyzeWritingPrograms,
} from '../../../services/api/bulkWritingProgramService';

interface BulkWritingProgramDialogProps {
  open: boolean;
  companies: Company[];
  onClose: () => void;
  onComplete?: () => void;
}

type Phase = 'finding' | 'confirmation' | 'analyzing' | 'complete';

interface CompanyProgress {
  companyId: string;
  companyName: string;
  findingStatus: 'pending' | 'success' | 'error';
  findingMessage?: string;
  analyzingStatus?: 'pending' | 'success' | 'error';
  analyzingMessage?: string;
  foundUrls: string[];
  selectedUrl?: string;
  urlSource?: 'mapped' | 'searched'; // Track where URL came from
  analysisData?: any;
}

export const BulkWritingProgramDialog: React.FC<BulkWritingProgramDialogProps> = ({
  open,
  companies,
  onClose,
  onComplete,
}) => {
  const [phase, setPhase] = useState<Phase>('finding');
  const [progress, setProgress] = useState<Map<string, CompanyProgress>>(new Map());
  const [findingProgress, setFindingProgress] = useState(0);
  const [analyzingProgress, setAnalyzingProgress] = useState(0);
  const [totalCost, setTotalCost] = useState(0);
  const [useMappedField, setUseMappedField] = useState(true); // Default to true

  // Initialize progress map and start finding when dialog opens
  useEffect(() => {
    if (open) {
      // Reset state when dialog opens
      const initialProgress = new Map<string, CompanyProgress>();
      companies.forEach(company => {
        initialProgress.set(company.id, {
          companyId: company.id,
          companyName: company.name,
          findingStatus: 'pending',
          foundUrls: [],
        });
      });
      setProgress(initialProgress);
      setPhase('finding');
      setFindingProgress(0);
      setAnalyzingProgress(0);
      setTotalCost(0);

      // Start finding URLs after state is set
      setTimeout(() => {
        startFindingPhase();
      }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const startFindingPhase = async () => {
    console.log('[BulkWritingProgram] ========== STARTING FINDING PHASE ==========');
    console.log('[BulkWritingProgram] Total companies to process:', companies.length);
    console.log('[BulkWritingProgram] Companies:', companies.map(c => ({
      id: c.id,
      name: c.name,
      website: c.website,
      hasWritingProgramAnalysis: !!(c as any).writingProgramAnalysis,
    })));
    console.log('[BulkWritingProgram] useMappedField:', useMappedField);
    console.log('[BulkWritingProgram] Mapped field name:', getProgramUrlFieldMapping());

    setPhase('finding');
    setFindingProgress(0);

    // Separate companies into two groups:
    // 1. Companies with mapped field URLs (skip search)
    // 2. Companies that need URL search
    const companiesWithMappedUrls: Company[] = [];
    const companiesNeedingSearch: Company[] = [];

    let completedCount = 0;

    companies.forEach(company => {
      // Check if we should use mapped field first
      if (useMappedField) {
        const programUrl = getCompanyProgramUrl(company);
        console.log(`[BulkWritingProgram] Checking mapped field for ${company.name}:`, programUrl);
        if (programUrl) {
          console.log(`[BulkWritingProgram] ✓ Found mapped URL for ${company.name}:`, programUrl);
          companiesWithMappedUrls.push(company);
          // Update progress immediately for mapped URLs
          setProgress(prev => {
            const newProgress = new Map(prev);
            const companyProgress = newProgress.get(company.id);
            if (companyProgress) {
              companyProgress.findingStatus = 'success';
              companyProgress.findingMessage = 'Found URL in mapped field';
              companyProgress.foundUrls = [programUrl];
              companyProgress.selectedUrl = programUrl;
              companyProgress.urlSource = 'mapped';
            }
            return newProgress;
          });
          completedCount++;
          setFindingProgress((completedCount / companies.length) * 100);
          return;
        }
      }

      // No mapped URL - needs search
      console.log(`[BulkWritingProgram] ✗ No mapped URL for ${company.name}, adding to search queue`);
      companiesNeedingSearch.push(company);
    });

    // If there are companies needing search, use the bulk service
    console.log('[BulkWritingProgram] Companies needing search:', companiesNeedingSearch.length);
    console.log('[BulkWritingProgram] Companies with mapped URLs:', companiesWithMappedUrls.length);

    if (companiesNeedingSearch.length > 0) {
      try {
        console.log('[BulkWritingProgram] ========== CALLING bulkFindWritingPrograms ==========');
        console.log('[BulkWritingProgram] Passing companies:', companiesNeedingSearch.map(c => ({
          id: c.id,
          name: c.name,
          website: c.website,
        })));

        // Call the bulk service with progress callback
        const results = await bulkFindWritingPrograms(
          companiesNeedingSearch,
          (companyId, phase, status, message) => {
            console.log(`[BulkWritingProgram] Progress callback: ${companyId} - ${phase} - ${status} - ${message}`);
            // Update progress for this company
            setProgress(prev => {
              const newProgress = new Map(prev);
              const companyProgress = newProgress.get(companyId);
              if (companyProgress) {
                companyProgress.findingStatus = status;
                companyProgress.findingMessage = message || '';
              }
              return newProgress;
            });
          }
        );

        console.log('[BulkWritingProgram] ========== bulkFindWritingPrograms RETURNED ==========');
        console.log('[BulkWritingProgram] Results size:', results.size);
        console.log('[BulkWritingProgram] Results:', Array.from(results.entries()).map(([id, r]) => ({
          companyId: id,
          success: r.success,
          urlCount: r.urls?.length || 0,
          aiSuggestionsCount: r.aiSuggestions?.length || 0,
          error: r.error,
        })));

        // Process the results
        results.forEach((result, companyId) => {
          const allUrls: string[] = [];

          // Add pattern-matched URLs
          if (result.urls) {
            allUrls.push(...result.urls.map(u => u.url));
          }

          // Add AI suggestions
          if (result.aiSuggestions) {
            allUrls.push(...result.aiSuggestions.map(s => s.url));
          }

          // Update final progress with all URLs
          setProgress(prev => {
            const newProgress = new Map(prev);
            const companyProgress = newProgress.get(companyId);
            if (companyProgress) {
              companyProgress.findingStatus = result.success ? 'success' : 'error';
              companyProgress.findingMessage = result.error || (allUrls.length > 0
                ? `Found ${allUrls.length} URL${allUrls.length > 1 ? 's' : ''}`
                : 'No URLs found');
              companyProgress.foundUrls = allUrls;
              companyProgress.selectedUrl = allUrls.length > 0 ? allUrls[0] : undefined;
              companyProgress.urlSource = 'searched';
            }
            return newProgress;
          });

          completedCount++;
          setFindingProgress((completedCount / companies.length) * 100);
        });

      } catch (error: any) {
        console.error('[BulkWritingProgram] ========== ERROR in bulkFindWritingPrograms ==========');
        console.error('[BulkWritingProgram] Error:', error);
        console.error('[BulkWritingProgram] Error message:', error.message);
        console.error('[BulkWritingProgram] Error stack:', error.stack);
        // Mark all companies needing search as errored
        companiesNeedingSearch.forEach(company => {
          setProgress(prev => {
            const newProgress = new Map(prev);
            const companyProgress = newProgress.get(company.id);
            if (companyProgress) {
              companyProgress.findingStatus = 'error';
              companyProgress.findingMessage = error.message || 'Failed to find URLs';
              companyProgress.foundUrls = [];
            }
            return newProgress;
          });
          completedCount++;
          setFindingProgress((completedCount / companies.length) * 100);
        });
      }
    }

    // Move to confirmation phase
    setTimeout(() => {
      setPhase('confirmation');
    }, 500);
  };

  const startAnalyzingPhase = async () => {
    setPhase('analyzing');
    setAnalyzingProgress(0);

    // Get companies with selected URLs
    const companiesToAnalyze = Array.from(progress.values()).filter(p => p.selectedUrl);

    if (companiesToAnalyze.length === 0) {
      // Still save "searched but not found" markers for skipped companies
      const skippedCompanies = Array.from(progress.values()).filter(
        p => p.foundUrls.length === 0 && !p.selectedUrl
      );
      for (const skipped of skippedCompanies) {
        try {
          const company = companies.find(c => c.id === skipped.companyId);
          if (company && !company.writingProgramAnalysis?.hasProgram) {
            await updateCompany(skipped.companyId, {
              writingProgramAnalysis: {
                hasProgram: false,
                programUrl: null,
                isOpen: null,
                openDates: null,
                payment: { amount: null, method: null, details: null, sourceSnippet: null, historical: null },
                lastAnalyzedAt: new Date(),
                lastSearchedAt: new Date(),
              },
            });
          }
        } catch (error) {
          console.error(`Error saving search marker for company ${skipped.companyId}:`, error);
        }
      }
      setPhase('complete');
      return;
    }

    // Prepare selections map for bulk service
    const selections = new Map<string, { companyId: string; companyName: string; programUrl: string }>();
    companiesToAnalyze.forEach(cp => {
      if (cp.selectedUrl) {
        selections.set(cp.companyId, {
          companyId: cp.companyId,
          companyName: cp.companyName,
          programUrl: cp.selectedUrl,
        });
      }
    });

    let completedCount = 0;
    let totalCost = 0;

    try {
      // Call the bulk service with progress callback
      const results = await bulkAnalyzeWritingPrograms(
        selections,
        (companyId, phase, status, message) => {
          // Update progress for this company
          setProgress(prev => {
            const newProgress = new Map(prev);
            const cp = newProgress.get(companyId);
            if (cp) {
              cp.analyzingStatus = status;
              cp.analyzingMessage = message || '';
            }
            return newProgress;
          });
        }
      );

      // Process the results and save to Firestore
      for (const [companyId, result] of Array.from(results.entries())) {
        try {
          if (result.success && result.data) {
            // Save to Firestore
            await updateCompany(companyId, {
              writingProgramAnalysis: {
                ...result.data,
                programUrl: result.programUrl,
                lastAnalyzedAt: new Date(),
              },
            });

            // Update progress with final data
            setProgress(prev => {
              const newProgress = new Map(prev);
              const cp = newProgress.get(companyId);
              if (cp) {
                cp.analyzingStatus = 'success';
                cp.analysisData = result.data;
                const paymentInfo = result.data.payment?.amount || 'Unknown payment';
                const statusInfo = result.data.isOpen === true ? 'Open' : result.data.isOpen === false ? 'Closed' : 'Unknown';
                cp.analyzingMessage = `${paymentInfo} - ${statusInfo}`;
              }
              return newProgress;
            });

            // Accumulate cost
            if (result.data.costInfo) {
              totalCost += result.data.costInfo.totalCost || 0;
            }
          } else {
            // Update with error
            setProgress(prev => {
              const newProgress = new Map(prev);
              const cp = newProgress.get(companyId);
              if (cp) {
                cp.analyzingStatus = 'error';
                cp.analyzingMessage = result.error || 'Failed to analyze';
              }
              return newProgress;
            });
          }

          completedCount++;
          setAnalyzingProgress((completedCount / companiesToAnalyze.length) * 100);

        } catch (error: any) {
          console.error(`Error saving analysis for company ${companyId}:`, error);
          setProgress(prev => {
            const newProgress = new Map(prev);
            const cp = newProgress.get(companyId);
            if (cp) {
              cp.analyzingStatus = 'error';
              cp.analyzingMessage = error.message || 'Failed to save analysis';
            }
            return newProgress;
          });
          completedCount++;
          setAnalyzingProgress((completedCount / companiesToAnalyze.length) * 100);
        }
      }

    } catch (error: any) {
      console.error('Error in bulk analyze writing programs:', error);
      // Mark all as errored
      companiesToAnalyze.forEach(cp => {
        setProgress(prev => {
          const newProgress = new Map(prev);
          const companyProgress = newProgress.get(cp.companyId);
          if (companyProgress) {
            companyProgress.analyzingStatus = 'error';
            companyProgress.analyzingMessage = error.message || 'Failed to analyze';
          }
          return newProgress;
        });
        completedCount++;
        setAnalyzingProgress((completedCount / companiesToAnalyze.length) * 100);
      });
    }

    setTotalCost(totalCost);
    setAnalyzingProgress(100);

    // Save "searched but not found" marker for skipped companies (no URLs found)
    const skippedCompanies = Array.from(progress.values()).filter(
      p => p.foundUrls.length === 0 && !p.selectedUrl
    );
    for (const skipped of skippedCompanies) {
      try {
        // Only save if company doesn't already have a successful analysis
        const company = companies.find(c => c.id === skipped.companyId);
        if (company && !company.writingProgramAnalysis?.hasProgram) {
          await updateCompany(skipped.companyId, {
            writingProgramAnalysis: {
              hasProgram: false,
              programUrl: null,
              isOpen: null,
              openDates: null,
              payment: { amount: null, method: null, details: null, sourceSnippet: null, historical: null },
              lastAnalyzedAt: new Date(),
              lastSearchedAt: new Date(),
            },
          });
        }
      } catch (error) {
        console.error(`Error saving search marker for company ${skipped.companyId}:`, error);
      }
    }

    // Move to complete phase
    setTimeout(() => {
      setPhase('complete');
    }, 500);
  };

  const handleUrlChange = (companyId: string, url: string) => {
    setProgress(prev => {
      const newProgress = new Map(prev);
      const companyProgress = newProgress.get(companyId);
      if (companyProgress) {
        companyProgress.selectedUrl = url === 'skip' ? undefined : url;
      }
      return newProgress;
    });
  };

  const handleConfirm = () => {
    startAnalyzingPhase();
  };

  const handleClose = () => {
    if (phase === 'finding' || phase === 'analyzing') {
      if (!window.confirm('Analysis is still in progress. Are you sure you want to cancel?')) {
        return;
      }
    }

    // Call onComplete callback if in complete phase
    if (phase === 'complete' && onComplete) {
      onComplete();
    }

    onClose();
  };

  const getSelectedCount = () => {
    return Array.from(progress.values()).filter(p => p.selectedUrl).length;
  };

  const getSuccessCount = () => {
    return Array.from(progress.values()).filter(
      p => p.analyzingStatus === 'success'
    ).length;
  };

  const getErrorCount = () => {
    return Array.from(progress.values()).filter(
      p => p.analyzingStatus === 'error' || (p.findingStatus === 'error' && !p.selectedUrl)
    ).length;
  };

  const getSkippedCount = () => {
    return Array.from(progress.values()).filter(
      p => p.foundUrls.length === 0 || !p.selectedUrl
    ).length;
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            minHeight: '500px',
          },
        },
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          pb: 2,
        }}
      >
        <Typography variant="h5" fontWeight={600}>
          Bulk Writing Program Analysis
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
          {phase === 'finding' && 'Finding writing program URLs...'}
          {phase === 'confirmation' && 'Review and confirm URLs to analyze'}
          {phase === 'analyzing' && 'Analyzing writing programs...'}
          {phase === 'complete' && 'Analysis complete!'}
        </Typography>
      </DialogTitle>

      <DialogContent sx={{ pt: 3, minHeight: '400px' }}>
        {/* Phase 1: Finding URLs */}
        {phase === 'finding' && (
          <Box>
            {/* Checkbox for using mapped field */}
            {getProgramUrlFieldMapping() && (
              <Box sx={{ mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={useMappedField}
                      onChange={(e) => setUseMappedField(e.target.checked)}
                      disabled={findingProgress > 0} // Disable after search starts
                      sx={{
                        color: '#667eea',
                        '&.Mui-checked': {
                          color: '#667eea',
                        },
                      }}
                    />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Use existing URLs from mapped field when available
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Field: <strong>{getProgramUrlFieldMapping()}</strong>
                      </Typography>
                    </Box>
                  }
                />
              </Box>
            )}

            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Progress: {Math.round(findingProgress)}%
              </Typography>
              <LinearProgress
                variant="determinate"
                value={findingProgress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  },
                }}
              />
            </Box>

            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Company</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Message</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.from(progress.values()).map((companyProgress) => (
                    <TableRow key={companyProgress.companyId}>
                      <TableCell>{companyProgress.companyName}</TableCell>
                      <TableCell>
                        {companyProgress.findingStatus === 'pending' && (
                          <Chip
                            icon={<CircularProgress size={12} />}
                            label="Finding"
                            size="small"
                            sx={{ bgcolor: '#dbeafe', color: '#0077b5' }}
                          />
                        )}
                        {companyProgress.findingStatus === 'success' && (
                          <Chip
                            icon={<SuccessIcon />}
                            label="Found"
                            size="small"
                            sx={{ bgcolor: '#dcfce7', color: '#16a34a' }}
                          />
                        )}
                        {companyProgress.findingStatus === 'error' && (
                          <Chip
                            icon={<ErrorIcon />}
                            label="Error"
                            size="small"
                            sx={{ bgcolor: '#fee2e2', color: '#dc2626' }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontSize="11px">
                          {companyProgress.findingMessage || '-'}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Phase 2: Confirmation */}
        {phase === 'confirmation' && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Select the URL to analyze for each company. URLs marked as "Skip" will not be analyzed.
            </Typography>

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Company</TableCell>
                    <TableCell>Found URLs</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>Select URL</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.from(progress.values()).map((companyProgress) => (
                    <TableRow key={companyProgress.companyId}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {companyProgress.companyName}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontSize="11px">
                          {companyProgress.foundUrls.length > 0
                            ? `${companyProgress.foundUrls.length} URL${companyProgress.foundUrls.length > 1 ? 's' : ''} found`
                            : 'No URLs found'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {companyProgress.urlSource === 'mapped' ? (
                          <Chip
                            size="small"
                            label="Mapped Field"
                            icon={<SuccessIcon />}
                            sx={{
                              bgcolor: '#dcfce7',
                              color: '#16a34a',
                              fontSize: '10px',
                              height: '20px',
                              '& .MuiChip-icon': {
                                fontSize: 12,
                                color: '#16a34a',
                              },
                            }}
                          />
                        ) : companyProgress.urlSource === 'searched' ? (
                          <Chip
                            size="small"
                            label="Search"
                            sx={{
                              bgcolor: '#dbeafe',
                              color: '#0077b5',
                              fontSize: '10px',
                              height: '20px',
                            }}
                          />
                        ) : (
                          <Typography variant="body2" fontSize="11px" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        {companyProgress.foundUrls.length > 0 ? (
                          <Select
                            size="small"
                            value={companyProgress.selectedUrl || 'skip'}
                            onChange={(e) => handleUrlChange(companyProgress.companyId, e.target.value)}
                            sx={{ minWidth: 200, fontSize: '12px' }}
                          >
                            <MenuItem value="skip">
                              <em>Skip this company</em>
                            </MenuItem>
                            {companyProgress.foundUrls.map((url, index) => (
                              <MenuItem key={url} value={url} sx={{ fontSize: '12px' }}>
                                URL {index + 1}: {url.substring(0, 40)}...
                              </MenuItem>
                            ))}
                          </Select>
                        ) : (
                          <Chip label="Skip" size="small" sx={{ bgcolor: '#f3f4f6', color: '#6b7280' }} />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ mt: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
              <Typography variant="body2" fontWeight={600}>
                Summary: {getSelectedCount()} of {companies.length} companies will be analyzed
              </Typography>
            </Box>
          </Box>
        )}

        {/* Phase 3: Analyzing */}
        {phase === 'analyzing' && (
          <Box>
            <Box sx={{ mb: 3 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Progress: {Math.round(analyzingProgress)}% ({getSelectedCount()} companies)
              </Typography>
              <LinearProgress
                variant="determinate"
                value={analyzingProgress}
                sx={{
                  height: 8,
                  borderRadius: 4,
                  bgcolor: '#e0e0e0',
                  '& .MuiLinearProgress-bar': {
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  },
                }}
              />
            </Box>

            <TableContainer component={Paper} sx={{ maxHeight: 300 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Company</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Details</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.from(progress.values())
                    .filter(p => p.selectedUrl)
                    .map((companyProgress) => (
                      <TableRow key={companyProgress.companyId}>
                        <TableCell>{companyProgress.companyName}</TableCell>
                        <TableCell>
                          {companyProgress.analyzingStatus === 'pending' && (
                            <Chip
                              icon={<CircularProgress size={12} />}
                              label="Analyzing"
                              size="small"
                              sx={{ bgcolor: '#dbeafe', color: '#0077b5' }}
                            />
                          )}
                          {companyProgress.analyzingStatus === 'success' && (
                            <Chip
                              icon={<SuccessIcon />}
                              label="Complete"
                              size="small"
                              sx={{ bgcolor: '#dcfce7', color: '#16a34a' }}
                            />
                          )}
                          {companyProgress.analyzingStatus === 'error' && (
                            <Chip
                              icon={<ErrorIcon />}
                              label="Failed"
                              size="small"
                              sx={{ bgcolor: '#fee2e2', color: '#dc2626' }}
                            />
                          )}
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontSize="11px">
                            {companyProgress.analyzingMessage || '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Phase 4: Complete */}
        {phase === 'complete' && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <SuccessIcon sx={{ fontSize: 64, color: '#16a34a', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} sx={{ mb: 3 }}>
              Analysis Complete!
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, mb: 3 }}>
              <Box>
                <Typography variant="h4" color="success.main" fontWeight={700}>
                  {getSuccessCount()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Successfully analyzed
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="warning.main" fontWeight={700}>
                  {getSkippedCount()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Skipped
                </Typography>
              </Box>
              <Box>
                <Typography variant="h4" color="error.main" fontWeight={700}>
                  {getErrorCount()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Failed
                </Typography>
              </Box>
            </Box>

            {totalCost > 0 && (
              <Box sx={{ mt: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 2, display: 'inline-block' }}>
                <Typography variant="body2" fontWeight={600}>
                  Total Cost: ${totalCost.toFixed(2)}
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3, borderTop: '1px solid #e0e0e0' }}>
        {phase === 'confirmation' && (
          <>
            <Button onClick={handleClose} color="inherit">
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              variant="contained"
              disabled={getSelectedCount() === 0}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                },
              }}
            >
              Analyze Selected ({getSelectedCount()})
            </Button>
          </>
        )}
        {phase === 'complete' && (
          <Button
            onClick={handleClose}
            variant="contained"
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
      </DialogActions>
    </Dialog>
  );
};
