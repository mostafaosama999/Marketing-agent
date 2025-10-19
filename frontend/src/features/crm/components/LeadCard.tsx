import React, { useState } from 'react';
import { Card, CardContent, Typography, Box, IconButton, Chip, Button, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Alert } from '@mui/material';
import { Edit as EditIcon, Email as EmailIcon, Phone as PhoneIcon, Business as BusinessIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { Lead, CustomField } from '../../../app/types/crm';
import { qualifyCompanyBlog, QualifyBlogResponse } from '../../../services/researchApi';

interface LeadCardProps {
  lead: Lead;
  customFields: CustomField[];
  onEdit: (lead: Lead) => void;
  isDragging?: boolean;
}

export const LeadCard: React.FC<LeadCardProps> = ({ lead, customFields, onEdit, isDragging = false }) => {
  // State for blog qualification
  const [qualifyDialogOpen, setQualifyDialogOpen] = useState(false);
  const [website, setWebsite] = useState('');
  const [isQualifying, setIsQualifying] = useState(false);
  const [qualificationResult, setQualificationResult] = useState<QualifyBlogResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filter custom fields that should be shown on cards
  const cardCustomFields = customFields
    .filter(f => f.showInCard && f.visible)
    .sort((a, b) => a.order - b.order)
    .slice(0, 3); // Limit to 3 fields to avoid clutter

  const formatCustomFieldValue = (field: CustomField, value: any) => {
    if (!value) return null;

    switch (field.type) {
      case 'date':
        return new Date(value).toLocaleDateString();
      case 'checkbox':
        return Array.isArray(value) ? value.join(', ') : null;
      case 'number':
        return typeof value === 'number' ? value.toLocaleString() : value;
      case 'select':
      case 'radio':
        return value;
      default:
        return String(value).length > 30 ? String(value).substring(0, 30) + '...' : value;
    }
  };

  const handleQualifyClick = () => {
    setQualifyDialogOpen(true);
    setError(null);
    setQualificationResult(null);
    // Try to prefill website if it's in custom fields
    const websiteField = lead.customFields?.website || lead.customFields?.url || '';
    setWebsite(websiteField);
  };

  const handleQualifyBlog = async () => {
    if (!website.trim()) {
      setError('Please enter a website URL');
      return;
    }

    setIsQualifying(true);
    setError(null);

    try {
      const result = await qualifyCompanyBlog({
        companyName: lead.company,
        website: website.trim(),
      });

      setQualificationResult(result.data as QualifyBlogResponse);
    } catch (err: any) {
      console.error('Error qualifying blog:', err);
      setError(err.message || 'Failed to qualify blog. Please try again.');
    } finally {
      setIsQualifying(false);
    }
  };

  const handleCloseDialog = () => {
    setQualifyDialogOpen(false);
    setWebsite('');
    setError(null);
    setQualificationResult(null);
  };

  return (
    <Card
      sx={{
        mb: 2,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        '&:hover': {
          boxShadow: 3,
        },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography variant="h6" sx={{ fontSize: '1rem', fontWeight: 600 }}>
            {lead.name}
          </Typography>
          <IconButton size="small" onClick={() => onEdit(lead)}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary">
            {lead.company}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
          <EmailIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
          <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word' }}>
            {lead.email}
          </Typography>
        </Box>

        {lead.phone && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <PhoneIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {lead.phone}
            </Typography>
          </Box>
        )}

        {/* Custom Fields */}
        {cardCustomFields.length > 0 && (
          <Box sx={{ mt: 1.5, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
            {cardCustomFields.map((field) => {
              const value = formatCustomFieldValue(field, lead.customFields?.[field.name]);
              if (!value) return null;

              return (
                <Box key={field.id} sx={{ mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {field.label}
                  </Typography>
                  {field.type === 'select' || field.type === 'radio' ? (
                    <Chip label={value} size="small" sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }} />
                  ) : (
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {value}
                    </Typography>
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};
