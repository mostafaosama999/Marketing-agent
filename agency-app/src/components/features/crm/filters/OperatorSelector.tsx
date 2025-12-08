// src/components/features/crm/filters/OperatorSelector.tsx
import React from 'react';
import { FormControl, Select, MenuItem, Typography } from '@mui/material';
import { FilterOperator } from '../../../../types/filter';
import { getOperatorsForFieldType } from '../../../../services/api/advancedFilterService';

interface OperatorSelectorProps {
  value: FilterOperator;
  fieldType: 'text' | 'number' | 'date' | 'select' | 'boolean';
  onChange: (operator: FilterOperator) => void;
  disabled?: boolean;
}

export const OperatorSelector: React.FC<OperatorSelectorProps> = ({
  value,
  fieldType,
  onChange,
  disabled = false,
}) => {
  const operators = getOperatorsForFieldType(fieldType);

  // Check if the current value exists in the operators for this field type
  // If not, use empty string to avoid MUI out-of-range warning
  const isValidOperator = operators.some(op => op.value === value);
  const selectValue = isValidOperator ? value : '';

  const handleChange = (event: any) => {
    onChange(event.target.value as FilterOperator);
  };

  return (
    <FormControl fullWidth size="small" disabled={disabled}>
      <Select
        value={selectValue}
        onChange={handleChange}
        displayEmpty
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
        <MenuItem value="" disabled>
          <Typography variant="body2" color="text.secondary">
            Select operator...
          </Typography>
        </MenuItem>
        {operators.map(op => (
          <MenuItem key={op.value} value={op.value}>
            <Typography variant="body2">{op.label}</Typography>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
