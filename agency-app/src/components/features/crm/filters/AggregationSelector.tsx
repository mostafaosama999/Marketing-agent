// src/components/features/crm/filters/AggregationSelector.tsx
import React from 'react';
import { FormControl, Select, MenuItem, Typography, Box, Tooltip } from '@mui/material';
import { Help as HelpIcon } from '@mui/icons-material';
import { LeadAggregationType } from '../../../../types/filter';
import { AGGREGATION_OPTIONS } from '../../../../types/crossEntityFilter';

interface AggregationSelectorProps {
  value: LeadAggregationType;
  onChange: (value: LeadAggregationType) => void;
  disabled?: boolean;
}

export const AggregationSelector: React.FC<AggregationSelectorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  return (
    <FormControl fullWidth size="small" disabled={disabled}>
      <Select
        value={value}
        onChange={(e) => onChange(e.target.value as LeadAggregationType)}
        sx={{
          bgcolor: 'white',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: '#10b981',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: '#059669',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: '#059669',
          },
        }}
      >
        {AGGREGATION_OPTIONS.map(option => (
          <MenuItem key={option.value} value={option.value}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" sx={{ color: '#10b981', fontWeight: 500 }}>
                {option.label}
              </Typography>
              <Tooltip title={option.description} placement="right">
                <HelpIcon sx={{ fontSize: 14, color: '#64748b' }} />
              </Tooltip>
            </Box>
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
