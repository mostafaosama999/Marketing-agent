// src/components/features/crm/filters/DynamicFieldFilter.tsx
import React from 'react';
import {
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  FormControl,
  OutlinedInput,
  SelectChangeEvent,
  Box,
  TextField,
  Switch,
  FormControlLabel,
} from '@mui/material';
import { FilterConfig } from '../../../../services/api/dynamicFilterService';

interface DynamicFieldFilterProps {
  config: FilterConfig;
  value: any;
  onChange: (value: any) => void;
}

export const DynamicFieldFilter: React.FC<DynamicFieldFilterProps> = ({
  config,
  value,
  onChange,
}) => {
  // Multiselect filter (for select, radio, text fields with limited options)
  if (config.filterType === 'multiselect' && config.options) {
    const selectedValues = Array.isArray(value) ? value : [];

    const handleChange = (event: SelectChangeEvent<string[]>) => {
      const newValue = event.target.value;
      onChange(typeof newValue === 'string' ? newValue.split(',') : newValue);
    };

    return (
      <FormControl fullWidth size="small">
        <Select
          multiple
          value={selectedValues}
          onChange={handleChange}
          input={<OutlinedInput />}
          renderValue={(selected) =>
            selected.length === 0
              ? 'All'
              : selected.length === 1
              ? selected[0]
              : `${selected.length} selected`
          }
          displayEmpty
          sx={{
            bgcolor: 'white',
            '& .MuiSelect-select': {
              py: 1,
            },
          }}
        >
          <MenuItem value="" disabled>
            <em>Select {config.label}</em>
          </MenuItem>
          {config.options.map((option) => (
            <MenuItem key={option} value={option}>
              <Checkbox checked={selectedValues.includes(option)} size="small" />
              <ListItemText primary={option} />
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  // Boolean filter (for checkbox fields)
  if (config.filterType === 'boolean') {
    return (
      <FormControl fullWidth size="small">
        <Select
          value={value === null || value === undefined ? 'all' : value ? 'true' : 'false'}
          onChange={(e) => {
            const val = e.target.value;
            onChange(val === 'all' ? null : val === 'true');
          }}
          sx={{ bgcolor: 'white' }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="true">Yes</MenuItem>
          <MenuItem value="false">No</MenuItem>
        </Select>
      </FormControl>
    );
  }

  // Number range filter
  if (config.filterType === 'number-range') {
    const rangeValue = value || { min: undefined, max: undefined };

    return (
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField
          size="small"
          type="number"
          placeholder={`Min ${config.min || ''}`}
          value={rangeValue.min || ''}
          onChange={(e) =>
            onChange({
              ...rangeValue,
              min: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          sx={{ flex: 1, bgcolor: 'white' }}
          InputProps={{
            sx: { fontSize: '14px' },
          }}
        />
        <TextField
          size="small"
          type="number"
          placeholder={`Max ${config.max || ''}`}
          value={rangeValue.max || ''}
          onChange={(e) =>
            onChange({
              ...rangeValue,
              max: e.target.value ? Number(e.target.value) : undefined,
            })
          }
          sx={{ flex: 1, bgcolor: 'white' }}
          InputProps={{
            sx: { fontSize: '14px' },
          }}
        />
      </Box>
    );
  }

  // Date range filter
  if (config.filterType === 'date-range') {
    const dateValue = value || { start: undefined, end: undefined };

    return (
      <Box sx={{ display: 'flex', gap: 1, flexDirection: 'column' }}>
        <TextField
          size="small"
          type="date"
          label="Start Date"
          value={
            dateValue.start
              ? new Date(dateValue.start).toISOString().split('T')[0]
              : ''
          }
          onChange={(e) =>
            onChange({
              ...dateValue,
              start: e.target.value ? new Date(e.target.value) : undefined,
            })
          }
          sx={{ bgcolor: 'white' }}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            sx: { fontSize: '14px' },
          }}
        />
        <TextField
          size="small"
          type="date"
          label="End Date"
          value={
            dateValue.end ? new Date(dateValue.end).toISOString().split('T')[0] : ''
          }
          onChange={(e) =>
            onChange({
              ...dateValue,
              end: e.target.value ? new Date(e.target.value) : undefined,
            })
          }
          sx={{ bgcolor: 'white' }}
          InputLabelProps={{ shrink: true }}
          InputProps={{
            sx: { fontSize: '14px' },
          }}
        />
      </Box>
    );
  }

  // Text filter (fallback)
  return (
    <TextField
      fullWidth
      size="small"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={`Filter by ${config.label}`}
      sx={{ bgcolor: 'white' }}
      InputProps={{
        sx: { fontSize: '14px' },
      }}
    />
  );
};
