import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress, Divider, Alert } from '@mui/material';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getHiringConfig, updateHiringConfig } from '../../services/api/hiringConfig';

export const HiringConfigSection: React.FC = () => {
  const [currentJobPost, setCurrentJobPost] = useState('');
  const [savedValue, setSavedValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getHiringConfig().then((config) => {
      setCurrentJobPost(config.currentJobPost || '');
      setSavedValue(config.currentJobPost || '');
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateHiringConfig({ currentJobPost: currentJobPost.trim() });
      setSavedValue(currentJobPost.trim());
    } catch (err) {
      console.error('Error saving hiring config:', err);
    } finally {
      setSaving(false);
    }
  };

  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<{ matched: number; alreadyFlagged: number; total: number } | null>(null);
  const [syncError, setSyncError] = useState('');

  const handleSyncRecruiter = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError('');
    try {
      const functions = getFunctions();
      const backfill = httpsCallable(functions, 'backfillRecruiterAttributionCloud');
      const result = await backfill();
      setSyncResult(result.data as any);
    } catch (err: any) {
      console.error('Error syncing recruiter attribution:', err);
      setSyncError(err.message || 'Failed to sync');
    } finally {
      setSyncing(false);
    }
  };

  const hasChanges = currentJobPost.trim() !== savedValue;

  if (loading) {
    return <CircularProgress size={24} sx={{ color: '#667eea' }} />;
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Hiring Configuration
      </Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
        Set the current job post label. New applicants from Tally/Webflow will be tagged with this value.
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, maxWidth: 400 }}>
        <TextField
          label="Current Job Post"
          value={currentJobPost}
          onChange={(e) => setCurrentJobPost(e.target.value)}
          size="small"
          placeholder="e.g., 30-40k"
          sx={{ flex: 1 }}
        />
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!hasChanges || saving}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            textTransform: 'none',
            fontWeight: 600,
            '&:disabled': { opacity: 0.5 },
          }}
        >
          {saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Save'}
        </Button>
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
        Recruiter Attribution
      </Typography>
      <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
        Cross-reference the recruiter&apos;s Outreach sheet against applicants to flag recruiter-sourced candidates.
        This also runs automatically every 6 hours.
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Button
          variant="contained"
          onClick={handleSyncRecruiter}
          disabled={syncing}
          sx={{
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            textTransform: 'none',
            fontWeight: 600,
            '&:disabled': { opacity: 0.5 },
          }}
        >
          {syncing ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Sync Now'}
        </Button>
        {syncResult && (
          <Alert severity="success" sx={{ py: 0 }}>
            {syncResult.matched} new match{syncResult.matched !== 1 ? 'es' : ''} found, {syncResult.alreadyFlagged} already flagged, {syncResult.total} total applicants
          </Alert>
        )}
        {syncError && (
          <Alert severity="error" sx={{ py: 0 }}>
            {syncError}
          </Alert>
        )}
      </Box>
    </Box>
  );
};
