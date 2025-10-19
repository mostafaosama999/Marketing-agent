import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
  Typography,
} from '@mui/material';
import { Lock as LockIcon } from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';

interface LoginDialogProps {
  open: boolean;
}

export const LoginDialog: React.FC<LoginDialogProps> = ({ open }) => {
  const { signIn, loading, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    if (!email || !password) {
      setLocalError('Please enter both email and password');
      return;
    }

    try {
      await signIn({ email, password });
      // Success - dialog will close automatically via AuthContext state change
      setEmail('');
      setPassword('');
    } catch (err) {
      // Error already set in AuthContext
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e as any);
    }
  };

  return (
    <Dialog
      open={open}
      maxWidth="xs"
      fullWidth
      disableEscapeKeyDown
      onClose={(_, reason) => {
        // Prevent closing on backdrop click or escape key
        if (reason === 'backdropClick' || reason === 'escapeKeyDown') {
          return;
        }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
          <LockIcon color="primary" />
          <Typography variant="h6">Sign In Required</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            pt: 1,
          }}
        >
          {(error || localError) && (
            <Alert severity="error">
              {localError || error}
            </Alert>
          )}

          <TextField
            label="Email"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            autoFocus
            required
          />

          <TextField
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            required
          />

          <Button
            type="submit"
            variant="contained"
            fullWidth
            size="large"
            disabled={loading || !email || !password}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {loading ? 'Signing In...' : 'Sign In'}
          </Button>

          <Typography variant="caption" color="text.secondary" sx={{ textAlign: 'center' }}>
            Contact your administrator to create an account
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};
