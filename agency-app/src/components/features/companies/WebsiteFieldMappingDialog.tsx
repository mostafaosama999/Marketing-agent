// src/components/features/companies/WebsiteFieldMappingDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Select,
  MenuItem,
  Typography,
  Box,
  FormControl,
  InputLabel,
  Alert,
} from '@mui/material';
import { Company } from '../../../types/crm';
import {
  WebsiteFieldMapping,
  saveWebsiteFieldMapping,
  getPotentialWebsiteFields,
} from '../../../services/api/websiteFieldMappingService';

interface WebsiteFieldMappingDialogProps {
  open: boolean;
  onClose: () => void;
  companies: Company[];
  onSave: () => void;
}

export const WebsiteFieldMappingDialog: React.FC<WebsiteFieldMappingDialogProps> = ({
  open,
  onClose,
  companies,
  onSave,
}) => {
  const [mappingType, setMappingType] = useState<'topLevel' | 'customField'>('topLevel');
  const [selectedField, setSelectedField] = useState<string>('');
  const [potentialFields, setPotentialFields] = useState<string[]>([]);

  useEffect(() => {
    if (open && companies.length > 0) {
      const fields = getPotentialWebsiteFields(companies);
      setPotentialFields(fields);
      if (fields.length > 0 && !selectedField) {
        setSelectedField(fields[0]);
        setMappingType('customField');
      }
    }
  }, [open, companies, selectedField]);

  const handleSave = () => {
    const mapping: WebsiteFieldMapping = {
      useTopLevel: mappingType === 'topLevel',
      customFieldName: mappingType === 'customField' ? selectedField : undefined,
    };

    saveWebsiteFieldMapping(mapping);
    onSave();
    onClose();
  };

  const canSave = mappingType === 'topLevel' || (mappingType === 'customField' && selectedField);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        },
      }}
    >
      <DialogTitle>
        <Typography variant="h5" sx={{ fontWeight: 700, color: '#1e293b' }}>
          Website Field Mapping
        </Typography>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
          <Alert severity="info">
            This company doesn't have a website field. Please select which field contains the
            company website. This setting will apply to all companies.
          </Alert>

          <RadioGroup
            value={mappingType}
            onChange={(e) => setMappingType(e.target.value as 'topLevel' | 'customField')}
          >
            <FormControlLabel
              value="topLevel"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Use top-level website field
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Use company.website (if it exists)
                  </Typography>
                </Box>
              }
            />

            <FormControlLabel
              value="customField"
              control={<Radio />}
              label={
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    Use a custom field
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Select which custom field contains the website URL
                  </Typography>
                </Box>
              }
              disabled={potentialFields.length === 0}
            />
          </RadioGroup>

          {mappingType === 'customField' && (
            <FormControl fullWidth sx={{ ml: 4 }}>
              <InputLabel>Custom Field</InputLabel>
              <Select
                value={selectedField}
                onChange={(e) => setSelectedField(e.target.value)}
                label="Custom Field"
                disabled={potentialFields.length === 0}
              >
                {potentialFields.map((fieldName) => (
                  <MenuItem key={fieldName} value={fieldName}>
                    {fieldName.charAt(0).toUpperCase() + fieldName.slice(1).replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </Select>
              {potentialFields.length === 0 && (
                <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                  No custom fields found that might contain website URLs
                </Typography>
              )}
            </FormControl>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={onClose} sx={{ color: '#64748b' }}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={!canSave}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
            },
          }}
        >
          Save Mapping
        </Button>
      </DialogActions>
    </Dialog>
  );
};
