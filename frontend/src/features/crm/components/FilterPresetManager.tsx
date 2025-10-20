import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Typography,
  Divider,
} from '@mui/material';
import {
  BookmarkBorder as BookmarkIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { FilterPreset } from '../../../app/types/filters';

interface FilterPresetManagerProps {
  presets: FilterPreset[];
  onLoadPreset: (id: string) => void;
  onSavePreset: (name: string) => void;
  onDeletePreset: (id: string) => void;
  hasActiveFilters: boolean;
}

export const FilterPresetManager: React.FC<FilterPresetManagerProps> = ({
  presets,
  onLoadPreset,
  onSavePreset,
  onDeletePreset,
  hasActiveFilters,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [error, setError] = useState('');

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleOpenSaveDialog = () => {
    setPresetName('');
    setError('');
    setSaveDialogOpen(true);
    handleCloseMenu();
  };

  const handleCloseSaveDialog = () => {
    setSaveDialogOpen(false);
    setPresetName('');
    setError('');
  };

  const handleSavePreset = () => {
    if (!presetName.trim()) {
      setError('Preset name cannot be empty');
      return;
    }

    if (presets.some(p => p.name.toLowerCase() === presetName.trim().toLowerCase())) {
      setError('A preset with this name already exists');
      return;
    }

    try {
      onSavePreset(presetName.trim());
      handleCloseSaveDialog();
    } catch (err: any) {
      setError(err.message || 'Failed to save preset');
    }
  };

  const handleLoadPreset = (id: string) => {
    onLoadPreset(id);
    handleCloseMenu();
  };

  const handleDeletePreset = (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this preset?')) {
      onDeletePreset(id);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <Box>
      {/* Presets Menu Button */}
      <Button
        startIcon={<BookmarkIcon />}
        onClick={handleOpenMenu}
        size="small"
        variant="outlined"
      >
        Presets {presets.length > 0 && `(${presets.length})`}
      </Button>

      {/* Presets Dropdown Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleCloseMenu}
        PaperProps={{
          sx: {
            maxHeight: 400,
            width: 320,
          },
        }}
      >
        {/* Save Current Filters */}
        <MenuItem
          onClick={handleOpenSaveDialog}
          disabled={!hasActiveFilters}
        >
          <AddIcon fontSize="small" sx={{ mr: 1 }} />
          Save Current Filters
        </MenuItem>

        {presets.length > 0 && <Divider />}

        {/* Preset List */}
        {presets.length === 0 ? (
          <MenuItem disabled>
            <Typography variant="body2" color="text.secondary">
              No saved presets
            </Typography>
          </MenuItem>
        ) : (
          presets.map(preset => (
            <MenuItem
              key={preset.id}
              onClick={() => handleLoadPreset(preset.id)}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="body2" fontWeight={600}>
                  {preset.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {preset.conditions.length} filters • {formatDate(preset.createdAt)}
                </Typography>
              </Box>
              <IconButton
                size="small"
                color="error"
                onClick={(e) => handleDeletePreset(preset.id, e)}
                sx={{ ml: 1 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </MenuItem>
          ))
        )}
      </Menu>

      {/* Save Preset Dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={handleCloseSaveDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Save Filter Preset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Preset Name"
            value={presetName}
            onChange={(e) => {
              setPresetName(e.target.value);
              setError('');
            }}
            error={Boolean(error)}
            helperText={error || 'Give your preset a memorable name'}
            margin="dense"
            variant="outlined"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSavePreset();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseSaveDialog}>Cancel</Button>
          <Button
            onClick={handleSavePreset}
            variant="contained"
            disabled={!presetName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
