import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Box,
  Typography,
  Menu,
  MenuItem,
  IconButton,
  TextField,
  Divider,
} from '@mui/material';
import {
  BookmarkBorder as BookmarkIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import {
  ApolloTitlePreset,
  loadApolloPresets,
  saveApolloPresets,
  createPreset,
} from '../../../app/types/apolloPresets';

interface TitleSelectionDialogProps {
  open: boolean;
  companyName: string;
  onClose: () => void;
  onSearch: (selectedTitles: string[]) => void;
}

// Pre-defined common content and marketing titles
const COMMON_TITLES = [
  'Content Manager',
  'Head of Content',
  'Director of Content',
  'Content Marketing Manager',
  'Content Strategist',
  'Technical Writer',
  'Developer Advocate',
  'Developer Relations',
  'Community Manager',
  'Marketing Manager',
  'Head of Marketing',
  'VP of Marketing',
  'Chief Marketing Officer (CMO)',
];

export const TitleSelectionDialog: React.FC<TitleSelectionDialogProps> = ({
  open,
  companyName,
  onClose,
  onSearch,
}) => {
  const [selectedTitles, setSelectedTitles] = useState<Set<string>>(new Set());

  // Preset management
  const [presets, setPresets] = useState<ApolloTitlePreset[]>([]);
  const [presetMenuAnchor, setPresetMenuAnchor] = useState<null | HTMLElement>(null);
  const [savePresetDialogOpen, setSavePresetDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const [presetNameError, setPresetNameError] = useState('');

  // Load presets on mount
  useEffect(() => {
    setPresets(loadApolloPresets());
  }, []);

  const handleToggle = (title: string) => {
    setSelectedTitles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(title)) {
        newSet.delete(title);
      } else {
        newSet.add(title);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    setSelectedTitles(new Set(COMMON_TITLES));
  };

  const handleDeselectAll = () => {
    setSelectedTitles(new Set());
  };

  const handleSearch = () => {
    onSearch(Array.from(selectedTitles));
    // Don't close the dialog - parent component will handle it
  };

  const handleClose = () => {
    setSelectedTitles(new Set());
    onClose();
  };

  // Preset menu handlers
  const handleOpenPresetMenu = (event: React.MouseEvent<HTMLElement>) => {
    setPresetMenuAnchor(event.currentTarget);
  };

  const handleClosePresetMenu = () => {
    setPresetMenuAnchor(null);
  };

  const handleLoadPreset = (preset: ApolloTitlePreset) => {
    setSelectedTitles(new Set(preset.titles));
    handleClosePresetMenu();
  };

  const handleDeletePreset = (presetId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (window.confirm('Are you sure you want to delete this preset?')) {
      const updatedPresets = presets.filter(p => p.id !== presetId);
      setPresets(updatedPresets);
      saveApolloPresets(updatedPresets);
    }
  };

  // Save preset handlers
  const handleOpenSaveDialog = () => {
    setNewPresetName('');
    setPresetNameError('');
    setSavePresetDialogOpen(true);
  };

  const handleCloseSaveDialog = () => {
    setSavePresetDialogOpen(false);
    setNewPresetName('');
    setPresetNameError('');
  };

  const handleSavePreset = () => {
    // Validation
    if (!newPresetName.trim()) {
      setPresetNameError('Preset name cannot be empty');
      return;
    }

    if (presets.some(p => p.name.toLowerCase() === newPresetName.trim().toLowerCase())) {
      setPresetNameError('A preset with this name already exists');
      return;
    }

    if (selectedTitles.size === 0) {
      setPresetNameError('Please select at least one title');
      return;
    }

    // Create and save preset
    const newPreset = createPreset(newPresetName, Array.from(selectedTitles));
    const updatedPresets = [...presets, newPreset];
    setPresets(updatedPresets);
    saveApolloPresets(updatedPresets);

    handleCloseSaveDialog();
  };

  return (
    <>
      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>Find Leads by Title at {companyName}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Select the job titles you want to search for at {companyName}.
            Apollo will return people matching these titles at this company.
          </Typography>

          {/* Load Preset Button */}
          {presets.length > 0 && (
            <Box sx={{ my: 2 }}>
              <Button
                startIcon={<BookmarkIcon />}
                onClick={handleOpenPresetMenu}
                variant="outlined"
                size="small"
                fullWidth
              >
                Load Preset ({presets.length} saved)
              </Button>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, my: 2 }}>
            <Button size="small" onClick={handleSelectAll} variant="outlined">
              Select All
            </Button>
            <Button size="small" onClick={handleDeselectAll} variant="outlined">
              Deselect All
            </Button>
          </Box>

          <FormGroup>
            {COMMON_TITLES.map((title) => (
              <FormControlLabel
                key={title}
                control={
                  <Checkbox
                    checked={selectedTitles.has(title)}
                    onChange={() => handleToggle(title)}
                  />
                }
                label={title}
              />
            ))}
          </FormGroup>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
            {selectedTitles.size} title{selectedTitles.size !== 1 ? 's' : ''} selected
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button
            onClick={handleOpenSaveDialog}
            startIcon={<AddIcon />}
            disabled={selectedTitles.size === 0}
          >
            Save Preset
          </Button>
          <Button
            onClick={handleSearch}
            variant="contained"
            disabled={selectedTitles.size === 0}
          >
            Search Apollo
          </Button>
        </DialogActions>
      </Dialog>

      {/* Preset Dropdown Menu */}
      <Menu
        anchorEl={presetMenuAnchor}
        open={Boolean(presetMenuAnchor)}
        onClose={handleClosePresetMenu}
        PaperProps={{
          sx: {
            maxHeight: 400,
            width: 320,
          },
        }}
      >
        {presets.map(preset => (
          <MenuItem
            key={preset.id}
            onClick={() => handleLoadPreset(preset)}
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2" fontWeight={600}>
                {preset.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {preset.titles.length} title{preset.titles.length !== 1 ? 's' : ''}
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
        ))}
      </Menu>

      {/* Save Preset Dialog */}
      <Dialog
        open={savePresetDialogOpen}
        onClose={handleCloseSaveDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Save Title Preset</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Preset Name"
            value={newPresetName}
            onChange={(e) => {
              setNewPresetName(e.target.value);
              setPresetNameError('');
            }}
            error={Boolean(presetNameError)}
            helperText={presetNameError || `Saving ${selectedTitles.size} selected title${selectedTitles.size !== 1 ? 's' : ''}`}
            margin="dense"
            variant="outlined"
            placeholder="e.g., Content Team, Marketing Leaders"
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
            disabled={!newPresetName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
