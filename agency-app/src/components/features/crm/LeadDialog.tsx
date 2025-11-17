// src/components/features/crm/LeadDialog.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  MenuItem,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  Chip,
  CircularProgress,
  InputAdornment,
  Alert,
  Divider,
  FormControl,
  InputLabel,
  Select,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  Email as EmailIcon,
  LinkedIn as LinkedInIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Lead, LeadFormData, LeadStatusChange } from '../../../types/lead';
import { leadTimelineService } from '../../../services/api/leadSubcollections';
import { useAuth } from '../../../contexts/AuthContext';
import { usePipelineConfigContext } from '../../../contexts/PipelineConfigContext';
import { fetchEmail } from '../../../services/api/apolloService';
import { FieldDefinition } from '../../../types/fieldDefinitions';
import { getFieldDefinitions } from '../../../services/api/fieldDefinitionsService';
import { getLeadNameForApollo, validateNameForApollo, splitFullName } from '../../../utils/nameUtils';
import { NameConfirmationDialog } from './NameConfirmationDialog';

interface LeadDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (leadData: LeadFormData) => Promise<void>;
  onDelete?: (leadId: string) => Promise<void>;
  onArchive?: (leadId: string) => Promise<void>;
  onUnarchive?: (leadId: string) => Promise<void>;
  lead?: Lead; // If provided, edit mode; otherwise, create mode
  mode: 'create' | 'edit';
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`lead-tabpanel-${index}`}
      aria-labelledby={`lead-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 2 }}>{children}</Box>}
    </div>
  );
}

export const LeadDialog: React.FC<LeadDialogProps> = ({
  open,
  onClose,
  onSave,
  onDelete,
  onArchive,
  onUnarchive,
  lead,
  mode,
}) => {
  const { stages, getLabel } = usePipelineConfigContext();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activityLoading, setActivityLoading] = useState(false);
  const [statusChanges, setStatusChanges] = useState<LeadStatusChange[]>([]);

  // Apollo email enrichment state
  const [apolloLoading, setApolloLoading] = useState(false);
  const [apolloError, setApolloError] = useState<string | null>(null);
  const [apolloSuccess, setApolloSuccess] = useState<string | null>(null);

  // Name confirmation dialog state
  const [nameConfirmationOpen, setNameConfirmationOpen] = useState(false);
  const [suggestedFirstName, setSuggestedFirstName] = useState('');
  const [suggestedLastName, setSuggestedLastName] = useState('');

  // Field definitions for custom fields
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  // Form state
  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    email: '',
    company: '',
    phone: '',
    status: 'new_lead',
    customFields: {},
  });

  // Outreach tracking state
  const [linkedInStatus, setLinkedInStatus] = useState<'not_sent' | 'sent' | 'opened' | 'replied' | 'refused' | 'no_response'>('not_sent');
  const [linkedInProfileUrl, setLinkedInProfileUrl] = useState('');

  const [emailStatus, setEmailStatus] = useState<'not_sent' | 'sent' | 'opened' | 'replied' | 'bounced' | 'refused' | 'no_response'>('not_sent');

  // Initialize form data when lead changes or dialog opens
  // Split into two effects to avoid unnecessary re-runs
  useEffect(() => {
    if (!open) return;

    // Clear Apollo messages when opening dialog
    setApolloSuccess(null);
    setApolloError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (lead && mode === 'edit') {
      setFormData({
        name: lead.name,
        email: lead.email,
        company: lead.company,
        phone: lead.phone,
        status: lead.status,
        customFields: lead.customFields || {},
      });

      // Populate outreach fields
      if (lead.outreach?.linkedIn) {
        setLinkedInStatus(lead.outreach.linkedIn.status);
        setLinkedInProfileUrl(lead.outreach.linkedIn.profileUrl || '');
      } else {
        setLinkedInStatus('not_sent');
        setLinkedInProfileUrl('');
      }

      if (lead.outreach?.email) {
        setEmailStatus(lead.outreach.email.status);
      } else {
        setEmailStatus('not_sent');
      }
    } else {
      // Reset for create mode
      setFormData({
        name: '',
        email: '',
        company: '',
        phone: '',
        status: 'new_lead',
        customFields: {},
      });
      setLinkedInStatus('not_sent');
      setLinkedInProfileUrl('');
      setEmailStatus('not_sent');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead?.id, mode, open]); // Only re-run when lead ID changes, not on every lead update

  // Fetch activity/timeline when in edit mode
  useEffect(() => {
    if (mode !== 'edit' || !lead || !open) return;

    const fetchActivity = async () => {
      setActivityLoading(true);
      try {
        const changes = await leadTimelineService.getStatusChanges(lead.id);
        setStatusChanges(changes);
      } catch (error) {
        console.error('Error fetching activity:', error);
      } finally {
        setActivityLoading(false);
      }
    };

    fetchActivity();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, lead?.id, open]); // Only re-run when lead ID changes

  // Fetch field definitions when dialog opens
  useEffect(() => {
    const fetchFields = async () => {
      if (open) {
        setLoadingFields(true);
        try {
          const definitions = await getFieldDefinitions('lead');
          setFieldDefinitions(definitions);
        } catch (error) {
          console.error('Error fetching field definitions:', error);
        } finally {
          setLoadingFields(false);
        }
      }
    };

    fetchFields();
  }, [open]);

  const handleChange = useCallback((field: keyof LeadFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, []);

  const handleCustomFieldChange = useCallback((fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldName]: value,
      },
    }));
  }, []);

  // Memoize filtered field definitions to avoid recalculating on every render
  const generalFields = useMemo(() =>
    fieldDefinitions.filter(def => def.section === 'general'),
    [fieldDefinitions]
  );

  const linkedInFields = useMemo(() =>
    fieldDefinitions.filter(def => def.section === 'linkedin'),
    [fieldDefinitions]
  );

  const emailFields = useMemo(() =>
    fieldDefinitions.filter(def => def.section === 'email'),
    [fieldDefinitions]
  );

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // Build outreach data
      const outreachData: any = {};

      // Add LinkedIn data if status is not 'not_sent' or if profileUrl is filled
      if (linkedInStatus !== 'not_sent' || linkedInProfileUrl) {
        outreachData.linkedIn = {
          status: linkedInStatus,
        };

        // Auto-set sentAt if status changed from 'not_sent' to something else
        const previousLinkedInStatus = lead?.outreach?.linkedIn?.status || 'not_sent';
        const previousSentAt = lead?.outreach?.linkedIn?.sentAt;

        if (linkedInStatus !== 'not_sent') {
          // If there's already a sentAt, preserve it; otherwise set current date
          if (previousSentAt) {
            outreachData.linkedIn.sentAt = previousSentAt;
          } else if (previousLinkedInStatus === 'not_sent') {
            // Status just changed from 'not_sent', set current date
            outreachData.linkedIn.sentAt = new Date();
          }
        }

        if (linkedInProfileUrl?.trim()) {
          outreachData.linkedIn.profileUrl = linkedInProfileUrl.trim();
        }
      }

      // Add email data if status is not 'not_sent'
      if (emailStatus !== 'not_sent') {
        outreachData.email = {
          status: emailStatus,
        };

        // Auto-set sentAt if status changed from 'not_sent' to something else
        const previousEmailStatus = lead?.outreach?.email?.status || 'not_sent';
        const previousSentAt = lead?.outreach?.email?.sentAt;

        // If there's already a sentAt, preserve it; otherwise set current date
        if (previousSentAt) {
          outreachData.email.sentAt = previousSentAt;
        } else if (previousEmailStatus === 'not_sent') {
          // Status just changed from 'not_sent', set current date
          outreachData.email.sentAt = new Date();
        }
      }

      // Include outreach in form data (only if there's actual data)
      const dataToSave = {
        ...formData,
      };

      if (Object.keys(outreachData).length > 0) {
        dataToSave.outreach = outreachData;
      }

      await onSave(dataToSave);
      onClose();
    } catch (error) {
      console.error('Error saving lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Handle Apollo email enrichment
  const handleFetchEmail = async () => {
    // Clear previous messages
    setApolloError(null);
    setApolloSuccess(null);

    // Validate required fields
    if (!formData.company) {
      setApolloError('Company is required to fetch email from Apollo.io');
      return;
    }

    // Check for full name and show confirmation dialog
    const { firstName, lastName, needsConfirmation, missingFields } = getLeadNameForApollo(formData);

    if (needsConfirmation) {
      // Full name detected, show confirmation dialog
      const { firstName: suggestedFirst, lastName: suggestedLast } = splitFullName(firstName);
      setSuggestedFirstName(suggestedFirst);
      setSuggestedLastName(suggestedLast);
      setNameConfirmationOpen(true);
      return;
    }

    // Validate name fields
    if (missingFields.length > 0) {
      const missingFieldsText = missingFields.join(' and ');
      const tip = missingFields.includes('last name')
        ? ` Tip: Add a 'last name' custom field to your leads via CSV import or lead details.`
        : '';
      setApolloError(`Apollo enrichment requires both first and last name. Missing: ${missingFieldsText}.${tip}`);
      return;
    }

    // Perform enrichment
    await performApolloEnrichment(firstName, lastName);
  };

  // Perform the actual Apollo enrichment
  const performApolloEnrichment = async (firstName: string, lastName: string) => {
    setApolloLoading(true);
    setApolloError(null);
    setApolloSuccess(null);

    try {
      // Call Cloud Function (no API key needed - it's stored securely on the server)
      const result = await fetchEmail({
        firstName,
        lastName,
        companyName: formData.company,
      });

      if (result.matched && result.email) {
        // Update email field with fetched email
        setFormData((prev) => ({
          ...prev,
          email: result.email || '',
          phone: result.phone || prev.phone, // Also update phone if available
        }));
        setApolloSuccess(`Email found: ${result.email} (1 credit used)`);
      } else {
        // Categorize errors for better display
        if (result.error?.includes('Invalid Apollo API key')) {
          setApolloError('Authentication error: Invalid Apollo API key. Please contact support.');
        } else if (result.error?.includes('No match found')) {
          setApolloError('No match found. Try adding a LinkedIn URL or verifying the company name for better results.');
        } else {
          setApolloError(result.error || 'No email found for this person');
        }
      }
    } catch (error) {
      console.error('Error fetching email from Apollo:', error);
      setApolloError('Failed to fetch email. Please try again.');
    } finally {
      setApolloLoading(false);
    }
  };

  // Handle name confirmation dialog close
  const handleNameConfirmationClose = () => {
    setNameConfirmationOpen(false);
    setSuggestedFirstName('');
    setSuggestedLastName('');
  };

  // Handle name confirmed from dialog
  const handleNameConfirmed = async (firstName: string, lastName: string) => {
    setNameConfirmationOpen(false);
    await performApolloEnrichment(firstName, lastName);
  };

  const handleDelete = async () => {
    if (!lead || !onDelete) return;

    const confirmMessage = `Are you sure you want to delete "${lead.name}"? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      await onDelete(lead.id);
      onClose();
    } catch (error) {
      console.error('Error deleting lead:', error);
    }
  };

  const handleArchiveToggle = async () => {
    if (!lead) return;

    const isArchived = lead.archived;
    const action = isArchived ? 'unarchive' : 'archive';
    const confirmMessage = isArchived
      ? `Unarchive "${lead.name}"? This lead will be restored to the active pipeline.`
      : `Archive "${lead.name}"? This lead will be removed from the active pipeline.`;

    if (!window.confirm(confirmMessage)) return;

    try {
      if (isArchived && onUnarchive) {
        await onUnarchive(lead.id);
      } else if (!isArchived && onArchive) {
        await onArchive(lead.id);
      }
      onClose();
    } catch (error) {
      console.error(`Error ${action}ing lead:`, error);
      alert(`Failed to ${action} lead. Please try again.`);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {mode === 'create' ? 'Add New Lead' : `Edit Lead: ${lead?.name}`}
      </DialogTitle>

      <DialogContent>
        {mode === 'edit' && (
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs value={tabValue} onChange={handleTabChange}>
              <Tab label="Details" />
              <Tab label="Outreach" />
              <Tab label="Activity" />
            </Tabs>
          </Box>
        )}

        {/* Details Tab */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* General Information Section */}
            <Accordion defaultExpanded>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '16px' }}>
                  General Information
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Name */}
                  <TextField
                    label="Name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                    fullWidth
                  />

                  {/* Email */}
                  <Box>
                    <TextField
                      label="Email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      fullWidth
                      InputProps={{
                        endAdornment: formData.email ? (
                          <InputAdornment position="end">
                            <EmailIcon color="action" />
                          </InputAdornment>
                        ) : undefined,
                      }}
                    />

                    {/* Apollo Email Fetch Button - Only show when email is empty */}
                    {!formData.email && (
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={handleFetchEmail}
                        disabled={apolloLoading || !formData.name || !formData.company}
                        startIcon={apolloLoading ? <CircularProgress size={16} /> : <EmailIcon />}
                        sx={{
                          mt: 1,
                          textTransform: 'none',
                          borderColor: '#2196f3',
                          color: '#2196f3',
                          '&:hover': {
                            borderColor: '#1976d2',
                            bgcolor: 'rgba(33, 150, 243, 0.04)',
                          },
                        }}
                      >
                        {apolloLoading ? 'Fetching...' : 'Get email from Apollo.io (costs 1 credit)'}
                      </Button>
                    )}

                    {/* Success/Error Messages */}
                    {apolloSuccess && (
                      <Alert severity="success" sx={{ mt: 1 }} onClose={() => setApolloSuccess(null)}>
                        {apolloSuccess}
                      </Alert>
                    )}
                    {apolloError && (
                      <Alert severity="error" sx={{ mt: 1 }} onClose={() => setApolloError(null)}>
                        {apolloError}
                      </Alert>
                    )}
                  </Box>

                  {/* Phone */}
                  <TextField
                    label="Phone"
                    value={formData.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    fullWidth
                  />

                  {/* Company */}
                  <TextField
                    label="Company"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    required
                    fullWidth
                    helperText="Will be auto-created if it doesn't exist"
                  />

                  {/* Status */}
                  <TextField
                    select
                    label="Status"
                    value={formData.status}
                    onChange={(e) => handleChange('status', e.target.value as any)}
                    required
                    fullWidth
                  >
                    {stages.map((stage) => (
                      <MenuItem key={stage.id} value={stage.id}>
                        {stage.label}
                      </MenuItem>
                    ))}
                  </TextField>

                  {/* General Custom Fields */}
                  {generalFields.map(def => (
                      <Box key={def.id}>
                        {def.fieldType === 'text' && (
                          <TextField
                            label={def.label}
                            value={formData.customFields?.[def.name] || ''}
                            onChange={(e) => handleCustomFieldChange(def.name, e.target.value)}
                            fullWidth
                          />
                        )}
                        {def.fieldType === 'number' && (
                          <TextField
                            label={def.label}
                            type="number"
                            value={formData.customFields?.[def.name] || ''}
                            onChange={(e) => handleCustomFieldChange(def.name, e.target.value)}
                            fullWidth
                          />
                        )}
                        {def.fieldType === 'date' && (
                          <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                              label={def.label}
                              value={formData.customFields?.[def.name] ? new Date(formData.customFields[def.name]) : null}
                              onChange={(date) => handleCustomFieldChange(def.name, date?.toISOString())}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                },
                              }}
                            />
                          </LocalizationProvider>
                        )}
                        {def.fieldType === 'dropdown' && (
                          <TextField
                            select
                            label={def.label}
                            value={formData.customFields?.[def.name] || ''}
                            onChange={(e) => handleCustomFieldChange(def.name, e.target.value)}
                            fullWidth
                          >
                            <MenuItem value="">
                              <em>None</em>
                            </MenuItem>
                            {def.options?.map(option => (
                              <MenuItem key={option} value={option}>
                                {option}
                              </MenuItem>
                            ))}
                          </TextField>
                        )}
                      </Box>
                    ))}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* LinkedIn Outreach Section */}
            <Accordion defaultExpanded={mode === 'create'}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinkedInIcon sx={{ color: '#0077b5' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '16px' }}>
                    LinkedIn Outreach
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* LinkedIn Profile URL */}
                  <TextField
                    label="LinkedIn Profile URL"
                    value={linkedInProfileUrl}
                    onChange={(e) => setLinkedInProfileUrl(e.target.value)}
                    placeholder="https://linkedin.com/in/..."
                    fullWidth
                  />

                  {/* LinkedIn Status */}
                  <FormControl fullWidth>
                    <InputLabel>LinkedIn Status</InputLabel>
                    <Select
                      value={linkedInStatus}
                      onChange={(e) => setLinkedInStatus(e.target.value as any)}
                      label="LinkedIn Status"
                    >
                      <MenuItem value="not_sent">Not Sent</MenuItem>
                      <MenuItem value="sent">Sent</MenuItem>
                      <MenuItem value="opened">Opened</MenuItem>
                      <MenuItem value="replied">Replied</MenuItem>
                      <MenuItem value="refused">Refused</MenuItem>
                      <MenuItem value="no_response">No Response</MenuItem>
                    </Select>
                  </FormControl>

                  {/* LinkedIn Custom Fields */}
                  {linkedInFields.map(def => (
                      <Box key={def.id}>
                        {def.fieldType === 'text' && (
                          <TextField
                            label={def.label}
                            value={formData.customFields?.[def.name] || ''}
                            onChange={(e) => handleCustomFieldChange(def.name, e.target.value)}
                            fullWidth
                          />
                        )}
                        {def.fieldType === 'number' && (
                          <TextField
                            label={def.label}
                            type="number"
                            value={formData.customFields?.[def.name] || ''}
                            onChange={(e) => handleCustomFieldChange(def.name, e.target.value)}
                            fullWidth
                          />
                        )}
                        {def.fieldType === 'date' && (
                          <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                              label={def.label}
                              value={formData.customFields?.[def.name] ? new Date(formData.customFields[def.name]) : null}
                              onChange={(date) => handleCustomFieldChange(def.name, date?.toISOString())}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                },
                              }}
                            />
                          </LocalizationProvider>
                        )}
                        {def.fieldType === 'dropdown' && (
                          <TextField
                            select
                            label={def.label}
                            value={formData.customFields?.[def.name] || ''}
                            onChange={(e) => handleCustomFieldChange(def.name, e.target.value)}
                            fullWidth
                          >
                            <MenuItem value="">
                              <em>None</em>
                            </MenuItem>
                            {def.options?.map(option => (
                              <MenuItem key={option} value={option}>
                                {option}
                              </MenuItem>
                            ))}
                          </TextField>
                        )}
                      </Box>
                    ))}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Email Outreach Section */}
            <Accordion defaultExpanded={mode === 'create'}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EmailIcon sx={{ color: '#ea4335' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '16px' }}>
                    Email Outreach
                  </Typography>
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Email Outreach Status */}
                  <FormControl fullWidth>
                    <InputLabel>Email Outreach Status</InputLabel>
                    <Select
                      value={emailStatus}
                      onChange={(e) => setEmailStatus(e.target.value as any)}
                      label="Email Outreach Status"
                    >
                      <MenuItem value="not_sent">Not Sent</MenuItem>
                      <MenuItem value="sent">Sent</MenuItem>
                      <MenuItem value="opened">Opened</MenuItem>
                      <MenuItem value="replied">Replied</MenuItem>
                      <MenuItem value="bounced">Bounced</MenuItem>
                      <MenuItem value="refused">Refused</MenuItem>
                      <MenuItem value="no_response">No Response</MenuItem>
                    </Select>
                  </FormControl>

                  {/* Email Custom Fields */}
                  {emailFields.map(def => (
                      <Box key={def.id}>
                        {def.fieldType === 'text' && (
                          <TextField
                            label={def.label}
                            value={formData.customFields?.[def.name] || ''}
                            onChange={(e) => handleCustomFieldChange(def.name, e.target.value)}
                            fullWidth
                          />
                        )}
                        {def.fieldType === 'number' && (
                          <TextField
                            label={def.label}
                            type="number"
                            value={formData.customFields?.[def.name] || ''}
                            onChange={(e) => handleCustomFieldChange(def.name, e.target.value)}
                            fullWidth
                          />
                        )}
                        {def.fieldType === 'date' && (
                          <LocalizationProvider dateAdapter={AdapterDateFns}>
                            <DatePicker
                              label={def.label}
                              value={formData.customFields?.[def.name] ? new Date(formData.customFields[def.name]) : null}
                              onChange={(date) => handleCustomFieldChange(def.name, date?.toISOString())}
                              slotProps={{
                                textField: {
                                  fullWidth: true,
                                },
                              }}
                            />
                          </LocalizationProvider>
                        )}
                        {def.fieldType === 'dropdown' && (
                          <TextField
                            select
                            label={def.label}
                            value={formData.customFields?.[def.name] || ''}
                            onChange={(e) => handleCustomFieldChange(def.name, e.target.value)}
                            fullWidth
                          >
                            <MenuItem value="">
                              <em>None</em>
                            </MenuItem>
                            {def.options?.map(option => (
                              <MenuItem key={option} value={option}>
                                {option}
                              </MenuItem>
                            ))}
                          </TextField>
                        )}
                      </Box>
                    ))}
                </Box>
              </AccordionDetails>
            </Accordion>

            {/* Time in Current State (Edit mode only) */}
            {mode === 'edit' && lead && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Time in Current State
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {lead.stateHistory && lead.stateHistory[lead.status]
                    ? (() => {
                        const entryDate = new Date(lead.stateHistory[lead.status]!);
                        const now = new Date();
                        const diffTime = Math.abs(now.getTime() - entryDate.getTime());
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        return diffDays === 0
                          ? 'Just entered'
                          : diffDays === 1
                          ? '1 day'
                          : `${diffDays} days`;
                      })()
                    : 'No data'}
                </Typography>
              </Box>
            )}

            {/* Cumulative State Durations (Edit mode only) */}
            {mode === 'edit' && lead && lead.stateDurations && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: 'background.paper',
                  borderRadius: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography variant="subtitle2" gutterBottom>
                  Cumulative Time by Stage
                </Typography>
                {Object.entries(lead.stateDurations).map(([status, days]) => (
                  <Box
                    key={status}
                    sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      {getLabel(status as any)}:
                    </Typography>
                    <Typography variant="body2" fontWeight={500}>
                      {days} {days === 1 ? 'day' : 'days'}
                    </Typography>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        </TabPanel>

        {/* Outreach Tab (Edit mode only) */}
        {mode === 'edit' && (
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* LinkedIn Outreach Section */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LinkedInIcon sx={{ color: '#0077b5' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px' }}>
                    LinkedIn Outreach
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={linkedInStatus}
                        onChange={(e) => setLinkedInStatus(e.target.value as any)}
                        label="Status"
                      >
                        <MenuItem value="not_sent">Not Sent</MenuItem>
                        <MenuItem value="sent">Sent</MenuItem>
                        <MenuItem value="opened">Opened</MenuItem>
                        <MenuItem value="replied">Replied</MenuItem>
                        <MenuItem value="refused">Refused</MenuItem>
                        <MenuItem value="no_response">No Response</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <TextField
                      fullWidth
                      label="LinkedIn Profile URL"
                      value={linkedInProfileUrl}
                      onChange={(e) => setLinkedInProfileUrl(e.target.value)}
                      placeholder="https://linkedin.com/in/..."
                    />
                  </Grid>
                </Grid>
              </Box>

              <Divider />

              {/* Email Outreach Section */}
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <EmailIcon sx={{ color: '#ea4335' }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '18px' }}>
                    Email Outreach
                  </Typography>
                </Box>

                <Grid container spacing={2}>
                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Status</InputLabel>
                      <Select
                        value={emailStatus}
                        onChange={(e) => setEmailStatus(e.target.value as any)}
                        label="Status"
                      >
                        <MenuItem value="not_sent">Not Sent</MenuItem>
                        <MenuItem value="sent">Sent</MenuItem>
                        <MenuItem value="opened">Opened</MenuItem>
                        <MenuItem value="replied">Replied</MenuItem>
                        <MenuItem value="bounced">Bounced</MenuItem>
                        <MenuItem value="refused">Refused</MenuItem>
                        <MenuItem value="no_response">No Response</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </TabPanel>
        )}

        {/* Activity Tab (Edit mode only) */}
        {mode === 'edit' && (
          <TabPanel value={tabValue} index={2}>
            {activityLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            ) : statusChanges.length === 0 ? (
              <Typography color="text.secondary" align="center" sx={{ py: 4 }}>
                No activity yet
              </Typography>
            ) : (
              <List>
                {statusChanges.map((change) => (
                  <ListItem
                    key={change.id}
                    sx={{
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      borderLeft: '2px solid',
                      borderColor: 'primary.main',
                      pl: 2,
                      mb: 2,
                    }}
                  >
                    <Box sx={{ display: 'flex', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                      {change.fromStatus ? (
                        <>
                          <Chip
                            label={getLabel(change.fromStatus as any)}
                            size="small"
                            variant="outlined"
                          />
                          <Typography variant="body2" sx={{ alignSelf: 'center' }}>
                            →
                          </Typography>
                        </>
                      ) : (
                        <Chip label="Created" size="small" color="success" />
                      )}
                      <Chip
                        label={getLabel(change.toStatus as any)}
                        size="small"
                        color="primary"
                      />
                    </Box>

                    <ListItemText
                      primary={
                        <Typography variant="caption" color="text.secondary">
                          {formatDate(change.changedAt)}
                          {change.changedBy && ` • Changed by user ${change.changedBy}`}
                        </Typography>
                      }
                      secondary={change.notes}
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </TabPanel>
        )}
      </DialogContent>

      <DialogActions sx={{ justifyContent: 'space-between', px: 3, pb: 2 }}>
        {/* Archive/Unarchive and Delete buttons (left side, edit mode only) */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          {mode === 'edit' && lead && (onArchive || onUnarchive) && (
            <Button
              onClick={handleArchiveToggle}
              startIcon={lead.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
              color="warning"
              disabled={loading}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {lead.archived ? 'Unarchive' : 'Archive'}
            </Button>
          )}
          {mode === 'edit' && onDelete && lead && (
            <Button
              onClick={handleDelete}
              startIcon={<DeleteIcon />}
              color="error"
              disabled={loading}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Delete
            </Button>
          )}
        </Box>
        {mode === 'create' && <Box />}

        {/* Cancel and Save buttons (right side) */}
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={
              loading ||
              !formData.name ||
              !formData.company
            }
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)',
              },
            }}
          >
            {loading ? <CircularProgress size={24} /> : mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </Box>
      </DialogActions>

      {/* Name Confirmation Dialog */}
      <NameConfirmationDialog
        open={nameConfirmationOpen}
        onClose={handleNameConfirmationClose}
        onConfirm={handleNameConfirmed}
        suggestedFirstName={suggestedFirstName}
        suggestedLastName={suggestedLastName}
      />
    </Dialog>
  );
};
