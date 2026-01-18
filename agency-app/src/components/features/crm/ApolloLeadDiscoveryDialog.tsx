// src/components/features/crm/ApolloLeadDiscoveryDialog.tsx

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
  Stepper,
  Step,
  StepLabel,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Paper,
  LinearProgress,
  Skeleton,
} from '@mui/material';
import {
  Search as SearchIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { ApolloSearchPerson } from '../../../types';
import { useAuth } from '../../../contexts/AuthContext';
import { getApolloJobTitles, initializeDefaultJobTitles } from '../../../services/api/apolloJobTitles';

interface ApolloLeadDiscoveryDialogProps {
  open: boolean;
  onClose: () => void;
  onLeadsAdded?: (count: number) => void;
}

const steps = ['Configure Search', 'Select Leads', 'Enrich & Review', 'Import Complete'];

export const ApolloLeadDiscoveryDialog: React.FC<ApolloLeadDiscoveryDialogProps> = ({
  open,
  onClose,
  onLeadsAdded,
}) => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);

  // Step 1: Configure Search
  const [domain, setDomain] = useState('');
  const [availableJobTitles, setAvailableJobTitles] = useState<string[]>([]);
  const [selectedJobTitles, setSelectedJobTitles] = useState<Set<string>>(new Set());
  const [loadingJobTitles, setLoadingJobTitles] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load job titles from Firestore on mount
  useEffect(() => {
    const loadJobTitles = async () => {
      setLoadingJobTitles(true);
      try {
        // Initialize defaults if needed, then fetch
        await initializeDefaultJobTitles(user?.uid);
        const titles = await getApolloJobTitles();
        setAvailableJobTitles(titles);
        // Select all by default
        setSelectedJobTitles(new Set(titles));
      } catch (err) {
        console.error('Error loading job titles:', err);
      } finally {
        setLoadingJobTitles(false);
      }
    };

    if (open) {
      loadJobTitles();
    }
  }, [open, user?.uid]);

  const toggleJobTitle = (title: string) => {
    setSelectedJobTitles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  const selectAllJobTitles = () => {
    setSelectedJobTitles(new Set(availableJobTitles));
  };

  const deselectAllJobTitles = () => {
    setSelectedJobTitles(new Set());
  };

  // Step 2: Select Leads
  const [searchResults, setSearchResults] = useState<ApolloSearchPerson[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [totalResults, setTotalResults] = useState(0);

  // Step 3: Enrich & Map
  const [enriching, setEnriching] = useState(false);
  const [enrichedData, setEnrichedData] = useState<any[]>([]);

  // Step 4: Import Complete
  const [importedCount, setImportedCount] = useState(0);

  // Progress state for multi-page fetching
  const [searchProgress, setSearchProgress] = useState<string>('');

  const handleSearch = async () => {
    if (!domain.trim()) {
      setError('Please enter a company domain');
      return;
    }

    setLoading(true);
    setError(null);
    setSearchProgress('');

    try {
      // Get selected job titles as array
      const titlesArray = Array.from(selectedJobTitles);

      // Call searchPeopleCloud function
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const searchPeople = httpsCallable(functions, 'searchPeopleCloud');

      // Fetch first page
      setSearchProgress('Fetching page 1...');
      const firstResult = await searchPeople({
        domain: domain.trim(),
        jobTitles: titlesArray.length > 0 ? titlesArray : undefined,
        page: 1,
        pageSize: 100,
      });

      const firstData = firstResult.data as any;

      if (!firstData.success) {
        setError(firstData.error || 'Failed to search people');
        return;
      }

      if (firstData.people.length === 0) {
        setError('No people found. Try different job titles or domain.');
        return;
      }

      // Collect all results
      let allPeople = [...(firstData.people || [])];
      const totalPages = firstData.pagination?.totalPages || 1;
      const totalResultsCount = firstData.pagination?.totalResults || allPeople.length;

      // Auto-fetch remaining pages if more exist
      if (totalPages > 1) {
        for (let page = 2; page <= totalPages; page++) {
          setSearchProgress(`Fetching page ${page} of ${totalPages}...`);

          const pageResult = await searchPeople({
            domain: domain.trim(),
            jobTitles: titlesArray.length > 0 ? titlesArray : undefined,
            page,
            pageSize: 100,
          });

          const pageData = pageResult.data as any;

          if (pageData.success && pageData.people?.length > 0) {
            allPeople = [...allPeople, ...pageData.people];
          }
        }
      }

      setSearchProgress('');
      setSearchResults(allPeople);
      setTotalResults(totalResultsCount);
      setSelectedIndices(new Set());

      // Move to step 2
      setActiveStep(1);
    } catch (err) {
      console.error('Error searching:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while searching');
    } finally {
      setLoading(false);
      setSearchProgress('');
    }
  };

  const handleSelectAll = () => {
    if (selectedIndices.size === searchResults.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(searchResults.map((_, idx) => idx)));
    }
  };

  const handleSelectPerson = (index: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedIndices(newSelected);
  };

  const handleEnrichAndMap = async () => {
    if (selectedIndices.size === 0) {
      setError('Please select at least one person to enrich');
      return;
    }

    // Move to step 3 FIRST to show the loading spinner
    setActiveStep(2);
    setEnriching(true);
    setError(null);

    try {
      // Get selected people
      const selectedPeople = Array.from(selectedIndices).map(idx => searchResults[idx]);
      const personIds = selectedPeople.map(p => p.id).filter(Boolean);

      // Call bulk enrichment function
      const { getFunctions, httpsCallable } = await import('firebase/functions');
      const functions = getFunctions();
      const bulkEnrich = httpsCallable(functions, 'apolloBulkEnrichPeople');

      const result = await bulkEnrich({ personIds });
      const data = result.data as any;

      if (!data.success) {
        setError(data.error || 'Failed to enrich people');
        // Go back to step 2 on error so user can retry
        setActiveStep(1);
        return;
      }

      setEnrichedData(data.people || []);
      // Stay on step 3 (already there) - enrichment complete
    } catch (err) {
      console.error('Error enriching:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while enriching');
      // Go back to step 2 on error so user can retry
      setActiveStep(1);
    } finally {
      setEnriching(false);
    }
  };

  const handleImportToSystem = async () => {
    setLoading(true);
    setError(null);

    try {
      const { createLead } = await import('../../../services/api/leads');

      let successCount = 0;

      for (const person of enrichedData) {
        try {
          await createLead({
            name: person.name || `${person.firstName} ${person.lastName}`,
            email: person.email || '',
            phone: person.phone || '',
            company: person.companyName || domain,
            status: 'new_lead',
            customFields: {
              apolloId: person.id,
              title: person.title,
              apolloSource: 'people-search',
            },
            outreach: person.linkedinUrl ? {
              linkedIn: {
                status: 'not_sent',
                profileUrl: person.linkedinUrl,
              }
            } : undefined,
          }, user?.uid);
          successCount++;
        } catch (err) {
          console.error(`Failed to add lead ${person.email}:`, err);
        }
      }

      setImportedCount(successCount);
      setActiveStep(3);
      onLeadsAdded?.(successCount);
    } catch (err) {
      console.error('Error importing:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while importing');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setActiveStep(0);
    setDomain('');
    setSearchResults([]);
    setSelectedIndices(new Set());
    setEnrichedData([]);
    setError(null);
    setImportedCount(0);
    setSearchProgress('');
    onClose();
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(0, prev - 1));
    setError(null);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: 2,
        },
      }}
    >
      <Box
        sx={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 2,
        }}
      >
        <DialogTitle>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Discover Leads with Apollo
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {domain || 'Domain'}
          </Typography>
        </DialogTitle>

        <DialogContent>
          {/* Stepper */}
          <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
            {steps.map((label, index) => (
              <Step key={label}>
                <StepLabel
                  StepIconProps={{
                    sx: {
                      '&.Mui-active': { color: '#667eea' },
                      '&.Mui-completed': { color: '#10b981' },
                    },
                  }}
                >
                  {label}
                </StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {/* Step 1: Configure Search */}
          {activeStep === 0 && (
            <Box>
              <TextField
                label="Company Domain"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                fullWidth
                required
                disabled={loading}
                sx={{ mb: 3 }}
                placeholder="e.g., pagerduty.com"
              />

              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Job Titles to Search For
                </Typography>
                <Box>
                  <Button
                    size="small"
                    onClick={selectAllJobTitles}
                    disabled={loading || loadingJobTitles}
                    sx={{ mr: 1 }}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    onClick={deselectAllJobTitles}
                    disabled={loading || loadingJobTitles}
                  >
                    Deselect All
                  </Button>
                </Box>
              </Box>

              {loadingJobTitles ? (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Skeleton key={i} variant="rounded" width={120} height={32} />
                  ))}
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {availableJobTitles.map((title) => (
                    <Chip
                      key={title}
                      label={title}
                      onClick={() => toggleJobTitle(title)}
                      disabled={loading}
                      sx={{
                        cursor: 'pointer',
                        bgcolor: selectedJobTitles.has(title)
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'rgba(0,0,0,0.08)',
                        background: selectedJobTitles.has(title)
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : undefined,
                        color: selectedJobTitles.has(title) ? 'white' : 'text.primary',
                        '&:hover': {
                          bgcolor: selectedJobTitles.has(title)
                            ? 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
                            : 'rgba(0,0,0,0.12)',
                          background: selectedJobTitles.has(title)
                            ? 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)'
                            : undefined,
                        },
                      }}
                    />
                  ))}
                </Box>
              )}

              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                {selectedJobTitles.size} of {availableJobTitles.length} titles selected
              </Typography>
            </Box>
          )}

          {/* Step 2: Select Leads */}
          {activeStep === 1 && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2">
                  Found {totalResults} leads • {selectedIndices.size} selected
                </Typography>
                <Button size="small" onClick={handleSelectAll}>
                  {selectedIndices.size === searchResults.length ? 'Deselect All' : 'Select All'}
                </Button>
              </Box>

              <TableContainer component={Paper} sx={{ maxHeight: 350 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={selectedIndices.size === searchResults.length && searchResults.length > 0}
                          indeterminate={selectedIndices.size > 0 && selectedIndices.size < searchResults.length}
                          onChange={handleSelectAll}
                        />
                      </TableCell>
                      <TableCell>Name</TableCell>
                      <TableCell>Title</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {searchResults.map((person, index) => (
                      <TableRow
                        key={person.id || index}
                        hover
                        onClick={() => handleSelectPerson(index)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <TableCell padding="checkbox">
                          <Checkbox checked={selectedIndices.has(index)} />
                        </TableCell>
                        <TableCell>{person.firstName || person.name || '-'}</TableCell>
                        <TableCell>{person.title || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Info about enrichment */}
              {selectedIndices.size > 0 && (
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2">
                    <strong>Next step:</strong> Enrich {selectedIndices.size} selected lead{selectedIndices.size > 1 ? 's' : ''} to reveal emails, phone numbers, and LinkedIn profiles.
                  </Typography>
                </Alert>
              )}
            </Box>
          )}

          {/* Step 3: Enrich & Review */}
          {activeStep === 2 && (
            <Box>
              {enriching ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <CircularProgress sx={{ mb: 2, color: '#667eea' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Enriching {selectedIndices.size} leads...
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Revealing emails, phone numbers, and LinkedIn profiles
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                    This may take a few seconds
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="subtitle2">
                      Enriched {enrichedData.length} leads • Ready to import
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                      <Chip
                        size="small"
                        label={`${enrichedData.filter(p => p.email).length} emails`}
                        sx={{ bgcolor: '#e0f2fe', color: '#0369a1' }}
                      />
                      <Chip
                        size="small"
                        label={`${enrichedData.filter(p => p.linkedinUrl).length} LinkedIn`}
                        sx={{ bgcolor: '#e0e7ff', color: '#4338ca' }}
                      />
                    </Box>
                  </Box>

                  <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                    <Table stickyHeader size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell>Title</TableCell>
                          <TableCell>Email</TableCell>
                          <TableCell>Phone</TableCell>
                          <TableCell>LinkedIn</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {enrichedData.map((person, index) => (
                          <TableRow key={person.id || index}>
                            <TableCell>{person.name || `${person.firstName} ${person.lastName}`}</TableCell>
                            <TableCell>{person.title || '-'}</TableCell>
                            <TableCell sx={{ color: person.email ? '#059669' : '#94a3b8' }}>
                              {person.email || '-'}
                            </TableCell>
                            <TableCell>{person.phone || '-'}</TableCell>
                            <TableCell>
                              {person.linkedinUrl ? (
                                <Chip size="small" label="Yes" sx={{ bgcolor: '#e0e7ff', color: '#4338ca' }} />
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}

          {/* Step 4: Import Complete */}
          {activeStep === 3 && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CheckCircleIcon sx={{ fontSize: 64, color: '#10b981', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                Import Complete!
              </Typography>
              <Typography color="text.secondary">
                Successfully imported {importedCount} lead{importedCount > 1 ? 's' : ''} to your CRM
              </Typography>
            </Box>
          )}

          {/* Loading Progress */}
          {loading && activeStep !== 2 && (
            <Box sx={{ mt: 2 }}>
              <LinearProgress />
              {searchProgress && (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                  {searchProgress}
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2 }}>
          {activeStep > 0 && activeStep < 3 && (
            <Button onClick={handleBack} disabled={loading || enriching}>
              Back
            </Button>
          )}

          <Button onClick={handleClose} disabled={loading || enriching}>
            {activeStep === 3 ? 'Close' : 'Cancel'}
          </Button>

          {activeStep === 0 && (
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={loading || !domain.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
              }}
            >
              Search
            </Button>
          )}

          {activeStep === 1 && (
            <Button
              variant="contained"
              onClick={handleEnrichAndMap}
              disabled={selectedIndices.size === 0}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                },
              }}
            >
              Next: Enrich Selected ({selectedIndices.size})
            </Button>
          )}

          {activeStep === 2 && !enriching && (
            <Button
              variant="contained"
              onClick={handleImportToSystem}
              disabled={loading || enrichedData.length === 0}
              startIcon={loading ? <CircularProgress size={20} /> : null}
              sx={{
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                },
              }}
            >
              Import to CRM
            </Button>
          )}
        </DialogActions>
      </Box>
    </Dialog>
  );
};
