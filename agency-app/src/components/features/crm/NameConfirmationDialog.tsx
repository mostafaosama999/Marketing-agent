// src/components/features/crm/NameConfirmationDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
} from '@mui/material';
import { PersonOutline as PersonIcon } from '@mui/icons-material';

interface NameConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (firstName: string, lastName: string) => void;
  suggestedFirstName: string;
  suggestedLastName: string;
}

/**
 * NameConfirmationDialog Component
 *
 * Displays when a user enters a full name (e.g., "John Doe") in the name field
 * before Apollo enrichment. Allows user to confirm or edit the name split.
 */
export const NameConfirmationDialog: React.FC<NameConfirmationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  suggestedFirstName,
  suggestedLastName,
}) => {
  const [firstName, setFirstName] = useState(suggestedFirstName);
  const [lastName, setLastName] = useState(suggestedLastName);
  const [error, setError] = useState<string | null>(null);

  // Update fields when suggestions change
  useEffect(() => {
    setFirstName(suggestedFirstName);
    setLastName(suggestedLastName);
    setError(null);
  }, [suggestedFirstName, suggestedLastName, open]);

  const handleConfirm = () => {
    // Validate fields
    if (!firstName.trim()) {
      setError('First name is required');
      return;
    }
    if (!lastName.trim()) {
      setError('Last name is required');
      return;
    }

    // Clear error and confirm
    setError(null);
    onConfirm(firstName.trim(), lastName.trim());
  };

  const handleCancel = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <PersonIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6">Confirm Name for Apollo Enrichment</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ pt: 1 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            We detected a full name in the Name field. Please confirm or edit the first and last name below before searching Apollo.
          </Alert>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <TextField
            label="First Name"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setError(null);
            }}
            fullWidth
            autoFocus
            required
            sx={{ mb: 2 }}
            helperText="The person's given name"
          />

          <TextField
            label="Last Name"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              setError(null);
            }}
            fullWidth
            required
            helperText="The person's family name or surname"
          />

          <Box sx={{ mt: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Apollo will search for: <strong>{firstName} {lastName}</strong>
            </Typography>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleCancel} color="inherit">
          Cancel
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={!firstName.trim() || !lastName.trim()}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #63408b 100%)',
            },
          }}
        >
          Confirm & Search
        </Button>
      </DialogActions>
    </Dialog>
  );
};
