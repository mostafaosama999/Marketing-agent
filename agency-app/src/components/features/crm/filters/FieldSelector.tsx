// src/components/features/crm/filters/FieldSelector.tsx
import React from 'react';
import { FormControl, Select, MenuItem, Typography, ListSubheader } from '@mui/material';
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
  const handleChange = (event: any) => {
    const selectedFieldName = event.target.value;
    const selectedField = fields.find(f => f.name === selectedFieldName);

    if (selectedField) {
      onChange(
        selectedField.name,
        selectedField.label,
        selectedField.type,
        selectedField.options
      );
    }
  };

  // Group fields by category
  const standardFields = fields.filter(f => !f.isCustomField);
  const customFields = fields.filter(f => f.isCustomField);

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
        {standardFields.length > 0 && [
          <ListSubheader
            key="standard-header"
            sx={{
              color: '#64748b',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              bgcolor: '#f8fafc',
              fontSize: '11px',
            }}
          >
            Standard Fields
          </ListSubheader>,
          ...standardFields.map(field => (
            <MenuItem key={field.name} value={field.name}>
              <Typography variant="body2">{field.label}</Typography>
            </MenuItem>
          ))
        ]}

        {/* Custom Fields */}
        {customFields.length > 0 && [
          <ListSubheader
            key="custom-header"
            sx={{
              color: '#64748b',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              bgcolor: '#f8fafc',
              fontSize: '11px',
            }}
          >
            Custom Fields
          </ListSubheader>,
          ...customFields.map(field => (
            <MenuItem key={field.name} value={field.name}>
              <Typography variant="body2">{field.label}</Typography>
            </MenuItem>
          ))
        ]}
      </Select>
    </FormControl>
  );
};
