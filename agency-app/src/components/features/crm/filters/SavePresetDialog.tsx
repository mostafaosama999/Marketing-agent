// src/components/features/crm/filters/SavePresetDialog.tsx
import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  CircularProgress,
} from '@mui/material';
import { SavePresetRequest } from '../../../../types/filter';
import { saveFilterPreset } from '../../../../services/api/filterPresetsService';

interface SavePresetDialogProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  currentPreset: SavePresetRequest;
}

export const SavePresetDialog: React.FC<SavePresetDialogProps> = ({
  open,
  onClose,
  userId,
  currentPreset,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    // Validate
    if (!name.trim()) {
      setError('Please enter a preset name');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const presetToSave: SavePresetRequest = {
        ...currentPreset,
        name: name.trim(),
        description: description.trim() || undefined,
        isDefault,
      };

      await saveFilterPreset(userId, presetToSave);

      // Reset form and close
      setName('');
      setDescription('');
      setIsDefault(false);
      onClose();
    } catch (err) {
      console.error('Error saving preset:', err);
      setError('Failed to save preset. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    if (!saving) {
      setName('');
      setDescription('');
      setIsDefault(false);
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        },
      }}
    >
      <DialogTitle
        sx={{
          fontWeight: 600,
          fontSize: '1.25rem',
          color: '#1e293b',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        Save Filter Preset
      </DialogTitle>

      <DialogContent sx={{ pt: 4, pb: 2, px: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          {/* Name Field */}
          <TextField
            label="Preset Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., High Priority Leads"
            fullWidth
            required
            autoFocus
            error={Boolean(error && !name.trim())}
            helperText={error && !name.trim() ? error : ''}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: '#667eea',
                },
              },
              '& .MuiInputLabel-root': {
                backgroundColor: 'white',
                px: 0.5,
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#667eea',
              },
            }}
          />

          {/* Description Field */}
          <TextField
            label="Description (Optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief description of this filter preset"
            fullWidth
            multiline
            rows={2}
            variant="outlined"
            sx={{
              '& .MuiOutlinedInput-root': {
                '&.Mui-focused fieldset': {
                  borderColor: '#667eea',
                },
              },
              '& .MuiInputLabel-root': {
                backgroundColor: 'white',
                px: 0.5,
              },
              '& .MuiInputLabel-root.Mui-focused': {
                color: '#667eea',
              },
            }}
          />

          {/* Default Checkbox */}
          <FormControlLabel
            control={
              <Checkbox
                checked={isDefault}
                onChange={(e) => setIsDefault(e.target.checked)}
                sx={{
                  color: '#667eea',
                  '&.Mui-checked': {
                    color: '#667eea',
                  },
                }}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Set as default preset
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  This preset will be automatically applied when you open the CRM
                </Typography>
              </Box>
            }
          />

          {/* Preview Summary */}
          <Box
            sx={{
              p: 2,
              bgcolor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, mb: 1, display: 'block' }}>
              PRESET INCLUDES
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                • {currentPreset.advancedRules.length} filter rule(s)
              </Typography>
              <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                • View mode: {currentPreset.viewMode === 'board' ? 'Board' : 'Table'}
              </Typography>
              {currentPreset.tableColumns && (
                <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                  • Table column preferences
                </Typography>
              )}
            </Box>
          </Box>

          {/* Error Message */}
          {error && name.trim() && (
            <Typography variant="body2" sx={{ color: '#ef4444', fontSize: '0.85rem' }}>
              {error}
            </Typography>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          borderTop: '1px solid #e2e8f0',
        }}
      >
        <Button
          onClick={handleClose}
          disabled={saving}
          sx={{
            textTransform: 'none',
            color: '#64748b',
            fontWeight: 600,
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || !name.trim()}
          variant="contained"
          sx={{
            textTransform: 'none',
            bgcolor: '#667eea',
            fontWeight: 600,
            px: 3,
            '&:hover': {
              bgcolor: '#5568d3',
            },
            '&.Mui-disabled': {
              bgcolor: '#cbd5e1',
              color: 'white',
            },
          }}
        >
          {saving ? (
            <>
              <CircularProgress size={16} sx={{ mr: 1, color: 'white' }} />
              Saving...
            </>
          ) : (
            'Save Preset'
          )}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
