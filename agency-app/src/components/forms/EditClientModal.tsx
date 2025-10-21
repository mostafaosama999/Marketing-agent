// src/components/forms/EditClientModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Divider,
  InputAdornment,
} from '@mui/material';
import { AttachMoney as MoneyIcon } from '@mui/icons-material';

interface EditClientModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (clientData: any) => void;
  client: any | null;
}

interface ClientFormData {
  name: string;
  industry: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  website: string;
  status: string;
  contractValue: string;
  monthlyRevenue: string;
  startDate: string;
  notes: string;
  // Compensation rates
  blogRate: string;
  tutorialRate: string;
  caseStudyRate: string;
  whitepaperRate: string;
  socialMediaRate: string;
  emailRate: string;
  landingPageRate: string;
  otherRate: string;
}

const EditClientModal: React.FC<EditClientModalProps> = ({ open, onClose, onSubmit, client }) => {
  const [formData, setFormData] = useState<ClientFormData>({
    name: '',
    industry: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    website: '',
    status: 'active',
    contractValue: '',
    monthlyRevenue: '',
    startDate: '',
    notes: '',
    blogRate: '',
    tutorialRate: '',
    caseStudyRate: '',
    whitepaperRate: '',
    socialMediaRate: '',
    emailRate: '',
    landingPageRate: '',
    otherRate: '',
  });

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name || '',
        industry: client.industry || '',
        contactEmail: client.contactEmail || '',
        contactPhone: client.contactPhone || '',
        address: client.address || '',
        website: client.website || '',
        status: client.status || 'active',
        contractValue: client.contractValue?.toString() || '',
        monthlyRevenue: client.monthlyRevenue?.toString() || '',
        startDate: client.startDate || '',
        notes: client.notes || '',
        // Compensation rates
        blogRate: client.compensation?.blogRate?.toString() || '',
        tutorialRate: client.compensation?.tutorialRate?.toString() || '',
        caseStudyRate: client.compensation?.caseStudyRate?.toString() || '',
        whitepaperRate: client.compensation?.whitepaperRate?.toString() || '',
        socialMediaRate: client.compensation?.socialMediaRate?.toString() || '',
        emailRate: client.compensation?.emailRate?.toString() || '',
        landingPageRate: client.compensation?.landingPageRate?.toString() || '',
        otherRate: client.compensation?.otherRate?.toString() || '',
      });
    }
  }, [client]);

  const handleChange = (field: keyof ClientFormData) => (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | any
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.name.trim()) {
      const compensationData = {
        blogRate: parseFloat(formData.blogRate) || undefined,
        tutorialRate: parseFloat(formData.tutorialRate) || undefined,
        caseStudyRate: parseFloat(formData.caseStudyRate) || undefined,
        whitepaperRate: parseFloat(formData.whitepaperRate) || undefined,
        socialMediaRate: parseFloat(formData.socialMediaRate) || undefined,
        emailRate: parseFloat(formData.emailRate) || undefined,
        landingPageRate: parseFloat(formData.landingPageRate) || undefined,
        otherRate: parseFloat(formData.otherRate) || undefined,
      };

      // Only include compensation if at least one rate is set
      const hasCompensation = Object.values(compensationData).some(value => value !== undefined);

      onSubmit({
        ...client,
        ...formData,
        contractValue: parseFloat(formData.contractValue) || 0,
        monthlyRevenue: parseFloat(formData.monthlyRevenue) || 0,
        ...(hasCompensation && { compensation: compensationData }),
      });
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Edit Client</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Basic Information */}
            <Typography variant="h6" sx={{ mb: 3, color: '#1e293b', fontWeight: 600 }}>
              Basic Information
            </Typography>
            <Grid container spacing={3} sx={{ mb: 4 }}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Client Name *"
                  value={formData.name}
                  onChange={handleChange('name')}
                  required
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Industry"
                  value={formData.industry}
                  onChange={handleChange('industry')}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Contact Email"
                  type="email"
                  value={formData.contactEmail}
                  onChange={handleChange('contactEmail')}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Contact Phone"
                  value={formData.contactPhone}
                  onChange={handleChange('contactPhone')}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Address"
                  multiline
                  rows={2}
                  value={formData.address}
                  onChange={handleChange('address')}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Website"
                  value={formData.website}
                  onChange={handleChange('website')}
                  placeholder="https://example.com"
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={formData.status}
                    label="Status"
                    onChange={handleChange('status')}
                  >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="prospect">Prospect</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Contract Value"
                  type="number"
                  value={formData.contractValue}
                  onChange={handleChange('contractValue')}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Expected Monthly Revenue"
                  type="number"
                  value={formData.monthlyRevenue}
                  onChange={handleChange('monthlyRevenue')}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  helperText="Expected revenue per month from this client"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  label="Start Date"
                  type="date"
                  value={formData.startDate}
                  onChange={handleChange('startDate')}
                  InputLabelProps={{
                    shrink: true,
                  }}
                />
              </Grid>

              <Grid size={{ xs: 12 }}>
                <TextField
                  fullWidth
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange('notes')}
                  placeholder="Additional notes about this client..."
                />
              </Grid>
            </Grid>

            {/* Compensation Structure */}
            <Divider sx={{ my: 3 }} />
            <Typography variant="h6" sx={{ mb: 2, color: '#1e293b', fontWeight: 600 }}>
              Compensation Structure
            </Typography>
            <Typography variant="body2" sx={{ mb: 3, color: '#64748b' }}>
              Set the rates this client pays for different types of content. Leave blank for content types not applicable to this client.
            </Typography>

            <Grid container spacing={3}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="Blog Rate"
                  type="number"
                  value={formData.blogRate}
                  onChange={handleChange('blogRate')}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Per blog post"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="Tutorial Rate"
                  type="number"
                  value={formData.tutorialRate}
                  onChange={handleChange('tutorialRate')}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Per tutorial"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="Case Study Rate"
                  type="number"
                  value={formData.caseStudyRate}
                  onChange={handleChange('caseStudyRate')}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Per case study"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="Whitepaper Rate"
                  type="number"
                  value={formData.whitepaperRate}
                  onChange={handleChange('whitepaperRate')}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Per whitepaper"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="Social Media Rate"
                  type="number"
                  value={formData.socialMediaRate}
                  onChange={handleChange('socialMediaRate')}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Per social post"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="Email Rate"
                  type="number"
                  value={formData.emailRate}
                  onChange={handleChange('emailRate')}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Per email campaign"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="Landing Page Rate"
                  type="number"
                  value={formData.landingPageRate}
                  onChange={handleChange('landingPageRate')}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="Per landing page"
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <TextField
                  fullWidth
                  label="Other Content Rate"
                  type="number"
                  value={formData.otherRate}
                  onChange={handleChange('otherRate')}
                  InputProps={{
                    startAdornment: <InputAdornment position="start">$</InputAdornment>,
                  }}
                  inputProps={{ min: 0, step: 0.01 }}
                  helperText="For other content types"
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            Update Client
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default EditClientModal;