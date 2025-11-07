/**
 * DropdownOptionsEditor Component
 *
 * Allows users to view and edit dropdown options during CSV import field mapping.
 * Shows detected options as chips and allows adding/removing options.
 */

import React, { useState } from 'react';
import {
  Box,
  Chip,
  TextField,
  IconButton,
  Typography,
  Stack,
  Paper,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { validateDropdownOptions } from '../../../services/validation/fieldValidation';

interface DropdownOptionsEditorProps {
  options: string[];
  onChange: (newOptions: string[]) => void;
  label?: string;
  disabled?: boolean;
}

export const DropdownOptionsEditor: React.FC<DropdownOptionsEditorProps> = ({
  options,
  onChange,
  label = 'Dropdown Options',
  disabled = false,
}) => {
  const [newOption, setNewOption] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAddOption = () => {
    const trimmedOption = newOption.trim();

    if (!trimmedOption) {
      setError('Option cannot be empty');
      return;
    }

    // Check for duplicates
    if (options.includes(trimmedOption)) {
      setError('Option already exists');
      return;
    }

    // Add new option
    const updatedOptions = [...options, trimmedOption].sort();
    onChange(updatedOptions);
    setNewOption('');
    setError(null);
  };

  const handleRemoveOption = (optionToRemove: string) => {
    const updatedOptions = options.filter(opt => opt !== optionToRemove);

    // Validate that we have at least one option
    const validation = validateDropdownOptions(updatedOptions);
    if (!validation.isValid) {
      setError(validation.error || 'Must have at least one option');
      return;
    }

    onChange(updatedOptions);
    setError(null);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddOption();
    }
  };

  return (
    <Box>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mb: 1 }}
      >
        {label}
      </Typography>

      <Paper
        variant="outlined"
        sx={{
          p: 2,
          backgroundColor: 'rgba(103, 126, 234, 0.02)',
          borderColor: 'rgba(103, 126, 234, 0.2)',
        }}
      >
        {/* Display current options as chips */}
        <Stack direction="row" spacing={1} flexWrap="wrap" gap={1} mb={2}>
          {options.length === 0 ? (
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              No options detected. Add options below.
            </Typography>
          ) : (
            options.map((option, index) => (
              <Chip
                key={`${option}-${index}`}
                label={option}
                onDelete={disabled ? undefined : () => handleRemoveOption(option)}
                size="small"
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  '& .MuiChip-deleteIcon': {
                    color: 'rgba(255, 255, 255, 0.7)',
                    '&:hover': {
                      color: 'white',
                    },
                  },
                }}
              />
            ))
          )}
        </Stack>

        {/* Add new option */}
        {!disabled && (
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField
              size="small"
              placeholder="Add new option"
              value={newOption}
              onChange={(e) => {
                setNewOption(e.target.value);
                setError(null);
              }}
              onKeyPress={handleKeyPress}
              error={!!error}
              helperText={error}
              fullWidth
              sx={{
                '& .MuiOutlinedInput-root': {
                  '&:hover fieldset': {
                    borderColor: 'rgba(103, 126, 234, 0.5)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: '#667eea',
                  },
                },
              }}
            />
            <Tooltip title="Add option">
              <IconButton
                onClick={handleAddOption}
                disabled={!newOption.trim()}
                sx={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a408e 100%)',
                  },
                  '&:disabled': {
                    background: 'rgba(0, 0, 0, 0.12)',
                    color: 'rgba(0, 0, 0, 0.26)',
                  },
                }}
              >
                <AddIcon />
              </IconButton>
            </Tooltip>
          </Stack>
        )}

        {/* Option count */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: 'block', mt: 1 }}
        >
          {options.length} option{options.length !== 1 ? 's' : ''}
        </Typography>
      </Paper>
    </Box>
  );
};

export default DropdownOptionsEditor;
