// src/components/settings/ReleaseNoteDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  IconButton,
  Typography,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material';
import {
  Close as CloseIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { ReleaseNote, ReleaseNoteFormData } from '../../types/releaseNotes';

interface ReleaseNoteDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ReleaseNoteFormData) => Promise<void>;
  existingNote?: ReleaseNote | null;
  mode: 'create' | 'edit';
}

export const ReleaseNoteDialog: React.FC<ReleaseNoteDialogProps> = ({
  open,
  onClose,
  onSave,
  existingNote,
  mode,
}) => {
  const [version, setVersion] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [highlights, setHighlights] = useState<string[]>(['']);
  const [published, setPublished] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing note data when editing
  useEffect(() => {
    if (mode === 'edit' && existingNote) {
      setVersion(existingNote.version);
      setTitle(existingNote.title);
      setDescription(existingNote.description);
      setHighlights(existingNote.highlights.length > 0 ? existingNote.highlights : ['']);
      setPublished(existingNote.published);
    } else {
      // Reset form for create mode
      setVersion('');
      setTitle('');
      setDescription('');
      setHighlights(['']);
      setPublished(false);
    }
  }, [mode, existingNote, open]);

  // Add new highlight field
  const handleAddHighlight = () => {
    setHighlights([...highlights, '']);
  };

  // Remove highlight at index
  const handleRemoveHighlight = (index: number) => {
    const newHighlights = highlights.filter((_, i) => i !== index);
    // Keep at least one field
    setHighlights(newHighlights.length > 0 ? newHighlights : ['']);
  };

  // Update highlight at index
  const handleHighlightChange = (index: number, value: string) => {
    const newHighlights = [...highlights];
    newHighlights[index] = value;
    setHighlights(newHighlights);
  };

  // Handle save
  const handleSave = async () => {
    // Validation
    if (!version.trim()) {
      alert('Please enter a version number');
      return;
    }
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    // Filter out empty highlights
    const filteredHighlights = highlights.filter(h => h.trim() !== '');

    const formData: ReleaseNoteFormData = {
      version: version.trim(),
      title: title.trim(),
      description: description.trim(),
      highlights: filteredHighlights,
      published,
    };

    try {
      setSaving(true);
      await onSave(formData);
      handleClose();
    } catch (error) {
      console.error('Error saving release note:', error);
      alert('Failed to save release note. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle close and reset
  const handleClose = () => {
    setVersion('');
    setTitle('');
    setDescription('');
    setHighlights(['']);
    setPublished(false);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pb: 2,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {mode === 'create' ? 'Create Release Note' : 'Edit Release Note'}
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Version */}
          <TextField
            label="Version"
            value={version}
            onChange={(e) => setVersion(e.target.value)}
            placeholder="e.g., 1.2.0 or v1.2.0"
            fullWidth
            size="small"
            required
          />

          {/* Title */}
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., New Features & Improvements"
            fullWidth
            size="small"
            required
          />

          {/* Description */}
          <TextField
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Brief overview of this release..."
            fullWidth
            multiline
            rows={3}
            size="small"
          />

          {/* Highlights */}
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b' }}>
                Highlights (Bullet Points)
              </Typography>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={handleAddHighlight}
                sx={{
                  color: '#667eea',
                  '&:hover': {
                    background: 'rgba(102, 126, 234, 0.1)',
                  },
                }}
              >
                Add Highlight
              </Button>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {highlights.map((highlight, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <TextField
                    value={highlight}
                    onChange={(e) => handleHighlightChange(index, e.target.value)}
                    placeholder={`Highlight ${index + 1}...`}
                    fullWidth
                    size="small"
                    multiline
                    maxRows={3}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveHighlight(index)}
                    disabled={highlights.length === 1}
                    sx={{
                      color: '#ef4444',
                      '&:hover': {
                        background: 'rgba(239, 68, 68, 0.1)',
                      },
                      '&.Mui-disabled': {
                        color: '#cbd5e1',
                      },
                    }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          </Box>

          {/* Published Toggle */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              p: 2,
              borderRadius: 2,
              background: published ? 'rgba(102, 126, 234, 0.05)' : 'rgba(100, 116, 139, 0.05)',
              border: published ? '1px solid rgba(102, 126, 234, 0.2)' : '1px solid rgba(100, 116, 139, 0.2)',
            }}
          >
            <Box>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#1e293b', mb: 0.5 }}>
                Publish Release Note
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                {published
                  ? 'This release note will be visible to all users'
                  : 'This release note will be saved as a draft'}
              </Typography>
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={published}
                  onChange={(e) => setPublished(e.target.checked)}
                  sx={{
                    '& .MuiSwitch-switchBase.Mui-checked': {
                      color: '#667eea',
                    },
                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                      backgroundColor: '#667eea',
                    },
                  }}
                />
              }
              label=""
            />
          </Box>

          {/* Status Chip */}
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Chip
              label={published ? 'Published' : 'Draft'}
              size="small"
              sx={{
                background: published
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'linear-gradient(135deg, #94a3b8 0%, #64748b 100%)',
                color: 'white',
                fontWeight: 600,
              }}
            />
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={handleClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6b408e 100%)',
            },
          }}
        >
          {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
