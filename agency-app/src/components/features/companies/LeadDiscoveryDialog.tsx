// src/components/features/companies/LeadDiscoveryDialog.tsx
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
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Checkbox,
  Chip,
  Paper,
  IconButton,
  Tooltip,
  Stepper,
  Step,
  StepLabel,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { Company } from '../../../types/crm';
import { apolloService } from '../../../services/api/apolloService';
import { ApolloSearchPerson } from '../../../types/apollo';
import { createLeadsBatch } from '../../../services/api/leads';
import { LeadFormData } from '../../../types/lead';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserPreferences, updateApolloJobTitles } from '../../../services/api/userPreferences';

interface LeadDiscoveryDialogProps {
  open: boolean;
  onClose: () => void;
  company: Company;
  onImportComplete?: (importedCount: number) => void;
}

const DEFAULT_JOB_TITLES = [
  'CMO',
  'Chief Marketing Officer',
  'VP Marketing',
  'Director of Marketing',
  'Marketing Manager',
  'Content Manager',
  'Content Marketing Manager',
  'Head of Content',
];

export const LeadDiscoveryDialog: React.FC<LeadDiscoveryDialogProps> = ({
  open,
  onClose,
  company,
  onImportComplete,
}) => {
  const { user } = useAuth();
  const [activeStep, setActiveStep] = useState(0);

  // Search configuration state
  const [jobTitlesInput, setJobTitlesInput] = useState('');
  const [jobTitles, setJobTitles] = useState<string[]>(DEFAULT_JOB_TITLES);

  // Search state
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<ApolloSearchPerson[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  // Import state
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // Cost tracking
  const [estimatedCredits, setEstimatedCredits] = useState(0);

  // Get Apollo API key from environment
  const apolloApiKey = process.env.REACT_APP_APOLLO_API_KEY;

  // Load saved job titles from user preferences when dialog opens
  useEffect(() => {
    async function loadPreferences() {
      if (open && user) {
        setActiveStep(0);
        setJobTitlesInput('');
        setSearchError(null);
        setSearchResults([]);
        setSelectedLeads(new Set());
        setImporting(false);
        setImportError(null);
        setImportSuccess(false);
        setImportedCount(0);
        setEstimatedCredits(0);

        // Load saved job titles from Firestore
        try {
          const preferences = await getUserPreferences(user.uid);
          if (preferences?.apolloJobTitles && preferences.apolloJobTitles.length > 0) {
            setJobTitles(preferences.apolloJobTitles);
          } else {
            setJobTitles(DEFAULT_JOB_TITLES);
          }
        } catch (error) {
          console.error('Error loading user preferences:', error);
          setJobTitles(DEFAULT_JOB_TITLES);
        }
      }
    }

    loadPreferences();
  }, [open, user]);

  // Extract domain from website URL
  const getCompanyDomain = (): string | undefined => {
    if (!company.website) return undefined;

    try {
      const url = company.website.startsWith('http')
        ? new URL(company.website)
        : new URL(`https://${company.website}`);
      return url.hostname.replace('www.', '');
    } catch {
      return company.website.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
    }
  };

  // Handle adding job title from input
  const handleAddJobTitle = async () => {
    const trimmed = jobTitlesInput.trim();
    if (trimmed && !jobTitles.includes(trimmed)) {
      const newJobTitles = [...jobTitles, trimmed];
      setJobTitles(newJobTitles);
      setJobTitlesInput('');

      // Save to Firestore
      if (user) {
        try {
          await updateApolloJobTitles(user.uid, newJobTitles);
        } catch (error) {
          console.error('Error saving job titles:', error);
        }
      }
    }
  };

  // Handle removing job title
  const handleRemoveJobTitle = async (title: string) => {
    const newJobTitles = jobTitles.filter(t => t !== title);
    setJobTitles(newJobTitles);

    // Save to Firestore
    if (user) {
      try {
        await updateApolloJobTitles(user.uid, newJobTitles);
      } catch (error) {
        console.error('Error saving job titles:', error);
      }
    }
  };

  // Handle search
  const handleSearch = async () => {
    if (!apolloApiKey) {
      setSearchError(
        'Apollo API key is not configured. Please set REACT_APP_APOLLO_API_KEY in your environment variables.'
      );
      return;
    }

    if (jobTitles.length === 0) {
      setSearchError('Please add at least one job title to search for.');
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const result = await apolloService.searchPeople(
        {
          companyName: company.name,
          jobTitles,
          pageSize: 50, // Get up to 50 results
        },
        apolloApiKey
      );

      if (!result.success) {
        setSearchError(result.error || 'Failed to search for leads');
        setSearchResults([]);
        return;
      }

      if (result.people.length === 0) {
        setSearchError(
          'No leads found matching your criteria. Try different job titles or check if the company name is correct.'
        );
        setSearchResults([]);
        return;
      }

      setSearchResults(result.people);
      setEstimatedCredits(result.costInfo?.credits || 0);
      setActiveStep(1); // Move to results step
    } catch (error) {
      console.error('Error searching for leads:', error);
      setSearchError(error instanceof Error ? error.message : 'An unexpected error occurred');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Handle select/deselect lead
  const handleToggleLead = (personId: string | undefined) => {
    if (!personId) return;

    const newSelected = new Set(selectedLeads);
    if (newSelected.has(personId)) {
      newSelected.delete(personId);
    } else {
      newSelected.add(personId);
    }
    setSelectedLeads(newSelected);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedLeads.size === searchResults.length) {
      setSelectedLeads(new Set());
    } else {
      const allIds = searchResults.map(p => p.id).filter((id): id is string => !!id);
      setSelectedLeads(new Set(allIds));
    }
  };

  // Handle import selected leads
  const handleImport = async () => {
    if (!user) {
      setImportError('User not authenticated');
      return;
    }

    if (selectedLeads.size === 0) {
      setImportError('Please select at least one lead to import');
      return;
    }

    setImporting(true);
    setImportError(null);

    try {
      // Filter selected leads
      const leadsToImport = searchResults.filter(p => p.id && selectedLeads.has(p.id));

      // Map Apollo people to LeadFormData
      const leadsData: LeadFormData[] = leadsToImport.map(person => ({
        name: person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim(),
        email: person.email || '',
        phone: person.phone || '',
        company: company.name,
        status: 'new_lead',
        customFields: {
          linkedinUrl: person.linkedinUrl || '',
          title: person.title || '',
          apolloId: person.id || '',
          city: person.city || '',
          state: person.state || '',
          country: person.country || '',
          importedFrom: 'apollo_discovery',
          importedAt: new Date().toISOString(),
        },
      }));

      // Create company ID map (all leads belong to the same company)
      const companyIdMap = new Map<string, string>();
      companyIdMap.set(company.name, company.id);

      // Import leads in batch
      await createLeadsBatch(leadsData, user.uid, companyIdMap);

      setImportedCount(leadsData.length);
      setImportSuccess(true);
      setActiveStep(2); // Move to success step

      // Notify parent component
      if (onImportComplete) {
        onImportComplete(leadsData.length);
      }

      // Auto-close after success
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Error importing leads:', error);
      setImportError(error instanceof Error ? error.message : 'Failed to import leads');
    } finally {
      setImporting(false);
    }
  };

  // Handle back to search
  const handleBackToSearch = () => {
    setActiveStep(0);
    setSearchError(null);
  };

  return (
    <Dialog
      open={open}
      onClose={!importing && !searching ? onClose : undefined}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
        }}
      >
        <Box>
          <Typography
            variant="h5"
            sx={{
              fontWeight: 700,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
            }}
          >
            Discover Leads with Apollo
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {company.name}
          </Typography>
        </Box>
        <IconButton
          onClick={onClose}
          disabled={importing || searching}
          sx={{
            color: '#667eea',
            '&:hover': {
              bgcolor: 'rgba(102, 126, 234, 0.08)',
            },
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Stepper */}
      <Box sx={{ px: 3, pb: 2 }}>
        <Stepper activeStep={activeStep}>
          <Step>
            <StepLabel>Configure Search</StepLabel>
          </Step>
          <Step>
            <StepLabel>Select Leads</StepLabel>
          </Step>
          <Step>
            <StepLabel>Import Complete</StepLabel>
          </Step>
        </Stepper>
      </Box>

      {/* Content */}
      <DialogContent sx={{ pt: 2 }}>
        {/* Step 0: Search Configuration */}
        {activeStep === 0 && (
          <Box>
            {searchError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {searchError}
              </Alert>
            )}

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Company Information
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Chip label={`Company: ${company.name}`} />
                {company.website && (
                  <Chip label={`Domain: ${getCompanyDomain()}`} />
                )}
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Job Titles to Search For
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                {jobTitles.map((title) => (
                  <Chip
                    key={title}
                    label={title}
                    onDelete={() => handleRemoveJobTitle(title)}
                    sx={{
                      bgcolor: 'rgba(102, 126, 234, 0.1)',
                      '& .MuiChip-deleteIcon': {
                        color: '#667eea',
                        '&:hover': {
                          color: '#5568d3',
                        },
                      },
                    }}
                  />
                ))}
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="Add custom job title (e.g., Social Media Manager)"
                  value={jobTitlesInput}
                  onChange={(e) => setJobTitlesInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddJobTitle();
                    }
                  }}
                />
                <Button
                  variant="outlined"
                  onClick={handleAddJobTitle}
                  disabled={!jobTitlesInput.trim()}
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
                  Add
                </Button>
              </Box>
            </Box>

            <Alert severity="info" sx={{ mt: 2 }}>
              Apollo will search for people at <strong>{company.name}</strong> with the specified job titles.
              This may use Apollo credits based on the number of results found.
            </Alert>
          </Box>
        )}

        {/* Step 1: Results Preview */}
        {activeStep === 1 && (
          <Box>
            {importError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {importError}
              </Alert>
            )}

            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Found {searchResults.length} leads • {selectedLeads.size} selected
                {estimatedCredits > 0 && ` • ~${estimatedCredits} Apollo credits`}
              </Typography>
              <Button
                size="small"
                onClick={handleSelectAll}
                sx={{
                  textTransform: 'none',
                  color: '#667eea',
                  fontWeight: 600,
                }}
              >
                {selectedLeads.size === searchResults.length ? 'Deselect All' : 'Select All'}
              </Button>
            </Box>

            <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell padding="checkbox">
                      <Checkbox
                        checked={selectedLeads.size === searchResults.length && searchResults.length > 0}
                        indeterminate={selectedLeads.size > 0 && selectedLeads.size < searchResults.length}
                        onChange={handleSelectAll}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>Phone</TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>LinkedIn</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {searchResults.map((person) => (
                    <TableRow
                      key={person.id}
                      hover
                      selected={person.id ? selectedLeads.has(person.id) : false}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={person.id ? selectedLeads.has(person.id) : false}
                          onChange={() => handleToggleLead(person.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {person.title || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {person.email || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {person.phone || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {person.linkedinUrl ? (
                          <Tooltip title="Open LinkedIn profile">
                            <IconButton
                              size="small"
                              href={person.linkedinUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ color: '#0077b5' }}
                            >
                              <OpenInNewIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}

        {/* Step 2: Import Success */}
        {activeStep === 2 && importSuccess && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon sx={{ fontSize: 64, color: '#10b981', mb: 2 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              Successfully Imported {importedCount} Leads!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The leads have been added to the CRM and are now visible in the Leads tab.
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* Actions */}
      <DialogActions sx={{ px: 3, pb: 3 }}>
        {activeStep === 0 && (
          <>
            <Button
              onClick={onClose}
              disabled={searching}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={searching ? <CircularProgress size={20} sx={{ color: 'white' }} /> : <SearchIcon />}
              onClick={handleSearch}
              disabled={searching || jobTitles.length === 0}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                },
              }}
            >
              {searching ? 'Searching...' : 'Search for Leads'}
            </Button>
          </>
        )}

        {activeStep === 1 && (
          <>
            <Button
              onClick={handleBackToSearch}
              disabled={importing}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={importing || selectedLeads.size === 0}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                },
              }}
            >
              {importing ? (
                <>
                  <CircularProgress size={20} sx={{ color: 'white', mr: 1 }} />
                  Importing...
                </>
              ) : (
                `Import ${selectedLeads.size} Lead${selectedLeads.size !== 1 ? 's' : ''}`
              )}
            </Button>
          </>
        )}

        {activeStep === 2 && (
          <Button
            variant="contained"
            onClick={onClose}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              fontWeight: 600,
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
