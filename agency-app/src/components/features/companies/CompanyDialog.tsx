// src/components/features/companies/CompanyDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Alert,
  CircularProgress,
  Grid,
  Typography,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from '@mui/material';
import {
  LinkedIn as LinkedInIcon,
  Email as EmailIcon,
} from '@mui/icons-material';
import { Company, CompanyFormData } from '../../../types/crm';
import { createCompany, updateCompany, getCompanies } from '../../../services/api/companies';
import { subscribeToCompanyLeads, subscribeToCompanyLeadsByName } from '../../../services/api/leads';
import { Lead } from '../../../types/lead';

interface CompanyDialogProps {
  open: boolean;
  onClose: () => void;
  company?: Company | null; // If provided, edit mode; otherwise, create mode
  onSuccess?: () => void;
}

export const CompanyDialog: React.FC<CompanyDialogProps> = ({
  open,
  onClose,
  company,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    website: '',
    industry: '',
    description: '',
    customFields: {},
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');

  // Tab state
  const [tabValue, setTabValue] = useState(0);

  // Leads state
  const [companyLeads, setCompanyLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  const isEditMode = Boolean(company);

  // Populate form when company prop changes
  useEffect(() => {
    if (company && open) {
      setFormData({
        name: company.name || '',
        website: company.website || '',
        industry: company.industry || '',
        description: company.description || '',
        customFields: company.customFields || {},
      });
    } else if (!open) {
      // Reset form when dialog closes
      setFormData({
        name: '',
        website: '',
        industry: '',
        description: '',
        customFields: {},
      });
      setError('');
      setDuplicateWarning('');
      setTabValue(0); // Reset to first tab
      setCompanyLeads([]); // Clear leads
    }
  }, [company, open]);

  // Subscribe to company leads when in edit mode
  // Try by companyId first, fallback to company name for legacy leads
  useEffect(() => {
    if (!company || !open || !isEditMode) return;

    setLeadsLoading(true);

    // First, try querying by companyId
    const unsubscribeById = subscribeToCompanyLeads(company.id, (leadsById) => {
      if (leadsById.length > 0) {
        // Found leads with companyId
        setCompanyLeads(leadsById);
        setLeadsLoading(false);
      } else {
        // No leads found by ID, try fallback query by company name
        // (for legacy leads that don't have companyId)
        const unsubscribeByName = subscribeToCompanyLeadsByName(company.name, (leadsByName) => {
          setCompanyLeads(leadsByName);
          setLeadsLoading(false);
        });

        // Return cleanup for both subscriptions
        return () => {
          unsubscribeById();
          unsubscribeByName();
        };
      }
    });

    return () => {
      unsubscribeById();
    };
  }, [company, open, isEditMode]);

  const handleChange = (field: keyof CompanyFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
    setDuplicateWarning('');
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setError('Company name is required');
      return false;
    }

    // Validate website URL if provided
    if (formData.website && formData.website.trim()) {
      try {
        // Check if it's a valid URL format
        const url = formData.website.startsWith('http')
          ? formData.website
          : `https://${formData.website}`;
        new URL(url);
      } catch {
        setError('Please enter a valid website URL (e.g., example.com or https://example.com)');
        return false;
      }
    }

    return true;
  };

  const checkDuplicateName = async (): Promise<boolean> => {
    try {
      const allCompanies = await getCompanies();
      const normalizedName = formData.name.trim().toLowerCase();

      const duplicate = allCompanies.find(c =>
        c.name.toLowerCase() === normalizedName &&
        c.id !== company?.id // Exclude current company in edit mode
      );

      if (duplicate) {
        setDuplicateWarning(
          `A company named "${duplicate.name}" already exists. Do you want to continue anyway?`
        );
        return true;
      }

      return false;
    } catch (err) {
      console.error('Error checking for duplicate:', err);
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // Check for duplicates (only show warning, don't block)
    if (!duplicateWarning) {
      const hasDuplicate = await checkDuplicateName();
      if (hasDuplicate) {
        return; // Show warning first, user needs to submit again to confirm
      }
    }

    setLoading(true);
    setError('');

    try {
      // Normalize website URL
      let normalizedWebsite = formData.website?.trim();
      if (normalizedWebsite && !normalizedWebsite.startsWith('http')) {
        normalizedWebsite = `https://${normalizedWebsite}`;
      }

      const companyData: any = {
        name: formData.name.trim(),
        customFields: formData.customFields || {},
      };

      // Only add fields if they have values (Firestore doesn't allow undefined)
      if (normalizedWebsite) {
        companyData.website = normalizedWebsite;
      }
      if (formData.industry?.trim()) {
        companyData.industry = formData.industry.trim();
      }
      if (formData.description?.trim()) {
        companyData.description = formData.description.trim();
      }

      if (isEditMode && company) {
        console.log('📝 [COMPANY DIALOG] Updating existing company:', {
          id: company.id,
          name: companyData.name,
          timestamp: new Date().toISOString(),
        });
        await updateCompany(company.id, companyData);
        console.log('✅ [COMPANY DIALOG] Company updated successfully');
      } else {
        await createCompany(companyData);
      }

      onSuccess?.();
      onClose();
    } catch (err: any) {
      console.error('Error saving company:', err);
      setError(err.message || 'Failed to save company. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Render outreach status badge
  const renderOutreachStatus = (
    status: string | undefined,
    type: 'linkedin' | 'email'
  ) => {
    if (!status || status === 'not_sent') {
      return (
        <Chip
          size="small"
          label="Not Sent"
          sx={{
            bgcolor: '#e5e7eb',
            color: '#6b7280',
            fontSize: '12px',
            height: '24px',
          }}
        />
      );
    }

    const statusConfig: Record<string, { label: string; color: string }> = {
      sent: { label: 'Sent', color: '#3b82f6' },
      opened: { label: 'Opened', color: '#9333ea' },
      replied: { label: 'Replied', color: '#10b981' },
      refused: { label: 'Refused', color: '#ef4444' },
      bounced: { label: 'Bounced', color: '#ef4444' },
      no_response: { label: 'No Response', color: '#f59e0b' },
    };

    const config = statusConfig[status] || { label: status, color: '#6b7280' };

    return (
      <Chip
        size="small"
        label={config.label}
        icon={
          type === 'linkedin' ? (
            <LinkedInIcon sx={{ fontSize: 14, color: 'white' }} />
          ) : (
            <EmailIcon sx={{ fontSize: 14, color: 'white' }} />
          )
        }
        sx={{
          bgcolor: config.color,
          color: 'white',
          fontSize: '12px',
          height: '24px',
          '& .MuiChip-icon': {
            color: 'white',
            marginLeft: '4px',
          },
        }}
      />
    );
  };

  // Format date
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        }
      }}
    >
      <DialogTitle sx={{
        fontWeight: 700,
        fontSize: '24px',
        pb: 1,
      }}>
        {isEditMode ? `Edit Company: ${company?.name}` : 'Add New Company'}
      </DialogTitle>

      {/* Tabs (only show in edit mode) */}
      {isEditMode && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', px: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Details" />
            <Tab label={`Leads (${companyLeads.length})`} />
          </Tabs>
        </Box>
      )}

      <form onSubmit={handleSubmit}>
        <DialogContent>
          {/* Details Tab */}
          {(!isEditMode || tabValue === 0) && (
            <Box sx={{ pt: 1 }}>
              {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                  {error}
                </Alert>
              )}

              {duplicateWarning && (
                <Alert severity="warning" sx={{ mb: 3 }}>
                  {duplicateWarning}
                </Alert>
              )}

              <Grid container spacing={3}>
              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  required
                  label="Company Name"
                  value={formData.name}
                  onChange={handleChange('name')}
                  disabled={loading}
                  placeholder="e.g., Acme Corporation"
                  autoFocus
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Website"
                  value={formData.website}
                  onChange={handleChange('website')}
                  disabled={loading}
                  placeholder="e.g., acme.com or https://acme.com"
                  helperText="Optional - Enter domain name or full URL"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Industry"
                  value={formData.industry}
                  onChange={handleChange('industry')}
                  disabled={loading}
                  placeholder="e.g., Technology, Healthcare, Finance"
                  helperText="Optional - Business sector or category"
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  label="Description"
                  value={formData.description}
                  onChange={handleChange('description')}
                  disabled={loading}
                  placeholder="Optional notes about this company..."
                  helperText="Optional - Any additional information"
                />
              </Grid>
            </Grid>
            </Box>
          )}

          {/* Leads Tab */}
          {isEditMode && tabValue === 1 && (
            <Box sx={{ pt: 2 }}>
              {leadsLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : companyLeads.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    No leads found for this company
                  </Typography>
                </Box>
              ) : (
                <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
                  <Table stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Email</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>LinkedIn Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Email Status</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {companyLeads.map((lead) => (
                        <TableRow key={lead.id} hover>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {lead.name}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {lead.email || '-'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            {renderOutreachStatus(
                              lead.outreach?.linkedIn?.status,
                              'linkedin'
                            )}
                          </TableCell>
                          <TableCell>
                            {renderOutreachStatus(
                              lead.outreach?.email?.status,
                              'email'
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(lead.createdAt)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 3, pt: 2 }}>
          <Button
            onClick={handleClose}
            disabled={loading}
            sx={{
              textTransform: 'none',
              fontWeight: 600,
            }}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              fontWeight: 600,
              px: 3,
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              },
            }}
          >
            {loading ? (
              <CircularProgress size={24} sx={{ color: 'white' }} />
            ) : (
              isEditMode ? 'Save Changes' : 'Add Company'
            )}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};
