/**
 * AddFieldDefinitionDialog Component
 *
 * Modal dialog for creating new field definitions.
 * Supports text, number, date, and dropdown field types.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import {
  EntityType,
  FieldType,
  FieldSection,
  CreateFieldDefinitionData,
  normalizeFieldName,
  generateFieldId,
} from '../../types/fieldDefinitions';
import { DropdownOptionsEditor } from '../features/crm/DropdownOptionsEditor';
import { fieldDefinitionExists } from '../../services/api/fieldDefinitionsService';

interface AddFieldDefinitionDialogProps {
  open: boolean;
  onClose: () => void;
  onAdd: (data: CreateFieldDefinitionData) => Promise<void>;
  entityType: EntityType;
}

export const AddFieldDefinitionDialog: React.FC<AddFieldDefinitionDialogProps> = ({
  open,
  onClose,
  onAdd,
  entityType,
}) => {
  const [name, setName] = useState('');
  const [label, setLabel] = useState('');
  const [fieldType, setFieldType] = useState<FieldType>('text');
  const [section, setSection] = useState<FieldSection>('general');
  const [options, setOptions] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDropdown = fieldType === 'dropdown';

  const resetForm = () => {
    setName('');
    setLabel('');
    setFieldType('text');
    setSection('general');
    setOptions([]);
    setError(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleNameChange = (value: string) => {
    setName(value);
    // Auto-generate label from name if label is empty
    if (!label || label === normalizeFieldName(name).split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')) {
      const normalized = normalizeFieldName(value);
      const autoLabel = normalized
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(' ');
      setLabel(autoLabel);
    }
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!name.trim()) {
      setError('Field name is required');
      return;
    }

    if (!label.trim()) {
      setError('Display label is required');
      return;
    }

    if (isDropdown && options.length === 0) {
      setError('Dropdown fields must have at least one option');
      return;
    }

    const normalizedName = normalizeFieldName(name);

    // Check if field already exists
    const exists = await fieldDefinitionExists(entityType, normalizedName);
    if (exists) {
      setError(`A field with the name "${normalizedName}" already exists for ${entityType}s`);
      return;
    }

    setSaving(true);
    try {
      const data: CreateFieldDefinitionData = {
        name: normalizedName,
        label: label.trim(),
        entityType,
        fieldType,
        section,
        ...(isDropdown && { options }),
      };

      await onAdd(data);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create field definition');
    } finally {
      setSaving(false);
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
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          fontWeight: 600,
        }}
      >
        Add New {entityType === 'lead' ? 'Lead' : 'Company'} Field
      </DialogTitle>

      <DialogContent sx={{ pt: 3, pb: 2 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Field Name */}
          <TextField
            label="Field Name"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="e.g., project_status, deal_value"
            helperText="Internal name used for data storage (will be normalized)"
            fullWidth
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: '#667eea',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#667eea',
              },
            }}
          />

          {/* Display Label */}
          <TextField
            label="Display Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., Project Status, Deal Value"
            helperText="Label shown in the UI"
            fullWidth
            required
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: '#667eea',
                },
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#667eea',
              },
            }}
          />

          {/* Field Type */}
          <FormControl fullWidth>
            <InputLabel sx={{ '&.Mui-focused': { color: '#667eea' } }}>
              Field Type
            </InputLabel>
            <Select
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as FieldType)}
              label="Field Type"
              sx={{
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#667eea',
                },
              }}
            >
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="number">Number</MenuItem>
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="dropdown">Dropdown</MenuItem>
            </Select>
          </FormControl>

          {/* Section */}
          <FormControl fullWidth>
            <InputLabel sx={{ '&.Mui-focused': { color: '#667eea' } }}>
              Section
            </InputLabel>
            <Select
              value={section}
              onChange={(e) => setSection(e.target.value as FieldSection)}
              label="Section"
              sx={{
                '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#667eea',
                },
              }}
            >
              <MenuItem value="general">General</MenuItem>
              <MenuItem value="linkedin">LinkedIn</MenuItem>
              <MenuItem value="email">Email</MenuItem>
            </Select>
          </FormControl>

          {/* Dropdown Options */}
          {isDropdown && (
            <Box>
              <Typography
                variant="caption"
                sx={{ fontWeight: 600, color: '#64748b', display: 'block', mb: 1 }}
              >
                Dropdown Options *
              </Typography>
              <DropdownOptionsEditor
                options={options}
                onChange={setOptions}
                label=""
              />
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button
          onClick={handleClose}
          sx={{
            textTransform: 'none',
            color: '#64748b',
          }}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={saving}
          startIcon={saving ? <CircularProgress size={16} /> : <AddIcon />}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6a408e 100%)',
            },
            '&:disabled': {
              background: '#e2e8f0',
              color: '#94a3b8',
            },
          }}
        >
          {saving ? 'Creating...' : 'Create Field'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AddFieldDefinitionDialog;
