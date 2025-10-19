import React, { useState } from 'react';
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
} from '@mui/material';

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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Find Leads by Title at {companyName}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Select the job titles you want to search for at {companyName}.
          Apollo will return people matching these titles at this company.
        </Typography>

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
          onClick={handleSearch}
          variant="contained"
          disabled={selectedTitles.size === 0}
        >
          Search Apollo
        </Button>
      </DialogActions>
    </Dialog>
  );
};
