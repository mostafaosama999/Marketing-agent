// src/components/settings/GmailIntegrationTab.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Email as EmailIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { checkGmailConnection, getGmailAuthUrl } from '../../services/api/gmailService';

export const GmailIntegrationTab: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [hasComposePermission, setHasComposePermission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connectionMessage, setConnectionMessage] = useState('');

  // Check connection status on mount
  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await checkGmailConnection();
      setConnected(result.connected);
      setHasComposePermission(result.hasComposePermission || false);
      setConnectionMessage(result.message);
    } catch (err: any) {
      console.error('Error checking Gmail connection:', err);
      setError(err.message || 'Failed to check connection status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      const authUrl = await getGmailAuthUrl();

      // Open OAuth URL in new window
      window.open(authUrl, '_blank', 'width=600,height=700');

      // Show instructions
      alert(
        'A new window has opened for Gmail authorization.\n\n' +
        'After authorizing:\n' +
        '1. You\'ll be redirected back to the app\n' +
        '2. Click "Refresh Status" below to verify the connection\n\n' +
        'Make sure to grant the "Manage drafts and send emails" permission!'
      );
    } catch (err: any) {
      console.error('Error initiating Gmail OAuth:', err);
      setError(err.message || 'Failed to start connection process');
    } finally {
      setConnecting(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ maxWidth: 800 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 600 }}>
        Gmail Integration
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Connection Status */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <EmailIcon sx={{ fontSize: 40, color: connected ? '#10b981' : '#94a3b8', mr: 2 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Gmail Account: mostafa.moqbel.ibrahim@gmail.com
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <Chip
                icon={connected ? <CheckCircleIcon /> : <CancelIcon />}
                label={connected ? 'Connected' : 'Not Connected'}
                color={connected ? 'success' : 'default'}
                size="small"
              />
              {connectionMessage && (
                <Typography variant="body2" color="text.secondary">
                  {connectionMessage}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Permissions */}
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Required Permissions:
        </Typography>
        <List dense>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText
              primary="Read emails (gmail.readonly)"
              secondary="View your email messages and settings"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon sx={{ minWidth: 36 }}>
              <CheckCircleIcon sx={{ color: '#10b981', fontSize: 20 }} />
            </ListItemIcon>
            <ListItemText
              primary="Manage drafts and send emails (gmail.compose)"
              secondary="Create drafts in your Gmail account"
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 2 }} />

        {/* Actions */}
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={connecting ? <CircularProgress size={20} /> : <EmailIcon />}
            onClick={handleConnect}
            disabled={connecting}
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              fontWeight: 600,
              textTransform: 'none',
              '&:hover': {
                background: 'linear-gradient(135deg, #5568d3 0%, #6a3f8f 100%)',
              },
            }}
          >
            {connected ? 'Reconnect Gmail' : 'Connect Gmail'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={checkConnection}
            sx={{ textTransform: 'none', fontWeight: 600 }}
          >
            Refresh Status
          </Button>
        </Box>
      </Paper>

      {/* Important Note */}
      <Alert severity="info">
        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Important: Re-authentication Required
        </Typography>
        <Typography variant="body2">
          If you previously connected Gmail before the draft creation feature was added,
          you <strong>must reconnect</strong> to grant the new "Manage drafts and send emails" permission.
          This is required for creating Gmail drafts for leads.
        </Typography>
      </Alert>

      {/* Features */}
      <Paper sx={{ p: 3, mt: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
          What you can do with Gmail integration:
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon sx={{ color: '#10b981' }} />
            </ListItemIcon>
            <ListItemText
              primary="Create Gmail Drafts"
              secondary="Create personalized email drafts for leads using your offer templates"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon sx={{ color: '#10b981' }} />
            </ListItemIcon>
            <ListItemText
              primary="Bulk Draft Creation"
              secondary="Select multiple leads and create drafts for all of them at once"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon sx={{ color: '#10b981' }} />
            </ListItemIcon>
            <ListItemText
              primary="Template Variables"
              secondary="Automatically populate drafts with lead and company information"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <CheckCircleIcon sx={{ color: '#10b981' }} />
            </ListItemIcon>
            <ListItemText
              primary="Track Outreach"
              secondary="Keep track of when drafts were created for each lead"
            />
          </ListItem>
        </List>
      </Paper>
    </Box>
  );
};
