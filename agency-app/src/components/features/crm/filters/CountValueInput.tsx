// src/components/features/crm/filters/CountValueInput.tsx
import React from 'react';
import { Box, TextField, Select, MenuItem, FormControl, Typography } from '@mui/material';
import { CountOperator } from '../../../../types/filter';
import { COUNT_OPERATOR_OPTIONS } from '../../../../types/crossEntityFilter';

interface CountValueInputProps {
  operator: CountOperator;
  value: number | [number, number] | undefined;
  onOperatorChange: (op: CountOperator) => void;
  onValueChange: (val: number | [number, number]) => void;
  disabled?: boolean;
}

export const CountValueInput: React.FC<CountValueInputProps> = ({
  operator,
  value,
  onOperatorChange,
  onValueChange,
  disabled = false,
}) => {
  const isBetween = operator === 'between';
  const singleValue = typeof value === 'number' ? value : (Array.isArray(value) ? value[0] : 0);
  const rangeValue = Array.isArray(value) ? value : [0, 10];

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <FormControl size="small" sx={{ minWidth: 120 }}>
        <Select
          value={operator}
          onChange={(e) => onOperatorChange(e.target.value as CountOperator)}
          disabled={disabled}
          sx={{
            bgcolor: 'white',
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: '#10b981',
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#059669',
            },
          }}
        >
          {COUNT_OPERATOR_OPTIONS.map(opt => (
            <MenuItem key={opt.value} value={opt.value}>
              <Typography variant="body2">{opt.label}</Typography>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {isBetween ? (
        <>
          <TextField
            type="number"
            size="small"
            value={rangeValue[0]}
            onChange={(e) =>
              onValueChange([parseInt(e.target.value) || 0, rangeValue[1]])
            }
            disabled={disabled}
            inputProps={{ min: 0 }}
            sx={{
              width: 70,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#10b981',
                },
              },
            }}
          />
          <Typography variant="body2" color="text.secondary">
            and
          </Typography>
          <TextField
            type="number"
            size="small"
            value={rangeValue[1]}
            onChange={(e) =>
              onValueChange([rangeValue[0], parseInt(e.target.value) || 0])
            }
            disabled={disabled}
            inputProps={{ min: 0 }}
            sx={{
              width: 70,
              '& .MuiOutlinedInput-root': {
                bgcolor: 'white',
                '& .MuiOutlinedInput-notchedOutline': {
                  borderColor: '#10b981',
                },
              },
            }}
          />
        </>
      ) : (
        <TextField
          type="number"
          size="small"
          value={singleValue}
          onChange={(e) => onValueChange(parseInt(e.target.value) || 0)}
          disabled={disabled}
          inputProps={{ min: 0 }}
          sx={{
            width: 80,
            '& .MuiOutlinedInput-root': {
              bgcolor: 'white',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: '#10b981',
              },
            },
          }}
        />
      )}
    </Box>
  );
};
