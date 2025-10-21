// src/components/features/crm/filters/SearchFilter.tsx
import React, { useState, useEffect } from 'react';
import {
  TextField,
  InputAdornment,
  IconButton,
  Box,
} from '@mui/material';
import { Search as SearchIcon, Clear as ClearIcon } from '@mui/icons-material';

interface SearchFilterProps {
  value: string;
  onChange: (searchTerm: string) => void;
  placeholder?: string;
  debounceMs?: number;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  value,
  onChange,
  placeholder = 'Search leads...',
  debounceMs = 300,
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onChange(localValue);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [localValue, debounceMs, onChange]);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleClear = () => {
    setLocalValue('');
    onChange('');
  };

  return (
    <Box sx={{ minWidth: 250 }}>
      <TextField
        fullWidth
        size="small"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon sx={{ color: '#667eea', fontSize: '20px' }} />
            </InputAdornment>
          ),
          endAdornment: localValue && (
            <InputAdornment position="end">
              <IconButton
                size="small"
                onClick={handleClear}
                edge="end"
                sx={{
                  color: '#64748b',
                  '&:hover': {
                    bgcolor: 'rgba(103, 126, 234, 0.1)',
                    color: '#667eea',
                  },
                }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        }}
        sx={{
          '& .MuiOutlinedInput-root': {
            background: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
            '& fieldset': {
              borderColor: '#e2e8f0',
              borderWidth: '1.5px',
            },
            '&:hover fieldset': {
              borderColor: '#667eea',
              borderWidth: '1.5px',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#667eea',
              borderWidth: '2px',
              boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)',
            },
          },
          '& .MuiInputBase-input': {
            fontSize: '14px',
            fontWeight: 500,
            color: '#1e293b',
            '&::placeholder': {
              color: '#94a3b8',
              opacity: 1,
              fontWeight: 400,
            },
          },
        }}
      />
    </Box>
  );
};
