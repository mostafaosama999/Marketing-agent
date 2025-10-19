import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  MenuItem,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import { Lead, LeadFormData, PipelineStage, CustomField } from '../../../app/types/crm';
import { CustomFieldRenderer } from './CustomFieldRenderer';

interface LeadDialogProps {
  open: boolean;
  lead?: Lead | null;
  stages: PipelineStage[];
  customFields: CustomField[];
  onClose: () => void;
  onSave: (data: LeadFormData) => Promise<void>;
}

export const LeadDialog: React.FC<LeadDialogProps> = ({ open, lead, stages, customFields, onClose, onSave }) => {
  const visibleStages = stages.filter((s) => s.visible);
  const defaultStatus = visibleStages.length > 0 ? visibleStages[0].label : '';

  const [formData, setFormData] = useState<LeadFormData>({
    name: '',
    email: '',
    company: '',
    phone: '',
    status: defaultStatus,
    customFields: {},
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name,
        email: lead.email,
        company: lead.company,
        phone: lead.phone,
        status: lead.status,
        customFields: lead.customFields || {},
      });
    } else {
      setFormData({
        name: '',
        email: '',
        company: '',
        phone: '',
        status: defaultStatus,
        customFields: {},
      });
    }
    setErrors({});
  }, [lead, open, defaultStatus]);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<string, string>> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    // Email is optional (can be fetched via Apollo), but validate format if provided
    if (formData.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    if (!formData.company.trim()) {
      newErrors.company = 'Company is required';
    }

    // Validate required custom fields
    customFields.filter(f => f.required && f.visible).forEach(field => {
      const value = formData.customFields?.[field.name];
      if (!value || (typeof value === 'string' && !value.trim())) {
        newErrors[`customField_${field.name}`] = `${field.label} is required`;
      }
    });

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
      console.error('Error saving lead:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof LeadFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleCustomFieldChange = (fieldName: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      customFields: {
        ...prev.customFields,
        [fieldName]: value,
      },
    }));
    // Clear error for this field
    const errorKey = `customField_${fieldName}`;
    if (errors[errorKey]) {
      setErrors((prev) => ({ ...prev, [errorKey]: undefined }));
    }
  };

  const visibleCustomFields = customFields.filter(f => f.visible).sort((a, b) => a.order - b.order);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{lead ? 'Edit Lead' : 'Add New Lead'}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
          <TextField
            label="Name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            fullWidth
            required
          />

          <TextField
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={!!errors.email}
            helperText={errors.email || 'Optional - can be fetched via Apollo'}
            fullWidth
          />

          <TextField
            label="Company"
            value={formData.company}
            onChange={(e) => handleChange('company', e.target.value)}
            error={!!errors.company}
            helperText={errors.company}
            fullWidth
            required
          />

          <TextField
            label="Phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            error={!!errors.phone}
            helperText={errors.phone}
            fullWidth
          />

          <TextField
            select
            label="Status"
            value={formData.status}
            onChange={(e) => handleChange('status', e.target.value)}
            fullWidth
            required
          >
            {visibleStages.map((stage) => (
              <MenuItem key={stage.id} value={stage.label}>
                {stage.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Custom Fields Section */}
          {visibleCustomFields.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Additional Information
              </Typography>
              {visibleCustomFields.map((field) => (
                <Box key={field.id} sx={{ mb: 2 }}>
                  <CustomFieldRenderer
                    field={field}
                    value={formData.customFields?.[field.name]}
                    onChange={(value) => handleCustomFieldChange(field.name, value)}
                    error={errors[`customField_${field.name}`]}
                  />
                </Box>
              ))}
            </>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
