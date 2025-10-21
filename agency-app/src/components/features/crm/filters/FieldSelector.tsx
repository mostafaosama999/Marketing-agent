// src/components/features/crm/filters/FieldSelector.tsx
import React from 'react';
import { FormControl, Select, MenuItem, Typography, Box } from '@mui/material';
import { FilterableField } from '../../../../types/filter';

interface FieldSelectorProps {
  value: string;
  fields: FilterableField[];
  onChange: (fieldName: string, fieldLabel: string, fieldType: 'text' | 'number' | 'date' | 'select' | 'boolean', options?: string[]) => void;
  disabled?: boolean;
}

export const FieldSelector: React.FC<FieldSelectorProps> = ({
  value,
  fields,
  onChange,
  disabled = false,
}) => {
  console.log('[FieldSelector] Rendering with value:', value, 'fields count:', fields.length);

  const handleChange = (event: any) => {
    const selectedFieldName = event.target.value;
    console.log('[FieldSelector] handleChange called with:', selectedFieldName);
    const selectedField = fields.find(f => f.name === selectedFieldName);
    console.log('[FieldSelector] Found field:', selectedField);

    if (selectedField) {
      console.log('[FieldSelector] Calling onChange with field:', selectedField.name);
      onChange(
        selectedField.name,
        selectedField.label,
        selectedField.type,
        selectedField.options
      );
    } else {
      console.warn('[FieldSelector] No field found for:', selectedFieldName);
    }
  };

  // Group fields by category
  const standardFields = fields.filter(f => !f.isCustomField);
  const customFields = fields.filter(f => f.isCustomField);
  console.log('[FieldSelector] Standard fields:', standardFields.length, 'Custom fields:', customFields.length);

  return (
    <FormControl fullWidth size="small" disabled={disabled}>
      <Select
        value={value || ''}
        onChange={handleChange}
        displayEmpty
        renderValue={(selected) => {
          if (!selected) {
            return (
              <Typography variant="body2" color="text.secondary">
                Select field...
              </Typography>
            );
          }
          const field = fields.find(f => f.name === selected);
          return field?.label || selected;
        }}
        sx={{
          bgcolor: 'white',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#e2e8f0',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#667eea',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#667eea',
          },
        }}
      >

        {/* Standard Fields */}
        {standardFields.length > 0 && (
          <Box>
            <Typography
              variant="caption"
              sx={{
                px: 2,
                py: 1,
                display: 'block',
                color: '#64748b',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                bgcolor: '#f8fafc',
              }}
            >
              Standard Fields
            </Typography>
            {standardFields.map(field => (
              <MenuItem key={field.name} value={field.name}>
                <Typography variant="body2">{field.label}</Typography>
              </MenuItem>
            ))}
          </Box>
        )}

        {/* Custom Fields */}
        {customFields.length > 0 && (
          <Box>
            <Typography
              variant="caption"
              sx={{
                px: 2,
                py: 1,
                display: 'block',
                color: '#64748b',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                bgcolor: '#f8fafc',
              }}
            >
              Custom Fields
            </Typography>
            {customFields.map(field => (
              <MenuItem key={field.name} value={field.name}>
                <Typography variant="body2">{field.label}</Typography>
              </MenuItem>
            ))}
          </Box>
        )}
      </Select>
    </FormControl>
  );
};
