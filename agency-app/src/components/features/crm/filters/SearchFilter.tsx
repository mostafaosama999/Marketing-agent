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
              <SearchIcon sx={{ color: '#64748b', fontSize: '20px' }} />
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
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.3)',
            },
            '&:hover fieldset': {
              borderColor: '#667eea',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#667eea',
            },
          },
          '& .MuiInputBase-input': {
            fontSize: '14px',
            '&::placeholder': {
              color: '#94a3b8',
              opacity: 1,
            },
          },
        }}
      />
    </Box>
  );
};
