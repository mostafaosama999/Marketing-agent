// src/components/features/crm/filters/ValueInput.tsx
import React from 'react';
import {
  TextField,
  FormControl,
  Select,
  MenuItem,
  Checkbox,
  ListItemText,
  OutlinedInput,
  Box,
  Typography,
} from '@mui/material';
import { FilterOperator } from '../../../../types/filter';

interface ValueInputProps {
  fieldType: 'text' | 'number' | 'date' | 'select' | 'boolean';
  operator: FilterOperator;
  value: any;
  onChange: (value: any) => void;
  options?: string[];
  disabled?: boolean;
}

export const ValueInput: React.FC<ValueInputProps> = ({
  fieldType,
  operator,
  value,
  onChange,
  options = [],
  disabled = false,
}) => {
  // Don't show value input for operators that don't need a value
  const noValueOperators: FilterOperator[] = ['is_empty', 'is_not_empty', 'is_true', 'is_false'];
  if (noValueOperators.includes(operator)) {
    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '40px',
          bgcolor: '#f8fafc',
          borderRadius: '4px',
          px: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          No value needed
        </Typography>
      </Box>
    );
  }

  const commonSx = {
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
  };

  // Text input
  if (fieldType === 'text') {
    return (
      <TextField
        fullWidth
        size="small"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter value..."
        disabled={disabled}
        sx={commonSx}
      />
    );
  }

  // Number input
  if (fieldType === 'number') {
    return (
      <TextField
        fullWidth
        size="small"
        type="number"
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder="Enter number..."
        disabled={disabled}
        sx={commonSx}
      />
    );
  }

  // Date input
  if (fieldType === 'date') {
    if (operator === 'between') {
      // Show two date inputs for "between" operator
      const dateArray = Array.isArray(value) ? value : [null, null];
      return (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small"
            type="date"
            value={dateArray[0] instanceof Date ? dateArray[0].toISOString().split('T')[0] : dateArray[0] || ''}
            onChange={(e) => onChange([e.target.value, dateArray[1]])}
            disabled={disabled}
            sx={{ ...commonSx, flex: 1 }}
            InputLabelProps={{ shrink: true }}
          />
          <Typography variant="body2" sx={{ alignSelf: 'center', color: '#64748b' }}>
            to
          </Typography>
          <TextField
            size="small"
            type="date"
            value={dateArray[1] instanceof Date ? dateArray[1].toISOString().split('T')[0] : dateArray[1] || ''}
            onChange={(e) => onChange([dateArray[0], e.target.value])}
            disabled={disabled}
            sx={{ ...commonSx, flex: 1 }}
            InputLabelProps={{ shrink: true }}
          />
        </Box>
      );
    }

    // Single date input
    return (
      <TextField
        fullWidth
        size="small"
        type="date"
        value={value instanceof Date ? value.toISOString().split('T')[0] : value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        sx={commonSx}
        InputLabelProps={{ shrink: true }}
      />
    );
  }

  // Select input (multi-select for is_one_of/is_none_of)
  if (fieldType === 'select') {
    const isMultiSelect = operator === 'is_one_of' || operator === 'is_none_of';

    if (isMultiSelect) {
      const selectedValues = Array.isArray(value) ? value : [];

      return (
        <FormControl fullWidth size="small" disabled={disabled}>
          <Select
            multiple
            value={selectedValues}
            onChange={(e) => onChange(e.target.value)}
            input={<OutlinedInput />}
            renderValue={(selected) => (selected as string[]).join(', ')}
            sx={commonSx}
          >
            {options.map((option) => (
              <MenuItem key={option} value={option}>
                <Checkbox checked={selectedValues.indexOf(option) > -1} />
                <ListItemText primary={option} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      );
    }

    // Single select
    return (
      <FormControl fullWidth size="small" disabled={disabled}>
        <Select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          displayEmpty
          sx={commonSx}
        >
          <MenuItem value="" disabled>
            <Typography variant="body2" color="text.secondary">
              Select value...
            </Typography>
          </MenuItem>
          {options.map((option) => (
            <MenuItem key={option} value={option}>
              <Typography variant="body2">{option}</Typography>
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  }

  // Boolean - no input needed, handled by operator
  return null;
};
