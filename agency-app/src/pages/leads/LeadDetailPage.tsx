// src/pages/leads/LeadDetailPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  Box,
  Button,
  TextField,
  Alert,
  CircularProgress,
  Grid,
  Typography,
  Tabs,
  Tab,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  Snackbar,
  Paper,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
  Save as SaveIcon,
  Email as EmailIcon,
  LinkedIn as LinkedInIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
  ContentCopy as CopyIcon,
  Check as CheckIcon,
  Reply as ReplyIcon,
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { Lead, LeadFormData, LeadStatusChange } from '../../types/lead';
import { getLead, updateLead, deleteLead, archiveLead, unarchiveLead } from '../../services/api/leads';
import { leadTimelineService } from '../../services/api/leadSubcollections';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '../../contexts/AuthContext';
import { usePipelineConfigContext } from '../../contexts/PipelineConfigContext';
import { fetchEmail } from '../../services/api/apolloService';
import { getCompany } from '../../services/api/companies';
import { getLeadNameForApollo, validateNameForApollo, splitFullName } from '../../utils/nameUtils';
import { NameConfirmationDialog } from '../../components/features/crm/NameConfirmationDialog';
import { Company } from '../../types/crm';
import { getSettings } from '../../services/api/settings';
import { OfferTemplateVersion } from '../../types/settings';
import { resolveTemplateVersion } from '../../services/api/templateVersionResolver';
import { TemplateVersionPickerDialog } from '../../components/features/crm/TemplateVersionPickerDialog';
import { replaceTemplateVariables } from '../../services/api/templateVariablesService';
import { SafeHtmlRenderer, copyHtmlToClipboard, stripHtmlTags } from '../../utils/htmlHelpers';
import { FieldDefinition } from '../../types/fieldDefinitions';
import { getFieldDefinitions } from '../../services/api/fieldDefinitionsService';
import { createGmailDraft, createFollowUpDraft, checkGmailConnection } from '../../services/api/gmailService';

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

export const LeadDetailPage: React.FC = () => {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const { stages, getLabel } = usePipelineConfigContext();

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Tab state - derive from URL search params
  const tabNames = ['details', 'outreach', 'offer', 'activity'];
  const tabParam = searchParams.get('tab') || 'details';
  const tabValue = Math.max(0, tabNames.indexOf(tabParam));

  // Activity state
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

  // Company state (for fetching offer)
  const [company, setCompany] = useState<Company | null>(null);

  // Field definitions state
  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>([]);

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
  const [connectionRequestStatus, setConnectionRequestStatus] = useState<'not_sent' | 'sent' | 'accepted' | 'rejected'>('not_sent');
  const [emailStatus, setEmailStatus] = useState<'not_sent' | 'sent' | 'opened' | 'replied' | 'bounced' | 'refused' | 'no_response'>('not_sent');

  // Offer template state (fetched from global settings)
  const [templateVersions, setTemplateVersions] = useState<OfferTemplateVersion[]>([]);
  const [followUpTemplate, setFollowUpTemplate] = useState<string>('');
  const [followUpSubject, setFollowUpSubject] = useState<string>('');

  // Copy state for offer preview
  const [headlineCopied, setHeadlineCopied] = useState(false);
  const [messageCopied, setMessageCopied] = useState(false);

  // Template version picker state
  const [versionPickerOpen, setVersionPickerOpen] = useState(false);
  const [versionPickerAction, setVersionPickerAction] = useState<'headline' | 'message' | 'draft' | null>(null);

  // Gmail draft creation state
  const [creatingDraft, setCreatingDraft] = useState(false);
  const [draftCreated, setDraftCreated] = useState(false);
  const [creatingFollowUp, setCreatingFollowUp] = useState(false);
  const [followUpCreated, setFollowUpCreated] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Snackbar state for notifications
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  // Load lead data
  useEffect(() => {
    const loadLead = async () => {
      if (!leadId) {
        navigate('/leads');
        return;
      }

      try {
        setLoading(true);
        const leadData = await getLead(leadId);

        if (!leadData) {
          setError('Lead not found');
          setTimeout(() => navigate('/leads'), 2000);
          return;
        }

        setLead(leadData);
        setFormData({
          name: leadData.name,
          email: leadData.email,
          company: leadData.company,
          phone: leadData.phone,
          status: leadData.status,
          customFields: leadData.customFields || {},
        });

        // Populate outreach fields
        if (leadData.outreach?.linkedIn) {
          setLinkedInStatus(leadData.outreach.linkedIn.status);
          setLinkedInProfileUrl(leadData.outreach.linkedIn.profileUrl || '');
          setConnectionRequestStatus(leadData.outreach.linkedIn.connectionRequest?.status || 'not_sent');
        } else {
          setLinkedInStatus('not_sent');
          setLinkedInProfileUrl('');
          setConnectionRequestStatus('not_sent');
        }

        if (leadData.outreach?.email) {
          setEmailStatus(leadData.outreach.email.status);
        } else {
          setEmailStatus('not_sent');
        }

        // Fetch company data if companyId exists
        if (leadData.companyId) {
          try {
            const companyData = await getCompany(leadData.companyId);
            if (companyData) {
              setCompany(companyData);
            }
          } catch (error) {
            console.error('Error fetching company:', error);
            // Don't fail the whole page if company fetch fails
          }
        }
      } catch (err) {
        console.error('Error loading lead:', err);
        setError('Failed to load lead');
      } finally {
        setLoading(false);
      }
    };

    loadLead();
  }, [leadId, navigate]);

  // Fetch activity/timeline
  useEffect(() => {
    const fetchActivity = async () => {
      if (lead && leadId) {
        setActivityLoading(true);
        try {
          const changes = await leadTimelineService.getStatusChanges(leadId);
          setStatusChanges(changes);
        } catch (error) {
          console.error('Error fetching activity:', error);
        } finally {
          setActivityLoading(false);
        }
      }
    };

    fetchActivity();
  }, [lead, leadId]);

  // Load global offer template from settings
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const settings = await getSettings();
        setTemplateVersions(settings.offerTemplateVersions || []);
        setFollowUpTemplate(settings.followUpTemplate || '');
        setFollowUpSubject(settings.followUpSubject || '');
      } catch (error) {
        console.error('Error loading offer template:', error);
      }
    };

    loadTemplate();
  }, []);

  // Fetch field definitions
  useEffect(() => {
    const fetchFields = async () => {
      try {
        const definitions = await getFieldDefinitions('lead');
        setFieldDefinitions(definitions);
      } catch (error) {
        console.error('Error fetching field definitions:', error);
      }
    };

    fetchFields();
  }, []);

  // Filter field definitions by section
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

  // Merge field definitions with actual custom field keys to show all fields (like table does)
  const allGeneralCustomFields = useMemo(() => {
    // Get field names from definitions
    const definedFieldNames = new Set(generalFields.map(def => def.name));

    // Get all custom field keys from formData, excluding linkedin/email prefixed fields
    const actualFieldNames = Object.keys(formData.customFields || {})
      .filter(key => !key.startsWith('linkedin_') && !key.startsWith('email_'));

    // Create entries for fields that exist in data but not in definitions
    const undefinedFields = actualFieldNames
      .filter(name => !definedFieldNames.has(name))
      .map(name => ({
        id: `auto_${name}`,
        name,
        label: name.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
        fieldType: 'text' as const,
        section: 'general' as const,
        entityType: 'lead' as const,
      }));

    // Combine defined fields and undefined fields
    return [...generalFields, ...undefinedFields];
  }, [generalFields, formData.customFields]);

  const handleChange = (field: keyof LeadFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError('');
  };

  // Helper function to detect if a custom field is a contact date field
  const isContactDateField = (fieldName: string): 'linkedin' | 'email' | null => {
    const lowerName = fieldName.toLowerCase();
    if (lowerName.startsWith('linkedin_') && lowerName.includes('date') && (lowerName.includes('contact') || lowerName.includes('sent'))) {
      return 'linkedin';
    }
    if (lowerName.startsWith('email_') && lowerName.includes('date') && (lowerName.includes('contact') || lowerName.includes('sent'))) {
      return 'email';
    }
    return null;
  };

  // Helper function to render custom field inputs
  const renderCustomField = (def: FieldDefinition) => {
    switch (def.fieldType) {
      case 'text':
        return (
          <TextField
            label={def.label}
            value={formData.customFields?.[def.name] || ''}
            onChange={(e) => handleCustomFieldChange(def.name, e.target.value)}
            fullWidth
            disabled={saving}
          />
        );
      case 'number':
        return (
          <TextField
            label={def.label}
            type="number"
            value={formData.customFields?.[def.name] || ''}
            onChange={(e) => handleCustomFieldChange(def.name, e.target.value)}
            fullWidth
            disabled={saving}
          />
        );
      case 'date':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={def.label}
              value={formData.customFields?.[def.name] ? new Date(formData.customFields[def.name]) : null}
              onChange={(date) => handleCustomFieldChange(def.name, date?.toISOString() || '')}
              disabled={saving}
              slotProps={{
                textField: {
                  fullWidth: true,
                },
              }}
            />
          </LocalizationProvider>
        );
      case 'dropdown':
        return (
          <TextField
            select
            label={def.label}
            value={formData.customFields?.[def.name] || ''}
            onChange={(e) => handleCustomFieldChange(def.name, e.target.value)}
            fullWidth
            disabled={saving}
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
        );
      default:
        return null;
    }
  };

  // Handler for custom field changes with auto-status detection
  const handleCustomFieldChange = (fieldName: string, value: string) => {
    // Update the custom field
    setFormData({
      ...formData,
      customFields: {
        ...formData.customFields,
        [fieldName]: value,
      },
    });

    // Auto-set status to 'sent' if this is a contact date field and it has a value
    if (value && value.trim()) {
      const contactType = isContactDateField(fieldName);

      if (contactType === 'linkedin' && linkedInStatus === 'not_sent') {
        setLinkedInStatus('sent');
        // Show user feedback
        setSnackbar({
          open: true,
          message: 'LinkedIn status automatically set to "Sent"',
          severity: 'success',
        });
      } else if (contactType === 'email' && emailStatus === 'not_sent') {
        setEmailStatus('sent');
        // Show user feedback
        setSnackbar({
          open: true,
          message: 'Email status automatically set to "Sent"',
          severity: 'success',
        });
      }
    }
  };

  const handleSave = async () => {
    if (!lead) return;

    setSaving(true);
    setError('');

    try {
      // Check if any contact date custom fields have values and auto-set status
      let finalLinkedInStatus = linkedInStatus;
      let finalEmailStatus = emailStatus;

      if (formData.customFields) {
        // Check LinkedIn contact date fields
        const hasLinkedInContactDate = Object.entries(formData.customFields).some(
          ([key, value]) => isContactDateField(key) === 'linkedin' && value && String(value).trim()
        );
        if (hasLinkedInContactDate && linkedInStatus === 'not_sent') {
          finalLinkedInStatus = 'sent';
        }

        // Check Email contact date fields
        const hasEmailContactDate = Object.entries(formData.customFields).some(
          ([key, value]) => isContactDateField(key) === 'email' && value && String(value).trim()
        );
        if (hasEmailContactDate && emailStatus === 'not_sent') {
          finalEmailStatus = 'sent';
        }
      }

      // Build outreach data
      const outreachData: any = {};

      // Add LinkedIn data if status is not 'not_sent' or if profileUrl is filled
      if (finalLinkedInStatus !== 'not_sent' || linkedInProfileUrl || connectionRequestStatus !== 'not_sent') {
        outreachData.linkedIn = {
          status: finalLinkedInStatus,
        };

        // Auto-set sentAt if status changed from 'not_sent' to something else
        const previousLinkedInStatus = lead?.outreach?.linkedIn?.status || 'not_sent';
        const previousSentAt = lead?.outreach?.linkedIn?.sentAt;

        if (finalLinkedInStatus !== 'not_sent') {
          // If there's already a sentAt, preserve it; otherwise set current date
          if (previousSentAt) {
            outreachData.linkedIn.sentAt = Timestamp.fromDate(previousSentAt instanceof Date ? previousSentAt : new Date(previousSentAt));
          } else if (previousLinkedInStatus === 'not_sent') {
            // Status just changed from 'not_sent', set current date
            outreachData.linkedIn.sentAt = Timestamp.now();
          }
        }

        if (linkedInProfileUrl?.trim()) {
          outreachData.linkedIn.profileUrl = linkedInProfileUrl.trim();
        }

        // Add connection request data if status is not 'not_sent'
        console.log('[DEBUG SAVE] Connection request status:', connectionRequestStatus);
        if (connectionRequestStatus !== 'not_sent') {
          const previousConnectionStatus = lead?.outreach?.linkedIn?.connectionRequest?.status || 'not_sent';
          const previousConnectionSentAt = lead?.outreach?.linkedIn?.connectionRequest?.sentAt;
          console.log('[DEBUG SAVE] Previous connection status:', previousConnectionStatus);
          console.log('[DEBUG SAVE] Previous connection sentAt:', previousConnectionSentAt);

          outreachData.linkedIn.connectionRequest = {
            status: connectionRequestStatus,
          };

          // Auto-set sentAt if status changed from 'not_sent' to 'sent'
          if (previousConnectionSentAt) {
            const timestampDate = Timestamp.fromDate(previousConnectionSentAt instanceof Date ? previousConnectionSentAt : new Date(previousConnectionSentAt));
            outreachData.linkedIn.connectionRequest.sentAt = timestampDate;
            console.log('[DEBUG SAVE] Preserving existing sentAt as Timestamp:', timestampDate);
          } else if (previousConnectionStatus === 'not_sent') {
            // Status just changed from 'not_sent', set current date
            const newTimestamp = Timestamp.now();
            outreachData.linkedIn.connectionRequest.sentAt = newTimestamp;
            console.log('[DEBUG SAVE] Setting NEW sentAt as Timestamp (status changed from not_sent):', newTimestamp.toDate());
          }
          console.log('[DEBUG SAVE] Final connectionRequest object:', outreachData.linkedIn.connectionRequest);
        }
      }

      // Add email data if status is not 'not_sent'
      if (finalEmailStatus !== 'not_sent') {
        outreachData.email = {
          status: finalEmailStatus,
        };

        // Auto-set sentAt if status changed from 'not_sent' to something else
        const previousEmailStatus = lead?.outreach?.email?.status || 'not_sent';
        const previousSentAt = lead?.outreach?.email?.sentAt;

        // If there's already a sentAt, preserve it; otherwise set current date
        if (previousSentAt) {
          outreachData.email.sentAt = Timestamp.fromDate(previousSentAt instanceof Date ? previousSentAt : new Date(previousSentAt));
        } else if (previousEmailStatus === 'not_sent') {
          // Status just changed from 'not_sent', set current date
          outreachData.email.sentAt = Timestamp.now();
        }
      }

      // Include outreach in form data (only if there's actual data)
      const dataToSave = {
        ...formData,
      };

      if (Object.keys(outreachData).length > 0) {
        dataToSave.outreach = outreachData;
      }

      console.log('[DEBUG SAVE] Complete outreachData being saved:', JSON.stringify(outreachData, null, 2));
      console.log('[DEBUG SAVE] Complete dataToSave:', JSON.stringify(dataToSave, null, 2));

      await updateLead(lead.id, dataToSave);
      console.log('[DEBUG SAVE] Lead updated successfully, ID:', lead.id);

      // Verify the save by fetching the lead again
      setTimeout(async () => {
        try {
          const verifyLead = await getLead(lead.id);
          if (verifyLead) {
            console.log('[DEBUG VERIFY] Lead after save:', {
              id: verifyLead.id,
              name: verifyLead.name,
              hasOutreach: !!verifyLead.outreach,
              hasLinkedIn: !!verifyLead.outreach?.linkedIn,
              linkedInStatus: verifyLead.outreach?.linkedIn?.status,
              hasConnectionRequest: !!verifyLead.outreach?.linkedIn?.connectionRequest,
              connectionRequestStatus: verifyLead.outreach?.linkedIn?.connectionRequest?.status,
              connectionRequestSentAt: verifyLead.outreach?.linkedIn?.connectionRequest?.sentAt,
            });
          } else {
            console.error('[DEBUG VERIFY] Lead not found after save');
          }
        } catch (e) {
          console.error('[DEBUG VERIFY] Failed to verify lead:', e);
        }
      }, 1000);

      // Update local state (including auto-set statuses)
      setLead({ ...lead, ...dataToSave });
      setLinkedInStatus(finalLinkedInStatus);
      setEmailStatus(finalEmailStatus);

      // Show success message
      setError('');
      const statusAutoSetMessages = [];
      if (finalLinkedInStatus !== linkedInStatus) {
        statusAutoSetMessages.push('LinkedIn status set to "Sent"');
      }
      if (finalEmailStatus !== emailStatus) {
        statusAutoSetMessages.push('Email status set to "Sent"');
      }

      const successMessage = statusAutoSetMessages.length > 0
        ? `Lead saved! ${statusAutoSetMessages.join(' and ')}`
        : 'Lead saved successfully!';

      setSnackbar({
        open: true,
        message: successMessage,
        severity: 'success',
      });
    } catch (err: any) {
      console.error('Error saving lead:', err);
      setError(err.message || 'Failed to save lead. Please try again.');
      setSnackbar({
        open: true,
        message: err.message || 'Failed to save lead. Please try again.',
        severity: 'error',
      });
    } finally {
      setSaving(false);
    }
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

  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!lead) return;

    setDeleting(true);
    try {
      await deleteLead(lead.id);
      navigate('/leads');
    } catch (error) {
      console.error('Error deleting lead:', error);
      setError('Failed to delete lead. Please try again.');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
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
      if (isArchived) {
        await unarchiveLead(lead.id);
      } else {
        if (!user) {
          alert('User not authenticated');
          return;
        }
        await archiveLead(lead.id, user.uid);
      }

      // Reload lead data
      const updatedLead = await getLead(lead.id);
      if (updatedLead) {
        setLead(updatedLead);
      }
    } catch (error) {
      console.error(`Error ${action}ing lead:`, error);
      alert(`Failed to ${action} lead. Please try again.`);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSearchParams({ tab: tabNames[newValue] });
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

  // Resolve which template version to use for the current company
  const getResolvedVersion = (): OfferTemplateVersion | null => {
    const result = resolveTemplateVersion(templateVersions, company?.labels);
    if ('conflict' in result) return null; // Needs picker
    return result.resolved.version;
  };

  const buildLeadData = () => ({
    name: formData.name,
    email: formData.email,
    phone: formData.phone,
    company: formData.company,
    companyName: formData.company,
    status: formData.status,
    customFields: formData.customFields,
    createdAt: lead?.createdAt,
    updatedAt: lead?.updatedAt,
    outreach: lead?.outreach,
  });

  // Handle version picker selection
  const handleVersionPickerSelect = async (version: OfferTemplateVersion) => {
    setVersionPickerOpen(false);
    const action = versionPickerAction;
    setVersionPickerAction(null);
    if (action === 'headline') await doCopyHeadline(version);
    else if (action === 'message') await doCopyMessage(version);
    else if (action === 'draft') await doCreateGmailDraft(version);
  };

  // Copy handlers for offer preview
  const handleCopyHeadline = async () => {
    const version = getResolvedVersion();
    if (!version) {
      setVersionPickerAction('headline');
      setVersionPickerOpen(true);
      return;
    }
    await doCopyHeadline(version);
  };

  const doCopyHeadline = async (version: OfferTemplateVersion) => {
    const leadData = buildLeadData();
    const headlineHtml = version.offerHeadline
      ? replaceTemplateVariables(version.offerHeadline, leadData, company)
      : '';

    if (headlineHtml) {
      try {
        await copyHtmlToClipboard(headlineHtml);
        setHeadlineCopied(true);
        setTimeout(() => setHeadlineCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy headline:', err);
      }
    }
  };

  const handleCopyMessage = async () => {
    const version = getResolvedVersion();
    if (!version) {
      setVersionPickerAction('message');
      setVersionPickerOpen(true);
      return;
    }
    await doCopyMessage(version);
  };

  const doCopyMessage = async (version: OfferTemplateVersion) => {
    const leadData = buildLeadData();
    const messageHtml = version.offerTemplate
      ? replaceTemplateVariables(version.offerTemplate, leadData, company)
      : '';

    if (messageHtml) {
      try {
        await copyHtmlToClipboard(messageHtml);
        setMessageCopied(true);
        setTimeout(() => setMessageCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy message:', err);
      }
    }
  };

  const handleCreateGmailDraft = async () => {
    if (!lead || !formData.email) {
      setSnackbar({
        open: true,
        message: 'Lead must have a valid email address',
        severity: 'error',
      });
      return;
    }

    const version = getResolvedVersion();
    if (!version) {
      setVersionPickerAction('draft');
      setVersionPickerOpen(true);
      return;
    }
    await doCreateGmailDraft(version);
  };

  const doCreateGmailDraft = async (version: OfferTemplateVersion) => {
    if (!lead || !formData.email) return;

    setCreatingDraft(true);

    try {
      const connectionStatus = await checkGmailConnection();
      if (!connectionStatus.connected || !connectionStatus.hasComposePermission) {
        setSnackbar({
          open: true,
          message: connectionStatus.message || 'Gmail not properly configured. Please reconnect Gmail in Settings.',
          severity: 'error',
        });
        setCreatingDraft(false);
        return;
      }

      const leadData = buildLeadData();
      const subjectHtml = version.offerHeadline
        ? replaceTemplateVariables(version.offerHeadline, leadData, company)
        : `Opportunity at ${formData.company}`;
      const subject = stripHtmlTags(subjectHtml);
      const bodyHtml = version.offerTemplate
        ? replaceTemplateVariables(version.offerTemplate, leadData, company)
        : '';

      if (!bodyHtml) {
        setSnackbar({
          open: true,
          message: 'No offer template configured. Please set up template in Settings.',
          severity: 'error',
        });
        setCreatingDraft(false);
        return;
      }

      const result = await createGmailDraft({
        leadId: lead.id,
        to: formData.email,
        subject,
        bodyHtml,
      });

      if (result.success) {
        setDraftCreated(true);
        setTimeout(() => setDraftCreated(false), 3000);

        // Refresh lead data
        const updatedLead = await getLead(lead.id);
        if (updatedLead) {
          setLead(updatedLead);
          setEmailStatus(updatedLead.outreach?.email?.status || 'not_sent');
        }

        setSnackbar({
          open: true,
          message: `Draft created successfully! Open in Gmail: ${result.draftUrl}`,
          severity: 'success',
        });
      }
    } catch (error: any) {
      console.error('Failed to create Gmail draft:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to create draft. Please try again.',
        severity: 'error',
      });
    } finally {
      setCreatingDraft(false);
    }
  };

  // Handle follow-up draft creation
  const handleCreateFollowUpDraft = async () => {
    if (!lead || !formData.email) {
      setSnackbar({ open: true, message: 'Lead must have a valid email address', severity: 'error' });
      return;
    }

    if (!followUpTemplate) {
      setSnackbar({ open: true, message: 'No follow-up template configured. Please set up the template in Settings > Follow-up Template.', severity: 'error' });
      return;
    }

    setCreatingFollowUp(true);

    try {
      const connectionStatus = await checkGmailConnection();
      if (!connectionStatus.connected || !connectionStatus.hasComposePermission) {
        setSnackbar({
          open: true,
          message: connectionStatus.message || 'Gmail not properly configured. Please reconnect Gmail in Settings.',
          severity: 'error',
        });
        setCreatingFollowUp(false);
        return;
      }

      const leadData = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        company: formData.company,
        companyName: formData.company,
        status: formData.status,
        customFields: formData.customFields,
        createdAt: lead?.createdAt,
        updatedAt: lead?.updatedAt,
        outreach: lead?.outreach,
      };

      const originalSubject = lead.outreach?.email?.originalSubject || `Opportunity at ${formData.company}`;

      let subject: string;
      if (followUpSubject) {
        const subjectHtml = replaceTemplateVariables(followUpSubject, leadData, company);
        subject = stripHtmlTags(subjectHtml);
      } else {
        subject = `Re: ${originalSubject}`;
      }

      const bodyHtml = replaceTemplateVariables(followUpTemplate, leadData, company);

      const result = await createFollowUpDraft({
        leadId: lead.id,
        to: formData.email,
        subject,
        bodyHtml,
        originalSubject,
      });

      if (result.success) {
        setFollowUpCreated(true);
        setTimeout(() => setFollowUpCreated(false), 3000);

        // Refresh lead data
        const updatedLead = await getLead(lead.id);
        if (updatedLead) {
          setLead(updatedLead);
        }

        const threadMsg = result.threadFound
          ? ' (threaded as reply)'
          : ' (new email - original thread not found)';

        setSnackbar({
          open: true,
          message: `Follow-up draft created${threadMsg}! Open in Gmail: ${result.draftUrl}`,
          severity: 'success',
        });
      }
    } catch (error: any) {
      console.error('Failed to create follow-up draft:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to create follow-up draft. Please try again.',
        severity: 'error',
      });
    } finally {
      setCreatingFollowUp(false);
    }
  };

  // Render offer preview with variables replaced (uses resolved version)
  const renderPreview = () => {
    const leadData = buildLeadData();
    const version = getResolvedVersion() || templateVersions[0];

    // Generate headline preview
    const headlineText = version?.offerHeadline
      ? replaceTemplateVariables(version.offerHeadline, leadData, company)
      : null;

    // Generate message preview
    const messageText = version?.offerTemplate
      ? replaceTemplateVariables(version.offerTemplate, leadData, company)
      : null;

    if (!headlineText && !messageText) {
      return <em style={{ color: '#94a3b8' }}>No template configured yet. Go to Settings to create one.</em>;
    }

    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {/* Headline Section */}
        {headlineText && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Offer Headline
              </Typography>
              <IconButton
                onClick={handleCopyHeadline}
                size="small"
                sx={{
                  color: headlineCopied ? '#10b981' : '#94a3b8',
                  '&:hover': {
                    color: headlineCopied ? '#10b981' : '#667eea',
                  },
                }}
              >
                {headlineCopied ? <CheckIcon /> : <CopyIcon />}
              </IconButton>
            </Box>
            <Box
              sx={{
                p: 2,
                bgcolor: 'white',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <SafeHtmlRenderer
                html={headlineText}
                sx={{
                  fontSize: '14px',
                  color: '#1e293b',
                }}
              />
            </Box>
          </Box>
        )}

        {/* Message Body Section */}
        {messageText && (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Message Body
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton
                  onClick={handleCopyMessage}
                  size="small"
                  sx={{
                    color: messageCopied ? '#10b981' : '#94a3b8',
                    '&:hover': {
                      color: messageCopied ? '#10b981' : '#667eea',
                    },
                  }}
                  title="Copy message"
                >
                  {messageCopied ? <CheckIcon /> : <CopyIcon />}
                </IconButton>
                <IconButton
                  onClick={handleCreateGmailDraft}
                  disabled={creatingDraft || !formData.email}
                  size="small"
                  sx={{
                    color: draftCreated ? '#10b981' : '#667eea',
                    bgcolor: draftCreated ? '#dcfce7' : 'rgba(102, 126, 234, 0.1)',
                    '&:hover': {
                      bgcolor: draftCreated ? '#bbf7d0' : 'rgba(102, 126, 234, 0.2)',
                    },
                    '&:disabled': {
                      opacity: 0.5,
                    },
                  }}
                  title="Create draft in Gmail"
                >
                  {creatingDraft ? (
                    <CircularProgress size={20} sx={{ color: '#667eea' }} />
                  ) : draftCreated ? (
                    <CheckIcon />
                  ) : (
                    <EmailIcon />
                  )}
                </IconButton>
                <IconButton
                  onClick={handleCreateFollowUpDraft}
                  disabled={
                    creatingFollowUp ||
                    !formData.email ||
                    lead?.outreach?.email?.status === 'replied' ||
                    lead?.outreach?.email?.followUpStatus === 'sent'
                  }
                  size="small"
                  sx={{
                    color: followUpCreated || lead?.outreach?.email?.followUpStatus === 'sent'
                      ? '#10b981'
                      : '#764ba2',
                    bgcolor: followUpCreated || lead?.outreach?.email?.followUpStatus === 'sent'
                      ? '#dcfce7'
                      : 'rgba(118, 75, 162, 0.1)',
                    '&:hover': {
                      bgcolor: followUpCreated || lead?.outreach?.email?.followUpStatus === 'sent'
                        ? '#bbf7d0'
                        : 'rgba(118, 75, 162, 0.2)',
                    },
                    '&:disabled': {
                      opacity: 0.5,
                    },
                  }}
                  title={
                    lead?.outreach?.email?.followUpStatus === 'sent'
                      ? 'Follow-up already sent'
                      : lead?.outreach?.email?.status === 'replied'
                        ? 'Lead already replied'
                        : 'Create follow-up draft in Gmail'
                  }
                >
                  {creatingFollowUp ? (
                    <CircularProgress size={20} sx={{ color: '#764ba2' }} />
                  ) : followUpCreated || lead?.outreach?.email?.followUpStatus === 'sent' ? (
                    <CheckIcon />
                  ) : (
                    <ReplyIcon />
                  )}
                </IconButton>
              </Box>
            </Box>
            <Box
              sx={{
                p: 2,
                bgcolor: 'white',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
              }}
            >
              <SafeHtmlRenderer
                html={messageText}
                sx={{
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: '#1e293b',
                }}
              />
            </Box>
          </Box>
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <CircularProgress size={48} sx={{ color: 'white' }} />
      </Box>
    );
  }

  if (!lead) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Typography variant="h6" sx={{ color: 'white' }}>
          Lead not found
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/leads')}
          sx={{
            background: 'white',
            color: '#667eea',
            '&:hover': {
              background: 'rgba(255, 255, 255, 0.9)',
            },
          }}
        >
          Back to Leads
        </Button>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 4,
      }}
    >
      {/* Main Content Card */}
      <Box
        sx={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <Box sx={{ p: 4, pb: 2 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/leads')}
            sx={{
              mb: 3,
              textTransform: 'none',
              color: '#667eea',
              fontWeight: 600,
              '&:hover': {
                bgcolor: 'rgba(102, 126, 234, 0.08)',
              },
            }}
          >
            Back to Leads
          </Button>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  color: 'transparent',
                  mb: 1,
                }}
              >
                {lead.name}
              </Typography>
              {lead.company && (
                <Typography variant="body2" color="text.secondary">
                  {lead.company}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                startIcon={<SaveIcon />}
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  textTransform: 'none',
                  fontWeight: 600,
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  },
                }}
              >
                {saving ? <CircularProgress size={24} sx={{ color: 'white' }} /> : 'Save'}
              </Button>
              <IconButton
                onClick={handleDelete}
                sx={{
                  color: '#ef4444',
                  '&:hover': {
                    bgcolor: 'rgba(239, 68, 68, 0.08)',
                  },
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Box>
          </Box>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 4 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Details" {...({ component: Link, to: `?tab=details` } as any)} />
            <Tab label="Outreach" {...({ component: Link, to: `?tab=outreach` } as any)} />
            <Tab label="Offer" {...({ component: Link, to: `?tab=offer` } as any)} />
            <Tab label="Activity" {...({ component: Link, to: `?tab=activity` } as any)} />
          </Tabs>
        </Box>

        {/* Tab Content */}
        <Box sx={{ p: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Details Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Name */}
              <TextField
                label="Name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                fullWidth
                disabled={saving}
              />

              {/* Email */}
              <Box>
                <TextField
                  label="Email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  fullWidth
                  disabled={saving}
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
                disabled={saving}
              />

              {/* Company */}
              <TextField
                label="Company"
                value={formData.company}
                onChange={(e) => handleChange('company', e.target.value)}
                required
                fullWidth
                disabled={saving}
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
                disabled={saving}
              >
                {stages.map((stage) => (
                  <MenuItem key={stage.id} value={stage.id}>
                    {stage.label}
                  </MenuItem>
                ))}
              </TextField>

              {/* Custom Fields Section - Show all custom fields (definitions + actual data) */}
              {allGeneralCustomFields.length > 0 && (
                <>
                  <Box sx={{ borderTop: '1px solid', borderColor: 'divider', pt: 2, mt: 1 }}>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 600,
                        color: '#667eea',
                        mb: 2,
                      }}
                    >
                      Custom Fields
                    </Typography>
                  </Box>

                  {allGeneralCustomFields.map(def => (
                    <Box key={def.id} sx={{ mb: 2 }}>
                      {def.fieldType === 'text' && (
                        <TextField
                          label={def.label}
                          value={formData.customFields?.[def.name] || ''}
                          onChange={(e) => handleCustomFieldChange(def.name, e.target.value)}
                          fullWidth
                          disabled={saving}
                        />
                      )}
                      {def.fieldType === 'number' && (
                        <TextField
                          label={def.label}
                          type="number"
                          value={formData.customFields?.[def.name] || ''}
                          onChange={(e) => handleCustomFieldChange(def.name, e.target.value)}
                          fullWidth
                          disabled={saving}
                        />
                      )}
                      {def.fieldType === 'date' && (
                        <LocalizationProvider dateAdapter={AdapterDateFns}>
                          <DatePicker
                            label={def.label}
                            value={formData.customFields?.[def.name] ? new Date(formData.customFields[def.name]) : null}
                            onChange={(date) => handleCustomFieldChange(def.name, date?.toISOString() || '')}
                            disabled={saving}
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
                          disabled={saving}
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
                </>
              )}

              {/* Time in Current State */}
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

              {/* Cumulative State Durations */}
              {lead.stateDurations && (
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

          {/* Outreach Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Info Note for CSV Imported Fields */}
              {((formData.customFields && Object.keys(formData.customFields).some(key => key.startsWith('linkedin_') || key.startsWith('email_'))) && (
                <Alert severity="info" sx={{ mb: 1 }}>
                  The fields shown below are based on the columns from your CSV import. You can edit these values or add new fields as needed.
                </Alert>
              ))}

              {/* Company Offer Section */}
              {company?.offer?.blogIdea && (
                <Paper
                  sx={{
                    p: 3,
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%)',
                    border: '1px solid rgba(102, 126, 234, 0.2)',
                    borderRadius: '12px',
                  }}
                >
                  <Typography
                    variant="subtitle2"
                    sx={{
                      fontWeight: 600,
                      color: '#667eea',
                      mb: 1,
                      textTransform: 'uppercase',
                      fontSize: '12px',
                      letterSpacing: '0.5px',
                    }}
                  >
                    Company Offer
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: '#1e293b',
                      mb: 0.5,
                    }}
                  >
                    Blog Idea
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: '#64748b',
                      lineHeight: 1.6,
                    }}
                  >
                    {company.offer.blogIdea}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      display: 'block',
                      mt: 2,
                      color: '#94a3b8',
                    }}
                  >
                    Last updated: {new Date(company.offer.updatedAt).toLocaleString()}
                  </Typography>
                </Paper>
              )}

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
                        disabled={saving}
                      >
                        <MenuItem value="">
                          <em>Clear / Not Set</em>
                        </MenuItem>
                        <Divider />
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
                      disabled={saving}
                    />
                  </Grid>

                  <Grid size={{ xs: 12 }}>
                    <FormControl fullWidth>
                      <InputLabel>Connection Request Status</InputLabel>
                      <Select
                        value={connectionRequestStatus}
                        onChange={(e) => setConnectionRequestStatus(e.target.value as any)}
                        label="Connection Request Status"
                        disabled={saving}
                      >
                        <MenuItem value="">
                          <em>Clear / Not Set</em>
                        </MenuItem>
                        <Divider />
                        <MenuItem value="not_sent">Not Sent</MenuItem>
                        <MenuItem value="sent">Sent</MenuItem>
                        <MenuItem value="accepted">Accepted</MenuItem>
                        <MenuItem value="rejected">Rejected</MenuItem>
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* LinkedIn Custom Fields from CSV Import */}
                  {formData.customFields && Object.entries(formData.customFields)
                    .filter(([key]) => key.startsWith('linkedin_'))
                    .map(([key, value]) => {
                      const fieldLabel = key
                        .replace('linkedin_', '')
                        .split('_')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');

                      return (
                        <Grid size={{ xs: 12 }} key={key}>
                          <TextField
                            fullWidth
                            label={fieldLabel}
                            value={value || ''}
                            onChange={(e) => handleCustomFieldChange(key, e.target.value)}
                            disabled={saving}
                          />
                        </Grid>
                      );
                    })}

                  {/* LinkedIn Custom Fields from Field Definitions */}
                  {linkedInFields.map(def => (
                    <Grid size={{ xs: 12 }} key={def.id}>
                      {renderCustomField(def)}
                    </Grid>
                  ))}
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
                        disabled={saving}
                      >
                        <MenuItem value="">
                          <em>Clear / Not Set</em>
                        </MenuItem>
                        <Divider />
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

                  {/* Email Custom Fields from CSV Import */}
                  {formData.customFields && Object.entries(formData.customFields)
                    .filter(([key]) => key.startsWith('email_'))
                    .map(([key, value]) => {
                      const fieldLabel = key
                        .replace('email_', '')
                        .split('_')
                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                        .join(' ');

                      return (
                        <Grid size={{ xs: 12 }} key={key}>
                          <TextField
                            fullWidth
                            label={fieldLabel}
                            value={value || ''}
                            onChange={(e) => handleCustomFieldChange(key, e.target.value)}
                            disabled={saving}
                          />
                        </Grid>
                      );
                    })}

                  {/* Email Custom Fields from Field Definitions */}
                  {emailFields.map(def => (
                    <Grid size={{ xs: 12 }} key={def.id}>
                      {renderCustomField(def)}
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </Box>
          </TabPanel>

          {/* Offer Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              {/* Info Alert */}
              <Alert
                severity="info"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    onClick={() => navigate('/settings/offer-template')}
                    sx={{ textTransform: 'none', fontWeight: 600 }}
                  >
                    Edit Template
                  </Button>
                }
              >
                This preview shows how the offer template will look for this lead. To edit the template or view available variables, go to Settings.
              </Alert>

              {/* Preview Section */}
              <Box>
                <Typography variant="h6" sx={{ mb: 3, color: '#1e293b', fontWeight: 600 }}>
                  LinkedIn Message Preview
                </Typography>
                {renderPreview()}
              </Box>
            </Box>
          </TabPanel>

          {/* Activity Tab */}
          <TabPanel value={tabValue} index={3}>
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

          {/* Archive/Delete Actions Row */}
          <Box sx={{ display: 'flex', gap: 1, mt: 3, pt: 3, borderTop: '1px solid', borderColor: 'divider' }}>
            <Button
              onClick={handleArchiveToggle}
              startIcon={lead.archived ? <UnarchiveIcon /> : <ArchiveIcon />}
              color="warning"
              disabled={saving}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              {lead.archived ? 'Unarchive' : 'Archive'}
            </Button>
            <Button
              onClick={handleDelete}
              startIcon={<DeleteIcon />}
              color="error"
              disabled={saving}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Delete
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => !deleting && setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Lead?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete <strong>{lead.name}</strong>?
            This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button
            onClick={() => setDeleteDialogOpen(false)}
            disabled={deleting}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Cancel
          </Button>
          <Button
            onClick={confirmDelete}
            disabled={deleting}
            variant="contained"
            color="error"
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            {deleting ? <CircularProgress size={24} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Name Confirmation Dialog */}
      <NameConfirmationDialog
        open={nameConfirmationOpen}
        onClose={handleNameConfirmationClose}
        onConfirm={handleNameConfirmed}
        suggestedFirstName={suggestedFirstName}
        suggestedLastName={suggestedLastName}
      />

      {/* Snackbar for success/error notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Template Version Picker Dialog */}
      <TemplateVersionPickerDialog
        open={versionPickerOpen}
        onClose={() => { setVersionPickerOpen(false); setVersionPickerAction(null); }}
        onSelect={handleVersionPickerSelect}
        matchingVersions={(() => {
          const result = resolveTemplateVersion(templateVersions, company?.labels);
          return 'conflict' in result ? result.conflict.matchingVersions : [];
        })()}
        companyName={formData.company || 'Unknown'}
        companyLabels={company?.labels || []}
        defaultVersion={templateVersions.find(v => v.isDefault)}
      />
    </Box>
  );
};

export default LeadDetailPage;
