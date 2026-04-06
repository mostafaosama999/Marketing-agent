import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, CircularProgress } from '@mui/material';
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
    </Box>
  );
};
