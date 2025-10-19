import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  FormGroup,
  RadioGroup,
  Radio,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { CustomField } from '../../../app/types/crm';

interface BulkEditDialogProps {
  open: boolean;
  customFields: CustomField[];
  selectedCount: number;
  onClose: () => void;
  onSave: (updates: Record<string, any>) => void;
}

export const BulkEditDialog: React.FC<BulkEditDialogProps> = ({
  open,
  customFields,
  selectedCount,
  onClose,
  onSave,
}) => {
  const [updates, setUpdates] = useState<Record<string, any>>({});
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set());

  const handleFieldChange = (fieldName: string, value: any) => {
    setUpdates(prev => ({ ...prev, [fieldName]: value }));
    setModifiedFields(prev => new Set(prev).add(fieldName));
  };

  const handleSave = () => {
    // Only send modified fields
    const filteredUpdates: Record<string, any> = {};
    modifiedFields.forEach(fieldName => {
      filteredUpdates[fieldName] = updates[fieldName];
    });

    onSave(filteredUpdates);
    handleClose();
  };

  const handleClose = () => {
    setUpdates({});
    setModifiedFields(new Set());
    onClose();
  };

  const renderField = (field: CustomField) => {
    const value = updates[field.name] ?? '';

    switch (field.type) {
      case 'text':
      case 'url':
        return (
          <TextField
            fullWidth
            label={field.label}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            type={field.type === 'url' ? 'url' : 'text'}
            placeholder={`Update ${field.label.toLowerCase()}`}
          />
        );

      case 'textarea':
        return (
          <TextField
            fullWidth
            label={field.label}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            multiline
            rows={3}
            placeholder={`Update ${field.label.toLowerCase()}`}
          />
        );

      case 'number':
        return (
          <TextField
            fullWidth
            label={field.label}
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value ? Number(e.target.value) : '')}
            type="number"
            placeholder={`Update ${field.label.toLowerCase()}`}
          />
        );

      case 'date':
        return (
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label={field.label}
              value={value || null}
              onChange={(newValue) => handleFieldChange(field.name, newValue)}
              slotProps={{
                textField: { fullWidth: true },
              }}
            />
          </LocalizationProvider>
        );

      case 'select':
        return (
          <FormControl fullWidth>
            <InputLabel>{field.label}</InputLabel>
            <Select
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              label={field.label}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {field.options?.map((option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );

      case 'radio':
        return (
          <FormControl fullWidth>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              {field.label}
            </Typography>
            <RadioGroup
              value={value}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
            >
              {field.options?.map((option) => (
                <FormControlLabel
                  key={option}
                  value={option}
                  control={<Radio />}
                  label={option}
                />
              ))}
            </RadioGroup>
          </FormControl>
        );

      case 'checkbox':
        return (
          <FormControl fullWidth>
            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
              {field.label}
            </Typography>
            <FormGroup>
              {field.options?.map((option) => (
                <FormControlLabel
                  key={option}
                  control={
                    <Checkbox
                      checked={(value as string[])?.includes(option) || false}
                      onChange={(e) => {
                        const currentValues = (value as string[]) || [];
                        const newValues = e.target.checked
                          ? [...currentValues, option]
                          : currentValues.filter((v) => v !== option);
                        handleFieldChange(field.name, newValues);
                      }}
                    />
                  }
                  label={option}
                />
              ))}
            </FormGroup>
          </FormControl>
        );

      default:
        return null;
    }
  };

  const visibleFields = customFields.filter(f => f.visible).sort((a, b) => a.order - b.order);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Bulk Edit Custom Fields</DialogTitle>
      <DialogContent>
        <Alert severity="info" sx={{ mb: 3 }}>
          Editing {selectedCount} selected lead{selectedCount !== 1 ? 's' : ''}. Only fields you modify will be updated.
        </Alert>

        {visibleFields.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No custom fields available. Create custom fields first to enable bulk editing.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mt: 2 }}>
            {visibleFields.map((field) => (
              <Box key={field.id}>
                {renderField(field)}
                {modifiedFields.has(field.name) && (
                  <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                    Will be updated
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={modifiedFields.size === 0}
        >
          Update {selectedCount} Lead{selectedCount !== 1 ? 's' : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
