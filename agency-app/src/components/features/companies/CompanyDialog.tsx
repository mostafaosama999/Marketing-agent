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
} from '@mui/material';
import { Company, CompanyFormData } from '../../../types/crm';
import { createCompany, updateCompany, getCompanies } from '../../../services/api/companies';

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
    }
  }, [company, open]);

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

      const companyData: CompanyFormData = {
        name: formData.name.trim(),
        website: normalizedWebsite,
        industry: formData.industry?.trim(),
        description: formData.description?.trim(),
        customFields: formData.customFields,
      };

      if (isEditMode && company) {
        await updateCompany(company.id, companyData);
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

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
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
        {isEditMode ? 'Edit Company' : 'Add New Company'}
      </DialogTitle>

      <form onSubmit={handleSubmit}>
        <DialogContent>
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
