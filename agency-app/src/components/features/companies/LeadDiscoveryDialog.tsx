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
  FormControl,
  Select,
  MenuItem,
  ListSubheader,
} from '@mui/material';
import {
  Search as SearchIcon,
  Close as CloseIcon,
  CheckCircle as CheckCircleIcon,
  OpenInNew as OpenInNewIcon,
} from '@mui/icons-material';
import { Company } from '../../../types/crm';
import { ApolloSearchPerson } from '../../../types/apollo';
import { createLeadsBatch, subscribeToLeads } from '../../../services/api/leads';
import { LeadFormData } from '../../../types/lead';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserPreferences, updateApolloJobTitles } from '../../../services/api/userPreferences';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getLeadCustomFieldNames } from '../../../services/api/tableColumnsService';
import { incrementApolloCost } from '../../../services/api/userCostTracking';

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

// Standard lead fields available for mapping
const STANDARD_LEAD_FIELDS = [
  { value: 'name', label: 'Lead Name', section: 'general' },
  { value: 'email', label: 'Email', section: 'email' },
  { value: 'phone', label: 'Phone', section: 'general' },
  { value: 'rating', label: 'Rating', section: 'general' },
  { value: 'linkedin_profile_url', label: 'Profile URL (LinkedIn)', section: 'linkedin' },
  { value: 'linkedin_status', label: 'LinkedIn Status', section: 'linkedin' },
  { value: 'email_outreach_status', label: 'Email Outreach Status', section: 'email' },
];

// Smart mapping function to auto-detect best field mappings
const getSmartDefaultMapping = (apolloField: string, customFields: string[]): string => {
  // Direct mappings for standard fields
  if (apolloField === 'linkedinUrl') return 'linkedin_profile_url';
  if (apolloField === 'name') return 'name';
  if (apolloField === 'email') return 'email';

  // For job title, find "Lead job" field first, then fall back to other job-related fields
  if (apolloField === 'title') {
    // First priority: exact match for "Lead job" (case-insensitive)
    const leadJobField = customFields.find(f =>
      f.toLowerCase() === 'lead job' || f.toLowerCase() === 'leadjob'
    );
    if (leadJobField) return `customFields.${leadJobField}`;

    // Second priority: any field containing "lead" and "job"
    const leadJobVariant = customFields.find(f =>
      f.toLowerCase().includes('lead') && f.toLowerCase().includes('job')
    );
    if (leadJobVariant) return `customFields.${leadJobVariant}`;
  }

  return 'skip';
};

interface ApolloFieldMapping {
  apolloField: string;
  label: string;
  leadField: string | null; // 'name', 'email', 'phone', 'skip', or custom field name
  autoCreate?: boolean;
}

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

  // Field mapping state
  const [fieldMappings, setFieldMappings] = useState<ApolloFieldMapping[]>([
    { apolloField: 'name', label: 'Name', leadField: 'name' },
    { apolloField: 'email', label: 'Email', leadField: 'email' },
    { apolloField: 'title', label: 'Job Title', leadField: 'skip' },
    { apolloField: 'linkedinUrl', label: 'LinkedIn URL', leadField: 'skip' },
    { apolloField: 'city', label: 'City', leadField: 'skip' },
    { apolloField: 'state', label: 'State', leadField: 'skip' },
    { apolloField: 'country', label: 'Country', leadField: 'skip' },
  ]);

  // Enrichment state
  const [enriching, setEnriching] = useState(false);
  const [enrichError, setEnrichError] = useState<string | null>(null);
  const [enrichedData, setEnrichedData] = useState<ApolloSearchPerson[]>([]);

  // Import state
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importedCount, setImportedCount] = useState(0);

  // Cost tracking
  const [estimatedCredits, setEstimatedCredits] = useState(0);
  const [enrichmentCredits, setEnrichmentCredits] = useState(0);

  // Existing custom fields from leads database
  const [existingCustomFields, setExistingCustomFields] = useState<string[]>([]);

  // Load existing custom fields from leads database
  useEffect(() => {
    if (!open) return;

    const unsubscribe = subscribeToLeads((leads) => {
      const customFields = getLeadCustomFieldNames(leads);
      setExistingCustomFields(customFields);
    });

    return () => unsubscribe();
  }, [open]);

  // Update field mappings with smart defaults when custom fields are loaded
  useEffect(() => {
    if (existingCustomFields.length > 0) {
      setFieldMappings(prev => prev.map(mapping => ({
        ...mapping,
        leadField: getSmartDefaultMapping(mapping.apolloField, existingCustomFields),
      })));
    }
  }, [existingCustomFields]);

  // Load saved job titles from user preferences when dialog opens
  useEffect(() => {
    async function loadPreferences() {
      if (open && user) {
        setActiveStep(0);
        setJobTitlesInput('');
        setSearchError(null);
        setSearchResults([]);
        setSelectedLeads(new Set());
        setEnriching(false);
        setEnrichError(null);
        setEnrichedData([]);
        setEnrichmentCredits(0);
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
    if (jobTitles.length === 0) {
      setSearchError('Please add at least one job title to search for.');
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      // Call Firebase Cloud Function to search for people
      const functions = getFunctions();
      const searchPeople = httpsCallable<
        {
          companyName: string;
          jobTitles: string[];
          pageSize?: number;
        },
        {
          people: ApolloSearchPerson[];
          pagination: {
            currentPage: number;
            pageSize: number;
            totalResults: number;
            totalPages: number;
          };
          success: boolean;
          error?: string;
          costInfo?: {
            credits: number;
            model: string;
            timestamp: Date;
          };
        }
      >(functions, 'searchPeopleCloud');

      const result = await searchPeople({
        companyName: company.name,
        jobTitles,
        pageSize: 50, // Get up to 50 results
      });

      if (!result.data.success) {
        setSearchError(result.data.error || 'Failed to search for leads');
        setSearchResults([]);
        return;
      }

      if (result.data.people.length === 0) {
        setSearchError(
          'No leads found matching your criteria. Try different job titles or check if the company name is correct.'
        );
        setSearchResults([]);
        return;
      }

      setSearchResults(result.data.people);
      setEstimatedCredits(result.data.costInfo?.credits || 0);
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

  // Handle enrich selected leads
  const handleEnrich = async () => {
    if (selectedLeads.size === 0) {
      setEnrichError('Please select at least one lead to enrich');
      return;
    }

    // Move to enrichment step first to show loading
    setActiveStep(2);
    setEnriching(true);
    setEnrichError(null);

    try {
      // Get selected people with full details for enrichment
      const selectedPeople = searchResults.filter(p => p.id && selectedLeads.has(p.id));

      // Build people array with details needed for bulk_match API
      // IMPORTANT: Include Apollo person ID for accurate matching
      const peopleDetails = selectedPeople.map(p => ({
        id: p.id,  // Apollo person ID from search - required for matching
        first_name: p.firstName || (p.name ? p.name.split(' ')[0] : ''),
        last_name: p.lastName || (p.name ? p.name.split(' ').slice(1).join(' ') : ''),
        organization_name: company.name,
        linkedin_url: p.linkedinUrl || undefined,
      }));

      console.log('Enriching people with details:', peopleDetails);

      // Call bulk enrichment function
      const functions = getFunctions();
      const bulkEnrich = httpsCallable<
        { people: typeof peopleDetails },
        {
          people: ApolloSearchPerson[];
          success: boolean;
          error?: string;
          costInfo?: {
            credits: number;
            service: string;
            timestamp: Date;
          };
        }
      >(functions, 'apolloBulkEnrichPeople');

      const result = await bulkEnrich({ people: peopleDetails });
      console.log('Enrichment result:', result.data);

      if (!result.data.success) {
        const errorMsg = result.data.error || 'Failed to enrich leads';
        console.error('Enrichment failed:', errorMsg);
        setEnrichError(errorMsg);
        // Go back to select step on error
        setActiveStep(1);
        return;
      }

      // If no people returned but success is true, show that info
      if (!result.data.people || result.data.people.length === 0) {
        console.warn('No enriched data returned');
        setEnrichError('No contact information could be found for the selected leads. They may not have verified email addresses in Apollo.');
        setActiveStep(1);
        return;
      }

      setEnrichedData(result.data.people);
      setEnrichmentCredits(result.data.costInfo?.credits || 0);
      console.log('Enriched data set:', result.data.people.length, 'people');
      // Stay on enrichment step (step 2) to show results
    } catch (error: unknown) {
      console.error('Error enriching leads:', error);
      // Extract more detailed error message
      let errorMessage = 'An error occurred while enriching';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      // Check for Firebase function errors
      if (typeof error === 'object' && error !== null && 'code' in error) {
        const firebaseError = error as { code: string; message: string; details?: string };
        errorMessage = firebaseError.details || firebaseError.message || errorMessage;
      }
      setEnrichError(errorMessage);
      // Go back to select step on error
      setActiveStep(1);
    } finally {
      setEnriching(false);
    }
  };

  // Handle import selected leads
  const handleImport = async () => {
    if (!user) {
      setImportError('User not authenticated');
      return;
    }

    if (enrichedData.length === 0) {
      setImportError('No enriched leads to import');
      return;
    }

    setImporting(true);
    setImportError(null);

    try {
      // Use enriched data for import
      const leadsToImport = enrichedData;

      // Map Apollo people to LeadFormData using field mappings
      const leadsData: LeadFormData[] = leadsToImport.map(person => {
        // Helper to check if email is a placeholder (not unlocked)
        const isValidEmail = (email: string | undefined): boolean => {
          if (!email) return false;
          // Check for Apollo's placeholder pattern: email_not_unlocked@domain.com
          if (email.includes('email_not_unlocked@')) return false;
          return true;
        };

        // Helper to get Apollo field value
        const getFieldValue = (field: string): string => {
          switch (field) {
            case 'name':
              return person.name || `${person.firstName || ''} ${person.lastName || ''}`.trim();
            case 'email':
              return isValidEmail(person.email || undefined) ? person.email! : '';
            case 'phone':
              return person.phone || '';
            case 'title':
              return person.title || '';
            case 'linkedinUrl':
              return person.linkedinUrl || '';
            case 'city':
              return person.city || '';
            case 'state':
              return person.state || '';
            case 'country':
              return person.country || '';
            default:
              return '';
          }
        };

        // Build lead data based on mappings
        const leadData: LeadFormData = {
          name: '',
          email: '',
          phone: '',
          company: company.name,
          status: 'new_lead',
          customFields: {
            importedFrom: 'apollo_discovery',
            importedAt: new Date().toISOString(),
          },
        };

        // Apply field mappings
        fieldMappings.forEach(mapping => {
          const value = getFieldValue(mapping.apolloField);

          if (!value || mapping.leadField === 'skip' || mapping.leadField === null) {
            return; // Skip empty values and unmapped fields
          }

          // Map to standard field
          if (mapping.leadField === 'name') {
            leadData.name = value;
          } else if (mapping.leadField === 'email') {
            leadData.email = value;
          } else if (mapping.leadField === 'phone') {
            leadData.phone = value;
          } else if (mapping.leadField === 'linkedin_profile_url') {
            // Map to outreach.linkedIn.profileUrl
            leadData.outreach = {
              ...leadData.outreach,
              linkedIn: {
                ...leadData.outreach?.linkedIn,
                status: leadData.outreach?.linkedIn?.status || 'not_sent',
                profileUrl: value,
              },
            };
          } else if (mapping.leadField === 'linkedin_status') {
            // Map to outreach.linkedIn.status
            leadData.outreach = {
              ...leadData.outreach,
              linkedIn: {
                ...leadData.outreach?.linkedIn,
                status: (value as any) || 'not_sent',
                profileUrl: leadData.outreach?.linkedIn?.profileUrl,
              },
            };
          } else if (mapping.leadField === 'email_outreach_status') {
            // Map to outreach.email.status
            leadData.outreach = {
              ...leadData.outreach,
              email: {
                ...leadData.outreach?.email,
                status: (value as any) || 'not_sent',
              },
            };
          } else if (mapping.leadField === 'rating') {
            // Rating would need to be handled separately if needed
            leadData.customFields!['rating'] = value;
          } else if (mapping.autoCreate) {
            // Map to custom field (user chose to create custom field)
            leadData.customFields![mapping.apolloField] = value;
          } else if (mapping.leadField?.startsWith('customFields.')) {
            // Map to existing custom field
            const fieldName = mapping.leadField.replace('customFields.', '');
            leadData.customFields![fieldName] = value;
          }
        });

        return leadData;
      });

      // Create company ID map (all leads belong to the same company)
      const companyIdMap = new Map<string, string>();
      companyIdMap.set(company.name, company.id);

      // Import leads in batch
      await createLeadsBatch(leadsData, user.uid, companyIdMap);

      // Track Apollo credits used (1 credit per person with revealed email)
      const creditsUsed = leadsToImport.filter(person => {
        const email = person.email || '';
        return email && !email.includes('email_not_unlocked@');
      }).length;

      if (creditsUsed > 0) {
        await incrementApolloCost(user.uid, {
          credits: creditsUsed,
          category: 'peopleSearch',
        });
      }

      setImportedCount(leadsData.length);
      setImportSuccess(true);
      setActiveStep(4); // Move to success step (now step 4)

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
            <StepLabel>Enrich Leads</StepLabel>
          </Step>
          <Step>
            <StepLabel>Configure Import</StepLabel>
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {searchResults.map((person) => (
                    <TableRow
                      key={person.id}
                      hover
                      selected={person.id ? selectedLeads.has(person.id) : false}
                      onClick={() => handleToggleLead(person.id)}
                      sx={{ cursor: 'pointer' }}
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Info about next step */}
            {selectedLeads.size > 0 && (
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  <strong>Next step:</strong> Enrich {selectedLeads.size} selected lead{selectedLeads.size !== 1 ? 's' : ''} to reveal emails and LinkedIn profiles.
                </Typography>
              </Alert>
            )}
          </Box>
        )}

        {/* Step 2: Enrich Leads */}
        {activeStep === 2 && (
          <Box>
            {enrichError && (
              <Alert severity="error" sx={{ mb: 3 }}>
                {enrichError}
              </Alert>
            )}

            {enriching ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress sx={{ mb: 2, color: '#667eea' }} />
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Enriching {selectedLeads.size} leads...
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  Revealing emails and LinkedIn profiles
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                  This may take a few seconds
                </Typography>
              </Box>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle2">
                    Enriched {enrichedData.length} leads • Ready to configure import
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Chip
                      size="small"
                      label={`${enrichedData.filter(p => p.email).length} emails found`}
                      sx={{ bgcolor: '#e0f2fe', color: '#0369a1' }}
                    />
                    <Chip
                      size="small"
                      label={`${enrichedData.filter(p => p.linkedinUrl).length} LinkedIn found`}
                      sx={{ bgcolor: '#e0e7ff', color: '#4338ca' }}
                    />
                  </Box>
                </Box>

                <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>LinkedIn</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {enrichedData.map((person, index) => (
                        <TableRow key={person.id || index}>
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
                            <Typography variant="body2" sx={{ color: person.email ? '#059669' : '#94a3b8' }}>
                              {person.email || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {person.linkedinUrl ? (
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Typography
                                  variant="body2"
                                  component="a"
                                  href={person.linkedinUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  sx={{
                                    color: '#0077b5',
                                    textDecoration: 'none',
                                    '&:hover': { textDecoration: 'underline' },
                                    maxWidth: 180,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {person.linkedinUrl.replace('https://www.linkedin.com/in/', '').replace(/\/$/, '')}
                                </Typography>
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
                              </Box>
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

                {enrichmentCredits > 0 && (
                  <Alert severity="success" sx={{ mt: 2 }}>
                    <Typography variant="body2">
                      Enrichment complete! Used approximately {enrichmentCredits} Apollo credits.
                    </Typography>
                  </Alert>
                )}
              </Box>
            )}
          </Box>
        )}

        {/* Step 3: Field Mapping */}
        {activeStep === 3 && (
          <Box>
            <Alert severity="info" sx={{ mb: 3 }}>
              Map Apollo fields to your lead fields. Choose "Skip" to ignore fields, or select "Create Custom Field" to save as custom data.
            </Alert>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {enrichedData.length} enriched lead{enrichedData.length !== 1 ? 's' : ''} ready to import
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {fieldMappings.map((mapping) => (
                <Box
                  key={mapping.apolloField}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    p: 2,
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    bgcolor: '#f8fafc',
                  }}
                >
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                      {mapping.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Apollo field: {mapping.apolloField}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      →
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 200 }}>
                      <Select
                        value={mapping.leadField || 'skip'}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFieldMappings(prev =>
                            prev.map(m =>
                              m.apolloField === mapping.apolloField
                                ? {
                                    ...m,
                                    leadField: value === 'skip' ? 'skip' : value,
                                    autoCreate: value === 'create_custom',
                                  }
                                : m
                            )
                          );
                        }}
                      >
                        <MenuItem value="skip">Skip (Don't Import)</MenuItem>

                        {/* Standard Lead Fields - General */}
                        <ListSubheader sx={{ bgcolor: '#f8fafc', fontWeight: 600, color: '#475569' }}>
                          General Fields
                        </ListSubheader>
                        {STANDARD_LEAD_FIELDS.filter(f => f.section === 'general').map(field => (
                          <MenuItem key={field.value} value={field.value}>
                            {field.label}
                          </MenuItem>
                        ))}

                        {/* Standard Lead Fields - LinkedIn */}
                        <ListSubheader sx={{ bgcolor: '#f8fafc', fontWeight: 600, color: '#475569' }}>
                          LinkedIn Fields
                        </ListSubheader>
                        {STANDARD_LEAD_FIELDS.filter(f => f.section === 'linkedin').map(field => (
                          <MenuItem key={field.value} value={field.value}>
                            {field.label}
                          </MenuItem>
                        ))}

                        {/* Standard Lead Fields - Email */}
                        <ListSubheader sx={{ bgcolor: '#f8fafc', fontWeight: 600, color: '#475569' }}>
                          Email Fields
                        </ListSubheader>
                        {STANDARD_LEAD_FIELDS.filter(f => f.section === 'email').map(field => (
                          <MenuItem key={field.value} value={field.value}>
                            {field.label}
                          </MenuItem>
                        ))}

                        {/* Existing custom fields */}
                        {existingCustomFields.length > 0 && (
                          <ListSubheader sx={{ bgcolor: '#f8fafc', fontWeight: 600, color: '#475569' }}>
                            Custom Fields
                          </ListSubheader>
                        )}
                        {existingCustomFields.map((fieldName) => (
                          <MenuItem key={fieldName} value={`customFields.${fieldName}`}>
                            {fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' ')}
                          </MenuItem>
                        ))}

                        <ListSubheader sx={{ bgcolor: '#f8fafc', fontWeight: 600, color: '#475569' }}>
                          Create New
                        </ListSubheader>
                        <MenuItem value="create_custom">Create Custom Field "{mapping.apolloField}"</MenuItem>
                      </Select>
                    </FormControl>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {/* Step 4: Import Success */}
        {activeStep === 4 && importSuccess && (
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
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleEnrich}
              disabled={selectedLeads.size === 0}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                },
              }}
            >
              Next: Enrich Leads ({selectedLeads.size})
            </Button>
          </>
        )}

        {activeStep === 2 && !enriching && (
          <>
            <Button
              onClick={() => setActiveStep(1)}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={() => setActiveStep(3)}
              disabled={enrichedData.length === 0}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                textTransform: 'none',
                fontWeight: 600,
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                },
              }}
            >
              Next: Configure Import ({enrichedData.length})
            </Button>
          </>
        )}

        {activeStep === 3 && (
          <>
            <Button
              onClick={() => setActiveStep(2)}
              disabled={importing}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Back
            </Button>
            <Button
              variant="contained"
              onClick={handleImport}
              disabled={importing}
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
                `Import ${enrichedData.length} Lead${enrichedData.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </>
        )}

        {activeStep === 4 && (
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
