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
} from '@mui/material';
import { Company, CompanyFormData } from '../../../app/types/crm';

interface CompanyDialogProps {
  open: boolean;
  company?: Company | null;
  onClose: () => void;
  onSave: (data: CompanyFormData) => Promise<void>;
}

export const CompanyDialog: React.FC<CompanyDialogProps> = ({ open, company, onClose, onSave }) => {
  const [formData, setFormData] = useState<CompanyFormData>({
    name: '',
    website: '',
    industry: '',
    description: '',
    customFields: {},
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name,
        website: company.website || '',
        industry: company.industry || '',
        description: company.description || '',
        customFields: company.customFields || {},
      });
    } else {
      setFormData({
        name: '',
        website: '',
        industry: '',
        description: '',
        customFields: {},
      });
    }
    setErrors({});
  }, [company, open]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
    }

    // Validate website format if provided
    if (formData.website && formData.website.trim()) {
      try {
        const url = formData.website.startsWith('http')
          ? formData.website
          : `https://${formData.website}`;
        new URL(url);
      } catch {
        newErrors.website = 'Invalid website URL';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving company:', error);
      setErrors({ name: 'Failed to save company. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof CompanyFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{company ? 'Edit Company' : 'Add Company'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2 }}>
          {/* Company Name */}
          <TextField
            label="Company Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={!!errors.name}
            helperText={errors.name || 'Required field'}
            fullWidth
            required
            autoFocus
          />

          {/* Website */}
          <TextField
            label="Website"
            value={formData.website}
            onChange={(e) => handleChange('website', e.target.value)}
            error={!!errors.website}
            helperText={errors.website}
            placeholder="https://example.com"
            fullWidth
          />

          {/* Industry */}
          <TextField
            label="Industry"
            value={formData.industry}
            onChange={(e) => handleChange('industry', e.target.value)}
            placeholder="e.g., SaaS, E-commerce, Healthcare"
            fullWidth
          />

          {/* Description */}
          <TextField
            label="Description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            multiline
            rows={4}
            placeholder="Company description or notes..."
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : company ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
