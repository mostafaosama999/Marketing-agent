/**
 * DropdownMenuWithAdd Component
 *
 * A wrapper component that renders a dropdown menu with:
 * - Manageable dropdown items (with three-dot menus)
 * - A "+" button at the bottom to add new values inline
 */

import React, { useState } from 'react';
import {
  MenuItem,
  TextField,
  Button,
  Box,
  CircularProgress,
  Divider,
  Typography,
  IconButton,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import { DropdownFieldManager } from './DropdownFieldManager';
import { EntityType } from '../../../types/fieldDefinitions';
import { useAuth } from '../../../contexts/AuthContext';
import {
  getFieldDefinitionByName,
  updateDropdownOptions,
} from '../../../services/api/fieldDefinitionsService';

export interface DropdownOption {
  value: string;
  label: string;
  chipSx?: any;
}

interface DropdownMenuWithAddProps {
  /** Array of dropdown options */
  options: DropdownOption[];
  /** Currently selected value */
  selectedValue?: string;
  /** Callback when an option is selected */
  onSelect: (value: string) => void;
  /** Entity type (lead or company) */
  entityType: EntityType;
  /** Field name for custom fields, or special names like 'pipeline_status', 'linkedin_status', 'email_status' */
  fieldName: string;
  /** Callback after successful add/rename/delete */
  onUpdate?: () => void;
  /** Whether to show management features (three-dot menus and add button) */
  showManagement?: boolean;
  /** Whether to allow adding new values */
  allowAdd?: boolean;
}

export const DropdownMenuWithAdd: React.FC<DropdownMenuWithAddProps> = ({
  options,
  selectedValue,
  onSelect,
  entityType,
  fieldName,
  onUpdate,
  showManagement = true,
  allowAdd = true,
}) => {
  const { user } = useAuth();
  const [isAdding, setIsAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle add button click
  const handleAddClick = () => {
    setIsAdding(true);
    setNewValue('');
    setError(null);
  };

  // Handle cancel add
  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewValue('');
    setError(null);
  };

  // Handle save new value
  const handleSaveAdd = async () => {
    if (!user) return;

    const trimmedValue = newValue.trim();

    // Validation
    if (!trimmedValue) {
      setError('Value cannot be empty');
      return;
    }

    // Check for duplicates
    if (options.some(opt => opt.value === trimmedValue)) {
      setError('This value already exists');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Get field definition
      const fieldDefinition = await getFieldDefinitionByName(entityType, fieldName);

      if (!fieldDefinition) {
        setError('Field definition not found');
        setLoading(false);
        return;
      }

      // Add new value to options
      const currentOptions = fieldDefinition.options || [];
      const updatedOptions = [...currentOptions, trimmedValue].sort();

      // Update field definition
      await updateDropdownOptions(fieldDefinition.id, updatedOptions, user.uid);

      // Reset state
      setIsAdding(false);
      setNewValue('');
      setLoading(false);

      // Trigger update callback
      onUpdate?.();
    } catch (err) {
      console.error('Error adding dropdown value:', err);
      setError(err instanceof Error ? err.message : 'Failed to add value');
      setLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveAdd();
    } else if (e.key === 'Escape') {
      handleCancelAdd();
    }
  };

  return (
    <>
      {/* Clear option */}
      <MenuItem
        onClick={() => onSelect('')}
        sx={{
          fontStyle: 'italic',
          color: 'text.secondary',
          fontSize: '14px',
        }}
      >
        <em>Clear / Not Set</em>
      </MenuItem>

      {/* Divider after clear option */}
      {options.length > 0 && <Divider sx={{ my: 0.5 }} />}

      {/* Render existing options */}
      {options.map((option) => (
        <DropdownFieldManager
          key={option.value}
          value={option.value}
          label={option.label}
          entityType={entityType}
          fieldName={fieldName}
          isSelected={selectedValue === option.value}
          onSelect={() => onSelect(option.value)}
          chipSx={option.chipSx}
          onUpdate={onUpdate}
          showManagement={showManagement}
        />
      ))}

      {/* Divider before add section */}
      {showManagement && allowAdd && options.length > 0 && (
        <Divider sx={{ my: 0.5 }} />
      )}

      {/* Add new value section */}
      {showManagement && allowAdd && (
        <>
          {isAdding ? (
            <MenuItem
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: 1,
                py: 1.5,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <TextField
                autoFocus
                size="small"
                placeholder="Enter new value"
                value={newValue}
                onChange={(e) => {
                  setNewValue(e.target.value);
                  setError(null);
                }}
                onKeyDown={handleKeyPress}
                error={!!error}
                helperText={error}
                disabled={loading}
                fullWidth
                sx={{
                  '& .MuiOutlinedInput-root': {
                    fontSize: '14px',
                    '&:hover fieldset': {
                      borderColor: 'rgba(103, 126, 234, 0.5)',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                    },
                  },
                }}
              />
              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                <Button
                  size="small"
                  onClick={handleCancelAdd}
                  disabled={loading}
                  startIcon={<CloseIcon />}
                  sx={{
                    color: 'text.secondary',
                    fontSize: '12px',
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleSaveAdd}
                  disabled={loading || !newValue.trim()}
                  startIcon={loading ? <CircularProgress size={14} /> : <CheckIcon />}
                  sx={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    fontSize: '12px',
                  }}
                >
                  Save
                </Button>
              </Box>
            </MenuItem>
          ) : (
            <MenuItem
              onClick={handleAddClick}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'rgba(103, 126, 234, 0.08)',
                },
              }}
            >
              <IconButton
                size="small"
                sx={{
                  width: 24,
                  height: 24,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6b408e 100%)',
                  },
                }}
              >
                <AddIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <Typography variant="body2" sx={{ fontSize: '14px', fontWeight: 500 }}>
                Add new value
              </Typography>
            </MenuItem>
          )}
        </>
      )}
    </>
  );
};

export default DropdownMenuWithAdd;
