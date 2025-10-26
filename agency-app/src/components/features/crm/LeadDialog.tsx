// src/components/features/crm/LeadDialog.tsx
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
} from '@mui/material';
import {
  Email as EmailIcon,
  LinkedIn as LinkedInIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Unarchive as UnarchiveIcon,
} from '@mui/icons-material';
import { Lead, LeadFormData, LeadStatusChange } from '../../../types/lead';
import { leadTimelineService } from '../../../services/api/leadSubcollections';
import { useAuth } from '../../../contexts/AuthContext';
import { usePipelineConfigContext } from '../../../contexts/PipelineConfigContext';
import { fetchEmail } from '../../../services/api/apolloService';

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

  // Initialize form data when lead changes or dialog opens/closes
  useEffect(() => {
    // Clear Apollo messages when switching leads or opening/closing dialog
    setApolloSuccess(null);
    setApolloError(null);

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
  }, [lead, mode, open]);

  // Fetch activity/timeline when in edit mode
  useEffect(() => {
    const fetchActivity = async () => {
      if (mode === 'edit' && lead && open) {
        setActivityLoading(true);
        try {
          const changes = await leadTimelineService.getStatusChanges(lead.id);
          setStatusChanges(changes);
        } catch (error) {
          console.error('Error fetching activity:', error);
        } finally {
          setActivityLoading(false);
        }
      }
    };

    fetchActivity();
  }, [mode, lead, open]);

  const handleChange = (field: keyof LeadFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

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
    if (!formData.name || !formData.company) {
      setApolloError('Name and Company are required to fetch email from Apollo.io');
      return;
    }

    // Parse name into first and last name
    const nameParts = formData.name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || nameParts[0]; // Fallback to first name if no last name

    if (!firstName) {
      setApolloError('Please provide a valid name');
      return;
    }

    setApolloLoading(true);

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
        setApolloError(result.error || 'No email found for this person');
      }
    } catch (error) {
      console.error('Error fetching email from Apollo:', error);
      setApolloError('Failed to fetch email. Please try again.');
    } finally {
      setApolloLoading(false);
    }
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
    </Dialog>
  );
};
