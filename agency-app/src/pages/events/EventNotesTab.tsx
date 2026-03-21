// src/pages/events/EventNotesTab.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

interface EventNotesTabProps {
  notes: string;
  onSave: (notes: string) => void;
}

export const EventNotesTab: React.FC<EventNotesTabProps> = ({ notes, onSave }) => {
  const [editing, setEditing] = useState(false);
  const [localNotes, setLocalNotes] = useState(notes);

  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  const handleSave = () => {
    onSave(localNotes);
    setEditing(false);
  };

  const handleToggle = () => {
    if (editing) {
      handleSave();
    } else {
      setEditing(true);
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#1e293b' }}>
          Notes
        </Typography>
        <Button
          startIcon={editing ? <SaveIcon /> : <EditIcon />}
          variant={editing ? 'contained' : 'outlined'}
          onClick={handleToggle}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            ...(editing
              ? {
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
                  },
                }
              : {
                  borderColor: '#667eea',
                  color: '#667eea',
                  '&:hover': {
                    borderColor: '#5568d3',
                    bgcolor: 'rgba(102, 126, 234, 0.08)',
                  },
                }),
          }}
        >
          {editing ? 'Save' : 'Edit'}
        </Button>
      </Box>

      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderRadius: 2.5,
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(0, 0, 0, 0.06)',
          minHeight: 300,
        }}
      >
        {editing ? (
          <TextField
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            multiline
            fullWidth
            minRows={12}
            placeholder="Add your notes about this event here..."
            variant="standard"
            InputProps={{
              disableUnderline: true,
              sx: {
                fontSize: '14px',
                lineHeight: 1.8,
                color: '#1e293b',
                fontFamily: '"Inter", sans-serif',
              },
            }}
          />
        ) : (
          <Typography
            variant="body2"
            sx={{
              color: localNotes ? '#475569' : '#94a3b8',
              lineHeight: 1.8,
              whiteSpace: 'pre-wrap',
              fontStyle: localNotes ? 'normal' : 'italic',
            }}
          >
            {localNotes || 'No notes yet. Click Edit to add notes.'}
          </Typography>
        )}
      </Paper>
    </Box>
  );
};
