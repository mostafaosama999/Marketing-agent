// src/components/features/crm/filters/FieldSelector.tsx
import React from 'react';
import { FormControl, Select, MenuItem, Typography, ListSubheader, Box } from '@mui/material';
import { Business as BusinessIcon, Person as PersonIcon } from '@mui/icons-material';
import { FilterableField, EntitySource } from '../../../../types/filter';

interface FieldSelectorProps {
  value: string;
  fields: FilterableField[];
  onChange: (
    fieldName: string,
    fieldLabel: string,
    fieldType: 'text' | 'number' | 'date' | 'select' | 'boolean',
    options?: string[],
    entitySource?: EntitySource
  ) => void;
  disabled?: boolean;
}

export const FieldSelector: React.FC<FieldSelectorProps> = ({
  value,
  fields,
  onChange,
  disabled = false,
}) => {
  // Create a unique key for each field to handle name collisions across entity sources
  // For cross-entity fields (company/leads), use "entitySource:fieldName" format
  // For self fields, use just "fieldName" to maintain backward compatibility
  const getFieldKey = (field: FilterableField): string => {
    if (field.entitySource === 'company' || field.entitySource === 'leads') {
      return `${field.entitySource}:${field.name}`;
    }
    return field.name;
  };

  // Find a field by its key (handles both simple names and composite keys)
  const findFieldByKey = (key: string): FilterableField | undefined => {
    // First try to find by exact key match (for cross-entity fields)
    const fieldByKey = fields.find(f => getFieldKey(f) === key);
    if (fieldByKey) return fieldByKey;

    // Fallback: try to find by name only (for backward compatibility with existing filters)
    // This handles old filters that were saved before the fix
    return fields.find(f => f.name === key);
  };

  const handleChange = (event: any) => {
    const selectedKey = event.target.value;
    const selectedField = findFieldByKey(selectedKey);

    if (selectedField) {
      onChange(
        selectedField.name,
        selectedField.label,
        selectedField.type,
        selectedField.options,
        selectedField.entitySource
      );
    }
  };

  // Group fields by entity source and custom field status
  const selfStandardFields = fields.filter(
    f => (!f.entitySource || f.entitySource === 'self') && !f.isCustomField
  );
  const selfCustomFields = fields.filter(
    f => (!f.entitySource || f.entitySource === 'self') && f.isCustomField
  );
  const companyFields = fields.filter(f => f.entitySource === 'company');
  const leadFields = fields.filter(f => f.entitySource === 'leads');

  // Get the current field to show correct color in the display
  const currentField = findFieldByKey(value);
  const getFieldColor = (field?: FilterableField) => {
    if (!field) return 'inherit';
    if (field.entitySource === 'company') return '#0077b5';
    if (field.entitySource === 'leads') return '#10b981';
    return 'inherit';
  };

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
          const field = findFieldByKey(selected as string);
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {field?.entitySource === 'company' && (
                <BusinessIcon sx={{ fontSize: 14, color: '#0077b5' }} />
              )}
              {field?.entitySource === 'leads' && (
                <PersonIcon sx={{ fontSize: 14, color: '#10b981' }} />
              )}
              <Typography
                variant="body2"
                sx={{ color: getFieldColor(field) }}
              >
                {field?.label || selected}
              </Typography>
            </Box>
          );
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
        {selfStandardFields.length > 0 && [
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
          ...selfStandardFields.map(field => (
            <MenuItem key={field.name} value={field.name}>
              <Typography variant="body2">{field.label}</Typography>
            </MenuItem>
          ))
        ]}

        {/* Custom Fields */}
        {selfCustomFields.length > 0 && [
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
          ...selfCustomFields.map(field => (
            <MenuItem key={field.name} value={field.name}>
              <Typography variant="body2">{field.label}</Typography>
            </MenuItem>
          ))
        ]}

        {/* Linked Company Fields (for lead filtering) */}
        {companyFields.length > 0 && [
          <ListSubheader
            key="company-header"
            sx={{
              color: '#0077b5',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              bgcolor: 'rgba(0, 119, 181, 0.08)',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <BusinessIcon sx={{ fontSize: 14 }} />
            Linked Company Fields
          </ListSubheader>,
          ...companyFields.map(field => (
            <MenuItem key={`company-${field.name}`} value={getFieldKey(field)}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <BusinessIcon sx={{ fontSize: 14, color: '#0077b5', opacity: 0.6 }} />
                <Typography variant="body2" sx={{ color: '#0077b5' }}>
                  {field.label}
                </Typography>
              </Box>
            </MenuItem>
          ))
        ]}

        {/* Company's Leads Fields (for company filtering) */}
        {leadFields.length > 0 && [
          <ListSubheader
            key="leads-header"
            sx={{
              color: '#10b981',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              bgcolor: 'rgba(16, 185, 129, 0.08)',
              fontSize: '11px',
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <PersonIcon sx={{ fontSize: 14 }} />
            Company's Leads Fields
          </ListSubheader>,
          ...leadFields.map(field => (
            <MenuItem key={`lead-${field.name}`} value={getFieldKey(field)}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <PersonIcon sx={{ fontSize: 14, color: '#10b981', opacity: 0.6 }} />
                <Typography variant="body2" sx={{ color: '#10b981' }}>
                  {field.label}
                </Typography>
              </Box>
            </MenuItem>
          ))
        ]}
      </Select>
    </FormControl>
  );
};
