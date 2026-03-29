import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Tabs,
  Tab,
  Chip,
} from '@mui/material';
import {
  LinkedIn as LinkedInIcon,
  Article as ArticleIcon,
  MenuBook as MediumIcon,
  CloudUpload as UploadIcon,
  CheckCircle as SuccessIcon,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import { parseLinkedInExcel, parseTDSText, parseMediumText } from '../../../utils/analyticsParserUtils';
import {
  syncLinkedInData,
  syncTDSData,
  syncMediumData,
  updateCrossPlatformAggregates,
} from '../../../services/api/contentAnalyticsService';

interface ContentSyncDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface SyncResult {
  platform: string;
  itemCount: number;
  message: string;
}

const ContentSyncDialog: React.FC<ContentSyncDialogProps> = ({ open, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [tdsText, setTdsText] = useState('');
  const [mediumText, setMediumText] = useState('');

  const handleClose = () => {
    setError(null);
    setResult(null);
    setTdsText('');
    setMediumText('');
    onClose();
  };

  const handleLinkedInUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const parsed = parseLinkedInExcel(workbook);

      await syncLinkedInData(parsed);
      await updateCrossPlatformAggregates();

      setResult({
        platform: 'LinkedIn',
        itemCount: parsed.topPosts.length,
        message: `Synced ${parsed.topPosts.length} posts, ${parsed.engagement.filter(e => e.impressions > 0).length} active days, ${parsed.followers.totalFollowers} followers`,
      });

      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to parse LinkedIn Excel file');
    } finally {
      setLoading(false);
    }
  };

  const handleTDSSync = async () => {
    if (!tdsText || tdsText.trim().length < 50) {
      setError('Please paste your TDS analytics content.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const parsed = parseTDSText(tdsText);

      if (parsed.articles.length === 0) {
        setError('No 2026+ articles found in the pasted content. Only articles from 2026 onward are synced.');
        setLoading(false);
        return;
      }

      await syncTDSData(parsed);
      await updateCrossPlatformAggregates();

      setResult({
        platform: 'Towards Data Science',
        itemCount: parsed.articles.length,
        message: `Synced ${parsed.articles.length} articles (2026+), ${parsed.summary.totalPageviews.toLocaleString()} total pageviews, $${parsed.summary.totalEarnings.toFixed(2)} earnings`,
      });

      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to parse TDS analytics');
    } finally {
      setLoading(false);
    }
  };

  const handleMediumSync = async () => {
    if (!mediumText || mediumText.trim().length < 50) {
      setError('Please paste your Medium stats content.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResult(null);

      const parsed = parseMediumText(mediumText);

      if (parsed.stories.length === 0) {
        setError('No 2026+ stories found in the pasted content. Only stories from 2026 onward are synced.');
        setLoading(false);
        return;
      }

      await syncMediumData(parsed);
      await updateCrossPlatformAggregates();

      setResult({
        platform: 'Medium',
        itemCount: parsed.stories.length,
        message: `Synced ${parsed.stories.length} stories (2026+), ${parsed.summary.totalViews.toLocaleString()} total views, $${parsed.summary.totalEarnings.toFixed(2)} earnings`,
      });

      onSuccess?.();
    } catch (err: any) {
      setError(err.message || 'Failed to parse Medium analytics');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
        },
      }}
    >
      <DialogTitle sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Sync Content Analytics
        </Typography>
        <Typography variant="caption" sx={{ opacity: 0.9 }}>
          Import analytics from LinkedIn, TDS, or Medium
        </Typography>
      </DialogTitle>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={activeTab}
          onChange={(_, v) => { setActiveTab(v); setError(null); setResult(null); }}
          sx={{
            '& .MuiTabs-indicator': {
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            },
          }}
        >
          <Tab icon={<LinkedInIcon />} iconPosition="start" label="LinkedIn" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<ArticleIcon />} iconPosition="start" label="TDS" sx={{ textTransform: 'none', fontWeight: 600 }} />
          <Tab icon={<MediumIcon />} iconPosition="start" label="Medium" sx={{ textTransform: 'none', fontWeight: 600 }} />
        </Tabs>
      </Box>

      <DialogContent sx={{ mt: 2, minHeight: 300 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {result && (
          <Alert severity="success" icon={<SuccessIcon />} sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              {result.platform} analytics synced!
            </Typography>
            <Typography variant="body2">{result.message}</Typography>
          </Alert>
        )}

        {loading && (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6 }}>
            <CircularProgress sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Parsing and syncing data...
            </Typography>
          </Box>
        )}

        {/* LinkedIn Tab */}
        {activeTab === 0 && !loading && !result && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Upload LinkedIn Analytics Export
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              Export your LinkedIn analytics as an Excel file (.xlsx) from the LinkedIn Analytics page,
              then upload it here. The file should contain sheets: DISCOVERY, ENGAGEMENT, TOP POSTS, FOLLOWERS, DEMOGRAPHICS.
            </Typography>

            <Box sx={{
              border: '2px dashed #cbd5e1',
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              '&:hover': { borderColor: '#667eea', background: 'rgba(102, 126, 234, 0.02)' },
            }}>
              <UploadIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
              <Typography variant="body1" sx={{ mb: 2 }}>
                Drop your .xlsx file here or click to browse
              </Typography>
              <Button
                component="label"
                variant="contained"
                sx={{
                  background: 'linear-gradient(135deg, #0077b5 0%, #005885 100%)',
                  textTransform: 'none',
                  '&:hover': { background: 'linear-gradient(135deg, #006399 0%, #004d6d 100%)' },
                }}
              >
                Choose File
                <input
                  type="file"
                  hidden
                  accept=".xlsx,.xls"
                  onChange={handleLinkedInUpload}
                />
              </Button>
            </Box>
          </Box>
        )}

        {/* TDS Tab */}
        {activeTab === 1 && !loading && !result && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Paste TDS Analytics
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              Go to your TDS Contributor Portal analytics page, select all (Ctrl+A), copy (Ctrl+C), and paste below.
              Only articles from 2026 onward will be synced.
            </Typography>
            <Chip label="2026+ only" size="small" color="primary" sx={{ mb: 2 }} />

            <TextField
              multiline
              rows={10}
              fullWidth
              variant="outlined"
              placeholder="Paste your TDS analytics table here..."
              value={tdsText}
              onChange={(e) => setTdsText(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  background: '#f8fafc',
                },
              }}
            />
            <Typography variant="caption" sx={{ color: '#94a3b8', mt: 1, display: 'block' }}>
              {tdsText.length} characters
            </Typography>
          </Box>
        )}

        {/* Medium Tab */}
        {activeTab === 2 && !loading && !result && (
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 2 }}>
              Paste Medium Stats
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              Go to Medium Stats page, select all content including the monthly summary and story list,
              copy and paste below. Only stories from 2026 onward will be synced.
            </Typography>
            <Chip label="2026+ only" size="small" color="primary" sx={{ mb: 2 }} />

            <TextField
              multiline
              rows={10}
              fullWidth
              variant="outlined"
              placeholder="Paste your Medium stats page content here..."
              value={mediumText}
              onChange={(e) => setMediumText(e.target.value)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  background: '#f8fafc',
                },
              }}
            />
            <Typography variant="caption" sx={{ color: '#94a3b8', mt: 1, display: 'block' }}>
              {mediumText.length} characters
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose} sx={{ textTransform: 'none' }}>
          {result ? 'Close' : 'Cancel'}
        </Button>

        {activeTab === 1 && !loading && !result && (
          <Button
            onClick={handleTDSSync}
            disabled={tdsText.trim().length < 50}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4292 100%)' },
              '&:disabled': { background: '#94a3b8', color: 'white' },
            }}
          >
            Parse & Sync TDS
          </Button>
        )}

        {activeTab === 2 && !loading && !result && (
          <Button
            onClick={handleMediumSync}
            disabled={mediumText.trim().length < 50}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              textTransform: 'none',
              '&:hover': { background: 'linear-gradient(135deg, #5a6fd6 0%, #6a4292 100%)' },
              '&:disabled': { background: '#94a3b8', color: 'white' },
            }}
          >
            Parse & Sync Medium
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default ContentSyncDialog;
