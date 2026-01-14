// Dialog for editing inbound KPIs for a specific month

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
  Rating,
  InputAdornment,
  CircularProgress,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Language as WebsiteIcon,
  LinkedIn as LinkedInIcon,
  Visibility as ImpressionsIcon,
  Article as PostsIcon,
  People as FollowersIcon,
} from '@mui/icons-material';
import { useAuth } from '../../../contexts/AuthContext';
import { InboundKPIData, InboundKPIFormData } from '../../../types/inboundKPIs';
import { updateInboundKPI, getInboundKPI } from '../../../services/api/inboundKPIs';

interface InboundKPIDialogProps {
  open: boolean;
  onClose: () => void;
  month: string; // YYYY-MM format
  monthLabel: string; // "Jan 2026" format
  existingData?: InboundKPIData;
  onSaved?: () => void;
}

export const InboundKPIDialog: React.FC<InboundKPIDialogProps> = ({
  open,
  onClose,
  month,
  monthLabel,
  existingData,
  onSaved,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<InboundKPIFormData>({
    websiteQuality: '',
    linkedInQuality: '',
    impressions: '',
    posts: '',
    followers: '',
  });

  // Load existing data when dialog opens
  useEffect(() => {
    if (open) {
      if (existingData) {
        setFormData({
          websiteQuality: existingData.websiteQuality ?? '',
          linkedInQuality: existingData.linkedInQuality ?? '',
          impressions: existingData.impressions ?? '',
          posts: existingData.posts ?? '',
          followers: existingData.followers ?? '',
        });
      } else {
        // Fetch from Firebase if not provided
        setLoading(true);
        getInboundKPI(month)
          .then((data) => {
            if (data) {
              setFormData({
                websiteQuality: data.websiteQuality ?? '',
                linkedInQuality: data.linkedInQuality ?? '',
                impressions: data.impressions ?? '',
                posts: data.posts ?? '',
                followers: data.followers ?? '',
              });
            } else {
              // Reset form for new entry
              setFormData({
                websiteQuality: '',
                linkedInQuality: '',
                impressions: '',
                posts: '',
                followers: '',
              });
            }
          })
          .catch((err) => {
            console.error('Error loading inbound KPI:', err);
            setError('Failed to load existing data');
          })
          .finally(() => {
            setLoading(false);
          });
      }
      setError(null);
    }
  }, [open, month, existingData]);

  const handleNumberChange = (field: keyof InboundKPIFormData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setFormData((prev) => ({
        ...prev,
        [field]: value === '' ? '' : parseInt(value, 10),
      }));
    }
  };

  const handleRatingChange = (field: 'websiteQuality' | 'linkedInQuality') => (
    _event: React.SyntheticEvent,
    newValue: number | null
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: newValue ?? '',
    }));
  };

  const handleSave = async () => {
    if (!user) {
      setError('You must be logged in to save');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await updateInboundKPI(
        month,
        {
          websiteQuality: formData.websiteQuality === '' ? undefined : formData.websiteQuality as number,
          linkedInQuality: formData.linkedInQuality === '' ? undefined : formData.linkedInQuality as number,
          impressions: formData.impressions === '' ? undefined : formData.impressions as number,
          posts: formData.posts === '' ? undefined : formData.posts as number,
          followers: formData.followers === '' ? undefined : formData.followers as number,
        },
        user.uid
      );

      onSaved?.();
      onClose();
    } catch (err) {
      console.error('Error saving inbound KPI:', err);
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          pb: 2,
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Edit Inbound Metrics
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748b' }}>
            {monthLabel}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={32} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {/* Website Quality */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <WebsiteIcon sx={{ color: '#667eea', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Website Quality
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Rating
                  value={formData.websiteQuality === '' ? null : formData.websiteQuality as number}
                  onChange={handleRatingChange('websiteQuality')}
                  max={10}
                  size="large"
                  sx={{
                    '& .MuiRating-iconFilled': { color: '#667eea' },
                    '& .MuiRating-iconHover': { color: '#764ba2' },
                  }}
                />
                <Typography variant="body2" sx={{ color: '#64748b', minWidth: 40 }}>
                  {formData.websiteQuality === '' ? '-' : `${formData.websiteQuality}/10`}
                </Typography>
              </Box>
            </Box>

            {/* LinkedIn Quality */}
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LinkedInIcon sx={{ color: '#0077b5', fontSize: 20 }} />
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  LinkedIn Page Quality
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Rating
                  value={formData.linkedInQuality === '' ? null : formData.linkedInQuality as number}
                  onChange={handleRatingChange('linkedInQuality')}
                  max={10}
                  size="large"
                  sx={{
                    '& .MuiRating-iconFilled': { color: '#0077b5' },
                    '& .MuiRating-iconHover': { color: '#005885' },
                  }}
                />
                <Typography variant="body2" sx={{ color: '#64748b', minWidth: 40 }}>
                  {formData.linkedInQuality === '' ? '-' : `${formData.linkedInQuality}/10`}
                </Typography>
              </Box>
            </Box>

            {/* Impressions */}
            <TextField
              label="Total Impressions"
              value={formData.impressions}
              onChange={handleNumberChange('impressions')}
              fullWidth
              type="text"
              inputMode="numeric"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ImpressionsIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              helperText="Total impressions across all platforms for this month"
            />

            {/* Posts */}
            <TextField
              label="Total Posts"
              value={formData.posts}
              onChange={handleNumberChange('posts')}
              fullWidth
              type="text"
              inputMode="numeric"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PostsIcon sx={{ color: '#10b981', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              helperText="Number of posts published this month"
            />

            {/* Followers */}
            <TextField
              label="Total Followers"
              value={formData.followers}
              onChange={handleNumberChange('followers')}
              fullWidth
              type="text"
              inputMode="numeric"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <FollowersIcon sx={{ color: '#8b5cf6', fontSize: 20 }} />
                  </InputAdornment>
                ),
              }}
              helperText="Total followers at end of month (across platforms)"
            />
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, borderTop: '1px solid rgba(0, 0, 0, 0.08)' }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || loading}
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5a67d8 0%, #6b46a1 100%)',
            },
          }}
        >
          {saving ? <CircularProgress size={20} sx={{ color: 'white' }} /> : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InboundKPIDialog;
