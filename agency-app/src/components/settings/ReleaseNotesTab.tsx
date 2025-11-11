// src/components/settings/ReleaseNotesTab.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { ReleaseNote, ReleaseNoteFormData } from '../../types/releaseNotes';
import {
  getReleaseNotes,
  createReleaseNote,
  updateReleaseNote,
  deleteReleaseNote,
} from '../../services/api/releaseNotesService';
import { ReleaseNoteDialog } from './ReleaseNoteDialog';

export const ReleaseNotesTab: React.FC = () => {
  const { user } = useAuth();
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [selectedNote, setSelectedNote] = useState<ReleaseNote | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<ReleaseNote | null>(null);

  // Load release notes on mount
  useEffect(() => {
    loadReleaseNotes();
  }, []);

  const loadReleaseNotes = async () => {
    try {
      setLoading(true);
      const notes = await getReleaseNotes(false); // Get all notes (published and drafts)
      setReleaseNotes(notes);
    } catch (error) {
      console.error('Error loading release notes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle create new
  const handleCreateClick = () => {
    setDialogMode('create');
    setSelectedNote(null);
    setDialogOpen(true);
  };

  // Handle edit
  const handleEditClick = (note: ReleaseNote) => {
    setDialogMode('edit');
    setSelectedNote(note);
    setDialogOpen(true);
  };

  // Handle delete click
  const handleDeleteClick = (note: ReleaseNote) => {
    setNoteToDelete(note);
    setDeleteDialogOpen(true);
  };

  // Handle save (create or update)
  const handleSave = async (data: ReleaseNoteFormData) => {
    if (!user) return;

    try {
      if (dialogMode === 'create') {
        await createReleaseNote(data, user.uid);
      } else if (selectedNote) {
        await updateReleaseNote(selectedNote.id, data, user.uid);
      }

      // Reload the list
      await loadReleaseNotes();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving release note:', error);
      throw error;
    }
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!noteToDelete) return;

    try {
      await deleteReleaseNote(noteToDelete.id);
      await loadReleaseNotes();
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    } catch (error) {
      console.error('Error deleting release note:', error);
      alert('Failed to delete release note. Please try again.');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Typography color="text.secondary">Loading release notes...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
            Release Notes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage release notes that appear in the CRM banner
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateClick}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6b408e 100%)',
            },
          }}
        >
          Create Release Note
        </Button>
      </Box>

      {/* Table */}
      {releaseNotes.length === 0 ? (
        <Box
          sx={{
            p: 6,
            textAlign: 'center',
            border: '2px dashed #e2e8f0',
            borderRadius: 2,
          }}
        >
          <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
            No release notes yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Create your first release note to inform users about new features and updates
          </Typography>
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleCreateClick}
            sx={{
              borderColor: '#667eea',
              color: '#667eea',
              '&:hover': {
                borderColor: '#5568d3',
                background: 'rgba(102, 126, 234, 0.05)',
              },
            }}
          >
            Create Release Note
          </Button>
        </Box>
      ) : (
        <TableContainer
          component={Paper}
          sx={{
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            borderRadius: 2,
          }}
        >
          <Table>
            <TableHead sx={{ bgcolor: '#fafafa' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 600 }}>Version</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Title</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Created</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>Highlights</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>
                  Actions
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {releaseNotes.map((note) => (
                <TableRow
                  key={note.id}
                  sx={{
                    '&:hover': {
                      bgcolor: 'rgba(102, 126, 234, 0.02)',
                    },
                  }}
                >
                  <TableCell>
                    <Chip
                      label={note.version}
                      size="small"
                      sx={{
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        fontWeight: 600,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {note.title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={note.published ? 'Published' : 'Draft'}
                      size="small"
                      sx={{
                        bgcolor: note.published ? '#dcfce7' : '#f3f4f6',
                        color: note.published ? '#16a34a' : '#6b7280',
                        fontWeight: 500,
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {note.createdAt.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {note.highlights.length} {note.highlights.length === 1 ? 'item' : 'items'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      <IconButton
                        size="small"
                        onClick={() => handleEditClick(note)}
                        sx={{
                          color: '#667eea',
                          '&:hover': {
                            background: 'rgba(102, 126, 234, 0.1)',
                          },
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleDeleteClick(note)}
                        sx={{
                          color: '#ef4444',
                          '&:hover': {
                            background: 'rgba(239, 68, 68, 0.1)',
                          },
                        }}
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Create/Edit Dialog */}
      <ReleaseNoteDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSave}
        existingNote={selectedNote}
        mode={dialogMode}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Release Note</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete the release note{' '}
            <strong>{noteToDelete?.version}</strong>? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
